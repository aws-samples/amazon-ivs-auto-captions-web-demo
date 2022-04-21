import React, { useEffect, useCallback, useRef, useState } from 'react';

import config from '../../config';
import Placeholder from '../Placeholder';
import PlayerControls from '../PlayerControls';
import PlayerDebugInfo from '../PlayerDebugInfo';
import PlayerSettings from '../PlayerSettings';
import PlayerTranslate from '../PlayerTranslate';
import PlayerAutoPlayBlocked from '../PlayerAutoPlayBlocked';
import Overlays from '../Overlays';
import { closeSocket, createSocket } from '../../helpers/websocket';
import { getManifestStreamTime, showIOSCaption } from '../../helpers/iosCaption';
import canAutoPlay from 'can-autoplay';

import './ClosedCaptionPlayer.css';

const CAPTIONS_MAX_DISPLAY_TIME = 5;
const CAPTIONS_UPDATE_INTERVAL = 100;
const CAPTIONS_MAX_ERRORS = 20;
const IOS_LINE_POSITION = -4;
const LINE_POSITION = -3;

const ClosedCaptionPlayer = ({ streamUrl }) => {
  const deviceDetect = require('react-device-detect');

  const { IVSPlayer } = window;
  const { isPlayerSupported } = IVSPlayer;
  const [overlays, setOverlays] = useState([]);
  const [placeHolderStatus, setPlaceHolderStatus] = useState('loading');
  const [showSettings, setShowSettings] = useState(false);
  const [showTranslate, setShowTranslate] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wsCaptionsUrl, setWsCaptionsUrl] = useState(`${config.WS_CAPTIONS_URL}?lang=${config.AUDIO_LANGUAGE_CODE}`);
  const [transcriptionsQueue, setTranscriptionsQueue] = useState([]);
  const [transcriptionErrors, setTranscriptionErrors] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const [isVideoBlocked, setIsVideoBlocked] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState(config.AUDIO_LANGUAGE_CODE);
  const [showCaptionsButtonState, setShowCaptionsButtonState] = useState(true);
  const [enableTranslate] = useState(config.ENABLE_TRANSLATE);

  const player = useRef(null);
  const videoEl = useRef(null);
  const trackEl = useRef(null);
  const playerWrapper = useRef(null);
  const captionsInterval = useRef(null);
  const webSocket = useRef(null);

  const onStateChange = useCallback(() => {
    const playerState = player.current.getState();

    setIsPlaying(playerState === IVSPlayer.PlayerState.PLAYING);

    if (playerState === IVSPlayer.PlayerState.PLAYING) {
      setPlaceHolderStatus(null);
      if (trackEl && trackEl.current) {
        trackEl.current.track.mode = 'showing';
      }
    } else if (playerState === IVSPlayer.PlayerState.ENDED) {
      setPlaceHolderStatus('This live stream has ended');
    }
  }, [IVSPlayer.PlayerState]);

  const onError = (err) => {
    console.warn('Player Event - ERROR:', err);
    setPlaceHolderStatus('This live stream is currently offline');
  };

  const onRebuffering = () => {
    player.current.setRebufferToLive(true);
  };

  const onTextMetadataCue = useCallback((textMetadataCue) => {
    const metadata = JSON.parse(textMetadataCue.text);

    if (metadata.type === 'overlay') {
      handleOverlays(metadata);
    }
  }, []);

  // Updates the array containing the overlays to be shown according to keywords in the transcription.
  const handleOverlays = (data) => {
    const { keyword, imgUrl, url } = data;
    const imgId = new Date().getTime();

    // A maximum of <MAX_OVERLAYS> overlays are shown at the same time.
    setOverlays((oldOverlays) => {
      let newOverlays = [...oldOverlays];

      // Removes the overlay if already exists in the array.
      // Otherwise, if the maximum is reached, removes the first overlay.
      if (newOverlays.find((overlay) => overlay.keyword === keyword)) {
        newOverlays = newOverlays.filter((overlay) => overlay.keyword !== keyword);
      } else if (newOverlays.length >= config.MAX_OVERLAYS) {
        newOverlays.shift();
      }

      newOverlays.push({ id: imgId, keyword, imgUrl, url });
      return newOverlays;
    });

    // Each overlay is removed from the array after a period defined by <TIME_OVERLAYS>.
    setTimeout(() => {
      setOverlays((oldOverlays) => oldOverlays.filter((overlay) => overlay.id !== imgId));
    }, config.TIME_OVERLAYS);
  };

  const onFullScreenChange = () => {
    if (document.fullscreenElement) {
      setIsFullscreen(true);
    } else {
      setIsFullscreen(false);
    }
  };

  const AddEventListeners = useCallback(() => {
    const video = playerWrapper.current.getElementsByTagName('video')[0];

    player.current.addEventListener(IVSPlayer.PlayerState.READY, onStateChange);
    player.current.addEventListener(IVSPlayer.PlayerState.PLAYING, onStateChange);
    player.current.addEventListener(IVSPlayer.PlayerState.BUFFERING, onStateChange);
    player.current.addEventListener(IVSPlayer.PlayerState.IDLE, onStateChange);
    player.current.addEventListener(IVSPlayer.PlayerState.ENDED, onStateChange);
    player.current.addEventListener(IVSPlayer.PlayerEventType.ERROR, onError);
    player.current.addEventListener(IVSPlayer.PlayerEventType.REBUFFERING, onRebuffering);
    player.current.addEventListener(IVSPlayer.PlayerEventType.TEXT_METADATA_CUE, onTextMetadataCue);

    if (deviceDetect.isMobileSafari) {
      video.addEventListener('webkitendfullscreen', onFullScreenChange);
    } else if (deviceDetect.isSafari) {
      document.addEventListener('webkitfullscreenchange', onFullScreenChange);
    } else {
      document.addEventListener('fullscreenchange', onFullScreenChange);
    }
  }, [IVSPlayer.PlayerState, IVSPlayer.PlayerEventType, deviceDetect.isMobileSafari, deviceDetect.isSafari, onStateChange, onTextMetadataCue]);

  const RemoveEventListeners = useCallback(() => {
    const video = playerWrapper.current.getElementsByTagName('video')[0];

    player.current.removeEventListener(IVSPlayer.PlayerState.READY, onStateChange);
    player.current.removeEventListener(IVSPlayer.PlayerState.PLAYING, onStateChange);
    player.current.removeEventListener(IVSPlayer.PlayerState.BUFFERING, onStateChange);
    player.current.removeEventListener(IVSPlayer.PlayerState.IDLE, onStateChange);
    player.current.removeEventListener(IVSPlayer.PlayerState.ENDED, onStateChange);
    player.current.addEventListener(IVSPlayer.PlayerEventType.ERROR, onError);
    player.current.addEventListener(IVSPlayer.PlayerEventType.REBUFFERING, onRebuffering);
    player.current.addEventListener(IVSPlayer.PlayerEventType.TEXT_METADATA_CUE, onTextMetadataCue);

    if (deviceDetect.isMobileSafari) {
      video.removeEventListener('webkitendfullscreen', onFullScreenChange);
    } else if (deviceDetect.isSafari) {
      document.removeEventListener('webkitfullscreenchange', onFullScreenChange);
    } else {
      document.removeEventListener('fullscreenchange', onFullScreenChange);
    }
  }, [
    player,
    IVSPlayer.PlayerState,
    IVSPlayer.PlayerEventType,
    deviceDetect.isMobileSafari,
    deviceDetect.isSafari,
    onStateChange,
    onTextMetadataCue,
  ]);

  /** WEBSOCKET CONNECTION useEffect - START **/

  const onMessage = (data) => {
    setTranscriptionsQueue((oldQueue) => {
      const newQueue = [...oldQueue];
      newQueue.push(data);
      newQueue.sort((a, b) => a.startTime - b.startTime);
      return newQueue;
    });
  };

  useEffect(() => {
    if (isPlaying) {
      if (webSocket.current) {
        closeSocket(webSocket.current);
        webSocket.current = null;
      }
      webSocket.current = createSocket(wsCaptionsUrl, showDebugInfo, onMessage);
    }
  }, [isPlaying, wsCaptionsUrl, showDebugInfo]);

  /** WEBSOCKET CONNECTION useEffect - END **/

  /** iOS STREAM TIME HANDLE useEffect - START **/

  useEffect(() => {
    if (deviceDetect.isIOS && (deviceDetect.deviceType === 'mobile' || deviceDetect.isChrome)) {
      getManifestStreamTime(isPlaying, streamUrl, player);
    }
  }, [isPlaying, streamUrl, deviceDetect.isIOS, deviceDetect.isChrome, deviceDetect.deviceType]);

  /** iOS STREAM TIME HANDLE useEffect - END **/

  /** UPDATE CAPTIONS useEffect - START **/

  const removeTranscriptionsFromQueue = (playerPosition, timeCorrection) => {
    const syncPosition = playerPosition - timeCorrection;

    setTranscriptionsQueue((oldQueue) => {
      const newQueue = [...oldQueue];
      let i = 0;

      while (i < newQueue.length && newQueue[i].endTime <= syncPosition) {
        i++;
      }

      newQueue.splice(0, i + 1);

      return newQueue;
    });
  };

  const shiftTranscriptionsQueue = () => {
    setTranscriptionsQueue((oldQueue) => {
      const newQueue = [...oldQueue];
      newQueue.shift();
      return newQueue;
    });
  };

  const createNewCueAndAddToTrack = (startTime, endTime, text) => {
    // sanity checks
    if (!trackEl?.current?.track?.cues) return;

    // get current track and cues
    const track = trackEl.current.track;
    const cues = track.cues;

    // create new cue
    /* eslint-disable no-undef */
    const newCue = new VTTCue(startTime, endTime, text);
    /* eslint-disable no-undef */

    // format new cue accordingly
    if (config.ENABLE_TRANSLATE === 'true' && config.RIGHT_ALIGNED_LANGUAGES.includes(currentLanguage)) {
      if (deviceDetect.isMacOs && deviceDetect.isSafari) {
        newCue.align = 'center';
        newCue.positionAlign = 'line-right';
        newCue.position = 40;
      } else {
        newCue.align = 'right';
        newCue.position = 80;
      }
    } else {
      newCue.align = 'left';
      newCue.position = 20;
    }
    newCue.size = 60;

    // increase distance between player bottom and captions for translations (because they can span in more than 2 rows)
    if (currentLanguage !== 'en') {
      newCue.line = deviceDetect.isIOS ? IOS_LINE_POSITION - 1 : LINE_POSITION - 1;
    } else {
      newCue.line = deviceDetect.isIOS ? IOS_LINE_POSITION : LINE_POSITION;
    }

    // remove old cues
    while (cues.length > 0) {
      track.removeCue(cues[0]);
    }

    // add new cue
    track.addCue(newCue);
  };

  const showCaption = (startTime, endTime, text) => {
    setShowCaptions(true);
    createNewCueAndAddToTrack(startTime, endTime, text);
    shiftTranscriptionsQueue();
  };

  const updateCaptions = () => {
    // sanity checks
    if (!transcriptionsQueue.length || !showCaptionsButtonState) return;

    // get new caption
    const newCaption = transcriptionsQueue[0];

    if (deviceDetect.isIOS && (deviceDetect.deviceType === 'mobile' || deviceDetect.isChrome)) {
      showIOSCaption(newCaption, player, showCaption, shiftTranscriptionsQueue);
      return;
    }

    // calculate start and end times
    const playerPosition = player.current.getPosition();
    // NOTE: getStartOffset is an unsupported player API. As such, it may be changed or deprecated without notice
    const playerStartOffset = player.current.getStartOffset();

    let playerLiveLatency;
    if (deviceDetect.isOpera) {
      playerLiveLatency = player.current.isLiveLowLatency() ? 2 : 4;
    } else {
      playerLiveLatency = player.current.getLiveLatency();
    }

    const timeCorrection = -(playerStartOffset + playerLiveLatency);
    const endTimeCorrection = timeCorrection + CAPTIONS_MAX_DISPLAY_TIME;

    const startTime = newCaption.startTime + timeCorrection;
    const endTime = newCaption.endTime + endTimeCorrection;

    if (showDebugInfo) {
      console.info('[updateCaptions function message] New caption data:', {
        caption: newCaption.text,
        partial: newCaption.partial,
        originalStartTime: newCaption.startTime,
        originalEndTime: newCaption.endTime,
        finalStartTime: startTime,
        finalEndTime: endTime,
        playerStartOffset: playerStartOffset,
        playerPosition: playerPosition,
        playerLiveLatency: playerLiveLatency,
        transcriptionErrors: transcriptionErrors,
      });
    }

    // check times and display caption
    if (startTime <= playerPosition && endTime >= playerPosition) {
      showCaption(startTime, endTime, newCaption.text);
      setTranscriptionErrors(0);
    } else if (endTime <= playerPosition) {
      removeTranscriptionsFromQueue(playerPosition, endTimeCorrection);
      setTranscriptionErrors((errors) => errors + 1);
      if (showDebugInfo) {
        console.info('[updateCaptions function message] Caption error data:', {
          caption: newCaption.text,
          partial: newCaption.partial,
          originalStartTime: newCaption.startTime,
          originalEndTime: newCaption.endTime,
          finalStartTime: startTime,
          finalEndTime: endTime,
          playerStartOffset: playerStartOffset,
          playerPosition: playerPosition,
          playerLiveLatency: playerLiveLatency,
          transcriptionErrors: transcriptionErrors,
        });
      }
    }
  };

  useEffect(() => {
    captionsInterval.current = setInterval(() => updateCaptions(), CAPTIONS_UPDATE_INTERVAL);
    return () => clearInterval(captionsInterval.current);
  });

  /** UPDATE CAPTIONS useEffect - END **/

  /** CAPTIONS ERRORS useEffect - START **/

  useEffect(() => {
    if (transcriptionErrors > CAPTIONS_MAX_ERRORS) {
      window.location.reload();
    }
  }, [transcriptionErrors]);

  /** CAPTIONS ERRORS useEffect - END **/

  useEffect(() => {
    if (!isPlayerSupported) {
      console.warn('The current browser does not support the Amazon IVS player.');
      return;
    }

    player.current = IVSPlayer.create();
    player.current.attachHTMLVideoElement(videoEl.current);

    AddEventListeners();

    player.current.load(streamUrl);

    // Ask if the browser allows autoplay with sound
    canAutoPlay.video({ muted: false, inline: true, timeout: 1000 }).then(({ result, error }) => {
      if (result) {
        player.current.play();
      } else {
        console.warn(error);
        canAutoplayMuted();
      }
    });

    // Ask for autoplay without sound
    const canAutoplayMuted = () =>
      canAutoPlay.video({ muted: true, inline: true, timeout: 1000 }).then(({ result }) => {
        if (result) {
          setIsAudioBlocked(true);
          player.current.setMuted(true);
          player.current.play();
        } else {
          setIsVideoBlocked(true);
        }
      });

    return () => {
      RemoveEventListeners();
    };
  }, [IVSPlayer, isPlayerSupported, streamUrl, AddEventListeners, RemoveEventListeners]);

  useEffect(() => {
    if (trackEl.current) {
      if (showCaptions) {
        trackEl.current.track.mode = 'showing';
      } else {
        trackEl.current.track.mode = 'hidden';
      }
    }
  }, [showCaptions]);

  const clearTranscriptionsQueue = () => {
    setTranscriptionsQueue([]);
  };

  const toggleCaptions = () => {
    setShowCaptionsButtonState(!showCaptionsButtonState);
    setShowCaptions(!showCaptions);
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const toggleTranslate = () => {
    setShowTranslate(!showTranslate);
  };

  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
  };

  const toggleLanguage = (event) => {
    toggleTranslate();
    const lang = event.target.dataset.value;
    setCurrentLanguage(lang);
    setWsCaptionsUrl(`${config.WS_CAPTIONS_URL}?lang=${lang}`);
    setShowCaptions(false);
    clearTranscriptionsQueue();
    setShowTranslate(!showTranslate);
  };

  const toggleFullscreen = () => {
    const elem = document;
    const video = playerWrapper.current.getElementsByTagName('video')[0];
    if (isFullscreen) {
      if (elem.exitFullscreen) {
        elem.exitFullscreen();
      } else if (elem.webkitExitFullscreen) {
        /* Safari */
        elem.webkitExitFullscreen();
      } else if (elem.msExitFullscreen) {
        /* IE11 */
        elem.msExitFullscreen();
      } else if (video.webkitExitFullScreen) {
        /* IOS */
        video.webkitExitFullScreen();
      }
    } else {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        /* Safari */
        video.webkitRequestFullscreen();
      } else if (video.msRequestFullscreen) {
        /* IE11 */
        video.msRequestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        /* IOS */
        video.webkitEnterFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  if (!isPlayerSupported) {
    return null;
  }

  const startPlayback = () => {
    player.current.play();
    setIsVideoBlocked(false);
  };

  return (
    <div className="stream-wrapper" ref={playerWrapper}>
      <div className="aspect-16x9">
        {placeHolderStatus && !isVideoBlocked && <Placeholder status={placeHolderStatus} />}
        <div className="player">
          {!placeHolderStatus && overlays && overlays.length > 0 && <Overlays overlays={overlays} />}

          <video ref={videoEl} className="video-el" playsInline preload="metadata" crossOrigin="anonymous">
            {!placeHolderStatus && <track ref={trackEl} kind="captions" srcLang={currentLanguage} default />}
          </video>

          <div className="player-ui">
            {showDebugInfo && <PlayerDebugInfo player={player.current} />}

            {showSettings && <PlayerSettings toggleSettings={toggleSettings} toggleDebugInfo={toggleDebugInfo} showDebugInfo={showDebugInfo} />}

            {showTranslate && <PlayerTranslate selectedLanguage={currentLanguage} onLanguageSelected={toggleLanguage} />}

            {player.current && !isVideoBlocked && (
              <PlayerControls
                player={player.current}
                showCaptions={showCaptionsButtonState}
                toggleCaptions={toggleCaptions}
                openTranslate={toggleTranslate}
                openSettings={toggleSettings}
                isFullscreen={isFullscreen}
                toggleFullscreen={toggleFullscreen}
                startsMuted={isAudioBlocked}
                enableTranslate={enableTranslate}
              />
            )}

            {isVideoBlocked && <PlayerAutoPlayBlocked startPlayback={startPlayback} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClosedCaptionPlayer;
