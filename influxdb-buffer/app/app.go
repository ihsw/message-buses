package main

import (
	"fmt"
	"math/rand"
	"time"

	"encoding/json"

	"os"

	influxdb "github.com/influxdata/influxdb/client/v2"
	nats "github.com/nats-io/go-nats"
)

type pointMessageField struct {
	Key   string  `json:"key"`
	Value float32 `json:"value"`
}

type pointMessage struct {
	Metric          string              `json:"metric"`
	Fields          []pointMessageField `json:"fields"`
	UnixSeconds     int64               `json:"unix_seconds"`
	UnixNanoseconds int64               `json:"unix_nanoseconds"`
}

func (p pointMessage) toInfluxPoint() (*influxdb.Point, error) {
	fields := map[string]interface{}{}
	for _, field := range p.Fields {
		fields[field.Key] = field.Value
	}

	return influxdb.NewPoint(p.Metric, map[string]string{}, fields, time.Unix(p.UnixSeconds, p.UnixNanoseconds))
}

func random(min int, max int) int {
	rand.Seed(time.Now().UnixNano())
	return rand.Intn(max-min) + min
}

func main() {
	// connecting to nats
	nc, err := nats.Connect(fmt.Sprintf("nats://%s:%s", os.Getenv("NATS_HOST"), os.Getenv("NATS_PORT")))
	if err != nil {
		fmt.Printf("Could not connect to nats: %s\n", err.Error())

		return
	}
	defer nc.Close()

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

	// generating parallel subscription channels and multiplexing them down to one
	const writeChanBufferSize = 1024 * 256
	const writeChanWorkerCount = 16
	const writeChanName = "influxdb-writes"
	writeChan := make(chan *nats.Msg, writeChanBufferSize*writeChanWorkerCount)
	for i := 0; i < writeChanWorkerCount; i++ {
		subWriteChan := make(chan *nats.Msg, writeChanBufferSize)
		_, err = nc.ChanQueueSubscribe(writeChanName, fmt.Sprintf("%s-workers", writeChanName), writeChan)
		if err != nil {
			fmt.Printf("Could not subscribe: %s", err.Error())

			return
		}

		go func() {
			for msg := range subWriteChan {
				writeChan <- msg
			}
		}()
	}

	// starting it up
	fmt.Println("Starting!")
	msgLimit := writeChanBufferSize * 4
	msgBatchChan := make(chan []*nats.Msg, 4)
	msgs := []*nats.Msg{}
	errs := make(chan error, 64)
	msgBatchCountdown := time.Tick(1 * time.Second)
	for {
		select {
		case msg := <-writeChan:
			msgs = append(msgs, msg)

			if len(msgs) > msgLimit {
				fmt.Println(fmt.Sprintf("Maxed out! Loading a batch and resetting!"))

				msgBatchChan <- msgs
				msgs = []*nats.Msg{}
			}
		case msgBatch := <-msgBatchChan:
			if len(msgBatch) == 0 {
				continue
			}

			fmt.Println(fmt.Sprintf("Message batch! Message count: %d", len(msgBatch)))

			bp, err := influxdb.NewBatchPoints(influxdb.BatchPointsConfig{Database: "ecp4"})
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

				pt, err := p.toInfluxPoint()
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
			if len(msgs) == 0 {
				continue
			}

			fmt.Println("Tick! Loading a batch and resetting!")

			msgBatchChan <- msgs
			msgs = []*nats.Msg{}
		}
	}
}
