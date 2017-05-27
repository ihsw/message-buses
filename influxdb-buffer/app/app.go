package main

import (
	"fmt"
	"time"

	"encoding/json"

	influxdb "github.com/influxdata/influxdb/client/v2"
	nats "github.com/nats-io/go-nats"
)

type pointMessage struct {
	Metric string  `json:"metric"`
	Key    string  `json:"key"`
	Value  float32 `json:"value"`
}

func main() {
	// connecting to nats
	nc, err := nats.Connect("nats://nats-server:4222")
	if err != nil {
		fmt.Printf("Could not connect to nats: %s\n", err.Error())

		return
	}
	defer nc.Close()

	// connecting to influxdb
	ic, err := influxdb.NewHTTPClient(influxdb.HTTPConfig{
		Addr: "http://influxdb-server:8086",
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

	// generating a subscription channel for reading influxdb writes
	writeChan := make(chan *nats.Msg, 64)
	_, err = nc.ChanSubscribe("influxdb-writes", writeChan)
	if err != nil {
		fmt.Printf("Could not subscribe: %s", err.Error())

		return
	}

	// starting it up
	fmt.Println("Starting!")
	msgLimit := 50
	msgBatchChan := make(chan []*nats.Msg, 4)
	msgs := []*nats.Msg{}
	errs := make(chan error, 64)
	msgBatchCountdown := time.Tick(1 * time.Second)
	fakePublishCountdown := time.Tick(5 * time.Second)
	for {
		select {
		case msg := <-writeChan:
			fmt.Printf("Received message: %s\n", string(msg.Data))

			msgs = append(msgs, msg)

			if len(msgs) > msgLimit {
				fmt.Println(fmt.Sprintf("Maxed out! Loading a batch and resetting!"))

				msgBatchChan <- msgs
				msgs = []*nats.Msg{}
			}
		case msgBatch := <-msgBatchChan:
			fmt.Println(fmt.Sprintf("Message batch! Message count: %d", len(msgBatch)))

			if len(msgBatch) == 0 {
				continue
			}

			bp, err := influxdb.NewBatchPoints(influxdb.BatchPointsConfig{
				Database:  "ecp4",
				Precision: "us",
			})
			if err != nil {
				errs <- err

				continue
			}

			for _, msg := range msgBatch {
				var p pointMessage
				err := json.Unmarshal(msg.Data, &p)
				if err != nil {
					errs <- err

					continue
				}

				pt, err := influxdb.NewPoint(
					p.Metric,
					map[string]string{},
					map[string]interface{}{p.Key: p.Value},
				)
				if err != nil {
					errs <- err

					continue
				}

				bp.AddPoint(pt)
			}

			if err := ic.Write(bp); err != nil {
				errs <- err
			}
		case err := <-errs:
			fmt.Println(fmt.Sprintf("Error: %s", err.Error()))
		case <-msgBatchCountdown:
			fmt.Println("Tick! Loading a batch and resetting!")

			msgBatchChan <- msgs
			msgs = []*nats.Msg{}
		case <-fakePublishCountdown:
			fmt.Println("Tick! Publishing fake metrics")

		POINT_LOOP:
			for i := 0; i < 1; i++ {
				pm := pointMessage{
					Metric: "page_response_times",
					Key:    "response_time",
					Value:  0.05,
				}
				b, err := json.Marshal(pm)
				if err != nil {
					errs <- err

					continue POINT_LOOP
				}

				if err := nc.Publish("influxdb-writes", b); err != nil {
					errs <- err
				}
			}
		}
	}
}
