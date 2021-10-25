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

read -p $'Do you want to enable the Translate feature to view stream transcriptions in other languages? Enabling this feature will incur in additional costs. \n
Press 'y' to enable or any other key to continue with Translate disabled: ' -n 1 -r 
if [[ $REPLY =~ ^[Yy]$ ]]
then
    enable_translate=true
else
    enable_translate=false
fi

printf "\n\nTranslate feature enabled: \x1b[33m$enable_translate\x1b[0m.\n\n\n"

read -p "Stack name: " stackname

printf "\n\nInstalling dependencies..."
npm i --silent

bash setup-lambdas.sh
bash setup-images.sh $enable_translate $stackname
translate_languages=""
if [ "$enable_translate" = true ] ; 
then
    translate_languages=$(node get-translate-languages.js)
fi
bash create-stack.sh $stackname $enable_translate $translate_languages
bash deploy-player-app.sh stack.json
cd ../configuration && npm i --silent && bash configure-all.sh
cd ../deployment && node generate-output.js --stackOutputFilePath stack.json