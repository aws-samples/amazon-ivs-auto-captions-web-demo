import React, { useEffect, useState } from 'react';

import {
  Play,
  Pause,
  VolumeOff,
  VolumeUp,
  ClosedCaption,
  ClosedCaptionDisabled,
  Settings,
  Fullscreen,
  ExitFullscreen
} from '../../assets/icons';

const PlayerControls = ({ player, showCaptions, toggleCaption, openSettings, isFullscreen, toggleFullscreen, startsMuted }) => {
  const [muted, setMuted] = useState(startsMuted);
  const [paused, setPaused] = useState(false);

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
        <button className='player-ui-button' onClick={toggleCaption}>
          {showCaptions !== 'hidden' ? <ClosedCaption /> : <ClosedCaptionDisabled />}
        </button>
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
