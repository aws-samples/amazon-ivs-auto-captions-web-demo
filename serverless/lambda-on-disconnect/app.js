const {
  DynamoDBClient,
  DeleteItemCommand
} = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient();

exports.handler = async (event) => {
  console.info('Incoming event:\n', JSON.stringify(event));

  const deleteParams = {
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      connectionId: event.requestContext.connectionId
    })
  };

  try {
    await ddb.send(new DeleteItemCommand(deleteParams));
  } catch (err) {
    return {
      statusCode: 500,
      body: 'Failed to disconnect: ' + JSON.stringify(err)
    };
  }

  return { statusCode: 200, body: 'Disconnected.' };
};
