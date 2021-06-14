## Configuration

### Prerequisites

* [Node.js version 12.0.0 or later](https://nodejs.org/) to run Node scripts
* [AWS account](https://aws.amazon.com/) to create resources
* [AWS CLI version 2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) to run scripts
* [Git Bash](https://git-scm.com/) to run Bash scripts (only on Windows)

> **Of note:**<br>
> When performing one of the following configurations, captions will disappear for a couple of seconds until the Transcribe service is restarted to take the new configuration.

### Configure overlays

You can configure image overlays that are triggered via "keywords" in captions so they pop up on top of the player during the stream for a couple of seconds. Both the keywords and images can be configured by modifying the [overlays.json file](./data/overlays.json), which already contains a default configuration, and running the script: 

```shell
bash configure-overlays.sh
```

### Configure custom vocabulary

You can configure a [custom vocabulary](https://docs.aws.amazon.com/transcribe/latest/dg/how-vocabulary.html) by modifying the [custom-vocabulary.txt file](./data/custom-vocabulary.txt), which already contains a default configuration, and running the script:

```shell
bash configure-custom-vocabulary.sh
```

### Configure vocabulary filter

You can configure a [vocabulary filter](https://docs.aws.amazon.com/transcribe/latest/dg/filter-unwanted-words.html) by modifying the [vocabulary-filter.txt file](./data/vocabulary-filter.txt), which already contains a default configuration, and running the script:

```shell
bash configure-vocabulary-filter.sh
```

### Configure all at once

You can perform the previous configurations all at once by updating the [overlays.json](./data/overlays.json), [custom-vocabulary.txt](./data/custom-vocabulary.txt) and/or [vocabulary-filter.txt](./data/vocabulary-filter.txt) files, and running the following script:

```shell
bash configure-all.sh
```

<br>

## Scripts included in this folder

This section includes details of every script present in this folder for informational purposes, you need only to run the scripts described in the **Configuration** section above.

<br>

### start-container.sh

This script starts the specified service in the specified ECS cluster.

Parameters:
1) CLUSTER_NAME (required)
2) SERVICE_NAME (required)

Example:

```shell
bash start-container.sh ivs-transcribe-demo-cluster ivs-transcribe-demo-stream-service`
```

<br>

### stop-container.sh

This script stops the specified service in the specified ECS cluster.

Parameters:
1) CLUSTER_NAME (required)
2) SERVICE_NAME (required)

Example:

```shell
bash stop-container.sh ivs-transcribe-demo-cluster ivs-transcribe-demo-transcribe-service
```

<br>

### load-overlays.js

This script loads the overlay items defined in the specified JSON file into the specified DynamoDB table.

Parameters:
* `--filePath`: Path to JSON file with the overlays data (required).
* `--dynamoDbTable`: Name of the DynamoDB table where to load the overlay items (required).
* `--awsRegion`: AWS region where the table is located (required).

Example:

```shell
node load-overlays.js --filePath data/overlays.json --dynamoDbTable ivs-transcribe-demo-overlays --awsRegion us-east-1
```

<br>

### cleanup-overlays.js

This script removes all items from the specified DynamoDB table.

Parameters:
1) TABLE_NAME (required)

Example:

```shell
bash cleanup-overlays.sh ivs-transcribe-demo-overlays
```

<br>

### create-custom-vocabulary.sh

Creates a [custom vocabulary](https://docs.aws.amazon.com/transcribe/latest/dg/how-vocabulary.html) in Amazon Transcribe using a [vocabulary table](https://docs.aws.amazon.com/transcribe/latest/dg/how-vocabulary.html#create-vocabulary-table). This requires a source file to be stored in an Amazon S3 bucket.

The script uploads the .txt file that contains the vocabulary table into an S3 bucket and creates the custom vocabulary using the S3 URI of the file. Language code **en-US** is used by default. Amazon Transcribe then validates that the vocabulary is correct. Once it's finished, the script informs the user whether the custom vocabulary is READY to use or if it FAILED and the reason why.

Parameters:
1) VOCABULARY_FILE_PATH (required)

You can find an example file containing a custom vocabulary table in:<br>`data/custom-vocabulary.txt`

Example:

```shell
bash create-custom-vocabulary.sh data/custom-vocabulary.txt
```

<br>

### create-vocabulary-filter.sh

Creates a [vocabulary filter](https://docs.aws.amazon.com/transcribe/latest/dg/filter-unwanted-words.html) in Amazon Transcribe to filter unwanted words. This requires a source file to be stored in an Amazon S3 bucket.

The script uploads the .txt file that contains the list of unfiltered words into an S3 bucket, and then creates the vocabulary filter using the S3 URI of the file. Language code **en-US** is used by default.

Parameters:
* VOCABULARY_FILTER_FILE_PATH (required)

You can find an example file with words to be filtered in:<br>`data/vocabulary-filter.txt`

Example:

```shell
bash create-vocabulary-filter.sh data/vocabulary-filter.txt
```

<br>

### configure-overlays.sh

Calls the [cleanup-overlays.js](#cleanup-overlaysjs) script to cleanup the overlays table. Then, calls the [load-overlays.js](#load-overlaysjs) script to fill the overlay table again and finanlly calls the [stop-container.sh](#stop-containersh) and [start-container](#start-containersh) scripts to restart the Transcribe container to take the new configuration.

Parameters: None

Example:

```shell
bash configure-overlays.sh
```

<br>

### configure-custom-vocabulary.sh

Calls the [create-custom-vocabulary.sh](#create-custom-vocabularysh) to create the custom vocabulary and then calls the [stop-container.sh](#stop-containersh) and [start-container](#start-containersh) scripts to restart the Transcribe container to take the new configuration.

Parameters: None

Example:

```shell
bash configure-custom-vocabulary.sh
```

<br>

### configure-vocabulary-filter.sh

Calls the [create-vocabulary-filter.sh](#create-vocabulary-filtersh) to create the vocabulary filter and then calls the [stop-container.sh](#stop-containersh) and [start-container](#start-containersh) scripts to restart the Transcribe container to take the new configuration.

Parameters: None

Example:
```shell
bash configure-vocabulary-filter.sh
```

<br>

### configure-all.sh

Performs all the possible configurations at once, by calling the following scripts with the corresponding arguments:

1) [cleanup-overlays.js](#cleanup-overlaysjs)
2) [load-overlays.js](#load-overlaysjs)
3) [create-custom-vocabulary.sh](#create-custom-vocabularysh)
4) [create-vocabulary-filter.sh](#create-vocabulary-filtersh)
5) [stop-container.sh](#stop-containersh)
6) [start-container](#start-containersh)

Parameters: None

Example:
```shell
bash configure-all.sh
```