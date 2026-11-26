import { useEffect, useRef, useState, useCallback } from 'react';
import { FastForward, Volume2, VolumeX } from 'lucide-react';
import { ShutterAudioEngine } from '../utils/shutterAudio';

interface RollerShutterIntroProps {
  onComplete: () => void;
}

/**
 * Brushed-silver metallic aerosol spray can matching the warehouse studio scene:
 * red nozzle cap, deep navy POBI label with bright green band, and fine green mist cone.
 */
function SprayCanSvg() {
  return (
    <svg
      width="160"
      height="210"
      viewBox="0 0 160 210"
      fill="none"
      aria-hidden="true"
      style={{
        overflow: 'visible',
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
      <g className="pobi-shutter-mist-cone">
        <polygon points="56,28 -118,-18 -134,76" fill="url(#pobiGreenMistCone)" />
        <circle cx="24" cy="24" r="2.4" fill="#22C55E" opacity="0.68" />
        <circle cx="-6" cy="18" r="2.0" fill="#16A34A" opacity="0.58" />
        <circle cx="-22" cy="34" r="2.8" fill="#4ADE80" opacity="0.52" />
        <circle cx="-48" cy="25" r="2.2" fill="#22C55E" opacity="0.44" />
        <circle cx="-72" cy="39" r="1.8" fill="#15803D" opacity="0.36" />
        <circle cx="-94" cy="20" r="2.4" fill="#86EFAC" opacity="0.32" />
      </g>

      {/* Tilted Metallic Aerosol Can Body */}
      <g transform="translate(80, 108) rotate(-14) translate(-44, -84)">
        <rect x="34" y="8" width="18" height="14" rx="2.5" fill="#D93829" stroke="#7F1D1D" strokeWidth="1.4" />
        <rect x="37" y="10" width="4" height="10" rx="1" fill="#F87171" opacity="0.55" />
        <circle cx="36" cy="15" r="2" fill="#1E293B" />
        <rect x="40" y="22" width="6" height="4" fill="#94A3B8" />
        <rect x="33" y="25" width="20" height="4" rx="1.5" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />

        <path
          d="M15 47 C15 30, 71 30, 71 47 Z"
          fill="url(#pobiCanDome)"
          stroke="#64748B"
          strokeWidth="1.5"
        />
        <rect x="13" y="45" width="60" height="6" rx="3" fill="url(#pobiCanMetal)" stroke="#64748B" strokeWidth="1.2" />

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

const SHUTTER_KEYFRAMES_CSS = `
@keyframes pobiShutterLogoSpray {
  0%, 6% { opacity: 0.08; transform: scale(0.97); }
  36%, 100% { opacity: 1; transform: scale(1); }
}
@keyframes pobiShutterTextSpray {
  0%, 34% { opacity: 0; transform: translate3d(-14px, 0, 0); }
  54%, 100% { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes pobiShutterCanSweep {
  0% { transform: translate3d(135px, -110px, 0); opacity: 1; }
  6% { transform: translate3d(96px, -104px, 0); opacity: 1; }
  14% { transform: translate3d(-62px, -68px, 0); opacity: 1; }
  23% { transform: translate3d(118px, -12px, 0); opacity: 1; }
  33% { transform: translate3d(-44px, 68px, 0); opacity: 1; }
  36% { transform: translate3d(-145px, 152px, 0); opacity: 1; }
  53% { transform: translate3d(242px, 156px, 0); opacity: 1; }
  58% { transform: translate3d(242px, 156px, 0); opacity: 1; }
  64%, 100% { transform: translate3d(340px, 225px, 0); opacity: 0; }
}
@keyframes pobiShutterMistToggle {
  0%, 5% { opacity: 0; }
  7%, 55% { opacity: 0.95; }
  58%, 100% { opacity: 0; }
}
@keyframes pobiShutterRollUp {
  0%, 61% { transform: translate3d(0, 0%, 0); }
  62% { transform: translate3d(1.5px, -0.8%, 0); }
  63% { transform: translate3d(-1.2px, -1.6%, 0); }
  94%, 100% { transform: translate3d(0, -104%, 0); }
}
@keyframes pobiShutterFrameHide {
  0%, 93% { opacity: 1; }
  100% { opacity: 0; }
}
.pobi-shutter-logo-anim {
  animation: pobiShutterLogoSpray 4.65s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  will-change: transform, opacity;
}
.pobi-shutter-text-anim {
  animation: pobiShutterTextSpray 4.65s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  will-change: transform, opacity;
}
.pobi-shutter-can-anim {
  animation: pobiShutterCanSweep 4.65s ease-in-out forwards;
  will-change: transform, opacity;
}
.pobi-shutter-mist-cone {
  animation: pobiShutterMistToggle 4.65s linear forwards;
  will-change: opacity;
}
.pobi-shutter-door-anim {
  animation: pobiShutterRollUp 4.65s cubic-bezier(0.32, 0.08, 0.22, 1) forwards;
  will-change: transform;
}
.pobi-shutter-frame-anim {
  animation: pobiShutterFrameHide 4.65s ease forwards;
  will-change: opacity;
}
`;

export default function RollerShutterIntro({ onComplete }: RollerShutterIntroProps) {
  const completedRef = useRef(false);
  const audioRef = useRef<ShutterAudioEngine | null>(null);
  const phaseRef = useRef<'shake' | 'spray-logo' | 'spray-text' | 'hold' | 'lift' | 'done'>('shake');

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
    setAudioBlocked((prev) => (prev !== !running ? !running : prev));
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

    // Only attempt immediate unlock if the document already had user activation (e.g. clicking "重播開場")
    const hasActivation =
      typeof navigator !== 'undefined' &&
      'userActivation' in navigator &&
      (navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } }).userActivation?.hasBeenActive;

    if (hasActivation) {
      engine.tryUnlock().then((running) => {
        if (completedRef.current) return;
        setAudioBlocked(!running);
        if (running && phaseRef.current === 'shake') {
          engine.playCanShake();
        }
      });
    } else {
      setAudioBlocked(true);
    }

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

    // Pure scheduled audio cues matching the GPU CSS keyframes timeline (zero per-frame JS polling!)
    const tSprayLogo = window.setTimeout(() => {
      phaseRef.current = 'spray-logo';
      engine.startSpray(1.0);
    }, 260);

    const tSprayText = window.setTimeout(() => {
      phaseRef.current = 'spray-text';
      engine.startSpray(0.88);
    }, 1580);

    const tStopSpray = window.setTimeout(() => {
      phaseRef.current = 'hold';
      engine.stopSpray();
    }, 2520);

    const tLift = window.setTimeout(() => {
      phaseRef.current = 'lift';
      engine.stopSpray();
      engine.playShutterRollUp(1.52);
    }, 2840);

    const tDone = window.setTimeout(() => {
      phaseRef.current = 'done';
      finishIntro();
    }, 4680);

    return () => {
      window.clearTimeout(tSprayLogo);
      window.clearTimeout(tSprayText);
      window.clearTimeout(tStopSpray);
      window.clearTimeout(tLift);
      window.clearTimeout(tDone);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', handleUserGesture);
      engine.dispose();
    };
  }, [finishIntro, unlockAndSyncAudio]);

  return (
    <div
      data-testid="roller-shutter-intro"
      aria-label="POBI STUDIO 開場動畫"
      className="pobi-shutter-frame-anim"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <style>{SHUTTER_KEYFRAMES_CSS}</style>

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
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 'clamp(44px, 10vw, 132px)',
            height: '8px',
            borderRadius: '999px',
            background: 'linear-gradient(180deg, #FFFDF7 0%, #FDE8C8 100%)',
            border: '1px solid #94A3B8',
            boxShadow: '0 0 12px 2px rgba(254, 235, 200, 0.85)',
          }}
        />

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

        <div
          aria-hidden="true"
          style={{
            width: 'clamp(44px, 10vw, 132px)',
            height: '8px',
            borderRadius: '999px',
            background: 'linear-gradient(180deg, #FFFDF7 0%, #FDE8C8 100%)',
            border: '1px solid #94A3B8',
            boxShadow: '0 0 12px 2px rgba(254, 235, 200, 0.85)',
          }}
        />
      </div>

      {/* Main Rising Bright Silver-White Galvanized Roller Shutter */}
      <div
        className="pobi-shutter-door-anim"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
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
              className="pobi-shutter-logo-anim"
              style={{
                position: 'relative',
                width: 'clamp(220px, 37vmin, 336px)',
                height: 'clamp(220px, 37vmin, 336px)',
              }}
            >
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
                }}
              />

              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  backgroundImage: `repeating-linear-gradient(
                    180deg,
                    transparent 0px,
                    transparent 25px,
                    rgba(100, 116, 139, 0.14) 26px,
                    rgba(71, 85, 105, 0.22) 28px
                  )`,
                }}
              />

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
              className="pobi-shutter-text-anim"
              style={{
                position: 'relative',
                marginTop: '18px',
                padding: '6px 20px 8px 20px',
                textAlign: 'center',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: '-4px -18px',
                  borderRadius: '999px',
                  background:
                    'radial-gradient(ellipse at center, rgba(255,255,255,0.88) 0%, rgba(241,245,249,0.45) 66%, transparent 100%)',
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

              <div
                aria-hidden="true"
                style={{
                  position: 'relative',
                  margin: '10px auto 0 auto',
                  width: 'clamp(190px, 34vw, 340px)',
                  height: '4.5px',
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, #8CC63F 0%, #22993D 24%, #0A296B 52%, #0A296B 72%, #7CC17A 100%)',
                }}
              />
            </div>

            {/* Animated Brushed-Silver POBI Spray Can */}
            <div
              className="pobi-shutter-can-anim"
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                pointerEvents: 'none',
                zIndex: 8,
              }}
            >
              <SprayCanSvg />
            </div>
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
        }}
      >
        <button
          type="button"
          onClick={handleToggleAudio}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 13px',
            borderRadius: '999px',
            backgroundColor: audioBlocked ? '#FEF3C7' : 'rgba(255, 255, 255, 0.96)',
            color: '#0A296B',
            border: audioBlocked ? '1.5px solid #D97706' : '1px solid #94A3B8',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            cursor: 'pointer',
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
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            color: '#0A296B',
            border: '1px solid #94A3B8',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            cursor: 'pointer',
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
