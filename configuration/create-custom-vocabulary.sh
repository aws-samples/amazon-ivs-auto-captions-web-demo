#!/bin/bash

# Validate that the required parameters are given
if [ -z $1 ]; then
	printf "\n\nVOCABULARY_FILE_PATH parameter is required" && exit 1
fi

VOCABULARY_FILE_PATH=$1
AWS_REGION=$(aws configure get region)

VOCABULARY_NAME=ivs-transcribe-demo-custom-vocabulary-<RANDOM_SUFFIX>
LANGUAGE_CODE=en-US

S3_BUCKET=ivs-transcribe-demo-vocabulary-config-<RANDOM_SUFFIX>
FILE_NAME=custom-vocabulary.txt
VOCABULARY_FILE_URI=s3://$S3_BUCKET/$FILE_NAME

printf "\n\nUploading custom vocabulary file to S3 bucket...\n"

# Upload the custom vocabulary file to S3
aws s3 cp $VOCABULARY_FILE_PATH $VOCABULARY_FILE_URI

if [ $? != 0 ]; then exit 1; fi

printf "\nCreating custom vocabulary \"$VOCABULARY_NAME\" in Transcribe...\n"

# Create the custom vocabulary in Transcribe
aws transcribe create-vocabulary \
	--vocabulary-name $VOCABULARY_NAME \
	--language-code $LANGUAGE_CODE \
	--vocabulary-file-uri $VOCABULARY_FILE_URI

if [ $? != 0 ]; then exit 1; fi

printf "\nURL: https://console.aws.amazon.com/transcribe/home?region=${AWS_REGION}#vocabulary-details/${VOCABULARY_NAME}"

GET_VOCABULARY () {
	aws transcribe get-vocabulary --vocabulary-name $VOCABULARY_NAME
}

GET_VOCABULARY_ERROR () {
	aws transcribe get-vocabulary --vocabulary-name $VOCABULARY_NAME --query FailureReason --output text
}

GET_VOCABULARY_STATE () {
	aws transcribe get-vocabulary --vocabulary-name $VOCABULARY_NAME --query VocabularyState --output text
}

VOCABULARY_STATE=$(GET_VOCABULARY_STATE)

printf "\nValidating custom vocabulary... (this may take a few minutes)"

# Wait for Transcribe to validate the custom vocabulary
while [ $VOCABULARY_STATE == PENDING ]
	do sleep 5; VOCABULARY_STATE=$(GET_VOCABULARY_STATE)
done

if [ $? != 0 ]; then exit 1; fi

if [ $VOCABULARY_STATE == READY ]; then
	printf "\nCustom vocabulary \"$VOCABULARY_NAME\" is READY!\n"
else
	printf "\n$(GET_VOCABULARY_ERROR)\n";
fi