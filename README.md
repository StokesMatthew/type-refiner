# Type Refiner

A sophisticated typing practice application that helps you improve your typing speed and accuracy by analyzing your performance and targeting your weak points.

## Features

- Real-time typing speed (WPM) and accuracy tracking
- Performance analysis for letters, bigrams (letter combinations), and words
- Smart word selection that prioritizes challenging words based on:
  - Historical typing speed
  - Recent mistakes
  - Difficult letter combinations
- Detailed statistics and performance graphs
- Progress tracking across sessions
- Strict mode for enforcing accurate typing
- Target highlighting for problematic patterns

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/type-refiner.git
cd type-refiner
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm start
# or
yarn start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Start typing the displayed words
2. The cursor will automatically move to the next word when you press space
3. In strict mode, you must correct mistakes before moving to the next word
4. After completing the test, view your results and analysis
5. Toggle between current and overall statistics to track your progress

## Features in Detail

### Performance Tracking
- Words Per Minute (WPM) calculation
- Accuracy percentage
- Real-time performance graph
- Historical performance tracking

### Analysis
- Letter timing analysis
- Bigram (letter combination) analysis
- Word-specific performance tracking
- Mistake tracking for targeted practice

### Customization
- Strict Mode: Requires correct typing before proceeding
- Hide Targets: Removes highlighting of challenging patterns
- Performance view toggle between current and overall statistics

### Data Management
- Automatic saving of progress
- Option to delete historical data
- Persistent storage across sessions

## Technical Details

Built with:
- React
- TypeScript
- CSS Modules
- Local Storage for data persistence

## License

This project is licensed under the MIT License - see the LICENSE file for details
