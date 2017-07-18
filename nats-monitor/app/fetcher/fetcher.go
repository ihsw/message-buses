package fetcher

// Fetcher - fetches stats from a url
type Fetcher struct {
	host string
	port int
}

// FetchData - data returned from a given stats endpoint
type FetchData struct {
	InMsgs   int64
	OutMsgs  int64
	InBytes  int64
	OutBytes int64
}
