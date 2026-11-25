import { useEffect, useRef, useState, useCallback } from 'react';
import { FastForward } from 'lucide-react';

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

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Custom SVG Illustration: Metallic Aerosol Spray Can with Nozzle Mist Cone
 */
function SprayCanSvg({ spraying }: { spraying: boolean }) {
  return (
    <svg
      width="142"
      height="192"
      viewBox="0 0 142 192"
      fill="none"
      aria-hidden="true"
      style={{ overflow: 'visible', filter: 'drop-shadow(0 12px 18px rgba(15, 23, 42, 0.38))' }}
    >
      {spraying && (
        <g opacity="0.9">
          <defs>
            <radialGradient id="pobiSprayCone" cx="85%" cy="50%" r="85%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="36%" stopColor="#0A2463" stopOpacity="0.42" />
              <stop offset="72%" stopColor="#15803D" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>
          <polygon points="56,24 -54,-26 -68,52" fill="url(#pobiSprayCone)" />
          <circle cx="22" cy="14" r="3" fill="#081E5C" opacity="0.6" />
          <circle cx="2" cy="25" r="2.3" fill="#15803D" opacity="0.55" />
          <circle cx="10" cy="3" r="2.6" fill="#FFFFFF" opacity="0.8" />
          <circle cx="-16" cy="13" r="2" fill="#081E5C" opacity="0.45" />
        </g>
      )}

      <g transform="translate(66, 94) rotate(-18) translate(-44, -76)">
        <rect x="35" y="8" width="18" height="13" rx="3" fill="#DC2626" stroke="#111827" strokeWidth="2.5" />
        <circle cx="38" cy="14.5" r="2.3" fill="#111827" />
        <rect x="41" y="21" width="6" height="5" fill="#94A3B8" stroke="#111827" strokeWidth="2" />
        <path d="M16 44 C16 28, 72 28, 72 44 Z" fill="#E2E8F0" stroke="#111827" strokeWidth="2.6" />
        <rect x="13" y="42" width="62" height="7" rx="3.5" fill="#CBD5E1" stroke="#111827" strokeWidth="2.4" />
        <rect x="15" y="49" width="58" height="96" rx="5" fill="#F8FAFC" stroke="#111827" strokeWidth="2.8" />
        <rect x="19" y="51" width="9" height="92" fill="#FFFFFF" opacity="0.82" />
        <rect x="61" y="51" width="10" height="92" fill="#94A3B8" opacity="0.45" />

        <rect x="16.5" y="68" width="55" height="54" fill="#081E5C" />
        <path d="M16.5 68 H42 L32 122 H16.5 Z" fill="#15803D" />
        <line x1="16.5" y1="68" x2="71.5" y2="68" stroke="#E4C284" strokeWidth="2.2" />
        <line x1="16.5" y1="122" x2="71.5" y2="122" stroke="#E4C284" strokeWidth="2.2" />
        <text
          x="44"
          y="99"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="13"
          fontWeight="900"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="1.5"
        >
          POBI
        </text>

        <rect x="13" y="143" width="62" height="8" rx="4" fill="#CBD5E1" stroke="#111827" strokeWidth="2.4" />
      </g>
    </svg>
  );
}

/**
 * Custom SVG Illustration: Plump, Stubby, Curly-White Bichon Frise Front Leg & Paw
 * Unmistakable arched 4-toe puppy paw with rose-pink toe beans & central trilobed pad,
 * connected to a short, stubby, curly-furred Bichon foreleg lifting the shutter bar.
 */
