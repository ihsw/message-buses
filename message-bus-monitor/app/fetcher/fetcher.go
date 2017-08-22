package fetcher

import (
	"io/ioutil"
	"net/http"
)

func defaultFetch(uri string) ([]byte, error) {
	client := &http.Client{}

	req, err := http.NewRequest("GET", uri, nil)
	if err != nil {
		return []byte{}, err
	}
	req.SetBasicAuth("guest", "guest")

	resp, err := client.Do(req)
	if err != nil {
		return []byte{}, err
	}

	return ioutil.ReadAll(resp.Body)
}

// FetchFunc - func for fetching stats
type FetchFunc func(uri string) ([]byte, error)

// Fetcher - fetches stats from a uri
type Fetcher struct {
	fetch FetchFunc
}

// FetchData - data returned from a given stats endpoint
type FetchData struct {
	InMsgs   int64
	OutMsgs  int64
	InBytes  int64
	OutBytes int64
}
