import { useEffect, useRef, useState, useCallback } from 'react';
import { FastForward, Volume2, VolumeX } from 'lucide-react';

interface RollerShutterIntroProps {
  onComplete: () => void;
}

const FADE_OUT_MS = 750;
const SKIP_FADE_MS = 320;

export default function RollerShutterIntro({ onComplete }: RollerShutterIntroProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const fadingRef = useRef(false);
  const fadeTimerRef = useRef<number | null>(null);

  const [fadingOut, setFadingOut] = useState(false);
  const [fadeDurationMs, setFadeDurationMs] = useState(FADE_OUT_MS);
  const [isMuted, setIsMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const finalizeIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    onComplete();
  }, [onComplete]);

  const startFadeOut = useCallback(
    (duration = FADE_OUT_MS) => {
      if (fadingRef.current || completedRef.current) return;
      fadingRef.current = true;
      setFadeDurationMs(duration);
      setFadingOut(true);

      // Gently fade audio volume out if playing unmuted
      const video = videoRef.current;
      if (video && !video.muted && !video.paused) {
        const startVol = video.volume;
        const startTs = performance.now();
        const stepVol = (now: number) => {
          const p = Math.min(1, (now - startTs) / duration);
          try {
            video.volume = Math.max(0, startVol * (1 - p));
          } catch {}
          if (p < 1 && !completedRef.current) {
            requestAnimationFrame(stepVol);
          }
        };
        requestAnimationFrame(stepVol);
      }

      fadeTimerRef.current = window.setTimeout(() => {
        finalizeIntro();
      }, duration);
    },
    [finalizeIntro]
  );

  const tryEnableAudio = useCallback(() => {
    const video = videoRef.current;
    if (!video || fadingRef.current) return;
    try {
      video.muted = false;
      video.volume = 1;
      setIsMuted(false);
      setAudioBlocked(false);
      if (video.paused) {
        video.play().catch(() => {});
      }
    } catch {}
  }, []);

  const handleToggleAudio = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const video = videoRef.current;
      if (!video) return;

      if (audioBlocked || isMuted) {
        tryEnableAudio();
      } else {
        video.muted = true;
        setIsMuted(true);
      }
    },
    [audioBlocked, isMuted, tryEnableAudio]
  );

  useEffect(() => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finalizeIntro();
        return;
      }
    } catch {}

    const video = videoRef.current;
    let cancelled = false;

    const startPlayback = async () => {
      if (!video || cancelled) return;
      // Default to unmuted audio ON
      video.muted = false;
      video.volume = 1;
      try {
        await video.play();
        if (!cancelled) {
          setIsMuted(false);
          setAudioBlocked(false);
        }
      } catch {
        // Browser autoplay policy blocked unmuted playback on cold load:
        // start muted immediately so visuals never stall, and unmute on first gesture.
        if (cancelled) return;
        try {
          video.muted = true;
          setIsMuted(true);
          setAudioBlocked(true);
          await video.play();
        } catch {
          // If playback itself is unsupported/blocked, smoothly fade into LandingPage
          if (!cancelled) {
            startFadeOut(SKIP_FADE_MS);
          }
        }
      }
    };

    startPlayback();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        startFadeOut(SKIP_FADE_MS);
        return;
      }
      if (video && video.muted) {
        tryEnableAudio();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    // Safety failsafe so intro never blocks LandingPage indefinitely
    const failsafeTimer = window.setTimeout(() => {
      startFadeOut(FADE_OUT_MS);
    }, 11500);

    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(failsafeTimer);
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
    };
  }, [finalizeIntro, startFadeOut, tryEnableAudio]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || fadingRef.current || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }
    // Begin smooth fade-out during the final 0.7s hold so transition to LandingPage feels seamless
    if (video.duration - video.currentTime <= 0.7) {
      startFadeOut(FADE_OUT_MS);
    }
  };

  return (
    <div
      data-testid="roller-shutter-intro"
      aria-label="POBI STUDIO 開場動畫"
      onClick={() => {
        if (audioBlocked) {
          tryEnableAudio();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: fadingOut ? 0 : 1,
        transition: `opacity ${fadeDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        pointerEvents: fadingOut ? 'none' : 'auto',
        userSelect: 'none',
      }}
    >
      {/* Centered Pure-White Seamless Video Stage */}
      <div
        style={{
          position: 'relative',
          width: 'min(94vw, 960px)',
          maxHeight: '82dvh',
          aspectRatio: '16 / 9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
        }}
      >
        <video
          ref={videoRef}
          src="/pobi-intro.mp4"
          playsInline
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => startFadeOut(FADE_OUT_MS)}
          onError={() => startFadeOut(SKIP_FADE_MS)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            backgroundColor: '#FFFFFF',
          }}
        />
        {/* Soft pure-white feather edge to blend any compressed video border invisibly into #FFFFFF */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            boxShadow: 'inset 0 0 28px 18px #FFFFFF',
          }}
        />
      </div>

      {/* Top-Right Controls: Audio Toggle & Skip */}
      <div
        style={{
          position: 'fixed',
          top: 'max(18px, env(safe-area-inset-top, 18px))',
          right: 'clamp(16px, 3vw, 32px)',
          zIndex: 12,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          opacity: fadingOut ? 0 : 1,
          transition: 'opacity 0.25s ease',
        }}
      >
        <button
          type="button"
          onClick={handleToggleAudio}
          aria-label={audioBlocked ? '點擊開啟音效' : isMuted ? '開啟音效' : '靜音'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '999px',
            backgroundColor: audioBlocked ? '#FEF3C7' : 'rgba(255, 255, 255, 0.94)',
            color: '#0A296B',
            border: audioBlocked ? '1.5px solid #D97706' : '1px solid #CBD5E1',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.03em',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.08)',
          }}
        >
          {isMuted || audioBlocked ? (
            <VolumeX className="w-3.5 h-3.5" style={{ color: '#0A296B' }} aria-hidden="true" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" style={{ color: '#15803D' }} aria-hidden="true" />
          )}
          <span style={{ color: '#0A296B' }}>
            {audioBlocked ? '點擊開啟音效' : isMuted ? '已靜音' : '音效開'}
          </span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            startFadeOut(SKIP_FADE_MS);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '999px',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            color: '#0A296B',
            border: '1px solid #CBD5E1',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.03em',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.08)',
          }}
        >
          <span style={{ color: '#0A296B' }}>略過開場</span>
          <FastForward className="w-3.5 h-3.5" style={{ color: '#0A296B' }} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
