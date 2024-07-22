const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} = require('@aws-sdk/client-apigatewaymanagementapi');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const { GATEWAY_DOMAIN, TABLE_NAME, LAMBDA_DELETE_STALE_CONNECTION_NAME } =
  process.env;
const apigwManagementApi = new ApiGatewayManagementApiClient({
  endpoint: GATEWAY_DOMAIN
});
const lambda = new LambdaClient();
const LAMBDA_FUNCTION_INVOCATION_TYPE = 'Event';

exports.handler = async (event) => {
  console.info('Incoming event:\n', JSON.stringify(event));

  const postCalls = event.users.map(async (marshalledUser) => {
    const { connectionId = '' } = unmarshall(marshalledUser);
    try {
      const params = {
        ConnectionId: connectionId,
        Data: JSON.stringify(event.payload.data)
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
            connectionId
          })
        };

        try {
          await lambda.send(new InvokeCommand(lambdaParams));
          console.log('Function invoked ', data);
        } catch (err) {
          console.log(err, err.stack);
        }
      } else {
        console.log(
          `Failed to post chunked data to connection "${connectionId}": `,
          e
        );
        throw e;
      }
    }
  });

  try {
    await Promise.all(postCalls);
    console.log('Posted to all WS connections.');
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: 'Data sent.' };
};
