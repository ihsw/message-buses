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

	r := Rabbit{}
	data, err := r.read(contents)
	if err != nil {
		t.Fatal(err)

		return
	}

	assert.NotZero(t, data.InMsgs)
	assert.NotZero(t, data.OutMsgs)
}

func TestRabbitGet(t *testing.T) {
	contents, err := ioutil.ReadFile("./testdata/rabbit.json")
	if err != nil {
		t.Fatal(err)

		return
	}

	r := Rabbit{
		fetcher: Fetcher{
			fetch: func(uri string) ([]byte, error) { return contents, nil },
		},
	}
	data, err := r.Get()
	if err != nil {
		t.Fatal(err)

		return
	}

	assert.NotZero(t, data.InMsgs)
	assert.NotZero(t, data.OutMsgs)
}
