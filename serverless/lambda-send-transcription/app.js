const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall, convertToAttr } = require('@aws-sdk/util-dynamodb');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} = require('@aws-sdk/client-apigatewaymanagementapi');
const utils = require('./utils');

const {
  GATEWAY_DOMAIN,
  TABLE_NAME,
  LAMBDA_SEND_TRANSCRIPTION_CHUNKS_NAME,
  LAMBDA_DELETE_STALE_CONNECTION_NAME
} = process.env;
const ddb = new DynamoDBClient();
const lambda = new LambdaClient();
const apigwManagementApi = new ApiGatewayManagementApiClient({
  endpoint: GATEWAY_DOMAIN
});
const LAMBDA_FUNCTION_INVOCATION_TYPE = 'Event';

const invokeLambda = async (lambdaParams) => {
  try {
    const response = await lambda.send(new InvokeCommand(lambdaParams));
    console.log('Function invoked ', response);
  } catch (err) {
    console.log(err, err.stack);
  }
};

exports.handler = async (event) => {
  console.info('Incoming event:\n', JSON.stringify(event));

  let connectionData;
  let postCalls;
  const payload = JSON.parse(event.body);

  try {
    const params = {
      ExpressionAttributeValues: {
        ':l': convertToAttr(payload.lang)
      },
      TableName: TABLE_NAME,
      KeyConditionExpression: 'lang = :l',
      IndexName: 'lang-index'
    };
    console.log('Querying DynamoDB with params:\n', params);
    connectionData = await ddb.send(new QueryCommand(params));
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  console.log('ConnectionData: ', connectionData);

  if (connectionData.Items.length < 50) {
    postCalls = connectionData.Items.map(async (Item) => {
      const { connectionId = '' } = unmarshall(Item);
      try {
        const params = {
          ConnectionId: connectionId,
          Data: JSON.stringify(payload.data)
        };
        console.log('Posting to WS with params:\n', params);
        await apigwManagementApi.send(new PostToConnectionCommand(params));
        console.log('Posted to WS with params:\n', params);
      } catch (e) {
        if (e.statusCode === 410) {
          console.log(
            `Found stale connection, sending to lambda to delete "${connectionId}" from table "${TABLE_NAME}"`
          );
          const lambdaParams = {
            FunctionName: LAMBDA_DELETE_STALE_CONNECTION_NAME,
            InvocationType: LAMBDA_FUNCTION_INVOCATION_TYPE,
            Payload: JSON.stringify({
              connectionId: connectionId
            })
          };

          await invokeLambda(lambdaParams);
        } else {
          console.log(
            `Failed to post data to connection "${connectionId}": `,
            e
          );
          throw e;
        }
      }
    });
  } else {
    const chunks = utils.getChunks(connectionData.Items, 10);

    console.log('Chunks: ', chunks);

    postCalls = chunks.map(async (chunk) => {
      const transcriptionPayload = {
        users: chunk,
        payload
      };

      const lambdaParams = {
        FunctionName: LAMBDA_SEND_TRANSCRIPTION_CHUNKS_NAME,
        InvocationType: LAMBDA_FUNCTION_INVOCATION_TYPE,
        Payload: JSON.stringify(transcriptionPayload)
      };

      console.log('Lambda chunk: ', transcriptionPayload);

      await invokeLambda(lambdaParams);
    });
  }

  try {
    await Promise.all(postCalls);
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: 'Data sent.' };
};
