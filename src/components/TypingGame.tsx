import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './TypingGame.css';

interface LetterTiming {
  letter: string;
  averageTime: number;
  occurrences: number;
}

interface LetterMistake {
  expected: string;
  typed: string;
  count: number;
}

interface PerformancePoint {
  wordIndex: number;
  wpm: number;
  accuracy: number;
}

const WORDS_COUNT = 20;

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
  const [performanceData, setPerformanceData] = useState<PerformancePoint[]>([]);

  // Generate words only once at mount and when game is reset
  useEffect(() => {
    setWords(generateWords(WORDS_COUNT)); // Doubled the number of words
  }, []);

  const updatePerformanceData = useCallback((overrideInput?: string) => {
    if (!startTime) return;
  
    // Use overrideInput if provided, otherwise use currentInput
    const effectiveInput = overrideInput !== undefined ? overrideInput : currentInput;
    const timeInMinutes = (performance.now() - startTime) / 60000;
    
    // Calculate cumulative stats up to current point
    let totalCorrectChars = 0;
    let totalExpectedChars = 0;

  
    // Count all words up to and including current word
    for (let idx = 0; idx <= wordIndex; idx++) {
      const word = words[idx];
      // For finished words use completedInputs; for current word, use effectiveInput
      const input = idx < wordIndex ? completedInputs[idx] : effectiveInput;
      
      for (let charIdx = 0; charIdx < word.length; charIdx++) {
        // Only count if we have typed this character for the current word
        if (idx < wordIndex || charIdx < effectiveInput.length) {
          totalExpectedChars++;
          if (input[charIdx] === word[charIdx]) {
            totalCorrectChars++;
          }
        }
      }
  
      // Count extra characters typed beyond word length as mistakes
      if (input && input.length > word.length) {
        totalExpectedChars += input.length - word.length;
      }
    }
  
    const currentAccuracy = totalExpectedChars > 0 
      ? Math.round((totalCorrectChars / totalExpectedChars) * 100)
      : 100;
  
    const completedWords = wordIndex;
    const currentWordProgress = effectiveInput.length / (words[wordIndex]?.length || 1);
    const totalWordsTyped = completedWords + currentWordProgress;
    const currentWPM = Math.round(totalWordsTyped / timeInMinutes);
    
    // Debug logs to show current state of calculations
    // console.log("updatePerformanceData:");
    // console.log("wordIndex:", wordIndex);
    // console.log("effectiveInput:", effectiveInput);
    // console.log("totalCorrectChars:", totalCorrectChars);
    // console.log("totalExpectedChars:", totalExpectedChars);
    // console.log("accuracy:", currentAccuracy);
    // console.log("WPM:", currentWPM);
    // console.log("--------------------------------");
  
    setPerformanceData(prev => {
      const newPoint = {
        wordIndex,
        wpm: currentWPM,
        accuracy: currentAccuracy
      };
  
      // Debug log for new point
      console.log("New performance point:", newPoint);
  
      // Update or add the data point for the current wordIndex
      if (prev.length > 0 && prev[prev.length - 1].wordIndex === wordIndex) {
        return [...prev.slice(0, -1), newPoint];
      }
      return [...prev, newPoint];
    });
  }, [startTime, wordIndex, currentInput, words, completedInputs]);
  
  
  

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
          const newCompletedInputs = [...completedInputs, currentInput];
          setCompletedInputs(newCompletedInputs);
          setIsGameComplete(true);
          setCurrentInput(currentInput);
          // Use the actual values we're setting, not the state which hasn't updated yet
          updatePerformanceData(currentInput);
          return;
        }
        
        // Move to next word
        const newCompletedInputs = [...completedInputs, currentInput];
        const newWordIndex = wordIndex + 1;
        
        // Update performance data with current values before state updates
        updatePerformanceData(currentInput);
        
        // Then update state
        setCompletedInputs(newCompletedInputs);
        setCurrentInput('');
        setWordIndex(newWordIndex);
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
        const newCompletedInputs = [...completedInputs, newInput];
        setCompletedInputs(newCompletedInputs);
        setIsGameComplete(true);
        setCurrentInput(newInput);
        // Use actual values we're setting
        updatePerformanceData(newInput);
        return;
      }

      // Update performance data with new input before state update
      updatePerformanceData(newInput);
      setCurrentInput(newInput);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const newInput = currentInput.slice(0, -1);
      updatePerformanceData(newInput);
      setCurrentInput(newInput);
    }
  }, [words, wordIndex, currentInput, startTime, lastKeyPressTime, isGameComplete, updatePerformanceData, completedInputs]);


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
    setWords(generateWords(WORDS_COUNT));
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
    setPerformanceData([]);
  }, []);

  const calculateLetterStats = (): LetterTiming[] => {
    // Only track correctly typed letters
    const letterStats = new Map<string, number[]>();
    
    // Add letters that were typed correctly
    words.forEach((word, wordIdx) => {
      const input = wordIdx < wordIndex ? completedInputs[wordIdx] : 
                    wordIdx === wordIndex ? currentInput : '';
      
      word.split('').forEach((char, charIdx) => {
        if (input && charIdx < input.length && input[charIdx] === char) {
          // Only add timing for correct letters
          const timings = letterStats.get(char) || [];
          if (letterTimings[char]?.[timings.length]) {
            timings.push(letterTimings[char][timings.length]);
          }
          letterStats.set(char, timings);
        }
      });
    });

    return Array.from(letterStats.entries()).map(([letter, timings]) => ({
      letter,
      averageTime: timings.length > 0 ? 
        timings.reduce((a, b) => a + b, 0) / timings.length : 
        0,
      occurrences: timings.length
    })).sort((a, b) => b.averageTime - a.averageTime);
  };

  const calculateMistakeStats = (): LetterMistake[] => {
    const mistakeMap = new Map<string, Map<string, number>>();
    
    // Process all words, including those that weren't reached yet
    words.forEach((word, wordIdx) => {
      const input = wordIdx < wordIndex ? completedInputs[wordIdx] : 
                    wordIdx === wordIndex ? currentInput : '';
      
      // If this word was never reached (no input attempt), mark all letters as skipped
      if (wordIdx > wordIndex || !input) {
        word.split('').forEach(expectedChar => {
          if (!mistakeMap.has(expectedChar)) {
            mistakeMap.set(expectedChar, new Map());
          }
          const charMistakes = mistakeMap.get(expectedChar)!;
          charMistakes.set('skip', (charMistakes.get('skip') || 0) + 1);
        });
        return;
      }
      
      word.split('').forEach((expectedChar, charIdx) => {
        // Case 1: Character was typed incorrectly
        if (charIdx < input.length && input[charIdx] !== expectedChar) {
          const typedChar = input[charIdx];
          if (!mistakeMap.has(expectedChar)) {
            mistakeMap.set(expectedChar, new Map());
          }
          const charMistakes = mistakeMap.get(expectedChar)!;
          charMistakes.set(typedChar, (charMistakes.get(typedChar) || 0) + 1);
        }
        // Case 2: Character was skipped (word was not fully typed)
        else if (charIdx >= input.length) {
          if (!mistakeMap.has(expectedChar)) {
            mistakeMap.set(expectedChar, new Map());
          }
          const charMistakes = mistakeMap.get(expectedChar)!;
          charMistakes.set('skip', (charMistakes.get('skip') || 0) + 1);
        }
      });
    });

    const mistakes: LetterMistake[] = [];
    mistakeMap.forEach((typedChars, expectedChar) => {
      typedChars.forEach((count, typedChar) => {
        mistakes.push({
          expected: expectedChar,
          typed: typedChar,
          count
        });
      });
    });

    return mistakes.sort((a, b) => b.count - a.count);
  };

  const calculateStats = () => {
    if (!startTime || !isGameComplete) return null;

    const timeInMinutes = (performance.now() - startTime) / 60000;
    
    let totalCorrectChars = 0;
    let totalExpectedChars = 0;

    // Count all words
    words.forEach((word, idx) => {
      const input = completedInputs[idx] || '';
      
      // Count each character in the word
      for (let charIdx = 0; charIdx < word.length; charIdx++) {
        totalExpectedChars++;
        if (input[charIdx] === word[charIdx]) {
          totalCorrectChars++;
        }
      }

      // Count any extra characters typed beyond word length as mistakes
      if (input.length > word.length) {
        totalExpectedChars += input.length - word.length;
      }
    });

    const accuracy = totalExpectedChars > 0 
      ? Math.round((totalCorrectChars / totalExpectedChars) * 100)
      : 100;

    const wpm = Math.round(words.length / timeInMinutes);

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
          <div className="performance-graph">
            <h3>Performance Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid vertical={true} horizontal={false} />
                <XAxis 
                  dataKey="wordIndex" 
                  label={{ value: 'Words Typed', position: 'bottom' }}
                  interval={1}
                />
                <YAxis 
                  yAxisId="left"
                  domain={[0, 200]}
                  label={{ value: 'WPM', angle: -90, position: 'left' }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  domain={[0, 100]}
                  label={{ value: 'Accuracy %', angle: 90, position: 'right' }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value}${name === 'Accuracy' ? '%' : ' WPM'}`,
                    name
                  ]}
                  labelFormatter={(wordIndex: number) => `Word ${wordIndex + 1}`}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="wpm"
                  stroke="#2196f3"
                  strokeWidth={2}
                  name="WPM"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#4caf50"
                  strokeWidth={2}
                  name="Accuracy"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {calculateLetterStats().length > 0 && (
            <div className="letter-stats">
              <h3>Letter Timing Analysis</h3>
              <div className="stats-grid">
                {calculateLetterStats().map(({ letter, averageTime, occurrences }) => (
                  <div key={letter} className="stat-item">
                    <span className="letter">
                      {letter === ' ' ? '␣' : letter}
                    </span>
                    <span className="time">{averageTime.toFixed(0)}ms</span>
                    <span className="occurrences">
                      {occurrences} times
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {calculateMistakeStats().length > 0 && (
            <div className="letter-stats">
              <h3>Common Mistakes</h3>
              <div className="stats-grid">
                {calculateMistakeStats().map(({ expected, typed, count }) => (
                  <div key={`${expected}-${typed}`} className="stat-item mistake-item">
                    <div className="mistake-letters">
                      <span className="letter expected">{expected}</span>
                      <span className="arrow">→</span>
                      <span className="letter typed">{typed === 'skip' ? '(skip)' : typed}</span>
                    </div>
                    <span className="occurrences">
                      {count} time{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={resetGame} className="reset-button">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default TypingGame; 