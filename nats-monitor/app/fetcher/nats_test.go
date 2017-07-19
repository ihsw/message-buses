package fetcher

import "testing"
import "io/ioutil"
import "github.com/stretchr/testify/assert"

func TestNatsRead(t *testing.T) {
	contents, err := ioutil.ReadFile("./testdata/nats.json")
	if err != nil {
		t.Fatal(err)

		return
	}

	n := nats{}
	data, err := n.read(contents)
	if err != nil {
		t.Fatal(err)

		return
	}

	assert.NotZero(t, data.InMsgs)
	assert.NotZero(t, data.OutMsgs)
}
