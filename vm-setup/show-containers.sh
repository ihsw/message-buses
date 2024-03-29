#! /bin/bash

# misc
SCP_IDENT="~/.ssh/google_compute_engine"
DEFAULT_USER="gcloud-from-work"

# fetching the list of ecp4 instances
ECP4_INSTANCES=$(gcloud compute instances list --filter=ecp4 | grep -vi terminated | tail -n +2 | awk '{print $1}')

# going over each of them and starting them
for instance in $ECP4_INSTANCES
do
    echo "containers on $instance"
	gcloud compute ssh $DEFAULT_USER@$instance -- 'docker ps'
done
