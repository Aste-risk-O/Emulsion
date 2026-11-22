import type { MusicSpec, SynthMotif } from '../types/memory';

export interface AnalyzedAudioResult {
  bpm: number;
  energy: number;
  durationSec: number;
}

class EmulsionAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private schedulerId: number | null = null;
  private bufferSource: AudioBufferSourceNode | null = null;
  private isPlayingState = false;
  private currentBpm = 84;
  private stepCounter = 0;
  private hoverTimeoutId: number | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.34;

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.value = 0.82;

      // Warm stereo atmospheric delay/reverb tail for cinematic depth
      const delayL = this.ctx.createDelay(1.0);
      delayL.delayTime.value = 0.28;
      const delayR = this.ctx.createDelay(1.0);
      delayR.delayTime.value = 0.41;

      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.34;

      const wetFilter = this.ctx.createBiquadFilter();
      wetFilter.type = 'lowpass';
      wetFilter.frequency.value = 1850;

      this.wetGain = this.ctx.createGain();
      this.wetGain.gain.value = 0.42;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      this.dryGain.connect(this.masterGain);
      this.dryGain.connect(delayL);
      delayL.connect(delayR);
      delayR.connect(wetFilter);
      wetFilter.connect(feedback);
      feedback.connect(delayL);
      wetFilter.connect(this.wetGain);
      this.wetGain.connect(this.masterGain);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isPlaying(): boolean {
    return this.isPlayingState;
  }

  public setDucking(isSpeaking: boolean): void {
    if (!this.ctx || !this.masterGain) return;
    const target = isSpeaking ? 0.1 : 0.34;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.35);
  }

  public setTempo(bpm: number): void {
    this.currentBpm = Math.max(48, Math.min(180, bpm));
  }

  public stop(): void {
    if (this.schedulerId !== null) {
      window.clearTimeout(this.schedulerId);
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    if (this.hoverTimeoutId !== null) {
      window.clearTimeout(this.hoverTimeoutId);
      this.hoverTimeoutId = null;
    }
    if (this.bufferSource) {
      try {
        this.bufferSource.stop();
        this.bufferSource.disconnect();
      } catch {
        // ignore if already stopped
      }
      this.bufferSource = null;
    }
    this.isPlayingState = false;
  }

  public async analyzeAudioFile(file: File): Promise<AnalyzedAudioResult> {
    const ctx = this.ensureContext();
    if (!ctx) {
      return { bpm: 92, energy: 0.55, durationSec: 0 };
    }
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    const windowSize = Math.floor(sampleRate * 0.04);
    const energies: number[] = [];
    let totalSq = 0;

    for (let i = 0; i < channelData.length; i += windowSize) {
      let sumSq = 0;
      const end = Math.min(channelData.length, i + windowSize);
      for (let j = i; j < end; j++) {
        sumSq += channelData[j] * channelData[j];
      }
      const rms = Math.sqrt(sumSq / Math.max(1, end - i));
      energies.push(rms);
      totalSq += rms;
    }

    const avgEnergy = totalSq / Math.max(1, energies.length);
    const threshold = avgEnergy * 1.45;
    const peakTimes: number[] = [];
    let lastPeakFrame = -8;

    for (let f = 1; f < energies.length - 1; f++) {
      if (
        energies[f] > threshold &&
        energies[f] > energies[f - 1] &&
        energies[f] >= energies[f + 1] &&
        f - lastPeakFrame >= 6
      ) {
        peakTimes.push(f * 0.04);
        lastPeakFrame = f;
      }
    }

    let estimatedBpm = 96;
    if (peakTimes.length >= 4) {
      const intervals: number[] = [];
      for (let i = 1; i < peakTimes.length; i++) {
        const dt = peakTimes[i] - peakTimes[i - 1];
        if (dt >= 0.3 && dt <= 1.4) {
          intervals.push(dt);
        }
      }
      if (intervals.length > 0) {
        intervals.sort((a, b) => a - b);
        const median = intervals[Math.floor(intervals.length / 2)];
        let bpm = Math.round(60 / median);
        while (bpm < 62) bpm *= 2;
        while (bpm > 152) bpm = Math.round(bpm / 2);
        estimatedBpm = bpm;
      }
    }

    const normalizedEnergy = Number(Math.min(1, Math.max(0.15, avgEnergy * 4.2)).toFixed(2));
    return {
      bpm: estimatedBpm,
      energy: normalizedEnergy,
      durationSec: Number(audioBuffer.duration.toFixed(1)),
    };
  }

  public async play(music: MusicSpec, onBeat?: (step: number) => void): Promise<void> {
    this.stop();
    const ctx = this.ensureContext();
    if (!ctx || !this.dryGain) return;

    this.isPlayingState = true;
    this.currentBpm = music.bpm || 84;
    this.stepCounter = 0;

    if (music.audioDataUrl) {
      try {
        const res = await fetch(music.audioDataUrl);
        const buf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(buf);
        if (!this.isPlayingState) return;
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.loop = true;
        source.connect(this.dryGain);
        source.start(0);
        this.bufferSource = source;

        const beatMs = Math.round(60000 / this.currentBpm);
        this.schedulerId = window.setInterval(() => {
          if (!this.isPlayingState) return;
          this.stepCounter += 1;
          onBeat?.(this.stepCounter);
        }, beatMs);
        return;
      } catch {
        // Fallback to procedural synthesis synced to BPM/key
      }
    }

    this.startProceduralLoop(music.motif, music.mode, onBeat);
  }

  public playHoverMotif(music: MusicSpec): void {
    if (this.isPlayingState) return;
    if (!this.ctx || this.ctx.state !== 'running' || !this.dryGain) return;

    if (this.hoverTimeoutId !== null) {
      window.clearTimeout(this.hoverTimeoutId);
    }

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const notes = this.getMotifFrequencies(music.motif, music.mode);
    notes.slice(0, 3).forEach((freq, idx) => {
      this.triggerSoftTone(ctx, freq, now + idx * 0.2, 0.7, 0.055, 'triangle');
    });
  }

  private startProceduralLoop(
    motif: SynthMotif,
    mode: 'major' | 'minor',
    onBeat?: (step: number) => void
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const tick = () => {
      if (!this.isPlayingState || !this.ctx) return;
      const now = this.ctx.currentTime;
      const step = this.stepCounter;

      if (motif === 'baroque-strings') {
        // Vivaldi G minor layered string ensemble + cello continuo
        const gMinorProg = [
          [196.0, 233.08, 293.66, 392.0, 293.66, 233.08, 392.0, 466.16],
          [174.61, 220.0, 293.66, 349.23, 293.66, 220.0, 349.23, 440.0],
          [155.56, 196.0, 233.08, 311.13, 233.08, 196.0, 311.13, 392.0],
          [146.83, 185.0, 220.0, 293.66, 220.0, 185.0, 293.66, 369.99],
        ];
        const bar = Math.floor(step / 8) % gMinorProg.length;
        const noteIdx = step % 8;
        const freq = gMinorProg[bar][noteIdx];
        this.triggerBowedString(this.ctx, freq, now, 0.28, 0.14);
        if (noteIdx % 4 === 0) {
          this.triggerSoftTone(this.ctx, gMinorProg[bar][0] * 0.5, now, 0.65, 0.13, 'triangle');
        }
      } else if (motif === 'ambient-pulse') {
        const scale =
          mode === 'minor'
            ? [220.0, 261.63, 329.63, 392.0, 440.0, 329.63]
            : [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
        const freq = scale[step % scale.length];
        const isSlow = this.currentBpm < 85;
        this.triggerSoftTone(
          this.ctx,
          freq,
          now,
          isSlow ? 2.2 : 0.45,
          isSlow ? 0.085 : 0.11,
          isSlow ? 'sine' : 'triangle'
        );
        if (step % 4 === 0) {
          this.triggerSoftTone(this.ctx, scale[0] * 0.5, now, isSlow ? 2.8 : 1.4, 0.1, 'sine');
          if (isSlow) {
            this.triggerSoftTone(this.ctx, scale[2], now + 0.08, 2.4, 0.06, 'sine');
          }
        }
      } else if (motif === 'lofi-keys') {
        const chords =
          mode === 'major'
            ? [
                [261.63, 329.63, 392.0, 493.88],
                [220.0, 261.63, 329.63, 392.0],
                [174.61, 220.0, 261.63, 329.63],
                [196.0, 246.94, 293.66, 349.23],
              ]
            : [
                [220.0, 261.63, 329.63, 392.0],
                [174.61, 207.65, 261.63, 311.13],
                [196.0, 233.08, 293.66, 349.23],
                [164.81, 196.0, 246.94, 293.66],
              ];
        if (step % 2 === 0) {
          const chord = chords[Math.floor(step / 4) % chords.length];
          chord.forEach((f, idx) => {
            this.triggerSoftTone(this.ctx!, f, now + idx * 0.045, 1.5, 0.075, 'sine');
          });
        }
      } else {
        const arp =
          mode === 'major'
            ? [293.66, 369.99, 440.0, 587.33, 440.0, 369.99]
            : [246.94, 293.66, 369.99, 493.88, 369.99, 293.66];
        const freq = arp[step % arp.length];
        this.triggerSoftTone(
          this.ctx,
          freq,
          now,
          1.3,
          0.09,
          motif === 'acoustic-breeze' ? 'triangle' : 'sine'
        );
      }

      this.stepCounter += 1;
      onBeat?.(this.stepCounter);

      const subdivisionMs =
        motif === 'baroque-strings'
          ? Math.round(30000 / this.currentBpm)
          : Math.round(60000 / this.currentBpm);

      this.schedulerId = window.setTimeout(tick, subdivisionMs);
    };

    tick();
  }

  private getMotifFrequencies(motif: SynthMotif, mode: 'major' | 'minor'): number[] {
    if (motif === 'baroque-strings') return [196.0, 233.08, 293.66, 392.0];
    if (mode === 'minor') return [220.0, 261.63, 329.63];
    return [261.63, 329.63, 392.0];
  }

  private triggerSoftTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number,
    type: OscillatorType
  ): void {
    if (!this.dryGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1750, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private triggerBowedString(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number
  ): void {
    if (!this.dryGain) return;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 1.004, startTime);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 2.3, startTime);
    filter.Q.setValueAtTime(1.3, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryGain);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.02);
    osc2.stop(startTime + duration + 0.02);
  }

  public getSpectrumBands(count = 16): number[] {
    if (!this.analyser || !this.isPlayingState) {
      return new Array(count).fill(0);
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const bands: number[] = [];
    const stride = Math.max(1, Math.floor(data.length / count));
    for (let i = 0; i < count; i++) {
      const val = data[Math.min(data.length - 1, i * stride)] / 255;
      bands.push(val);
    }
    return bands;
  }
}

export const audioEngine = new EmulsionAudioEngine();
