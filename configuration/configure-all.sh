#!/bin/bash
AWS_REGION=$(aws configure get region)

# Configure overlays
node ./cleanup-overlays.js --tableName ivs-transcribe-demo-overlays-<RANDOM_SUFFIX> --awsRegion $AWS_REGION
node ./load-overlays.js --filePath data/overlays.json --dynamoDbTable ivs-transcribe-demo-overlays-<RANDOM_SUFFIX> --awsRegion $AWS_REGION

# Configure custom vocabulary
aws transcribe delete-vocabulary --vocabulary-name ivs-transcribe-demo-custom-vocabulary-<RANDOM_SUFFIX>
bash ./create-custom-vocabulary.sh data/custom-vocabulary.txt

# Configure vocabulary filter
aws transcribe delete-vocabulary-filter --vocabulary-filter-name ivs-transcribe-demo-vocabulary-filter-<RANDOM_SUFFIX>
bash ./create-vocabulary-filter.sh data/vocabulary-filter.txt

# Restart Transcribe container
bash ./stop-container.sh ivs-transcribe-demo-cluster-<RANDOM_SUFFIX> ivs-transcribe-demo-transcribe-service-<RANDOM_SUFFIX>
bash ./start-container.sh ivs-transcribe-demo-cluster-<RANDOM_SUFFIX> ivs-transcribe-demo-transcribe-service-<RANDOM_SUFFIX>