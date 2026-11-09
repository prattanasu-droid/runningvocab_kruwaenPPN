import React, { useState } from 'react';
import { soundManager } from '../audio/soundManager';
import { X, Volume2, Search, BookOpen, Sparkles } from 'lucide-react';
import { VOCABULARY_LIST } from '../data/words';

interface WordNotebookModalProps {
  unlockedWordIds: string[];
  onClose: () => void;
}

export const WordNotebookModal: React.FC<WordNotebookModalProps> = ({
  unlockedWordIds,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ทั้งหมด');

  const gradeFilters = ['ทั้งหมด', 'ป.4', 'ป.5', 'ป.6'];

  const filteredWords = VOCABULARY_LIST.filter((w) => {
    const matchesSearch =
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.thaiMeaning.toLowerCase().includes(search.toLowerCase());
    const matchesGrade = selectedGrade === 'ทั้งหมด' || w.gradeLevel === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl border border-cyan-500/40 bg-slate-950 p-6 shadow-[0_0_50px_rgba(6,182,212,0.3)] text-white flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-400">
                สมุดรวมคำศัพท์ระดับชั้น ป.4 - ป.6
              </h2>
              <p className="text-xs text-slate-400">
                ปลดล็อกแล้ว {unlockedWordIds.length} / {VOCABULARY_LIST.length} คำ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Grade Filter Bar */}
        <div className="py-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาคำศัพท์ภาษาอังกฤษ หรือความหมายไทย..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {gradeFilters.map((grade) => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedGrade === grade
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {grade === 'ทั้งหมด' ? 'ทุกระดับชั้น (ป.4-ป.6)' : `ชั้นประถม ${grade}`}
              </button>
            ))}
          </div>
        </div>

        {/* Word Cards List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredWords.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">ไม่พบคำศัพท์ที่ค้นหา</div>
          ) : (
            filteredWords.map((word) => {
              const isUnlocked = unlockedWordIds.includes(word.id);

              return (
                <div
                  key={word.id}
                  className={`p-4 rounded-2xl border transition ${
                    isUnlocked
                      ? 'bg-slate-900/80 border-cyan-500/40 shadow-sm'
                      : 'bg-slate-900/40 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold tracking-wider text-cyan-300">
                          {word.word}
                        </span>
                        <span className="text-xs text-slate-400">{word.phonetic}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-500/30 font-semibold">
                          {word.gradeLevel}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {word.partOfSpeech}
                        </span>
                        {isUnlocked && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> เก็บได้แล้ว
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-base font-bold text-amber-300">
                        {word.thaiMeaning}
                      </div>
                    </div>

                    <button
                      onClick={() => soundManager.speakEnglishWord(word.word)}
                      title="ฟังเสียงอ่าน (Audio)"
                      className="p-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition transform hover:scale-105 active:scale-95"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-xs space-y-1">
                    <p className="text-slate-200 italic">"{word.exampleEn}"</p>
                    <p className="text-emerald-300">"{word.exampleTh}"</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            ปิดหน้าต่าง (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
