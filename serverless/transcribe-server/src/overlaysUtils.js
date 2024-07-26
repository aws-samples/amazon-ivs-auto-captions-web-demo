const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { KEYWORDS_TABLE_NAME } = require('./constants');

const dynamoClient = new DynamoDBClient();

module.exports = {
  getOverlaysMapAndPattern: async () => {
    try {
      const params = { TableName: KEYWORDS_TABLE_NAME };
      const { Items: overlaysResponse = [] } = await dynamoClient.send(
        new ScanCommand(params)
      );
      let overlayKeywordPattern = null;
      if (overlaysResponse.length > 0) {
        overlayKeywordPattern = new RegExp(
          overlaysResponse.map((overlay) => overlay.keyword).join('|'),
          'gi'
        );
      }
      return {
        overlaysMap: tranformOverlaysResponse(overlaysResponse),
        overlaysPattern: overlayKeywordPattern
      };
    } catch (error) {
      throw new Error(error);
    }
  }
};

const tranformOverlaysResponse = (overlays) => {
  let overlaysMap = {};
  overlays.forEach((overlay) => {
    overlaysMap[overlay.keyword.toLowerCase()] = overlay;
  });

  return overlaysMap;
};
