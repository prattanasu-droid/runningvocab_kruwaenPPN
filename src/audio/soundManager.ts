/**
 * Procedural Web Audio Synthesizer & Speech Engine
 * Zero external mp3 dependencies, 100% generated in real-time.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicInterval: number | null = null;
  private masterGain: GainNode | null = null;
  private isPlayingBgm: boolean = false;

  constructor() {
    // Check saved mute state
    try {
      const saved = localStorage.getItem('gemini_runner_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    } catch {
      // ignore
    }
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('gemini_runner_muted', String(this.isMuted));
    } catch {
      // ignore
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.3, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public playJump(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.18);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playSlide(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playLaneSwitch(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playLetterCollect(index: number = 0): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    // Pentatonic scale pitches for rewarding progression
    const freqs = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const baseFreq = freqs[index % freqs.length] || 523.25;

    const now = ctx.currentTime;

    // Harmonic bell pair
    [baseFreq, baseFreq * 1.5].forEach((freq, i) => {
      if (!ctx || !this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(i === 0 ? 0.35 : 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  public playWordCompleteFanfare(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C major arpeggio
    chord.forEach((freq, idx) => {
      if (!ctx || !this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(0.3, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.65);
    });

    // Final sparkle chord
    setTimeout(() => {
      if (this.isMuted || !this.ctx || !this.masterGain) return;
      const chimeNow = this.ctx.currentTime;
      [1046.5, 1318.51, 1567.98, 2093.0].forEach((f) => {
        if (!this.ctx || !this.masterGain) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, chimeNow);
        g.gain.setValueAtTime(0.2, chimeNow);
        g.gain.exponentialRampToValueAtTime(0.001, chimeNow + 0.8);
        o.connect(g);
        g.connect(this.masterGain);
        o.start(chimeNow);
        o.stop(chimeNow + 0.85);
      });
    }, 280);
  }

  public playHeartCollect(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const notes = [587.33, 880.0, 1174.66]; // Warm D5 -> A5 -> D6 healing arpeggio
    notes.forEach((freq, idx) => {
      if (!ctx || !this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(0.28, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.38);
    });
  }

  public playHit(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playGameOver(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const notes = [392.0, 369.99, 349.23, 311.13]; // Descending melancholy
    notes.forEach((freq, idx) => {
      if (!ctx || !this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);
      gain.gain.setValueAtTime(0.25, now + idx * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.18);
      osc.stop(now + idx * 0.18 + 0.27);
    });
  }

  public startBackgroundMusic(): void {
    if (this.isPlayingBgm) return;
    this.isPlayingBgm = true;
    const ctx = this.initCtx();
    if (!ctx) return;

    // Cyberpunk synthwave bass/lead arpeggio loop
    const pattern = [130.81, 164.81, 196.0, 261.63, 196.0, 164.81, 146.83, 174.61];
    let step = 0;

    this.musicInterval = window.setInterval(() => {
      if (this.isMuted || !this.ctx || !this.masterGain || !this.isPlayingBgm) return;
      const now = this.ctx.currentTime;
      const freq = pattern[step % pattern.length];
      step++;

      // Synth bass note
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq / 2, now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.15);
    }, 160);
  }

  public stopBackgroundMusic(): void {
    this.isPlayingBgm = false;
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  /**
   * Speak English word aloud using Web Speech API synthesis
   */
  public speakEnglishWord(word: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // fallback: play pleasant chime
      this.playLetterCollect(3);
    }
  }
}

export const soundManager = new SoundManager();
