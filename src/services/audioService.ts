// --- SERVIÇO DE ÁUDIO PROCEDURAL (0 BYTES) ---
// Gera música e efeitos sonoros em tempo real via Web Audio API

class AudioService {
  public ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;
  private turboOsc: OscillatorNode | null = null;
  
  private currentBgmType: "hangar" | "game" | "none" = "none";
  private isMuted = false;
  public isAdMuted = false;

  private musicBuffer: AudioBuffer | null = null;
  private musicSources: { source: AudioBufferSourceNode; gain: GainNode }[] = [];
  private loopTimeout: any = null;
  private proceduralNodes: any[] = [];
  private proceduralInterval: any = null;

  private HANGAR_CHORDS = [
    [110.00, 165.00, 220.00, 261.63], // Am7
    [87.31, 130.81, 174.61, 220.00],  // Fmaj7
    [98.00, 146.83, 196.00, 246.94],  // G6
    [82.41, 123.47, 164.81, 196.00]   // Em7
  ];

  private GAME_BASS_SEQUENCE = [
    55.00, 55.00, 55.00, 55.00, 55.00, 55.00, 55.00, 55.00,
    55.00, 55.00, 55.00, 55.00, 55.00, 55.00, 110.00, 82.41,
    49.00, 49.00, 49.00, 49.00, 49.00, 49.00, 49.00, 49.00,
    49.00, 49.00, 49.00, 49.00, 49.00, 49.00, 98.00, 73.42,
    43.65, 43.65, 43.65, 43.65, 43.65, 43.65, 43.65, 43.65,
    43.65, 43.65, 43.65, 43.65, 43.65, 43.65, 87.31, 65.41,
    41.20, 41.20, 41.20, 41.20, 41.20, 41.20, 41.20, 41.20,
    41.20, 41.20, 41.20, 41.20, 82.41, 82.41, 123.47, 164.81
  ];

