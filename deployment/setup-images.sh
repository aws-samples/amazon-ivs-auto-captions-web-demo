#!/bin/bash

# Setup variables
AWS_REGION=$(aws configure get region)
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
STREAM_REPOSITORY_NAME=ivs-transcribe-demo-stream-images-<RANDOM_SUFFIX>
TRANSCRIBE_REPOSITORY_NAME=ivs-transcribe-demo-transcribe-images-<RANDOM_SUFFIX>
ECR_REGISTRY=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Log in into registry
printf "\n\nLogging in into default private registry...\n"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
if [ $? != 0 ]; then exit 1; fi

# Build and push Stream service image
printf "\n\nCreating image repository for Stream service...\n"
aws ecr create-repository --repository-name $STREAM_REPOSITORY_NAME
printf "\n\nBuilding and pushing Stream service image...\n"
cd ../serverless/stream-server && docker build -q -t $ECR_REGISTRY/$STREAM_REPOSITORY_NAME:latest .
docker push $ECR_REGISTRY/$STREAM_REPOSITORY_NAME:latest
if [ $? != 0 ]; then exit 1; fi

# Build and push Transcribe service image
printf "\n\nCreating image repository for Transcribe service...\n"
aws ecr create-repository --repository-name $TRANSCRIBE_REPOSITORY_NAME
printf "\n\nBuilding and pushing Transcribe service image...\n"
cd ../transcribe-server && docker build -q -t $ECR_REGISTRY/$TRANSCRIBE_REPOSITORY_NAME:latest .
docker push $ECR_REGISTRY/$TRANSCRIBE_REPOSITORY_NAME:latest
cd ../../deployment
if [ $? != 0 ]; then exit 1; fi

printf "\n\nECS container images setup complete!\n"