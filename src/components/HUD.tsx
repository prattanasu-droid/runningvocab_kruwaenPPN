import React, { useState } from 'react';
import { DifficultyLevelInfo, WordEntry } from '../types/game';
import { formatPlaytime } from '../data/words';
import {
  Heart,
  Volume2,
  VolumeX,
  Pause,
  BookOpen,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Trophy,
  Clock,
  Gauge,
} from 'lucide-react';

interface HUDProps {
  score: number;
  highScore: number;
  distance: number;
  sessionPlaytime: number;
  totalPlaytime: number;
  levelInfo: DifficultyLevelInfo;
  lastPointsPopup: { points: number; label: string; id: number } | null;
  hp: number;
  maxHp: number;
  currentWord: WordEntry | null;
  collectedCount: number;
  isMuted: boolean;
  streakCount: number;
  onToggleMute: () => void;
  onPause: () => void;
  onOpenNotebook: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  highScore,
  distance,
  sessionPlaytime,
  totalPlaytime,
  levelInfo,
  lastPointsPopup,
  hp,
  maxHp,
  currentWord,
  collectedCount,
  isMuted,
  streakCount,
  onToggleMute,
  onPause,
  onOpenNotebook,
}) => {
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);

  const wordLength = currentWord ? currentWord.word.length : 0;
  const wordChars = currentWord ? currentWord.word.split('') : [];

  // Calculate progress to next difficulty level based on score
  const levelProgressPct = levelInfo.nextLevelScore
    ? Math.min(
        100,
        Math.max(
          0,
          ((score - levelInfo.minScore) / (levelInfo.nextLevelScore - levelInfo.minScore)) * 100
        )
      )
    : 100;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20">
      {/* Top Left: Score, High Score, Playtime & Difficulty Level */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-auto">
        {/* Main Score & High Score Cluster */}
        <div className="relative flex flex-col px-3.5 py-2 rounded-xl bg-slate-950/90 border border-cyan-500/40 text-white shadow-lg">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-bold">
              คะแนน (SCORE)
            </span>
            <span className="font-mono text-2xl font-black text-cyan-200 tabular-nums">
              {score.toLocaleString()}
            </span>
          </div>

          <div className="mt-0.5 pt-1 border-t border-slate-800 flex items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-amber-300">
              <Trophy className="w-3 h-3 text-amber-400" />
              สูงสุด: <strong className="tabular-nums">{highScore.toLocaleString()}</strong>
            </span>
            <span>·</span>
            <span className="tabular-nums">{distance} ม.</span>
          </div>

          {/* Floating +Points Feedback Badge */}
          {lastPointsPopup && (
            <div
              key={lastPointsPopup.id}
              className="absolute -right-24 top-1 px-2.5 py-1 rounded-lg bg-fuchsia-950/95 border border-fuchsia-400/60 text-fuchsia-200 font-mono text-xs font-black shadow-lg animate-fadeIn"
            >
              +{lastPointsPopup.points} {lastPointsPopup.label}
            </div>
          )}
        </div>

        {/* Playtime & Dynamic Difficulty Level Badge */}
        <div className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-slate-950/85 border border-slate-800 text-xs font-mono">
          <div className="flex items-center justify-between gap-3 text-slate-300">
            <span className="flex items-center gap-1 text-cyan-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>เวลา: {formatPlaytime(sessionPlaytime)}</span>
            </span>
            <span className="text-[10px] text-slate-500">
              (รวม {formatPlaytime(totalPlaytime)})
            </span>
          </div>

          {/* Difficulty Level & Speed Indicator */}
          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 font-bold text-fuchsia-300">
              <Gauge className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Lv.{levelInfo.level}</span>
            </span>
            <span className="text-[11px] text-emerald-300 font-semibold">
              ความเร็ว {levelInfo.speedMultiplier}x
            </span>
          </div>

          {/* Level Progress Bar */}
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${levelInfo.badgeColor} transition-all duration-300`}
              style={{ width: `${levelProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top Center: Current Target English Word Letter Slots */}
      {currentWord && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
          <div className="flex items-center gap-1.5 md:gap-2 px-4 py-2 rounded-2xl bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            {wordChars.map((char, index) => {
              const isCollected = index < collectedCount;
              const isCurrentTarget = index === collectedCount;

              return (
                <div
                  key={index}
                  className={`relative flex items-center justify-center w-8 h-10 md:w-10 md:h-12 rounded-xl font-mono text-lg md:text-xl font-black transition-all duration-200 ${
                    isCollected
                      ? 'bg-gradient-to-b from-cyan-400 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.8)] scale-105'
                      : isCurrentTarget
                      ? 'bg-fuchsia-950/90 border-2 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_10px_rgba(217,70,239,0.5)]'
                      : 'bg-slate-900/90 border border-slate-700 text-slate-400'
                  }`}
                >
                  {char}

                  {isCurrentTarget && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-fuchsia-400" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Target Word Hint & Thai Meaning */}
          <div className="mt-1.5 px-3.5 py-1 rounded-full bg-slate-950/90 border border-slate-700/70 text-xs text-slate-200 font-medium flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              คำศัพท์ ({currentWord.gradeLevel}): <strong className="text-cyan-300">{currentWord.word}</strong>{' '}
              = <strong className="text-amber-300">{currentWord.thaiMeaning}</strong> ({collectedCount}/{wordLength})
            </span>
            {streakCount > 1 && (
              <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-bold border border-amber-500/40">
                Streak x{streakCount}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Top Right: HP (Starts at 3, collectible in stage), Notebook, Mute & Pause */}
      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
        {/* Health Hearts */}
        <div
          title="หัวใจชีวิต (เก็บหัวใจสีแดงในด่านเพื่อเพิ่มได้!)"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/90 border border-rose-500/40 shadow-lg"
        >
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.max(3, hp) }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 md:w-5 md:h-5 transition-all ${
                  i < hp
                    ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)] scale-105'
                    : 'text-slate-700 fill-slate-800'
                }`}
              />
            ))}
          </div>
          <span className="ml-1 text-xs font-bold text-rose-300 tabular-nums">{hp}</span>
        </div>

        {/* Word Notebook Button */}
        <button
          onClick={onOpenNotebook}
          title="คลังคำศัพท์ (Word Notebook)"
          className="p-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:text-white transition shadow-lg"
        >
          <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        {/* Sound Toggle */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'เปิดเสียง (Unmute)' : 'ปิดเสียง (Mute)'}
          className="p-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition shadow-lg"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
          )}
        </button>

        {/* Pause Button */}
        <button
          onClick={onPause}
          title="พักเกม (Pause)"
          className="p-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition shadow-lg"
        >
          <Pause className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>

      {/* Unified Bottom Control Dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto transition-transform duration-300 flex flex-col items-center">
        <button
          onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
          className="px-3 py-1 rounded-t-lg bg-slate-950/90 border-t border-x border-slate-700/60 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 font-mono transition"
        >
          {isControlsCollapsed ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
          <span>{isControlsCollapsed ? 'แสดงวิธีเล่น' : 'ซ่อนคำแนะนำ'}</span>
        </button>

        {!isControlsCollapsed && (
          <div className="px-5 py-2.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-slate-300 text-xs shadow-2xl flex items-center gap-4 font-mono tracking-wide">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">A</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">D</span>
              <span className="text-slate-400">/</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">
                ← →
              </span>
              <span>เปลี่ยนเลน</span>
            </div>
            <div className="hidden sm:block h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">
                Space
              </span>
              <span className="text-slate-400">/</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">↑</span>
              <span>กระโดดเก็บศัพท์</span>
            </div>
            <div className="hidden sm:block h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">S</span>
              <span className="text-slate-400">/</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">↓</span>
              <span>สไลด์ลอดเลเซอร์</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
