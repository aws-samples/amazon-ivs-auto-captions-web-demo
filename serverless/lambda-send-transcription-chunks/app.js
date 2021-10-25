const AWS = require("aws-sdk");

const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: process.env.GATEWAY_DOMAIN,
});

const lambda = new AWS.Lambda();

const LAMBDA_FUNCTION_INVOCATION_TYPE = "Event"

const { TABLE_NAME, LAMBDA_DELETE_STALE_CONNECTION_NAME } = process.env;

exports.handler = async (event) => {
    console.info("Incoming event:\n", JSON.stringify(event));

    const postCalls = event.users.map(async ({ connectionId }) => {
        try {
            const params = {
                ConnectionId: connectionId,
                Data: JSON.stringify(event.payload.data),
            };
            console.log("Posting to WS with params:\n", params);
            await apigwManagementApi.postToConnection(params).promise();
            console.log("Posted to WS with params:\n", params);
        } catch (e) {
            if (e.statusCode === 410) {
                console.log(
                    `Found stale connection, sending to lambda to delete "${connectionId}" from table "${TABLE_NAME}"`
                );
                const lambdaParams = {
                    FunctionName: LAMBDA_DELETE_STALE_CONNECTION_NAME,
                    InvocationType: LAMBDA_FUNCTION_INVOCATION_TYPE,
                    Payload: JSON.stringify({
                        connectionId: connectionId,
                    }),
                };

                lambda.invoke(lambdaParams, (err, data) => {
                    if (err) console.log(err, err.stack);
                    // an error occurred
                    else console.log("Function invoked ", data); // successful response
                });
            } else {
                throw e;
            }
        }
    });

    try {
        await Promise.all(postCalls);
        console.log("Posted to all WS connections.");
    } catch (e) {
        return { statusCode: 500, body: e.stack };
    }

    return { statusCode: 200, body: "Data sent." };
};
