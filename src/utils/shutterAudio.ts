/**
 * Procedural Web Audio API synthesizer for the warehouse roller shutter intro.
 * Generates realistic aerosol spray-paint hiss and motorized steel roller-shutter
 * roll-up mechanical clatter without requiring external audio files.
 */

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export class ShutterAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private disposed = false;

  // Active spray sound nodes
  private sprayGain: GainNode | null = null;
  private spraySources: AudioNode[] = [];
  private isSpraying = false;

  // Active shutter roll-up nodes
  private rollSources: AudioNode[] = [];
  private isRolling = false;

  private ensureContext(): AudioContext | null {
    if (this.disposed || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.78;
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const durationSec = 2.5;
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Slightly pink-tinted white noise for richer acoustic texture
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      data[i] = Math.max(-1, Math.min(1, (white * 0.65 + (b0 + b1 + b2) * 0.35)));
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /**
   * Attempts to initialize and resume the AudioContext.
   * Returns true if audio is actively running, false if suspended by browser autoplay policy.
   */
  public async tryUnlock(): Promise<boolean> {
    const ctx = this.ensureContext();
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

  public isRunning(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.78, now, 0.025);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Short metallic marble rattle when shaking the spray can before spraying.
   */
  public playCanShake(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const offsets = [0.02, 0.11, 0.2];
    offsets.forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1680 + idx * 140, now + offset);
      osc.frequency.exponentialRampToValueAtTime(880, now + offset + 0.045);

      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.linearRampToValueAtTime(0.09, now + offset + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + offset);
      osc.stop(now + offset + 0.055);
    });
  }

  /**
   * Starts continuous aerosol spray-paint hiss with valve click and realistic air-turbulence modulation.
   */
  public startSpray(intensity = 1): void {
    if (this.disposed) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (this.isSpraying && this.sprayGain) {
      const now = ctx.currentTime;
      this.sprayGain.gain.setTargetAtTime(0.32 * intensity, now, 0.04);
      return;
    }

    this.isSpraying = true;
    const now = ctx.currentTime;

    // 1. Aerosol air-stream noise source
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    noise.loop = true;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(2200, now);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(5200, now);
    bandpass.Q.setValueAtTime(1.15, now);

    // Subtle shimmer in nozzle hiss pressure
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(7.5, now);
    lfoGain.gain.setValueAtTime(650, now);
    lfo.connect(lfoGain);
    lfoGain.connect(bandpass.frequency);

    // Soft airy body layer (1.4kHz hiss body)
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(1650, now);
    bodyFilter.Q.setValueAtTime(0.9, now);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.18, now);

    const sprayGain = ctx.createGain();
    sprayGain.gain.setValueAtTime(0.0001, now);
    sprayGain.gain.linearRampToValueAtTime(0.32 * intensity, now + 0.05);

    noise.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(sprayGain);

    noise.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(sprayGain);

    sprayGain.connect(this.masterGain);

    // Valve press click
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(920, now);
    clickOsc.frequency.exponentialRampToValueAtTime(260, now + 0.025);
    clickGain.gain.setValueAtTime(0.08, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    clickOsc.connect(clickGain);
    clickGain.connect(this.masterGain);

    noise.start(now);
    lfo.start(now);
    clickOsc.start(now);
    clickOsc.stop(now + 0.035);

    this.sprayGain = sprayGain;
    this.spraySources = [noise, lfo, highpass, bandpass, bodyFilter, bodyGain, lfoGain, sprayGain];
  }

  /**
   * Smoothly stops aerosol spray hiss.
   */
  public stopSpray(): void {
    if (!this.isSpraying || !this.ctx) return;
    this.isSpraying = false;
    const now = this.ctx.currentTime;
    const oldGain = this.sprayGain;
    const oldSources = this.spraySources;
    this.sprayGain = null;
    this.spraySources = [];

    if (oldGain) {
      try {
        oldGain.gain.cancelScheduledValues(now);
        oldGain.gain.setValueAtTime(Math.max(oldGain.gain.value, 0.001), now);
        oldGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      } catch {}
    }

    window.setTimeout(() => {
      oldSources.forEach((node) => {
        try {
          if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
            (node as AudioScheduledSourceNode).stop();
          }
          node.disconnect();
        } catch {}
      });
    }, 110);
  }

  /**
   * Plays motorized steel warehouse roller-shutter opening sound:
   * relay clunk -> electric motor hum + rhythmic metallic slat roll clatter -> top-stop clank.
   */
  public playShutterRollUp(durationSec = 1.65): void {
    if (this.disposed || this.isRolling) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    this.isRolling = true;
    const now = ctx.currentTime;
    const end = now + durationSec;
    const nodes: AudioNode[] = [];

    // 1. Initial heavy mechanical relay / latch release clunk
    const clunkOsc = ctx.createOscillator();
    const clunkGain = ctx.createGain();
    clunkOsc.type = 'triangle';
    clunkOsc.frequency.setValueAtTime(145, now);
    clunkOsc.frequency.exponentialRampToValueAtTime(42, now + 0.11);
    clunkGain.gain.setValueAtTime(0.42, now);
    clunkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    clunkOsc.connect(clunkGain);
    clunkGain.connect(this.masterGain);
    clunkOsc.start(now);
    clunkOsc.stop(now + 0.14);
    nodes.push(clunkOsc, clunkGain);

    // 2. Electric motor low-frequency hum (58Hz fundamental + 116Hz harmonic)
    const motorOsc1 = ctx.createOscillator();
    const motorOsc2 = ctx.createOscillator();
    const motorFilter = ctx.createBiquadFilter();
    const motorGain = ctx.createGain();

    motorOsc1.type = 'sawtooth';
    motorOsc2.type = 'triangle';
    motorOsc1.frequency.setValueAtTime(52, now + 0.04);
    motorOsc1.frequency.linearRampToValueAtTime(66, now + 0.35);
    motorOsc1.frequency.setValueAtTime(66, end - 0.18);
    motorOsc1.frequency.exponentialRampToValueAtTime(38, end);

    motorOsc2.frequency.setValueAtTime(104, now + 0.04);
    motorOsc2.frequency.linearRampToValueAtTime(132, now + 0.35);
    motorOsc2.frequency.setValueAtTime(132, end - 0.18);
    motorOsc2.frequency.exponentialRampToValueAtTime(76, end);

    motorFilter.type = 'lowpass';
    motorFilter.frequency.setValueAtTime(210, now);

    motorGain.gain.setValueAtTime(0.0001, now);
    motorGain.gain.linearRampToValueAtTime(0.24, now + 0.14);
    motorGain.gain.setValueAtTime(0.22, end - 0.16);
    motorGain.gain.exponentialRampToValueAtTime(0.0001, end + 0.04);

    motorOsc1.connect(motorFilter);
    motorOsc2.connect(motorFilter);
    motorFilter.connect(motorGain);
    motorGain.connect(this.masterGain);
    motorOsc1.start(now + 0.03);
    motorOsc2.start(now + 0.03);
    motorOsc1.stop(end + 0.06);
    motorOsc2.stop(end + 0.06);
    nodes.push(motorOsc1, motorOsc2, motorFilter, motorGain);

    // 3. Rhythmic steel slats rattling up the side guide tracks
    const rattleNoise = ctx.createBufferSource();
    rattleNoise.buffer = this.getNoiseBuffer(ctx);
    rattleNoise.loop = true;

    const metalBand1 = ctx.createBiquadFilter();
    metalBand1.type = 'bandpass';
    metalBand1.frequency.setValueAtTime(460, now);
    metalBand1.Q.setValueAtTime(2.6, now);

    const metalBand2 = ctx.createBiquadFilter();
    metalBand2.type = 'bandpass';
    metalBand2.frequency.setValueAtTime(1480, now);
    metalBand2.Q.setValueAtTime(3.2, now);

    // Amplitude modulation LFO creates the unmistakable slat-by-slat rolling cadence
    const slatAmp = ctx.createGain();
    slatAmp.gain.setValueAtTime(0.22, now);

    const slatLfo = ctx.createOscillator();
    const slatLfoDepth = ctx.createGain();
    slatLfo.type = 'sine';
    slatLfo.frequency.setValueAtTime(11, now + 0.05);
    slatLfo.frequency.linearRampToValueAtTime(21, now + durationSec * 0.55);
    slatLfo.frequency.linearRampToValueAtTime(16, end);
    slatLfoDepth.gain.setValueAtTime(0.14, now);

    slatLfo.connect(slatLfoDepth);
    slatLfoDepth.connect(slatAmp.gain);

    const rattleEnv = ctx.createGain();
    rattleEnv.gain.setValueAtTime(0.0001, now);
    rattleEnv.gain.linearRampToValueAtTime(0.55, now + 0.16);
    rattleEnv.gain.setValueAtTime(0.5, end - 0.16);
    rattleEnv.gain.exponentialRampToValueAtTime(0.0001, end + 0.02);

    rattleNoise.connect(metalBand1);
    rattleNoise.connect(metalBand2);
    metalBand1.connect(slatAmp);
    metalBand2.connect(slatAmp);
    slatAmp.connect(rattleEnv);
    rattleEnv.connect(this.masterGain);

    rattleNoise.start(now + 0.04);
    slatLfo.start(now + 0.04);
    rattleNoise.stop(end + 0.05);
    slatLfo.stop(end + 0.05);
    nodes.push(rattleNoise, metalBand1, metalBand2, slatAmp, slatLfo, slatLfoDepth, rattleEnv);

    // 4. Top-stop mechanical brake thud right as shutter finishes rolling into housing
    const stopTime = Math.max(now + 0.2, end - 0.09);
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(125, stopTime);
    thudOsc.frequency.exponentialRampToValueAtTime(36, stopTime + 0.14);
    thudGain.gain.setValueAtTime(0.36, stopTime);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.16);
    thudOsc.connect(thudGain);
    thudGain.connect(this.masterGain);
    thudOsc.start(stopTime);
    thudOsc.stop(stopTime + 0.17);
    nodes.push(thudOsc, thudGain);

    this.rollSources = nodes;
  }

  public dispose(): void {
    this.disposed = true;
    this.stopSpray();
    this.rollSources.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {}
    });
    this.rollSources = [];
    this.isRolling = false;
    if (this.ctx) {
      const ctxToClose = this.ctx;
      this.ctx = null;
      this.masterGain = null;
      ctxToClose.close().catch(() => {});
    }
  }
}
