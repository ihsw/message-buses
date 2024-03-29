#! /bin/bash

# misc
GCLOUD_HOST=$1
SCP_IDENT="$HOME/.ssh/google_compute_engine"
DEFAULT_USER="gcloud-from-work"

# validation
if [ -z $GITHUB_IDENT_FILE ]; then
	echo 'GITHUB_IDENT_FILE for gcloud compute is blank!'
	exit 1
fi
if [ -z $GCLOUD_HOST ]; then
	echo 'GCLOUD_HOST for gcloud compute is blank!'
	exit 1
fi

# fetching the ip for this host and the influx host
GCLOUD_EXTERNAL_IP=$(gcloud compute instances list | grep $GCLOUD_HOST | awk '{print $5}')
INFLUX_HOST=$(gcloud compute instances list | grep influxdb-server | awk '{print $4}')

if [ -z $GCLOUD_EXTERNAL_IP ]; then
	echo "Host $GCLOUD_HOST could not be found in google cloud compute!"
	exit 1
fi

# scp and gcloud args
SCP_AUTH="$DEFAULT_USER@$GCLOUD_EXTERNAL_IP"
SCP_ARGS="-i $SCP_IDENT"
GCLOUD_AUTH="$DEFAULT_USER@$GCLOUD_HOST"

# installing docker
scp $SCP_ARGS ./vm-setup/install-docker.sh $SCP_AUTH:~
gcloud compute ssh $GCLOUD_AUTH -- "sudo ~/install-docker.sh"
gcloud compute ssh $GCLOUD_AUTH -- 'sudo usermod -aG docker $USER && docker run hello-world'

# cloning the repo and starting up a telegraf collector
scp $SCP_ARGS $GITHUB_IDENT_FILE $SCP_AUTH:~/.ssh
scp $SCP_ARGS ./vm-setup/ssh-config $SCP_AUTH:~/.ssh/config
gcloud compute ssh $GCLOUD_AUTH -- "ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts"
gcloud compute ssh $GCLOUD_AUTH -- "git clone git@github.com:ihsw/message-buses.git"
gcloud compute ssh $GCLOUD_AUTH -- "docker build -t ihsw/telegraf-collector ./message-buses/telegraf-collector"
gcloud compute ssh $GCLOUD_AUTH -- "docker run -it -d -e INFLUXDB_HOST=$INFLUX_HOST -e GROUP_NAME=$GCLOUD_HOST ihsw/telegraf-collector"
