// ==========================================
// THE SIMS 2: ANT COLONY AUDIO ENGINE
// Multi-station Synthesizer, Simlish & SFX
// ==========================================

export class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  private isMusicPlaying: boolean = false;
  private musicStep: number = 0;
  private musicIntervalId: number | null = null;

  public currentStation: 'Spore_Jazz' | 'Anthill_Bossa' | 'Chitter_Pop' = 'Spore_Jazz';

  // Jazz chord progressions for The Sims 2 lounge vibe
  private jazzChords = [
    [349.23, 440.0, 523.25, 659.25], // Fmaj7
    [329.63, 392.0, 493.88, 587.33], // Em7
    [293.66, 349.23, 440.0, 523.25], // Dm7
    [196.0, 246.94, 293.66, 349.23], // G7
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 392.0],  // Am7
    [293.66, 349.23, 440.0, 523.25], // Dm7
    [246.94, 293.66, 349.23, 440.0], // Bm7b5
  ];

  // Upbeat Bossa Nova chords
  private bossaChords = [
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 392.0],  // Am7
    [293.66, 349.23, 440.0, 523.25], // Dm7
    [196.0, 246.94, 293.66, 349.23], // G7
  ];

  private bassLines = [
    [174.61, 220.0, 261.63, 220.0],
    [164.81, 196.0, 246.94, 196.0],
    [146.83, 174.61, 220.0, 174.61],
    [98.0, 123.47, 146.83, 174.61],
    [130.81, 164.81, 196.0, 164.81],
    [110.0, 130.81, 164.81, 130.81],
    [146.83, 174.61, 220.0, 174.61],
    [123.47, 146.83, 174.61, 146.83],
  ];

  public init() {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.2;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.45;
    this.sfxGain.connect(this.masterGain);
  }

  public ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMasterVolume(v: number) {
    this.ensureContext();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : v, this.ctx.currentTime, 0.05);
    }
  }

  public setMusicVolume(v: number) {
    this.ensureContext();
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    }
  }

  public setSfxVolume(v: number) {
    this.ensureContext();
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.ensureContext();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setRadioStation(station: 'Spore_Jazz' | 'Anthill_Bossa' | 'Chitter_Pop') {
    this.currentStation = station;
  }

  // ==========================================
  // PROCEDURAL RADIO MUSIC
  // ==========================================

  public startMusic() {
    this.ensureContext();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.musicStep = 0;

    const tempo = this.currentStation === 'Chitter_Pop' ? 200 : 240;

    this.musicIntervalId = window.setInterval(() => {
      if (!this.isMusicPlaying || !this.ctx || this.isMuted) return;
      this.tickMusic();
    }, tempo);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  private tickMusic() {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const chords = this.currentStation === 'Anthill_Bossa' ? this.bossaChords : this.jazzChords;
    const bar = Math.floor(this.musicStep / 8) % chords.length;
    const stepInBar = this.musicStep % 8;

    // Piano chords
    if (stepInBar === 0 || stepInBar === 3 || stepInBar === 6) {
      const chord = chords[bar];
      chord.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = this.currentStation === 'Chitter_Pop' ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        const velocity = idx === 0 ? 0.07 : 0.04;
        gain.gain.setValueAtTime(velocity, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.musicGain!);

        osc.start(t);
        osc.stop(t + 0.5);
      });
    }

    // Walking Bass
    if (stepInBar % 2 === 0) {
      const bassIndex = (stepInBar / 2) % 4;
      const freq = this.bassLines[bar % this.bassLines.length][bassIndex];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, t);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 0.4);
    }

    // Jazz Hi-Hat
    if (stepInBar % 2 === 1) {
      this.playHiHat(t, stepInBar === 3 || stepInBar === 7 ? 0.03 : 0.015);
    }

    this.musicStep++;
  }

  private playHiHat(t: number, volume: number) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(t);
  }

  // ==========================================
  // SIMLISH SPEECH
  // ==========================================
  public playSimlish(mood: 'happy' | 'chat' | 'whine' | 'romantic' | 'angry' = 'chat') {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const syllablesCount = mood === 'whine' ? 2 : 2 + Math.floor(Math.random() * 3);
    const baseFreq = mood === 'romantic' ? 440 : mood === 'angry' ? 200 : mood === 'whine' ? 300 : 520;

    for (let i = 0; i < syllablesCount; i++) {
      const delay = i * 0.11;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      const fVariation = (Math.random() - 0.5) * 160;
      const freq = baseFreq + fVariation + (mood === 'whine' ? -i * 50 : i * 30);

      osc.type = mood === 'angry' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      osc.frequency.linearRampToValueAtTime(freq + (Math.random() - 0.5) * 100, this.ctx.currentTime + delay + 0.08);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800 + Math.random() * 600, this.ctx.currentTime + delay);
      filter.Q.setValueAtTime(3, this.ctx.currentTime + delay);

      gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.14, this.ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + 0.1);
    }
  }

  // ==========================================
  // THE SIMS 2 SOUND EFFECTS
  // ==========================================

  public playPlumbobSelect() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const notes = [1046.5, 1318.5, 1567.98, 2093.0];
    notes.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.04;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  public playWantFulfilled() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const chords = [
      { notes: [523.25, 659.25, 783.99], time: 0 },
      { notes: [587.33, 739.99, 880.0], time: 0.12 },
      { notes: [659.25, 830.61, 987.77], time: 0.24 },
      { notes: [1046.5, 1318.51, 1567.98], time: 0.4 },
    ];

    chords.forEach(c => {
      const t = this.ctx!.currentTime + c.time;
      c.notes.forEach(f => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + (c.time === 0.4 ? 0.6 : 0.2));

        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(t);
        osc.stop(t + (c.time === 0.4 ? 0.65 : 0.22));
      });
    });
  }

  public playFearTriggered() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const notes = [220.0, 207.65, 196.0, 185.0];
    notes.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.18;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq - 15, t + 0.16);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  public playTrophallaxis() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.3);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.35);

    setTimeout(() => {
      this.playChime(1200);
      setTimeout(() => this.playChime(1600), 80);
    }, 150);
  }

  public playDigDirt() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400 + Math.random() * 200, t);
    filter.Q.setValueAtTime(1.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
  }

  public playClick() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.03);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  public playPlaceObject() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playSaveLoadChime() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  public playChime(freq: number) {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }
}

export const audio = new SoundManager();
