#! /bin/bash

# misc
SCP_IDENT="~/.ssh/google_compute_engine"
DEFAULT_USER="gcloud-from-work"

# gathering up the instances with telegraf containers and starting telegraf on them
TELEGRAF_INSTANCES=$(gcloud compute instances list | tail -n +2 | grep -vi terminated | grep -vi influxdb-server | awk '{print $1}')
for instance in $TELEGRAF_INSTANCES
do
    gcloud compute ssh $DEFAULT_USER@$instance -- $'docker start $(docker ps -a | grep -i telegraf-collector | awk \'{print $1}\')'
done

# starting nats on the nats server
NATS_INSTANCE=$(gcloud compute instances list | tail -n +2 | grep -vi terminated | grep -i message-bus | awk '{print $1}')
gcloud compute ssh $DEFAULT_USER@$NATS_INSTANCE -- $'docker start $(docker ps -a | grep -i nats-server | awk \'{print $1}\')'

# starting up everything on the influxdb-server except the telegraf container
gcloud compute ssh $DEFAULT_USER@influxdb-server -- $'docker start $(docker ps -a | grep -i ihsw | grep -vi telegraf-collector | awk \'{print $1}\')'
