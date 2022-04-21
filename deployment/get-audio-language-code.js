const fs = require('fs');
const { stackOutputFilePath } = require('minimist')(process.argv.slice(2));

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

const getAudioLanguageCode = async () => {
  try {
    const stackInfo = JSON.parse(fs.readFileSync(stackOutputFilePath, 'utf8'));
    const cloudformationOutputs = stackInfo.Stacks[0].Outputs;
    const value = findOutput(cloudformationOutputs, 'AudioLanguageCode');
    console.log(value);
  } catch (error) {
    console.error(`\n\n${error.message}`);
    process.exit(2);
  }
};

getAudioLanguageCode();
