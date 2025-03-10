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

interface TimingHistory {
  letters: { [key: string]: number };  // letter -> average time
  bigrams: { [key: string]: number };  // bigram -> average time
  wordLengths: { [key: number]: number[] };  // length -> times
}

const WORDS_COUNT = 20;

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
  const [selectedTab, setSelectedTab] = useState<'letters' | 'bigrams' | 'wordLengths'>('letters');
  const [timingHistory, setTimingHistory] = useState<TimingHistory>({ letters: {}, bigrams: {}, wordLengths: {} });

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

  // Update timing history based on latest statistics
  const updateTimingHistory = useCallback(() => {
    const letterStats = calculateLetterStats();
    const bigramStats = calculateBigramStats();
    
    const newLetterTimings: { [key: string]: number } = {};
    letterStats.forEach(({ letter, averageTime }) => {
      newLetterTimings[letter] = averageTime;
    });
    
    const newBigramTimings: { [key: string]: number } = {};
    bigramStats.forEach(({ bigram, averageTime }) => {
      newBigramTimings[bigram] = averageTime;
    });
    
    setTimingHistory({
      letters: { ...timingHistory.letters, ...newLetterTimings },
      bigrams: { ...timingHistory.bigrams, ...newBigramTimings },
      wordLengths: { ...timingHistory.wordLengths }
    });
  }, [timingHistory]);

  // Generate words weighted by difficulty
  const generateWeightedWords = (count: number, timingHistory: TimingHistory): string[] => {
    const { letters, bigrams } = getTargetedPatterns();
    
    // First, find words that contain our targeted patterns
    const wordsWithTargets = new Set<string>();
    
    // Find words containing targeted letters
    letters.forEach(letter => {
      dictionary.forEach(word => {
        if (word.includes(letter)) {
          wordsWithTargets.add(word);
        }
      });
    });
    
    // Find words containing targeted bigrams
    bigrams.forEach(bigram => {
      dictionary.forEach(word => {
        if (word.includes(bigram)) {
          wordsWithTargets.add(word);
        }
      });
    });
    
    // Calculate weights for each word
    const wordWeights = dictionary.map(word => {
      let weight = 1;
      
      // Add weight for difficult letters
      for (const char of word) {
        const letterTime = timingHistory.letters[char];
        if (letterTime) {
          weight += letterTime / 1000;
        }
      }
      
      // Add weight for difficult bigrams
      for (let i = 0; i < word.length - 1; i++) {
        const bigram = word.slice(i, i + 2);
        const bigramTime = timingHistory.bigrams[bigram];
        if (bigramTime) {
          weight += (bigramTime / 2) / 500;
        }
      }
      
      // Bonus weight if word contains targeted patterns
      if (wordsWithTargets.has(word)) {
        weight *= 2;
      }
      
      return { word, weight };
    });

    // Sort by weight and take top 10%
    const sortedWords = wordWeights.sort((a, b) => b.weight - a.weight);
    const topTenPercent = sortedWords.slice(0, Math.floor(sortedWords.length * 0.1));
    
    const result: string[] = [];
    
    // Ensure we include at least one word for each targeted pattern
    letters.forEach(letter => {
      const wordWithLetter = topTenPercent.find(({ word }) => word.includes(letter));
      if (wordWithLetter && !result.includes(wordWithLetter.word)) {
        result.push(wordWithLetter.word);
      }
    });
    
    bigrams.forEach(bigram => {
      const wordWithBigram = topTenPercent.find(({ word }) => word.includes(bigram));
      if (wordWithBigram && !result.includes(wordWithBigram.word)) {
        result.push(wordWithBigram.word);
      }
    });
    
    // Fill remaining slots with weighted and random words
    const remainingCount = count - result.length;
    const weightedCount = Math.floor(remainingCount / 2);
    
    // Add weighted words
    for (let i = 0; i < weightedCount; i++) {
      const word = topTenPercent[i % topTenPercent.length].word;
      if (!result.includes(word)) {
        result.push(word);
      }
    }
    
    // Fill the rest with random words
    while (result.length < count) {
      const randomWord = dictionary[Math.floor(Math.random() * dictionary.length)];
      if (!result.includes(randomWord)) {
        result.push(randomWord);
      }
    }
    
    // Shuffle the array
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    
    return result;
  };

  // Get the letters and bigrams being targeted (for display)
  const getTargetedPatterns = (): { letters: string[], bigrams: string[] } => {
    // Get top 5 slowest letters and bigrams
    const letters = Object.entries(timingHistory.letters)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([letter]) => letter);

    const bigrams = Object.entries(timingHistory.bigrams)
      .sort(([,a], [,b]) => (b/2) - (a/2)) // Normalize bigram times
      .slice(0, 5)
      .map(([bigram]) => bigram);

    return { letters, bigrams };
  };

  // Initial word generation
  useEffect(() => {
    setWords(generateWeightedWords(WORDS_COUNT, timingHistory));
  }, []); // Only run once at mount

  // Update timing history when game completes
  useEffect(() => {
    if (isGameComplete) {
      updateTimingHistory();
    }
  }, [isGameComplete, updateTimingHistory]);

  const resetGame = useCallback(() => {
    setWords(generateWeightedWords(WORDS_COUNT, timingHistory));
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
      let newTimingHistory = {...timingHistory};

      if (!startTime) {
        newStartTime = currentTime;
      }

      // Handle space - move to next word and track word length timing
      if (e.key === ' ') {
        if (currentInput.length > 0) {
          const wordLength = currentWord.length;
          const wordTime = currentTime - (lastKeyPressTime || currentTime);
          
          // Update word length timing
          const lengthTimings = newTimingHistory.wordLengths[wordLength] || [];
          newTimingHistory.wordLengths[wordLength] = [...lengthTimings, wordTime];
        }
        
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
      setTimingHistory(newTimingHistory);

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

  const calculateWordLengthStats = (): WordLengthTiming[] => {
    const stats: WordLengthTiming[] = [];
    
    Object.entries(timingHistory.wordLengths).forEach(([length, times]) => {
      if (times.length > 0) {
        stats.push({
          length: parseInt(length),
          averageTime: times.reduce((a, b) => a + b, 0) / times.length,
          occurrences: times.length
        });
      }
    });
    
    return stats.sort((a, b) => a.length - b.length);
  };

  const renderWord = (word: string, index: number) => {
    const { letters, bigrams } = getTargetedPatterns();
    
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

  return (
    <div className="typing-game">
      {timingHistory.letters && Object.keys(timingHistory.letters).length > 0 && (
        <div className="targeting-info">
          <div className="targeting-section">
            <h4>Targeting slow letters:</h4>
            <div className="targeted-items">
              {getTargetedPatterns().letters.map(letter => (
                <span key={letter} className="targeted-item">
                  {letter === ' ' ? '␣' : letter}
                </span>
              ))}
            </div>
          </div>
          <div className="targeting-section">
            <h4>Targeting slow combinations:</h4>
            <div className="targeted-items">
              {getTargetedPatterns().bigrams.map(bigram => (
                <span key={bigram} className="targeted-item">
                  {bigram}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
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
            <button 
              className={`tab-button ${selectedTab === 'wordLengths' ? 'active' : ''}`}
              onClick={() => setSelectedTab('wordLengths')}
            >
              Word Length Analysis
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
          ) : selectedTab === 'bigrams' ? (
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
          ) : (
            <div className="letter-stats">
              <h3>Word Length Analysis</h3>
              <div className="stats-grid">
                {calculateWordLengthStats().map(({ length, averageTime, occurrences }) => (
                  <div key={length} className="stat-item">
                    <span className="letter">
                      {length} chars
                    </span>
                    <span className="time">{averageTime.toFixed(0)}ms</span>
                    <span className="occurrences">
                      {occurrences} words
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