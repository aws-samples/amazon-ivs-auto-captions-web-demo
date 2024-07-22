const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient();

const DEFAULT_LANG = 'en';

exports.handler = async (event) => {
  console.info('Incoming event:\n', JSON.stringify(event));

  const putParams = {
    TableName: process.env.TABLE_NAME,
    Item: marshall({
      connectionId: event.requestContext.connectionId,
      lang:
        event.queryStringParameters && event.queryStringParameters.lang
          ? event.queryStringParameters.lang
          : DEFAULT_LANG
    })
  };

  try {
    await ddb.send(new PutItemCommand(putParams));
  } catch (err) {
    return {
      statusCode: 500,
      body: 'Failed to connect: ' + JSON.stringify(err)
    };
  }

  return { statusCode: 200, body: 'Connected.' };
};
