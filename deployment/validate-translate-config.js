const fs = require('fs');
const yaml = require('js-yaml');
const { CLOUDFORMATION_SCHEMA } = require('js-yaml-cloudformation-schema');

const translateLanguages = process.argv[2];

const NO_ERROR_CODE = '0';
const NO_TRANSLATE_LANGUAGE_ENABLED_ERROR_CODE = '1';
const TRANSLATE_EQUAL_TO_TRANSCRIBE_ERROR_CODE = '2';
const OTHER_ERROR_CODE = '3';
const CLOUDFORMATION_TEMPLATE_FILE_PATH = './cloudformation.yaml';

const validateTranslateConfig = async () => {
  try {
    // Check if there was an error when retrieving the Translate languages
    if (translateLanguages === 'ERROR') {
      console.log(OTHER_ERROR_CODE);
      process.exit(0);
    }

    // Check if a Translate language has been enabled
    if (translateLanguages === 'NO_LANGUAGE_ENABLED') {
      console.log(NO_TRANSLATE_LANGUAGE_ENABLED_ERROR_CODE);
      process.exit(0);
    }

    // Get Transcribe language
    const cloudFormationTemplate = fs.readFileSync(CLOUDFORMATION_TEMPLATE_FILE_PATH, 'utf8');
    const parsedCloudFormationTemplate = yaml.load(cloudFormationTemplate, { schema: CLOUDFORMATION_SCHEMA });
    const transcribeLanguage = parsedCloudFormationTemplate.Parameters.AudioLanguageCode.Default;

    // Check if Translate languages differ from Transcribe language
    const translateLanguagesArray = translateLanguages.split('/');
    const transcribeEqualToTranslate = translateLanguagesArray.includes(transcribeLanguage);
    if (transcribeEqualToTranslate) {
      console.log(TRANSLATE_EQUAL_TO_TRANSCRIBE_ERROR_CODE);
      process.exit(0);
    }

    console.log(NO_ERROR_CODE);
  } catch (error) {
    console.log(OTHER_ERROR_CODE);
    console.error(`\n\n${error.message}`);
  }
};

validateTranslateConfig();
