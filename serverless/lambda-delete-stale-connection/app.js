const {
  DynamoDBClient,
  DeleteItemCommand
} = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient();

const { TABLE_NAME } = process.env;

exports.handler = async (event) => {
  console.info('Incoming event:\n', JSON.stringify(event));

  try {
    console.log(`Deleting connection with id "${event.connectionId}".`);
    const deleteParams = {
      TableName: TABLE_NAME,
      Key: marshall({ connectionId: event.connectionId })
    };
    await ddb.send(new DeleteItemCommand(deleteParams));
    console.log(
      `The connection with id "${event.connectionId}" has been deleted.`
    );
  } catch (e) {
    console.log(e);
    throw e;
  }
  return { statusCode: 200, body: 'Connection deleted.' };
};
