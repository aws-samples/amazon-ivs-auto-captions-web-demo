module.exports = {
  AWS_GW_WS: process.env.AWS_GW_WS,
  AWS_IVS_CHANNEL_ARN: process.env.AWS_IVS_CHANNEL_ARN,
  AWS_REGION: process.env.AWS_REGION,
  KEYWORDS_TABLE_NAME: process.env.KEYWORDS_TABLE_NAME,
  IVS_API_VERSION: process.env.IVS_API_VERSION ?? "2020-07-14",
  LANGUAGE_CODE: process.env.LANGUAGE_CODE ?? "en-US",
  MEDIA_SAMPLE_RATE_HERTZ:
    process.env.LANGUAGE_CODE == "en-US" || process.env.LANGUAGE_CODE == "es-US"
      ? 16000
      : 8000,
  VOCABULARY_NAME: process.env.VOCABULARY_NAME,
  VOCABULARY_FILTER: process.env.VOCABULARY_FILTER,
};
