const AWS = require("aws-sdk");
const { AWS_IVS_CHANNEL_ARN, IVS_API_VERSION } = require("./constants");

const AwsIvs = new AWS.IVS({ apiVersion: IVS_API_VERSION });

let phraseOverlays = {};

const ivsPutMetadata = (data) => {
  const params = {
    channelArn: AWS_IVS_CHANNEL_ARN,
    metadata: JSON.stringify(data),
  };

  AwsIvs.putMetadata(params, (err) => {
    if (err) {
      console.log(`Put metadata error: ${err.message}`);
    }
  });
};

const sendOverlayMetadataToIvs = (overlay, overlaysMap) => {
  const overlayMetadata = overlaysMap[overlay];

  if (overlayMetadata) {
    const payload = {
      type: "overlay",
      imgUrl: overlayMetadata.imageUrl ?? "#",
      keyword: overlay,
      url: overlayMetadata.website ?? null,
    };

    ivsPutMetadata(payload);
  }
};

module.exports = {
  sendOverlaysMetadata: (results, overlaysInformation) => {
    if (!(overlaysInformation?.overlaysPattern && results?.[0]?.Alternatives?.length > 0)) {
      return;
    }
    
    const transcript = decodeURIComponent(
      escape(results[0].Alternatives[0].Transcript)
    );
    const matches = transcript.match(overlaysInformation.overlaysPattern) ?? [];
    const sentOverlays = Object.assign({}, phraseOverlays);

    matches.forEach((overlay) => {
      overlay = overlay.toLowerCase();

      if (sentOverlays[overlay] === undefined || sentOverlays[overlay] === 0) {
        sendOverlayMetadataToIvs(overlay, overlaysInformation.overlaysMap);
        phraseOverlays[overlay] = phraseOverlays[overlay] === undefined ? 1 : phraseOverlays[overlay] + 1;
        sentOverlays[overlay] = sentOverlays[overlay] === undefined ? 1 : sentOverlays[overlay] + 1;
      } else {
        sentOverlays[overlay] = sentOverlays[overlay] - 1;
      }
    });

    if (!results[0].IsPartial) {
      phraseOverlays = {};
    }
  },
};
