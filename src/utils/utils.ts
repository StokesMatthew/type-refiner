import { LetterTiming, BigramTiming, TimingHistory } from '../types/types';
import { dictionary } from '../dictionary';

// ===============================
// Letter Analysis Functions
// ===============================

/**
 * Calculates typing statistics for individual letters in the current game session
 * @param words - Array of target words
 * @param wordIndex - Current word index
 * @param completedInputs - Array of completed word inputs
 * @param currentInput - Current word input
 * @param letterTimings - Timing data for each letter
 * @returns Array of letter statistics sorted by average time
 */
export const calculateLetterStats = (
  words: string[],
  wordIndex: number,
  completedInputs: string[],
  currentInput: string,
  letterTimings: { [key: string]: number[] }
): LetterTiming[] => {
  const letterStats = new Map<string, number[]>();
  
  words.forEach((word, wordIdx) => {
    const input = wordIdx < wordIndex ? completedInputs[wordIdx] : 
                  wordIdx === wordIndex ? currentInput : '';
    
    word.split('').forEach((char, charIdx) => {
      if (input && charIdx < input.length && input[charIdx] === char) {
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

/**
 * Calculates overall letter statistics combining current and historical data
 * @param words - Array of target words
 * @param wordIndex - Current word index
 * @param completedInputs - Array of completed word inputs
 * @param currentInput - Current word input
 * @param letterTimings - Timing data for each letter
 * @param timingHistory - Historical timing data
 * @returns Array of letter statistics sorted by average time
 */
export const calculateOverallLetterStats = (
  words: string[],
  wordIndex: number,
  completedInputs: string[],
  currentInput: string,
  letterTimings: { [key: string]: number[] },
  timingHistory: TimingHistory
): LetterTiming[] => {
  const letterStats = calculateLetterStats(words, wordIndex, completedInputs, currentInput, letterTimings);
  const stats: LetterTiming[] = [];
  
  Object.entries(timingHistory.historicalLetters).forEach(([letter, times]) => {
    const currentStats = letterStats.find(stat => stat.letter === letter);
    
    if (times.length > 0) {
      stats.push({
        letter,
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
        occurrences: times.length
      });
    } else if (currentStats) {
      stats.push(currentStats);
    }
  });
  
  letterStats.forEach(stat => {
    if (!stats.some(s => s.letter === stat.letter)) {
      stats.push(stat);
    }
  });
  
  return stats.sort((a, b) => b.averageTime - a.averageTime);
};

// ===============================
// Bigram Analysis Functions
// ===============================

/**
 * Calculates typing statistics for bigrams (two-letter combinations) in the current game session
 * @param words - Array of target words
 * @param wordIndex - Current word index
 * @param completedInputs - Array of completed word inputs
 * @param currentInput - Current word input
 * @param bigramTimings - Timing data for each bigram
 * @returns Array of bigram statistics sorted by average time
 */
export const calculateBigramStats = (
  words: string[],
  wordIndex: number,
  completedInputs: string[],
  currentInput: string,
  bigramTimings: { [key: string]: number[] }
): BigramTiming[] => {
  const bigramStats = new Map<string, { totalTime: number, count: number }>();
  
  words.forEach((word, wordIdx) => {
    const input = wordIdx < wordIndex ? completedInputs[wordIdx] : 
                  wordIdx === wordIndex ? currentInput : '';
    
    if (!input || input.length < 2) return;
    
    const wordBigrams = new Map<string, { totalTime: number, count: number }>();
    
    for (let charIdx = 0; charIdx < word.length - 1; charIdx++) {
      if (input[charIdx] === word[charIdx] && 
          input[charIdx + 1] === word[charIdx + 1]) {
        const bigram = word.slice(charIdx, charIdx + 2);
        const timings = bigramTimings[bigram] || [];
        
        if (timings.length > 0) {
          const stats = wordBigrams.get(bigram) || { totalTime: 0, count: 0 };
          stats.totalTime += timings[stats.count];
          stats.count += 1;
          wordBigrams.set(bigram, stats);
        }
      }
    }
    
    wordBigrams.forEach((wordStats, bigram) => {
      const avgTimeForWord = wordStats.totalTime / wordStats.count;
      const stats = bigramStats.get(bigram) || { totalTime: 0, count: 0 };
      stats.totalTime += avgTimeForWord;
      stats.count += 1;
      bigramStats.set(bigram, stats);
    });
  });

  return Array.from(bigramStats.entries())
    .map(([bigram, { totalTime, count }]) => ({
      bigram,
      averageTime: Math.round(totalTime / count),
      occurrences: count
    }))
    .sort((a, b) => b.averageTime - a.averageTime);
};

/**
 * Calculates overall bigram statistics combining current and historical data
 * @param words - Array of target words
 * @param wordIndex - Current word index
 * @param completedInputs - Array of completed word inputs
 * @param currentInput - Current word input
 * @param letterTimings - Timing data for each letter
 * @param timingHistory - Historical timing data
 * @returns Array of bigram statistics sorted by average time
 */
export const calculateOverallBigramStats = (
  words: string[],
  wordIndex: number,
  completedInputs: string[],
  currentInput: string,
  letterTimings: { [key: string]: number[] },
  timingHistory: TimingHistory
): BigramTiming[] => {
  const bigramStats = calculateBigramStats(words, wordIndex, completedInputs, currentInput, timingHistory.historicalBigrams);
  const stats: BigramTiming[] = [];
  
  const historicalOccurrences = new Map<string, number>();
  Object.entries(timingHistory.historicalBigrams).forEach(([bigram, times]) => {
    historicalOccurrences.set(bigram, Math.ceil(times.length));
  });
  
  Object.entries(timingHistory.historicalBigrams).forEach(([bigram, times]) => {
    const currentStats = bigramStats.find(stat => stat.bigram === bigram);
    
    if (times.length > 0) {
      stats.push({
        bigram,
        averageTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        occurrences: historicalOccurrences.get(bigram) || 0
      });
    } else if (currentStats) {
      stats.push(currentStats);
    }
  });
  
  bigramStats.forEach(stat => {
    if (!stats.some(s => s.bigram === stat.bigram)) {
      stats.push(stat);
    }
  });
  
  return stats.sort((a, b) => b.averageTime - a.averageTime);
};

// ===============================
// Word Analysis Functions
// ===============================

/**
 * Calculates typing statistics for words in the current game session
 * @param words - Array of target words
 * @param wordTimings - Timing data for each word
 * @param wordMistypes - Count of mistypes for each word
 * @returns Array of word statistics sorted by mistypes and average time
 */
export const calculateWordStats = (
  words: string[],
  wordTimings: { [key: string]: number[] },
  wordMistypes: { [key: string]: number }
): { word: string; averageTime: number; occurrences: number; mistypes: number; }[] => {
  const stats: { word: string; averageTime: number; occurrences: number; mistypes: number; }[] = [];
  
  words.forEach((word) => {
    const times = wordTimings[word] || [];
    const mistypeCount = wordMistypes[word] || 0;
    
    stats.push({
      word,
      averageTime: times.length > 0 ? 
        Math.round(times.reduce((a, b) => a + b, 0) / times.length) :
        0,
      occurrences: times.length,
      mistypes: mistypeCount
    });
  });

  return stats.sort((a, b) => {
    if (b.mistypes !== a.mistypes) {
      return b.mistypes - a.mistypes;
    }
    return b.averageTime - a.averageTime;
  });
};

/**
 * Calculates overall word statistics combining current and historical data
 * @param words - Array of target words
 * @param wordTimings - Timing data for each word
 * @param wordMistypes - Count of mistypes for each word
 * @param timingHistory - Historical timing data
 * @param isGameComplete - Whether the current game is complete
 * @returns Array of word statistics sorted by mistypes and average time
 */
export const calculateOverallWordStats = (
  words: string[],
  wordTimings: { [key: string]: number[] },
  wordMistypes: { [key: string]: number },
  timingHistory: TimingHistory,
  isGameComplete: boolean
): { word: string; averageTime: number; occurrences: number; mistypes: number; }[] => {
  const wordStats = calculateWordStats(words, wordTimings, wordMistypes);
  const stats: { word: string; averageTime: number; occurrences: number; mistypes: number; }[] = [];
  
  if (!isGameComplete) {
    return wordStats;
  }
  
  const processedWords = new Set<string>();
  
  wordStats.forEach(stat => {
    processedWords.add(stat.word);
    stats.push({
      word: stat.word,
      averageTime: stat.averageTime,
      occurrences: stat.occurrences,
      mistypes: stat.mistypes
    });
  });
  
  Object.entries(timingHistory.historicalWords).forEach(([word, times]) => {
    if (processedWords.has(word)) {
      const existingStats = stats.find(s => s.word === word)!;
      const allTimes = [...times];
      if (existingStats.averageTime > 0) {
        const currentTimes = wordTimings[word] || [];
        allTimes.push(...currentTimes);
      }
      
      existingStats.averageTime = allTimes.length > 0 ?
        Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length) :
        0;
      existingStats.occurrences += times.length;
      existingStats.mistypes += timingHistory.wordMistypes[word] || 0;
    } else {
      processedWords.add(word);
      stats.push({
        word,
        averageTime: times.length > 0 ?
          Math.round(times.reduce((a, b) => a + b, 0) / times.length) :
          0,
        occurrences: times.length,
        mistypes: timingHistory.wordMistypes[word] || 0
      });
    }
  });
  
  return stats.sort((a, b) => {
    if (b.mistypes !== a.mistypes) {
      return b.mistypes - a.mistypes;
    }
    return b.averageTime - a.averageTime;
  });
};

// ===============================
// Utility Functions
// ===============================

/**
 * Gets the most challenging patterns (letters, bigrams, and words) from historical data
 * @param timingHistory - Historical timing data
 * @returns Object containing arrays of targeted letters, bigrams, and words
 */
export const getTargetedPatterns = (timingHistory: TimingHistory) => {
  const letters: string[] = [];
  const bigrams: string[] = [];
  const words: string[] = [];

  // Find slowest letters
  const historicalLetters = timingHistory?.historicalLetters || {};
  const letterEntries = Object.entries(historicalLetters);
  if (letterEntries.length > 0) {
    const letterStats = letterEntries.map(([letter, times]) => ({
      letter,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length
    }));
    letterStats.sort((a, b) => b.averageTime - a.averageTime);
    letters.push(...letterStats.slice(0, 5).map(stat => stat.letter));
  }

  // Find slowest bigrams
  const historicalBigrams = timingHistory?.historicalBigrams || {};
  const bigramEntries = Object.entries(historicalBigrams);
  if (bigramEntries.length > 0) {
    const bigramStats = bigramEntries.map(([bigram, times]) => ({
      bigram,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length
    }));
    bigramStats.sort((a, b) => b.averageTime - a.averageTime);
    bigrams.push(...bigramStats.slice(0, 5).map(stat => stat.bigram));
  }

  // Find most challenging words (based on mistypes and time)
  const historicalWords = timingHistory?.historicalWords || {};
  const wordMistypes = timingHistory?.wordMistypes || {};
  const wordEntries = Object.entries(historicalWords);
  if (wordEntries.length > 0) {
    const wordStats = wordEntries.map(([word, times]) => ({
      word,
      averageTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      mistypes: wordMistypes[word] || 0
    }));
    wordStats.sort((a, b) => {
      if (b.mistypes !== a.mistypes) {
        return b.mistypes - a.mistypes;
      }
      return b.averageTime - a.averageTime;
    });
    words.push(...wordStats.slice(0, 5).map(stat => stat.word));
  }

  return { letters, bigrams, words };
};

/**
 * Generates a weighted list of words for practice, prioritizing challenging patterns
 * @param count - Number of words to generate
 * @param timingHistory - Historical timing data
 * @returns Array of words for practice
 */
export const generateWeightedWords = (count: number, timingHistory: TimingHistory): string[] => {
  // For first-time users with no history
  if (!timingHistory.historicalPerformance || timingHistory.historicalPerformance.length === 0) {
    const result: string[] = [];
    while (result.length < count) {
      const randomWord = dictionary[Math.floor(Math.random() * dictionary.length)];
      if (!result.includes(randomWord)) {
        result.push(randomWord);
      }
    }
    return result;
  }

  // Ensure all timing history properties exist
  const safeTimingHistory: TimingHistory = {
    historicalLetters: timingHistory?.historicalLetters || {},
    historicalBigrams: timingHistory?.historicalBigrams || {},
    historicalWords: timingHistory?.historicalWords || {},
    wordMistypes: timingHistory?.wordMistypes || {},
    letters: timingHistory?.letters || {},
    bigrams: timingHistory?.bigrams || {},
    words: timingHistory?.words || {},
    historicalPerformance: timingHistory?.historicalPerformance || []
  };

  const { letters, bigrams, words: targetWords } = getTargetedPatterns(safeTimingHistory);
  
  // Calculate weights for each word based on historical performance
  const wordWeights = dictionary.map(word => {
    let weight = 1;
    
    const historicalTimes = safeTimingHistory.historicalWords[word] || [];
    const currentMistypes = safeTimingHistory.words[word] ? (safeTimingHistory.wordMistypes[word] || 0) : 0;
    
    let averageTime = 0;
    if (historicalTimes.length > 0) {
      averageTime = historicalTimes.reduce((a, b) => a + b, 0) / historicalTimes.length;
    }
    
    // Increase weight based on historical performance
    if (averageTime > 0 || currentMistypes > 0) {
      if (averageTime > 0) {
        weight += averageTime / 1000;
      }
      
      if (currentMistypes > 0) {
        weight *= (1 + currentMistypes);
      }
    }
    
    // Add weight for challenging letters
    for (const char of word) {
      const letterTimes = safeTimingHistory.historicalLetters[char] || [];
      if (letterTimes.length > 0) {
        const avgLetterTime = letterTimes.reduce((a, b) => a + b, 0) / letterTimes.length;
        weight += avgLetterTime / 2000;
      }
    }
    
    // Add weight for challenging bigrams
    for (let i = 0; i < word.length - 1; i++) {
      const bigram = word.slice(i, i + 2);
      const bigramTimes = safeTimingHistory.historicalBigrams[bigram] || [];
      if (bigramTimes.length > 0) {
        const avgBigramTime = bigramTimes.reduce((a, b) => a + b, 0) / bigramTimes.length;
        weight += avgBigramTime / 4000;
      }
    }
    
    // Double weight for words with recent mistypes
    if (currentMistypes > 0) {
      weight *= 2;
    }
    
    return { word, weight };
  });

  // Sort words by weight and build result list
  const sortedWords = wordWeights.sort((a, b) => b.weight - a.weight);
  const result: string[] = [];
  
  // Include targeted words first
  targetWords.forEach(word => {
    if (dictionary.includes(word) && !result.includes(word)) {
      result.push(word);
    }
  });
  
  // Fill remaining slots with weighted words
  while (result.length < count) {
    const nextWord = sortedWords.find(({ word }) => !result.includes(word));
    if (nextWord) {
      result.push(nextWord.word);
    } else {
      const randomWord = dictionary[Math.floor(Math.random() * dictionary.length)];
      if (!result.includes(randomWord)) {
        result.push(randomWord);
      }
    }
  }
  
  // Shuffle the final list
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}; 
