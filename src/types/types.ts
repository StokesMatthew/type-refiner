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
  letters: { [key: string]: number };
  bigrams: { [key: string]: number };
  words: { [key: string]: number };
  historicalLetters: { [key: string]: number[] };
  historicalBigrams: { [key: string]: number[] };
  historicalWords: { [key: string]: number[] };
  historicalPerformance: GamePerformance[];
  wordMistypes: { [key: string]: number };
} 

export interface UserPreferences {
  strictMode: boolean;
  hideTargets: boolean;
  selectedTab: 'letters' | 'bigrams' | 'words';
  showingOverall: boolean;
}