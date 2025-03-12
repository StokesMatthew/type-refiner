export interface LetterTiming {
  letter: string;
  averageTime: number;
  occurrences: number;
}

export interface LetterMistake {
  expected: string;
  typed: string;
  count: number;
}

export interface PerformancePoint {
  wordIndex: number;
  wpm: number;
  accuracy: number;
}

export interface BigramTiming {
  bigram: string;
  averageTime: number;
  occurrences: number;
}

export interface GamePerformance {
  wpm: number;
  accuracy: number;
}

export interface TimingHistory {
  letters: { [key: string]: number };  // letter -> average time
  bigrams: { [key: string]: number };  // bigram -> average time
  words: { [key: string]: number };    // word -> average time
  historicalLetters: { [key: string]: number[] };  // letter -> all times across games
  historicalBigrams: { [key: string]: number[] };  // bigram -> all times across games
  historicalWords: { [key: string]: number[] };    // word -> all times across games
  historicalPerformance: GamePerformance[];  // performance data for each completed game
  wordMistypes: { [key: string]: number };
} 