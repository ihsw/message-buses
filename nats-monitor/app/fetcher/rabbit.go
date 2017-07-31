package fetcher

import (
	"encoding/json"
	"fmt"
)

type details struct {
	Rate float32 `json:"rate"`
}

type messageStats struct {
	DeliverDetails details `json:"deliver_details"`
	AckDetails     details `json:"ack_details"`
}

type response struct {
	MessageStats messageStats `json:"message_stats"`
}

type rabbit struct {
	host    string
	port    int
	fetcher Fetcher
}

func newRabbit(host string, port int) rabbit {
	return rabbit{
		fetcher: Fetcher{fetch: defaultFetch},
		host:    host,
		port:    port,
	}
}

func (r rabbit) get() (FetchData, error) {
	body, err := r.fetcher.fetch(fmt.Sprintf("http://%s:%d/api/overview", r.host, r.port))
	if err != nil {
		return FetchData{}, err
	}

	return r.read(body)
}

func (r rabbit) read(body []byte) (FetchData, error) {
	var statz *response
	err := json.Unmarshal(body, &statz)
	if err != nil {
		return FetchData{}, err
	}

	return FetchData{
		InMsgs:   int64(statz.MessageStats.AckDetails.Rate),
		OutMsgs:  int64(statz.MessageStats.DeliverDetails.Rate),
		InBytes:  0,
		OutBytes: 0,
	}, nil
}
