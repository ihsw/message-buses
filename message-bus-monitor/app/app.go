package main

import (
	"message-bus-monitor/fetcher"

	"github.com/namsral/flag"

	"fmt"

	"time"

	influxdb "github.com/influxdata/influxdb/client/v2"
)

type rate struct {
	name    string
	delta   int64
	lastVal int64
}

type rateGroup struct {
	name         string
	inMsgsRate   rate
	outMsgsRate  rate
	inBytesRate  rate
	outBytesRate rate
}

func (r rateGroup) injestData(varz fetcher.FetchData) rateGroup {
	inMsgsVal := varz.InMsgs
	r.inMsgsRate.delta = inMsgsVal - r.inMsgsRate.lastVal
	r.inMsgsRate.lastVal = inMsgsVal

	outMsgsVal := varz.OutMsgs
	r.outMsgsRate.delta = outMsgsVal - r.outMsgsRate.lastVal
	r.outMsgsRate.lastVal = outMsgsVal

	inBytesVal := varz.InBytes
	r.inBytesRate.delta = inBytesVal - r.inBytesRate.lastVal
	r.inBytesRate.lastVal = inBytesVal

	outBytesVal := varz.OutBytes
	r.outBytesRate.delta = outBytesVal - r.outBytesRate.lastVal
	r.outBytesRate.lastVal = outBytesVal

	return r
}

type updateFetcher interface {
	Get() (fetcher.FetchData, error)
}

func (r rateGroup) update(f updateFetcher) (rateGroup, error) {
	varz, err := f.Get()
	if err != nil {
		return rateGroup{}, err
	}

	r = r.injestData(varz)

	return r, nil
}

func (r rateGroup) toInfluxFields(pollTime time.Time) map[string]interface{} {
	return map[string]interface{}{
		r.inMsgsRate.name:   r.inMsgsRate.calculateRate(pollTime),
		r.outMsgsRate.name:  r.outMsgsRate.calculateRate(pollTime),
		r.inBytesRate.name:  r.outMsgsRate.calculateRate(pollTime),
		r.outBytesRate.name: r.outBytesRate.calculateRate(pollTime),
	}
}

func (r rateGroup) toInfluxPoint(pollTime time.Time) (*influxdb.Point, error) {
	name := fmt.Sprintf("%s_performance", r.name)
	fields := r.toInfluxFields(pollTime)
	tags := map[string]string{}
	dateOccurred := time.Now()
	point, err := influxdb.NewPoint(name, tags, fields, dateOccurred)
	if err != nil {
		return nil, err
	}

	return point, nil
}

func (r rateGroup) writeToBatchPoints(pollTime time.Time, bp influxdb.BatchPoints) error {
	point, err := r.toInfluxPoint(pollTime)
	if err != nil {
		return err
	}

	bp.AddPoint(point)

	return nil
}

func (r rate) calculateRate(pollTime time.Time) float64 {
	tDelta := time.Since(pollTime)
	return float64(r.delta) / tDelta.Seconds()
}

func getInfluxClient(host string, port int, database string) (influxdb.Client, error) {
	// connecting to influxdb
	ic, err := influxdb.NewHTTPClient(influxdb.HTTPConfig{
		Addr: fmt.Sprintf("http://%s:%d", host, port),
	})
	if err != nil {
		return nil, err
	}

	// creating database where appropriate
	q := influxdb.NewQuery(fmt.Sprintf("CREATE DATABASE %s", database), "", "")
	response, err := ic.Query(q)
	if err != nil {
		return nil, err
	}
	if err := response.Error(); err != nil {
		return nil, err
	}

	return ic, nil
}

func main() {
	var (
		influxHost string
		influxPort int
		natsHost   string
		natsPort   int
		rabbitHost string
		rabbitPort int
	)

	flag.StringVar(&influxHost, "influx_host", "", "Influx hostname")
	flag.IntVar(&influxPort, "influx_port", -1, "Influx port")
	flag.StringVar(&natsHost, "nats_host", "", "Nats hostname")
	flag.IntVar(&natsPort, "nats_port", -1, "Nats port")
	flag.StringVar(&rabbitHost, "rabbit_host", "", "Rabbit hostname")
	flag.IntVar(&rabbitPort, "rabbit_port", -1, "Rabbit port")
	flag.Parse()

	// connecting to influxdb
	ic, err := getInfluxClient(influxHost, influxPort, "ecp4")
	if err != nil {
		fmt.Printf("Could not get influx client: %s\n", err.Error())
		return
	}

	// setting up rabbit and nats fetchers
	natsFetcher := fetcher.NewNats(natsHost, natsPort)
	rabbitFetcher := fetcher.NewRabbit(rabbitHost, rabbitPort)

	// ticking
	first := true
	pollTime := time.Now()
	tick := time.Tick(1 * time.Second)
	natsRateGroup := rateGroup{
		name:         "nats",
		inMsgsRate:   rate{name: "in_messages_rate"},
		outMsgsRate:  rate{name: "out_messages_rate"},
		inBytesRate:  rate{name: "in_bytes_rate"},
		outBytesRate: rate{name: "out_bytes_rate"},
	}
	rabbitRateGroup := rateGroup{
		name:         "rabbit",
		inMsgsRate:   rate{name: "in_messages_rate"},
		outMsgsRate:  rate{name: "out_messages_rate"},
		inBytesRate:  rate{name: "in_bytes_rate"},
		outBytesRate: rate{name: "out_bytes_rate"},
	}
	fmt.Println("Polling for stats")
	for _ = range tick {
		// populating the rates
		natsRateGroup, err = natsRateGroup.update(natsFetcher)
		if err != nil {
			fmt.Printf("Could not update nats rate group: %s\n", err.Error())

			return
		}
		rabbitRateGroup, err = rabbitRateGroup.update(rabbitFetcher)

		// skipping on first run
		if first {
			first = false

			continue
		}

		// creating a batch point
		bp, err := influxdb.NewBatchPoints(influxdb.BatchPointsConfig{Database: "ecp4"})
		if err != nil {
			fmt.Printf("Could not create batch point: %s\n", err.Error())

			return
		}

		// writing the rate groups onto the batch point
		err = natsRateGroup.writeToBatchPoints(pollTime, bp)
		if err != nil {
			fmt.Printf("Could not write to batch point: %s\n", err.Error())

			return
		}
		err = rabbitRateGroup.writeToBatchPoints(pollTime, bp)
		if err != nil {
			fmt.Printf("Could not write to batch point: %s\n", err.Error())

			return
		}

		// writing out the batch-point to influx
		ic.Write(bp)

		// resetting the poll-time
		pollTime = time.Now()
	}
}
