#!/bin/bash

# Validate that the required parameter is given
if [ -z $1 ]; then
	printf "\n\nENABLE_TRANSLATE parameter is required" && exit 1
fi

# Validate that the required parameter is given
if [ -z $2 ]; then
	printf "\n\nSTACKNAME parameter is required" && exit 1
fi

ENABLE_TRANSLATE=$1
STACKNAME=$2

# Setup variables
AWS_REGION=$(aws configure get region)
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
STREAM_REPOSITORY_NAME=ivs-transcribe-demo-stream-images-<RANDOM_SUFFIX>
TRANSCRIBE_REPOSITORY_NAME=ivs-transcribe-demo-transcribe-images-<RANDOM_SUFFIX>
TRANSLATE_REPOSITORY_NAME=ivs-transcribe-demo-translate-images-<RANDOM_SUFFIX>

# Log in into registry
printf "\n\nLogging in into default private registry...\n"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
if [ $? != 0 ]; then exit 1; fi

# Build and push Stream service image
printf "\n\nCreating image repository for Stream service...\n"
aws ecr create-repository --repository-name $STREAM_REPOSITORY_NAME
printf "\n\nBuilding and pushing Stream service image...\n"
cd ../serverless/stream-server
docker build -q -t $ECR_REGISTRY/$STREAM_REPOSITORY_NAME:latest .
docker push $ECR_REGISTRY/$STREAM_REPOSITORY_NAME:latest
if [ $? != 0 ]; then exit 1; fi

# Build and push Transcribe service image
printf "\n\nCreating image repository for Transcribe service...\n"
aws ecr create-repository --repository-name $TRANSCRIBE_REPOSITORY_NAME
printf "\n\nBuilding and pushing Transcribe service image...\n"
cd ../transcribe-server && cp -r ../utils ./src/utils
docker build -q -t $ECR_REGISTRY/$TRANSCRIBE_REPOSITORY_NAME:latest .
rm -rf ./src/utils
docker push $ECR_REGISTRY/$TRANSCRIBE_REPOSITORY_NAME:latest
if [ $? != 0 ]; then exit 1; fi

# Build and push Translate service image
if [ $ENABLE_TRANSLATE == "true" ] ; 
then 
	printf "\n\nCreating image repository for Translate service...\n"
	aws ecr create-repository --repository-name $TRANSLATE_REPOSITORY_NAME
	printf "\n\nBuilding and pushing Translate service image...\n"
	cd ../translate-server && cp -r ../utils ./src/utils
	docker build -q -t $ECR_REGISTRY/$TRANSLATE_REPOSITORY_NAME:latest .
	rm -rf ./src/utils
	docker push $ECR_REGISTRY/$TRANSLATE_REPOSITORY_NAME:latest
	cd ../../deployment
	if [ $? != 0 ]; then exit 1; fi
fi

printf "\n\nECS container images setup complete!\n"