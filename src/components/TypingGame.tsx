import React, { useState, useEffect, useCallback } from 'react';
import './TypingGame.css';

interface LetterTiming {
  letter: string;
  averageTime: number;
  occurrences: number;
  mistakes: number;
}

const generateWords = (count: number): string[] => {
  // Extended word list for typing practice
  const words = [
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it', 'for', 'not', 'on', 'with', 'he',
    'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
    'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
    'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
    'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
    'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
    'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give',
    'day', 'most', 'us', 'time', 'person', 'year', 'back', 'list', 'name', 'just', 'over', 'state', 'know',
    'take', 'into', 'time', 'year', 'write', 'like', 'side', 'many', 'child', 'point', 'world', 'hand',
    'school', 'life', 'tell', 'keep', 'last', 'eye', 'never', 'let', 'next', 'should', 'need', 'try'
  ];
  
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * words.length);
    result.push(words[randomIndex]);
  }
  return result;
};

const TypingGame: React.FC = () => {
  const [words, setWords] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [letterTimings, setLetterTimings] = useState<{ [key: string]: number[] }>({});
  const [letterMistakes, setLetterMistakes] = useState<{ [key: string]: number }>({});
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [lastKeyPressTime, setLastKeyPressTime] = useState<number | null>(null);
  const [completedInputs, setCompletedInputs] = useState<string[]>([]);

  // Generate words only once at mount and when game is reset
  useEffect(() => {
    setWords(generateWords(20)); // Doubled the number of words
  }, []);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    // Only handle printable characters and space
    if (e.key.length === 1 || e.key === ' ') {
      e.preventDefault();
      
      const currentWord = words[wordIndex];
      // Guard against undefined word
      if (!currentWord) return;

      const currentTime = performance.now();
      if (!startTime) {
        setStartTime(currentTime);
      }

      // Handle space - move to next word and count mistakes
      if (e.key === ' ') {
        // Count remaining untyped characters as mistakes
        const remainingChars = currentWord.slice(currentInput.length);
        remainingChars.split('').forEach(char => {
          setLetterMistakes(prev => ({
            ...prev,
            [char]: (prev[char] || 0) + 1
          }));
        });
        setTotalMistakes(prev => prev + remainingChars.length);

        // Complete the game if it's the last word
        if (wordIndex === words.length - 1) {
          setCompletedInputs(prev => [...prev, currentInput]);
          setIsGameComplete(true);
          return;
        }

        // Move to next word
        setCompletedInputs(prev => [...prev, currentInput]);
        setWordIndex(prev => prev + 1);
        setCurrentInput('');
        return;
      }

      // Don't allow typing more characters than the word length
      if (currentInput.length >= currentWord.length) {
        return;
      }

      // Record timing for the character
      if (lastKeyPressTime) {
        setLetterTimings(prev => {
          const timings = prev[e.key] || [];
          return {
            ...prev,
            [e.key]: [...timings, currentTime - lastKeyPressTime]
          };
        });
      }
      
      setLastKeyPressTime(currentTime);

      const newInput = currentInput + e.key;
      
      // Check for mistakes
      const expectedChar = currentWord[currentInput.length];
      if (expectedChar !== undefined && expectedChar !== e.key) {
        setLetterMistakes(prev => ({
          ...prev,
          [expectedChar]: (prev[expectedChar] || 0) + 1
        }));
        setTotalMistakes(prev => prev + 1);
      }
      setTotalKeystrokes(prev => prev + 1);

      // End game if on last word and typed enough characters
      if (wordIndex === words.length - 1 && newInput.length >= currentWord.length) {
        setCompletedInputs(prev => [...prev, newInput]);
        setIsGameComplete(true);
        return;
      }

      setCurrentInput(newInput);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      setCurrentInput(prev => prev.slice(0, -1));
    }
  }, [words, wordIndex, currentInput, startTime, lastKeyPressTime, isGameComplete]);

  // Set up keyboard listener
  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      if (!isGameComplete) {
        handleKeyPress(e);
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyPress);
    return () => window.removeEventListener('keydown', handleGlobalKeyPress);
  }, [isGameComplete, handleKeyPress]);

  const resetGame = useCallback(() => {
    setWords(generateWords(20));
    setCurrentInput('');
    setWordIndex(0);
    setStartTime(null);
    setLetterTimings({});
    setLetterMistakes({});
    setTotalKeystrokes(0);
    setTotalMistakes(0);
    setIsGameComplete(false);
    setLastKeyPressTime(null);
    setCompletedInputs([]);
  }, []);

  const calculateLetterStats = (): LetterTiming[] => {
    // Track which letters were actually interacted with
    const interactedLetters = new Set<string>();
    
    // Add letters that were typed correctly or incorrectly
    words.forEach((word, wordIdx) => {
      const input = wordIdx < wordIndex ? completedInputs[wordIdx] : 
                    wordIdx === wordIndex ? currentInput : '';
      
      word.split('').forEach((char, charIdx) => {
        if (input && charIdx < input.length) {
          // If the letter was typed (correctly or incorrectly), add it
          interactedLetters.add(char);
          if (input[charIdx] !== char) {
            // If typed incorrectly, also add the letter that was actually typed
            interactedLetters.add(input[charIdx]);
          }
        }
      });
    });

    // Map each interacted letter to its stats
    return Array.from(interactedLetters).map(letter => {
      const timings = letterTimings[letter] || [];
      // Filter out 0ms timings (skipped characters) for average calculation
      const validTimings = timings.filter(t => t > 0);
      return {
        letter,
        averageTime: validTimings.length > 0 ? 
          validTimings.reduce((a, b) => a + b, 0) / validTimings.length : 
          0,
        occurrences: validTimings.length,
        mistakes: letterMistakes[letter] || 0
      };
    }).sort((a, b) => b.averageTime - a.averageTime);
  };

  const calculateStats = () => {
    if (!startTime || !isGameComplete) return null;

    const timeInMinutes = (performance.now() - startTime) / 60000; // Convert to minutes
    const totalWords = words.length;
    const wpm = Math.round(totalWords / timeInMinutes);
    
    // Calculate total characters in all words
    const totalExpectedChars = words.join('').length;
    const accuracy = Math.max(0, Math.round(((totalExpectedChars - totalMistakes) / totalExpectedChars) * 100));

    return { wpm, accuracy };
  };

  const renderWord = (word: string, index: number) => {
    if (index < wordIndex) {
      // For completed words, use the stored input
      const typedInput = completedInputs[index];
      return (
        <span>
          {word.split('').map((char, charIndex) => {
            const wasCorrect = typedInput?.[charIndex] === char;
            return (
              <span key={charIndex} className={wasCorrect ? 'correct-char' : 'incorrect-char'}>
                {char}
              </span>
            );
          })}
          {' '}
        </span>
      );
    }
    
    if (index === wordIndex) {
      // Calculate cursor position based on the width of typed characters
      const cursorOffset = 0.55 * currentInput.length;

      const cursorStyle = {
        '--cursor-offset': `${cursorOffset}em`
      } as React.CSSProperties;

      return (
        <span className="current-word">
          <span className="cursor" style={cursorStyle}></span>
          {word.split('').map((char, charIndex) => {
            let className = '';
            if (charIndex < currentInput.length) {
              // For characters that have been typed
              className = currentInput[charIndex] === char ? 'correct-char' : 'incorrect-char';
            } else {
              // For untyped characters
              className = 'untyped-char';
            }
            return (
              <span key={charIndex} className={className}>
                {char}
              </span>
            );
          })}
          {currentInput.length > word.length && (
            <span className="incorrect-char">
              {currentInput.slice(word.length)}
            </span>
          )}
          {' '}
        </span>
      );
    }
    
    return <span>{word} </span>;
  };
  

  const stats = calculateStats();

  return (
    <div className="typing-game">
      {!isGameComplete ? (
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
      ) : (
        <div className="results-container">
          <h2>Results</h2>
          <div className="overall-stats">
            <div className="stat-box">
              <h3>Speed</h3>
              <div className="stat-value">{stats?.wpm} WPM</div>
            </div>
            <div className="stat-box">
              <h3>Accuracy</h3>
              <div className="stat-value">{stats?.accuracy}%</div>
            </div>
          </div>
          <div className="letter-stats">
            <h3>Letter Timing Analysis</h3>
            <div className="stats-grid">
              {calculateLetterStats().map(({ letter, averageTime, occurrences, mistakes }) => (
                <div key={letter} className="stat-item">
                  <span className="letter">
                    {letter === ' ' ? '␣' : letter}
                  </span>
                  <span className="time">{averageTime.toFixed(0)}ms</span>
                  <span className="occurrences">
                    Used: {occurrences} times
                    {mistakes > 0 && <span className="mistakes">{mistakes} mistakes</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={resetGame} className="reset-button">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default TypingGame; 