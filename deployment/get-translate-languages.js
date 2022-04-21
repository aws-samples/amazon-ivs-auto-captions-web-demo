const fs = require('fs');

const TRANSLATE_LANGUAGES_FILE_PATH = './translate-languages.json';

try {
  const translationConfig = JSON.parse(fs.readFileSync(TRANSLATE_LANGUAGES_FILE_PATH, 'utf8'));

  const translations = Object.keys(translationConfig).filter((key) => translationConfig[key]);

  const translationsLanguageCodes = translations.map((t) => {
    const result = t.match(/\[(.*?)\]/);
    return result[1];
  });

  if (translationsLanguageCodes.length === 0) {
    console.log('NO_LANGUAGE_ENABLED');
    process.exit(0);
  }

  const commaSeparatedTranslationsLanguageCodes = translationsLanguageCodes.join('/');
  console.log(commaSeparatedTranslationsLanguageCodes);
} catch (error) {
  console.log('ERROR');
  console.error(`\n\n${error.message}`);
}
