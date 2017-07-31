package fetcher

import (
	"encoding/json"
	"fmt"

	gnatsd "github.com/nats-io/gnatsd/server"
)

type nats struct {
	host    string
	port    int
	fetcher Fetcher
}

func newNats(host string, port int) nats {
	return nats{
		fetcher: Fetcher{fetch: defaultFetch},
		host:    host,
		port:    port,
	}
}

func (n nats) get() (FetchData, error) {
	body, err := n.fetcher.fetch(fmt.Sprintf("http://%s:%d/varz", n.host, n.port))
	if err != nil {
		return FetchData{}, err
	}

	return n.read(body)
}

func (n nats) read(body []byte) (FetchData, error) {
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
