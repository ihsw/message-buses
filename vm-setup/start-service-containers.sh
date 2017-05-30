#! /bin/bash

# misc
SCP_IDENT="~/.ssh/google_compute_engine"
DEFAULT_USER="gcloud-from-work"

# starting up everything on the influxdb-server
gcloud compute ssh $DEFAULT_USER@influxdb-server -- $'docker start $(docker ps -a | grep -i ihsw | awk \'{print $1}\')'

# starting up everything on the nss-erver
gcloud compute ssh $DEFAULT_USER@nss-server -- $'docker start $(docker ps -a | grep -i ihsw | awk \'{print $1}\')'

# starting up the telegraf-collector on the work servers
gcloud compute ssh $DEFAULT_USER@nats-consumer -- $'docker start $(docker ps -a | grep -i telegraf-collector | awk \'{print $1}\')'
gcloud compute ssh $DEFAULT_USER@nats-consumer-high-cpu -- $'docker start $(docker ps -a | grep -i telegraf-collector | awk \'{print $1}\')'
gcloud compute ssh $DEFAULT_USER@benchmarker -- $'docker start $(docker ps -a | grep -i telegraf-collector | awk \'{print $1}\')'
gcloud compute ssh $DEFAULT_USER@nats-producer-high-cpu -- $'docker start $(docker ps -a | grep -i telegraf-collector | awk \'{print $1}\')'
gcloud compute ssh $DEFAULT_USER@nats-producer-regular-cpu -- $'docker start $(docker ps -a | grep -i telegraf-collector | awk \'{print $1}\')'
