import React, { useEffect, useRef, useState } from 'react';
import { formatPlaytime } from '../data/words';
import {
  Play,
  BookOpen,
  Volume2,
  VolumeX,
  Sparkles,
  Trophy,
  Clock,
  User,
  Medal,
} from 'lucide-react';

interface TitleScreenProps {
  playerName: string;
  highScore: number;
  totalPlaytime: number;
  totalWordsLearned: number;
  wordPoolMode: 'auto' | 'easy' | 'medium' | 'hard';
  isMuted: boolean;
  onChangePlayerName: (name: string) => void;
  onSetWordPoolMode: (mode: 'auto' | 'easy' | 'medium' | 'hard') => void;
  onStart: () => void;
  onOpenNotebook: () => void;
  onOpenLeaderboard: () => void;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  playerName,
  highScore,
  totalPlaytime,
  totalWordsLearned,
  wordPoolMode,
  isMuted,
  onChangePlayerName,
  onSetWordPoolMode,
  onStart,
  onOpenNotebook,
  onOpenLeaderboard,
  onToggleMute,
}) => {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [nameError, setNameError] = useState(false);

  const handleTryStart = () => {
    if (!playerName.trim()) {
      setNameError(true);
      nameInputRef.current?.focus();
      return;
    }
    setNameError(false);
    onStart();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputFocused = activeTag === 'input' || activeTag === 'textarea';

      if (e.code === 'Enter') {
        e.preventDefault();
        handleTryStart();
      } else if (e.code === 'Space' && !isInputFocused) {
        e.preventDefault();
        handleTryStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-4 sm:p-6 md:p-8 text-white select-none pointer-events-auto bg-gradient-to-b from-slate-950/80 via-slate-950/35 to-slate-950/95 overflow-y-auto">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/35 text-amber-300 text-xs">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>
              คะแนนสูงสุด: <strong className="tabular-nums">{highScore.toLocaleString()}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/35 text-emerald-300 text-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              เวลาเล่นสะสม: <strong className="tabular-nums">{formatPlaytime(totalPlaytime)}</strong>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/35 text-cyan-300 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              คำศัพท์ที่ค้นพบ: <strong className="tabular-nums">{totalWordsLearned}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLeaderboard}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Medal className="w-4 h-4 text-amber-400" />
            <span>อันดับคะแนน (Google Sheet)</span>
          </button>

          <button
            onClick={onOpenNotebook}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>สมุดคำศัพท์ ป.4-6</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            )}
          </button>
        </div>
      </div>

      {/* Hero Centerpiece */}
      <div className="my-auto py-3 text-center flex flex-col items-center max-w-xl mx-auto w-full">
        <div className="mb-1.5 w-16 h-16 md:w-20 md:h-20">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full drop-shadow-[0_0_25px_rgba(6,182,212,0.8)]"
          >
            <defs>
              <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#e879f9" />
              </linearGradient>
            </defs>
            <path
              d="M 50 5 Q 50 50 95 50 Q 50 50 50 95 Q 50 50 5 50 Q 50 50 50 5 Z"
              fill="url(#geminiGrad)"
            />
            <polygon points="50,28 65,50 50,72 35,50" fill="#ffffff" opacity="0.9" />
          </svg>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-100 to-fuchsia-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]">
          GEMINI WORD RUNNER
        </h1>
        <p className="mt-1 text-sm sm:text-base md:text-lg font-medium text-cyan-200">
          เกม 3D วิ่งกระโดดเก็บคำศัพท์ภาษาอังกฤษ <span className="text-amber-300">ชั้น ป.4 - ป.6</span> พร้อมคำแปลภาษาไทย!
        </p>

        {/* Player Name Input Card (พิมพ์ชื่อผู้เล่นก่อนเข้า) */}
        <div className="mt-4 w-full max-w-md p-3.5 rounded-2xl bg-slate-900/95 border border-cyan-500/40 shadow-xl">
          <label
            htmlFor="player-name-input"
            className="block text-xs text-cyan-300 font-medium mb-1.5 text-left flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>ชื่อผู้เล่น / ชั้นเรียน (สำหรับบันทึกตารางคะแนน)</span>
            </span>
            {nameError && (
              <span className="text-rose-400 font-semibold">กรุณาพิมพ์ชื่อก่อนเริ่มเกม!</span>
            )}
          </label>
          <input
            id="player-name-input"
            ref={nameInputRef}
            type="text"
            maxLength={32}
            value={playerName}
            onChange={(e) => {
              onChangePlayerName(e.target.value);
              if (nameError && e.target.value.trim()) setNameError(false);
            }}
            placeholder="พิมพ์ชื่อเล่น หรือ ชื่อ-ชั้น (เช่น น้องปันปัน ป.5/1)"
            className={`w-full px-4 py-2.5 rounded-xl bg-slate-950 border text-white placeholder-slate-500 text-sm md:text-base font-medium focus:outline-none transition ${
              nameError
                ? 'border-rose-500 ring-2 ring-rose-500/40'
                : 'border-slate-700 focus:border-cyan-400'
            }`}
          />
        </div>

        {/* Grade / Difficulty Selection */}
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800">
          <button
            onClick={() => onSetWordPoolMode('auto')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              wordPoolMode === 'auto'
                ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            รวม ป.4-ป.6 (เลื่อนระดับตามคะแนน)
          </button>
          <button
            onClick={() => onSetWordPoolMode('easy')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              wordPoolMode === 'easy'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ระดับ ป.4 (4-5 ตัว)
          </button>
          <button
            onClick={() => onSetWordPoolMode('medium')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              wordPoolMode === 'medium'
                ? 'bg-fuchsia-500 text-white shadow-[0_0_12px_rgba(217,70,239,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ระดับ ป.5 (6 ตัว)
          </button>
          <button
            onClick={() => onSetWordPoolMode('hard')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              wordPoolMode === 'hard'
                ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ระดับ ป.6 (7-8 ตัว)
          </button>
        </div>

        {/* Start Game CTA */}
        <button
          onClick={handleTryStart}
          className="mt-4 px-9 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-bold text-lg md:text-xl shadow-[0_0_30px_rgba(6,182,212,0.6)] flex items-center gap-3 transition transform hover:scale-105 active:scale-95"
        >
          <Play className="w-6 h-6 fill-white" />
          <span>เริ่มวิ่งเก็บคำศัพท์ (Start Game)</span>
        </button>
      </div>

      {/* Flat Control-Hint Line */}
      <div className="text-center text-xs md:text-sm text-slate-400 tracking-wide">
        <span className="text-cyan-300">คีย์บอร์ด: A / D หรือ ← / →</span> เปลี่ยนเลน ซ้าย-ขวา &nbsp;·&nbsp;{' '}
        <span className="text-cyan-300">Space / W / ↑</span> กระโดด &nbsp;·&nbsp;{' '}
        <span className="text-cyan-300">S / ↓</span> สไลด์ &nbsp;·&nbsp;{' '}
        <span className="text-amber-300">มือถือ/แท็บเล็ต: ปัดหน้าจอ หรือกดปุ่มซ้าย-ขวา</span>
      </div>
    </div>
  );
};
