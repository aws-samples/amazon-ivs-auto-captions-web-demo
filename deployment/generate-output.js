const fs = require('fs');
const {
  ECSClient,
  ListTasksCommand,
  DescribeTasksCommand
} = require('@aws-sdk/client-ecs');
const {
  EC2Client,
  DescribeNetworkInterfacesCommand
} = require('@aws-sdk/client-ec2');
const { stackOutputFilePath } = require('minimist')(process.argv.slice(2));

// Validate arguments
if (!stackOutputFilePath) {
  console.error(
    '\n\nArgument validation failed:\n--stackOutputFilePath argument is missing'
  );
  process.exit(1);
}

// Function to filter stack.json outputs by output key
const findOutput = (outputs, key) => {
  return outputs.filter((output) => {
    return output.OutputKey === key;
  })[0].OutputValue;
};

const generateOutput = async () => {
  try {
    console.info('\n\nGenerating output values...\n');

    // Read stack.json file and get outputs section
    const stackInfo = JSON.parse(fs.readFileSync(stackOutputFilePath, 'utf8'));
    const cloudformationOutputs = stackInfo.Stacks[0].Outputs;

    // Get necessary values from stack output file
    const awsRegion = findOutput(cloudformationOutputs, 'AWSRegion');

    const playerAppUrl = findOutput(cloudformationOutputs, 'PlayerAppURL');

    const clusterName = findOutput(cloudformationOutputs, 'ClusterName');

    const streamServiceName = findOutput(
      cloudformationOutputs,
      'StreamServiceName'
    );

    const streamKey = findOutput(cloudformationOutputs, 'StreamKey');

    // Get Stream service task public IP
    const ecs = new ECSClient({ region: awsRegion });
    const ec2 = new EC2Client({ region: awsRegion });

    const listTasksParams = {
      cluster: clusterName,
      serviceName: streamServiceName
    };
    const listTasksResponse = await ecs.send(
      new ListTasksCommand(listTasksParams)
    );
    const taskArn = listTasksResponse.taskArns[0];

    const describeTasksParams = {
      cluster: clusterName,
      tasks: [taskArn]
    };
    const describeTasksResponse = await ecs.send(
      new DescribeTasksCommand(describeTasksParams)
    );
    const { value: networkInterfaceId } =
      describeTasksResponse.tasks[0].attachments[0].details.find(
        (d) => d.name == 'networkInterfaceId'
      );

    const describeNetworkInterfacesParams = {
      NetworkInterfaceIds: [networkInterfaceId]
    };
    const describeNetworkInterfacesResponse = await ec2.send(
      new DescribeNetworkInterfacesCommand(describeNetworkInterfacesParams)
    );
    const publicIp =
      describeNetworkInterfacesResponse.NetworkInterfaces[0].Association
        .PublicIp;

    const streamServerUrl = `rtmp://${publicIp}/ivs`;
    const output = `
Amazon IVS Transcribe demo

* Stream Server URL = ${streamServerUrl}
* Stream Key = ${streamKey}
* Player URL = https://${playerAppUrl}
`;
    console.log('\x1b[33m%s\x1b[0m', output);
  } catch (error) {
    console.error(`\n\nScript execution failed:\n${error.message}`);
    process.exit(3);
  }
};

generateOutput();
