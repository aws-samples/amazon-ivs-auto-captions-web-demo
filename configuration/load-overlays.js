const AWS = require('aws-sdk');
const fs = require('fs');
const args = require('minimist')(process.argv.slice(2));

// Validate arguments
let missingArguments = [];

if (!args.filePath) {
  missingArguments.push('--filePath argument is missing');
}

if (!args.dynamoDbTable) {
  missingArguments.push('--dynamoDbTable argument is missing');
}

if (!args.awsRegion) {
  missingArguments.push('--awsRegion argument is missing');
}

if (missingArguments.length > 0) {
  console.log(`\n\nArguments validation failed:\n${missingArguments.join('\n')}`);
  process.exit(1);
}

// Read file and load items in database
const filePath = args.filePath;
const dynamoDbTableName = args.dynamoDbTable;

AWS.config.update({ region: args.awsRegion });
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const loadOverlays = () => {
  (async () => {
    try {
      const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const formattedItems = items.map((item) => ({
        PutRequest: {
          Item: {
            keyword: { S: item.keyword },
            imageUrl: { S: item.imageUrl },
            website: { S: item.website ?? '' },
          },
        },
      }));

      const params = {
        RequestItems: {
          [dynamoDbTableName]: formattedItems,
        },
      };

      const result = await ddb.batchWriteItem(params).promise();

      if (result.UnprocessedItems?.length > 0) {
        console.error('\n\nError when loading overlay items. Please check the input file, cleanup the table and try again.');
        process.exit(2);
      }

      console.log(`\n\nOverlay items loaded into "${dynamoDbTableName}" table successfully!`);
    } catch (error) {
      console.error(`\n\nScript execution failed:\n${error.message}`);
      process.exit(3);
    }
  })();
};

loadOverlays();
