import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, RotateCcw, Play, Pause, Trophy } from 'lucide-react';

interface DinoGameProps {
  theme?: 'light' | 'dark';
  compact?: boolean;
}

// Logical canvas dimensions (crisp pixel grid)
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 180;
const GROUND_Y = 148;
const DINO_X = 48;

// Pixel art bitmaps (1 = filled pixel)
const DINO_STAND = [
  '        11111111 ',
  '       1111111111',
  '       1101111111',
  '       1111111111',
  '       1111111111',
  '       1111100000',
  '       1111111100',
  '      1111110000 ',
  '1    1111111000  ',
  '1   11111111100  ',
  '11 111111110010  ',
  '111111111110000  ',
  '111111111110000  ',
  ' 11111111100000  ',
  '  1111111100000  ',
  '   111111000000  ',
  '    11 11        ',
  '    11 11        ',
  '    11 11        ',
  '    111111       ',
];

const DINO_RUN_1 = [
  '        11111111 ',
  '       1111111111',
  '       1101111111',
  '       1111111111',
  '       1111111111',
  '       1111100000',
  '       1111111100',
  '      1111110000 ',
  '1    1111111000  ',
  '1   11111111100  ',
  '11 111111110010  ',
  '111111111110000  ',
  '111111111110000  ',
  ' 11111111100000  ',
  '  1111111100000  ',
  '   111111000000  ',
  '    11 11        ',
  '    11  111      ',
  '    11           ',
  '    111          ',
];

const DINO_RUN_2 = [
  '        11111111 ',
  '       1111111111',
  '       1101111111',
  '       1111111111',
  '       1111111111',
  '       1111100000',
  '       1111111100',
  '      1111110000 ',
  '1    1111111000  ',
  '1   11111111100  ',
  '11 111111110010  ',
  '111111111110000  ',
  '111111111110000  ',
  ' 11111111100000  ',
  '  1111111100000  ',
  '   111111000000  ',
  '    11 11        ',
  '     1111        ',
  '       11        ',
  '       111       ',
];

const DINO_CRASH = [
  '        11111111 ',
  '       1111111111',
  '       1001111111',
  '       1011111111',
  '       1111111111',
  '       1111100000',
  '       1111111100',
  '      1111110000 ',
  '1    1111111000  ',
  '1   11111111100  ',
  '11 111111110010  ',
  '111111111110000  ',
  '111111111110000  ',
  ' 11111111100000  ',
  '  1111111100000  ',
  '   111111000000  ',
  '    11 11        ',
  '    11 11        ',
  '    11 11        ',
  '    111111       ',
];

const DINO_DUCK_1 = [
  '              11111111 ',
  '             1111111111',
  '             1101111111',
  '1    111111111111111111',
  '11  1111111111111100000',
  '1111111111111111111100 ',
  ' 11111111111111000000  ',
  '  1111111111110000000  ',
  '    111111111          ',
  '     11  11            ',
  '     11   111          ',
  '     111               ',
];

const DINO_DUCK_2 = [
  '              11111111 ',
  '             1111111111',
  '             1101111111',
  '1    111111111111111111',
  '11  1111111111111100000',
  '1111111111111111111100 ',
  ' 11111111111111000000  ',
  '  1111111111110000000  ',
  '    111111111          ',
  '     11  11            ',
  '      11111            ',
  '         111           ',
];

const CACTUS_SMALL = [
  '   11   ',
  '  1111  ',
  '1 1111  ',
  '1 1111 1',
  '1 1111 1',
  '111111 1',
  ' 1111111',
  '  11111 ',
  '  1111  ',
  '  1111  ',
  '  1111  ',
  '  1111  ',
  '  1111  ',
];

const CACTUS_LARGE = [
  '    111    ',
  '   11111   ',
  '   11111   ',
  '11 11111   ',
  '11 11111 11',
  '11 11111 11',
  '11 11111 11',
  '11111111 11',
  ' 1111111111',
  '   1111111 ',
  '   11111   ',
  '   11111   ',
  '   11111   ',
  '   11111   ',
  '   11111   ',
  '   11111   ',
  '   11111   ',
  '   11111   ',
];

const PTERO_UP = [
  '     11       ',
  '    1111      ',
  '   111111     ',
  '  11111111    ',
  ' 11111111111  ',
  '11101111111111',
  '   111111111  ',
  '     11111    ',
];

const PTERO_DOWN = [
  '  111         ',
  ' 1111111      ',
  '11101111111111',
  '   111111111  ',
  '    111111    ',
  '    1111      ',
  '    111       ',
  '    11        ',
];

