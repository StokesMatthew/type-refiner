import React, { useEffect } from 'react';
import './App.css';
import TypingGame from './components/TypingGame';
import { applyTheme } from './utils/theme';

function App() {

  useEffect(() => {
    applyTheme();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Type Refiner</h1>
        <p>Improve your typing speed and identify your weak spots</p>
      </header>
      <main>
        <TypingGame />
      </main>
    </div>
  );
}

export default App;