function BichonChubbyPawSvg({ side, effortSquish }: { side: 'left' | 'right'; effortSquish: number }) {
  const scaleX = 1 + effortSquish * 0.06;
  const scaleY = 1 - effortSquish * 0.05;
  const tiltDeg = side === 'left' ? 8 : -8;

  return (
    <svg
      width="148"
      height="164"
      viewBox="0 0 148 164"
      fill="none"
      aria-hidden="true"
      style={{
        overflow: 'visible',
        transform: `rotate(${tiltDeg}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`,
        transformOrigin: '74px 36px',
        filter: 'drop-shadow(0 10px 16px rgba(15, 23, 42, 0.34))',
      }}
    >
      <g transform={side === 'right' ? 'translate(148, 0) scale(-1, 1)' : undefined}>
        {/* Stubby, short, fluffy curly-white foreleg (narrower than paw so silhouette reads instantly as a puppy leg!) */}
        <path
          d="M44 74
             C32 82, 31 96, 38 107
             C30 118, 33 134, 44 142
             C49 154, 62 160, 74 160
             C86 160, 99 154, 104 142
             C115 134, 118 118, 110 107
             C117 96, 116 82, 104 74 Z"
          fill="#FFFFFF"
          stroke="#111827"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Soft side fur shading on the stubby foreleg */}
        <path
          d="M41 96 C45 110, 44 124, 49 138 M107 96 C103 110, 104 124, 99 138"
          stroke="#E2E8F0"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Delicate side fluff curls (no horizontal face-like lines!) */}
        <path d="M46 112 C42 117, 43 124, 49 127" stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M102 112 C106 117, 105 124, 99 127" stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M62 149 C68 154, 80 154, 86 149" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />

        {/* Plump, Arched 4-Toe Puppy Paw Head ("圓滾滾饅頭狗掌") */}
        <path
          d="M20 56
             C11 45, 14 27, 29 24
             C33 10, 50 4, 64 11
             C71 4, 86 4, 94 12
             C109 6, 123 16, 123 30
             C135 35, 136 52, 124 62
             C118 76, 98 85, 74 85
             C50 85, 30 76, 20 56 Z"
          fill="#FFFFFF"
          stroke="#111827"
          strokeWidth="4.2"
          strokeLinejoin="round"
        />

        {/* Soft grey-blue volume shadow along bottom of the round paw cushion */}
        <path
          d="M30 66 C46 79, 102 79, 118 65"
          stroke="#E2E8F0"
          strokeWidth="5.5"
          strokeLinecap="round"
        />

        {/* Tiny cute dark-charcoal blunt puppy claws peeking at the top of the 4 arched toes */}
        <path d="M28 22 C27 16, 32 14, 35 19" fill="#334155" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
        <path d="M56 8 C56 2, 62 1, 64 7" fill="#334155" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
        <path d="M88 8 C90 2, 96 3, 95 9" fill="#334155" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
        <path d="M119 23 C122 18, 127 20, 125 26" fill="#334155" stroke="#111827" strokeWidth="2" strokeLinecap="round" />

        {/* Subtle fluffy toe-cleft notches at top */}
        <path d="M43 21 C44 27, 45 31, 46 34" stroke="#111827" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M75 14 C75 20, 75 25, 75 29" stroke="#111827" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M106 21 C105 27, 104 31, 102 34" stroke="#111827" strokeWidth="2.6" strokeLinecap="round" />

        {/* 4 Plump Rose-Pink Puppy Toe Beans (四顆圓潤粉嫩小肉球) in a natural arch! */}
        <ellipse
          cx="35"
          cy="44"
          rx="8.5"
          ry="11"
          transform="rotate(-22 35 44)"
          fill="#F48FB1"
          stroke="#111827"
          strokeWidth="2.8"
        />
        <ellipse
          cx="60"
          cy="32"
          rx="9"
          ry="12"
          transform="rotate(-7 60 32)"
          fill="#F48FB1"
          stroke="#111827"
          strokeWidth="2.8"
        />
        <ellipse
          cx="89"
          cy="32"
          rx="9"
          ry="12"
          transform="rotate(7 89 32)"
          fill="#F48FB1"
          stroke="#111827"
          strokeWidth="2.8"
        />
        <ellipse
          cx="113"
          cy="45"
          rx="8.5"
          ry="11"
          transform="rotate(22 113 45)"
          fill="#F48FB1"
          stroke="#111827"
          strokeWidth="2.8"
        />

        {/* Cute glossy highlights on each toe bean */}
        <ellipse cx="33" cy="40" rx="2.6" ry="3.8" transform="rotate(-22 33 40)" fill="#FCE7F3" />
        <ellipse cx="58" cy="27" rx="2.8" ry="4.2" transform="rotate(-7 58 27)" fill="#FCE7F3" />
        <ellipse cx="87" cy="27" rx="2.8" ry="4.2" transform="rotate(7 87 27)" fill="#FCE7F3" />
        <ellipse cx="111" cy="41" rx="2.6" ry="3.8" transform="rotate(22 111 41)" fill="#FCE7F3" />

        {/* Plump Trilobed / M-Heart Central Puppy Metacarpal Pad (掌心大肉球)! */}
        <path
          d="M50 64
             C47 54, 60 46, 74 47
             C88 46, 101 54, 98 64
             C96 73, 86 76, 74 73
             C62 76, 52 73, 50 64 Z"
          fill="#F48FB1"
          stroke="#111827"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <ellipse cx="68" cy="56" rx="6" ry="3.2" fill="#FCE7F3" opacity="0.85" />
      </g>
    </svg>
  );
}

