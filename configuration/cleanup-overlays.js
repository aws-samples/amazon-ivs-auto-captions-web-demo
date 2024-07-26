const {
  DynamoDBClient,
  BatchWriteItemCommand,
  DescribeTableCommand,
  ScanCommand
} = require('@aws-sdk/client-dynamodb');
const _ = require('lodash/fp');
const args = require('minimist')(process.argv.slice(2));

if (!args.tableName) {
  console.error('--tableName argument is missing');
  process.exit(1);
}

const ddb = new DynamoDBClient({ region: args.awsRegion });

// Get all results, paginating until there are no more elements
const getPaginatedResults = async (fn) => {
  const EMPTY = Symbol('empty');
  const res = [];
  for await (const lf of (async function* () {
    let NextMarker = EMPTY;
    while (NextMarker || NextMarker === EMPTY) {
      const { marker, results } = await fn(
        NextMarker !== EMPTY ? NextMarker : undefined
      );

      yield* results;
      NextMarker = marker;
    }
  })()) {
    res.push(lf);
  }

  return res;
};

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

// Write a batch of items, taking care of retrying the request when some elements are unprocessed
const batchWrite = async (items, retryCount = 0) => {
  const { UnprocessedItems = [] } = await ddb.send(
    new BatchWriteItemCommand({ RequestItems: items })
  );

  if (UnprocessedItems.length > 0) {
    if (retryCount > 8) {
      throw new Error(UnprocessedItems);
    }
    await wait(2 ** retryCount * 10);

    return batchWrite(UnprocessedItems, retryCount + 1);
  }
};

// Return the keys for a table
const getKeyDefinitions = async (table) => {
  const {
    Table: { KeySchema = [], AttributeDefinitions = [] }
  } = await ddb.send(new DescribeTableCommand({ TableName: table }));

  return KeySchema.map(({ AttributeName, KeyType }) => {
    return {
      AttributeName,
      AttributeType: AttributeDefinitions.find(
        (attributeDefinition) =>
          attributeDefinition.AttributeName === AttributeName
      ).AttributeType,
      KeyType
    };
  });
};

// Clear a table
const clearTable = async (table) => {
  // Get the key definitions
  const keys = await getKeyDefinitions(table);

  // Get all items
  const allItems = await getPaginatedResults(async (LastEvaluatedKey) => {
    const items = await ddb.send(
      new ScanCommand({
        TableName: table,
        ExclusiveStartKey: LastEvaluatedKey,
        ProjectionExpression: keys.map((_k, i) => `#K${i}`).join(', '),
        ExpressionAttributeNames: _.fromPairs(
          keys.map(({ AttributeName }, i) => [`#K${i}`, AttributeName])
        )
      })
    );
    return {
      marker: items.LastEvaluatedKey,
      results: items.Items
    };
  });

  // Make batches (batchWriteItem has a limit of 25 requests)
  const batches = _.chunk(25)(allItems);

  // Send the batch delete operations
  await Promise.all(
    batches.map((batch) => {
      return batchWrite({
        [table]: batch.map((obj) => {
          return {
            DeleteRequest: {
              Key: _.flow(
                _.map(({ AttributeName }) => {
                  return [AttributeName, obj[AttributeName]];
                }),
                _.fromPairs
              )(keys)
            }
          };
        })
      });
    })
  );
};

const cleanupOverlays = async () => {
  try {
    await clearTable(args.tableName);
    console.log(
      `\n\nOverlay items deleted from "${args.tableName}" table successfully!`
    );
  } catch (error) {
    console.error(`\n\nScript execution failed:\n${error.message}`);
    process.exit(2);
  }
};

cleanupOverlays();
