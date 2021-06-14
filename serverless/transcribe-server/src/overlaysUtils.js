const AWS = require("aws-sdk");
const { AWS_REGION, KEYWORDS_TABLE_NAME } = require("./constants");

AWS.config.update({ region: AWS_REGION });

module.exports = {
  getOverlaysMapAndPattern: async () => {
    try {
      const documentClient = new AWS.DynamoDB.DocumentClient();
      const params = { TableName: KEYWORDS_TABLE_NAME };
      const result = await documentClient.scan(params).promise();
      let overlaysResponse = result.Items ?? [];
      let overlayKeywordPattern = null;
      if (overlaysResponse && overlaysResponse?.length > 0) {
        overlayKeywordPattern = new RegExp(
          overlaysResponse.map((overlay) => overlay.keyword).join("|"),
          "gi"
        );
      }
      return {
        overlaysMap: tranformOverlaysResponse(overlaysResponse),
        overlaysPattern: overlayKeywordPattern,
      };
    } catch (error) {
      throw new Error(error);
    }
  },
};

const tranformOverlaysResponse = (overlays) => {
  let overlaysMap = {};
  overlays.forEach((overlay) => {
    overlaysMap[overlay.keyword.toLowerCase()] = overlay;
  });

  return overlaysMap;
};
