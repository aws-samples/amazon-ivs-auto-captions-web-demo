#!/bin/bash

# Validate that the required parameter is given
if [ -z $1 ]; then
	printf "\n\nSTACKNAME parameter is required" && exit 1
fi

# Validate that the required parameter is given
if [ -z $2 ]; then
	printf "\n\nENABLE_TRANSLATE parameter is required" && exit 1
fi

STACKNAME=$1
ENABLE_TRANSLATE=$2
TRANSLATE_LANGUAGES=$3

STACK=$( \
aws cloudformation create-stack --stack-name $STACKNAME \
--template-body file://cloudformation.yaml \
--capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
--parameters ParameterKey=EnableTranslate,ParameterValue=$ENABLE_TRANSLATE ParameterKey=TranslateServiceTranslationsLanguageCodes,ParameterValue=$TRANSLATE_LANGUAGES )

printf "\n\nCreating stack \x1b[33m$STACKNAME\x1b[0m...\n$STACK"
aws cloudformation wait stack-create-complete --stack-name $STACKNAME
if [ $? != 0 ]; then exit 1; fi

printf "\n\nSaving stack outputs...\n"
aws cloudformation describe-stacks --stack-name $STACKNAME > stack.json

printf "\n\nStack creation complete!\n"