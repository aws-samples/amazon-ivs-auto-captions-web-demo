import React, { useEffect, useState } from 'react';
import './Placeholder.css';

const Placeholder = (props) => {
  const { bgColor = '#000', spinnerColor = '#fff', status } = props;

  const [gradientBg, setGradientBg] = useState('');

  const hexToRgb = (hex) =>
    hex
      .replace(
        /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
        (m, r, g, b) => `#${r + r + g + g + b + b}`
      )
      .substring(1)
      .match(/.{2}/g)
      .map((x) => parseInt(x, 16));

  const getRgba = (rgb, alpha) => {
    const [r, g, b] = rgb;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  useEffect(() => {
    const rgb = hexToRgb(bgColor);

    setGradientBg(
      `linear-gradient(0deg, ${getRgba(rgb, 1)} 50%, ${getRgba(
        rgb,
        0.9
      )} 100%), linear-gradient(90deg, ${getRgba(rgb, 0.9)} 0%, ${getRgba(
        rgb,
        0.6
      )} 100%), linear-gradient(180deg, ${getRgba(rgb, 0.6)} 0%, ${getRgba(
        rgb,
        0.3
      )} 100%), linear-gradient(360deg, ${getRgba(rgb, 0.3)} 0%, ${getRgba(
        rgb,
        0
      )} 100%)`
    );
  }, [bgColor]);

  return (
    <div className='placeholder' style={{ background: bgColor }}>
      <div className='placeholder-content'>
        {status === 'loading' && (
          <div
            className='placeholder-spinner'
            style={{ background: spinnerColor }}
          >
            <div
              className='placeholder-gradient'
              style={{ backgroundImage: gradientBg }}
            />
          </div>
        )}
        {status !== 'loading' && (
          <span className='placeholder-message'>
            {status}
          </span>
        )}
      </div>
    </div>
  );
};

export default Placeholder;
