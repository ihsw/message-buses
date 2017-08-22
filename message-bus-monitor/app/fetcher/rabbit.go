package fetcher

import (
	"encoding/json"
	"fmt"
)

type details struct {
	Rate float32 `json:"rate"`
}

type messageStats struct {
	Deliver        int     `json:"deliver"`
	DeliverDetails details `json:"deliver_details"`
	Ack            int     `json:"ack"`
	AckDetails     details `json:"ack_details"`
}

type response struct {
	MessageStats messageStats `json:"message_stats"`
}

// Rabbit - rabbit fetcher
type Rabbit struct {
	host    string
	port    int
	fetcher Fetcher
}

// NewRabbit - returns an instance of the rabbit fetcher
func NewRabbit(host string, port int) Rabbit {
	return Rabbit{
		fetcher: Fetcher{fetch: defaultFetch},
		host:    host,
		port:    port,
	}
}

// Get - fetches stats from an http endpoint
func (r Rabbit) Get() (FetchData, error) {
	body, err := r.fetcher.fetch(fmt.Sprintf("http://%s:%d/api/overview", r.host, r.port))
	if err != nil {
		return FetchData{}, err
	}

	return r.read(body)
}

func (r Rabbit) read(body []byte) (FetchData, error) {
	var statz *response
	err := json.Unmarshal(body, &statz)
	if err != nil {
		return FetchData{}, err
	}

	return FetchData{
		InMsgs:   int64(statz.MessageStats.Ack),
		OutMsgs:  int64(statz.MessageStats.Deliver),
		InBytes:  0,
		OutBytes: 0,
	}, nil
}
