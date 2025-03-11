import React from 'react';
import { TimingHistory } from './types';
import { getTargetedPatterns } from './utils';

interface GameScreenProps {
  words: string[];
  wordIndex: number;
  currentInput: string;
  completedInputs: string[];
  timingHistory: TimingHistory;
}

const GameScreen: React.FC<GameScreenProps> = ({
  words,
  wordIndex,
  currentInput,
  completedInputs,
  timingHistory
}) => {
  const renderWord = (word: string, index: number) => {
    const { letters, bigrams } = getTargetedPatterns(timingHistory);
    
    const bigramIndices = new Set<number>();
    for (let i = 0; i < word.length - 1; i++) {
      const bigram = word.slice(i, i + 2);
      if (bigrams.includes(bigram)) {
        bigramIndices.add(i);
        bigramIndices.add(i + 1);
      }
    }
    
    const renderChar = (char: string, charIndex: number) => {
      let className = '';
      const isTargetedLetter = letters.includes(char);
      const isInTargetedBigram = bigramIndices.has(charIndex);
      
      if (index < wordIndex) {
        const typedInput = completedInputs[index];
        className = typedInput?.[charIndex] === char ? 'correct-char' : 'incorrect-char';
      } else if (index === wordIndex) {
        if (charIndex < currentInput.length) {
          className = currentInput[charIndex] === char ? 'correct-char' : 'incorrect-char';
        } else {
          className = 'untyped-char';
        }
      } else {
        className = 'untyped-char';
      }
      
      if (isTargetedLetter) {
        className += ' targeted-pattern';
      }
      if (isInTargetedBigram) {
        className += ' targeted-pattern bigram';
      }
      
      return (
        <span key={charIndex} className={className}>
          {char}
        </span>
      );
    };

    if (index < wordIndex) {
      return (
        <span>
          {word.split('').map((char, charIndex) => renderChar(char, charIndex))}
          {' '}
        </span>
      );
    }
    
    if (index === wordIndex) {
      const cursorOffset = 0.55 * currentInput.length;
      const cursorStyle = {
        '--cursor-offset': `${cursorOffset}em`
      } as React.CSSProperties;

      return (
        <span className="current-word">
          <span className="cursor" style={cursorStyle}></span>
          {word.split('').map((char, charIndex) => renderChar(char, charIndex))}
          {currentInput.length > word.length && (
            <span className="incorrect-char">
              {currentInput.slice(word.length)}
            </span>
          )}
          {' '}
        </span>
      );
    }
    
    return (
      <span>
        {word.split('').map((char, charIndex) => renderChar(char, charIndex))}
        {' '}
      </span>
    );
  };

  return (
    <>
      {timingHistory.letters && Object.keys(timingHistory.letters).length > 0 && (
        <div className="targeting-info">
          <div className="targeting-section">
            <h4>Targeting slow letters:</h4>
            <div className="targeted-items">
              {getTargetedPatterns(timingHistory).letters.map(letter => (
                <span key={letter} className="targeted-item">
                  {letter === ' ' ? '␣' : letter}
                </span>
              ))}
            </div>
          </div>
          <div className="targeting-section">
            <h4>Targeting slow bigrams:</h4>
            <div className="targeted-items">
              {getTargetedPatterns(timingHistory).bigrams.map(bigram => (
                <span key={bigram} className="targeted-item">
                  {bigram}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="game-container">
        <div className="words-display">
          {words.map((word, idx) => (
            <span key={idx}>
              {renderWord(word, idx)}
            </span>
          ))}
        </div>
        <div className="typing-prompt">
          Start typing to begin
        </div>
      </div>
    </>
  );
};

export default GameScreen; 