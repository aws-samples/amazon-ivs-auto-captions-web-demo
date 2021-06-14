import React from 'react';
import { Close } from '../../assets/icons';
import './PlayerSettings.css';

const PlayerSettings = ({
  toggleSettings,
  toggleDebugInfo,
  showDebugInfo
}) => {
  return (
    <div className='player-settings'>
      <button className='close-icon' onClick={toggleSettings}>
        <Close />
      </button>
      <h3>Player settings</h3>
      <hr />
      <h4>Debug</h4>
      <label htmlFor='show-debug-info'>
        <input
          type='checkbox'
          name='show-debug-info'
          id='show-debug-info'
          onChange={toggleDebugInfo}
          checked={showDebugInfo}
        />{' '}
        Show debug info
      </label>
    </div>
  );
};

export default PlayerSettings;
