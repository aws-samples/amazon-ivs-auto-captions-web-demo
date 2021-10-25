const AWS = require("aws-sdk");
const utils = require("./utils");

const ddb = new AWS.DynamoDB.DocumentClient({
    apiVersion: "2012-08-10",
    region: process.env.AWS_REGION,
});

const lambda = new AWS.Lambda();

const LAMBDA_FUNCTION_INVOCATION_TYPE = "Event"

const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: process.env.GATEWAY_DOMAIN,
});

const invokeLambda = (lambdaParams) => {
    lambda.invoke(lambdaParams, (err, data) => {
        if (err) console.log(err, err.stack);
        // an error occurred
        else console.log("Function invoked ", data); // successful response
    });
};

const { TABLE_NAME, LAMBDA_SEND_TRANSCRIPTION_CHUNKS_NAME, LAMBDA_DELETE_STALE_CONNECTION_NAME } = process.env;

exports.handler = async (event) => {
    console.info("Incoming event:\n", JSON.stringify(event));

    let connectionData;
    let postCalls;
    const payload = JSON.parse(event.body);

    console.log(payload);

    try {
        const params = {
            ExpressionAttributeValues: {
                ":l": payload.lang,
            },
            TableName: process.env.TABLE_NAME,
            KeyConditionExpression: "lang = :l",
            IndexName: "lang-index",
        };
        console.log("Querying DynamoDB with params:\n", params);
        connectionData = await ddb.query(params).promise();
    } catch (e) {
        return { statusCode: 500, body: e.stack };
    }

    console.log("ConnectionData: ", connectionData);

    if (connectionData.Items.length < 50) {
        postCalls = connectionData.Items.map(async ({ connectionId }) => {
            try {
                const params = {
                    ConnectionId: connectionId,
                    Data: JSON.stringify(payload.data),
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
                            connectionId: connectionId
                        }),
                    };

                    invokeLambda(lambdaParams);
                } else {
                    throw e;
                }
            }
        });
    } else {
        const chunks = utils.getChunks(connectionData.Items, 10);

        console.log("Chunks: ", chunks);

        postCalls = chunks.map(async (chunk) => {
            const transcriptionPayload = {
                users: chunk,
                payload,
            };

            const lambdaParams = {
                FunctionName: LAMBDA_SEND_TRANSCRIPTION_CHUNKS_NAME,
                InvocationType: LAMBDA_FUNCTION_INVOCATION_TYPE,
                Payload: JSON.stringify(transcriptionPayload),
            };

            console.log("Lambda chunk: ", transcriptionPayload);

            invokeLambda(lambdaParams);
        });
    }

    try {
        await Promise.all(postCalls);
    } catch (e) {
        return { statusCode: 500, body: e.stack };
    }

    return { statusCode: 200, body: "Data sent." };
};
