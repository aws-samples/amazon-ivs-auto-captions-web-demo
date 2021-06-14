const AWS = require("aws-sdk");
const fs = require("fs");
const args = require("minimist")(process.argv.slice(2));

// Validate args
let misingArgs = [];

if (!args.filePath) {
  misingArgs.push("--filePath argument is missing");
}

if (!args.dynamoDbTable) {
  misingArgs.push("--dynamoDbTable argument is missing");
}

if (!args.awsRegion) {
  misingArgs.push("--awsRegion argument is missing");
}

if (misingArgs.length > 0) {
  console.log(`\n\nArgs validation failed:\n${misingArgs.join("\n")}`);
  process.exit(1);
}

// Read file and load items in DB
const filePath = args.filePath;
const dynamoDbTableName = args.dynamoDbTable;

AWS.config.update({ region: args.awsRegion });
var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

const loadOverlays = () => {
  (async () => {
    try {
      const items = JSON.parse(fs.readFileSync(filePath, "utf8"));
  
      const formattedItems = items.map((x) => ({
        PutRequest: {
          Item: {
            keyword: { S: x.keyword },
            imageUrl: { S: x.imageUrl },
            website: { S: x.website ?? "" },
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
        console.error(
          "\n\nError when loading overlay items, please check the input file, cleanup the table and try again."
        );
        process.exit(2);
      }
  
      console.log(`\n\nOverlay items loaded into table "${dynamoDbTableName}" successfully!`);
    } catch (error) {
      console.error(`\n\nScript execution failed:\n${error.message}`);
      process.exit(3);
    }
  })();
};

loadOverlays();