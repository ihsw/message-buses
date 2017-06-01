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

GCLOUD_AUTH="$DEFAULT_USER@$GCLOUD_INSTANCE"

# fetching the ip for the nats and metrics hosts
NATS_HOST=$(gcloud compute instances list | grep nss-server-high-cpu | awk '{print $4}')
METRICS_HOST=$(gcloud compute instances list | grep influxdb-server | awk '{print $4}')

# building the image and running it
gcloud compute ssh $GCLOUD_AUTH -- "cd ./message-buses && git pull && docker build -t ihsw/nats-benchmarker ./worker"
gcloud compute ssh $GCLOUD_AUTH -- "docker run -it -e NATS_HOST=$NATS_HOST -e METRICS_HOST=$METRICS_HOST -e IS_CLUSTERING=1 ihsw/nats-benchmarker ./bin/run-app nats-benchmarker -d 5m -w 100"
