import React from 'react';
import Image from './Image';
import './Overlays.css';

const Overlays = ({ overlays }) => {
  return (
    <div className='player-overlay overlay-imgs'>
      {overlays.map(overlay =>
        <div key={overlay.id} className='overlay-img'>
          <Image imgUrl={overlay.imgUrl} url={overlay.url} />
        </div>
      )}
    </div>
  );
};

export default Overlays;
