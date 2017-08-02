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
	n := fetcher.NewNats(natsHost, natsPort)
	// r := fetcher.NewRabbit(rabbitHost, rabbitPort)

	// ticking
	first := true
	pollTime := time.Now()
	tick := time.Tick(1 * time.Second)
	inMsgsRate := rate{name: "in_messages_rate"}
	outMsgsRate := rate{name: "out_messages_rate"}
	inBytesRate := rate{name: "in_bytes_rate"}
	outBytesRate := rate{name: "out_bytes_rate"}
	fmt.Println("Polling for stats")
	for _ = range tick {
		// fetching stats
		varz, err := n.Get()
		if err != nil {
			fmt.Printf("Could not fetch varz: %s\n", err.Error())

			return
		}

		// populating the rates
		inMsgsVal := varz.InMsgs
		inMsgsRate.delta = inMsgsVal - inMsgsRate.lastVal
		inMsgsRate.lastVal = inMsgsVal

		outMsgsVal := varz.OutMsgs
		outMsgsRate.delta = outMsgsVal - outMsgsRate.lastVal
		outMsgsRate.lastVal = outMsgsVal

		inBytesVal := varz.InBytes
		inBytesRate.delta = inBytesVal - inBytesRate.lastVal
		inBytesRate.lastVal = inBytesVal

		outBytesVal := varz.OutBytes
		outBytesRate.delta = outBytesVal - outBytesRate.lastVal
		outBytesRate.lastVal = outBytesVal

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

		// creating an influx point
		fields := map[string]interface{}{
			inMsgsRate.name:   inMsgsRate.calculateRate(pollTime),
			outMsgsRate.name:  outMsgsRate.calculateRate(pollTime),
			inBytesRate.name:  outMsgsRate.calculateRate(pollTime),
			outBytesRate.name: outBytesRate.calculateRate(pollTime),
		}
		fmt.Printf("%v\n", fields)
		point, err := influxdb.NewPoint("nats_performance", map[string]string{}, fields, time.Now())
		if err != nil {
			fmt.Printf("Could not create point: %s\n", err.Error())

			return
		}

		// adding and writing it out
		bp.AddPoint(point)
		ic.Write(bp)

		pollTime = time.Now()
	}
}
