import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './TypingGame.css';
import { dictionary } from './dictionary';
import { TimingHistory, PerformancePoint } from './types';
import { generateWeightedWords, getTargetedPatterns } from './utils';
import GameScreen from './GameScreen';
import ResultsScreen from './ResultsScreen';

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

interface GamePerformance {
  wpm: number;
  accuracy: number;
}

const WORDS_COUNT = 20;

const TypingGame: React.FC = () => {
  const [words, setWords] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [letterTimings, setLetterTimings] = useState<{ [key: string]: number[] }>({});
  const [bigramTimings, setBigramTimings] = useState<{ [key: string]: number[] }>({});
  const [letterMistakes, setLetterMistakes] = useState<{ [key: string]: number }>({});
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [lastKeyPressTime, setLastKeyPressTime] = useState<number | null>(null);
  const [completedInputs, setCompletedInputs] = useState<string[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformancePoint[]>([]);
  const [selectedTab, setSelectedTab] = useState<'letters' | 'bigrams'>('letters');
  const [showingOverall, setShowingOverall] = useState(false);
  const [timingHistory, setTimingHistory] = useState<TimingHistory>({ 
    letters: {}, 
    bigrams: {}, 
    historicalLetters: {},
    historicalBigrams: {},
    historicalPerformance: []
  });

  // Calculate letter statistics
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

  // Calculate bigram statistics
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

  // Update timing history when game completes
  useEffect(() => {
    if (isGameComplete) {
      const letterStats = calculateLetterStats();
      const bigramStats = calculateBigramStats();
      
      const newLetterTimings: { [key: string]: number } = {};
      const newHistoricalLetters = { ...timingHistory.historicalLetters };
      
      letterStats.forEach(({ letter, averageTime }) => {
        newLetterTimings[letter] = averageTime;
        
        const currentTimings: number[] = [];
        words.forEach((word, wordIdx) => {
          const input = completedInputs[wordIdx] || '';
          word.split('').forEach((char, charIdx) => {
            if (char === letter && input[charIdx] === char && letterTimings[char]?.[currentTimings.length]) {
              currentTimings.push(letterTimings[char][currentTimings.length]);
            }
          });
        });
        
        if (!newHistoricalLetters[letter]) {
          newHistoricalLetters[letter] = [];
        }
        newHistoricalLetters[letter] = [...newHistoricalLetters[letter], ...currentTimings];
      });
      
      const newBigramTimings: { [key: string]: number } = {};
      const newHistoricalBigrams = { ...timingHistory.historicalBigrams };
      
      bigramStats.forEach(({ bigram, averageTime }) => {
        newBigramTimings[bigram] = averageTime;
        
        const currentTimings: number[] = [];
        words.forEach((word, wordIdx) => {
          const input = completedInputs[wordIdx] || '';
          for (let i = 0; i < word.length - 1; i++) {
            if (word.slice(i, i + 2) === bigram && 
                input[i] === word[i] && 
                input[i + 1] === word[i + 1]) {
              const timings = bigramTimings[bigram] || [];
              if (timings.length > 0) {
                currentTimings.push(...timings);
              }
            }
          }
        });
        
        if (!newHistoricalBigrams[bigram]) {
          newHistoricalBigrams[bigram] = [];
        }
        newHistoricalBigrams[bigram] = [...newHistoricalBigrams[bigram], ...currentTimings];
      });
      
      setTimingHistory({
        letters: newLetterTimings,
        bigrams: newBigramTimings,
        historicalLetters: newHistoricalLetters,
        historicalBigrams: newHistoricalBigrams,
        historicalPerformance: [...timingHistory.historicalPerformance, { wpm: performanceData[performanceData.length - 1].wpm, accuracy: performanceData[performanceData.length - 1].accuracy }]
      });
    }
  }, [isGameComplete]);

  // Initial word generation
  useEffect(() => {
    setWords(generateWeightedWords(WORDS_COUNT, timingHistory));
  }, []); // Only run once at mount

  const resetGame = useCallback(() => {
    setWords(generateWeightedWords(WORDS_COUNT, timingHistory));
    setCurrentInput('');
    setWordIndex(0);
    setStartTime(null);
    setLetterTimings({});
    setBigramTimings({});
    setLetterMistakes({});
    setTotalKeystrokes(0);
    setTotalMistakes(0);
    setIsGameComplete(false);
    setLastKeyPressTime(null);
    setCompletedInputs([]);
    setPerformanceData([]);
  }, [timingHistory]);

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
    if (e.key.length === 1 || e.key === ' ') {
      e.preventDefault();
      
      const currentWord = words[wordIndex];
      if (!currentWord) return;

      const currentTime = performance.now();
      let newStartTime = startTime;
      let newLetterTimings = {...letterTimings};
      let newBigramTimings = {...bigramTimings};
      let newLetterMistakes = {...letterMistakes};
      let newTotalMistakes = totalMistakes;
      let newTotalKeystrokes = totalKeystrokes;
      let newLastKeyPressTime = currentTime;
      let newCompletedInputs = [...completedInputs];
      let newWordIndex = wordIndex;
      let newCurrentInput = currentInput;
      let newIsGameComplete = isGameComplete;
      let newTimingHistory = {...timingHistory};

      if (!startTime) {
        newStartTime = currentTime;
      }

      if (e.key === ' ') {
        if (currentInput.length > 0) {
          const wordLength = currentWord.length;
          const wordTime = currentTime - (lastKeyPressTime || currentTime);
        }
        
        const remainingChars = currentWord.slice(currentInput.length);
        remainingChars.split('').forEach(char => {
          newLetterMistakes[char] = (newLetterMistakes[char] || 0) + 1;
        });
        newTotalMistakes += remainingChars.length;
        
        if (wordIndex === words.length - 1) {
          newCompletedInputs.push(currentInput);
          newIsGameComplete = true;
          updatePerformanceData(currentInput, currentTime);
        } else {
          newCompletedInputs.push(currentInput);
          newWordIndex = wordIndex + 1;
          newCurrentInput = '';
          updatePerformanceData(currentInput, currentTime);
        }
      } else {
        if (currentInput.length >= currentWord.length) {
          return;
        }

        // Record timing for the character
        if (lastKeyPressTime) {
          const charTimeDiff = currentTime - lastKeyPressTime;
          const timings = newLetterTimings[e.key] || [];
          newLetterTimings[e.key] = [...timings, charTimeDiff];

          // Record bigram timing if we have a previous character
          if (currentInput.length > 0) {
            const prevChar = currentInput[currentInput.length - 1];
            const bigram = prevChar + e.key;
            const bigramTimings = newBigramTimings[bigram] || [];
            newBigramTimings[bigram] = [...bigramTimings, charTimeDiff];
          }
        }

        newCurrentInput = currentInput + e.key;
        newTotalKeystrokes += 1;
        
        const expectedChar = currentWord[currentInput.length];
        if (expectedChar !== undefined && expectedChar !== e.key) {
          newLetterMistakes[expectedChar] = (newLetterMistakes[expectedChar] || 0) + 1;
          newTotalMistakes += 1;
        }

        if (wordIndex === words.length - 1 && newCurrentInput.length >= currentWord.length) {
          newCompletedInputs.push(newCurrentInput);
          newIsGameComplete = true;
          updatePerformanceData(newCurrentInput, currentTime);
        } else {
          updatePerformanceData(newCurrentInput, currentTime);
        }
      }

      setStartTime(newStartTime);
      setLetterTimings(newLetterTimings);
      setBigramTimings(newBigramTimings);
      setLetterMistakes(newLetterMistakes);
      setTotalMistakes(newTotalMistakes);
      setTotalKeystrokes(newTotalKeystrokes);
      setLastKeyPressTime(newLastKeyPressTime);
      setCompletedInputs(newCompletedInputs);
      setWordIndex(newWordIndex);
      setCurrentInput(newCurrentInput);
      setIsGameComplete(newIsGameComplete);
      setTimingHistory(newTimingHistory);

    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const newInput = currentInput.slice(0, -1);
      updatePerformanceData(newInput, performance.now());
      setCurrentInput(newInput);
    }
  }, [words, wordIndex, currentInput, startTime, lastKeyPressTime, isGameComplete, updatePerformanceData, completedInputs, letterTimings, bigramTimings, letterMistakes, totalMistakes, totalKeystrokes]);

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
    const { letters, bigrams } = getTargetedPatterns(timingHistory);
    
    // Pre-calculate which characters are part of bigrams
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
        // Completed word
        const typedInput = completedInputs[index];
        className = typedInput?.[charIndex] === char ? 'correct-char' : 'incorrect-char';
      } else if (index === wordIndex) {
        // Current word
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
      // For completed words
      return (
        <span>
          {word.split('').map((char, charIndex) => renderChar(char, charIndex))}
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
    
    // For untyped words
    return (
      <span>
        {word.split('').map((char, charIndex) => renderChar(char, charIndex))}
        {' '}
      </span>
    );
  };
  
  const stats = calculateStats();

  // Add new functions for overall analysis
  const calculateOverallLetterStats = (): LetterTiming[] => {
    const letterStats = calculateLetterStats(); // Get current game stats
    const stats: LetterTiming[] = [];
    
    // If game is not complete, only show current game stats
    if (!isGameComplete) {
      return letterStats;
    }
    
    // Process each letter that has historical data
    Object.entries(timingHistory.historicalLetters).forEach(([letter, times]) => {
      // Find current game stats for this letter
      const currentStats = letterStats.find(stat => stat.letter === letter);
      
      if (times.length > 0) {
        stats.push({
          letter,
          averageTime: times.reduce((a, b) => a + b, 0) / times.length,
          occurrences: times.length
        });
      } else if (currentStats) {
        // If no historical data but letter was typed in current game
        stats.push(currentStats);
      }
    });
    
    // Add any new letters from current game that aren't in historical data
    letterStats.forEach(stat => {
      if (!stats.some(s => s.letter === stat.letter)) {
        stats.push(stat);
      }
    });
    
    return stats.sort((a, b) => b.averageTime - a.averageTime);
  };

  const calculateOverallBigramStats = (): BigramTiming[] => {
    const bigramStats = calculateBigramStats(); // Get current game stats
    const stats: BigramTiming[] = [];
    
    // If game is not complete, only show current game stats
    if (!isGameComplete) {
      return bigramStats;
    }
    
    // Process each bigram that has historical data
    Object.entries(timingHistory.historicalBigrams).forEach(([bigram, times]) => {
      // Find current game stats for this bigram
      const currentStats = bigramStats.find(stat => stat.bigram === bigram);
      
      if (times.length > 0) {
        stats.push({
          bigram,
          averageTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
          occurrences: times.length
        });
      } else if (currentStats) {
        // If no historical data but bigram was typed in current game
        stats.push(currentStats);
      }
    });
    
    // Add any new bigrams from current game that aren't in historical data
    bigramStats.forEach(stat => {
      if (!stats.some(s => s.bigram === stat.bigram)) {
        stats.push(stat);
      }
    });
    
    return stats.sort((a, b) => b.averageTime - a.averageTime);
  };

  return (
    <div className="typing-game">
      {!isGameComplete ? (
        <GameScreen
          words={words}
          wordIndex={wordIndex}
          currentInput={currentInput}
          completedInputs={completedInputs}
          timingHistory={timingHistory}
        />
      ) : (
        <ResultsScreen
          performanceData={performanceData}
          timingHistory={timingHistory}
          showingOverall={showingOverall}
          selectedTab={selectedTab}
          words={words}
          wordIndex={wordIndex}
          completedInputs={completedInputs}
          currentInput={currentInput}
          letterTimings={letterTimings}
          bigramTimings={bigramTimings}
          onTabChange={setSelectedTab}
          onToggleOverall={() => setShowingOverall(!showingOverall)}
          onReset={resetGame}
          onDeleteData={() => {
            const emptyHistory = { 
              letters: {}, 
              bigrams: {}, 
              historicalLetters: {},
              historicalBigrams: {},
              historicalPerformance: []
            };
            setTimingHistory(emptyHistory);
            setWords(generateWeightedWords(WORDS_COUNT, emptyHistory));
            setCurrentInput('');
            setWordIndex(0);
            setStartTime(null);
            setLetterTimings({});
            setBigramTimings({});
            setLetterMistakes({});
            setTotalKeystrokes(0);
            setTotalMistakes(0);
            setIsGameComplete(false);
            setLastKeyPressTime(null);
            setCompletedInputs([]);
            setPerformanceData([]);
          }}
        />
      )}
    </div>
  );
};

export default TypingGame; 