import React, { useEffect, useRef } from 'react';
import config from '../../config';
import languageMappings from '../../assets/translate-options-mapping.json';
import './PlayerTranslate.css';

const VISIBLE_OPTIONS = 4;

const PlayerTranslate = ({ selectedLanguage, onLanguageSelected }) => {
  const translationLanguages = config.CAPTIONS_TRANSLATIONS_LANGUAGE_CODES.split('-') || [];
  const captionsLanguages = [config.AUDIO_LANGUAGE_CODE]
    .concat(translationLanguages)
    .filter((l) => l !== '');
  const playerUI = useRef(null);

  useEffect(() => {
    if (captionsLanguages.length <= VISIBLE_OPTIONS) {
      playerUI.current.style.heigth = '80px';
      playerUI.current.style.overflow = 'hidden';
    } else {
      playerUI.current.style.heigth = '240px';
    }
  }, [captionsLanguages.length]);

  return (
    <div className='player-ui__translate' ref={playerUI}>
      {captionsLanguages.map((languageCode, i) => (
        <li
          className={`player-ui-lineBorder${
                        languageCode === selectedLanguage ? ' disabled' : ''
                    }`}
          key={i}
          data-value={languageCode}
          onClick={onLanguageSelected}
        >
          {languageMappings[languageCode] || languageCode.toUpperCase()}
        </li>
      ))}
    </div>
  );
};

export default PlayerTranslate;
