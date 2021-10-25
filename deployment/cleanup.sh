#!/bin/bash
echo
read -p "Stack name: " STACKNAME

VOCABULARY_CONFIG_BUCKET=s3://ivs-transcribe-demo-vocabulary-config-<RANDOM_SUFFIX>
PLAYER_BUCKET=s3://ivs-transcribe-demo-player-app-<RANDOM_SUFFIX>
LAMBDA_FUNCTIONS_BUCKET=s3://ivs-transcribe-demo-lambda-functions-<RANDOM_SUFFIX>
STREAM_REPOSITORY_NAME=ivs-transcribe-demo-stream-images-<RANDOM_SUFFIX>
TRANSCRIBE_REPOSITORY_NAME=ivs-transcribe-demo-transcribe-images-<RANDOM_SUFFIX>
TRANSLATE_REPOSITORY_NAME=ivs-transcribe-demo-translate-images-<RANDOM_SUFFIX>
VOCABULARY_NAME=ivs-transcribe-demo-custom-vocabulary-<RANDOM_SUFFIX>
VOCABULARY_FILTER_NAME=ivs-transcribe-demo-vocabulary-filter-<RANDOM_SUFFIX>

# The following buckets are just emptied, since they are included in the CloudFormation
# template and will be removed along with the stack
printf "\nEmptying bucket \"$VOCABULARY_CONFIG_BUCKET\"...\n"
aws s3 rm $VOCABULARY_CONFIG_BUCKET --recursive --quiet

printf "\nEmptying bucket \"$PLAYER_BUCKET\"...\n"
aws s3 rm $PLAYER_BUCKET --recursive --quiet

# Remove stages to avoid error when deleting APIs:
# "Active stages pointing to this deployment must be moved or deleted"
node delete-api-stages.js --stackOutputFilePath stack.json

printf "\nRemoving stack \x1b[33m$STACKNAME\x1b[0m...\n"
aws cloudformation delete-stack --stack-name $STACKNAME
aws cloudformation wait stack-delete-complete --stack-name $STACKNAME

printf "\nRemoving bucket \"$LAMBDA_FUNCTIONS_BUCKET\"...\n"
aws s3 rb $LAMBDA_FUNCTIONS_BUCKET --force

printf "\nRemoving ECR repository \"$STREAM_REPOSITORY_NAME\"...\n"
aws ecr delete-repository --repository-name $STREAM_REPOSITORY_NAME --force

printf "\nRemoving ECR repository \"$TRANSCRIBE_REPOSITORY_NAME\"...\n"
aws ecr delete-repository --repository-name $TRANSCRIBE_REPOSITORY_NAME --force

printf "\nChecking if translate ECR repository exists: \"$TRANSLATE_REPOSITORY_NAME\"\n"
aws ecr describe-repositories --repository-names $TRANSLATE_REPOSITORY_NAME &> /dev/null
if [[ $? == 0 ]]
then
    printf "\nRepository found, removing...\n"
    aws ecr delete-repository --repository-name $TRANSLATE_REPOSITORY_NAME --force
    else
    printf "\nRepository not found, skipped\n"
fi

printf "\nRemoving Transcribe custom vocabulary \"$VOCABULARY_NAME\"...\n"
aws transcribe delete-vocabulary --vocabulary-name $VOCABULARY_NAME

printf "\nRemoving Transcribe vocabulary filter \"$VOCABULARY_FILTER_NAME\"...\n"
aws transcribe delete-vocabulary-filter --vocabulary-filter-name $VOCABULARY_FILTER_NAME

printf "\nCleanup complete!\n"