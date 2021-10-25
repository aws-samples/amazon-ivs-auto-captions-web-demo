const fs = require("fs");
const AWS = require("aws-sdk");
const { stackOutputFilePath } = require("minimist")(process.argv.slice(2));

// Validate args
if (!stackOutputFilePath) {
    console.error("\n\nArg validation failed:\n--stackOutputFilePath argument is missing");
    process.exit(1);
}

// Function to filter stack.json outputs by output key
const findOutput = (outputs, key) => {
    return outputs.filter((output) => {
        return output.OutputKey === key;
    })[0].OutputValue;
};

const deleteStages = async () => {
    try {
        console.info("\n\nDeleting API Gateway stages...");

        // Read stack.json file and get outputs section
        const stackInfo = JSON.parse(fs.readFileSync(stackOutputFilePath, "utf8"));
        const cloudformationOutputs = stackInfo.Stacks[0].Outputs;

        // Get necessary values from stack output file
        const awsRegion = findOutput(cloudformationOutputs, "AWSRegion");

        const writerWebSocketApiId = findOutput(cloudformationOutputs, "WriterWebSocketApiId");

        const readerWebSocketApiId = findOutput(cloudformationOutputs, "ReaderWebSocketApiId");

        // Delete stages
        AWS.config.update({ region: awsRegion });
        const apigatewayv2 = new AWS.ApiGatewayV2();

        const deleteStageWriterParams = {
            ApiId: writerWebSocketApiId,
            StageName: "demo",
        };
        await apigatewayv2.deleteStage(deleteStageWriterParams).promise();
        console.log('\nWriter WebSocket API "demo" stage deleted!');

        const deleteStageReaderParams = {
            ApiId: readerWebSocketApiId,
            StageName: "demo",
        };
        await apigatewayv2.deleteStage(deleteStageReaderParams).promise();
        console.log('\nReader WebSocket API "demo" stage deleted!');
    } catch (error) {
        console.error(`\n\nScript execution failed:\n${error.message}`);
        process.exit(3);
    }
};

deleteStages();
