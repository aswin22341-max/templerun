export type FootstepSurface = 'stone' | 'dirt' | 'wood';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private enabled = true;
  private musicVolume = 0.45;
  private sfxVolume = 0.75;
  private musicPlaying = false;
  private musicTimer: number | null = null;
  private stepIndex = 0;
  private coinStreak = 0;
  private lastCoinTime = 0;

  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.enabled ? 1 : 0;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      // Reusable 2-second white/pink-ish noise buffer
      const sr = this.ctx.sampleRate;
      const len = sr * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, len, sr);
      const data = this.noiseBuffer.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.22;
      }
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        enabled ? 1 : 0,
        this.ctx.currentTime,
        0.04,
      );
    }
  }

  public setVolumes(musicVol: number, sfxVol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, musicVol));
    this.sfxVolume = Math.max(0, Math.min(1, sfxVol));
    if (this.ctx && this.musicGain && this.sfxGain) {
      this.musicGain.gain.setTargetAtTime(
        this.musicVolume,
        this.ctx.currentTime,
        0.05,
      );
      this.sfxGain.gain.setTargetAtTime(
        this.sfxVolume,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  public startMusic(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this.stepIndex = 0;

    // Gentle jungle wind & canopy ambience
    if (this.noiseBuffer && this.musicGain && !this.ambientSource) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 520;
      filter.Q.value = 0.7;

      const gain = ctx.createGain();
      gain.gain.value = 0.09;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      src.start();

      this.ambientSource = src;
      this.ambientGain = gain;
    }

    // 138 BPM tribal adventure groove (16th note = ~108ms, 8th note = ~217ms)
    const stepMs = 195;
    const pentatonic = [196.0, 220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    const marimbaPattern = [0, -1, 2, 4, -1, 3, 2, 1, 0, -1, 4, 5, 6, -1, 4, 2];
    const bassPattern = [0, -1, -1, 0, -1, -1, 2, -1, 0, -1, -1, 0, 3, -1, 2, -1];
    const bassFreqs = [98.0, 110.0, 130.81, 146.83];

    const tick = () => {
      if (!this.musicPlaying || !this.ctx || !this.musicGain) return;
      if (this.ctx.state !== 'running') {
        this.musicTimer = window.setTimeout(tick, stepMs);
        return;
      }

      const now = this.ctx.currentTime;
      const step = this.stepIndex % 16;

      // Tribal hand drum (conga / djembe)
      if (step === 0 || step === 3 || step === 6 || step === 8 || step === 11 || step === 14) {
        const accent = step === 0 || step === 8 ? 1.0 : 0.62;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        const baseF = step === 0 || step === 8 ? 118 : 165;
        osc.frequency.setValueAtTime(baseF * 1.45, now);
        osc.frequency.exponentialRampToValueAtTime(baseF * 0.55, now + 0.11);

        g.gain.setValueAtTime(0.22 * accent, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(g);
        g.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.15);
      }

      // Shaker off-beats
      if (this.noiseBuffer && (step % 2 === 1 || step === 4 || step === 12)) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 4200;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(step % 4 === 2 ? 0.06 : 0.035, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

        src.connect(hp);
        hp.connect(g);
        g.connect(this.musicGain);
        src.start(now, Math.random() * 0.5, 0.05);
      }

      // Wooden marimba melody
      const mIdx = marimbaPattern[step];
      if (mIdx >= 0) {
        const freq = pentatonic[mIdx];
        const osc = this.ctx.createOscillator();
        const overtone = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(freq * 4, now);

        const og = this.ctx.createGain();
        og.gain.setValueAtTime(0.04, now);
        og.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        g.gain.setValueAtTime(0.11, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(g);
        overtone.connect(og);
        og.connect(g);
        g.connect(this.musicGain);

        osc.start(now);
        overtone.start(now);
        osc.stop(now + 0.23);
        overtone.stop(now + 0.05);
      }

      // Deep temple bass pulse
      const bIdx = bassPattern[step];
      if (bIdx >= 0) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(bassFreqs[bIdx], now);
        g.gain.setValueAtTime(0.16, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
        osc.connect(g);
        g.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.28);
      }

      this.stepIndex++;
      this.musicTimer = window.setTimeout(tick, stepMs);
    };

    tick();
  }

  public stopMusic(): void {
    this.musicPlaying = false;
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
      } catch {
        // ignore if already stopped
      }
      this.ambientSource.disconnect();
      this.ambientSource = null;
    }
    if (this.ambientGain) {
      this.ambientGain.disconnect();
      this.ambientGain = null;
    }
  }

  public playFootstep(surface: FootstepSurface): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || !this.enabled || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = surface === 'wood' ? 'triangle' : 'sine';

    const baseFreq =
      surface === 'wood' ? 145 : surface === 'stone' ? 120 : 95;
    osc.frequency.setValueAtTime(baseFreq * (0.92 + Math.random() * 0.16), now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.055);

    g.gain.setValueAtTime(surface === 'wood' ? 0.12 : 0.09, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.065);

    if (this.noiseBuffer && surface !== 'wood') {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = surface === 'stone' ? 1400 : 850;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.045, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(this.sfxGain);
      n.start(now, Math.random(), 0.05);
    }
  }

  public playCoin(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.enabled) return;
    const now = ctx.currentTime;

    if (now - this.lastCoinTime < 0.45) {
      this.coinStreak = Math.min(this.coinStreak + 1, 8);
    } else {
      this.coinStreak = 0;
    }
    this.lastCoinTime = now;

    const pitchBoost = 1 + this.coinStreak * 0.035;
    const f1 = 1174.66 * pitchBoost; // D6+
    const f2 = 1567.98 * pitchBoost; // G6+

    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();

    o1.type = 'sine';
    o2.type = 'triangle';
    o1.frequency.setValueAtTime(f1, now);
    o1.frequency.setValueAtTime(f2, now + 0.055);
    o2.frequency.setValueAtTime(f1 * 2, now);
    o2.frequency.setValueAtTime(f2 * 2, now + 0.055);

    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    o1.connect(g);
    o2.connect(g);
    g.connect(this.sfxGain);

    o1.start(now);
    o2.start(now);
    o1.stop(now + 0.25);
    o2.stop(now + 0.25);
  }

  public playPowerUp(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.enabled) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.enabled) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.14);

    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playSlide(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.enabled || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1400, now);
    bp.frequency.exponentialRampToValueAtTime(420, now + 0.32);
    bp.Q.value = 1.6;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxGain);
    src.start(now, 0, 0.36);
  }

  public playLaneShift(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.enabled || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, now);
    bp.frequency.exponentialRampToValueAtTime(1700, now + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.09, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxGain);
    src.start(now, 0.2, 0.1);
  }

  public playCollision(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.enabled) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.28);
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1100;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.28, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      src.connect(lp);
      lp.connect(ng);
      ng.connect(this.sfxGain);
      src.start(now, 0, 0.25);
    }
  }

  public playMonsterGrowl(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.enabled) return;
    const now = ctx.currentTime;

    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const outGain = ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(88, now);
    carrier.frequency.linearRampToValueAtTime(64, now + 0.45);
    carrier.frequency.linearRampToValueAtTime(52, now + 0.85);

    mod.type = 'sine';
    mod.frequency.setValueAtTime(24, now);
    modGain.gain.setValueAtTime(34, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.linearRampToValueAtTime(210, now + 0.85);
    filter.Q.value = 2.8;

    outGain.gain.setValueAtTime(0.01, now);
    outGain.gain.linearRampToValueAtTime(0.28, now + 0.12);
    outGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(filter);
    filter.connect(outGain);
    outGain.connect(this.sfxGain);

    mod.start(now);
    carrier.start(now);
    mod.stop(now + 0.92);
    carrier.stop(now + 0.92);
  }

  public playGameOver(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.enabled) return;
    const now = ctx.currentTime;

    const chord = [293.66, 261.63, 220.0, 146.83];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(950, now);
      lp.frequency.exponentialRampToValueAtTime(240, now + 0.9);

      const start = now + i * 0.14;
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.16, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.65);

      osc.connect(lp);
      lp.connect(g);
      g.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.68);
    });
  }

  public dispose(): void {
    this.stopMusic();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
