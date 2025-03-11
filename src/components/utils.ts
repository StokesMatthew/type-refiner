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
    
    for (let charIdx = 0; charIdx < word.length - 1; charIdx++) {
      if (input[charIdx] === word[charIdx] && 
          input[charIdx + 1] === word[charIdx + 1]) {
        const bigram = word.slice(charIdx, charIdx + 2);
        const timings = bigramTimings[bigram] || [];
        
        if (timings.length > 0) {
          const stats = bigramStats.get(bigram) || { totalTime: 0, count: 0 };
          stats.totalTime += timings.reduce((a, b) => a + b, 0);
          stats.count += 1; // Count each successful bigram typing once
          bigramStats.set(bigram, stats);
        }
      }
    }
  });

  return Array.from(bigramStats.entries())
    .map(([bigram, { totalTime, count }]) => ({
      bigram,
      averageTime: Math.round(totalTime / count),
      occurrences: count
    }))
    .sort((a, b) => b.averageTime - a.averageTime);
};

export const getTargetedPatterns = (timingHistory: TimingHistory): { letters: string[], bigrams: string[] } => {
  const letters = Object.entries(timingHistory.letters)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([letter]) => letter);

  // Calculate average times from historical data
  const bigramAverages = Object.entries(timingHistory.historicalBigrams).map(([bigram, times]) => ({
    bigram,
    averageTime: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
  }));

  const bigrams = bigramAverages
    .sort((a, b) => b.averageTime - a.averageTime)
    .slice(0, 5)
    .map(({ bigram }) => bigram);

  return { letters, bigrams };
};

export const generateWeightedWords = (count: number, timingHistory: TimingHistory): string[] => {
  const { letters, bigrams } = getTargetedPatterns(timingHistory);
  
  const wordsWithTargets = new Set<string>();
  
  letters.forEach(letter => {
    dictionary.forEach(word => {
      if (word.includes(letter)) {
        wordsWithTargets.add(word);
      }
    });
  });
  
  bigrams.forEach(bigram => {
    dictionary.forEach(word => {
      if (word.includes(bigram)) {
        wordsWithTargets.add(word);
      }
    });
  });
  
  const wordWeights = dictionary.map(word => {
    let weight = 1;
    
    for (const char of word) {
      const letterTime = timingHistory.letters[char];
      if (letterTime) {
        weight += letterTime / 1000;
      }
    }
    
    for (let i = 0; i < word.length - 1; i++) {
      const bigram = word.slice(i, i + 2);
      const bigramTime = timingHistory.bigrams[bigram];
      if (bigramTime) {
        weight += (bigramTime / 2) / 500;
      }
    }
    
    if (wordsWithTargets.has(word)) {
      weight *= 2;
    }
    
    return { word, weight };
  });

  const sortedWords = wordWeights.sort((a, b) => b.weight - a.weight);
  const topTenPercent = sortedWords.slice(0, Math.floor(sortedWords.length * 0.1));
  
  const result: string[] = [];
  
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
  
  const remainingCount = count - result.length;
  const weightedCount = Math.floor(remainingCount / 2);
  
  for (let i = 0; i < weightedCount; i++) {
    const word = topTenPercent[i % topTenPercent.length].word;
    if (!result.includes(word)) {
      result.push(word);
    }
  }
  
  while (result.length < count) {
    const randomWord = dictionary[Math.floor(Math.random() * dictionary.length)];
    if (!result.includes(randomWord)) {
      result.push(randomWord);
    }
  }
  
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