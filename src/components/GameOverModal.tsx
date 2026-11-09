import React, { useEffect } from 'react';
import { DifficultyLevelInfo, LeaderboardEntry, WordEntry } from '../types/game';
import { formatPlaytime } from '../data/words';
import {
  RotateCcw,
  Home,
  Trophy,
  Volume2,
  Clock,
  Gauge,
  Medal,
  CheckCircle2,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface GameOverModalProps {
  playerName: string;
  score: number;
  highScore: number;
  isNewHighScore: boolean;
  distance: number;
  sessionPlaytime: number;
  totalPlaytime: number;
  levelInfo: DifficultyLevelInfo;
  wordsCollected: WordEntry[];
  leaderboardEntries: LeaderboardEntry[];
  syncedToSheet: boolean;
  onRetry: () => void;
  onHome: () => void;
  onOpenNotebook: () => void;
  onOpenLeaderboard: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  playerName,
  score,
  highScore,
  isNewHighScore,
  distance,
  sessionPlaytime,
  totalPlaytime,
  levelInfo,
  wordsCollected,
  leaderboardEntries,
  syncedToSheet,
  onRetry,
  onHome,
  onOpenNotebook,
  onOpenLeaderboard,
}) => {
  const sortedLeaderboard = [...leaderboardEntries].sort((a, b) => b.score - a.score);
  const playerRank =
    sortedLeaderboard.findIndex(
      (e) => e.playerName === playerName && e.score === score
    ) + 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onRetry();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRetry]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-rose-500/40 bg-slate-950 p-5 md:p-7 shadow-[0_0_50px_rgba(244,63,94,0.35)] text-white text-center">
        {/* Header Border */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-500" />

        <h2 className="text-3xl md:text-4xl font-bold text-rose-400 tracking-wide">
          จบการแข่งขัน (GAME OVER)
        </h2>
        <p className="mt-1 text-sm text-cyan-200">
          ผู้เล่น: <strong className="text-white">{playerName || 'นักเรียน'}</strong>
          {playerRank > 0 && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
              อันดับที่ #{playerRank}
            </span>
          )}
        </p>

        {syncedToSheet && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>บันทึกชื่อและเรียงลำดับคะแนนลง Google Sheet เรียบร้อยแล้ว!</span>
          </div>
        )}

        {/* High Score Banner */}
        {isNewHighScore && score > 0 && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 text-sm font-bold flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>สถิติสูงสุดใหม่! NEW HIGH SCORE!</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
          <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">คะแนนรอบนี้</div>
            <div className="mt-0.5 text-xl font-bold text-cyan-300 tabular-nums">
              {score.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500">
              เก็บได้ {wordsCollected.length} คำ
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> คะแนนสูงสุด
            </div>
            <div className="mt-0.5 text-xl font-bold text-amber-300 tabular-nums">
              {highScore.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500">ระยะทาง {distance} ม.</div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" /> เวลาที่เล่น
            </div>
            <div className="mt-0.5 text-lg font-bold text-emerald-300 tabular-nums">
              {formatPlaytime(sessionPlaytime)}
            </div>
            <div className="text-[10px] text-slate-500">
              สะสม {formatPlaytime(totalPlaytime)}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
              <Gauge className="w-3 h-3 text-fuchsia-400" /> ระดับสูงสุด
            </div>
            <div className="mt-0.5 text-base font-bold text-fuchsia-300">
              Lv.{levelInfo.level} ({levelInfo.speedMultiplier}x)
            </div>
            <div className="text-[10px] text-slate-500 truncate">{levelInfo.titleTh}</div>
          </div>
        </div>

        {/* Top 5 Leaderboard Ranking Preview */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/30 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Medal className="w-4 h-4 text-amber-400" />
              อันดับคะแนนสูงสุด (Top 5 Leaderboard)
            </span>
            <button
              onClick={onOpenLeaderboard}
              className="text-xs text-cyan-300 hover:text-white underline font-medium"
            >
              ดูทั้งหมด / ตั้งค่า Google Sheet
            </button>
          </div>

          <div className="space-y-1.5">
            {sortedLeaderboard.slice(0, 5).map((entry, idx) => (
              <div
                key={entry.id}
                className={`px-3 py-1.5 rounded-xl flex items-center justify-between text-xs ${
                  entry.playerName === playerName && entry.score === score
                    ? 'bg-cyan-950/90 border border-cyan-400/50 text-white font-semibold'
                    : 'bg-slate-950/70 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-5 font-bold text-amber-400">#{idx + 1}</span>
                  <span className="truncate">{entry.playerName}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-slate-400 text-[11px]">{entry.wordsCount} คำ</span>
                  <span className="font-bold text-amber-300 tabular-nums">
                    {entry.score.toLocaleString()} แต้ม
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Words Learned In This Run */}
        {wordsCollected.length > 0 && (
          <div className="mt-4 text-left">
            <div className="text-xs font-semibold text-cyan-400 flex items-center justify-between">
              <span>คำศัพท์ที่เก็บได้รอบนี้ ({wordsCollected.length} คำ):</span>
              <button
                onClick={onOpenNotebook}
                className="text-[11px] text-slate-400 hover:text-cyan-300 underline"
              >
                เปิดสมุดคำศัพท์
              </button>
            </div>

            <div className="mt-1.5 max-h-24 overflow-y-auto space-y-1 pr-1">
              {wordsCollected.map((w, i) => (
                <div
                  key={i}
                  className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300">{w.word}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300">
                      {w.gradeLevel}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="text-amber-300 font-semibold">{w.thaiMeaning}</span>
                  </div>
                  <button
                    onClick={() => soundManager.speakEnglishWord(w.word)}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={onHome}
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 text-sm font-medium flex items-center justify-center gap-2 transition"
          >
            <Home className="w-4 h-4" />
            <span>หน้าหลัก</span>
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-sm font-medium flex items-center justify-center gap-2 transition"
          >
            <Medal className="w-4 h-4 text-amber-400" />
            <span>ตารางคะแนน</span>
          </button>

          <button
            onClick={onRetry}
            className="w-full flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-bold text-base shadow-[0_0_20px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 transition transform hover:scale-[1.01] active:scale-98"
          >
            <RotateCcw className="w-5 h-5" />
            <span>เล่นใหม่อีกครั้ง [Space]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
