import { useEffect, useRef, useState, useCallback } from 'react';
import { FastForward, Volume2, VolumeX } from 'lucide-react';
import { ShutterAudioEngine } from '../utils/shutterAudio';

interface RollerShutterIntroProps {
  onComplete: () => void;
}

interface MistParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  decay: number;
  color: string;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInQuad(t: number): number {
  return t * t;
}

/**
 * Brushed-silver metallic aerosol spray can matching the warehouse studio scene:
 * red nozzle cap, deep navy POBI label with bright green band, and fine green mist cone.
 */
function SprayCanSvg({ spraying }: { spraying: boolean }) {
  return (
    <svg
      width="160"
      height="210"
      viewBox="0 0 160 210"
      fill="none"
      aria-hidden="true"
      style={{
        overflow: 'visible',
        filter: 'drop-shadow(0 14px 20px rgba(15, 23, 42, 0.34))',
      }}
    >
      <defs>
        <linearGradient id="pobiCanMetal" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8C99A8" />
          <stop offset="22%" stopColor="#E6EDF4" />
          <stop offset="46%" stopColor="#F8FAFC" />
          <stop offset="72%" stopColor="#B8C5D4" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        <linearGradient id="pobiCanDome" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="55%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        <linearGradient id="pobiCanNavy" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#071940" />
          <stop offset="35%" stopColor="#0F2D6B" />
          <stop offset="75%" stopColor="#091E4A" />
          <stop offset="100%" stopColor="#040F29" />
        </linearGradient>
        <linearGradient id="pobiCanGreen" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2E8B3D" />
          <stop offset="38%" stopColor="#58C454" />
          <stop offset="78%" stopColor="#38A347" />
          <stop offset="100%" stopColor="#1F6A2D" />
        </linearGradient>
        <radialGradient id="pobiGreenMistCone" cx="92%" cy="50%" r="92%">
          <stop offset="0%" stopColor="#DCFCE7" stopOpacity="0.95" />
          <stop offset="24%" stopColor="#4ADE80" stopOpacity="0.62" />
          <stop offset="58%" stopColor="#22C55E" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Directional Green Aerosol Spray Mist Cone */}
      {spraying && (
        <g opacity="0.95">
          <polygon points="56,28 -118,-18 -134,76" fill="url(#pobiGreenMistCone)" />
          <circle cx="24" cy="24" r="2.2" fill="#22C55E" opacity="0.6" />
          <circle cx="-6" cy="18" r="1.8" fill="#16A34A" opacity="0.5" />
          <circle cx="-22" cy="34" r="2.4" fill="#4ADE80" opacity="0.45" />
          <circle cx="-48" cy="25" r="1.9" fill="#22C55E" opacity="0.38" />
          <circle cx="-72" cy="39" r="1.5" fill="#15803D" opacity="0.32" />
        </g>
      )}

      {/* Tilted Metallic Aerosol Can Body */}
      <g transform="translate(80, 108) rotate(-14) translate(-44, -84)">
        {/* Red Nozzle Actuator */}
        <rect x="34" y="8" width="18" height="14" rx="2.5" fill="#D93829" stroke="#7F1D1D" strokeWidth="1.4" />
        <rect x="37" y="10" width="4" height="10" rx="1" fill="#F87171" opacity="0.55" />
        {/* Tiny black nozzle orifice on left side */}
        <circle cx="36" cy="15" r="2" fill="#1E293B" />
        {/* Metallic Valve Stem & Cup */}
        <rect x="40" y="22" width="6" height="4" fill="#94A3B8" />
        <rect x="33" y="25" width="20" height="4" rx="1.5" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />

        {/* Metallic Dome Shoulder */}
        <path
          d="M15 47 C15 30, 71 30, 71 47 Z"
          fill="url(#pobiCanDome)"
          stroke="#64748B"
          strokeWidth="1.5"
        />
        {/* Top Rim */}
        <rect x="13" y="45" width="60" height="6" rx="3" fill="url(#pobiCanMetal)" stroke="#64748B" strokeWidth="1.2" />

        {/* Cylindrical Can Body */}
        <rect
          x="15"
          y="51"
          width="56"
          height="108"
          rx="4"
          fill="url(#pobiCanMetal)"
          stroke="#475569"
          strokeWidth="1.5"
        />

        {/* Navy Brand Label Band */}
        <rect x="15.8" y="68" width="54.4" height="44" fill="url(#pobiCanNavy)" />
        {/* Bright Green Lower Accent Band */}
        <rect x="15.8" y="112" width="54.4" height="11" fill="url(#pobiCanGreen)" />

        {/* Subtle Specular Vertical Highlight across can + label */}
        <rect x="24" y="52" width="8" height="106" fill="#FFFFFF" opacity="0.2" />

        {/* POBI Wordmark on Label */}
        <text
          x="43"
          y="96"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="14.5"
          fontWeight="800"
          fontFamily="Inter, system-ui, -apple-system, sans-serif"
          letterSpacing="1.6"
        >
          POBI
        </text>

        {/* Bottom Rim */}
        <rect x="13" y="156" width="60" height="7" rx="3.5" fill="url(#pobiCanMetal)" stroke="#475569" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

export default function RollerShutterIntro({ onComplete }: RollerShutterIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const completedRef = useRef(false);
  const audioRef = useRef<ShutterAudioEngine | null>(null);
  const phaseRef = useRef<'shake' | 'spray-logo' | 'spray-text' | 'hold' | 'lift' | 'done'>('shake');

  const [logoRevealPct, setLogoRevealPct] = useState(2);
  const [textRevealPct, setTextRevealPct] = useState(0);
  const [canState, setCanState] = useState<{ visible: boolean; x: number; y: number; spraying: boolean; opacity: number }>({
    visible: true,
    x: 150,
    y: -90,
    spraying: false,
    opacity: 1,
  });
  const [shutterLiftPct, setShutterLiftPct] = useState(0);
  const [shutterShakeX, setShutterShakeX] = useState(0);
  const [frameFadeOut, setFrameFadeOut] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const finishIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    audioRef.current?.dispose();
    audioRef.current = null;
    onComplete();
  }, [onComplete]);

  const unlockAndSyncAudio = useCallback(async () => {
    const engine = audioRef.current;
    if (!engine) return;
    const running = await engine.tryUnlock();
    setAudioBlocked(!running);
    if (!running || engine.isMuted()) return;

    const currentPhase = phaseRef.current;
    if (currentPhase === 'spray-logo') {
      engine.startSpray(1.0);
    } else if (currentPhase === 'spray-text') {
      engine.startSpray(0.88);
    } else if (currentPhase === 'lift') {
      engine.playShutterRollUp(1.45);
    }
  }, []);

  const handleToggleAudio = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const engine = audioRef.current;
      if (!engine) return;

      if (audioBlocked) {
        engine.setMuted(false);
        setIsMuted(false);
        await unlockAndSyncAudio();
        return;
      }

      const nextMuted = !isMuted;
      engine.setMuted(nextMuted);
      setIsMuted(nextMuted);
      if (!nextMuted) {
        await unlockAndSyncAudio();
      }
    },
    [audioBlocked, isMuted, unlockAndSyncAudio]
  );

  useEffect(() => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finishIntro();
        return;
      }
    } catch {}

    const engine = new ShutterAudioEngine();
    audioRef.current = engine;

    // Attempt immediate autoplay unlock (succeeds automatically on replay clicks or prior user gesture)
    engine.tryUnlock().then((running) => {
      if (completedRef.current) return;
      setAudioBlocked(!running);
      if (running && phaseRef.current === 'shake') {
        engine.playCanShake();
      }
    });

    const handleUserGesture = () => {
      unlockAndSyncAudio();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finishIntro();
        return;
      }
      handleUserGesture();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', handleUserGesture, { passive: true });

    const particles: MistParticle[] = [];
    const sprayPalette = ['#4ADE80', '#22C55E', '#16A34A', '#60A5FA', '#0A296B', '#FFFFFF'];
    let rafId = 0;
    let startedLogoSprayAudio = false;
    let startedTextSprayAudio = false;
    let stoppedSprayAudio = false;
    let startedLiftAudio = false;

    const startTime = performance.now();

    const spawnMist = (cx: number, cy: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.PI + (Math.random() - 0.5) * 0.92;
        const speed = 2.0 + Math.random() * 5.8;
        particles.push({
          x: cx + (Math.random() - 0.5) * 10,
          y: cy + (Math.random() - 0.5) * 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.2,
          r: 1.4 + Math.random() * 4.0,
          alpha: 0.45 + Math.random() * 0.38,
          decay: 0.024 + Math.random() * 0.022,
          color: sprayPalette[Math.floor(Math.random() * sprayPalette.length)],
        });
      }
    };

    const tick = (now: number) => {
      const elapsed = (now - startTime) / 1000;

      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d') : null;
      if (canvas && (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight)) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight * 0.46;
      const isCompact = window.innerWidth < 640;

      // Phase 1A (0.00s - 0.26s): Spray can enters & shakes briefly
      if (elapsed < 0.26) {
        phaseRef.current = 'shake';
        const p = clamp01(elapsed / 0.26);
        const shake = Math.sin(elapsed * 62) * 5;
        setCanState({
          visible: true,
          x: (isCompact ? 96 : 145) - p * 45,
          y: -110 + shake,
          spraying: false,
          opacity: 1,
        });
      }
      // Phase 1B (0.26s - 1.56s): Spraying the circular Bichon studio logo
      else if (elapsed < 1.56) {
        phaseRef.current = 'spray-logo';
        if (!startedLogoSprayAudio) {
          startedLogoSprayAudio = true;
          engine.startSpray(1.0);
        }

        const p = clamp01((elapsed - 0.26) / 1.3);
        setLogoRevealPct(p * 100);

        const sweepAmp = isCompact ? 76 : 118;
        const sweepX = Math.sin(p * Math.PI * 3.5) * sweepAmp + (isCompact ? 42 : 58);
        const sweepY = -125 + p * 215;
        setCanState({
          visible: true,
          x: sweepX,
          y: sweepY,
          spraying: true,
          opacity: 1,
        });
        spawnMist(centerX + sweepX - 38, centerY + sweepY - 62, 4);
      }
      // Phase 1C (1.56s - 2.38s): Spraying "POBI STUDIO presents" & finishing at lower-right hero pose
      else if (elapsed < 2.38) {
        phaseRef.current = 'spray-text';
        if (!startedTextSprayAudio) {
          startedTextSprayAudio = true;
          engine.startSpray(0.88);
        }

        setLogoRevealPct(100);
        const p = clamp01((elapsed - 1.56) / 0.82);
        const eased = easeInOutCubic(p);
        setTextRevealPct(eased * 100);

        const startX = isCompact ? -96 : -175;
        const endX = isCompact ? 118 : 265;
        const sweepX = startX + eased * (endX - startX);
        const sweepY = (isCompact ? 132 : 162) + Math.sin(p * Math.PI * 2) * 4;
        setCanState({
          visible: true,
          x: sweepX,
          y: sweepY,
          spraying: true,
          opacity: 1,
        });
        spawnMist(centerX + sweepX - 38, centerY + sweepY - 62, 4);
      }
      // Phase 1D (2.38s - 2.86s): Hero hold matching the reference scene, then spray can exits
      else if (elapsed < 2.86) {
        phaseRef.current = 'hold';
        setLogoRevealPct(100);
        setTextRevealPct(100);

        const p = clamp01((elapsed - 2.38) / 0.48);
        if (p >= 0.22 && !stoppedSprayAudio) {
          stoppedSprayAudio = true;
          engine.stopSpray();
        }

        const exitP = clamp01((p - 0.45) / 0.55);
        const baseX = isCompact ? 118 : 265;
        const baseY = isCompact ? 132 : 162;
        setCanState({
          visible: exitP < 0.98,
          x: baseX + exitP * 140,
          y: baseY + exitP * 90,
          spraying: p < 0.22,
          opacity: 1 - exitP,
        });
        if (p < 0.22) {
          spawnMist(centerX + baseX - 38, centerY + baseY - 62, 3);
        }
      }
      // Phase 2 (2.86s - 4.46s): Motorized industrial roller shutter rolls smoothly upward
      else if (elapsed < 4.46) {
        phaseRef.current = 'lift';
        if (!stoppedSprayAudio) {
          stoppedSprayAudio = true;
          engine.stopSpray();
        }
        if (!startedLiftAudio) {
          startedLiftAudio = true;
          engine.playShutterRollUp(1.58);
        }

        setLogoRevealPct(100);
        setTextRevealPct(100);
        setCanState((prev) => (prev.visible ? { ...prev, visible: false, spraying: false, opacity: 0 } : prev));

        const liftElapsed = elapsed - 2.86;
        // Brief mechanical motor engagement shudder in first 0.14s
        if (liftElapsed < 0.14) {
          const shudder = Math.sin(liftElapsed * 150) * 1.6 * (1 - liftElapsed / 0.14);
          setShutterShakeX(shudder);
          setShutterLiftPct((liftElapsed / 0.14) * 1.4);
        } else {
          setShutterShakeX(Math.sin(liftElapsed * 42) * 0.45);
          const liftP = clamp01((liftElapsed - 0.14) / 1.46);
          // Smooth electric motor acceleration into steady upward roll
          const easedLift = liftP < 0.3 ? easeInQuad(liftP / 0.3) * 0.18 : 0.18 + easeInOutCubic((liftP - 0.3) / 0.7) * 0.82;
          setShutterLiftPct(1.4 + easedLift * 102.6);
        }
      }
      // Phase 3 (4.46s - 4.78s): Top header beam & side rails fade cleanly to reveal LandingPage
      else if (elapsed < 4.78) {
        phaseRef.current = 'done';
        setShutterLiftPct(104);
        setShutterShakeX(0);
        setFrameFadeOut(true);
      } else {
        finishIntro();
        return;
      }

      // Render aerosol mist canvas
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = particles.length - 1; i >= 0; i--) {
          const pt = particles[i];
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.vx *= 0.94;
          pt.vy *= 0.94;
          pt.r += 0.24;
          pt.alpha -= pt.decay;
          if (pt.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = pt.alpha;
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', handleUserGesture);
      engine.dispose();
    };
  }, [finishIntro, unlockAndSyncAudio]);

  const logoMask =
    logoRevealPct >= 99.5
      ? 'none'
      : `linear-gradient(180deg, #000000 ${Math.max(0, logoRevealPct - 8)}%, rgba(0,0,0,0.45) ${logoRevealPct + 4}%, transparent ${logoRevealPct + 16}%)`;

  const textMask =
    textRevealPct <= 0.1
      ? 'linear-gradient(90deg, transparent 0%, transparent 100%)'
      : textRevealPct >= 99.5
      ? 'none'
      : `linear-gradient(90deg, #000000 ${Math.max(0, textRevealPct - 10)}%, rgba(0,0,0,0.45) ${textRevealPct + 4}%, transparent ${textRevealPct + 16}%)`;

  return (
    <div
      data-testid="roller-shutter-intro"
      aria-label="POBI STUDIO 開場動畫"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflow: 'hidden',
        pointerEvents: frameFadeOut ? 'none' : 'auto',
        userSelect: 'none',
      }}
    >
      {/* Left Brushed-Silver Steel Guide Track */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 'clamp(14px, 2.2vw, 28px)',
          background: 'linear-gradient(90deg, #9AA8B9 0%, #D9E2EC 38%, #BAC6D4 78%, #64748B 100%)',
          borderRight: '2px solid #475569',
          boxShadow: '6px 0 18px rgba(15, 23, 42, 0.24)',
          zIndex: 5,
          opacity: frameFadeOut ? 0 : 1,
          transition: 'opacity 0.28s ease',
        }}
      />

      {/* Right Brushed-Silver Steel Guide Track */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: 'clamp(14px, 2.2vw, 28px)',
          background: 'linear-gradient(270deg, #9AA8B9 0%, #D9E2EC 38%, #BAC6D4 78%, #64748B 100%)',
          borderLeft: '2px solid #475569',
          boxShadow: '-6px 0 18px rgba(15, 23, 42, 0.24)',
          zIndex: 5,
          opacity: frameFadeOut ? 0 : 1,
          transition: 'opacity 0.28s ease',
        }}
      />

      {/* Top Industrial Header Beam with Dual Warm-White LED Bars */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '44px',
          background: 'linear-gradient(180deg, #D5DFE9 0%, #BCC9D8 52%, #9AA8BA 94%, #526071 100%)',
          borderBottom: '2px solid #475569',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.28)',
          zIndex: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(22px, 5vw, 72px)',
          transform: frameFadeOut ? 'translate3d(0, -110%, 0)' : 'translate3d(0, 0, 0)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Left Warm-White Warehouse LED Light Bar */}
        <div
          aria-hidden="true"
          style={{
            width: 'clamp(44px, 10vw, 132px)',
            height: '8px',
            borderRadius: '999px',
            background: 'linear-gradient(180deg, #FFFDF7 0%, #FDE8C8 100%)',
            border: '1px solid #94A3B8',
            boxShadow: '0 0 14px 3px rgba(254, 235, 200, 0.9), 0 6px 26px 8px rgba(255, 237, 213, 0.55)',
          }}
        />

        {/* Center Warehouse Stamped Header */}
        <span
          style={{
            fontSize: 'clamp(0.62rem, 1.15vw, 0.82rem)',
            fontWeight: 800,
            letterSpacing: '0.24em',
            color: '#0B2253',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          WAREHOUSE BAY 01 · POBI STUDIO
        </span>

        {/* Right Warm-White Warehouse LED Light Bar */}
        <div
          aria-hidden="true"
          style={{
            width: 'clamp(44px, 10vw, 132px)',
            height: '8px',
            borderRadius: '999px',
            background: 'linear-gradient(180deg, #FFFDF7 0%, #FDE8C8 100%)',
            border: '1px solid #94A3B8',
            boxShadow: '0 0 14px 3px rgba(254, 235, 200, 0.9), 0 6px 26px 8px rgba(255, 237, 213, 0.55)',
          }}
        />
      </div>

      {/* Main Rising Bright Silver-White Galvanized Roller Shutter */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          transform: `translate3d(${shutterShakeX.toFixed(2)}px, -${shutterLiftPct.toFixed(3)}%, 0)`,
          willChange: 'transform',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Bright Horizontal Corrugated Steel Slats */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            width: '100%',
            backgroundColor: '#E3EAF2',
            backgroundImage: `
              radial-gradient(ellipse 36% 24% at 15% 6%, rgba(255, 244, 224, 0.62) 0%, rgba(255, 244, 224, 0) 78%),
              radial-gradient(ellipse 36% 24% at 85% 6%, rgba(255, 244, 224, 0.62) 0%, rgba(255, 244, 224, 0) 78%),
              linear-gradient(90deg, rgba(15, 23, 42, 0.14) 0%, rgba(255, 255, 255, 0.25) 14%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.25) 86%, rgba(15, 23, 42, 0.14) 100%),
              repeating-linear-gradient(
                180deg,
                #F8FAFC 0px,
                #F3F7FB 3px,
                #E4ECF5 10px,
                #D5E0EC 18px,
                #C4D1E0 23px,
                #9AA8B9 26px,
                #7D8CA0 28px
              )
            `,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '58px 24px 36px 24px',
            overflow: 'hidden',
          }}
        >
          {/* Sprayed Centerpiece Container */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: '92vw',
              transform: 'translateY(-6px)',
            }}
          >
            {/* Sprayed Circular POBI STUDIO Bichon Emblem */}
            <div
              style={{
                position: 'relative',
                width: 'clamp(220px, 37vmin, 336px)',
                height: 'clamp(220px, 37vmin, 336px)',
                WebkitMaskImage: logoMask,
                maskImage: logoMask,
              }}
            >
              {/* Soft bright white backing halo matching the crisp studio stencil look */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: '4px',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(255,255,255,0.96) 62%, rgba(248,250,252,0.72) 76%, transparent 94%)',
                }}
              />

              <img
                src="/pobi-shutter-logo.webp"
                alt="POBI STUDIO Bichon Emblem"
                width={336}
                height={336}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  filter: 'contrast(1.04) drop-shadow(0 3px 10px rgba(10, 41, 107, 0.14))',
                }}
              />

              {/* Subtle Slat Seam Overlay so Logo sits naturally on the Steel Door */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  mixBlendMode: 'multiply',
                  opacity: 0.18,
                  backgroundImage: `repeating-linear-gradient(
                    180deg,
                    transparent 0px,
                    transparent 24px,
                    rgba(100, 116, 139, 0.45) 26px,
                    rgba(71, 85, 105, 0.65) 28px
                  )`,
                }}
              />

              {/* Signature Blue-Green Paint Droplets Accent Cluster (lower-right of circular emblem) */}
              <svg
                aria-hidden="true"
                viewBox="0 0 96 96"
                style={{
                  position: 'absolute',
                  right: '-44px',
                  bottom: '8px',
                  width: '88px',
                  height: '88px',
                  pointerEvents: 'none',
                }}
              >
                <circle cx="52" cy="24" r="5" fill="#94B5CE" opacity="0.72" />
                <circle cx="38" cy="42" r="4" fill="#A5C3D8" opacity="0.65" />
                <circle cx="50" cy="48" r="6.2" fill="#63B85D" opacity="0.82" />
                <circle cx="67" cy="54" r="5.4" fill="#6D9DC2" opacity="0.78" />
                <circle cx="32" cy="66" r="6.8" fill="#5CB65A" opacity="0.76" />
                <circle cx="53" cy="68" r="8.2" fill="#5B8EB5" opacity="0.82" />
                <circle cx="18" cy="76" r="5.5" fill="#7EAAC9" opacity="0.65" />
                <circle cx="36" cy="80" r="3.6" fill="#6A9BC0" opacity="0.7" />
              </svg>
            </div>

            {/* Sprayed "POBI STUDIO presents" Wordmark + Gradient Underline */}
            <div
              style={{
                position: 'relative',
                marginTop: '18px',
                padding: '6px 20px 8px 20px',
                WebkitMaskImage: textMask,
                maskImage: textMask,
                opacity: textRevealPct > 0.2 ? 1 : 0,
                textAlign: 'center',
              }}
            >
              {/* Soft subtle glow behind text to keep razor-sharp legibility over slats */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: '-4px -18px',
                  borderRadius: '999px',
                  background:
                    'radial-gradient(ellipse at center, rgba(255,255,255,0.88) 0%, rgba(241,245,249,0.52) 66%, transparent 100%)',
                  filter: 'blur(4px)',
                }}
              />

              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  gap: '14px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                    fontSize: 'clamp(1.42rem, 3.6vw, 2.25rem)',
                    fontWeight: 900,
                    letterSpacing: '0.14em',
                    lineHeight: 1.1,
                  }}
                >
                  <span style={{ color: '#22993D' }}>P</span>
                  <span style={{ color: '#0A296B' }}>OBI STUDIO</span>
                </span>
                <span
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", "Noto Serif TC", serif',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: 'clamp(1.22rem, 2.9vw, 1.75rem)',
                    letterSpacing: '0.06em',
                    color: '#0A296B',
                  }}
                >
                  presents
                </span>
              </div>

              {/* Clean Green-to-Navy Horizontal Accent Bar matching reference */}
              <div
                aria-hidden="true"
                style={{
                  position: 'relative',
                  margin: '10px auto 0 auto',
                  width: 'clamp(190px, 34vw, 340px)',
                  height: '4.5px',
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, #8CC63F 0%, #22993D 24%, #0A296B 52%, #0A296B 72%, #7CC17A 100%)',
                  boxShadow: '0 1px 4px rgba(10, 41, 107, 0.16)',
                }}
              />
            </div>

            {/* Animated Brushed-Silver POBI Spray Can */}
            {canState.visible && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate3d(${canState.x.toFixed(1)}px, ${canState.y.toFixed(1)}px, 0)`,
                  opacity: canState.opacity,
                  pointerEvents: 'none',
                  zIndex: 8,
                }}
              >
                <SprayCanSvg spraying={canState.spraying} />
              </div>
            )}
          </div>
        </div>

        {/* Heavy Industrial Bottom Rubber-Edged Steel Bar */}
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            height: '32px',
            width: '100%',
            background: 'linear-gradient(180deg, #DCE4EE 0%, #A9B7C7 48%, #778699 80%, #334155 82%, #1E293B 100%)',
            borderTop: '2px solid #7C8BA1',
            boxShadow: '0 18px 36px rgba(15, 23, 42, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '116px',
              height: '11px',
              borderRadius: '3px',
              backgroundColor: '#334155',
              border: '1px solid #CBD5E1',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.55)',
              marginBottom: '4px',
            }}
          />
        </div>
      </div>

      {/* Live 2D Canvas for Aerosol Mist Spray Particles */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 6,
          opacity: shutterLiftPct > 2 ? 0 : 1,
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Top-Right Controls: Audio Toggle & Skip Button */}
      <div
        style={{
          position: 'fixed',
          top: '56px',
          right: 'clamp(22px, 3.6vw, 44px)',
          zIndex: 12,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          opacity: frameFadeOut ? 0 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        <button
          type="button"
          onClick={handleToggleAudio}
          aria-label={audioBlocked ? '開啟開場音效' : isMuted ? '取消靜音' : '靜音'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 13px',
            borderRadius: '999px',
            backgroundColor: audioBlocked ? '#FEF3C7' : 'rgba(255, 255, 255, 0.94)',
            color: '#0A296B',
            border: audioBlocked ? '1.5px solid #D97706' : '1px solid #94A3B8',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.16)',
          }}
        >
          {isMuted || audioBlocked ? (
            <VolumeX className="w-3.5 h-3.5" style={{ color: '#0A296B' }} aria-hidden="true" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" style={{ color: '#15803D' }} aria-hidden="true" />
          )}
          <span style={{ color: '#0A296B' }}>{audioBlocked ? '點擊開啟音效' : isMuted ? '已靜音' : '音效開'}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finishIntro();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '999px',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            color: '#0A296B',
            border: '1px solid #94A3B8',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.16)',
          }}
        >
          <span style={{ color: '#0A296B' }}>略過開場</span>
          <FastForward className="w-3.5 h-3.5" style={{ color: '#0A296B' }} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
