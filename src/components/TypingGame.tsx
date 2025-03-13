import React, { useState, useEffect, useCallback } from 'react';
import './TypingGame.css';
import { TimingHistory, PerformancePoint } from '../types/types';
import { generateWeightedWords, calculateWordStats, calculateOverallWordStats, calculateLetterStats, calculateBigramStats } from '../utils/utils';
import GameScreen from './GameScreen/GameScreen';
import ResultsScreen from './ResultsScreen/ResultsScreen';
import { UserPreferences } from '../types/types';

const WORDS_COUNT = 20;
const STORAGE_KEY = 'type-refiner-data';

const TypingGame: React.FC = () => {
  const [words, setWords] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wordStartTimes, setWordStartTimes] = useState<{ [key: string]: { startTime: number; charsTyped: number } }>({});
  const [wordMistypes, setWordMistypes] = useState<{ [key: string]: number }>({});
  const [letterMistakes, setLetterMistakes] = useState<{ [key: string]: number }>({});
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [lastKeyPressTime, setLastKeyPressTime] = useState<number | null>(null);
  const [completedInputs, setCompletedInputs] = useState<string[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformancePoint[]>([]);

  const [timingHistory, setTimingHistory] = useState<TimingHistory>({ 
    letters: {}, 
    bigrams: {}, 
    words: {},
    historicalLetters: {},
    historicalBigrams: {},
    historicalWords: {},
    historicalPerformance: [],
    wordMistypes: {}
  });

  const [typeTimings, setTypeTimings] = useState<{ 
    letters: { [key: string]: number[] }, 
    bigrams: { [key: string]: number[] }, 
    words: { [key: string]: number[] } }>
    ({ letters: {}, bigrams: {}, words: {} });
    
  const [preferences, setPreferences] = useState<UserPreferences>({
    strictMode: true,
    hideTargets: false,
    selectedTab: 'letters',
    showingOverall: false
  });

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setTimingHistory(parsedData);
      setWords(generateWeightedWords(WORDS_COUNT, parsedData));
    } else {
      setWords(generateWeightedWords(WORDS_COUNT, timingHistory));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timingHistory));
  }, [timingHistory]);

  useEffect(() => {
    if (isGameComplete) {
      const letterStats = calculateLetterStats(words, wordIndex, completedInputs, currentInput, typeTimings.letters);
      const bigramStats = calculateBigramStats(words, wordIndex, completedInputs, currentInput, typeTimings.letters, typeTimings.bigrams);
      
      const newLetterTimings: { [key: string]: number } = {};
      const newBigramTimings: { [key: string]: number } = {};
      const newWordTimings: { [key: string]: number } = {};
      const newHistoricalLetters = { ...timingHistory.historicalLetters };
      const newHistoricalBigrams = { ...timingHistory.historicalBigrams };
      const newHistoricalWords = { ...timingHistory.historicalWords };
      const newWordMistypes = { ...timingHistory.wordMistypes };
      
      words.forEach((word, idx) => {
        const input = completedInputs[idx];
        const times = typeTimings.words[word] || [];
        if (times.length > 0) {
          newWordTimings[word] = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
          
          if (!newHistoricalWords[word]) {
            newHistoricalWords[word] = [];
          }
          newHistoricalWords[word].push(...times);
        }
        if (wordMistypes[word]) {
          newWordMistypes[word] = (newWordMistypes[word] || 0) + wordMistypes[word];
        }
      });

      letterStats.forEach(({ letter, averageTime }) => {
        newLetterTimings[letter] = averageTime;
        
        const currentTimings: number[] = [];
        words.forEach((word, wordIdx) => {
          const input = completedInputs[wordIdx] || '';
          word.split('').forEach((char, charIdx) => {
            if (char === letter && input[charIdx] === char && typeTimings.letters[char]?.[currentTimings.length]) {
              currentTimings.push(typeTimings.letters[char][currentTimings.length]);
            }
          });
        });
        
        if (!newHistoricalLetters[letter]) {
          newHistoricalLetters[letter] = [];
        }
        newHistoricalLetters[letter] = [...newHistoricalLetters[letter], ...currentTimings];
      });
      
      bigramStats.forEach(({ bigram, averageTime }) => {
        newBigramTimings[bigram] = averageTime;
        
        const currentTimings: number[] = [];
        words.forEach((word, wordIdx) => {
          const input = completedInputs[wordIdx] || '';
          for (let i = 0; i < word.length - 1; i++) {
            if (word.slice(i, i + 2) === bigram && 
                input[i] === word[i] && 
                input[i + 1] === word[i + 1]) {
              const timings = typeTimings.bigrams[bigram] || [];
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
        words: newWordTimings,
        historicalLetters: newHistoricalLetters,
        historicalBigrams: newHistoricalBigrams,
        historicalWords: newHistoricalWords,
        historicalPerformance: [...timingHistory.historicalPerformance, { wpm: performanceData[performanceData.length - 1].wpm, accuracy: performanceData[performanceData.length - 1].accuracy }],
        wordMistypes: newWordMistypes
      });
    }
  }, [isGameComplete]);

  const resetGame = useCallback(() => {
    setWords(generateWeightedWords(WORDS_COUNT, timingHistory));
    setCurrentInput('');
    setWordIndex(0);
    setStartTime(null);
    setTypeTimings({letters: {}, bigrams: {}, words: {}});
    setWordStartTimes({});
    setWordMistypes({});
    setLetterMistakes({});
    setTotalKeystrokes(0);
    setTotalMistakes(0);
    setIsGameComplete(false);
    setLastKeyPressTime(null);
    setCompletedInputs([]);
    setPerformanceData([]);
  }, [timingHistory]);

  const updatePerformanceData = useCallback((overrideInput: string, currentTime: number) => {
    if (!startTime) return;
  
    const timeInMinutes = (currentTime - startTime) / 60000;
  
    let totalCorrectChars = 0;
    let totalPossibleChars = 0;
  
    for (let idx = 0; idx <= wordIndex; idx++) {
      const word = words[idx];
      const input = idx < wordIndex ? completedInputs[idx] : overrideInput;
      
      totalPossibleChars += word.length;
      
      for (let charIdx = 0; charIdx < word.length; charIdx++) {
        if (input && input[charIdx] === word[charIdx]) {
          totalCorrectChars++;
        }
      }

      if (idx < wordIndex) {
        totalCorrectChars++;
        totalPossibleChars++;
      }
    }
  
    const currentAccuracy = totalPossibleChars > 0 
      ? Math.round((totalCorrectChars / totalPossibleChars) * 100)
      : 100;
  
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
      let newLetterTimings = {...typeTimings.letters};
      let newBigramTimings = {...typeTimings.bigrams};
      let newWordTimings = {...typeTimings.words};
      let newLetterMistakes = {...letterMistakes};
      let newTotalMistakes = totalMistakes;
      let newTotalKeystrokes = totalKeystrokes;
      let newLastKeyPressTime = currentTime;
      let newCompletedInputs = [...completedInputs];
      let newWordIndex = wordIndex;
      let newCurrentInput = currentInput;
      let newIsGameComplete = isGameComplete;
      let newWordStartTimes = {...wordStartTimes};
      let newWordMistypes = {...wordMistypes};

      if (!startTime) {
        newStartTime = currentTime;
      }

      if (!newWordStartTimes[currentWord]) {
        newWordStartTimes[currentWord] = { startTime: currentTime, charsTyped: 0 };
      }

      if (e.key === ' ') {
        if (currentInput.length === 0) {
          return;
        }

        if (currentInput.length > 0) {
          const wordStartData = newWordStartTimes[currentWord];
          if (wordStartData) {
            const totalTime = currentTime - wordStartData.startTime;
            const normalizedTime = Math.round(totalTime / currentWord.length);
            const times = newWordTimings[currentWord] || [];
            newWordTimings[currentWord] = [...times, normalizedTime];
          }

          const remainingChars = currentWord.slice(currentInput.length);
          if (remainingChars.length > 0) {
            newWordMistypes[currentWord] = (newWordMistypes[currentWord] || 0) + remainingChars.length;
          }

          if (preferences.strictMode && currentInput !== currentWord) {
            return;
          }
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
          const nextWord = words[wordIndex + 1];
          if (nextWord) {
            newWordStartTimes[nextWord] = { startTime: currentTime, charsTyped: 0 };
          }
          newCurrentInput = '';
          updatePerformanceData(currentInput, currentTime);
        }
      } else {
        if (currentInput.length >= currentWord.length) {
          return;
        }

        if (newWordStartTimes[currentWord]) {
          newWordStartTimes[currentWord].charsTyped = currentInput.length + 1;
        }

        if (lastKeyPressTime) {
          const charTimeDiff = currentTime - lastKeyPressTime;
          const timings = newLetterTimings[e.key] || [];
          newLetterTimings[e.key] = [...timings, charTimeDiff];

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
          newWordMistypes[currentWord] = (newWordMistypes[currentWord] || 0) + 1;
        }

        if (wordIndex === words.length - 1 && newCurrentInput.length >= currentWord.length) {
          const wordStartData = newWordStartTimes[currentWord];
          if (wordStartData) {
            const totalTime = currentTime - wordStartData.startTime;
            const normalizedTime = Math.round(totalTime / currentWord.length);
            const times = newWordTimings[currentWord] || [];
            newWordTimings[currentWord] = [...times, normalizedTime];
          }

          newCompletedInputs.push(newCurrentInput);
          newIsGameComplete = true;
          updatePerformanceData(newCurrentInput, currentTime);
        } else {
          updatePerformanceData(newCurrentInput, currentTime);
        }
      }

      setStartTime(newStartTime);
      setTypeTimings({letters: newLetterTimings, bigrams: newBigramTimings, words: newWordTimings});
      setLetterMistakes(newLetterMistakes);
      setTotalMistakes(newTotalMistakes);
      setTotalKeystrokes(newTotalKeystrokes);
      setLastKeyPressTime(newLastKeyPressTime);
      setCompletedInputs(newCompletedInputs);
      setWordIndex(newWordIndex);
      setCurrentInput(newCurrentInput);
      setIsGameComplete(newIsGameComplete);
      setWordStartTimes(newWordStartTimes);
      setWordMistypes(newWordMistypes);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const newInput = currentInput.slice(0, -1);
      updatePerformanceData(newInput, performance.now());
      setCurrentInput(newInput);
    }
  }, [words, wordIndex, currentInput, startTime, lastKeyPressTime, preferences.strictMode, typeTimings.letters, typeTimings.bigrams, typeTimings.words, letterMistakes, totalMistakes, totalKeystrokes, completedInputs, updatePerformanceData]);

  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      if (!isGameComplete) {
        handleKeyPress(e);
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyPress);
    return () => window.removeEventListener('keydown', handleGlobalKeyPress);
  }, [isGameComplete, handleKeyPress]);

  const calculateStats = () => {
    if (!startTime || !isGameComplete) return null;

    const timeInMinutes = (performance.now() - startTime) / 60000;
    
    let totalCorrectChars = 0;
    let totalExpectedChars = 0;

    words.forEach((word, idx) => {
      const input = completedInputs[idx] || '';
      
      for (let charIdx = 0; charIdx < word.length; charIdx++) {
        totalExpectedChars++;
        if (input[charIdx] === word[charIdx]) {
          totalCorrectChars++;
        }
      }

      if (idx < words.length - 1 && input.length >= word.length) {
        totalCorrectChars++;
        totalExpectedChars++;
      }

      if (input.length > word.length) {
        totalExpectedChars += input.length - word.length;
      }
    });

    const accuracy = totalExpectedChars > 0 
      ? Math.round((totalCorrectChars / totalExpectedChars) * 100)
      : 100;

    const standardizedWords = totalCorrectChars / 5;
    const wpm = Math.round((standardizedWords / timeInMinutes) * 100) / 100;

    return { wpm, accuracy };
  };
  
  const stats = calculateStats();

  const handleDeleteData = () => {
    if (window.confirm('Are you sure you want to delete all your typing data? This action cannot be undone.')) {
      const emptyHistory = { 
        letters: {}, 
        bigrams: {}, 
        words: {},
        historicalLetters: {},
        historicalBigrams: {},
        historicalWords: {},
        historicalPerformance: [],
        wordMistypes: {}
      };
      localStorage.removeItem(STORAGE_KEY);
      setTimingHistory(emptyHistory);
      setWords(generateWeightedWords(WORDS_COUNT, emptyHistory));
      setCurrentInput('');
      setWordIndex(0);
      setStartTime(null);
      setTypeTimings({letters: {}, bigrams: {}, words: {}});
      setLetterMistakes({});
      setTotalKeystrokes(0);
      setTotalMistakes(0);
      setIsGameComplete(false);
      setLastKeyPressTime(null);
      setCompletedInputs([]);
      setPerformanceData([]);
    }
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
          strictMode={preferences.strictMode}
          hideTargets={preferences.hideTargets}
          onToggleStrictMode={() => setPreferences({...preferences, strictMode: !preferences.strictMode})}
          onToggleHideTargets={() => setPreferences({...preferences, hideTargets: !preferences.hideTargets})}
        />
      ) : (
        <ResultsScreen
          performanceData={performanceData}
          timingHistory={timingHistory}
          showingOverall={preferences.showingOverall}
          selectedTab={preferences.selectedTab}
          words={words}
          wordIndex={wordIndex}
          completedInputs={completedInputs}
          currentInput={currentInput}
          letterTimings={typeTimings.letters}
          bigramTimings={typeTimings.bigrams}
          wordTimings={typeTimings.words}
          onTabChange={(tab) => setPreferences({...preferences, selectedTab: tab})}
          onToggleOverall={() => setPreferences({...preferences, showingOverall: !preferences.showingOverall})}
          onReset={resetGame}
          onDeleteData={handleDeleteData}
          calculateWordStats={() => calculateWordStats(words, completedInputs, typeTimings.words, wordMistypes)}
          calculateOverallWordStats={() => calculateOverallWordStats(words, completedInputs, typeTimings.words, wordMistypes, timingHistory, isGameComplete)}
        />
      )}
    </div>
  );
};

export default TypingGame; 