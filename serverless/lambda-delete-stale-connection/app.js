const AWS = require("aws-sdk");

const ddb = new AWS.DynamoDB.DocumentClient({
    apiVersion: "2012-08-10",
    region: process.env.AWS_REGION,
});

const { TABLE_NAME } = process.env;

exports.handler = async (event) => {
    console.info("Incoming event:\n", JSON.stringify(event));

    try {
        console.log(`Deleting connection with id "${event.connectionId}".`);
        await ddb
            .delete({ TableName: TABLE_NAME, Key: { connectionId: event.connectionId } })
            .promise();
        console.log(`The connection with id "${event.connectionId}" has been deleted.`);
    } catch (e) {
        console.log(e);
        throw e;
    }
    return { statusCode: 200, body: "Connection deleted." };
};
