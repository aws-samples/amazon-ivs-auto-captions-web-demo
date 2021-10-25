let _startOffset;
const defaultPlayerPosition = 10;
const differenceWithLongStreamTime = 22;
const differenceWithShortStreamTime = 16;
const addEndTimeForPartial = 6;
const addEndTimeForNonPartial = 0;

const getManifestStreamTime = (isPlaying, streamUrl, player) => {
  if (!isPlaying) {
    return;
  }

  /* eslint-disable no-undef */
  fetch(streamUrl).then((response) => {
    if (!response.ok) {
      return;
    }

    response.text().then((data) => {
      const manifest = data.split('\n');
      const manifestMap = {};

      manifest.forEach((dataPair) => {
        const pair = dataPair.split(',');
        if (pair[0]) {
          manifestMap[pair[0]] = pair[1] ?? null;
        }
      });

      const value = manifestMap['#EXT-X-SESSION-DATA:DATA-ID="STREAM-TIME"']?.split('"')[1];

      if (!value) {
        return;
      }

      // The position varies if the stream just started or not. Depending on that the difference changes
      const difference = player.current.getPosition() > defaultPlayerPosition ? differenceWithLongStreamTime : differenceWithShortStreamTime;
      _startOffset = Number(value) - player.current.getPosition() - difference;
      console.info('Stream Time Updated -> ' + _startOffset);

      return _startOffset;
    });
  }).catch(function (error) {
    console.log("Couldn't get information about stream time. Error details: ", error);
  });
};

const showIOSCaption = (data, player, showCaptionCallBack, shiftSubtitleCallBack) => {
  if (!_startOffset) {
    return;
  }

  const playerPosition = player.current.getPosition();
  const addEndTime = data.partial === true ? addEndTimeForPartial : addEndTimeForNonPartial;
  const startTime = data.startTime - _startOffset;
  const endTime = data.endTime - _startOffset + addEndTime;

  if (startTime > 0) {
    if (startTime <= playerPosition && endTime >= playerPosition) {
      showCaptionCallBack(startTime, endTime, data.text);
    } else if (endTime <= playerPosition) {
      shiftSubtitleCallBack();
    }
  } else {
    shiftSubtitleCallBack();
  }
};

export { getManifestStreamTime, showIOSCaption };
