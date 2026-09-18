/**
 * Retro 16-bit Sound Synthesizer (SNES & Sega Era)
 * Synthesizes classic 16-bit RPG dialogue wobbles and warbles using the Web Audio API.
 */

export type RetroSoundStyle = 'snes' | 'sega' | 'vintage';

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.25;
  private soundStyle: RetroSoundStyle = 'snes';
  private lastSoundTime: number = 0;
  private minIntervalMs: number = 42; // Prevent audio clipping/machine-gun buzzing

  constructor() {
    // Load saved preferences if available
    try {
      const savedMute = localStorage.getItem('priorities_audio_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedStyle = localStorage.getItem('priorities_audio_style');
      if (savedStyle && ['snes', 'sega', 'vintage'].includes(savedStyle)) {
        this.soundStyle = savedStyle as RetroSoundStyle;
      }
    } catch {
      // Ignore storage errors in restricted iframes
    }

    // Auto-resume audio on any user gesture across window
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.resume();
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
    }
  }

  /**
   * Initializes or returns the existing AudioContext
   */
  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    return this.ctx;
  }

  /**
   * Resumes AudioContext if suspended (required by browser autoplay policies)
   */
  public async resume(): Promise<boolean> {
    const ctx = this.getContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    return ctx.state === 'running';
  }

  public isAudioReady(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('priorities_audio_muted', String(muted));
    } catch {}
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    // If unmuting, ensure audio context is active
    if (!this.isMuted) {
      this.resume();
      this.playAdvanceChime();
    }
    return this.isMuted;
  }

  public getSoundStyle(): RetroSoundStyle {
    return this.soundStyle;
  }

  public setSoundStyle(style: RetroSoundStyle) {
    this.soundStyle = style;
    try {
      localStorage.setItem('priorities_audio_style', style);
    } catch {}
  }

  /**
   * Plays the iconic SNES / Sega dialogue wobble or warble for incoming character
   */
  public playCharacterWobble(char: string, index: number) {
    if (this.isMuted) return;

    // Skip whitespace (spaces, newlines, tabs)
    if (!char || /\s/.test(char)) return;

    // Throttle slightly so rapid text doesn't sound like high-frequency noise
    const now = performance.now();
    if (now - this.lastSoundTime < this.minIntervalMs) {
      return;
    }
    this.lastSoundTime = now;

    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      return;
    }

    const t = ctx.currentTime;
    const lowerChar = char.toLowerCase();

    // Calculate base frequency with character-specific pitch variation (inflections)
    let baseFreq = 420; // mid-range voice pitch
    const code = lowerChar.charCodeAt(0);

    if (/[aeiouy]/.test(lowerChar)) {
      // Vowels: brighter, singing resonance (EarthBound / Chrono style)
      baseFreq = 460 + ((code * 7) % 110);
    } else if (/[0-9]/.test(lowerChar)) {
      // Digits: techy slightly higher pitch
      baseFreq = 540 + ((code * 9) % 80);
    } else if (/[.,!?;:]/.test(lowerChar)) {
      // Punctuation: softer, lower grounded chirp
      baseFreq = 320;
    } else {
      // Consonants: varied grounded chatter
      baseFreq = 380 + ((code * 11) % 90);
    }

    // Add gentle rhythm cadence based on text index
    if (index % 4 === 0) baseFreq *= 1.08;
    if (index % 7 === 0) baseFreq *= 0.94;

    if (this.soundStyle === 'snes') {
      this.playSnesWobble(ctx, t, baseFreq);
    } else if (this.soundStyle === 'sega') {
      this.playSegaWarble(ctx, t, baseFreq);
    } else {
      this.playVintagePip(ctx, t, baseFreq);
    }
  }

  /**
   * SNES Style: Warm SPC700 inspired sound.
   * Uses rounded triangle/soft square wave with pitch modulation (vibrato wobble)
   * and a warm resonant low-pass filter.
   */
  private playSnesWobble(ctx: AudioContext, t: number, baseFreq: number) {
    const duration = 0.052; // 52ms quick chirp

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Warm triangle wave with harmonic richness
    osc.type = 'triangle';

    // Wobble: frequency sweeps up slightly then dips down quickly (the classic "wobble")
    osc.frequency.setValueAtTime(baseFreq * 0.95, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.22, t + 0.016);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.88, t + duration);

    // Filter: warm SNES low-pass with resonance
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2100, t);
    filter.Q.setValueAtTime(2.8, t);

    // Envelope: quick attack, warm sustain, soft release
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(this.volume * 0.45, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  }

  /**
   * Sega Style: YM2612 FM / PSG inspired sound.
   * Uses 2-operator FM synthesis simulation (carrier + fast modulator)
   * with snappy bite and downward frequency warble.
   */
  private playSegaWarble(ctx: AudioContext, t: number, baseFreq: number) {
    const duration = 0.046; // 46ms crisp FM warble

    // Carrier oscillator
    const carrier = ctx.createOscillator();
    carrier.type = 'square';

    // Snappy Sega downward chirp ramp
    carrier.frequency.setValueAtTime(baseFreq * 1.35, t);
    carrier.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, t + duration);

    // Modulator oscillator for FM buzzing warble
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(65, t); // 65Hz fast FM chatter
    modGain.gain.setValueAtTime(95, t); // Modulation depth

    modulator.connect(carrier.frequency);

    // Bandpass / high-shelf shaping for that Sega Genesis cartridge bite
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, t);
    filter.Q.setValueAtTime(1.8, t);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, t);
    masterGain.gain.linearRampToValueAtTime(this.volume * 0.35, t + 0.004);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    carrier.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    modulator.start(t);
    carrier.start(t);
    modulator.stop(t + duration);
    carrier.stop(t + duration);
  }

  /**
   * Vintage 8-bit Pip (Game Boy / NES style square wave blip)
   */
  private playVintagePip(ctx: AudioContext, t: number, baseFreq: number) {
    const duration = 0.038;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'pulse' as OscillatorType in osc ? ('pulse' as OscillatorType) : 'square';
    osc.frequency.setValueAtTime(baseFreq * 1.1, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.92, t + duration);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(this.volume * 0.28, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  }

  /**
   * Plays a nostalgic 16-bit chime when advancing to the next guide step
   */
  public playAdvanceChime() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      return;
    }

    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5 - E5 - G5 major triad

    notes.forEach((freq, idx) => {
      const startTime = t + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.35, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }

  /**
   * Plays a quick swoosh/pop when tapping to instantly reveal dialogue
   */
  public playRevealWhoosh() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      return;
    }

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.06);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(this.volume * 0.3, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * Plays a retro star sparkle chime
   */
  public playStarSparkle() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      return;
    }

    const t = ctx.currentTime;
    const arpeggio = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6

    arpeggio.forEach((freq, idx) => {
      const start = t + idx * 0.038;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.13);
    });
  }

  /**
   * Plays realistic bubble pop sounds: "bop", "pop", or "book/blook"
   * @param soundType 'pop' | 'bop' | 'book' | 'random'
   * @param sizeRatio Bubble size multiplier (0.6 for small to 1.4 for large, adjusts pitch accordingly)
   * @returns The sound variant that was played ('pop' | 'bop' | 'book')
   */
  public playBubblePop(
    soundType: 'pop' | 'bop' | 'book' | 'random' = 'random',
    sizeRatio: number = 1.0
  ): 'pop' | 'bop' | 'book' {
    if (this.isMuted) {
      const choices: ('pop' | 'bop' | 'book')[] = ['pop', 'bop', 'book'];
      return soundType === 'random' ? choices[Math.floor(Math.random() * choices.length)] : soundType;
    }

    const ctx = this.getContext();
    if (!ctx) return 'pop';
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    // Pitch scale: smaller bubbles (sizeRatio < 1) are higher pitched; larger bubbles are deeper
    const pitchFactor = Math.max(0.65, Math.min(1.55, 1 / sizeRatio));

    const selectedType: 'pop' | 'bop' | 'book' =
      soundType === 'random'
        ? (['pop', 'bop', 'book'] as const)[Math.floor(Math.random() * 3)]
        : soundType;

    if (selectedType === 'pop') {
      // "POP": Crisp, snappy bubble burst with click impulse and bright sine sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const startFreq = 880 * pitchFactor;
      const peakFreq = 1350 * pitchFactor;
      const endFreq = 380 * pitchFactor;

      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(peakFreq, t + 0.008);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.038);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(this.volume * 0.48, t + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.038);

      // Micro click impulse
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(1800 * pitchFactor, t);
      clickGain.gain.setValueAtTime(this.volume * 0.25, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.006);

      osc.connect(gain);
      gain.connect(ctx.destination);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.04);
      clickOsc.start(t);
      clickOsc.stop(t + 0.007);
    } else if (selectedType === 'bop') {
      // "BOP": Round, punchy, elastic bubble blip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const startFreq = 640 * pitchFactor;
      const endFreq = 220 * pitchFactor;

      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.046);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(this.volume * 0.44, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.048);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } else {
      // "BOOK" / "BLOOK": Deeper resonant water droplet / suction pop with bandpass resonance
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const startFreq = 240 * pitchFactor;
      const peakFreq = 540 * pitchFactor;
      const endFreq = 190 * pitchFactor;

      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(peakFreq, t + 0.014);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.056);

      // Resonant bandpass filter to create the signature hollow "blook / book" liquid pop
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(460 * pitchFactor, t);
      filter.Q.setValueAtTime(4.2, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(this.volume * 0.52, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.058);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    }

    return selectedType;
  }

  /**
   * Subtle tactile audio tick for clock/timer taps
   */
  public playBoop(pitchRatio: number = 1.0) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const freq = 520 * Math.max(0.7, Math.min(2.0, pitchRatio));
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.15, t + 0.025);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(this.volume * 0.22, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }
}

export const retroAudio = new RetroAudioEngine();
