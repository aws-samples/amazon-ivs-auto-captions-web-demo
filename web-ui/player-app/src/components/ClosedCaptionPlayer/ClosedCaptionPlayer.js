import React, { useEffect, useRef, useState } from 'react';

import configData from '../../config';
import Placeholder from '../Placeholder';
import PlayerControls from '../PlayerControls';
import PlayerDebugInfo from '../PlayerDebugInfo';
import PlayerSettings from '../PlayerSettings';
import Overlays from '../Overlays';
import { closeSocket, createSocket, setOnMessageListener } from '../../helpers/websocket';
import { getManifestStreamTime, showIOSCaption } from '../../helpers/iosCaption';
import canAutoPlay from 'can-autoplay';

import './ClosedCaptionPlayer.css';

const ClosedCaptionPlayer = ({ streamUrl }) => {
  const deviceDetect = require('react-device-detect');

  const { IVSPlayer } = window;
  const { isPlayerSupported } = IVSPlayer;

  const [overlays, setOverlays] = useState([]);
  const [placeHolderStatus, setPlaceHolderStatus] = useState('loading');
  const [showSettings, setShowSettings] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wsCaptionsUrl] = useState(configData.WS_CAPTIONS_URL);
  const [transcriptionsQueue, setTranscriptionsQueue] = useState([]);
  const [transcriptionErrors, setTranscriptionErrors] = useState(0);
  const [latency, setLatency] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);

  const player = useRef(null);
  const videoEl = useRef(null);
  const trackEl = useRef(null);
  const playerWrapper = useRef(null);
  const captionsInterval = useRef(null);
  const webSocket = useRef(null);

  // Hook to handle WebSocket connection and messages
  useEffect(() => {
    if (isPlaying) {
      if (!webSocket.current) {
        webSocket.current = createSocket(
          wsCaptionsUrl,
          showDebugInfo,
          addTranscriptionToQueue
        );
      }
    } else {
      closeSocket(webSocket.current);
      webSocket.current = null;
    }
  }, [isPlaying, wsCaptionsUrl, showDebugInfo]);

  useEffect(() => {
    if (webSocket.current) {
      setOnMessageListener(webSocket.current, showDebugInfo, addTranscriptionToQueue);
    }
  }, [showDebugInfo]);

  // Add the received transcription to the queue of transcriptions and reorder them by start time
  const addTranscriptionToQueue = (data) => {
    setTranscriptionsQueue(oldQueue => {
      oldQueue.push(data);
      oldQueue.sort((a, b) => (a.startTime - b.startTime));
      return oldQueue;
    });
  };

  useEffect(() => {
    if (deviceDetect.isIOS && (deviceDetect.deviceType === 'mobile'|| deviceDetect.isChrome)) {
      getManifestStreamTime(isPlaying, streamUrl, player);
    }
  }, [isPlaying, streamUrl, deviceDetect.isIOS, deviceDetect.isChrome, deviceDetect.deviceType]);

  useEffect(() => {
    const iosLinePosition = -4;
    const linePosition = -3;

    // Remove transcriptions with (corrected) end time less than player position
    const removeTranscriptionsFromQueue = (playerPosition, endTimeCorrection) => {
      const syncPosition = playerPosition - endTimeCorrection;
      setTranscriptionsQueue(oldQueue => {
        let i = 0;
        while (i < oldQueue.length && (oldQueue[i].endTime <= syncPosition)) {
          i++;
        }
        oldQueue.splice(0, i + 1);
        return oldQueue;
      });
    };

    // Remove first transcription from the queue
    const shiftTranscriptionsQueue = () => {
      setTranscriptionsQueue(oldQueue => {
        oldQueue.shift();
        return oldQueue;
      });
    };

    // Add the VTT cue to the video track
    const addCaptionVTT = (startTime, endTime, text) => {
      if (trackEl && trackEl.current && trackEl.current.track && trackEl.current.track.cues) {
        const track = trackEl.current.track;
        const cues = track.cues;
        endTime += 1;

        // Remove cues
        while (cues.length > 0) {
          track.removeCue(cues[0]);
        }

        // Add new cue
        if (text) {
          /* eslint-disable no-undef */
          const newCue = new VTTCue(startTime, endTime, text);
          /* eslint-disable no-undef */
          newCue.align = 'left';
          newCue.size = 60;
          newCue.position = 20;
          newCue.line = deviceDetect.isIOS ? iosLinePosition : linePosition;
          track.addCue(newCue);
        }
      }
    };

    // Show caption and remove it from the transcriptions queue
    const showCaption = (startTime, endTime, text) => {
      addCaptionVTT(startTime, endTime, text);
      shiftTranscriptionsQueue();
    };

    // Handle synchronization and display of transcription
    const processTranscription = () => {
      if (transcriptionsQueue.length && isPlaying) {
        const data = transcriptionsQueue[0];
        if (deviceDetect.isIOS && (deviceDetect.deviceType === 'mobile'|| deviceDetect.isChrome)) {
          showIOSCaption(data, player, showCaption, shiftTranscriptionsQueue);
          return;
        }
        const startOffset = player.current.getStartOffset();
        if (startOffset < 0) {
          return;
        }
        const playerPosition = player.current.getPosition();
        const addPartialEndTime = data.partial ? 6 : 0;

        const timeCorrection = -(startOffset + latency);
        const endTimeCorrection = timeCorrection + addPartialEndTime;

        const startTime = data.startTime + timeCorrection;
        const endTime = data.endTime + endTimeCorrection;

        if (startTime <= playerPosition && endTime >= playerPosition) {
          showCaption(startTime, endTime, data.text);
          setTranscriptionErrors(0);
        } else if (endTime <= playerPosition) {
          removeTranscriptionsFromQueue(playerPosition, endTimeCorrection);
          setTranscriptionErrors(errors => errors + 1);
        }
      }
    };

    captionsInterval.current = setInterval(() => {
      processTranscription();
    }, 100);

    return () => {
      clearInterval(captionsInterval.current);
    };
  }, [transcriptionsQueue, isPlaying, latency, deviceDetect.isIOS, deviceDetect.deviceType, deviceDetect.isChrome, showDebugInfo]);

  useEffect(() => {
    if (transcriptionErrors > 20) {
      window.location.reload();
    }
  }, [transcriptionErrors]);

  useEffect(() => {
    const { BUFFERING, ENDED, IDLE, PLAYING, READY } = IVSPlayer.PlayerState;
    const { ERROR, REBUFFERING, TEXT_METADATA_CUE } = IVSPlayer.PlayerEventType;

    if (!isPlayerSupported) {
      console.warn('The current browser does not support the Amazon IVS player.');
      return;
    }

    const onStateChange = () => {
      const playerState = player.current.getState();

      console.log(`Player State - ${playerState}`);
      setIsPlaying(playerState === PLAYING);

      if (playerState === PLAYING) {
        setPlaceHolderStatus(null);
        if (trackEl && trackEl.current) {
          trackEl.current.track.mode = 'showing';
        }
      } else if (playerState === ENDED) {
        setPlaceHolderStatus('This live stream has ended');
      }
    };

    const onError = (err) => {
      console.warn('Player Event - ERROR:', err);
      setPlaceHolderStatus('This live stream is currently offline');
    };

    const onRebuffering = () => {
      console.log('Player State - Rebuffering');
      player.current.setRebufferToLive(true);
    };

    const onTextMetadataCue = (textMetadataCue) => {
      const metadata = JSON.parse(textMetadataCue.text);
      if (metadata.type === 'overlay') {
        handleOverlays(metadata);
      }
    };

    // Updates the array containing the overlays to be shown according to keywords in the transcription.
    const handleOverlays = (data) => {
      const { keyword, imgUrl, url } = data;
      const imgId = new Date().getTime();

      // A maximum of <MAX_OVERLAYS> overlays are shown at the same time.
      setOverlays(oldOverlays => {
        let newOverlays = [...oldOverlays];

        // Removes the overlay if already exists in the array.
        // Otherwise, if the maximum is reached, removes the first overlay.
        if (newOverlays.find(overlay => overlay.keyword === keyword)) {
          newOverlays = newOverlays.filter(overlay => overlay.keyword !== keyword);
        } else if (newOverlays.length >= configData.MAX_OVERLAYS) {
          newOverlays.shift();
        }

        newOverlays.push({ id: imgId, keyword, imgUrl, url });
        return newOverlays;
      });

      // Each overlay is removed from the array after a period defined by <TIME_OVERLAYS>.
      setTimeout(() => {
        setOverlays(oldOverlays => oldOverlays.filter(overlay => overlay.id !== imgId));
      }, configData.TIME_OVERLAYS);
    };

    const onFullScreenChange = (event) => {
      if (document.fullscreenElement) {
        setIsFullscreen(true);
      } else {
        setIsFullscreen(false);
      }
    };

    player.current = IVSPlayer.create();
    player.current.attachHTMLVideoElement(videoEl.current);

    player.current.addEventListener(READY, onStateChange);
    player.current.addEventListener(PLAYING, onStateChange);
    player.current.addEventListener(BUFFERING, onStateChange);
    player.current.addEventListener(IDLE, onStateChange);
    player.current.addEventListener(ENDED, onStateChange);

    player.current.addEventListener(ERROR, onError);
    player.current.addEventListener(REBUFFERING, onRebuffering);
    player.current.addEventListener(TEXT_METADATA_CUE, onTextMetadataCue);

    player.current.load(streamUrl);

    // Ask if the browser allows autoplay with sound
    canAutoPlay.video({ muted: false, inline: true, timeout: 1000 }).then(({ result, error }) => {
      if (result) {
        player.current.play();
      } else {
        console.warn(error);
        setIsAudioBlocked(true);
        canAutoplayMuted();
      }
    });

    // Ask for autoplay without sound
    const canAutoplayMuted = () => canAutoPlay.video({ muted: true, inline: true, timeout: 1000 }).then(({ result, error }) => {
      if (result) {
        player.current.setMuted(true);
        player.current.play();
      } else {
        // User interaction is required
        console.warn(error);
      }
    });

    player.current.isLiveLowLatency() ? setLatency(2) : setLatency(4);

    const video = playerWrapper.current.getElementsByTagName('video')[0];
    if (deviceDetect.isMobileSafari) {
      video.addEventListener('webkitendfullscreen', onFullScreenChange);
    } else if (deviceDetect.isSafari) {
      document.addEventListener('webkitfullscreenchange', onFullScreenChange);
    } else {
      document.addEventListener('fullscreenchange', onFullScreenChange);
    }

    return () => {
      player.current.removeEventListener(READY, onStateChange);
      player.current.removeEventListener(PLAYING, onStateChange);
      player.current.removeEventListener(BUFFERING, onStateChange);
      player.current.removeEventListener(IDLE, onStateChange);
      player.current.removeEventListener(ENDED, onStateChange);

      player.current.removeEventListener(ERROR, onError);
      player.current.removeEventListener(REBUFFERING, onRebuffering);
      player.current.removeEventListener(TEXT_METADATA_CUE, onTextMetadataCue);

      if (deviceDetect.isMobileSafari) {
        video.removeEventListener('webkitendfullscreen', onFullScreenChange);
      } else if (deviceDetect.isSafari) {
        document.removeEventListener('webkitfullscreenchange', onFullScreenChange);
      } else {
        document.removeEventListener('fullscreenchange', onFullScreenChange);
      }
    };
  }, [IVSPlayer, isPlayerSupported, streamUrl, deviceDetect.isMobileSafari, deviceDetect.isSafari]);

  const toggleCaption = () => {
    trackEl.current.track.mode = trackEl.current.track.mode === 'showing' ? 'hidden' : 'showing';
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
  };

  const toggleFullscreen = () => {
    const elem = document;
    const video = playerWrapper.current.getElementsByTagName('video')[0];
    if (isFullscreen) {
      if (elem.exitFullscreen) {
        elem.exitFullscreen();
      } else if (elem.webkitExitFullscreen) { /* Safari */
        elem.webkitExitFullscreen();
      } else if (elem.msExitFullscreen) { /* IE11 */
        elem.msExitFullscreen();
      } else if (video.webkitExitFullScreen) { /* IOS */
        video.webkitExitFullScreen();
      }
    } else {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) { /* Safari */
        video.webkitRequestFullscreen();
      } else if (video.msRequestFullscreen) { /* IE11 */
        video.msRequestFullscreen();
      } else if (video.webkitEnterFullscreen) { /* IOS */
        video.webkitEnterFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  if (!isPlayerSupported) {
    return null;
  }

  return (
    <div className='stream-wrapper' ref={playerWrapper}>
      <div className='aspect-16x9'>
        {placeHolderStatus && <Placeholder status={placeHolderStatus} />}
        <div className='player'>
          {!placeHolderStatus && overlays && overlays.length > 0 && (
            <Overlays overlays={overlays} />
          )}
          
          <video ref={videoEl} className='video-el' playsInline preload='metadata' crossOrigin='anonymous'>
            {!placeHolderStatus && <track ref={trackEl} kind='captions' srcLang='en' label='English' default />}
          </video>

          <div className='player-ui'>
            {showDebugInfo && <PlayerDebugInfo player={player.current} />}

            {showSettings && (
              <PlayerSettings
                toggleSettings={toggleSettings}
                toggleDebugInfo={toggleDebugInfo}
                showDebugInfo={showDebugInfo}
              />)}

            {player.current && (
              <PlayerControls
                player={player.current}
                showCaptions={trackEl.current?.track.mode}
                toggleCaption={toggleCaption}
                openSettings={toggleSettings}
                isFullscreen={isFullscreen}
                toggleFullscreen={toggleFullscreen}
                startsMuted={isAudioBlocked}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClosedCaptionPlayer;