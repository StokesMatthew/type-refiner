import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TimingHistory, PerformancePoint } from '../../types/types';
import { calculateLetterStats, calculateBigramStats, calculateOverallLetterStats, calculateOverallBigramStats } from '../../utils/utils';
import './ResultsScreen.css';

interface ResultsScreenProps {
  performanceData: PerformancePoint[];
  timingHistory: TimingHistory;
  showingOverall: boolean;
  selectedTab: 'letters' | 'bigrams' | 'words';
  words: string[];
  wordIndex: number;
  completedInputs: string[];
  currentInput: string;
  typeTimings: { letters: { [key: string]: number[] }, bigrams: { [key: string]: number[] }, words: { [key: string]: number[] } };
  onTabChange: (tab: 'letters' | 'bigrams' | 'words') => void;
  onToggleOverall: () => void;
  onReset: () => void;
  onDeleteData: () => void;
  calculateWordStats: () => { word: string; averageTime: number; occurrences: number; mistypes: number; }[];
  calculateOverallWordStats: () => { word: string; averageTime: number; occurrences: number; mistypes: number; }[];
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({
  performanceData,
  timingHistory,
  showingOverall,
  selectedTab,
  words,
  wordIndex,
  completedInputs,
  currentInput,
  typeTimings,
  onTabChange,
  onToggleOverall,
  onReset,
  onDeleteData,
  calculateWordStats,
  calculateOverallWordStats
}) => {
  // Calculate average WPM and accuracy across all typing sessions
  const calculateOverallStats = () => {
    if (timingHistory.historicalPerformance.length === 0) return null;
    
    const totalWPM = timingHistory.historicalPerformance.reduce((sum, game) => sum + game.wpm, 0);
    const totalAccuracy = timingHistory.historicalPerformance.reduce((sum, game) => sum + game.accuracy, 0);
    const gamesCount = timingHistory.historicalPerformance.length;
    
    return {
      wpm: Math.round(totalWPM / gamesCount * 100) / 100,
      accuracy: Math.round(totalAccuracy / gamesCount * 100) / 100
    };
  };

  const overallStats = calculateOverallStats();

  return (
    <div className="results-container">
      <h2>Results</h2>
      
      {(timingHistory.historicalPerformance.length > 1) && (
        <div className="stats-tabs">
          <div className="tab-row">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showingOverall}
                onChange={onToggleOverall}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">{showingOverall ? 'Overall' : 'Current'}</span>
            </label>
          </div>
        </div>
      )}

      <div className="overall-stats">
        <div className="stat-box">
          <h3>Speed</h3>
          <div className="stat-value">
            {showingOverall && overallStats 
              ? `${overallStats.wpm} WPM`
              : `${performanceData[performanceData.length - 1].wpm} WPM`}
          </div>
        </div>
        <div className="stat-box">
          <h3>Accuracy</h3>
          <div className="stat-value">
            {showingOverall && overallStats
              ? `${overallStats.accuracy}%`
              : `${performanceData[performanceData.length - 1].accuracy}%`}
          </div>
        </div>
      </div>
      
      <h3>{timingHistory.historicalPerformance.length > 1 && showingOverall ? 'Overall' : 'Current'} Performance</h3>
      <div className="performance-graph">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart 
            data={timingHistory.historicalPerformance.length > 1 && showingOverall ? timingHistory.historicalPerformance : performanceData} 
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          >
            <CartesianGrid vertical={true} horizontal={false} />
            <XAxis 
              dataKey={showingOverall ? undefined : "wordIndex"}
              label={{ 
                value: showingOverall ? 'Games Completed' : 'Words Typed', 
                position: 'bottom' 
              }}
              interval={showingOverall ? 0 : 0}
              tickFormatter={(value, index) => `${index + 1}`}
            />
            <YAxis 
              yAxisId="left"
              domain={[0, Math.ceil(Math.max(
                ...(showingOverall ? 
                  timingHistory.historicalPerformance.map(d => d.wpm) : 
                  performanceData.map(d => d.wpm)
                )) / 10) * 10]} 
              ticks={Array.from(
                { length: Math.floor(Math.ceil(Math.max(
                  ...(showingOverall ? 
                    timingHistory.historicalPerformance.map(d => d.wpm) : 
                    performanceData.map(d => d.wpm)
                  )) / 10) * 10 / 10) + 1 }, 
                (_, i) => i * 10
              )}
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
              labelFormatter={(label: any) => 
                showingOverall ? `Game ${Number(label) + 1}` : `Word ${Number(label) + 1}`
              }
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey={showingOverall ? "wpm" : "wpm"}
              stroke="#2196f3"
              strokeWidth={2}
              name="WPM"
              dot={showingOverall}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={showingOverall ? "accuracy" : "accuracy"}
              stroke="#4caf50"
              strokeWidth={2}
              name="Accuracy"
              dot={showingOverall}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="button-row">
        <div className="tab-row">
          <button 
            className={`tab-button ${selectedTab === 'letters' ? 'active' : ''}`}
            onClick={() => onTabChange('letters')}
          >
            Letter Analysis
          </button>
          <button 
            className={`tab-button ${selectedTab === 'bigrams' ? 'active' : ''}`}
            onClick={() => onTabChange('bigrams')}
          >
            Bigram Analysis
          </button>
          <button 
            className={`tab-button ${selectedTab === 'words' ? 'active' : ''}`}
            onClick={() => onTabChange('words')}
          >
            Word Analysis
          </button>
        </div>
      </div>
      {selectedTab === 'letters' && (
        <div className="letter-stats">
          <h3>{showingOverall ? 'Overall' : 'Current'} Letter Analysis</h3>
          <div className="stats-grid">
            {(showingOverall ? calculateOverallLetterStats(words, wordIndex, completedInputs, currentInput, typeTimings.letters, timingHistory) : calculateLetterStats(words, wordIndex, completedInputs, currentInput, typeTimings.letters)).map(({ letter, averageTime, occurrences }) => (
              <div key={letter} className="stat-item">
                <span className={`letter ${calculateLetterStats(words, wordIndex, completedInputs, currentInput, typeTimings.letters).some((stat) => stat.letter === letter) ? '' : 'seen'}`}>
                  {letter === ' ' ? '␣' : letter}
                </span>
                <span className="time">{averageTime.toFixed(0)}ms</span>
                <span className="occurrences">
                  {occurrences} {'times'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedTab === 'bigrams' && (
        <div className="letter-stats">
          <h3>{showingOverall ? 'Overall' : 'Current'} Bigram Analysis</h3>
          <div className="stats-grid">
            {(showingOverall ? calculateOverallBigramStats(words, wordIndex, completedInputs, currentInput, typeTimings.letters, timingHistory) 
                : calculateBigramStats(words, wordIndex, completedInputs, currentInput, typeTimings.bigrams)).map(({ bigram, averageTime, occurrences }) => (
              <div key={bigram} className="stat-item">
                <span className={`letter ${calculateBigramStats(words, wordIndex, completedInputs, currentInput, typeTimings.bigrams).some((stat) => stat.bigram === bigram) ? '' : 'seen'}`}>
                  {bigram}
                </span>
                <span className="time">{averageTime}ms</span>
                <span className="occurrences">
                  {occurrences} {'times'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedTab === 'words' && (
        <div className="letter-stats">
          <h3>{showingOverall ? 'Overall' : 'Current'} Word Analysis</h3>
          <div className="stats-grid">
            {(showingOverall ? calculateOverallWordStats() : calculateWordStats()).map(({ word, averageTime, occurrences, mistypes }) => (
              <div key={word} className="stat-item">
                <span className={`letter ${calculateWordStats().some((stat) => stat.word === word) ? '' : 'seen'}`}>
                  {word}
                </span>
                <span className="time">{averageTime}ms</span>
                <div className="stat-details">
                  <div className="occurrences">
                    {occurrences} {'times'}
                  </div>
                  <div className="mistypes">
                    {mistypes} {'mistypes'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="button-row">
        <button 
          onClick={onDeleteData}
          className="delete-button"
        >
          Delete Data
        </button>

        <button onClick={onReset} className="reset-button">
          Try Again
        </button>
      </div>
    </div>
  );
};

export default ResultsScreen; 