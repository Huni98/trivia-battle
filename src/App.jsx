import { useState, useEffect } from 'react';
import './App.css';

const decodeHTML = (html) => {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
};

function App() {
  const [gameState, setGameState] = useState('menu'); 
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);

  const [answers, setAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10); 

  // --- Módosított State-ek ---
  const [playerName, setPlayerName] = useState("");
  const [allPlayers, setAllPlayers] = useState([]); // Itt tároljuk az ÖSSZES játékost
  const [personalBestBeaten, setPersonalBestBeaten] = useState(false);

  // Betöltéskor beolvassuk az összes eddigi játékost
  useEffect(() => {
    const savedPlayers = JSON.parse(localStorage.getItem('triviaAllPlayers')) || [];
    setAllPlayers(savedPlayers);
  }, []);

  const startGame = async (difficulty) => {
    setLoading(true);
    setScore(0);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setPersonalBestBeaten(false);

    try {
      const response = await fetch(`https://opentdb.com/api.php?amount=5&category=18&difficulty=${difficulty}&type=multiple`);
      const data = await response.json();
      setQuestions(data.results);
      setGameState('playing');
    } catch (error) {
      console.error("Hiba az API hívás során:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (questions.length > 0 && currentIndex < questions.length) {
      const currentQ = questions[currentIndex];
      const allAnswers = [...currentQ.incorrect_answers, currentQ.correct_answer];
      const shuffled = allAnswers.sort(() => Math.random() - 0.5);
      
      setAnswers(shuffled);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimeLeft(10); 
    }
  }, [questions, currentIndex]);

  useEffect(() => {
    if (gameState !== 'playing' || isAnswered || loading) return;

    if (timeLeft === 0) {
      handleAnswer(null);
      return;
    }

    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameState, isAnswered, loading]);

  const handleAnswer = (answer) => {
    if (isAnswered) return; 

    setSelectedAnswer(answer);
    setIsAnswered(true);

    const currentQ = questions[currentIndex];
    let currentScore = score; // Ideiglenes változó, hogy azonnal tudjuk a friss pontot

    if (answer === currentQ.correct_answer) {
      currentScore += 1;
      setScore(currentScore);
    }

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        finishGame(currentScore); // A játék végén lezárjuk és mentjük az eredményt
      }
    }, 1500);
  };

  // --- Eredmény automatikus feldolgozása a játék végén ---
  const finishGame = (finalScore) => {
    let updatedPlayers = [...allPlayers];
    const trimmedName = playerName.trim();
    
    // Megkeressük, létezik-e már ez a név a mentett adatok között (kisbetűsítsük, hogy a "Peti" és "peti" ugyanaz legyen)
    const existingPlayerIndex = updatedPlayers.findIndex(
      p => p.name.toLowerCase() === trimmedName.toLowerCase()
    );

    let isNewBest = false;

    if (existingPlayerIndex !== -1) {
      // Ha már létezik, ellenőrizzük, hogy a mostani pont nagyobb-e
      if (finalScore > updatedPlayers[existingPlayerIndex].score) {
        updatedPlayers[existingPlayerIndex].score = finalScore;
        isNewBest = true;
      }
    } else {
      // Ha új játékos, hozzáadjuk a listához
      updatedPlayers.push({ name: trimmedName, score: finalScore });
      isNewBest = true;
    }

    setAllPlayers(updatedPlayers);
    localStorage.setItem('triviaAllPlayers', JSON.stringify(updatedPlayers));
    setPersonalBestBeaten(isNewBest);
    setGameState('end');
  };

  const currentQ = questions[currentIndex];
  
  // A UI-hoz kirendereljük a Top 5-öt csökkenő sorrendben
  const top5 = [...allPlayers].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <div className="trivia-container">
      <div className="trivia-card">
        <h1 className="trivia-title">🎮 Trivia Battle</h1>

        {/* 1. KEZDŐKÉPERNYŐ */}
        {gameState === 'menu' && (
          <div>
            {/* Név megadása Listás kiegészítéssel */}
            <h3 className="subtitle" style={{ marginBottom: '10px' }}>Ki játszik most?</h3>
            <input 
              type="text" 
              className="name-input"
              placeholder="Írd be vagy válaszd ki a neved..." 
              value={playerName} 
              onChange={(e) => setPlayerName(e.target.value)} 
              list="saved-players" // Ezzel kötjük össze a datalist-tel
              style={{ marginBottom: '5px' }}
            />
            
            {/* Ez a datalist csinálja a legördülő menüt a már mentett nevekkel */}
            <datalist id="saved-players">
              {allPlayers.map((player, idx) => (
                <option key={idx} value={player.name} />
              ))}
            </datalist>

            {!playerName.trim() && (
              <div className="warning-text">A játék indításához add meg a neved!</div>
            )}

            <h3 className="subtitle" style={{ marginTop: '20px' }}>Válassz nehézségi szintet!</h3>
            <div className="btn-container">
              <button className="difficulty-btn btn-easy" disabled={!playerName.trim()} onClick={() => startGame('easy')}>Könnyű</button>
              <button className="difficulty-btn btn-medium" disabled={!playerName.trim()} onClick={() => startGame('medium')}>Közepes</button>
              <button className="difficulty-btn btn-hard" disabled={!playerName.trim()} onClick={() => startGame('hard')}>Nehéz</button>
            </div>
            
            {/* Top 5 Lista */}
            {top5.length > 0 && (
              <div style={{ marginTop: '40px' }}>
                <h4 className="subtitle" style={{ marginBottom: '10px' }}>🏆 Top 5 Játékos 🏆</h4>
                <ul className="leaderboard-list">
                  {top5.map((entry, idx) => (
                    <li key={idx} className="leaderboard-item">
                      <span>{idx + 1}. {entry.name}</span>
                      <span>{entry.score} pont</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 2. BETÖLTÉS */}
        {loading && <h3 className="subtitle">Kérdések betöltése...</h3>}

        {/* 3. JÁTÉK NÉZET */}
        {gameState === 'playing' && !loading && currentQ && (
          <div>
            <div className="game-header">
              <span>Kérdés: {currentIndex + 1} / {questions.length}</span>
              <span>⏳ {timeLeft} mp</span>
            </div>
            <div className="progress-bar-container">
              <div 
                className={`progress-bar-fill ${timeLeft <= 3 ? 'progress-bar-danger' : ''}`}
                style={{ width: `${(timeLeft / 10) * 100}%` }}
              ></div>
            </div>
            <h2 className="question-text">{decodeHTML(currentQ.question)}</h2>
            <div className="answers-grid">
              {answers.map((answer, index) => {
                let btnClass = "answer-btn";
                if (isAnswered) {
                  if (answer === currentQ.correct_answer) {
                    btnClass += " correct";
                  } else if (answer === selectedAnswer) {
                    btnClass += " incorrect";
                  }
                }
                return (
                  <button
                    key={index}
                    className={btnClass}
                    onClick={() => handleAnswer(answer)}
                    disabled={isAnswered}
                  >
                    {decodeHTML(answer)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. JÁTÉK VÉGE */}
        {gameState === 'end' && (
          <div>
            <h2 className="subtitle">Játék Vége!</h2>
            <p className="question-text">
              Szép volt, <span style={{ color: '#2980b9' }}>{playerName}</span>! <br />
              Elért pontszámod: <span style={{ color: '#27ae60' }}>{score}</span> / {questions.length}
            </p>
            
            {/* Visszajelzés a rekorddöntésről */}
            {personalBestBeaten ? (
              <p style={{ color: '#f39c12', fontWeight: 'bold', fontSize: '1.2rem' }}>
                🎉 Új egyéni csúcs! A listát frissítettük. 🎉
              </p>
            ) : (
              <p style={{ color: '#7f8c8d' }}>
                Nem sikerült megdönteni a korábbi rekordodat.
              </p>
            )}

            <div style={{ marginTop: '30px' }}>
              <h3 className="subtitle">🏆 Dicsőséglista (Top 5) 🏆</h3>
              <ul className="leaderboard-list">
                {top5.map((entry, idx) => (
                  <li key={idx} className="leaderboard-item">
                    <span>{idx + 1}. {entry.name}</span>
                    <span>{entry.score} pont</span>
                  </li>
                ))}
              </ul>
            </div>

            <button className="difficulty-btn btn-restart" onClick={() => setGameState('menu')}>
              Vissza a menübe
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;