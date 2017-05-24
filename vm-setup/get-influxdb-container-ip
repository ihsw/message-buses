#! /bin/bash

# misc
SCP_IDENT="~/.ssh/google_compute_engine"
DEFAULT_USER="gcloud-from-work"

gcloud compute ssh $DEFAULT_USER@influxdb-server -- $'docker inspect -f \'{{ range .NetworkSettings.Networks }}{{ .IPAddress }}{{ end }}\' $(docker ps -a | grep -i influxdb-server | awk \'{print $1}\')'
