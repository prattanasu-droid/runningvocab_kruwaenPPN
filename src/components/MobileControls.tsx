import React, { useRef } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

interface MobileControlsProps {
  onLeft: () => void;
  onRight: () => void;
  onJump: () => void;
  onSlide: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onLeft,
  onRight,
  onJump,
  onSlide,
}) => {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;

    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Minimum swipe threshold (28px)
    if (Math.max(absX, absY) >= 28) {
      if (absX > absY) {
        if (dx < 0) {
          onLeft();
        } else {
          onRight();
        }
      } else {
        if (dy < 0) {
          onJump();
        } else {
          onSlide();
        }
      }
    }

    touchStartRef.current = null;
  };

  return (
    <>
      {/* Full-viewport Touch Swipe Gesture Zone for Mobile & Tablet */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="absolute inset-0 z-10 pointer-events-auto xl:pointer-events-none"
      />

      {/* Ergonomic On-Screen Touch Buttons for Mobile & Tablet (up to 1280px width) */}
      <div className="absolute inset-x-0 bottom-4 pointer-events-none z-20 flex justify-between items-end px-4 sm:px-8 pb-10 xl:hidden">
        {/* Left / Right Lane Buttons */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLeft();
            }}
            aria-label="ไปทางซ้าย (Move Left)"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950/90 active:bg-cyan-500/40 border-2 border-cyan-400/50 text-cyan-200 flex flex-col items-center justify-center shadow-xl active:scale-95 transition"
          >
            <ArrowLeft className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="text-[11px] font-semibold mt-0.5">ซ้าย</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRight();
            }}
            aria-label="ไปทางขวา (Move Right)"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950/90 active:bg-cyan-500/40 border-2 border-cyan-400/50 text-cyan-200 flex flex-col items-center justify-center shadow-xl active:scale-95 transition"
          >
            <ArrowRight className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="text-[11px] font-semibold mt-0.5">ขวา</span>
          </button>
        </div>

        {/* Jump / Slide Action Buttons */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSlide();
            }}
            aria-label="สไลด์ (Slide)"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950/90 active:bg-amber-500/40 border-2 border-amber-400/50 text-amber-200 flex flex-col items-center justify-center shadow-xl active:scale-95 transition"
          >
            <ArrowDown className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="text-[11px] font-semibold mt-0.5">สไลด์</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onJump();
            }}
            aria-label="กระโดด (Jump)"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950/90 active:bg-fuchsia-500/40 border-2 border-fuchsia-400/50 text-fuchsia-200 flex flex-col items-center justify-center shadow-xl active:scale-95 transition"
          >
            <ArrowUp className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="text-[11px] font-semibold mt-0.5">กระโดด</span>
          </button>
        </div>
      </div>
    </>
  );
};
