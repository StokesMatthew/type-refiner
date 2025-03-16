import React, { useRef, useEffect, useState } from 'react';
import { TimingHistory } from '../../types/types';
import { getTargetedPatterns } from '../../utils/utils';
import './GameScreen.css';
import { toggleTheme, isDarkMode } from '../../utils/theme';
interface GameScreenProps {
  words: string[];
  wordIndex: number;
  currentInput: string;
  completedInputs: string[];
  timingHistory: TimingHistory;
  strictMode: boolean;
  hideTargets: boolean;
  onToggleStrictMode: () => void;
  onToggleHideTargets: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({
  words,
  wordIndex,
  currentInput,
  completedInputs,
  timingHistory,
  strictMode,
  hideTargets,
  onToggleStrictMode,
  onToggleHideTargets
}) => {
  // Reference to the container div for calculating word wrapping
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Array of lines containing word elements after word wrapping calculation
  const [lines, setLines] = useState<React.ReactElement[][]>([]);

  // Dark mode toggle
  const [darkMode, setDarkMode] = useState(false);

  // Calculate word wrapping based on container width
  useEffect(() => {
    const calculateLines = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.clientWidth + 10;
      let currentLine: React.ReactElement[] = [];
      let currentLineWidth = 0;
      const newLines: React.ReactElement[][] = [];
      const charWidth = 15;
      const spaceWidth = charWidth;

      words.forEach((word, idx) => {
        const wordElement = (
          <span key={idx} className="word-wrapper">
            {renderWord(word, idx)}
          </span>
        );

        const wordWidth = word.length * charWidth;
        const totalWidth = currentLineWidth + wordWidth + (currentLine.length > 0 ? spaceWidth : 0);

        if (totalWidth > containerWidth && currentLine.length > 0) {
          newLines.push([...currentLine]);
          currentLine = [wordElement];
          currentLineWidth = wordWidth;
        } else {
          currentLine.push(wordElement);
          currentLineWidth = totalWidth;
        }
      });

      if (currentLine.length > 0) {
        newLines.push(currentLine);
      }

      setLines(newLines);
    };

    calculateLines();
    window.addEventListener('resize', calculateLines);
    return () => window.removeEventListener('resize', calculateLines);
  }, [words, wordIndex, currentInput, completedInputs, hideTargets]);

  // Render a single word with appropriate styling based on typing progress
  const renderWord = (word: string, index: number) => {
    const { letters, bigrams, words: targetWords } = getTargetedPatterns(timingHistory);
    
    // Track indices of characters that are part of targeted bigrams
    const bigramIndices = new Set<number>();
    for (let i = 0; i < word.length - 1; i++) {
      const bigram = word.slice(i, i + 2);
      if (bigrams.includes(bigram)) {
        bigramIndices.add(i);
        bigramIndices.add(i + 1);
      }
    }
    
    // Render a single character with appropriate styling
    const renderChar = (char: string, charIndex: number) => {
      let className = '';
      const isTargetedLetter = letters.includes(char);
      const isInTargetedBigram = bigramIndices.has(charIndex);
      const isInTargetedWord = targetWords.includes(word);
      
      // Apply styling based on typing progress and correctness
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
      
      // Apply additional styling for targeted patterns
      if (!hideTargets) {
        if (isTargetedLetter) {
          className += ' targeted-pattern';
        }
        if (isInTargetedBigram) {
          className += ' targeted-pattern bigram';
        }
        if (isInTargetedWord) {
          className += ' targeted-word';
        }
      }
      
      return (
        <span key={charIndex} className={className}>
          {char}
        </span>
      );
    };

    // Render completed words
    if (index < wordIndex) {
      return (
        <span>
          {word.split('').map((char, charIndex) => renderChar(char, charIndex))}
          {' '}
        </span>
      );
    }
    
    // Render current word with cursor
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
    
    // Render upcoming words
    return (
      <span>
        {word.split('').map((char, charIndex) => renderChar(char, charIndex))}
        {' '}
      </span>
    );
  };

  const handleThemeChange = () => {
    setDarkMode(!darkMode);
    toggleTheme();
  }

  return (
    <>
      <div className="game-container">
        <div className="words-display" ref={containerRef}>
          {lines.map((line, lineIdx) => (
            <div key={lineIdx} className="words-line">
              {line}
            </div>
          ))}
        </div>
        <div className="typing-prompt">
          Start typing to begin
        </div>
        <div className="game-controls">
          <label className="strict-mode-toggle">
            <input
              type="checkbox"
              checked={strictMode}
              onChange={onToggleStrictMode}
            />
            <span className="toggle-label">Strict Mode</span>
          </label>
          <label className="hide-targets-toggle">
            <input
              type="checkbox"
              checked={hideTargets}
              onChange={onToggleHideTargets}
            />
            <span className="toggle-label">Hide Targets</span>
          </label>
          <label className="dark-mode-toggle">
            <input
              type="checkbox"
              checked={isDarkMode}
              onChange={handleThemeChange}
            />
            <span className="toggle-label">Dark Mode</span>
          </label>
        </div>
      </div>

      {!hideTargets && timingHistory.letters && Object.keys(timingHistory.letters).length > 0 && (
        <div className="targeting-info">
          <div className="targeting-section letters">
            <h4>Targeted Letters:</h4>
            <div className="targeted-items">
              {getTargetedPatterns(timingHistory).letters.map(letter => (
                <span key={letter} className="targeted-item">
                  {letter === ' ' ? '␣' : letter}
                </span>
              ))}
            </div>
          </div>
          <div className="targeting-section bigrams">
            <h4>Targeted Bigrams:</h4>
            <div className="targeted-items">
              {getTargetedPatterns(timingHistory).bigrams.map(bigram => (
                <span key={bigram} className="targeted-item">
                  {bigram}
                </span>
              ))}
            </div>
          </div>
          <div className="targeting-section words">
            <h4>Targeted Words:</h4>
            <div className="targeted-items">
              {getTargetedPatterns(timingHistory).words.map(word => (
                <span key={word} className="targeted-item">
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GameScreen; 