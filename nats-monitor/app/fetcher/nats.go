package fetcher

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	gnatsd "github.com/nats-io/gnatsd/server"
)

type nats struct {
	fetcher Fetcher
	client  *http.Client
}

// Get - fetches stats data from nats
func (n nats) Get() (FetchData, error) {
	resp, err := n.client.Get(fmt.Sprintf("http://%s:%d/varz", n.fetcher.host, n.fetcher.port))
	if err != nil {
		return FetchData{}, err
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return FetchData{}, err
	}

	var statz *gnatsd.Varz
	err = json.Unmarshal(body, &statz)
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
