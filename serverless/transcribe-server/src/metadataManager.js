const { IvsClient, PutMetadataCommand } = require('@aws-sdk/client-ivs');
const { IVS_CHANNEL_ARN } = require('./constants');

const AwsIvs = new IvsClient();

let phraseOverlays = {};

const isEncoded = (str) => {
  try {
    return str !== decodeURIComponent(str);
  } catch (e) {
    return false;
  }
};

const ivsPutMetadata = async (data) => {
  const params = {
    channelArn: IVS_CHANNEL_ARN,
    metadata: JSON.stringify(data)
  };

  try {
    await AwsIvs.send(new PutMetadataCommand(params));
  } catch (err) {
    console.log(`Put metadata error: ${err.message}`);
  }
};

const sendOverlayMetadataToIvs = async (overlay, overlaysMap) => {
  const overlayMetadata = overlaysMap[overlay];

  if (overlayMetadata) {
    const payload = {
      type: 'overlay',
      imgUrl: overlayMetadata.imageUrl ?? '#',
      keyword: overlay,
      url: overlayMetadata.website ?? null
    };

    await ivsPutMetadata(payload);
  }
};

module.exports = {
  sendOverlaysMetadata: async (results, overlaysInformation) => {
    if (
      !(
        overlaysInformation?.overlaysPattern &&
        results?.[0]?.Alternatives?.length > 0
      )
    ) {
      return;
    }

    const transcriptRaw = results[0].Alternatives[0].Transcript;
    const transcript = isEncoded(transcriptRaw)
      ? decodeURIComponent(transcriptRaw)
      : transcriptRaw;
    const matches = transcript.match(overlaysInformation.overlaysPattern) ?? [];
    const sentOverlays = Object.assign({}, phraseOverlays);

    const promises = [];

    matches.forEach(async (overlay) => {
      overlay = overlay.toLowerCase();

      if (sentOverlays[overlay] === undefined || sentOverlays[overlay] === 0) {
        promises.push(
          sendOverlayMetadataToIvs(overlay, overlaysInformation.overlaysMap)
        );
        phraseOverlays[overlay] =
          phraseOverlays[overlay] === undefined
            ? 1
            : phraseOverlays[overlay] + 1;
        sentOverlays[overlay] =
          sentOverlays[overlay] === undefined ? 1 : sentOverlays[overlay] + 1;
      } else {
        sentOverlays[overlay] = sentOverlays[overlay] - 1;
      }
    });

    await Promise.all(promises);

    if (!results[0].IsPartial) {
      phraseOverlays = {};
    }
  }
};
