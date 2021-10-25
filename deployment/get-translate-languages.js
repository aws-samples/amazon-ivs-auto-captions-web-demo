const fs = require("fs");

const TRANSLATE_LANGUAGES_FILE_PATH = "./translate-languages.json";
const DEFAULT_TRANSLATE_LANGUAGE_CODES = "es";

try {
  const translationConfig = JSON.parse(
    fs.readFileSync(TRANSLATE_LANGUAGES_FILE_PATH, "utf8")
  );

  const translations = Object.keys(translationConfig).filter(
    (key) => translationConfig[key]
  );

  const translationsLanguageCodes = translations.map((t) => {
    const startIndex = t.search(/\[[a-z]{2}\]/g);
    return t.substring(startIndex + 1, startIndex + 3);
  });

  const valueForEnvVars = translationsLanguageCodes.join("-");

  if (valueForEnvVars != '') {
    console.log(valueForEnvVars);
  } else {
    console.log(DEFAULT_TRANSLATE_LANGUAGE_CODES);
  }
} catch (error) {
  console.log(DEFAULT_TRANSLATE_LANGUAGE_CODES);
  console.error(`\n\n${error.message}`);
}
