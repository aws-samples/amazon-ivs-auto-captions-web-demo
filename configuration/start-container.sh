#!/bin/bash

# Validate that the required parameters are given
if [ -z $1 ] || [ -z $2 ]; then
	printf "\n\nCLUSTER_NAME and SERVICE_NAME parameters are required" && exit 1
fi

export CLUSTER_NAME=$1
export SERVICE_NAME=$2

printf "\n\nStarting service \"$2\"...\n"
# Update SERVICE_NAME to set desired count of tasks to 1
aws ecs update-service \
	--cluster $CLUSTER_NAME \
	--service $SERVICE_NAME \
	--desired-count 1

if [ $? != 0 ]; then exit 1; fi

printf "\nWaiting for \"$2\" service to be started...\n"
# Wait until stream service is stable (task is running)
aws ecs wait services-stable \
	--cluster $CLUSTER_NAME \
	--services $SERVICE_NAME

if [ $? == 0 ]; then
	printf "\n\"$2\" service successfully started!\n"
fi
