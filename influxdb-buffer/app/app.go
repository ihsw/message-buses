package main

import (
	"fmt"
	"time"

	nats "github.com/nats-io/go-nats"
)

func main() {
	// connecting
	nc, err := nats.Connect("nats://nats-server:4222")
	if err != nil {
		fmt.Printf("Could not connect to nats: %s\n", err.Error())

		return
	}
	defer nc.Close()

	// generating a subscription channel
	writeChan := make(chan *nats.Msg, 64)
	_, err = nc.ChanSubscribe("influxdb-writes", writeChan)
	if err != nil {
		fmt.Printf("Could not subscribe: %s", err.Error())

		return
	}

	// starting it up
	fmt.Println("Starting!")
	msgLimit := 50
	msgBatchChan := make(chan []*nats.Msg)
	msgs := []*nats.Msg{}
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
		case <-c:
			fmt.Println("Tick! Loading a batch and resetting!")

			msgBatchChan <- msgs
			msgs = []*nats.Msg{}
		}
	}
}
