#!/bin/bash
region=$(aws configure get region)
printf "\nThe region currently configured is \x1b[33m${region}\x1b[0m.\n\n"

read -p $'Deploying this demo application in your AWS account will create and consume AWS resources, which will cost money.\n
Are you sure you want to proceed? Press 'y' to acknowledge and proceed, or press any other key to abort: ' -n 1 -r
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
else
    printf "\n\n\n\n"
fi

printf "Installing dependencies...\n\n"
npm i --silent

translate_languages=""
read -p $'Do you want to enable the Translate feature to view stream transcriptions in other languages? Enabling this feature will incur in additional costs. \n
Press 'y' to enable or any other key to continue with Translate disabled: ' -n 1 -r 
if [[ $REPLY =~ ^[Yy]$ ]]
then
    translate_languages=$(node get-translate-languages.js)
    translate_validation_result=$(node validate-translate-config.js $translate_languages)

    case $translate_validation_result in
    "1")
        printf "\n\n\x1b[33mThere must be at least one Translate language enabled, aborting deployment...\x1b[0m\n"
        exit 2
    ;;
    "2")
        printf "\n\n\x1b[33mYou have enabled a Translate language that is equal to the Transcribe language, aborting deployment...\x1b[0m\n"
        exit 2
    ;;
    "3")
        printf "\n\n\x1b[33mThere was an error when validating Translate configuration, aborting deployment...\x1b[0m\n"
        exit 2
    ;;
    esac

    enable_translate=true
else
    enable_translate=false
fi

printf "\n\nTranslate feature enabled: \x1b[33m$enable_translate\x1b[0m.\n\n\n"

read -p "Stack name: " stackname

bash setup-lambdas.sh
bash setup-images.sh $enable_translate $stackname
bash create-stack.sh $stackname $enable_translate $translate_languages
bash deploy-player-app.sh stack.json

# configure overlays, custom vocabulary and vocabulary filter; if applicable
audio_language_code=$(node get-audio-language-code.js --stackOutputFilePath stack.json)
if [ "$audio_language_code" = "en" ] ; 
then
    cd ../configuration && npm i --silent && bash configure-all.sh
else
    printf "\n\n\x1b[33mAudio language different from English: Overlays, Custom Vocabulary and Vocabulary Filter configurations skipped.\x1b[0m\n"
fi

# output necessary values to use the demo
cd ../deployment && node generate-output.js --stackOutputFilePath stack.json