import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './TypingGame.css';
import { dictionary } from './dictionary';

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

interface WordLengthTiming {
  length: number;
  averageTime: number;
  occurrences: number;
}

interface BigramTiming {
  bigram: string;
  averageTime: number;
  occurrences: number;
}

const WORDS_COUNT = 20;

const generateWords = (count: number): string[] => {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * dictionary.length);
    result.push(dictionary[randomIndex]);
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
  const [selectedTab, setSelectedTab] = useState<'letters' | 'bigrams'>('letters');

  // Generate words only once at mount and when game is reset
  useEffect(() => {
    setWords(generateWords(WORDS_COUNT)); // Doubled the number of words
  }, []);

  useEffect(() => {
    performanceData.forEach(point => {
      console.log(point.wpm);
    });
    console.log("--------------------------------");
  }, [performanceData]);

  const updatePerformanceData = useCallback((overrideInput: string, currentTime: number) => {
    if (!startTime) return;
  
    const timeInMinutes = (currentTime - startTime) / 60000;
  
    // Calculate cumulative stats up to the current word
    let totalCorrectChars = 0;
    let totalPossibleChars = 0;  // Total characters that should have been typed
  
    // Count all words up to and including the current word
    for (let idx = 0; idx <= wordIndex; idx++) {
      const word = words[idx];
      const input = idx < wordIndex ? completedInputs[idx] : overrideInput;
      
      // Add all characters in this word to total possible
      totalPossibleChars += word.length;
      
      // Count correct characters
      for (let charIdx = 0; charIdx < word.length; charIdx++) {
        if (input && input[charIdx] === word[charIdx]) {
          totalCorrectChars++;
        }
      }

      // Add space after each word (except the last one) as a correct character if word was completed
      if (idx < wordIndex) {
        totalCorrectChars++; // Count the space after completed words
        totalPossibleChars++; // Add space to possible chars
      }
    }
  
    // Calculate cumulative accuracy
    const currentAccuracy = totalPossibleChars > 0 
      ? Math.round((totalCorrectChars / totalPossibleChars) * 100)
      : 100;
  
    // Calculate WPM based on correctly typed characters (1 word = 5 characters)
    const standardizedWords = totalCorrectChars / 5;
    const currentWPM = timeInMinutes > 0 
      ? Math.round((standardizedWords / timeInMinutes) * 100) / 100
      : 0;
  
    setPerformanceData(prev => {
      const newPoint = {
        wordIndex,
        wpm: currentWPM,
        accuracy: currentAccuracy
      };
  
      // Update or add the data point for the current wordIndex
      if (prev.length > 0 && prev[prev.length - 1].wordIndex === wordIndex) {
        return [...prev.slice(0, -1), newPoint];
      }
      return [...prev, newPoint];
    });
  }, [startTime, wordIndex, words, completedInputs]);
  
  
  
  
  

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    // Only handle printable characters and space
    if (e.key.length === 1 || e.key === ' ') {
      e.preventDefault();
      
      const currentWord = words[wordIndex];
      // Guard against undefined word
      if (!currentWord) return;

      const currentTime = performance.now();
      let newStartTime = startTime;
      let newLetterTimings = {...letterTimings};
      let newLetterMistakes = {...letterMistakes};
      let newTotalMistakes = totalMistakes;
      let newTotalKeystrokes = totalKeystrokes;
      let newLastKeyPressTime = currentTime;
      let newCompletedInputs = [...completedInputs];
      let newWordIndex = wordIndex;
      let newCurrentInput = currentInput;
      let newIsGameComplete = isGameComplete;

      if (!startTime) {
        newStartTime = currentTime;
      }

      // Handle space - move to next word and count mistakes
      if (e.key === ' ') {
        // Count remaining untyped characters as mistakes
        const remainingChars = currentWord.slice(currentInput.length);
        remainingChars.split('').forEach(char => {
          newLetterMistakes[char] = (newLetterMistakes[char] || 0) + 1;
        });
        newTotalMistakes += remainingChars.length;
        
        // Complete the game if it's the last word
        if (wordIndex === words.length - 1) {
          newCompletedInputs.push(currentInput);
          newIsGameComplete = true;
          // Update performance data with current values
          updatePerformanceData(currentInput, currentTime);
        } else {
          // Move to next word
          newCompletedInputs.push(currentInput);
          newWordIndex = wordIndex + 1;
          newCurrentInput = '';
          // Update performance data with current values
          updatePerformanceData(currentInput, currentTime);
        }
      } else {
        // Don't allow typing more characters than the word length
        if (currentInput.length >= currentWord.length) {
          return;
        }

        // Record timing for the character
        if (lastKeyPressTime) {
          const timings = newLetterTimings[e.key] || [];
          newLetterTimings[e.key] = [...timings, currentTime - lastKeyPressTime];
        }

        newCurrentInput = currentInput + e.key;
        newTotalKeystrokes += 1;
        
        // Check for mistakes
        const expectedChar = currentWord[currentInput.length];
        if (expectedChar !== undefined && expectedChar !== e.key) {
          newLetterMistakes[expectedChar] = (newLetterMistakes[expectedChar] || 0) + 1;
          newTotalMistakes += 1;
        }

        // End game if on last word and typed enough characters
        if (wordIndex === words.length - 1 && newCurrentInput.length >= currentWord.length) {
          newCompletedInputs.push(newCurrentInput);
          newIsGameComplete = true;
          // Update performance data with new values
          updatePerformanceData(newCurrentInput, currentTime);
        } else {
          // Update performance data with new input
          updatePerformanceData(newCurrentInput, currentTime);
        }
      }

      // Batch all state updates
      setStartTime(newStartTime);
      setLetterTimings(newLetterTimings);
      setLetterMistakes(newLetterMistakes);
      setTotalMistakes(newTotalMistakes);
      setTotalKeystrokes(newTotalKeystrokes);
      setLastKeyPressTime(newLastKeyPressTime);
      setCompletedInputs(newCompletedInputs);
      setWordIndex(newWordIndex);
      setCurrentInput(newCurrentInput);
      setIsGameComplete(newIsGameComplete);

      // console.log(newCurrentInput);
      // performanceData.forEach(point => {
      //   console.log(point.wpm);
      // });
      // console.log("--------------------------------");

    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const newInput = currentInput.slice(0, -1);
      updatePerformanceData(newInput, performance.now());
      setCurrentInput(newInput);
    }
  }, [words, wordIndex, currentInput, startTime, lastKeyPressTime, isGameComplete, updatePerformanceData, completedInputs, letterTimings, letterMistakes, totalMistakes, totalKeystrokes]);


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

  const calculateBigramStats = (): BigramTiming[] => {
    const bigramStats = new Map<string, number[]>();
    
    // Process all words
    words.forEach((word, wordIdx) => {
      const input = wordIdx < wordIndex ? completedInputs[wordIdx] : 
                    wordIdx === wordIndex ? currentInput : '';
      
      // Skip if no input or only one character
      if (!input || input.length < 2) return;
      
      // Process each pair of consecutive letters
      for (let charIdx = 0; charIdx < word.length - 1; charIdx++) {
        // Only process if both characters were typed correctly
        if (input[charIdx] === word[charIdx] && 
            input[charIdx + 1] === word[charIdx + 1]) {
          const bigram = word.slice(charIdx, charIdx + 2);
          const timings = bigramStats.get(bigram) || [];
          
          // Get timing for the second character of the bigram
          const timing = letterTimings[word[charIdx + 1]]?.[timings.length];
          if (timing) {
            timings.push(timing);
            bigramStats.set(bigram, timings);
          }
        }
      }
    });

    return Array.from(bigramStats.entries())
      .map(([bigram, timings]) => ({
        bigram,
        averageTime: Math.round(timings.reduce((a, b) => a + b, 0) / timings.length),
        occurrences: timings.length
      }))
      .sort((a, b) => b.averageTime - a.averageTime);
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

      // Add space after each word (except the last one) as a correct character if word was completed
      if (idx < words.length - 1 && input.length >= word.length) {
        totalCorrectChars++; // Count the space after completed words
        totalExpectedChars++; // Add space to possible chars
      }

      // Count any extra characters typed beyond word length as mistakes
      if (input.length > word.length) {
        totalExpectedChars += input.length - word.length;
      }
    });

    const accuracy = totalExpectedChars > 0 
      ? Math.round((totalCorrectChars / totalExpectedChars) * 100)
      : 100;

    // Calculate WPM using standardized word length (5 characters)
    const standardizedWords = totalCorrectChars / 5;
    const wpm = Math.round((standardizedWords / timeInMinutes) * 100) / 100;

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
                {startTime!=null ? (performance.now() - startTime)/60000: 0}
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
              <div className="stat-value">{performanceData[performanceData.length - 1].wpm} WPM</div>
            </div>
            <div className="stat-box">
              <h3>Accuracy</h3>
              <div className="stat-value">{performanceData[performanceData.length - 1].accuracy}%</div>
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
                  tickFormatter={(value) => `${value + 1}`}
                />
                <YAxis 
                  yAxisId="left"
                  domain={[0, Math.ceil(Math.max(...performanceData.map(d => d.wpm)) / 10) * 10]} // Calculate max as nearest multiple of 10
                  ticks={Array.from({ length: Math.floor(Math.ceil(Math.max(...performanceData.map(d => d.wpm)) / 10) * 10 / 10) + 1 }, (_, i) => i * 10)} // Ensure ticks at multiples of 10
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
          <div className="stats-tabs">
            <button 
              className={`tab-button ${selectedTab === 'letters' ? 'active' : ''}`}
              onClick={() => setSelectedTab('letters')}
            >
              Letter Analysis
            </button>
            <button 
              className={`tab-button ${selectedTab === 'bigrams' ? 'active' : ''}`}
              onClick={() => setSelectedTab('bigrams')}
            >
              Letter Combinations
            </button>
          </div>
          {selectedTab === 'letters' ? (
            <>
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
            </>
          ) : (
            <div className="letter-stats">
              <h3>Letter Combinations Analysis</h3>
              <div className="stats-grid">
                {calculateBigramStats().map(({ bigram, averageTime, occurrences }) => (
                  <div key={bigram} className="stat-item">
                    <span className="letter">
                      {bigram}
                    </span>
                    <span className="time">{averageTime}ms</span>
                    <span className="occurrences">
                      {occurrences} time{occurrences !== 1 ? 's' : ''}
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