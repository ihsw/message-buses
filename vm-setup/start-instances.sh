#! /bin/bash

# misc
SCP_IDENT="~/.ssh/google_compute_engine"

# fetching the list of ecp4 instances
ECP4_INSTANCES=$(gcloud compute instances list --filter=ecp4 | tail -n +2 | awk '{print $1}')

# going over each of them and starting them
for instance in $ECP4_INSTANCES
do
	gcloud compute instances start $instance
done
