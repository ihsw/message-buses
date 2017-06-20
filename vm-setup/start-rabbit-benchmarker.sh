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
RABBIT_HOST=$(gcloud compute instances list | grep message-bus-4cpu | awk '{print $4}')
METRICS_HOST=$(gcloud compute instances list | grep influxdb-server | awk '{print $4}')

# building the image and running it
gcloud compute ssh $GCLOUD_AUTH -- "cd ./message-buses && git pull && docker build -t ihsw/rabbit-benchmarker ./worker"
gcloud compute ssh $GCLOUD_AUTH -- "docker run -it -e RABBIT_HOST=$RABBIT_HOST -e METRICS_HOST=$METRICS_HOST -e IS_CLUSTERING=1 -e DRIVER_TYPE=rabbit ihsw/rabbit-benchmarker ./bin/run-app rabbit-benchmarker -d 2m -w 10"
