import { useEffect, useRef, useState, useCallback } from 'react';
import { FastForward, Volume2, VolumeX, Play } from 'lucide-react';

interface RollerShutterIntroProps {
  onComplete: () => void;
}

const FADE_OUT_MS = 750;
const SKIP_FADE_MS = 320;

export default function RollerShutterIntro({ onComplete }: RollerShutterIntroProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const fadingRef = useRef(false);
  const userMutedRef = useRef(false);
  const fadeTimerRef = useRef<number | null>(null);
  const failsafeTimerRef = useRef<number | null>(null);

  const [fadingOut, setFadingOut] = useState(false);
  const [fadeDurationMs, setFadeDurationMs] = useState(FADE_OUT_MS);
  const [isMuted, setIsMuted] = useState(false);
  const [needsTapToEnter, setNeedsTapToEnter] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const needsTapRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (failsafeTimerRef.current !== null) {
      window.clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }
  }, []);

  const finalizeIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearTimers();
    onComplete();
  }, [clearTimers, onComplete]);

  const startFadeOut = useCallback(
    (duration = FADE_OUT_MS) => {
      if (fadingRef.current || completedRef.current) return;
      fadingRef.current = true;
      setFadeDurationMs(duration);
      setFadingOut(true);

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

  const armPlaybackFailsafe = useCallback(() => {
    if (failsafeTimerRef.current !== null) {
      window.clearTimeout(failsafeTimerRef.current);
    }
    failsafeTimerRef.current = window.setTimeout(() => {
      startFadeOut(FADE_OUT_MS);
    }, 11500);
  }, [startFadeOut]);

  const attemptUnmutedPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || completedRef.current || fadingRef.current || userMutedRef.current) return;

    video.defaultMuted = false;
    video.muted = false;
    video.volume = 1;

    try {
      await video.play();
      if (!completedRef.current) {
        setIsMuted(false);
        needsTapRef.current = false;
        setNeedsTapToEnter(false);
        setHasStarted(true);
        armPlaybackFailsafe();
      }
    } catch (err: any) {
      if (completedRef.current) return;
      if (err?.name === 'NotAllowedError') {
        // Mobile / cold-load autoplay policy blocked unmuted playback:
        // show the minimalist white gate with a dark "點擊進入 POBI STUDIO" button
        // so tapping starts the full unmuted intro cleanly from 0s.
        try {
          video.pause();
          video.currentTime = 0;
        } catch {}
        needsTapRef.current = true;
        setNeedsTapToEnter(true);
        setHasStarted(false);
      }
    }
  }, [armPlaybackFailsafe]);

  const handleEnterWithSound = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const video = videoRef.current;
      if (!video || fadingRef.current || completedRef.current) return;

      userMutedRef.current = false;
      needsTapRef.current = false;
      setNeedsTapToEnter(false);
      setIsMuted(false);

      try {
        video.currentTime = 0;
        video.defaultMuted = false;
        video.muted = false;
        video.volume = 1;
        const playPromise = video.play();
        setHasStarted(true);
        armPlaybackFailsafe();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            if (!completedRef.current) {
              startFadeOut(SKIP_FADE_MS);
            }
          });
        }
      } catch {
        startFadeOut(SKIP_FADE_MS);
      }
    },
    [armPlaybackFailsafe, startFadeOut]
  );

  const handleToggleAudio = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const video = videoRef.current;
      if (!video) return;

      if (needsTapToEnter) {
        handleEnterWithSound();
        return;
      }

      if (isMuted) {
        userMutedRef.current = false;
        video.muted = false;
        video.volume = 1;
        setIsMuted(false);
      } else {
        userMutedRef.current = true;
        video.muted = true;
        setIsMuted(true);
      }
    },
    [handleEnterWithSound, isMuted, needsTapToEnter]
  );

  useEffect(() => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finalizeIntro();
        return;
      }
    } catch {}

    attemptUnmutedPlay();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        startFadeOut(SKIP_FADE_MS);
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && needsTapRef.current) {
        e.preventDefault();
        handleEnterWithSound();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimers();
    };
  }, [attemptUnmutedPlay, clearTimers, finalizeIntro, handleEnterWithSound, startFadeOut]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || fadingRef.current || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }
    if (video.duration - video.currentTime <= 0.7) {
      startFadeOut(FADE_OUT_MS);
    }
  };

  return (
    <div
      data-testid="roller-shutter-intro"
      aria-label="POBI STUDIO 開場動畫"
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
      {/* Centered Pure-White Seamless Square Video Stage (Cropped Edges) */}
      <div
        style={{
          position: 'relative',
          width: 'min(86vw, 76dvh, 620px)',
          aspectRatio: '1 / 1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          opacity: needsTapToEnter ? 0 : 1,
          transition: 'opacity 0.25s ease',
        }}
      >
        <video
          ref={videoRef}
          src="/pobi-intro.mp4"
          autoPlay
          playsInline
          preload="auto"
          onCanPlay={() => {
            const video = videoRef.current;
            if (video && video.paused && !fadingRef.current && !needsTapToEnter && !hasStarted) {
              attemptUnmutedPlay();
            }
          }}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => startFadeOut(FADE_OUT_MS)}
          onError={() => startFadeOut(SKIP_FADE_MS)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            backgroundColor: '#FFFFFF',
            mixBlendMode: 'multiply',
            clipPath: 'inset(2%)',
          }}
        />
      </div>

      {/* Minimalist Pure-White Entry Gate with Dark Button (when browser blocks unmuted autoplay) */}
      {needsTapToEnter && !fadingOut && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10,
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <button
            type="button"
            onClick={handleEnterWithSound}
            data-testid="intro-enter-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '15px 30px',
              borderRadius: '999px',
              backgroundColor: '#111827',
              color: '#FFFFFF',
              border: '1px solid #111827',
              fontSize: '0.96rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              boxShadow: '0 10px 28px rgba(17, 24, 39, 0.16)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease',
            }}
          >
            <Play className="w-4 h-4" style={{ color: '#FFFFFF', fill: '#FFFFFF' }} aria-hidden="true" />
            <span>點擊進入 POBI STUDIO</span>
          </button>
        </div>
      )}

      {/* Top-Right Controls: Audio Toggle (while playing) & Skip */}
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
        {!needsTapToEnter && (
          <button
            type="button"
            onClick={handleToggleAudio}
            aria-label={isMuted ? '開啟音效' : '靜音'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.94)',
              color: '#111827',
              border: '1px solid #D1D5DB',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)',
            }}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5" style={{ color: '#111827' }} aria-hidden="true" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" style={{ color: '#15803D' }} aria-hidden="true" />
            )}
            <span style={{ color: '#111827' }}>{isMuted ? '已靜音' : '音效開'}</span>
          </button>
        )}

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
            color: '#111827',
            border: '1px solid #D1D5DB',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.03em',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)',
          }}
        >
          <span style={{ color: '#111827' }}>略過開場</span>
          <FastForward className="w-3.5 h-3.5" style={{ color: '#111827' }} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