export default function RollerShutterIntro({ onComplete }: RollerShutterIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const completedRef = useRef(false);

  const [logoRevealPct, setLogoRevealPct] = useState(2);
  const [textRevealPct, setTextRevealPct] = useState(0);
  const [canState, setCanState] = useState<{ visible: boolean; x: number; y: number; spraying: boolean }>({
    visible: true,
    x: 110,
    y: -60,
    spraying: false,
  });
  const [shutterLiftPct, setShutterLiftPct] = useState(0);
  const [pawReachPct, setPawReachPct] = useState(0);
  const [pawEffort, setPawEffort] = useState(0);
  const [pawWiggle, setPawWiggle] = useState(0);
  const [frameFadeOut, setFrameFadeOut] = useState(false);

  const finishIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finishIntro();
        return;
      }
    } catch {}

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finishIntro();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    const particles: MistParticle[] = [];
    const sprayPalette = ['#081E5C', '#0A2463', '#15803D', '#FFFFFF', '#E2E8F0'];
    let rafId = 0;
    const startTime = performance.now();

    const spawnMist = (cx: number, cy: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.PI + (Math.random() - 0.5) * 1.15;
        const speed = 1.6 + Math.random() * 5.4;
        particles.push({
          x: cx + (Math.random() - 0.5) * 14,
          y: cy + (Math.random() - 0.5) * 14,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.3,
          r: 1.6 + Math.random() * 4.4,
          alpha: 0.5 + Math.random() * 0.4,
          decay: 0.022 + Math.random() * 0.02,
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
      const centerY = window.innerHeight * 0.42;

      // Phase 1A (0.0s - 0.30s): Spray can enters & rattles
      if (elapsed < 0.3) {
        const p = clamp01(elapsed / 0.3);
        const shake = Math.sin(elapsed * 58) * 6;
        setCanState({
          visible: true,
          x: 92 - p * 42,
          y: -120 + shake,
          spraying: false,
        });
      }
      // Phase 1B (0.30s - 1.85s): Spraying the circular Bichon PDF logo onto the shutter
      else if (elapsed < 1.85) {
        const p = clamp01((elapsed - 0.3) / 1.55);
        setLogoRevealPct(p * 100);

        const sweepX = Math.sin(p * Math.PI * 3.5) * 120 + 52;
        const sweepY = -120 + p * 220;
        setCanState({
          visible: true,
          x: sweepX,
          y: sweepY,
          spraying: true,
        });
        spawnMist(centerX + sweepX - 40, centerY + sweepY - 54, 4);
      }
      // Phase 1C (1.85s - 2.65s): Spraying "POBI STUDIO presents" left-to-right
      else if (elapsed < 2.65) {
        setLogoRevealPct(100);
        const p = clamp01((elapsed - 1.85) / 0.8);
        const eased = easeInOutCubic(p);
        setTextRevealPct(eased * 100);

        const sweepX = -155 + eased * 320 + 48;
        const sweepY = 166 + Math.sin(p * Math.PI * 2) * 5;
        setCanState({
          visible: true,
          x: sweepX,
          y: sweepY,
          spraying: true,
        });
        spawnMist(centerX + sweepX - 40, centerY + sweepY - 54, 3);
      }
      // Phase 1D (2.65s - 3.05s): Spray can exits, brief hero hold on finished mural
      else if (elapsed < 3.05) {
        setLogoRevealPct(100);
        setTextRevealPct(100);
        const p = clamp01((elapsed - 2.65) / 0.4);
        setCanState({
          visible: p < 0.98,
          x: 205 + p * 190,
          y: 170 + p * 150,
          spraying: false,
        });
      }
      // Phase 2A (3.05s - 3.65s): Chubby Bichon front paws reach up, hook the bottom bar, and heave!
      else if (elapsed < 3.65) {
        setLogoRevealPct(100);
        setTextRevealPct(100);
        setCanState((prev) => (prev.visible ? { ...prev, visible: false, spraying: false } : prev));

        const reachP = clamp01((elapsed - 3.05) / 0.32);
        setPawReachPct(easeOutBack(reachP));

        // Initial cute puppy crack-open heave so stubby forearms show clearly at bottom!
        if (elapsed >= 3.3) {
          const tugP = (elapsed - 3.3) / 0.35;
          const tugWave = Math.sin(tugP * Math.PI);
          setPawEffort(tugWave);
          setShutterLiftPct(tugP * 8.5 + tugWave * 2.0);
        }
      }
      // Phase 2B (3.65s - 5.85s): Chubby Bichon front paws slowly & steadily push the shutter all the way up!
      else if (elapsed < 5.85) {
        setPawReachPct(1);
        const liftP = clamp01((elapsed - 3.65) / 2.2);
        const easedLift = easeInOutCubic(liftP);
        setShutterLiftPct(8.5 + easedLift * 96.5);
        setPawEffort(0.45 + 0.28 * Math.sin(liftP * Math.PI * 6));
        setPawWiggle(Math.sin(liftP * Math.PI * 7));
      }
      // Phase 3 (5.85s - 6.15s): Top hood & side rails retract cleanly
      else if (elapsed < 6.15) {
        setShutterLiftPct(105);
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
          pt.vx *= 0.95;
          pt.vy *= 0.95;
          pt.r += 0.22;
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
    };
  }, [finishIntro]);

  const logoMask =
    logoRevealPct >= 99.5
      ? 'none'
      : `linear-gradient(180deg, #000000 ${Math.max(0, logoRevealPct - 8)}%, rgba(0,0,0,0.45) ${logoRevealPct + 4}%, transparent ${logoRevealPct + 16}%)`;

  const textMask =
    textRevealPct <= 0.1
      ? 'linear-gradient(90deg, transparent 0%, transparent 100%)'
      : textRevealPct >= 99.5
      ? 'none'
      : `linear-gradient(90deg, #000000 ${Math.max(0, textRevealPct - 10)}%, rgba(0,0,0,0.4) ${textRevealPct + 4}%, transparent ${textRevealPct + 18}%)`;

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
      {/* Left & Right Galvanized Steel Guide Rails */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '14px',
          background: 'linear-gradient(90deg, #64748B 0%, #CBD5E1 48%, #475569 100%)',
          borderRight: '1px solid #334155',
          boxShadow: '4px 0 12px rgba(15, 23, 42, 0.25)',
          zIndex: 4,
          opacity: frameFadeOut ? 0 : 1,
          transition: 'opacity 0.28s ease',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: '14px',
          background: 'linear-gradient(270deg, #64748B 0%, #CBD5E1 48%, #475569 100%)',
          borderLeft: '1px solid #334155',
          boxShadow: '-4px 0 12px rgba(15, 23, 42, 0.25)',
          zIndex: 4,
          opacity: frameFadeOut ? 0 : 1,
          transition: 'opacity 0.28s ease',
        }}
      />

      {/* Top Roller Shutter Housing Hood */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '32px',
          background: 'linear-gradient(180deg, #94A3B8 0%, #CBD5E1 35%, #64748B 88%, #334155 100%)',
          borderBottom: '2px solid #1E293B',
          boxShadow: '0 8px 18px rgba(15, 23, 42, 0.36)',
          zIndex: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          transform: frameFadeOut ? 'translate3d(0, -110%, 0)' : 'translate3d(0, 0, 0)',
          transition: 'transform 0.28s ease',
        }}
      >
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#475569', border: '1px solid #E2E8F0' }} />
        <span
          style={{
            fontSize: '0.66rem',
            fontWeight: 800,
            letterSpacing: '0.24em',
            color: '#1E293B',
            opacity: 0.75,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          WAREHOUSE BAY 01 · POBI STUDIO
        </span>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#475569', border: '1px solid #E2E8F0' }} />
      </div>

      {/* Main Rising Corrugated Steel Roller Shutter Curtain */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          transform: `translate3d(0, -${shutterLiftPct.toFixed(3)}%, 0)`,
          willChange: 'transform',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Corrugated Horizontal Galvanized Steel Slats */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            width: '100%',
            backgroundColor: '#CBD5E1',
            backgroundImage: `
              linear-gradient(90deg, rgba(15,23,42,0.18) 0%, rgba(255,255,255,0.28) 20%, rgba(15,23,42,0.03) 50%, rgba(255,255,255,0.24) 80%, rgba(15,23,42,0.18) 100%),
              repeating-linear-gradient(
                180deg,
                #EEF2F6 0px,
                #EEF2F6 2px,
                #D8E0E8 3px,
                #C5CFD9 12px,
                #B3BFCB 21px,
                #7B8796 24px,
                #525E6E 26px
              )
            `,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px 34px 20px',
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
              transform: 'translateY(-14px)',
            }}
          >
            {/* Sprayed Circular PDF Bichon Logo */}
            <div
              style={{
                position: 'relative',
                width: 'clamp(215px, 34vmin, 300px)',
                height: 'clamp(215px, 34vmin, 300px)',
                WebkitMaskImage: logoMask,
                maskImage: logoMask,
              }}
            >
              {/* Clean soft white aerosol stencil mist behind the circular emblem */}
              <div
                style={{
                  position: 'absolute',
                  inset: '-14px',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(255,255,255,0.92) 58%, rgba(255,255,255,0.35) 68%, transparent 76%)',
                  filter: 'blur(3px)',
                }}
              />

              {/* Authentic tiny spray-paint droplets around the perimeter */}
              <svg
                aria-hidden="true"
                viewBox="0 0 340 340"
                style={{ position: 'absolute', inset: '-20px', width: 'calc(100% + 40px)', height: 'calc(100% + 40px)', pointerEvents: 'none' }}
              >
                <circle cx="38" cy="88" r="2.6" fill="#081E5C" opacity="0.55" />
                <circle cx="29" cy="102" r="1.6" fill="#15803D" opacity="0.5" />
                <circle cx="304" cy="96" r="2.8" fill="#081E5C" opacity="0.5" />
                <circle cx="312" cy="112" r="1.8" fill="#15803D" opacity="0.55" />
                <circle cx="52" cy="264" r="2.4" fill="#15803D" opacity="0.5" />
                <circle cx="292" cy="256" r="2.2" fill="#081E5C" opacity="0.5" />
                <circle cx="168" cy="14" r="2" fill="#081E5C" opacity="0.45" />
              </svg>

              <img
                src="/pobi-shutter-logo.webp"
                alt="POBI STUDIO Bichon Emblem"
                width={300}
                height={300}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  filter: 'contrast(1.05) drop-shadow(0 2px 6px rgba(8, 30, 92, 0.16))',
                }}
              />

              {/* Corrugated Slat Seam Shadow Overlay across the paint */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  mixBlendMode: 'multiply',
                  opacity: 0.3,
                  backgroundImage: `repeating-linear-gradient(
                    180deg,
                    transparent 0px,
                    transparent 22px,
                    rgba(51, 65, 85, 0.52) 24px,
                    rgba(30, 41, 59, 0.72) 26px
                  )`,
                }}
              />
            </div>

            {/* Sprayed "POBI STUDIO presents" High-Contrast Stencil Banner */}
            <div
              style={{
                position: 'relative',
                marginTop: '18px',
                padding: '8px 26px 10px 26px',
                WebkitMaskImage: textMask,
                maskImage: textMask,
                opacity: textRevealPct > 0.2 ? 1 : 0,
                textAlign: 'center',
              }}
            >
              {/* Crisp white stencil mist backing so lettering pops off the steel slats */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: '-4px -16px',
                  borderRadius: '999px',
                  background:
                    'radial-gradient(ellipse at center, rgba(255,255,255,0.92) 0%, rgba(241,245,249,0.72) 68%, transparent 100%)',
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
                  gap: '12px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                    fontSize: 'clamp(1.32rem, 3.3vw, 1.95rem)',
                    fontWeight: 900,
                    letterSpacing: '0.16em',
                  }}
                >
                  <span style={{ color: '#15803D' }}>P</span>
                  <span style={{ color: '#081E5C' }}>OB</span>
                  <span style={{ color: '#15803D' }}>I</span>
                  <span style={{ color: '#081E5C', marginLeft: '0.28em' }}>STUDIO</span>
                </span>
                <span
                  style={{
                    fontFamily: 'Georgia, "Noto Serif TC", serif',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: 'clamp(1.12rem, 2.6vw, 1.52rem)',
                    letterSpacing: '0.1em',
                    color: '#0F172A',
                  }}
                >
                  presents
                </span>
              </div>

              {/* Sprayed street-underline streak */}
              <div
                aria-hidden="true"
                style={{
                  position: 'relative',
                  margin: '5px auto 0 auto',
                  width: '90%',
                  height: '4px',
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, transparent 0%, #15803D 16%, #081E5C 52%, #15803D 86%, transparent 100%)',
                }}
              />
            </div>

            {/* Animated Spray Paint Can */}
            {canState.visible && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate3d(${canState.x.toFixed(1)}px, ${canState.y.toFixed(1)}px, 0)`,
                  pointerEvents: 'none',
                  zIndex: 8,
                }}
              >
                <SprayCanSvg spraying={canState.spraying} />
              </div>
            )}
          </div>
        </div>

        {/* Heavy Industrial Bottom Locking Bar + Bichon Paws */}
        <div
          style={{
            position: 'relative',
            height: '42px',
            width: '100%',
            background: 'linear-gradient(180deg, #E2E8F0 0%, #94A3B8 45%, #64748B 80%, #1E293B 81%, #0F172A 100%)',
            borderTop: '2px solid #475569',
            boxShadow: '0 22px 42px rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Central Recessed Metal Handle Plate */}
          <div
            style={{
              width: '132px',
              height: '16px',
              borderRadius: '4px',
              backgroundColor: '#334155',
              border: '1.5px solid #CBD5E1',
              boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.65)',
              marginBottom: '6px',
            }}
          />

          {/* Two Chubby Fluffy Bichon Frise Front Paws Gripping & Pushing the Shutter Up! */}
          {pawReachPct > 0.01 && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '50%',
                top: '-28px',
                transform: `translate3d(-50%, ${((1 - pawReachPct) * 120).toFixed(1)}px, 0)`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'clamp(88px, 18vw, 168px)',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              <div style={{ transform: `translateY(${(pawWiggle * 4).toFixed(1)}px) rotate(-3deg)` }}>
                <BichonChubbyPawSvg side="left" effortSquish={pawEffort} />
              </div>
              <div style={{ transform: `translateY(${(-pawWiggle * 4).toFixed(1)}px) rotate(3deg)` }}>
                <BichonChubbyPawSvg side="right" effortSquish={pawEffort} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Aerosol Paint Mist Particle Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      />

      {/* Skip Intro Button */}
      {!frameFadeOut && (
        <button
          type="button"
          onClick={finishIntro}
          data-testid="skip-shutter-intro-btn"
          style={{
            position: 'absolute',
            top: '46px',
            right: '26px',
            zIndex: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '999px',
            border: '1px solid rgba(30, 41, 59, 0.35)',
            backgroundColor: 'rgba(248, 250, 252, 0.88)',
            color: '#1E293B',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.16)',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span>略過開場</span>
          <FastForward size={14} />
        </button>
      )}
    </div>
  );
}
