#!/bin/bash

# Validate that the required parameter is given
if [ -z $1 ]; then
	printf "\n\nVOCABULARY_FILTER_FILE_PATH parameter is required" && exit 1
fi

VOCABULARY_FILTER_FILE_PATH=$1

VOCABULARY_FILTER_NAME=ivs-transcribe-demo-vocabulary-filter-<RANDOM_SUFFIX>
LANGUAGE_CODE=en-US

S3_BUCKET=ivs-transcribe-demo-vocabulary-config-<RANDOM_SUFFIX>
FILE_NAME=vocabulary-filter.txt
VOCABULARY_FILTER_FILE_URI=s3://$S3_BUCKET/$FILE_NAME

printf "\n\nUploading vocabulary filter file to S3 bucket...\n"

# Upload the vocabulary filter file to S3
aws s3 cp $VOCABULARY_FILTER_FILE_PATH $VOCABULARY_FILTER_FILE_URI

if [ $? != 0 ]; then exit 1; fi

printf "\nCreating vocabulary filter \"$VOCABULARY_FILTER_NAME\" in Transcribe...\n"

# Create the vocabulary filter in Transcribe
aws transcribe create-vocabulary-filter \
    --vocabulary-filter-name $VOCABULARY_FILTER_NAME \
    --language-code $LANGUAGE_CODE \
    --vocabulary-filter-file-uri $VOCABULARY_FILTER_FILE_URI

if [ $? != 0 ]; then exit 1; fi

printf "\nVocabulary filter successfully created!\n"