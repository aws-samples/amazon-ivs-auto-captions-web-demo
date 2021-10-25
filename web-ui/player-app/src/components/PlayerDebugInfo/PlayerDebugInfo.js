import React, { useEffect, useReducer, useRef } from 'react';
import './PlayerDebugInfo.css';

const deviceDetect = require('react-device-detect');

const PlayerDebugInfo = ({ player }) => {
  const interval = useRef(null);

  const debugInfoReducer = (state, action) => {
    let playerLiveLatency;
    if (deviceDetect.isOpera) {
      playerLiveLatency = player.isLiveLowLatency() ? 2 : 4;
    } else {
      playerLiveLatency = player.getLiveLatency();
    }

    if (action === 'updateDebugInfo') {
      return {
        latency: `${playerLiveLatency.toFixed(2)} sec`,
        isLowLatency: player.isLiveLowLatency() ? 'Yes' : 'No',
        position: `${Math.ceil(player.getPosition())} sec`,
        startOffset: `${Math.ceil(player.getStartOffset())} sec`,
        quality: `${player.getQuality().name} ${player.getQuality().codecs}`,
        bitRate: player.getQuality().bitrate
      };
    }
  };
  const [debugInfo, dispatch] = useReducer(debugInfoReducer, {});

  useEffect(() => {
    interval.current = setInterval(() => {
      dispatch('updateDebugInfo');
    }, 1000);
    return () => {
      clearInterval(interval.current);
    };
  }, []);

  return (
    <div className='player-debug'>
      <table className='debug-info-table'>
        <tbody>
          <tr>
            <th>Latency</th>
            <td>{debugInfo.latency}</td>
          </tr>
          <tr>
            <th>Is low latency</th>
            <td>{debugInfo.isLowLatency}</td>
          </tr>
          <tr>
            <th>Position</th>
            <td>{debugInfo.position}</td>
          </tr>
          <tr>
            <th>Start offset</th>
            <td>{debugInfo.startOffset}</td>
          </tr>
          <tr>
            <th>Quality</th>
            <td>{debugInfo.quality}</td>
          </tr>
          <tr>
            <th>Bitrate</th>
            <td>{debugInfo.bitRate}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default PlayerDebugInfo;
