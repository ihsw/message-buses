package fetcher

import "testing"
import "io/ioutil"
import "github.com/stretchr/testify/assert"

func TestRabbitRead(t *testing.T) {
	contents, err := ioutil.ReadFile("./testdata/rabbit.json")
	if err != nil {
		t.Fatal(err)

		return
	}

	r := rabbit{}
	data, err := r.read(contents)
	if err != nil {
		t.Fatal(err)

		return
	}

	assert.NotZero(t, data.InMsgs)
	assert.NotZero(t, data.OutMsgs)
}
