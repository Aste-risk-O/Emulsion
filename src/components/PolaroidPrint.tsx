import React, { useEffect, useState } from 'react';
import type { MemoryPhoto, VisualDirective } from '../types/memory';

interface PolaroidPrintProps {
  photo: MemoryPhoto;
  index: number;
  isRevealed: boolean;
  isSpotlighted: boolean;
  isAnySpotlighted: boolean;
  isMusicPlaying: boolean;
  beatPulse: boolean;
  visual: VisualDirective;
  fallbackAccent: string;
  size?: 'hero' | 'series';
  onClick: () => void;
}

export const PolaroidPrint: React.FC<PolaroidPrintProps> = ({
  photo,
  index,
  isRevealed,
  isSpotlighted,
  isAnySpotlighted,
  isMusicPlaying,
  beatPulse,
  visual,
  fallbackAccent,
  size = 'series',
  onClick,
}) => {
  const [tilt, setTilt] = useState<{ rx: number; ry: number; gx: number; gy: number }>({
    rx: 0,
    ry: 0,
    gx: 50,
    gy: 35,
  });
  const [flashBurst, setFlashBurst] = useState(false);
  const [devSweep, setDevSweep] = useState(false);

  // Trigger chemical developing sweep + optional flash pop on reveal
  useEffect(() => {
    if (!isRevealed) {
      setFlashBurst(false);
      setDevSweep(false);
      return;
    }
    setDevSweep(true);
    const sweepTimer = window.setTimeout(() => setDevSweep(false), 1200);

    let flashTimer = 0;
    if (visual.flashContrast) {
      setFlashBurst(true);
      flashTimer = window.setTimeout(() => setFlashBurst(false), 420);
    }
    return () => {
      window.clearTimeout(sweepTimer);
      if (flashTimer) window.clearTimeout(flashTimer);
    };
  }, [isRevealed, visual.flashContrast]);

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / Math.max(1, rect.width);
    const py = (e.clientY - rect.top) / Math.max(1, rect.height);
    setTilt({
      rx: (0.5 - py) * 10,
      ry: (px - 0.5) * 12,
      gx: px * 100,
      gy: py * 100,
    });
  };

  const handlePointerLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 35 });
  };

  const num = String(index + 1).padStart(2, '0');
  const isPortrait = photo.orientation === 'portrait';
  const accent = photo.accentHex || fallbackAccent;
  const dom = photo.dominantHex || accent;

  const isKineticPulse =
    visual.motionBlurOnKinetic &&
    photo.frameTone === 'kinetic' &&
    isMusicPlaying &&
    beatPulse;

  const isBaroqueBeat =
    visual.ruleId === 'nocturnal-flash-baroque' &&
    isSpotlighted &&
    isMusicPlaying &&
    beatPulse;

  const baseRotate = isSpotlighted ? 0 : photo.tiltDeg;
  const scale = !isRevealed
    ? 0.92
    : isSpotlighted
      ? isBaroqueBeat
        ? 1.07
        : 1.05
      : isAnySpotlighted
        ? 0.93
        : 1;

  const widthClass =
    size === 'hero'
      ? isPortrait
        ? 'w-full max-w-[330px] md:max-w-[360px]'
        : 'w-full max-w-[460px]'
      : isPortrait
        ? 'w-[225px] sm:w-[235px]'
        : 'w-[255px] sm:w-[270px]';

  const aspectClass = isPortrait ? 'aspect-[3/4]' : 'aspect-[4/3]';

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      aria-label={`Moment ${num}: ${photo.caption}`}
      style={{
        transform: isRevealed
          ? `perspective(950px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) rotate(${baseRotate}deg) scale(${scale})`
          : `perspective(950px) rotate(${photo.tiltDeg * 1.5}deg) translateY(28px) scale(0.9)`,
      }}
      className={`group relative shrink-0 text-left transition-all duration-700 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D97736] ${widthClass} ${
        isSpotlighted ? 'z-30' : 'z-10'
      } ${
        !isRevealed
          ? 'opacity-0 pointer-events-none'
          : isAnySpotlighted && !isSpotlighted
            ? 'opacity-70 hover:opacity-95'
            : 'opacity-100'
      }`}
    >
      <div className={size === 'hero' && isRevealed ? 'animate-breathe' : ''}>
        {/* Backlit Chromatic Halo derived from this frame's real pixels */}
        {isRevealed && (isSpotlighted || photo.frameTone === 'calm' || size === 'hero') && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-14 -z-10 transition-all duration-700"
            style={{
              opacity: isSpotlighted || photo.frameTone === 'calm' ? 0.72 : 0.45,
              background: `radial-gradient(ellipse at 50% 48%, ${accent}80 0%, ${dom}36 36%, transparent 64%)`,
            }}
          />
        )}

        {/* Instant-Film Cream Matte Frame */}
        <div
          className={`relative overflow-hidden rounded-[2px] bg-[#F4F1EA] p-3 pb-5 transition-shadow duration-500 ${
            isSpotlighted
              ? 'shadow-[0_28px_72px_rgba(0,0,0,0.68)] ring-1 ring-white/50'
            : visual.flashContrast
              ? 'shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/30'
              : 'shadow-[0_18px_46px_rgba(0,0,0,0.42)]'
        }`}
        style={{
          backgroundImage:
            'linear-gradient(145deg, rgba(255,255,255,0.55) 0%, rgba(244,241,234,0.92) 55%, rgba(230,224,211,0.96) 100%)',
        }}
      >
        {/* Image Well */}
        <div className={`relative w-full overflow-hidden bg-[#181614] ${aspectClass}`}>
          <img
            src={photo.src}
            alt={photo.caption}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-[filter,transform] duration-[1300ms] ease-out"
            style={{
              filter: !isRevealed
                ? 'brightness(1.45) contrast(0.55) sepia(0.45) saturate(0.15) blur(3px)'
                : devSweep
                  ? 'brightness(1.16) contrast(0.86) sepia(0.14) saturate(0.88)'
                  : visual.flashContrast
                    ? 'contrast(1.08) brightness(1.03) saturate(1.06)'
                    : isKineticPulse
                      ? 'contrast(1.06) brightness(1.02) blur(0.4px)'
                      : 'contrast(1.03) saturate(1.04)',
              transform: isKineticPulse ? 'scale(1.02)' : 'scale(1)',
            }}
          />

          {/* Chemical Developer Sweep Wave */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-transform duration-[1150ms] ease-out"
            style={{
              background:
                'linear-gradient(115deg, transparent 20%, rgba(244,241,234,0.48) 50%, transparent 80%)',
              transform: devSweep ? 'translateX(120%)' : 'translateX(-120%)',
            }}
          />

          {/* Glossy Specular Glass Sheen following cursor */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.04) 38%, transparent 68%)`,
            }}
          />

          {/* Camera Flash Pop Overlay (Nocturnal Flash rule) */}
          {flashBurst && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-white/75 transition-opacity duration-300"
            />
          )}

          {/* Subtle Warm Vignette */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 shadow-[inset_0_0_24px_rgba(0,0,0,0.22)]"
          />
        </div>

        {/* Handwritten / Editorial Ink Caption Area */}
        <div className="mt-3 text-[#181715]">
          <p className="font-editorial text-[16px] leading-snug min-h-[42px]">
            {num} — {photo.caption}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2 font-tabular text-[10px] tracking-wider text-[#181715]/55">
            <span>{photo.timestampLabel}</span>
            <span
              className="inline-block h-1.5 w-5 rounded-[1px]"
              style={{ backgroundColor: accent }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
      </div>
    </button>
  );
};
