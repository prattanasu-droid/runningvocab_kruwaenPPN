import React, { useEffect, useState } from 'react';
import { WordCompletionSummary } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { formatPlaytime } from '../data/words';
import {
  Volume2,
  Sparkles,
  Award,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Trophy,
  Gauge,
  Clock,
  Flame,
  PauseCircle,
} from 'lucide-react';

interface WordTranslationModalProps {
  summary: WordCompletionSummary;
  streakCount: number;
  sessionPlaytime: number;
  totalPlaytime: number;
  onContinue: () => void;
  onOpenNotebook: () => void;
}

export const WordTranslationModal: React.FC<WordTranslationModalProps> = ({
  summary,
  streakCount,
  sessionPlaytime,
  totalPlaytime,
  onContinue,
  onOpenNotebook,
}) => {
  const {
    word,
    wordPoints,
    letterPointsEarned,
    streakBonus,
    totalEarnedThisWord,
    newTotalScore,
    highScore,
    isNewHighScore,
    previousLevel,
    newLevelInfo,
  } = summary;

  const didLevelUp = newLevelInfo.level > previousLevel;
  const [canDismissByKey, setCanDismissByKey] = useState(false);

  // Auto-pronounce word when modal opens, and guard against accidental jump keys closing the modal immediately
  useEffect(() => {
    soundManager.speakEnglishWord(word.word);
    setCanDismissByKey(false);
    const timer = window.setTimeout(() => {
      setCanDismissByKey(true);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [word]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canDismissByKey) return;
      if (e.code === 'Enter') {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canDismissByKey, onContinue]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fadeIn">
      {/* Cyber Pop-up Window Container */}
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-cyan-400/50 bg-slate-950 p-5 md:p-7 shadow-[0_0_60px_rgba(6,182,212,0.4)] text-white">
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400" />

        {/* Game Paused Assurance Banner */}
        <div className="mb-3 px-3.5 py-2 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PauseCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>เกมหยุดพักอัตโนมัติ:</strong> จดจำคำศัพท์และฟังเสียงอ่านได้ตามสบาย ตัวละครจะไม่วิ่งต่อจนกว่าจะกดปุ่มด้านล่าง
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-indigo-950 border border-indigo-400/40 text-indigo-200 font-bold shrink-0">
            ระดับ {word.gradeLevel}
          </span>
        </div>

        {/* Header Row: Word Collected Status + Points Pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 text-xs font-bold tracking-wider uppercase">
            <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>WORD COLLECTED · เก็บคำศัพท์สำเร็จ!</span>
          </div>

          <div className="flex items-center gap-2">
            {streakCount > 1 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/90 border border-amber-500/40 text-amber-300 text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Streak x{streakCount}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-950/90 border border-fuchsia-500/50 text-fuchsia-200 text-xs font-bold tracking-wide">
              <Award className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>+{totalEarnedThisWord.toLocaleString()} คะแนน</span>
            </div>
          </div>
        </div>

        {/* Collected English Word + Letter Tiles & Audio Button */}
        <div className="my-3 p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 text-center">
          <div className="text-[11px] uppercase tracking-widest text-cyan-400 font-semibold mb-2">
            Collected English Word · คำศัพท์ภาษาอังกฤษที่เก็บได้
          </div>

          {/* Spelled Letter Tiles */}
          <div className="flex items-center justify-center flex-wrap gap-1.5 mb-3">
            {word.word.split('').map((char, idx) => (
              <span
                key={idx}
                className="w-9 h-10 md:w-11 md:h-12 rounded-xl bg-gradient-to-b from-cyan-500 to-blue-600 text-white text-xl md:text-2xl font-bold flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.5)] border border-cyan-300/40"
              >
                {char}
              </span>
            ))}
          </div>

          <div className="inline-flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-fuchsia-400">
              {word.word}
            </h1>
            <button
              onClick={() => soundManager.speakEnglishWord(word.word)}
              title="ฟังเสียงอ่านภาษาอังกฤษ (Listen Pronunciation)"
              className="px-3 py-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 hover:text-white border border-cyan-400/50 text-xs font-medium flex items-center gap-1.5 transition transform hover:scale-105 active:scale-95"
            >
              <Volume2 className="w-4 h-4" />
              <span>ฟังเสียงอ่าน</span>
            </button>
          </div>

          <p className="mt-1 text-slate-400 text-xs md:text-sm">
            คำอ่าน: <span className="text-slate-200">{word.phonetic}</span>{' '}
            <span className="text-slate-600">·</span>{' '}
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {word.partOfSpeech}
            </span>
          </p>

          {/* Thai Translation Box */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="text-xs text-amber-400/90 font-semibold uppercase tracking-wider mb-1">
              Thai Translation · คำแปลภาษาไทย
            </div>
            <div className="text-2xl md:text-3xl font-bold text-amber-300 drop-shadow-[0_2px_10px_rgba(245,158,11,0.35)]">
              {word.thaiMeaning}
            </div>
          </div>

          {/* Bilingual Example Sentence */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-left space-y-1">
            <div className="text-[11px] text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> ประโยคตัวอย่าง (Example Sentence)
            </div>
            <p className="text-slate-200 text-xs md:text-sm italic">"{word.exampleEn}"</p>
            <p className="text-emerald-300 text-xs md:text-sm">"{word.exampleTh}"</p>
          </div>

          {word.funFactTh && (
            <div className="mt-3 p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-xs text-indigo-200 text-left">
              💡 <span className="font-semibold text-indigo-100">เกร็ดน่ารู้:</span> {word.funFactTh}
            </div>
          )}
        </div>

        {/* Difficulty Level-Up Banner */}
        {didLevelUp && (
          <div className="my-3 p-3 rounded-2xl bg-gradient-to-r from-fuchsia-950/90 via-indigo-950/90 to-cyan-950/90 border border-fuchsia-400/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-300">
                <Gauge className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-fuchsia-300">
                  LEVEL UP! เลื่อนระดับความท้าทายตามคะแนน!
                </div>
                <div className="text-xs text-slate-300">
                  เข้าสู่ <span className="font-bold text-white">{newLevelInfo.titleTh}</span> (ความเร็ว{' '}
                  {newLevelInfo.speedMultiplier}x)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Score Breakdown & Playtime Tracking Grid */}
        <div className="my-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">คะแนนคำนี้</div>
            <div className="text-base font-bold text-emerald-400 tabular-nums">
              +{totalEarnedThisWord.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500">
              ตัวอักษร +{letterPointsEarned} · โบนัส +{wordPoints + streakBonus}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">คะแนนรวม</div>
            <div className="text-base font-bold text-cyan-300 tabular-nums">
              {newTotalScore.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <Trophy className="w-2.5 h-2.5 text-amber-400" />
              <span>สูงสุด: {highScore.toLocaleString()}</span>
              {isNewHighScore && <span className="text-amber-400 font-bold">NEW!</span>}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">ระดับปัจจุบัน</div>
            <div className="text-sm font-bold text-fuchsia-300">
              Lv.{newLevelInfo.level} ({newLevelInfo.speedMultiplier}x)
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {newLevelInfo.nextLevelScore
                ? `อีก ${Math.max(0, newLevelInfo.nextLevelScore - newTotalScore)} แต้ม → Lv.${
                    newLevelInfo.level + 1
                  }`
                : 'ระดับสูงสุด!'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-cyan-400" /> เวลาที่เล่น
            </div>
            <div className="text-sm font-bold text-slate-200 tabular-nums">
              {formatPlaytime(sessionPlaytime)}
            </div>
            <div className="text-[10px] text-slate-500">
              สะสม: {formatPlaytime(totalPlaytime)}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onOpenNotebook}
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs md:text-sm font-medium flex items-center justify-center gap-2 transition"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>สมุดคำศัพท์</span>
          </button>

          <button
            onClick={onContinue}
            className="w-full flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-bold text-base shadow-[0_0_25px_rgba(6,182,212,0.45)] flex items-center justify-center gap-2 transition transform hover:scale-[1.01] active:scale-98"
          >
            <span>จำคำศัพท์ได้แล้ว · วิ่งต่อ (Continue)</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
