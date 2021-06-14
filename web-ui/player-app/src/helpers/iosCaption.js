let _startOffset;

const playerPosition = 10;
const differenceWithLongStreamTime = 22;
const differenceWithShortStreamTime = 16;

const addEndTimeForPartial = 6;
const addEndTimeForNonPartial = 0;

const getManifestStreamTime = (isPlaying, streamUrl, player) => {
  if (isPlaying) {
    /* eslint-disable no-undef */
    fetch(streamUrl).then((response) => {
      if (response.ok) {
        response.text().then((data) => {
          const manifest = data.split('\n');
          const manifestMap = {};

          manifest.forEach((data) => {
            const pair = data.split(',');
            if (pair[0]) {
              manifestMap[pair[0]] = pair[1] ?? null;
            }
          });

          if (manifestMap['#EXT-X-SESSION-DATA:DATA-ID="STREAM-TIME"']) {
            const value = manifestMap['#EXT-X-SESSION-DATA:DATA-ID="STREAM-TIME"'].split('"')[1];
            if (value) {
              // The position varies if the stream just started or not. Depending on that the difference changes
              const difference = player.current.getPosition() > playerPosition ? differenceWithLongStreamTime : differenceWithShortStreamTime;
              _startOffset = Number(value) - player.current.getPosition() - difference;
              console.info('Stream Time Updated -> ' + _startOffset);
              return _startOffset;
            }
          }
        });
      }
    }).catch(function (error) {
      console.log("Couldn't get information about stream time. Error details: ", error);
    });
  }
};

const showIOSCaption = (data, player, showCaptionCallBack, shiftSubtitleCallBack) => {
  if (_startOffset) {
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
  }
};

export { getManifestStreamTime, showIOSCaption };
