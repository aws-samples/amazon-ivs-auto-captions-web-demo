const AWS = require("aws-sdk");
const _ = require("lodash/fp");
const args = require("minimist")(process.argv.slice(2));

if (!args.tableName) {
    console.error('--tableName argument is missing');
    process.exit(1);
}

AWS.config.update({ region: args.awsRegion });
const ddb = new AWS.DynamoDB();

// get all results, paginating until there are no more elements
const getPaginatedResults = async (fn) => {
	const EMPTY = Symbol("empty");
	const res = [];
	for await (const lf of (async function*() {
		let NextMarker = EMPTY;
		while (NextMarker || NextMarker === EMPTY) {
			const {marker, results} = await fn(NextMarker !== EMPTY ? NextMarker : undefined);

			yield* results;
			NextMarker = marker;
		}
	})()) {
		res.push(lf);
	}

	return res;
};

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

// writes a batch of items, taking care of retrying the request when some elements are unprocessed
const batchWrite = async (items, retryCount = 0) => {
	const res = await ddb.batchWriteItem({RequestItems: items}).promise();

	if(res.UnprocessedItems && res.UnprocessedItems.length > 0) {
		if (retryCount > 8) {
			throw new Error(res.UnprocessedItems);
		}
		await wait(2 ** retryCount * 10);

		return batchWrite(res.UnprocessedItems, retryCount + 1);
	}
};

// returns the keys for a table
const getKeyDefinitions = async (table) => {
	const tableInfo = (await ddb.describeTable({TableName: table}).promise()).Table;
	return tableInfo.KeySchema.map(({AttributeName, KeyType}) => {
		return {
			AttributeName,
			AttributeType: tableInfo.AttributeDefinitions.find((attributeDefinition) => attributeDefinition.AttributeName === AttributeName).AttributeType,
			KeyType,
		};
	});
};

// clears a table
const clearTable = async (table) => {
	// get the key definitions
	const keys = await getKeyDefinitions(table);

	// get all items
	const allItems = await getPaginatedResults(async (LastEvaluatedKey) => {
		const items = await ddb.scan({
			TableName: table,
			ExclusiveStartKey: LastEvaluatedKey,
			ProjectionExpression: keys.map((_k, i) => `#K${i}`).join(", "),
			ExpressionAttributeNames: _.fromPairs(keys.map(({AttributeName}, i) => [`#K${i}`, AttributeName])),
		}).promise();
		return {
			marker: items.LastEvaluatedKey,
			results: items.Items,
		};
	});

	// make batches (batchWriteItem has a limit of 25 requests)
	const batches = _.chunk(25)(allItems);

	// send the batch deletes
	await Promise.all(batches.map((batch) => {
		return batchWrite({
			[table]: batch.map((obj) => {
				return {
					DeleteRequest: {
						Key: _.flow(
							_.map(({AttributeName}) => {
								return [AttributeName, obj[AttributeName]];
							}),
							_.fromPairs,
						)(keys)
					}
				};
			})
		});
	}));
};

const cleanupOverlays = () => {
    try {
        (clearTable)(args.tableName);
        console.log(`\n\nOverlay items deleted from table "${args.tableName}" successfully!`);
    } catch (error) {
        console.error(`\n\nScript execution failed:\n${error.message}`);
        process.exit(2);
    }
}

cleanupOverlays();