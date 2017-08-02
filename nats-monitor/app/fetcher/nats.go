package fetcher

import (
	"encoding/json"
	"fmt"

	gnatsd "github.com/nats-io/gnatsd/server"
)

// Nats - nats fetcher
type Nats struct {
	host    string
	port    int
	fetcher Fetcher
}

// NewNats - returns an instance of nats
func NewNats(host string, port int) Nats {
	return Nats{
		fetcher: Fetcher{fetch: defaultFetch},
		host:    host,
		port:    port,
	}
}

// Get - fetches stats from an http endpoint
func (n Nats) Get() (FetchData, error) {
	body, err := n.fetcher.fetch(fmt.Sprintf("http://%s:%d/varz", n.host, n.port))
	if err != nil {
		return FetchData{}, err
	}

	return n.read(body)
}

func (n Nats) read(body []byte) (FetchData, error) {
	var statz *gnatsd.Varz
	err := json.Unmarshal(body, &statz)
	if err != nil {
		return FetchData{}, err
	}

	return FetchData{
		InMsgs:   statz.InMsgs,
		OutMsgs:  statz.OutMsgs,
		InBytes:  statz.InBytes,
		OutBytes: statz.OutBytes,
	}, nil
}