  public async init() {
    console.log("[AudioService] Initializing AudioContext...");
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
        console.log("[AudioService] Context resumed.");
      }
      return;
    }
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();
      
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.isMuted ? 0 : 0.4;
      this.musicGain.connect(this.ctx.destination);

      this.setupEngine();
      console.log("[AudioService] Context created.");
    } catch (e) {
      console.error("[AudioService] Failed to initialize AudioContext", e);
    }
  }

  private setupEngine() {
    if (!this.ctx) return;
    
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 50;
    
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 200;

    this.engineOsc.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineOsc.start();

    // Turbo
    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.value = 0;
    this.turboGain.connect(this.ctx.destination);

    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = 'square';
    this.turboOsc.frequency.value = 80;
    
    const turboFilter = this.ctx.createBiquadFilter();
    turboFilter.type = 'bandpass';
    turboFilter.frequency.value = 800;
    turboFilter.Q.value = 1.0;

    this.turboOsc.connect(turboFilter);
    turboFilter.connect(this.turboGain);
    this.turboOsc.start();
  }

  public updateEngine(velocity: number, isTurbo: boolean, isMuted: boolean) {
    if (!this.ctx || !this.engineGain || !this.engineOsc || !this.turboGain || !this.turboOsc) return;

    if (isMuted || this.isAdMuted) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      this.turboGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      return;
    }

    // Mapear velocidade para frequência e ganho
    const normalizedVel = Math.min(Math.max(velocity / 4000, 0), 1);
    
    // Motor base
    const baseFreq = 40 + normalizedVel * 60; // 40Hz a 100Hz
    this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.1);
    
    const baseGain = 0.03 + normalizedVel * 0.05;
    this.engineGain.gain.setTargetAtTime(baseGain, this.ctx.currentTime, 0.1);

    // Turbo
    if (isTurbo) {
      this.turboGain.gain.setTargetAtTime(0.06, this.ctx.currentTime, 0.1);
      this.turboOsc.frequency.setTargetAtTime(100 + normalizedVel * 200, this.ctx.currentTime, 0.05);
    } else {
      this.turboGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }
  }

  public async playSfx(type: "laser" | "explosion" | "shield_hit" | "hull_hit" | "ability" | "click" | "warp", forceMute = false) {
    if ((this.isMuted || this.isAdMuted || forceMute) && type !== "click") return;
    if (!this.ctx) await this.init();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    const t = this.ctx.currentTime;
    
    if (type === "laser") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1100, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.15);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } else if (type === "explosion") {
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(150, t);
      subOsc.frequency.exponentialRampToValueAtTime(20, t + 1.2);
      subGain.gain.setValueAtTime(0.45, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(t);
      subOsc.stop(t + 1.2);
    } else if (type === "hull_hit") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.linearRampToValueAtTime(40, t + 0.2);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    } else if (type === "click") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1800, t);
      osc.frequency.exponentialRampToValueAtTime(900, t + 0.05);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } else if (type === "warp") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(60, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.8);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.8);
    } else if (type === "ability") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.4);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    }
  }

  public async startMusic(type: "hangar" | "game") {
    if (this.currentBgmType === type) return;
    
    console.log(`[AudioService] Starting music: ${type}`);
    
    if (!this.ctx) await this.init();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn("[AudioService] Could not resume context in startMusic", e);
      }
    }

    this.stopMusic();
    this.currentBgmType = type;

    const file = type === "hangar" ? "/Command_Deck.ogg" : "/Apex_Drive.ogg";
    
    try {
      const response = await fetch(file);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      this.musicBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      console.log(`[AudioService] Music loaded: ${file}, duration: ${this.musicBuffer.duration}s`);
      this.playSeamlessLoop();
    } catch (err) {
      console.warn("[AudioService] Could not load background track, playing high-quality procedural synth fallback:", err);
      this.playProceduralFallback(type);
    }
  }

  private playSeamlessLoop() {
    if (!this.ctx || !this.musicBuffer || !this.musicGain) return;

    const buffer = this.musicBuffer;
    const duration = buffer.duration;
    const fadeTime = Math.min(1.5, duration / 4); // Don't fade longer than 25% of track
    const playDuration = duration - fadeTime;

    const scheduleNext = (startTime: number) => {
      if (this.currentBgmType === "none") return;
      if (!this.ctx) return;

      // Se o contexto estiver suspenso, agendar para agora quando retomar
      const actualStart = Math.max(startTime, this.ctx.currentTime);

      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;

      // Crossfade: Fade in
      gain.gain.setValueAtTime(0, actualStart);
      gain.gain.linearRampToValueAtTime(1, actualStart + fadeTime);

      // Crossfade: Fade out
      const fadeOutStart = actualStart + playDuration;
      gain.gain.setValueAtTime(1, fadeOutStart);
      gain.gain.linearRampToValueAtTime(0, actualStart + duration);

      source.connect(gain);
      gain.connect(this.musicGain!);
      source.start(actualStart);
      source.stop(actualStart + duration);

      const sourceInfo = { source, gain };
      this.musicSources.push(sourceInfo);

      // Agendar próxima iteração um pouco antes do fim da atual
      const nextStartTime = actualStart + playDuration;
      const delayMs = (playDuration - 0.1) * 1000;
      
      this.loopTimeout = setTimeout(() => {
        // Cleanup old sources
        this.musicSources = this.musicSources.filter(s => {
          if (s === sourceInfo) {
            setTimeout(() => {
              try {
                s.source.disconnect();
                s.gain.disconnect();
              } catch (e) {}
            }, fadeTime * 1000 + 100);
            return false;
          }
          return true;
        });
        
        scheduleNext(nextStartTime);
      }, Math.max(0, delayMs));
    };

    const now = this.ctx.currentTime;
    scheduleNext(now);
  }

  public stopMusic() {
    this.currentBgmType = "none";
    if (this.loopTimeout) {
      clearTimeout(this.loopTimeout);
      this.loopTimeout = null;
    }
    this.musicSources.forEach(s => {
      try {
        s.source.stop();
        s.source.disconnect();
        s.gain.disconnect();
      } catch (e) {}
    });
    this.musicSources = [];

    if (this.proceduralInterval) {
      clearInterval(this.proceduralInterval);
      this.proceduralInterval = null;
    }
    this.proceduralNodes.forEach(node => {
      try {
        if ('stop' in node) {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch (e) {}
    });
    this.proceduralNodes = [];
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(muted ? 0 : 0.4, this.ctx.currentTime, 0.1);
    }
  }

  public setAdMute(mute: boolean) {
    this.isAdMuted = mute;
    if (this.ctx && (this.musicGain || this.engineGain)) {
       const gainValue = mute ? 0 : 1;
       // Reduzir volume geral se anúncio estiver tocando
       if (this.musicGain) this.musicGain.gain.setTargetAtTime(mute ? 0 : 0.4, this.ctx.currentTime, 0.1);
       if (this.engineGain) this.engineGain.gain.setTargetAtTime(mute ? 0 : 0.05, this.ctx.currentTime, 0.1);
    }
    window.dispatchEvent(new CustomEvent('adMuteChange', { detail: mute }));
  }

  private playProceduralFallback(type: "hangar" | "game") {
    console.log(`[AudioService] Playing procedural fallback music for: ${type}`);
    this.currentBgmType = type;
    if (type === "hangar") {
      this.playProceduralHangar();
    } else {
      this.playProceduralGame();
    }
  }

  private playProceduralHangar() {
    if (!this.ctx || !this.musicGain) return;

    let chordIndex = 0;
    const playChord = () => {
      if (this.currentBgmType !== "hangar" || !this.ctx) return;

      const chord = this.HANGAR_CHORDS[chordIndex];
      chordIndex = (chordIndex + 1) % this.HANGAR_CHORDS.length;

      const now = this.ctx.currentTime;
      const duration = 6.0;
      const fadeTime = 2.0;

      const chordGain = this.ctx.createGain();
      chordGain.gain.setValueAtTime(0, now);
      chordGain.gain.linearRampToValueAtTime(0.08, now + fadeTime);
      chordGain.gain.setValueAtTime(0.08, now + duration - fadeTime);
      chordGain.gain.linearRampToValueAtTime(0, now + duration);
      chordGain.connect(this.musicGain!);

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, now);
      filter.connect(chordGain);

      const oscillators: OscillatorNode[] = [];

      chord.forEach(freq => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 15, now);
        osc.connect(filter);
        osc.start(now);
        osc.stop(now + duration);
        oscillators.push(osc);
        this.proceduralNodes.push(osc);
      });

      this.proceduralNodes.push(chordGain);
      this.proceduralNodes.push(filter);

      setTimeout(() => {
        oscillators.forEach(osc => {
          try { osc.disconnect(); } catch (e) {}
          this.proceduralNodes = this.proceduralNodes.filter(n => n !== osc);
        });
        try {
          chordGain.disconnect();
          filter.disconnect();
        } catch (e) {}
        this.proceduralNodes = this.proceduralNodes.filter(n => n !== chordGain && n !== filter);
      }, (duration + 0.5) * 1000);
    };

    playChord();
    this.proceduralInterval = setInterval(playChord, 5000);
  }

  private playProceduralGame() {
    if (!this.ctx || !this.musicGain) return;

    let step = 0;
    const tempo = 0.22; // 220ms por passo

    const nextNote = () => {
      if (this.currentBgmType !== "game" || !this.ctx) return;

      const now = this.ctx.currentTime;
      const freq = this.GAME_BASS_SEQUENCE[step % this.GAME_BASS_SEQUENCE.length];
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(150, now);
      filter.frequency.exponentialRampToValueAtTime(700, now + 0.04);
      filter.frequency.exponentialRampToValueAtTime(100, now + tempo - 0.02);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tempo - 0.01);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain!);

      osc.start(now);
      osc.stop(now + tempo);

      this.proceduralNodes.push(osc, filter, gain);

      if (step % 2 === 1) {
        this.playProceduralHihat(now);
      }

      if (step % 8 === 4) {
        this.playProceduralSnare(now);
      }

      setTimeout(() => {
        try {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch (e) {}
        this.proceduralNodes = this.proceduralNodes.filter(n => n !== osc && n !== filter && n !== gain);
      }, tempo * 1000 + 100);

      step = (step + 1) % this.GAME_BASS_SEQUENCE.length;
    };

    nextNote();
    this.proceduralInterval = setInterval(nextNote, tempo * 1000);
  }

  private playProceduralHihat(time: number) {
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
    filter.type = "highpass";
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.02, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.04);
  }

  private playProceduralSnare(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const duration = 0.15;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.03, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + duration);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, time);
    
    oscGain.gain.setValueAtTime(0.04, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.08);
  }
}

export const audioService = new AudioService();
