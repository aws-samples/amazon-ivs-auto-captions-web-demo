# Remove current
aws transcribe delete-vocabulary --vocabulary-name ivs-transcribe-demo-custom-vocabulary-<RANDOM_SUFFIX>

# Create new
bash ./create-custom-vocabulary.sh data/custom-vocabulary.txt

# Restart Transcribe container
bash ./stop-container.sh ivs-transcribe-demo-cluster-<RANDOM_SUFFIX> ivs-transcribe-demo-transcribe-service-<RANDOM_SUFFIX>
bash ./start-container.sh ivs-transcribe-demo-cluster-<RANDOM_SUFFIX> ivs-transcribe-demo-transcribe-service-<RANDOM_SUFFIX>