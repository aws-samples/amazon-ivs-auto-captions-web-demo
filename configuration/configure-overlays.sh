#!/bin/bash
AWS_REGION=$(aws configure get region)

# Configure overlays
node ./cleanup-overlays.js --tableName ivs-transcribe-demo-overlays-<RANDOM_SUFFIX> --awsRegion $AWS_REGION
node ./load-overlays.js --filePath data/overlays.json --dynamoDbTable ivs-transcribe-demo-overlays-<RANDOM_SUFFIX> --awsRegion $AWS_REGION

# Restart Transcribe container
bash ./stop-container.sh ivs-transcribe-demo-cluster-<RANDOM_SUFFIX> ivs-transcribe-demo-transcribe-service-<RANDOM_SUFFIX>
bash ./start-container.sh ivs-transcribe-demo-cluster-<RANDOM_SUFFIX> ivs-transcribe-demo-transcribe-service-<RANDOM_SUFFIX>