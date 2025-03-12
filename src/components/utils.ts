import { LetterTiming, BigramTiming, TimingHistory } from './types';
import { dictionary } from './dictionary';

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

export const calculateBigramStats = (
  words: string[],
  wordIndex: number,
  completedInputs: string[],
  currentInput: string,
  letterTimings: { [key: string]: number[] },
  bigramTimings: { [key: string]: number[] }
): BigramTiming[] => {
  const bigramStats = new Map<string, { totalTime: number, count: number }>();
  
  // First collect all correctly typed bigrams
  words.forEach((word, wordIdx) => {
    const input = wordIdx < wordIndex ? completedInputs[wordIdx] : 
                  wordIdx === wordIndex ? currentInput : '';
    
    if (!input || input.length < 2) return;
    
    // Track bigrams we've seen in this word to average their timings
    const wordBigrams = new Map<string, { totalTime: number, count: number }>();
    
    for (let charIdx = 0; charIdx < word.length - 1; charIdx++) {
      if (input[charIdx] === word[charIdx] && 
          input[charIdx + 1] === word[charIdx + 1]) {
        const bigram = word.slice(charIdx, charIdx + 2);
        const timings = bigramTimings[bigram] || [];
        
        if (timings.length > 0) {
          // Add to word-specific bigram stats
          const stats = wordBigrams.get(bigram) || { totalTime: 0, count: 0 };
          stats.totalTime += timings[stats.count];
          stats.count += 1;
          wordBigrams.set(bigram, stats);
        }
      }
    }
    
    // Average the timings for each bigram in this word and add to overall stats
    wordBigrams.forEach((wordStats, bigram) => {
      const avgTimeForWord = wordStats.totalTime / wordStats.count;
      const stats = bigramStats.get(bigram) || { totalTime: 0, count: 0 };
      stats.totalTime += avgTimeForWord;
      stats.count += 1; // Count each word's average as one occurrence
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

export const getTargetedPatterns = (timingHistory: TimingHistory) => {
  const letters: string[] = [];
  const bigrams: string[] = [];
  const words: string[] = [];

  // Get letters with highest average time
  const letterEntries = Object.entries(timingHistory.historicalLetters);
  if (letterEntries.length > 0) {
    const letterStats = letterEntries.map(([letter, times]) => ({
      letter,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length
    }));
    letterStats.sort((a, b) => b.averageTime - a.averageTime);
    letters.push(...letterStats.slice(0, 5).map(stat => stat.letter));
  }

  // Get bigrams with highest average time
  const bigramEntries = Object.entries(timingHistory.historicalBigrams);
  if (bigramEntries.length > 0) {
    const bigramStats = bigramEntries.map(([bigram, times]) => ({
      bigram,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length
    }));
    bigramStats.sort((a, b) => b.averageTime - a.averageTime);
    bigrams.push(...bigramStats.slice(0, 5).map(stat => stat.bigram));
  }

  // Get words with most mistypes, then by time if tied
  const wordEntries = Object.entries(timingHistory.historicalWords);
  if (wordEntries.length > 0) {
    const wordStats = wordEntries.map(([word, times]) => ({
      word,
      averageTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      mistypes: timingHistory.wordMistypes[word] || 0
    }));
    wordStats.sort((a, b) => {
      // Sort by mistypes first
      if (b.mistypes !== a.mistypes) {
        return b.mistypes - a.mistypes;
      }
      // If mistypes are equal, sort by time
      return b.averageTime - a.averageTime;
    });
    words.push(...wordStats.slice(0, 5).map(stat => stat.word));
  }

  return { letters, bigrams, words };
};

export const generateWeightedWords = (count: number, timingHistory: TimingHistory): string[] => {
  const { letters, bigrams, words: targetWords } = getTargetedPatterns(timingHistory);
  
  // Calculate word weights based on mistypes and timing
  const wordWeights = dictionary.map(word => {
    let weight = 1;
    
    // Get historical timings for this word
    const historicalTimes = timingHistory.historicalWords[word] || [];
    const averageTime = historicalTimes.length > 0 ? 
      historicalTimes.reduce((a, b) => a + b, 0) / historicalTimes.length : 
      0;
    
    // Get mistypes
    const mistypes = timingHistory.wordMistypes[word] || 0;
    
    // Weight based on word timing, multiplied by (mistakes + 1)
    if (averageTime > 0) {
      weight += (averageTime / 1000) * (mistypes + 1);
    }
    
    // Add smaller weights for letters and bigrams (just like original)
    for (const char of word) {
      if (timingHistory.historicalLetters[char]?.length > 0) {
        const letterTimes = timingHistory.historicalLetters[char];
        const avgLetterTime = letterTimes.reduce((a, b) => a + b, 0) / letterTimes.length;
        // Also multiply letter contribution by (mistakes + 1)
        weight += (avgLetterTime / 2000) * (mistypes + 1);
      }
    }
    
    for (let i = 0; i < word.length - 1; i++) {
      const bigram = word.slice(i, i + 2);
      if (timingHistory.historicalBigrams[bigram]?.length > 0) {
        const bigramTimes = timingHistory.historicalBigrams[bigram];
        const avgBigramTime = bigramTimes.reduce((a, b) => a + b, 0) / bigramTimes.length;
        // Also multiply bigram contribution by (mistakes + 1)
        weight += (avgBigramTime / 4000) * (mistypes + 1);
      }
    }
    
    return { word, weight };
  });

  const sortedWords = wordWeights.sort((a, b) => b.weight - a.weight);
  const result: string[] = [];
  
  // First add target words (which are already sorted by mistypes then time)
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
      // If we run out of weighted words, add random ones
      const randomWord = dictionary[Math.floor(Math.random() * dictionary.length)];
      if (!result.includes(randomWord)) {
        result.push(randomWord);
      }
    }
  }
  
  // Shuffle the words to avoid predictable patterns
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
};

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

export const calculateOverallBigramStats = (
  words: string[],
  wordIndex: number,
  completedInputs: string[],
  currentInput: string,
  letterTimings: { [key: string]: number[] },
  timingHistory: TimingHistory
): BigramTiming[] => {
  const bigramStats = calculateBigramStats(words, wordIndex, completedInputs, currentInput, letterTimings, timingHistory.historicalBigrams);
  const stats: BigramTiming[] = [];
  
  // Count occurrences by counting successful bigram completions
  const historicalOccurrences = new Map<string, number>();
  Object.entries(timingHistory.historicalBigrams).forEach(([bigram, times]) => {
    // Each timing represents one successful bigram typing
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