#!/bin/bash

# Validate that the required parameter is given
if [ -z $1 ]; then
	printf "\n\nSTACK_FILE_PATH parameter is required" && exit 1
fi

STACK_FILE_PATH=$1
S3_BUCKET_URI=s3://ivs-transcribe-demo-player-app-<RANDOM_SUFFIX>/

printf "\n\nGenerating environment variables file for Player App..."
node generate-player-app-env-vars.js $STACK_FILE_PATH
if [ $? != 0 ]; then exit 1; fi

printf "\n\nInstalling Player App dependencies..."
cd ../web-ui/player-app
npm i --silent

printf "\n\nBuilding Player App..."
npm run env -- env-cmd -f .env react-scripts build --silent

printf "\n\nUploading build files..."
aws s3 cp build $S3_BUCKET_URI --recursive --only-show-errors
cd ../../deployment
if [ $? != 0 ]; then exit 1; fi

printf "\n\nPlayer App deployment complete!\n"