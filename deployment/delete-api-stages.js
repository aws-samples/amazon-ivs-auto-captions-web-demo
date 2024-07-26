const fs = require('fs');
const {
  ApiGatewayV2Client,
  DeleteStageCommand
} = require('@aws-sdk/client-apigatewayv2');
const { stackName, stackOutputFilePath } = require('minimist')(
  process.argv.slice(2)
);

// Validate args
if (!stackOutputFilePath) {
  console.error(
    '\n\nArg validation failed:\n--stackOutputFilePath argument is missing'
  );
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
    // Read stack.json file and get outputs section
    const stackInfo = JSON.parse(fs.readFileSync(stackOutputFilePath, 'utf8'));
    const stackNameInOutputFile = stackInfo.Stacks[0].StackName;

    if (stackName != stackNameInOutputFile) {
      console.error(
        `\n\nSubmitted stack name ("${stackName}") is not equal to stack name in stack.json file ("${stackNameInOutputFile}"), aborting API Gateway stage deletion...`
      );
      process.exit(2);
    }

    const cloudformationOutputs = stackInfo.Stacks[0].Outputs;

    // Get necessary values from stack output file
    const awsRegion = findOutput(cloudformationOutputs, 'AWSRegion');

    const writerWebSocketApiId = findOutput(
      cloudformationOutputs,
      'WriterWebSocketApiId'
    );

    const readerWebSocketApiId = findOutput(
      cloudformationOutputs,
      'ReaderWebSocketApiId'
    );

    // Delete stages
    const apigatewayv2 = new ApiGatewayV2Client({ region: awsRegion });

    const deleteStageWriterParams = {
      ApiId: writerWebSocketApiId,
      StageName: 'demo'
    };
    await apigatewayv2.send(new DeleteStageCommand(deleteStageWriterParams));
    console.log('\nWriter WebSocket API "demo" stage deleted!');

    const deleteStageReaderParams = {
      ApiId: readerWebSocketApiId,
      StageName: 'demo'
    };
    await apigatewayv2.send(new DeleteStageCommand(deleteStageReaderParams));
    console.log('\nReader WebSocket API "demo" stage deleted!');
  } catch (error) {
    console.error(`\n\nScript execution failed:\n${error.message}`);
    process.exit(3);
  }
};

deleteStages();
