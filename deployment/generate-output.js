const fs = require('fs');
const AWS = require("aws-sdk");
const { stackOutputFilePath } = require("minimist")(process.argv.slice(2));

// Validate args
if (!stackOutputFilePath) {
    console.error('\n\nArg validation failed:\n--stackOutputFilePath argument is missing');
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
        console.info("\n\nGenerating output values...\n");

        // Read stack.json file and get outputs section
        const stackInfo = JSON.parse(fs.readFileSync(stackOutputFilePath, 'utf8'));
        const cloudformationOutputs = stackInfo.Stacks[0].Outputs;

        // Get necessary values from stack output file
        const awsRegion = findOutput(
            cloudformationOutputs,
            'AWSRegion'
        );

        const playerAppUrl = findOutput(
            cloudformationOutputs,
            'PlayerAppURL'
        );

        const clusterName = findOutput(
            cloudformationOutputs,
            'ClusterName'
        );

        const streamServiceName = findOutput(
            cloudformationOutputs,
            'StreamServiceName'
        );

        const streamKey = findOutput(
            cloudformationOutputs,
            'StreamKey'
        );

        // Get Stream service task public IP
        AWS.config.update({ region: awsRegion });
        const ecs = new AWS.ECS();
        const ec2 = new AWS.EC2();

        const listTasksParams = {
            cluster: clusterName,
            serviceName: streamServiceName
          };
        const listTasksResponse = await ecs.listTasks(listTasksParams).promise();
        const taskArn = listTasksResponse.taskArns[0];

        const describeTasksParams = {
            cluster: clusterName,
            tasks: [taskArn]
        };
        const describeTasksResponse = await ecs.describeTasks(describeTasksParams).promise();
        const { value: networkInterfaceId } = describeTasksResponse.tasks[0].attachments[0].details.find(d => d.name == 'networkInterfaceId');

        const describeNetworkInterfacesParams = {
            NetworkInterfaceIds: [networkInterfaceId]
        };
        const describeNetworkInterfacesResponse = await ec2.describeNetworkInterfaces(describeNetworkInterfacesParams).promise();
        const publicIp = describeNetworkInterfacesResponse.NetworkInterfaces[0].Association.PublicIp;

        const streamServerUrl = `rtmp://${publicIp}/ivs`;
const output = `
Amazon IVS Transcribe demo

* Stream Server URL = ${streamServerUrl}
* Stream Key = ${streamKey}
* Player URL = https://${playerAppUrl}
`;
        console.log('\x1b[33m%s\x1b[0m', output);
    
    } catch(error) {
        console.error(`\n\nScript execution failed:\n${error.message}`);
        process.exit(3);
    }

};

generateOutput();