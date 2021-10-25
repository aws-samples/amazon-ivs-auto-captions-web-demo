#!/bin/bash
region=$(aws configure get region)

printf "\nGenerating Lambda functions zip files...\n"
node zip-generator.js \
../serverless/lambda-on-connect \
../serverless/lambda-on-disconnect \
../serverless/lambda-send-transcription \
../serverless/lambda-send-transcription-chunks \
../serverless/lambda-delete-stale-connection

printf "\nCreating S3 bucket to upload Lambda functions zip files...\n"
if [ ${region} == 'us-east-1' ]
then
    aws s3api create-bucket --bucket ivs-transcribe-demo-lambda-functions-<RANDOM_SUFFIX> --region ${region}
else
    aws s3api create-bucket --bucket ivs-transcribe-demo-lambda-functions-<RANDOM_SUFFIX> --region ${region} --create-bucket-configuration LocationConstraint=${region}
fi

if [ $? != 0 ]; then exit 1; fi

printf "\nUploading Lambda functions zip files into S3 bucket...\n"
aws s3 cp lambda-on-connect.zip s3://ivs-transcribe-demo-lambda-functions-<RANDOM_SUFFIX>/
aws s3 cp lambda-on-disconnect.zip s3://ivs-transcribe-demo-lambda-functions-<RANDOM_SUFFIX>/
aws s3 cp lambda-send-transcription.zip s3://ivs-transcribe-demo-lambda-functions-<RANDOM_SUFFIX>/
aws s3 cp lambda-send-transcription-chunks.zip s3://ivs-transcribe-demo-lambda-functions-<RANDOM_SUFFIX>/
aws s3 cp lambda-delete-stale-connection.zip s3://ivs-transcribe-demo-lambda-functions-<RANDOM_SUFFIX>/
if [ $? != 0 ]; then exit 1; fi

printf "\nLambda functions setup complete!\n"