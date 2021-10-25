import React, { useEffect, useState, useRef } from 'react';

import {
  Play,
  Pause,
  VolumeOff,
  VolumeUp,
  ClosedCaption,
  ClosedCaptionDisabled,
  Settings,
  Fullscreen,
  ExitFullscreen,
  Translate
} from '../../assets/icons';

const PlayerControls = ({ player, showCaptions, toggleCaptions, openSettings, openTranslate, isFullscreen, toggleFullscreen, startsMuted, enableTranslate }) => {
  const [muted, setMuted] = useState(startsMuted);
  const [paused, setPaused] = useState(false);
  const [rotation, setRotation] = useState(false);
  const gearIconRef = useRef();

  useEffect(() => {
    setMuted(player.isMuted());
  }, [player]);

  useEffect(() => {
    setMuted(startsMuted);
  }, [startsMuted]);

  const toggleMute = () => {
    const shouldMute = !player.isMuted();

    player.setMuted(shouldMute);
    setMuted(shouldMute);
  };

  const togglePause = () => {
    const shouldPause = !player.isPaused();

    if (shouldPause) {
      player.pause();
    } else {
      player.play();
    }

    setPaused(shouldPause);
  };

  const rotateImg = () => {
    setRotation(!rotation);
    if (rotation) {
      gearIconRef.current.style.transform = 'rotate(-45deg)';
    } else {
      gearIconRef.current.style.transform = 'rotate(45deg)';
    }
  };

  const onCaptionsOptionsClick = () => {
    rotateImg();
    openTranslate();
  };

  return (
    <div className='player-ui-controls'>
      <div className='player-ui-controls__actions player-ui-controls__actions--left'>
        <button className='player-ui-button' onClick={togglePause}>
          {paused ? <Play /> : <Pause />}
        </button>

        <button className='player-ui-button' onClick={toggleMute}>
          {muted ? <VolumeOff /> : <VolumeUp />}
        </button>
      </div>

      <div className='player-ui-controls__actions player-ui-controls__actions--right'>
        <button className='player-ui-button' onClick={toggleCaptions}>
          {showCaptions ? <ClosedCaption /> : <ClosedCaptionDisabled />}
        </button>

        {enableTranslate === 'true' &&
          <button className='player-ui-button' onClick={onCaptionsOptionsClick}>
            <Translate ref={gearIconRef} />
          </button>}

        <button className='player-ui-button' onClick={toggleFullscreen}>
          {isFullscreen ? <ExitFullscreen /> : <Fullscreen />}
        </button>
        <button className='player-ui-button' onClick={openSettings}>
          <Settings />
        </button>
      </div>
    </div>
  );
};

export default PlayerControls;
