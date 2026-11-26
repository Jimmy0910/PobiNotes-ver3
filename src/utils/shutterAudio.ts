/**
 * Procedural Web Audio API synthesizer for the warehouse roller shutter intro.
 * Synthesizes realistic metallic aerosol spray-can acoustics (marble rattle,
 * pressurized nozzle burst, multi-band mist hiss, surface overspray, valve release)
 * and industrial steel roller-shutter mechanics (latch clank, discrete hinge/chain
 * metallic "ka-ka-ka" clatter, steel track friction, motor hum, and top-stop clank).
 */

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export class ShutterAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private disposed = false;

  // Active spray sound nodes
  private sprayGain: GainNode | null = null;
  private sprayCoreFilter: BiquadFilterNode | null = null;
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
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -14;
        this.compressor.knee.value = 18;
        this.compressor.ratio.value = 6;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.14;

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.85;

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  private getOutputNode(): AudioNode | null {
    return this.compressor || this.masterGain;
  }

  private getWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.whiteNoiseBuffer && this.whiteNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.whiteNoiseBuffer;
    }
    const durationSec = 2.4;
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.whiteNoiseBuffer = buffer;
    return buffer;
  }

  private getPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.pinkNoiseBuffer && this.pinkNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.pinkNoiseBuffer;
    }
    const durationSec = 2.5;
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      b3 = 0.88 * b3 + white * 0.065;
      data[i] = Math.max(-1, Math.min(1, white * 0.48 + (b0 + b1 + b2 + b3) * 0.52));
    }
    this.pinkNoiseBuffer = buffer;
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
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.85, now, 0.025);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Realistic metallic mixing-ball rattle inside thin aluminum spray can ("ka-la, ka-la, ka-la").
   */
  public playCanShake(): void {
    const ctx = this.ensureContext();
    const out = this.getOutputNode();
    if (!ctx || !out || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const whiteBuf = this.getWhiteNoiseBuffer(ctx);
    // Double-tap impacts per shake (ball hits top & bottom of can wall)
    const hits = [
      { t: 0.015, amp: 0.22, pitch: 1.0 },
      { t: 0.062, amp: 0.16, pitch: 1.08 },
      { t: 0.118, amp: 0.24, pitch: 0.96 },
      { t: 0.165, amp: 0.17, pitch: 1.12 },
      { t: 0.222, amp: 0.2, pitch: 1.03 },
    ];

    for (const hit of hits) {
      const start = now + hit.t;

      // Crisp metallic ping harmonic pair (inharmonic thin-can modes)
      const f1 = 2420 * hit.pitch;
      const f2 = 3980 * hit.pitch;

      [f1, f2].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.86, start + 0.036);

        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(hit.amp * (idx === 0 ? 0.52 : 0.34), start + 0.0025);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.038);

        osc.connect(g);
        g.connect(out);
        osc.start(start);
        osc.stop(start + 0.042);
      });

      // Short metallic click transient
      const clickNoise = ctx.createBufferSource();
      clickNoise.buffer = whiteBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(4600 * hit.pitch, start);
      bp.Q.setValueAtTime(3.2, start);

      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, start);
      ng.gain.linearRampToValueAtTime(hit.amp * 0.65, start + 0.002);
      ng.gain.exponentialRampToValueAtTime(0.0001, start + 0.016);

      clickNoise.connect(bp);
      bp.connect(ng);
      ng.connect(out);
      clickNoise.start(start, Math.random() * 1.2, 0.02);
    }
  }

  /**
   * Multi-layered realistic pressurized aerosol spray-paint sound:
   * - Crisp actuator press click + initial pressure burst
   * - High-frequency fine atomized mist hiss (4.2kHz - 11kHz)
   * - Focused pressurized nozzle jet core (2.4kHz - 3.6kHz) with sweeping wrist modulation
   * - Fine paint-on-steel surface overspray texture (1.1kHz - 1.7kHz)
   */
  public startSpray(intensity = 1): void {
    if (this.disposed) return;
    const ctx = this.ensureContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    if (this.isSpraying && this.sprayGain) {
      const now = ctx.currentTime;
      this.sprayGain.gain.setTargetAtTime(0.42 * intensity, now, 0.04);
      if (this.sprayCoreFilter) {
        this.sprayCoreFilter.frequency.setTargetAtTime(2950 + intensity * 350, now, 0.06);
      }
      return;
    }

    this.isSpraying = true;
    const now = ctx.currentTime;

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = this.getWhiteNoiseBuffer(ctx);
    whiteNoise.loop = true;

    const pinkNoise = ctx.createBufferSource();
    pinkNoise.buffer = this.getPinkNoiseBuffer(ctx);
    pinkNoise.loop = true;

    // Layer 1: High-pressure atomized aerosol hiss (crisp air escaping tiny pinhole)
    const hissHp = ctx.createBiquadFilter();
    hissHp.type = 'highpass';
    hissHp.frequency.setValueAtTime(4200, now);
    hissHp.Q.setValueAtTime(0.7, now);

    const hissShelf = ctx.createBiquadFilter();
    hissShelf.type = 'highshelf';
    hissShelf.frequency.setValueAtTime(7600, now);
    hissShelf.gain.setValueAtTime(5.5, now);

    const hissGain = ctx.createGain();
    hissGain.gain.setValueAtTime(0.48, now);

    // Subtle fast air turbulence modulation on hiss amplitude
    const turbLfo = ctx.createOscillator();
    const turbDepth = ctx.createGain();
    turbLfo.type = 'sine';
    turbLfo.frequency.setValueAtTime(11.5, now);
    turbDepth.gain.setValueAtTime(0.065, now);
    turbLfo.connect(turbDepth);
    turbDepth.connect(hissGain.gain);

    // Layer 2: Focused pressurized nozzle jet core (gives authentic "psssshhh" focus)
    const coreBp = ctx.createBiquadFilter();
    coreBp.type = 'bandpass';
    coreBp.frequency.setValueAtTime(3100, now);
    coreBp.Q.setValueAtTime(1.45, now);

    // Sweeping wrist motion filter LFO (subtle distance-to-door pitch shimmer)
    const sweepLfo = ctx.createOscillator();
    const sweepDepth = ctx.createGain();
    sweepLfo.type = 'sine';
    sweepLfo.frequency.setValueAtTime(3.8, now);
    sweepDepth.gain.setValueAtTime(420, now);
    sweepLfo.connect(sweepDepth);
    sweepDepth.connect(coreBp.frequency);

    const coreGain = ctx.createGain();
    coreGain.gain.setValueAtTime(0.44, now);

    // Layer 3: Paint mist hitting corrugated steel shutter ("sha-sha" surface texture)
    const surfaceBp = ctx.createBiquadFilter();
    surfaceBp.type = 'bandpass';
    surfaceBp.frequency.setValueAtTime(1380, now);
    surfaceBp.Q.setValueAtTime(1.1, now);

    const surfaceGain = ctx.createGain();
    surfaceGain.gain.setValueAtTime(0.22, now);

    // Master spray envelope with brief initial pressure surge
    const sprayGain = ctx.createGain();
    sprayGain.gain.setValueAtTime(0.0001, now);
    sprayGain.gain.linearRampToValueAtTime(0.56 * intensity, now + 0.022);
    sprayGain.gain.exponentialRampToValueAtTime(0.42 * intensity, now + 0.095);

    whiteNoise.connect(hissHp);
    hissHp.connect(hissShelf);
    hissShelf.connect(hissGain);
    hissGain.connect(sprayGain);

    whiteNoise.connect(coreBp);
    coreBp.connect(coreGain);
    coreGain.connect(sprayGain);

    pinkNoise.connect(surfaceBp);
    surfaceBp.connect(surfaceGain);
    surfaceGain.connect(sprayGain);

    sprayGain.connect(out);

    // Plastic nozzle valve press click
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1450, now);
    clickOsc.frequency.exponentialRampToValueAtTime(310, now + 0.018);
    clickGain.gain.setValueAtTime(0.11, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
    clickOsc.connect(clickGain);
    clickGain.connect(out);

    whiteNoise.start(now);
    pinkNoise.start(now, 0.4);
    turbLfo.start(now);
    sweepLfo.start(now);
    clickOsc.start(now);
    clickOsc.stop(now + 0.028);

    this.sprayGain = sprayGain;
    this.sprayCoreFilter = coreBp;
    this.spraySources = [
      whiteNoise,
      pinkNoise,
      hissHp,
      hissShelf,
      hissGain,
      turbLfo,
      turbDepth,
      coreBp,
      sweepLfo,
      sweepDepth,
      coreGain,
      surfaceBp,
      surfaceGain,
      sprayGain,
    ];
  }

  /**
   * Smoothly depressurizes nozzle hiss with realistic pressure drop & valve release click.
   */
  public stopSpray(): void {
    if (!this.isSpraying || !this.ctx) return;
    this.isSpraying = false;
    const ctx = this.ctx;
    const out = this.getOutputNode();
    const now = ctx.currentTime;
    const oldGain = this.sprayGain;
    const oldFilter = this.sprayCoreFilter;
    const oldSources = this.spraySources;
    this.sprayGain = null;
    this.sprayCoreFilter = null;
    this.spraySources = [];

    if (oldFilter) {
      try {
        oldFilter.frequency.cancelScheduledValues(now);
        oldFilter.frequency.setValueAtTime(oldFilter.frequency.value, now);
        oldFilter.frequency.exponentialRampToValueAtTime(1400, now + 0.085);
      } catch {}
    }

    if (oldGain) {
      try {
        oldGain.gain.cancelScheduledValues(now);
        oldGain.gain.setValueAtTime(Math.max(oldGain.gain.value, 0.001), now);
        oldGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      } catch {}
    }

    // Subtle valve spring release tick
    if (out && ctx.state === 'running') {
      try {
        const tickOsc = ctx.createOscillator();
        const tickGain = ctx.createGain();
        tickOsc.type = 'sine';
        tickOsc.frequency.setValueAtTime(860, now + 0.025);
        tickOsc.frequency.exponentialRampToValueAtTime(1620, now + 0.042);
        tickGain.gain.setValueAtTime(0.055, now + 0.025);
        tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.048);
        tickOsc.connect(tickGain);
        tickGain.connect(out);
        tickOsc.start(now + 0.025);
        tickOsc.stop(now + 0.052);
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
    }, 125);
  }

  /**
   * Schedules a single crisp metallic hinge/chain "ka!" impact hit.
   */
  private scheduleMetallicClack(
    ctx: AudioContext,
    out: AudioNode,
    whiteBuf: AudioBuffer,
    time: number,
    volume: number,
    pitchScale: number,
    nodes: AudioNode[]
  ): void {
    // 1. High-energy metallic impact noise burst through dual resonant metal bands
    const src = ctx.createBufferSource();
    src.buffer = whiteBuf;

    const ring1 = ctx.createBiquadFilter();
    ring1.type = 'bandpass';
    ring1.frequency.setValueAtTime(1180 * pitchScale, time);
    ring1.Q.setValueAtTime(5.2, time);

    const ring2 = ctx.createBiquadFilter();
    ring2.type = 'bandpass';
    ring2.frequency.setValueAtTime(2860 * pitchScale, time);
    ring2.Q.setValueAtTime(6.0, time);

    const hitEnv = ctx.createGain();
    hitEnv.gain.setValueAtTime(0.0001, time);
    hitEnv.gain.linearRampToValueAtTime(volume, time + 0.0025);
    hitEnv.gain.exponentialRampToValueAtTime(0.0001, time + 0.036);

    src.connect(ring1);
    src.connect(ring2);
    ring1.connect(hitEnv);
    ring2.connect(hitEnv);
    hitEnv.connect(out);

    src.start(time, Math.random() * 1.4, 0.045);

    // 2. Short inharmonic steel-hinge ping for authentic metallic "ka" bite
    const pingOsc = ctx.createOscillator();
    const pingGain = ctx.createGain();
    pingOsc.type = 'square';
    pingOsc.frequency.setValueAtTime(1740 * pitchScale, time);
    pingOsc.frequency.exponentialRampToValueAtTime(920 * pitchScale, time + 0.022);

    const pingFilter = ctx.createBiquadFilter();
    pingFilter.type = 'bandpass';
    pingFilter.frequency.setValueAtTime(2200 * pitchScale, time);
    pingFilter.Q.setValueAtTime(3.0, time);

    pingGain.gain.setValueAtTime(0.0001, time);
    pingGain.gain.linearRampToValueAtTime(volume * 0.32, time + 0.002);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.026);

    pingOsc.connect(pingFilter);
    pingFilter.connect(pingGain);
    pingGain.connect(out);
    pingOsc.start(time);
    pingOsc.stop(time + 0.03);

    nodes.push(src, ring1, ring2, hitEnv, pingOsc, pingFilter, pingGain);
  }

  /**
   * Plays realistic industrial steel roller-shutter roll-up acoustics:
   * 1. Heavy metallic latch release clank
   * 2. Discrete rhythmic hinge/chain "ka-ka-ka" metallic clatter accelerating with shutter motion
   * 3. Galvanized steel slat friction against side guide tracks
   * 4. Low-end electric hoist motor hum
   * 5. Top-stop steel brake clank & ring-out
   */
  public playShutterRollUp(durationSec = 1.62): void {
    if (this.disposed || this.isRolling) return;
    const ctx = this.ensureContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    this.isRolling = true;
    const now = ctx.currentTime;
    const end = now + durationSec;
    const whiteBuf = this.getWhiteNoiseBuffer(ctx);
    const pinkBuf = this.getPinkNoiseBuffer(ctx);
    const nodes: AudioNode[] = [];

    // 1. Initial heavy steel latch release ("KA-CLANG!")
    const clunkOsc = ctx.createOscillator();
    const clunkGain = ctx.createGain();
    clunkOsc.type = 'triangle';
    clunkOsc.frequency.setValueAtTime(165, now);
    clunkOsc.frequency.exponentialRampToValueAtTime(44, now + 0.11);
    clunkGain.gain.setValueAtTime(0.46, now);
    clunkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    clunkOsc.connect(clunkGain);
    clunkGain.connect(out);
    clunkOsc.start(now);
    clunkOsc.stop(now + 0.14);
    nodes.push(clunkOsc, clunkGain);

    // Sharp metallic latch ring right on release
    this.scheduleMetallicClack(ctx, out, whiteBuf, now + 0.006, 0.58, 0.88, nodes);
    this.scheduleMetallicClack(ctx, out, whiteBuf, now + 0.048, 0.42, 1.18, nodes);

    // 2. Discrete metallic hinge & chain "ka-ka-ka-ka" clatter across the roll-up
    let t = now + 0.095;
    let stepIndex = 0;
    const rollEnd = end - 0.1;
    while (t < rollEnd) {
      const progress = (t - now) / durationSec;
      // Start slower, accelerate in the middle, ease slightly near the top housing
      const speedFactor = progress < 0.28 ? 0.65 + (progress / 0.28) * 0.55 : progress > 0.82 ? 0.92 : 1.2;
      const baseInterval = 0.068 / speedFactor;
      const jitter = (Math.random() - 0.5) * 0.012;
      const pitch = 0.86 + Math.random() * 0.32 + progress * 0.12;
      const accent = stepIndex % 3 === 0 ? 1.18 : 0.88;
      const vol = Math.min(0.62, (0.34 + Math.random() * 0.14) * accent);

      this.scheduleMetallicClack(ctx, out, whiteBuf, t, vol, pitch, nodes);

      // Every 3rd slat joint produces a double-hinge "ka-la!" bounce
      if (stepIndex % 3 === 1 && t + 0.019 < rollEnd) {
        this.scheduleMetallicClack(ctx, out, whiteBuf, t + 0.019, vol * 0.64, pitch * 1.14, nodes);
      }

      t += Math.max(0.042, baseInterval + jitter);
      stepIndex += 1;
    }

    // 3. Metallic steel-on-steel side guide track friction & hollow slat resonance
    const trackNoise = ctx.createBufferSource();
    trackNoise.buffer = pinkBuf;
    trackNoise.loop = true;

    const metalTrack1 = ctx.createBiquadFilter();
    metalTrack1.type = 'bandpass';
    metalTrack1.frequency.setValueAtTime(720, now);
    metalTrack1.frequency.linearRampToValueAtTime(980, end);
    metalTrack1.Q.setValueAtTime(3.6, now);

    const metalTrack2 = ctx.createBiquadFilter();
    metalTrack2.type = 'bandpass';
    metalTrack2.frequency.setValueAtTime(2150, now);
    metalTrack2.frequency.linearRampToValueAtTime(2680, end);
    metalTrack2.Q.setValueAtTime(4.2, now);

    const trackEnv = ctx.createGain();
    trackEnv.gain.setValueAtTime(0.0001, now);
    trackEnv.gain.linearRampToValueAtTime(0.32, now + 0.14);
    trackEnv.gain.setValueAtTime(0.28, end - 0.15);
    trackEnv.gain.exponentialRampToValueAtTime(0.0001, end + 0.03);

    trackNoise.connect(metalTrack1);
    trackNoise.connect(metalTrack2);
    metalTrack1.connect(trackEnv);
    metalTrack2.connect(trackEnv);
    trackEnv.connect(out);

    trackNoise.start(now + 0.04);
    trackNoise.stop(end + 0.05);
    nodes.push(trackNoise, metalTrack1, metalTrack2, trackEnv);

    // 4. Electric hoist motor low-frequency hum (balanced underneath metallic clatter)
    const motorOsc1 = ctx.createOscillator();
    const motorOsc2 = ctx.createOscillator();
    const motorFilter = ctx.createBiquadFilter();
    const motorGain = ctx.createGain();

    motorOsc1.type = 'sawtooth';
    motorOsc2.type = 'triangle';
    motorOsc1.frequency.setValueAtTime(50, now + 0.04);
    motorOsc1.frequency.linearRampToValueAtTime(64, now + 0.34);
    motorOsc1.frequency.setValueAtTime(64, end - 0.16);
    motorOsc1.frequency.exponentialRampToValueAtTime(36, end);

    motorOsc2.frequency.setValueAtTime(100, now + 0.04);
    motorOsc2.frequency.linearRampToValueAtTime(128, now + 0.34);
    motorOsc2.frequency.setValueAtTime(128, end - 0.16);
    motorOsc2.frequency.exponentialRampToValueAtTime(72, end);

    motorFilter.type = 'lowpass';
    motorFilter.frequency.setValueAtTime(195, now);

    motorGain.gain.setValueAtTime(0.0001, now);
    motorGain.gain.linearRampToValueAtTime(0.18, now + 0.14);
    motorGain.gain.setValueAtTime(0.16, end - 0.16);
    motorGain.gain.exponentialRampToValueAtTime(0.0001, end + 0.04);

    motorOsc1.connect(motorFilter);
    motorOsc2.connect(motorFilter);
    motorFilter.connect(motorGain);
    motorGain.connect(out);
    motorOsc1.start(now + 0.03);
    motorOsc2.start(now + 0.03);
    motorOsc1.stop(end + 0.06);
    motorOsc2.stop(end + 0.06);
    nodes.push(motorOsc1, motorOsc2, motorFilter, motorGain);

    // 5. Top-stop mechanical brake thud + metallic housing clank & ring-out
    const stopTime = Math.max(now + 0.22, end - 0.09);
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(132, stopTime);
    thudOsc.frequency.exponentialRampToValueAtTime(36, stopTime + 0.15);
    thudGain.gain.setValueAtTime(0.42, stopTime);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.17);
    thudOsc.connect(thudGain);
    thudGain.connect(out);
    thudOsc.start(stopTime);
    thudOsc.stop(stopTime + 0.18);
    nodes.push(thudOsc, thudGain);

    this.scheduleMetallicClack(ctx, out, whiteBuf, stopTime, 0.56, 0.78, nodes);
    this.scheduleMetallicClack(ctx, out, whiteBuf, stopTime + 0.038, 0.3, 1.06, nodes);

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
      this.compressor = null;
      ctxToClose.close().catch(() => {});
    }
  }
}
