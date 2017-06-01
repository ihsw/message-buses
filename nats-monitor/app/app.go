package main

import (
	"encoding/json"
	"io/ioutil"
	"os"

	"fmt"
	"strconv"

	"time"

	influxdb "github.com/influxdata/influxdb/client/v2"
	gnatsd "github.com/nats-io/gnatsd/server"
	top "github.com/nats-io/nats-top/util"
)

func request(engine *top.Engine) (*gnatsd.Varz, error) {
	uri := engine.Uri + "/varz"

	resp, err := engine.HttpClient.Get(uri)
	if resp != nil {
		defer resp.Body.Close()
	}
	if err != nil {
		return nil, fmt.Errorf("could not get stats from server: %v", err)
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("could not read response body: %v", err)
	}

	var statz *gnatsd.Varz
	err = json.Unmarshal(body, &statz)
	if err != nil {
		return nil, fmt.Errorf("could not unmarshal json: %v", err)
	}

	return statz, nil
}

type rate struct {
	name    string
	delta   int64
	lastVal int64
}

func (r rate) calculateRate(pollTime time.Time) float64 {
	tDelta := time.Since(pollTime)
	return float64(r.delta) / tDelta.Seconds()
}

func main() {
	// connecting to influxdb
	ic, err := influxdb.NewHTTPClient(influxdb.HTTPConfig{
		Addr: fmt.Sprintf("http://%s:%s", os.Getenv("INFLUX_HOST"), os.Getenv("INFLUX_PORT")),
	})
	if err != nil {
		fmt.Printf("Could not connect to influxdb: %s\n", err.Error())

		return
	}
	defer ic.Close()

	// creating database where appropriate
	q := influxdb.NewQuery("CREATE DATABASE ecp4", "", "")
	response, err := ic.Query(q)
	if err != nil {
		fmt.Printf("Could not create database: %s\n", err.Error())

		return
	}
	if err := response.Error(); err != nil {
		fmt.Printf("Could not create database: %s\n", err.Error())

		return
	}

	// gathering nats connection info
	host := os.Getenv("NATS_HOST")
	port, err := strconv.Atoi(os.Getenv("NATS_INFO_PORT"))
	if err != nil {
		fmt.Printf("Port could not be converted to an int: %s\n", err.Error())

		return
	}

	// starting up the nats-top engine
	engine := top.NewEngine(host, port, 0, 0)
	engine.SetupHTTP()

	// ticking
	first := true
	pollTime := time.Now()
	tick := time.Tick(1 * time.Second)
	inMsgsRate := rate{name: "in_messages_rate"}
	outMsgsRate := rate{name: "out_messages_rate"}
	inBytesRate := rate{name: "in_bytes_rate"}
	outBytesRate := rate{name: "out_bytes_rate"}
	for _ = range tick {
		// fetching stats
		varz, err := request(engine)
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
