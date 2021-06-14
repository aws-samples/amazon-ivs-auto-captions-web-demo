#!/bin/bash
CHARS=0123456789abcdefghijklmnopqrstuvwxyz
RANDOM_SUFFIX=""
RANDOM_SUFFIX_LENGTH=6

for i in $(seq 1 $RANDOM_SUFFIX_LENGTH); do
    RANDOM_SUFFIX+="${CHARS:RANDOM%${#CHARS}:1}"
done

printf "\nGenerated random suffix: $RANDOM_SUFFIX\n"

perl -i.bak -p -e "s/<RANDOM_SUFFIX>/$RANDOM_SUFFIX/g" \
    ../configuration/configure-all.sh \
    ../configuration/configure-custom-vocabulary.sh \
    ../configuration/configure-overlays.sh \
    ../configuration/configure-vocabulary-filter.sh \
    ../configuration/create-custom-vocabulary.sh \
    ../configuration/create-vocabulary-filter.sh \
    cleanup.sh \
    cloudformation.yaml \
    deploy-player-app.sh \
    setup-images.sh \
    setup-lambdas.sh
    
# Delete backup files
rm ../configuration/*.bak
rm *.bak

printf "\n\nUpdated every resource name occurrence in cloudformation.yaml and bash scripts with the random suffix successfully!\n"