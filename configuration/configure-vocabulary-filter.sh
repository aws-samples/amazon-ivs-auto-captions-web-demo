# Remove current
aws transcribe delete-vocabulary-filter --vocabulary-filter-name ivs-transcribe-demo-vocabulary-filter-<RANDOM_SUFFIX>

# Create new
bash ./create-vocabulary-filter.sh data/vocabulary-filter.txt

# Restart Transcribe container
bash ./stop-container.sh ivs-transcribe-demo-cluster-<RANDOM_SUFFIX> ivs-transcribe-demo-transcribe-service-<RANDOM_SUFFIX>
bash ./start-container.sh ivs-transcribe-demo-cluster-<RANDOM_SUFFIX> ivs-transcribe-demo-transcribe-service-<RANDOM_SUFFIX>