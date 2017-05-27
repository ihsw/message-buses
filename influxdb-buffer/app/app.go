package main

import (
	"fmt"
	"time"

	influxdb "github.com/influxdata/influxdb/client/v2"
	nats "github.com/nats-io/go-nats"
)

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
	c := time.Tick(1 * time.Second)
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
			fmt.Println(fmt.Sprintf("Message batch! Message count: %d", len(msgBatch)))
			bp, err := influxdb.NewBatchPoints(influxdb.BatchPointsConfig{
				Database:  "ecp4",
				Precision: "us",
			})
			for _, msg := range msgBatch {

			}
			errs <- ic.Write(bp)
		case err := <-errs:
			fmt.Println(fmt.Sprintf("Error: %s", err.Error()))
		case <-c:
			fmt.Println("Tick! Loading a batch and resetting!")

			msgBatchChan <- msgs
			msgs = []*nats.Msg{}
		}
	}
}
