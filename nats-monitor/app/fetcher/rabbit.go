package fetcher

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
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
	fetcher Fetcher
	client  *http.Client
}

// Get - fetches stats data from nats
func (r rabbit) Get() (FetchData, error) {
	resp, err := r.client.Get(fmt.Sprintf("http://%s:%d/api/overview", r.fetcher.host, r.fetcher.port))
	if err != nil {
		return FetchData{}, err
	}

	body, err := ioutil.ReadAll(resp.Body)
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
