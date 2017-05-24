#! /bin/bash

# misc
SCP_IDENT="~/.ssh/google_compute_engine"
DEFAULT_USER="gcloud-from-work"
GCLOUD_INSTANCE=$@

# validation
if [ -z $GCLOUD_INSTANCE ]; then
    echo "GCLOUD_INSTANCE must be provided!"
    exit 1
fi

GCLOUD_AUTH="$DEFAULT_USER@$@"

# building the image and running it
gcloud compute ssh $GCLOUD_AUTH -- 'cd ./message-buses && docker build -t ihsw/nats-producer ./worker'
gcloud compute ssh $GCLOUD_AUTH -- 'docker run -it -e NATS_HOST=10.0.0.2 -e INFLUX_HOST=10.0.0.7 --entrypoint="" ihsw/nats-producer ./bin/run-app nats-producer'
