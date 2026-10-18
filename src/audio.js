// Web Audio API Synthesized Sound Generator
// 100% offline, zero external audio asset dependencies

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    // Default to unmuted so user experiences sound immediately
    const savedMute = localStorage.getItem('paci_boss_muted');
    this.muted = savedMute === 'true';

    // Auto-unlock on first user interaction anywhere on the page
    this.bindUnlockListeners();
  }

  bindUnlockListeners() {
    const unlock = () => {
      this.init();
      ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
        window.removeEventListener(evt, unlock, true);
      });
    };

    ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
      window.addEventListener(evt, unlock, { once: true, capture: true, passive: true });
    });
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  isMuted() {
    return this.muted;
  }

  setMuted(val) {
    this.muted = !!val;
    localStorage.setItem('paci_boss_muted', this.muted);
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('paci_boss_muted', this.muted);
    if (!this.muted) {
      this.init();
    }
    return this.muted;
  }

  // Pacifier Pop / Bubble sound
  playPop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {
      console.warn('Audio playPop error:', e);
    }
  }

  // Rubber Stamp Heavy Impact "THUD"
  playStamp() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Low punch oscillator
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      // Noise snap punch
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.06);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 800;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.6, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain || this.ctx.destination);

      osc.start(now);
      noise.start(now);
      osc.stop(now + 0.25);
      noise.stop(now + 0.06);
    } catch (e) {
      console.warn('Audio playStamp error:', e);
    }
  }

  // Rubber Duck / Baby Toy Squeak
  playSqueak() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.linearRampToValueAtTime(1250, now + 0.07);
      osc.frequency.linearRampToValueAtTime(850, now + 0.15);

      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {
      console.warn('Audio playSqueak error:', e);
    }
  }

  // Cash Register / Trade "Cha-Ching"
  playChaChing() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [987.77, 1318.51, 1567.98]; // B5, E6, G6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.5, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.4);
      });
    } catch (e) {
      console.warn('Audio playChaChing error:', e);
    }
  }

  // Playful Cartoon Dog Bark ("Woof! Ruff!") - Rich, loud, and unmistakably canine
  playDogBark(pitchShift = 1.0, isDouble = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const singleBark = (startTime, pitchMult = 1.0, vol = 0.95) => {
      try {
        const now = startTime;
        const baseFreq = (270 + Math.random() * 35) * pitchShift * pitchMult;

        // 1. Vocal cord sawtooth for husky canine rasp & punch
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq * 1.6, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.1, now + 0.035);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.55, now + 0.15);

        // Resonant throat formant lowpass filter (keeps low punch, adds barking bite)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500 * pitchMult, now);
        filter.frequency.exponentialRampToValueAtTime(750 * pitchMult, now + 0.13);
        filter.Q.value = 3.2;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

        // 2. Chest resonance sub-oscillator (triangle wave)
        const subOsc = this.ctx.createOscillator();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(baseFreq * 0.9, now);
        subOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, now + 0.15);

        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(0.001, now);
        subGain.gain.linearRampToValueAtTime(vol * 0.7, now + 0.018);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        // 3. Breathy snout burst noise
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.10);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.4);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1400;
        noiseFilter.Q.value = 1.2;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.001, now);
        noiseGain.gain.linearRampToValueAtTime(vol * 0.4, now + 0.012);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

        // Routing
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        subOsc.connect(subGain);
        subGain.connect(this.masterGain || this.ctx.destination);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain || this.ctx.destination);

        osc.start(now);
        subOsc.start(now);
        noise.start(now);

        osc.stop(now + 0.18);
        subOsc.stop(now + 0.17);
        noise.stop(now + 0.11);
      } catch (e) {
        console.warn('Audio singleBark error:', e);
      }
    };

    const now = this.ctx.currentTime;
    singleBark(now, 1.0, 0.95);
    // Real dogs often bark in pairs ("Arf-arf!")
    if (isDouble || Math.random() < 0.55) {
      singleBark(now + 0.13, 1.14, 0.85);
    }
  }

  // Cartoon Spring Jump Sound ("Boing!")
  playJumpBoing() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Rising pitch oscillator
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.22);

      // LFO for comic spring vibrato
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(22, now);
      lfoGain.gain.setValueAtTime(45, now);
      lfoGain.gain.linearRampToValueAtTime(10, now + 0.25);
      lfo.connect(osc.frequency);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.28);
      osc.stop(now + 0.28);
    } catch (e) {
      console.warn('Audio playJumpBoing error:', e);
    }
  }

  // Mechanical Ticker Sound (Odometer roll)
  playTick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(750, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) {
      console.warn('Audio playTick error:', e);
    }
  }

  // Paper slide / Sticky peel sound
  playPeel() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.linearRampToValueAtTime(800, now + 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.08);
    } catch (e) {
      console.warn('Audio playPeel error:', e);
    }
  }
}

export const sound = new SoundEngine();
