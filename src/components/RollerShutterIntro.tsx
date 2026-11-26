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
 * Brushed-silver metallic aerosol spray can that sweeps across the shutter
 * while revealing the high-resolution studio artwork, then hands off seamlessly
 * to the hero can in the final frame.
 */
function SprayCanSvg({ spraying }: { spraying: boolean }) {
  return (
    <svg
      width="148"
      height="194"
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

      <g transform="translate(80, 108) rotate(-14) translate(-44, -84)">
        <rect x="34" y="8" width="18" height="14" rx="2.5" fill="#D93829" stroke="#7F1D1D" strokeWidth="1.4" />
        <rect x="37" y="10" width="4" height="10" rx="1" fill="#F87171" opacity="0.55" />
        <circle cx="36" cy="15" r="2" fill="#1E293B" />
        <rect x="40" y="22" width="6" height="4" fill="#94A3B8" />
        <rect x="33" y="25" width="20" height="4" rx="1.5" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
        <path d="M15 47 C15 30, 71 30, 71 47 Z" fill="url(#pobiCanDome)" stroke="#64748B" strokeWidth="1.5" />
        <rect x="13" y="45" width="60" height="6" rx="3" fill="url(#pobiCanMetal)" stroke="#64748B" strokeWidth="1.2" />
        <rect x="15" y="51" width="56" height="108" rx="4" fill="url(#pobiCanMetal)" stroke="#475569" strokeWidth="1.5" />
        <rect x="15.8" y="68" width="54.4" height="44" fill="url(#pobiCanNavy)" />
        <rect x="15.8" y="112" width="54.4" height="11" fill="url(#pobiCanGreen)" />
        <rect x="24" y="52" width="8" height="106" fill="#FFFFFF" opacity="0.2" />
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

  // Reveal progress for the high-res hero shutter artwork:
  // 0..100 vertical reveal for upper emblem, 0..100 horizontal reveal for lower wordmark + hero can
  const [heroRevealPct, setHeroRevealPct] = useState(0);
  const [lowerRevealPct, setLowerRevealPct] = useState(0);
  const [canState, setCanState] = useState<{ visible: boolean; x: number; y: number; spraying: boolean; opacity: number }>({
    visible: true,
    x: 150,
    y: -110,
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
    if (currentPhase === 'shake') {
      engine.playCanShake();
    } else if (currentPhase === 'spray-logo') {
      engine.startSpray(1.0);
    } else if (currentPhase === 'spray-text') {
      engine.startSpray(0.92);
    } else if (currentPhase === 'lift') {
      engine.playShutterRollUp(1.62);
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
    const sprayPalette = ['#4ADE80', '#22C55E', '#16A34A', '#86EFAC', '#60A5FA', '#FFFFFF'];
    let rafId = 0;
    let startedLogoSprayAudio = false;
    let startedTextSprayAudio = false;
    let stoppedSprayAudio = false;
    let startedLiftAudio = false;

    const startTime = performance.now();

    const spawnMist = (cx: number, cy: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.PI + (Math.random() - 0.5) * 0.95;
        const speed = 2.2 + Math.random() * 6.0;
        particles.push({
          x: cx + (Math.random() - 0.5) * 10,
          y: cy + (Math.random() - 0.5) * 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.15,
          r: 1.4 + Math.random() * 4.2,
          alpha: 0.45 + Math.random() * 0.4,
          decay: 0.025 + Math.random() * 0.022,
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

      // Phase 1A (0.00s - 0.30s): Spray can enters & shakes metallic marble inside can
      if (elapsed < 0.3) {
        phaseRef.current = 'shake';
        const p = clamp01(elapsed / 0.3);
        const shake = Math.sin(elapsed * 68) * 6;
        setCanState({
          visible: true,
          x: (isCompact ? 96 : 152) - p * 46,
          y: -115 + shake,
          spraying: false,
          opacity: 1,
        });
      }
      // Phase 1B (0.30s - 1.56s): Sweeping spray across center to reveal high-res Bichon emblem
      else if (elapsed < 1.56) {
        phaseRef.current = 'spray-logo';
        if (!startedLogoSprayAudio) {
          startedLogoSprayAudio = true;
          engine.startSpray(1.0);
        }

        const p = clamp01((elapsed - 0.3) / 1.26);
        setHeroRevealPct(p * 100);

        const sweepAmp = isCompact ? 78 : 132;
        const sweepX = Math.sin(p * Math.PI * 3.5) * sweepAmp + (isCompact ? 40 : 62);
        const sweepY = -130 + p * 215;
        setCanState({
          visible: true,
          x: sweepX,
          y: sweepY,
          spraying: true,
          opacity: 1,
        });
        spawnMist(centerX + sweepX - 36, centerY + sweepY - 58, 5);
      }
      // Phase 1C (1.56s - 2.38s): Sweeping across lower wordmark & fading into high-res hero image
      else if (elapsed < 2.38) {
        phaseRef.current = 'spray-text';
        if (!startedTextSprayAudio) {
          startedTextSprayAudio = true;
          engine.startSpray(0.92);
        }

        setHeroRevealPct(100);
        const p = clamp01((elapsed - 1.56) / 0.82);
        const eased = easeInOutCubic(p);
        setLowerRevealPct(eased * 100);

        const startX = isCompact ? -92 : -180;
        const endX = isCompact ? 116 : 265;
        const sweepX = startX + eased * (endX - startX);
        const sweepY = (isCompact ? 128 : 158) + Math.sin(p * Math.PI * 2) * 4;
        // Smoothly cross-fade animated SVG can out near the end so the artwork's high-res can takes over
        const handoffFade = p > 0.72 ? 1 - clamp01((p - 0.72) / 0.28) : 1;
        setCanState({
          visible: handoffFade > 0.02,
          x: sweepX,
          y: sweepY,
          spraying: p < 0.86,
          opacity: handoffFade,
        });
        if (p < 0.86) {
          spawnMist(centerX + sweepX - 36, centerY + sweepY - 58, 4);
        }
      }
      // Phase 1D (2.38s - 2.94s): Crisp 100% high-resolution hero image hold
      else if (elapsed < 2.94) {
        phaseRef.current = 'hold';
        setHeroRevealPct(100);
        setLowerRevealPct(100);

        if (!stoppedSprayAudio) {
          stoppedSprayAudio = true;
          engine.stopSpray();
        }
        setCanState((prev) => (prev.visible ? { ...prev, visible: false, spraying: false, opacity: 0 } : prev));
      }
      // Phase 2 (2.94s - 4.58s): Motorized steel shutter rolls upward with metallic hinge clatter
      else if (elapsed < 4.58) {
        phaseRef.current = 'lift';
        if (!stoppedSprayAudio) {
          stoppedSprayAudio = true;
          engine.stopSpray();
        }
        if (!startedLiftAudio) {
          startedLiftAudio = true;
          engine.playShutterRollUp(1.62);
        }

        setHeroRevealPct(100);
        setLowerRevealPct(100);
        setCanState((prev) => (prev.visible ? { ...prev, visible: false, spraying: false, opacity: 0 } : prev));

        const liftElapsed = elapsed - 2.94;
        if (liftElapsed < 0.14) {
          // Initial latch release mechanical shudder
          const shudder = Math.sin(liftElapsed * 165) * 2.0 * (1 - liftElapsed / 0.14);
          setShutterShakeX(shudder);
          setShutterLiftPct((liftElapsed / 0.14) * 1.5);
        } else {
          // Subtle rhythmic metallic track vibration synced with hinge clack cadence
          setShutterShakeX(Math.sin(liftElapsed * 56) * 0.65);
          const liftP = clamp01((liftElapsed - 0.14) / 1.5);
          const easedLift =
            liftP < 0.28
              ? easeInQuad(liftP / 0.28) * 0.18
              : 0.18 + easeInOutCubic((liftP - 0.28) / 0.72) * 0.82;
          setShutterLiftPct(1.5 + easedLift * 102.5);
        }
      }
      // Phase 3 (4.58s - 4.88s): Clean reveal of LandingPage
      else if (elapsed < 4.88) {
        phaseRef.current = 'done';
        setShutterLiftPct(104);
        setShutterShakeX(0);
        setFrameFadeOut(true);
      } else {
        finishIntro();
        return;
      }

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

  // Progressive spray-paint masks for upper emblem (0%..67% height) and lower banner (67%..100% height)
  const upperMask =
    heroRevealPct >= 99.5
      ? 'none'
      : `linear-gradient(180deg, #000000 ${Math.max(0, heroRevealPct - 10)}%, rgba(0,0,0,0.5) ${heroRevealPct + 3}%, transparent ${heroRevealPct + 16}%)`;

  const lowerMask =
    lowerRevealPct <= 0.1
      ? 'linear-gradient(90deg, transparent 0%, transparent 100%)'
      : lowerRevealPct >= 99.5
      ? 'none'
      : `linear-gradient(90deg, #000000 ${Math.max(0, lowerRevealPct - 12)}%, rgba(0,0,0,0.5) ${lowerRevealPct + 4}%, transparent ${lowerRevealPct + 16}%)`;

  const isFullyRevealed = heroRevealPct >= 99.5 && lowerRevealPct >= 99.5;

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
      {/* Main Rising High-Resolution Galvanized Roller Shutter */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          transform: `translate3d(${shutterShakeX.toFixed(2)}px, -${shutterLiftPct.toFixed(3)}%, 0)`,
          willChange: 'transform',
          display: 'flex',
          flexDirection: 'column',
          opacity: frameFadeOut ? 0 : 1,
          transition: 'opacity 0.25s ease',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: 1,
            width: '100%',
            overflow: 'hidden',
            backgroundColor: '#DCE5F0',
          }}
        >
          {/* Base Blank Corrugated Silver Shutter (visible before paint is sprayed onto center) */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#DFE7F0',
              backgroundImage: `
                radial-gradient(ellipse 34% 22% at 15% 6%, rgba(255, 243, 222, 0.7) 0%, rgba(255, 243, 222, 0) 78%),
                radial-gradient(ellipse 34% 22% at 85% 6%, rgba(255, 243, 222, 0.7) 0%, rgba(255, 243, 222, 0) 78%),
                linear-gradient(90deg, rgba(15, 23, 42, 0.16) 0%, rgba(255, 255, 255, 0.24) 12%, rgba(255, 255, 255, 0.04) 50%, rgba(255, 255, 255, 0.24) 88%, rgba(15, 23, 42, 0.16) 100%),
                repeating-linear-gradient(
                  180deg,
                  #F7FAFD 0px,
                  #EEF4FA 4px,
                  #E0E8F2 11px,
                  #CFDCEB 19px,
                  #BCC9DA 24px,
                  #8F9EB2 27px,
                  #76869B 29px
                )
              `,
            }}
          />

          {/* Always-visible High-Res Top Header Beam & Side Tracks from the Hero Image */}
          <img
            src="/pobi-shutter-hero.jpg"
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
              clipPath: 'polygon(0% 0%, 100% 0%, 100% 10%, 96.5% 10%, 96.5% 100%, 100% 100%, 100% 100%, 0% 100%, 0% 10%, 3.5% 10%, 3.5% 100%, 0% 100%)',
              pointerEvents: 'none',
            }}
          />

          {isFullyRevealed ? (
            /* 100% Full Unmasked High-Resolution Shutter Image (Hold & Lift Phases) */
            <img
              src="/pobi-shutter-hero.jpg"
              alt="POBI STUDIO 開場鐵捲門主視覺"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center center',
                display: 'block',
              }}
            />
          ) : (
            <>
              {/* Upper Region (Bichon Emblem) Sprayed Top-to-Bottom */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  clipPath: 'inset(0% 0% 34% 0%)',
                  WebkitMaskImage: upperMask,
                  maskImage: upperMask,
                }}
              >
                <img
                  src="/pobi-shutter-hero.jpg"
                  alt="POBI STUDIO 標誌噴漆"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center center',
                    display: 'block',
                  }}
                />
              </div>

              {/* Lower Region ("POBI STUDIO presents" + Hero Spray Can) Sprayed Left-to-Right */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  clipPath: 'inset(66% 0% 0% 0%)',
                  WebkitMaskImage: lowerMask,
                  maskImage: lowerMask,
                  opacity: lowerRevealPct > 0.1 ? 1 : 0,
                }}
              >
                <img
                  src="/pobi-shutter-hero.jpg"
                  alt=""
                  aria-hidden="true"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center center',
                    display: 'block',
                  }}
                />
              </div>
            </>
          )}

          {/* Animated Brushed-Silver POBI Spray Can during spraying phase */}
          {canState.visible && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '50%',
                top: '48%',
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

        {/* Heavy Industrial Bottom Rubber-Edged Steel Bar */}
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            height: '28px',
            width: '100%',
            background: 'linear-gradient(180deg, #DCE4EE 0%, #A9B7C7 48%, #778699 80%, #334155 82%, #1E293B 100%)',
            borderTop: '2px solid #7C8BA1',
            boxShadow: '0 18px 36px rgba(15, 23, 42, 0.38)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '112px',
              height: '10px',
              borderRadius: '3px',
              backgroundColor: '#334155',
              border: '1px solid #CBD5E1',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.55)',
              marginBottom: '3px',
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
