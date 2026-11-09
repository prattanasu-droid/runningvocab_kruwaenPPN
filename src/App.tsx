/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GeminiRunnerEngine } from './game/threeScene';
import {
  DifficultyLevelInfo,
  GamePhase,
  LeaderboardEntry,
  WordCompletionSummary,
  WordEntry,
} from './types/game';
import { getDifficultyForScore, getRandomWord } from './data/words';
import { soundManager } from './audio/soundManager';
import {
  fetchLeaderboardFromGoogleSheet,
  getLeaderboardEntries,
  getSavedPlayerName,
  recordPlayerScoreAndSync,
  savePlayerName,
} from './services/leaderboardService';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { WordTranslationModal } from './components/WordTranslationModal';
import { GameOverModal } from './components/GameOverModal';
import { WordNotebookModal } from './components/WordNotebookModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { MobileControls } from './components/MobileControls';
import { Play, RotateCcw, Home, Medal } from 'lucide-react';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GeminiRunnerEngine | null>(null);

  // Player Profile & Mode
  const [playerName, setPlayerName] = useState<string>(() => getSavedPlayerName());
  const [wordPoolMode, setWordPoolMode] = useState<'auto' | 'easy' | 'medium' | 'hard'>('auto');

  // Game Lifecycle & Stats
  const [phase, setPhase] = useState<GamePhase>('title');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('gemini_runner_highscore') || '0', 10);
    } catch {
      return 0;
    }
  });
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [distance, setDistance] = useState<number>(0);
  const [sessionPlaytime, setSessionPlaytime] = useState<number>(0);
  const [savedTotalPlaytime, setSavedTotalPlaytime] = useState<number>(() => {
    try {
      return parseFloat(localStorage.getItem('gemini_runner_total_playtime') || '0');
    } catch {
      return 0;
    }
  });
  const [levelInfo, setLevelInfo] = useState<DifficultyLevelInfo>(() => getDifficultyForScore(0));
  const [lastPointsPopup, setLastPointsPopup] = useState<{
    points: number;
    label: string;
    id: number;
  } | null>(null);

  const [hp, setHp] = useState<number>(3);
  const [maxHp] = useState<number>(3);
  const [streakCount, setStreakCount] = useState<number>(0);

  // Vocabulary System
  const [currentWord, setCurrentWord] = useState<WordEntry | null>(null);
  const [collectedCount, setCollectedCount] = useState<number>(0);
  const [unlockedWordIds, setUnlockedWordIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gemini_runner_unlocked_words');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [sessionWords, setSessionWords] = useState<WordEntry[]>([]);
  const [wordCompletionSummary, setWordCompletionSummary] =
    useState<WordCompletionSummary | null>(null);

  // Leaderboard & Modals
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>(() =>
    getLeaderboardEntries()
  );
  const [syncedToSheet, setSyncedToSheet] = useState<boolean>(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.getMuted());

  useEffect(() => {
    fetchLeaderboardFromGoogleSheet().then((remote) => {
      if (remote && remote.length > 0) {
        setLeaderboardEntries(remote);
      }
    });
  }, []);

  // Refs to access latest state inside Three.js engine callbacks without re-creating the WebGL canvas
  const stateRef = useRef({
    playerName,
    highScore,
    streakCount,
    savedTotalPlaytime,
    sessionPlaytime,
    score,
    sessionWords,
    levelInfo,
  });
  useEffect(() => {
    stateRef.current = {
      playerName,
      highScore,
      streakCount,
      savedTotalPlaytime,
      sessionPlaytime,
      score,
      sessionWords,
      levelInfo,
    };
  }, [
    playerName,
    highScore,
    streakCount,
    savedTotalPlaytime,
    sessionPlaytime,
    score,
    sessionWords,
    levelInfo,
  ]);

  const handleChangePlayerName = useCallback((name: string) => {
    setPlayerName(name);
    savePlayerName(name);
  }, []);

  // Engine Callback: Stats Update
  const handleStatsUpdate = useCallback(
    (
      newScore: number,
      newDist: number,
      newSessionPlaytime: number,
      newLevelInfo: DifficultyLevelInfo
    ) => {
      setScore(newScore);
      setDistance(newDist);
      setSessionPlaytime(newSessionPlaytime);
      setLevelInfo(newLevelInfo);

      setHighScore((prev) => {
        if (newScore > prev) {
          setIsNewHighScore(true);
          try {
            localStorage.setItem('gemini_runner_highscore', String(newScore));
          } catch {
            // ignore
          }
          return newScore;
        }
        return prev;
      });
    },
    []
  );

  // Engine Callback: Letter Collected
  const handleLetterCollected = useCallback(
    (char: string, index: number, pointsAdded: number, newScore: number) => {
      setCollectedCount(index + 1);
      setScore(newScore);
      setLastPointsPopup({
        points: pointsAdded,
        label: `ตัวอักษร ${char}`,
        id: Date.now() + Math.random(),
      });
      soundManager.playLetterCollect(index);
    },
    []
  );

  // Engine Callback: Word Completed
  const handleWordCompleted = useCallback(
    (
      word: WordEntry,
      wordPoints: number,
      letterPointsEarned: number,
      newTotalScore: number,
      previousLevel: number,
      newLevelInfo: DifficultyLevelInfo
    ) => {
      soundManager.playWordCompleteFanfare();
      if (engineRef.current) {
        engineRef.current.pause();
      }

      setUnlockedWordIds((prev) => {
        if (!prev.includes(word.id)) {
          const next = [...prev, word.id];
          try {
            localStorage.setItem('gemini_runner_unlocked_words', JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        }
        return prev;
      });

      setSessionWords((prev) => (prev.some((w) => w.id === word.id) ? prev : [...prev, word]));

      const nextStreak = stateRef.current.streakCount + 1;
      setStreakCount(nextStreak);
      const streakBonus = nextStreak > 1 ? (nextStreak - 1) * 50 : 0;
      const totalEarnedThisWord = letterPointsEarned + wordPoints + streakBonus;

      const updatedHigh = Math.max(stateRef.current.highScore, newTotalScore);
      const beatHigh = newTotalScore > stateRef.current.highScore && newTotalScore > 0;
      if (beatHigh) {
        setHighScore(updatedHigh);
        setIsNewHighScore(true);
        try {
          localStorage.setItem('gemini_runner_highscore', String(updatedHigh));
        } catch {
          // ignore
        }
      }

      setWordCompletionSummary({
        word,
        wordPoints,
        letterPointsEarned,
        streakBonus,
        totalEarnedThisWord,
        newTotalScore,
        highScore: updatedHigh,
        isNewHighScore: beatHigh,
        previousLevel,
        newLevelInfo,
      });

      setPhase('word_modal');
    },
    []
  );

  // Engine Callback: Heart Collected in Stage
  const handleHeartCollected = useCallback((newHp: number) => {
    soundManager.playHeartCollect();
    setHp(newHp);
    setLastPointsPopup({
      points: 1,
      label: 'หัวใจ ❤️',
      id: Date.now() + Math.random(),
    });
  }, []);

  // Engine Callback: Level Up
  const handleLevelUp = useCallback((newLvl: DifficultyLevelInfo) => {
    setLevelInfo(newLvl);
  }, []);

  // Engine Callback: Player Hit
  const handlePlayerHit = useCallback((_damage: number, newHp: number) => {
    soundManager.playHit();
    setHp(newHp);
    setStreakCount(0);
  }, []);

  // Persist Playtime helper
  const commitSessionPlaytime = useCallback((runSecs: number) => {
    setSavedTotalPlaytime((prev) => {
      const updated = prev + runSecs;
      try {
        localStorage.setItem('gemini_runner_total_playtime', String(Math.round(updated)));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Engine Callback: Game Over
  const handleGameOver = useCallback(() => {
    soundManager.playGameOver();
    soundManager.stopBackgroundMusic();

    const current = stateRef.current;
    commitSessionPlaytime(current.sessionPlaytime);

    // Record score & player name into Leaderboard and sync to Google Sheets
    recordPlayerScoreAndSync({
      playerName: current.playerName || 'นักเรียน',
      score: current.score,
      wordsCount: current.sessionWords.length,
      levelReached: current.levelInfo.level,
      playtimeSeconds: current.sessionPlaytime,
    }).then((res) => {
      setLeaderboardEntries(res.allEntries);
      setSyncedToSheet(res.synced);
    });

    setPhase('game_over');
  }, [commitSessionPlaytime]);

  // Initialize Three.js Engine once on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new GeminiRunnerEngine(mountRef.current, {
      onLetterCollected: (char, idx, pts, newScore) =>
        handleLetterCollected(char, idx, pts, newScore),
      onWordCompleted: (word, wPts, lPts, totalScore, prevLvl, newLvl) =>
        handleWordCompleted(word, wPts, lPts, totalScore, prevLvl, newLvl),
      onHeartCollected: (newHp) => handleHeartCollected(newHp),
      onLevelUp: (newLvl) => handleLevelUp(newLvl),
      onPlayerHit: (dmg, newHp) => handlePlayerHit(dmg, newHp),
      onStatsUpdate: (s, d, t, lvl) => handleStatsUpdate(s, d, t, lvl),
      onGameOver: () => handleGameOver(),
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [
    handleLetterCollected,
    handleWordCompleted,
    handleHeartCollected,
    handleLevelUp,
    handlePlayerHit,
    handleStatsUpdate,
    handleGameOver,
  ]);

  // Helper to pick a word based on selected mode & score level
  const pickNextWord = useCallback(
    (forScore: number, excludedIds: string[] = []): WordEntry => {
      const lvl = getDifficultyForScore(forScore);
      const targetDiff = wordPoolMode === 'auto' ? lvl.wordDifficulty : wordPoolMode;
      return getRandomWord(targetDiff, excludedIds);
    },
    [wordPoolMode]
  );

  // Start Run Function
  const startNewRun = useCallback(() => {
    const firstWord = pickNextWord(0);
    setCurrentWord(firstWord);
    setCollectedCount(0);
    setScore(0);
    setIsNewHighScore(false);
    setDistance(0);
    setSessionPlaytime(0);
    setLevelInfo(getDifficultyForScore(0));
    setLastPointsPopup(null);
    setHp(3);
    setStreakCount(0);
    setSessionWords([]);
    setWordCompletionSummary(null);
    setSyncedToSheet(false);
    setPhase('playing');

    soundManager.startBackgroundMusic();

    if (engineRef.current) {
      engineRef.current.start(firstWord, 0);
    }
  }, [pickNextWord]);

  // Continue to Next Word from Word Translation Modal
  const continueToNextWord = useCallback(() => {
    setWordCompletionSummary(null);
    setPhase('playing');

    if (engineRef.current) {
      const nextWord = pickNextWord(score, [currentWord?.id || '']);
      setCurrentWord(nextWord);
      setCollectedCount(0);
      engineRef.current.setWordAndResume(nextWord);
    }
  }, [pickNextWord, score, currentWord]);

  // Pause / Resume Handlers
  const togglePause = useCallback(() => {
    setPhase((prev) => {
      if (prev === 'playing') {
        engineRef.current?.pause();
        return 'paused';
      } else if (prev === 'paused') {
        engineRef.current?.resume();
        return 'playing';
      }
      return prev;
    });
  }, []);

  // Sound toggle
  const toggleMute = useCallback(() => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  }, []);

  // Keyboard Navigation Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Never intercept keys if user is typing in an input or textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') {
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'Escape') {
        if (phase === 'playing' || phase === 'paused') {
          togglePause();
        }
        return;
      }

      if (phase !== 'playing') return;

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        soundManager.playLaneSwitch();
        engineRef.current?.moveLeft();
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        soundManager.playLaneSwitch();
        engineRef.current?.moveRight();
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') {
        soundManager.playJump();
        engineRef.current?.jump();
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        soundManager.playSlide();
        engineRef.current?.slide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, togglePause]);

  // Pause on window blur
  useEffect(() => {
    const handleBlur = () => {
      if (phase === 'playing') {
        togglePause();
      }
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [phase, togglePause]);

  const combinedTotalPlaytime = savedTotalPlaytime + (phase === 'game_over' ? 0 : sessionPlaytime);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Isolated Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Title Screen */}
      {phase === 'title' && (
        <TitleScreen
          playerName={playerName}
          highScore={highScore}
          totalPlaytime={combinedTotalPlaytime}
          totalWordsLearned={unlockedWordIds.length}
          wordPoolMode={wordPoolMode}
          isMuted={isMuted}
          onChangePlayerName={handleChangePlayerName}
          onSetWordPoolMode={setWordPoolMode}
          onStart={startNewRun}
          onOpenNotebook={() => setIsNotebookOpen(true)}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onToggleMute={toggleMute}
        />
      )}

      {/* In-Game HUD */}
      {(phase === 'playing' || phase === 'paused') && (
        <HUD
          score={score}
          highScore={highScore}
          distance={distance}
          sessionPlaytime={sessionPlaytime}
          totalPlaytime={combinedTotalPlaytime}
          levelInfo={levelInfo}
          lastPointsPopup={lastPointsPopup}
          hp={hp}
          maxHp={maxHp}
          currentWord={currentWord}
          collectedCount={collectedCount}
          isMuted={isMuted}
          streakCount={streakCount}
          onToggleMute={toggleMute}
          onPause={togglePause}
          onOpenNotebook={() => {
            engineRef.current?.pause();
            setPhase('paused');
            setIsNotebookOpen(true);
          }}
        />
      )}

      {/* Mobile & Tablet Touch Controls + Swipe Gestures */}
      {phase === 'playing' && (
        <MobileControls
          onLeft={() => {
            soundManager.playLaneSwitch();
            engineRef.current?.moveLeft();
          }}
          onRight={() => {
            soundManager.playLaneSwitch();
            engineRef.current?.moveRight();
          }}
          onJump={() => {
            soundManager.playJump();
            engineRef.current?.jump();
          }}
          onSlide={() => {
            soundManager.playSlide();
            engineRef.current?.slide();
          }}
        />
      )}

      {/* Word Completed Thai Translation Pop-up Window */}
      {phase === 'word_modal' && wordCompletionSummary && (
        <WordTranslationModal
          summary={wordCompletionSummary}
          streakCount={streakCount}
          sessionPlaytime={sessionPlaytime}
          totalPlaytime={combinedTotalPlaytime}
          onContinue={continueToNextWord}
          onOpenNotebook={() => setIsNotebookOpen(true)}
        />
      )}

      {/* Pause Modal */}
      {phase === 'paused' && !isNotebookOpen && !isLeaderboardOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-950 p-6 text-white text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-cyan-300">พักเกม (PAUSED)</h2>
            <p className="mt-1 text-xs text-slate-400">
              ผู้เล่น: <strong className="text-white">{playerName || 'นักเรียน'}</strong> · คะแนน{' '}
              {score.toLocaleString()}
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={togglePause}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>เล่นต่อ (Resume)</span>
              </button>

              <button
                onClick={() => setIsLeaderboardOpen(true)}
                className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-sm font-medium flex items-center justify-center gap-2"
              >
                <Medal className="w-4 h-4 text-amber-400" />
                <span>ดูตารางอันดับคะแนน</span>
              </button>

              <button
                onClick={startNewRun}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>เริ่มรอบใหม่ (Restart)</span>
              </button>

              <button
                onClick={() => {
                  soundManager.stopBackgroundMusic();
                  commitSessionPlaytime(sessionPlaytime);
                  setPhase('title');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-sm font-medium flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>กลับหน้าหลัก (Title Screen)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {phase === 'game_over' && (
        <GameOverModal
          playerName={playerName}
          score={score}
          highScore={highScore}
          isNewHighScore={isNewHighScore}
          distance={distance}
          sessionPlaytime={sessionPlaytime}
          totalPlaytime={savedTotalPlaytime}
          levelInfo={levelInfo}
          wordsCollected={sessionWords}
          leaderboardEntries={leaderboardEntries}
          syncedToSheet={syncedToSheet}
          onRetry={startNewRun}
          onHome={() => setPhase('title')}
          onOpenNotebook={() => setIsNotebookOpen(true)}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        />
      )}

      {/* Vocabulary Notebook Modal */}
      {isNotebookOpen && (
        <WordNotebookModal
          unlockedWordIds={unlockedWordIds}
          onClose={() => setIsNotebookOpen(false)}
        />
      )}

      {/* Leaderboard & Google Sheet Modal */}
      {isLeaderboardOpen && (
        <LeaderboardModal
          entries={leaderboardEntries}
          currentPlayerName={playerName}
          onUpdateEntries={setLeaderboardEntries}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      )}
    </div>
  );
}
