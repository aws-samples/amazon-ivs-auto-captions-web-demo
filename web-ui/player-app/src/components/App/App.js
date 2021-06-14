import React from 'react';
import ClosedCaptionPlayer from '../ClosedCaptionPlayer';
import configData from '../../config';
import './App.css';

const App = () => {
  return (
    <div className='App'>
      <ClosedCaptionPlayer streamUrl={configData.STREAM_PLAYBACK_URL} />
    </div>
  );
};

export default App;