const CLOUD_SPRITE = [
  '      111111      ',
  '    1111111111    ',
  '  11111111111111  ',
  ' 1111111111111111 ',
  '111111111111111111',
];

function drawPixelSprite(
  ctx: CanvasRenderingContext2D,
  sprite: string[],
  x: number,
  y: number,
  scale: number,
  color: string
) {
  ctx.fillStyle = color;
  const rx = Math.round(x);
  const ry = Math.round(y);
  for (let row = 0; row < sprite.length; row++) {
    const line = sprite[row];
    for (let col = 0; col < line.length; col++) {
      if (line[col] === '1') {
        ctx.fillRect(rx + col * scale, ry + row * scale, scale, scale);
      }
    }
  }
}

interface Obstacle {
  kind: 'cactus-small' | 'cactus-large' | 'ptero';
  x: number;
  y: number;
  width: number;
  height: number;
  count: number; // for cactus clusters
}

interface Cloud {
  x: number;
  y: number;
  speed: number;
}

interface Pebble {
  x: number;
  y: number;
  w: number;
}

const HIGH_SCORE_KEY = 'pobi_dino_highscore';

export default function DinoGame({ theme = 'light', compact = false }: DinoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(HIGH_SCORE_KEY);
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const [muted, setMuted] = useState(false);

  // Mutable simulation state for 60fps loop
  const simRef = useRef({
    status: 'idle' as 'idle' | 'playing' | 'paused' | 'gameover',
    dinoY: GROUND_Y - 40, // top of dino
    dinoVy: 0,
    isJumping: false,
    isDucking: false,
    jumpHeld: false,
    speed: 4.2,
    distance: 0,
    score: 0,
    lastMilestone: 0,
    animTimer: 0,
    blinkTimer: 0,
    obstacles: [] as Obstacle[],
    nextObstacleGap: 340,
    clouds: [
      { x: 140, y: 32, speed: 0.6 },
      { x: 380, y: 50, speed: 0.45 },
      { x: 560, y: 24, speed: 0.7 },
    ] as Cloud[],
    pebbles: Array.from({ length: 24 }, (_, i) => ({
      x: i * 28 + Math.random() * 14,
      y: GROUND_Y + 4 + Math.floor(Math.random() * 8),
      w: 2 + Math.floor(Math.random() * 5),
    })) as Pebble[],
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore;

  const playTone = useCallback((freq: number, duration: number, type: OscillatorType = 'square', slideTo?: number) => {
    if (mutedRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignore audio errors
    }
  }, []);

  const resetGame = useCallback((startImmediately = true) => {
    const s = simRef.current;
    s.dinoY = GROUND_Y - 40;
    s.dinoVy = 0;
    s.isJumping = false;
    s.isDucking = false;
    s.jumpHeld = false;
    s.speed = 4.2;
    s.distance = 0;
    s.score = 0;
    s.lastMilestone = 0;
    s.animTimer = 0;
    s.obstacles = [];
    s.nextObstacleGap = 340;
    s.status = startImmediately ? 'playing' : 'idle';
    setScore(0);
    setGameState(s.status);
  }, []);

  const triggerJump = useCallback(() => {
    const s = simRef.current;
    if (s.status === 'idle' || s.status === 'gameover') {
      resetGame(true);
      s.dinoVy = -10.8;
      s.isJumping = true;
      s.jumpHeld = true;
      playTone(320, 0.09, 'square', 580);
      return;
    }
    if (s.status === 'paused') {
      s.status = 'playing';
      setGameState('playing');
      return;
    }
    if (!s.isJumping && s.status === 'playing') {
      s.dinoVy = -10.8;
      s.isJumping = true;
      s.isDucking = false;
      s.jumpHeld = true;
      playTone(320, 0.09, 'square', 580);
    }
  }, [playTone, resetGame]);

  const togglePause = useCallback(() => {
    const s = simRef.current;
    if (s.status === 'playing') {
      s.status = 'paused';
      setGameState('paused');
    } else if (s.status === 'paused') {
      s.status = 'playing';
      setGameState('playing');
    }
  }, []);

  // Keyboard controls (ignored when typing in inputs)
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || isTypingTarget(document.activeElement)) return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (!e.repeat) {
          triggerJump();
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        const s = simRef.current;
        if (s.status === 'playing') {
          s.isDucking = true;
          if (s.isJumping && s.dinoVy < 5) {
            s.dinoVy = 6.5; // Fast fall
          }
        }
      } else if (e.code === 'KeyP') {
        if (simRef.current.status === 'playing' || simRef.current.status === 'paused') {
          togglePause();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        simRef.current.jumpHeld = false;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        simRef.current.isDucking = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [triggerJump, togglePause]);

  // Main 60fps requestAnimationFrame loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const spawnObstacle = (scoreVal: number) => {
      const s = simRef.current;
      const canSpawnPtero = scoreVal >= 220;
      const roll = Math.random();

      if (canSpawnPtero && roll < 0.25) {
        // Pterodactyl at 3 possible heights
        const heights = [GROUND_Y - 22, GROUND_Y - 46, GROUND_Y - 72];
        const py = heights[Math.floor(Math.random() * heights.length)];
        s.obstacles.push({
          kind: 'ptero',
          x: CANVAS_WIDTH + 20,
          y: py,
          width: 28,
          height: 16,
          count: 1,
        });
      } else if (roll < 0.62) {
        const count = scoreVal > 120 ? 1 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);
        s.obstacles.push({
          kind: 'cactus-small',
          x: CANVAS_WIDTH + 20,
          y: GROUND_Y - 26,
          width: 16 * count + (count - 1) * 2,
          height: 26,
          count,
        });
      } else {
        const count = scoreVal > 180 ? 1 + Math.floor(Math.random() * 2) : 1;
        s.obstacles.push({
          kind: 'cactus-large',
          x: CANVAS_WIDTH + 20,
          y: GROUND_Y - 36,
          width: 22 * count + (count - 1) * 2,
          height: 36,
          count,
        });
      }

      const minGap = Math.max(300, 420 - s.speed * 8);
      s.nextObstacleGap = minGap + Math.random() * 240;
    };

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 16.6667; // Normalized to 60fps
      lastTime = now;
      const dt = Math.min(rawDt, 2.5);

      const s = simRef.current;
      s.animTimer += dt;

      if (s.status === 'playing') {
        // Accelerate smoothly
        s.speed = Math.min(9.5, 4.2 + s.score * 0.003);
        const dx = s.speed * dt;
        s.distance += dx;

        const newScore = Math.floor(s.distance / 12);
        if (newScore !== s.score) {
          s.score = newScore;
          setScore(newScore);

          // 100-point milestone chime
          const milestone = Math.floor(newScore / 100);
          if (milestone > s.lastMilestone && newScore > 0) {
            s.lastMilestone = milestone;
            playTone(587, 0.08, 'square');
            setTimeout(() => playTone(880, 0.14, 'square'), 80);
          }
        }

        // Dino jump physics
        if (s.isJumping) {
          const gravity = !s.jumpHeld && s.dinoVy < 0 ? 0.92 : 0.56;
          s.dinoVy += gravity * dt;
          s.dinoY += s.dinoVy * dt;

          const targetGroundTop = GROUND_Y - (s.isDucking ? 24 : 40);
          if (s.dinoY >= targetGroundTop) {
            s.dinoY = targetGroundTop;
            s.dinoVy = 0;
            s.isJumping = false;
          }
        } else {
          s.dinoY = GROUND_Y - (s.isDucking ? 24 : 40);
        }

        // Clouds
        for (const c of s.clouds) {
          c.x -= c.speed * dt;
          if (c.x < -50) {
            c.x = CANVAS_WIDTH + 20 + Math.random() * 80;
            c.y = 18 + Math.random() * 48;
          }
        }

        // Pebbles
        for (const p of s.pebbles) {
          p.x -= dx;
          if (p.x < -10) {
            p.x = CANVAS_WIDTH + Math.random() * 20;
            p.y = GROUND_Y + 4 + Math.floor(Math.random() * 8);
          }
        }

        // Obstacles
        s.nextObstacleGap -= dx;
        if (s.nextObstacleGap <= 0) {
          spawnObstacle(s.score);
        }

        for (let i = s.obstacles.length - 1; i >= 0; i--) {
          const ob = s.obstacles[i];
          ob.x -= dx * (ob.kind === 'ptero' ? 1.12 : 1);
          if (ob.x + ob.width < -20) {
            s.obstacles.splice(i, 1);
          }
        }

        // Hitbox collision (forgiving inner padding like Chrome Dino)
        const dinoH = s.isDucking && !s.isJumping ? 24 : 40;
        const dinoW = s.isDucking && !s.isJumping ? 46 : 34;
        const dBox = {
          x: DINO_X + 6,
          y: s.dinoY + 5,
          w: dinoW - 12,
          h: dinoH - 8,
        };

        for (const ob of s.obstacles) {
          const oBox = {
            x: ob.x + 4,
            y: ob.y + 4,
            w: ob.width - 8,
            h: ob.height - 6,
          };
          const hit =
            dBox.x < oBox.x + oBox.w &&
            dBox.x + dBox.w > oBox.x &&
            dBox.y < oBox.y + oBox.h &&
            dBox.y + dBox.h > oBox.y;

          if (hit) {
            s.status = 'gameover';
            setGameState('gameover');
            playTone(180, 0.18, 'sawtooth', 90);
            if (s.score > highScoreRef.current) {
              setHighScore(s.score);
              try {
                localStorage.setItem(HIGH_SCORE_KEY, String(s.score));
              } catch {
                // ignore storage errors
              }
            }
            break;
          }
        }
      }

      // Render frame
      const isNightPhase = Math.floor(s.score / 700) % 2 === 1;
      const darkPalette = theme === 'dark' || isNightPhase;

      const bgColor = darkPalette ? '#1f1b18' : '#faf6ee';
      const inkColor = darkPalette ? '#e8dfd1' : '#3d342b';
      const mutedColor = darkPalette ? '#6e6256' : '#c4b6a0';
      const accentColor = darkPalette ? '#d4a853' : '#9c7332';

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Night stars
      if (isNightPhase) {
        ctx.fillStyle = mutedColor;
        const starPositions = [
          [90, 26], [190, 44], [310, 20], [440, 38], [560, 28],
        ];
        for (const [sx, sy] of starPositions) {
          ctx.fillRect(sx, sy, 2, 2);
        }
      }

      // Clouds
      for (const c of s.clouds) {
        drawPixelSprite(ctx, CLOUD_SPRITE, c.x, c.y, 2, mutedColor);
      }

      // Ground line & pebbles
      ctx.fillStyle = inkColor;
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 2);
      ctx.fillStyle = mutedColor;
      for (const p of s.pebbles) {
        ctx.fillRect(Math.round(p.x), p.y, p.w, 2);
      }

      // Obstacles
      const wingUp = Math.floor(s.animTimer / 20) % 2 === 0;
      for (const ob of s.obstacles) {
        if (ob.kind === 'ptero') {
          drawPixelSprite(ctx, wingUp ? PTERO_UP : PTERO_DOWN, ob.x, ob.y, 2, accentColor);
        } else if (ob.kind === 'cactus-small') {
          for (let k = 0; k < ob.count; k++) {
            drawPixelSprite(ctx, CACTUS_SMALL, ob.x + k * 18, ob.y, 2, inkColor);
          }
        } else {
          for (let k = 0; k < ob.count; k++) {
            drawPixelSprite(ctx, CACTUS_LARGE, ob.x + k * 24, ob.y, 2, inkColor);
          }
        }
      }

      // Dino sprite
      const runFrame = Math.floor(s.animTimer / 18) % 2 === 0;
      let dinoSprite = DINO_STAND;
      if (s.status === 'gameover') {
        dinoSprite = DINO_CRASH;
      } else if (s.status === 'idle') {
        dinoSprite = DINO_STAND;
      } else if (s.isJumping) {
        dinoSprite = DINO_STAND;
      } else if (s.isDucking) {
        dinoSprite = runFrame ? DINO_DUCK_1 : DINO_DUCK_2;
      } else {
        dinoSprite = runFrame ? DINO_RUN_1 : DINO_RUN_2;
      }

      drawPixelSprite(ctx, dinoSprite, DINO_X, s.dinoY, 2, inkColor);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playTone, theme]);

  const formattedScore = String(score).padStart(5, '0');
  const formattedHi = String(highScore).padStart(5, '0');

  return (
    <div
      style={{
        backgroundColor: theme === 'dark' ? '#24201c' : '#faf6ee',
        border: `1px solid ${theme === 'dark' ? '#3d362f' : '#dfd4c1'}`,
        borderRadius: '10px',
        padding: compact ? '12px 14px' : '18px 20px',
        boxShadow: '0 8px 24px rgba(45, 35, 20, 0.08)',
        width: '100%',
      }}
    >
      {/* Top HUD Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: theme === 'dark' ? '#e8dfd1' : '#3d342b',
            }}
          >
            離線小恐龍
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 7px',
              borderRadius: '999px',
              backgroundColor: theme === 'dark' ? 'rgba(212, 168, 83, 0.16)' : 'rgba(180, 139, 72, 0.14)',
              color: theme === 'dark' ? '#d4a853' : '#8a6427',
              fontWeight: 600,
            }}
          >
            Space 跳躍 / Down 蹲下
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.84rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: theme === 'dark' ? '#e8dfd1' : '#3d342b',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', opacity: 0.68 }}>
              <Trophy size={13} />
              HI {formattedHi}
            </span>
            <span>{formattedScore}</span>
          </div>

          {(gameState === 'playing' || gameState === 'paused') && (
            <button
              type="button"
              onClick={togglePause}
              title={gameState === 'paused' ? '繼續' : '暫停'}
              style={{
                background: 'none',
                border: `1px solid ${theme === 'dark' ? '#3d362f' : '#dfd4c1'}`,
                borderRadius: '6px',
                padding: '4px 6px',
                cursor: 'pointer',
                color: theme === 'dark' ? '#e8dfd1' : '#3d342b',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {gameState === 'paused' ? <Play size={14} /> : <Pause size={14} />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMuted((prev) => !prev)}
            title={muted ? '開啟音效' : '靜音'}
            style={{
              background: 'none',
              border: `1px solid ${theme === 'dark' ? '#3d362f' : '#dfd4c1'}`,
              borderRadius: '6px',
              padding: '4px 6px',
              cursor: 'pointer',
              color: theme === 'dark' ? '#e8dfd1' : '#3d342b',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      {/* Canvas Stage */}
      <div
        style={{
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          border: `1px solid ${theme === 'dark' ? '#3a332c' : '#e4dac8'}`,
          cursor: 'pointer',
          userSelect: 'none',
          touchAction: 'manipulation',
        }}
        onClick={triggerJump}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            imageRendering: 'pixelated',
          }}
        />

        {/* Idle Overlay */}
        {gameState === 'idle' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                backgroundColor: theme === 'dark' ? 'rgba(36, 32, 28, 0.88)' : 'rgba(250, 246, 238, 0.92)',
                border: `1px solid ${theme === 'dark' ? '#4a4137' : '#d5c7b0'}`,
                color: theme === 'dark' ? '#e8dfd1' : '#3d342b',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              按空白鍵或點擊畫面開始跑酷
            </div>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === 'paused' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.18)',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                backgroundColor: theme === 'dark' ? '#24201c' : '#faf6ee',
                border: `1px solid ${theme === 'dark' ? '#4a4137' : '#d5c7b0'}`,
                color: theme === 'dark' ? '#e8dfd1' : '#3d342b',
                fontSize: '0.84rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              PAUSED · 點擊或按空白鍵繼續
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
            }}
          >
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.95rem',
                fontWeight: 800,
                letterSpacing: '0.18em',
                color: theme === 'dark' ? '#e8dfd1' : '#3d342b',
              }}
            >
              GAME OVER
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerJump();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: `1px solid ${theme === 'dark' ? '#574c40' : '#cbbba0'}`,
                backgroundColor: theme === 'dark' ? '#2f2923' : '#f2eadc',
                color: theme === 'dark' ? '#e8dfd1' : '#3d342b',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} />
              <span>再玩一次</span>
            </button>
          </div>
        )}
      </div>

      {/* Touch / Mouse Quick Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
          gap: '8px',
          fontSize: '0.75rem',
          color: theme === 'dark' ? '#a69888' : '#7a6c5d',
        }}
      >
        <span>提示：輸入帳號密碼時不會觸發跳躍，可安心登入</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onPointerDown={() => {
              if (simRef.current.status === 'playing') {
                simRef.current.isDucking = true;
              }
            }}
            onPointerUp={() => {
              simRef.current.isDucking = false;
            }}
            onPointerLeave={() => {
              simRef.current.isDucking = false;
            }}
            style={{
              padding: '3px 10px',
              borderRadius: '6px',
              border: `1px solid ${theme === 'dark' ? '#3d362f' : '#dfd4c1'}`,
              backgroundColor: 'transparent',
              color: theme === 'dark' ? '#e8dfd1' : '#3d342b',
              fontSize: '0.74rem',
              cursor: 'pointer',
            }}
          >
            長按蹲下
          </button>
          <button
            type="button"
            onClick={triggerJump}
            style={{
              padding: '3px 10px',
              borderRadius: '6px',
              border: `1px solid ${theme === 'dark' ? '#3d362f' : '#dfd4c1'}`,
              backgroundColor: theme === 'dark' ? '#2f2923' : '#f2eadc',
              color: theme === 'dark' ? '#e8dfd1' : '#3d342b',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            跳躍
          </button>
        </div>
      </div>
    </div>
  );
}
