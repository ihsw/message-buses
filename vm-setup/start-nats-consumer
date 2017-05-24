#! /bin/bash

# misc
SCP_IDENT="~/.ssh/google_compute_engine"
DEFAULT_USER="gcloud-from-work"
GCLOUD_AUTH="$DEFAULT_USER@nats-consumer"

# fetching the ip for the nats and influx hosts
INFLUX_HOST=$(gcloud compute ssh $GCLOUD_AUTH -- $'docker inspect -f \'{{ range .NetworkSettings.Networks }}{{ .IPAddress }}{{ end }}\' $(docker ps -a | grep -i telegraf-collector | awk \'{print $1}\')')
NATS_HOST=$(gcloud compute instances list | grep nss-server | awk '{print $4}')

# building the image and running it
gcloud compute ssh $GCLOUD_AUTH -- "cd ./message-buses && docker build -t ihsw/nats-consumer ./worker"
gcloud compute ssh $GCLOUD_AUTH -- "docker run -it -e NATS_HOST=$NATS_HOST -e INFLUX_HOST=$INFLUX_HOST -e INFLUX_PORT=8186 -e APP_PORT=80 --entrypoint=\"\" -p 80:80 ihsw/nats-consumer ./bin/run-app nats-consumer"
