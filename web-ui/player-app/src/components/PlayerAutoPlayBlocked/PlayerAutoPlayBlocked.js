import React from 'react';
import { LargePlay } from '../../assets/icons';
import './PlayerAutoPlayBlocked.css';

const PlayerAutoPlayBlocked = ({ startPlayback }) => {
  return (
    <div className='large-play-background'>
      <div onClick={startPlayback} className='large-play-icon'>
        <LargePlay />
      </div>
    </div>
  );
};

export default PlayerAutoPlayBlocked;
