const fs = require('fs');
const pathStackFile = process.argv[2];
const pathEnvFile = '../web-ui/player-app/.env';

// Function to filter stack.json outputs by output key
const findOutput = (outputs, key) => {
  return outputs.filter((output) => {
    return output.OutputKey === key;
  })[0].OutputValue;
};

// Read stack.json file and get outputs section
const stackInfo = JSON.parse(fs.readFileSync(pathStackFile, 'utf8'));
const cloudformationOutputs = stackInfo.Stacks[0].Outputs;

if (!cloudformationOutputs) {
  console.log('\n\nCloudFormation output file was not generated correctly, please execute deployment again...');
  process.exit(1);
}

// Get value for WSCaptionsUrl key
const REACT_APP_WS_CAPTIONS_URL = findOutput(
  cloudformationOutputs,
  'ReaderWebSocketURL'
);

// Get value for StreamPlaybackUrl key
const REACT_APP_STREAM_PLAYBACK_URL = findOutput(
  cloudformationOutputs,
  'StreamPlaybackURL'
);

// Get value for CaptionsTranslationsLanguageCodes key
const REACT_APP_CAPTIONS_TRANSLATIONS_LANGUAGE_CODES = findOutput(
  cloudformationOutputs,
  'CaptionsTranslationsLanguageCodes'
);

// Get value for EnableTranslate key
const REACT_APP_ENABLE_TRANSLATE = findOutput(
  cloudformationOutputs,
  'EnableTranslate'
);

// Get value for AudioLanguageCode key
const REACT_APP_AUDIO_LANGUAGE_CODE = findOutput(
  cloudformationOutputs,
  'AudioLanguageCode'
);

// Create .env file with environment variables
let envFile = `REACT_APP_WS_CAPTIONS_URL=${REACT_APP_WS_CAPTIONS_URL}\n`;
envFile += `REACT_APP_STREAM_PLAYBACK_URL=${REACT_APP_STREAM_PLAYBACK_URL}\n`;
envFile += `REACT_APP_CAPTIONS_TRANSLATIONS_LANGUAGE_CODES=${REACT_APP_CAPTIONS_TRANSLATIONS_LANGUAGE_CODES}\n`;
envFile += `REACT_APP_ENABLE_TRANSLATE=${REACT_APP_ENABLE_TRANSLATE}\n`;
envFile += `REACT_APP_AUDIO_LANGUAGE_CODE=${REACT_APP_AUDIO_LANGUAGE_CODE}`;

// Write .env file
fs.writeFileSync(pathEnvFile, envFile);