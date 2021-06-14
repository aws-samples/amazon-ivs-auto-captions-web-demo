import React from 'react';

const Image = ({ imgUrl, url }) => {
  if (url) {
    return (
      <a
        target='_blank'
        rel='noreferrer noopener'
        href={url}
      >
        <img
          height='100%'
          src={imgUrl}
          alt=''
        />
      </a>
    );
  } else {
    return (
      <img
        height='100%'
        src={imgUrl}
        alt=''
      />
    );
  }
};

export default Image;
