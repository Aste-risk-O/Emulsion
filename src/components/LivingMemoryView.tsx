import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FolderOpen,
  Info,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { MemoryDay } from '../types/memory';
import { getMemoryCountHeadline } from '../engine/memorySynthesizer';
import { audioEngine } from '../engine/audioEngine';
import { EmulsionCanvas } from './EmulsionCanvas';
import { PolaroidPrint } from './PolaroidPrint';

interface LivingMemoryViewProps {
  day: MemoryDay;
  onBack: () => void;
  onOpenFolder: () => void;
  onOpenWhyMood: () => void;
}

export const LivingMemoryView: React.FC<LivingMemoryViewProps> = ({
  day,
  onBack,
  onOpenFolder,
  onOpenWhyMood,
}) => {
  const [phase, setPhase] = useState<'paper' | 'blooming' | 'developed'>('paper');
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [spotlightIndex, setSpotlightIndex] = useState<number | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [isVoiceoverPlaying, setIsVoiceoverPlaying] = useState<boolean>(false);
  const [activeCaptionIdx, setActiveCaptionIdx] = useState<number>(0);
  const [isStoryOpen, setIsStoryOpen] = useState<boolean>(false);
  const beatStepRef = useRef<number>(0);

  const revealTimersRef = useRef<number[]>([]);
  const captionTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    for (const id of revealTimersRef.current) {
      window.clearTimeout(id);
    }
    revealTimersRef.current = [];
    if (captionTimerRef.current !== null) {
      window.clearInterval(captionTimerRef.current);
      captionTimerRef.current = null;
    }
  }, []);

  const stopVoiceover = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (captionTimerRef.current !== null) {
      window.clearInterval(captionTimerRef.current);
      captionTimerRef.current = null;
    }
    audioEngine.setDucking(false);
    setIsVoiceoverPlaying(false);
  }, []);

  const runDevelopingSequence = useCallback(
    (startAudio: boolean) => {
      clearTimers();
      setPhase('paper');
      setRevealedCount(0);
      setSpotlightIndex(null);

      if (startAudio) {
        audioEngine.setTempo(day.music.bpm);
        void audioEngine.play(day.music, (step) => {
          beatStepRef.current = step;
        });
        setIsMusicPlaying(true);
      }

      const bloomTimer = window.setTimeout(() => {
        setPhase('blooming');
      }, 450);
      revealTimersRef.current.push(bloomTimer);

      let elapsed = 900;
      day.photos.forEach((photo, idx) => {
        const stepDelay =
          idx === day.photos.length - 1 && day.visual.calmFrameSlowdownMs
            ? day.visual.calmFrameSlowdownMs
            : day.visual.beatStepMs;

        const t = window.setTimeout(() => {
          setRevealedCount(idx + 1);
          setSpotlightIndex(idx);

          if (
            day.visual.ruleId === 'paradox-step-print' &&
            photo.frameTone === 'calm' &&
            day.music.secondaryBpm
          ) {
            audioEngine.setTempo(day.music.secondaryBpm);
          }

          if (idx === day.photos.length - 1) {
            setPhase('developed');
            const settleTimer = window.setTimeout(() => {
              setSpotlightIndex(day.photos.length === 1 ? 0 : null);
            }, 1300);
            revealTimersRef.current.push(settleTimer);
          }
        }, elapsed);
        revealTimersRef.current.push(t);
        elapsed += stepDelay;
      });
    },
    [clearTimers, day]
  );

  // Start developing sequence + audio automatically on entering the memory
  useEffect(() => {
    runDevelopingSequence(true);
    return () => {
      clearTimers();
      stopVoiceover();
      audioEngine.stop();
    };
  }, [day.id, runDevelopingSequence, clearTimers, stopVoiceover]);

  // Keyboard arrow navigation between moments
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') {
        setSpotlightIndex((prev) =>
          prev === null ? 0 : (prev + 1) % Math.max(1, revealedCount)
        );
      } else if (e.key === 'ArrowLeft') {
        setSpotlightIndex((prev) =>
          prev === null
            ? Math.max(0, revealedCount - 1)
            : (prev - 1 + Math.max(1, revealedCount)) % Math.max(1, revealedCount)
        );
      } else if (e.key === 'Escape' && spotlightIndex !== null && day.photos.length > 1) {
        setSpotlightIndex(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [revealedCount, spotlightIndex, day.photos.length]);

  const handleToggleMusic = () => {
    if (isMusicPlaying) {
      audioEngine.stop();
      setIsMusicPlaying(false);
    } else {
      const currentPhoto =
        day.photos[spotlightIndex ?? Math.max(0, revealedCount - 1)];
      const bpm =
        day.visual.ruleId === 'paradox-step-print' &&
        currentPhoto?.frameTone === 'calm' &&
        day.music.secondaryBpm
          ? day.music.secondaryBpm
          : day.music.bpm;
      audioEngine.setTempo(bpm);
      void audioEngine.play(day.music, (step) => {
        beatStepRef.current = step;
      });
      setIsMusicPlaying(true);
    }
  };

  const handleReplay = () => {
    runDevelopingSequence(true);
  };

  const handleStepMoment = (dir: -1 | 1) => {
    if (revealedCount === 0) return;
    setSpotlightIndex((prev) => {
      if (prev === null) return dir === 1 ? 0 : revealedCount - 1;
      const next = (prev + dir + revealedCount) % revealedCount;
      const targetPhoto = day.photos[next];
      if (
        day.visual.ruleId === 'paradox-step-print' &&
        targetPhoto?.frameTone === 'calm' &&
        day.music.secondaryBpm
      ) {
        audioEngine.setTempo(day.music.secondaryBpm);
      } else {
        audioEngine.setTempo(day.music.bpm);
      }
      return next;
    });
  };

  const handleToggleVoiceover = () => {
    if (isVoiceoverPlaying) {
      stopVoiceover();
      return;
    }

    const segments =
      day.textNuance.captionSegments.length > 0
        ? day.textNuance.captionSegments
        : [day.rawText];

    setIsVoiceoverPlaying(true);
    setActiveCaptionIdx(0);
    audioEngine.setDucking(true);

    const stepMs = Math.max(2000, Math.round((day.rawText.length * 65) / segments.length));
    let capIdx = 0;
    captionTimerRef.current = window.setInterval(() => {
      capIdx += 1;
      if (capIdx < segments.length) {
        setActiveCaptionIdx(capIdx);
      }
    }, stepMs);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(day.rawText);
        const targetLang = day.textNuance.language === 'en' ? 'en-US' : 'ru-RU';
        utterance.lang = targetLang;
        utterance.rate = day.textNuance.voiceoverRate;
        utterance.pitch = day.textNuance.voiceoverPitch;

        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find((v) =>
          v.lang.toLowerCase().startsWith(day.textNuance.language === 'en' ? 'en' : 'ru')
        );
        if (matchingVoice) utterance.voice = matchingVoice;

        utterance.onend = () => stopVoiceover();
        utterance.onerror = () => {
          window.setTimeout(() => stopVoiceover(), 2600);
        };
        window.speechSynthesis.speak(utterance);
      } catch {
        window.setTimeout(() => stopVoiceover(), Math.max(3200, segments.length * stepMs));
      }
    } else {
      globalThis.setTimeout(() => stopVoiceover(), Math.max(3200, segments.length * stepMs));
    }
  };

  const isSinglePhoto = day.photos.length === 1;
  const headline = getMemoryCountHeadline(day.photos.length);
  const activeIdx = spotlightIndex ?? Math.max(0, revealedCount - 1);
  const activePhoto = day.photos[activeIdx] ?? day.photos[0];
  const isCalmMoment = activePhoto?.frameTone === 'calm';

  const activeBpm =
    day.visual.ruleId === 'paradox-step-print' && isCalmMoment && day.music.secondaryBpm
      ? day.music.secondaryBpm
      : day.music.bpm;

  const activeAccent = activePhoto?.accentHex || day.palette.accentHex;
  const activeHighlight = activePhoto?.highlightHex || day.palette.highlightHex;

  const captionLines = useMemo(() => {
    return day.textNuance.captionSegments.length > 0
      ? day.textNuance.captionSegments
      : [day.rawText];
  }, [day.textNuance.captionSegments, day.rawText]);

  const [stop1, stop2, stop3] = day.visual.gradientStops;
  const isLightPaper = day.visual.inkPolarity === 'dark';

  const controlSurfaceClass = isLightPaper
    ? 'border-[#161513]/15 bg-[#F4F1EA]/88 text-[#161513] hover:bg-[#F4F1EA]'
    : 'border-[#F4F1EA]/20 bg-[#141312]/80 text-[#F4F1EA] hover:bg-[#1E1C1A]';

  return (
    <div
      data-testid="living-memory-view"
      data-phase={phase}
      data-revealed={revealedCount}
      className="relative min-h-screen w-full overflow-x-hidden transition-colors duration-1000"
      style={{
        backgroundColor: phase === 'paper' ? (isLightPaper ? '#EFECE4' : '#131210') : stop1,
        color: day.visual.textColor,
      }}
    >
      {/* Layer 1: Base Multi-Stop Real Pixel Gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 transition-opacity duration-[1500ms]"
        style={{
          opacity: phase === 'paper' ? 0 : 1,
          background: `radial-gradient(circle at 20% 25%, ${stop2} 0%, transparent 58%), radial-gradient(circle at 82% 75%, ${stop3} 0%, transparent 62%), linear-gradient(155deg, ${stop1} 0%, ${stop2} 54%, ${stop3} 100%)`,
        }}
      />

      {/* Layer 2: Adaptive Contrast Scrim ensuring >= 4.5:1 text legibility */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 transition-opacity duration-1000"
        style={{
          opacity: phase === 'paper' ? 0.2 : 1,
          background: day.visual.scrimStyle,
        }}
      />

      {/* Layer 3: Subtle 35mm Emulsion Grain */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          opacity: isCalmMoment ? day.visual.grainOpacity * 0.35 : day.visual.grainOpacity * 0.7,
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 0), radial-gradient(rgba(0,0,0,0.18) 1px, transparent 0)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
        }}
      />

      {/* Layer 4: Interactive Optical Effects Canvas (Photo Bleed, Light Leaks, Bokeh, Rays, Audio Filament) */}
      <EmulsionCanvas
        visual={day.visual}
        accentHex={activeAccent}
        highlightHex={activeHighlight}
        activePhotoSrc={activePhoto?.src}
        phase={phase}
        isCalmFrame={isCalmMoment}
        isMusicPlaying={isMusicPlaying}
        beatStepRef={beatStepRef}
      />

      {/* Top Floating Bar */}
      <header className="relative z-30 mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-4 px-6 py-5">
        <button
          type="button"
          onClick={() => {
            stopVoiceover();
            audioEngine.stop();
            onBack();
          }}
          className={`inline-flex items-center gap-2 rounded-sm border px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${controlSurfaceClass}`}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Archive</span>
        </button>

        {/* Center Sequence Indicator */}
        <div
          className="hidden sm:flex items-center gap-3 text-xs font-tabular tracking-[0.14em]"
          style={{ color: day.visual.mutedTextColor }}
        >
          <span>{headline}</span>
          <span aria-hidden="true">·</span>
          <span>{day.dateLabel}</span>
          {spotlightIndex !== null && !isSinglePhoto && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                FRAME {String(spotlightIndex + 1).padStart(2, '0')}/{String(day.photos.length).padStart(2, '0')}
              </span>
            </>
          )}
        </div>

        {/* Right Utility Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenFolder}
            className={`inline-flex items-center gap-2 rounded-sm border px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${controlSurfaceClass}`}
          >
            <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Folder Contents</span>
          </button>

          <button
            type="button"
            onClick={onOpenWhyMood}
            className={`inline-flex items-center gap-2 rounded-sm border px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${controlSurfaceClass}`}
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Why This Mood</span>
          </button>
        </div>
      </header>

      {/* Main Polaroid Developing Stage */}
      <main className="relative z-20 mx-auto flex min-h-[calc(100vh-165px)] max-w-[1380px] flex-col items-center justify-center px-6 pb-32 pt-2">
        {/* Title & Soundtrack Header */}
        <div
          className={`text-center transition-all duration-700 ${
            isStoryOpen ? '-translate-y-4 opacity-90' : 'translate-y-0 opacity-100'
          }`}
        >
          <p
            className="font-tabular text-[11px] tracking-[0.18em] uppercase sm:hidden"
            style={{ color: day.visual.mutedTextColor }}
          >
            {headline}
          </p>
          <h1 className="font-editorial mt-1 text-3xl md:text-5xl font-normal tracking-tight text-balance">
            {day.title}
          </h1>
          <p
            className="mt-2 font-tabular text-xs tracking-wide"
            style={{ color: day.visual.mutedTextColor }}
          >
            {day.music.title} · {activeBpm} BPM · {day.visual.ruleName}
          </p>
        </div>

        {/* Polaroid Sequence Area */}
        <div
          className={`mt-8 md:mt-10 w-full transition-transform duration-700 ease-out ${
            isStoryOpen ? '-translate-y-6 scale-[0.94]' : 'translate-y-0 scale-100'
          }`}
        >
          {isSinglePhoto ? (
            <div className="mx-auto flex justify-center">
              {day.photos.map((photo, idx) => (
                <PolaroidPrint
                  key={photo.id}
                  photo={photo}
                  index={idx}
                  isRevealed={idx < revealedCount}
                  isSpotlighted={true}
                  isAnySpotlighted={false}
                  isMusicPlaying={isMusicPlaying}
                  beatPulse={false}
                  visual={day.visual}
                  fallbackAccent={day.palette.accentHex}
                  size="hero"
                  onClick={() => setSpotlightIndex(0)}
                />
              ))}
            </div>
          ) : (
            <div className="mx-auto flex flex-wrap items-center justify-center gap-6 md:gap-8">
              {day.photos.map((photo, idx) => {
                const isSpotlighted = spotlightIndex === idx;
                return (
                  <div
                    key={photo.id}
                    className={
                      idx % 2 === 1 && !isSpotlighted ? 'lg:translate-y-4 transition-transform duration-700' : 'transition-transform duration-700'
                    }
                  >
                    <PolaroidPrint
                      photo={photo}
                      index={idx}
                      isRevealed={idx < revealedCount}
                      isSpotlighted={isSpotlighted}
                      isAnySpotlighted={spotlightIndex !== null}
                      isMusicPlaying={isMusicPlaying}
                      beatPulse={false}
                      visual={day.visual}
                      fallbackAccent={day.palette.accentHex}
                      size="series"
                      onClick={() => {
                        const nextIdx = isSpotlighted ? null : idx;
                        setSpotlightIndex(nextIdx);
                        if (
                          nextIdx !== null &&
                          day.visual.ruleId === 'paradox-step-print' &&
                          photo.frameTone === 'calm' &&
                          day.music.secondaryBpm
                        ) {
                          audioEngine.setTempo(day.music.secondaryBpm);
                        } else {
                          audioEngine.setTempo(day.music.bpm);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Full Story Letter Panel */}
        {isStoryOpen && (
          <section
            data-testid="full-story-letter"
            aria-label="Full diary note"
            className="mt-9 w-full max-w-2xl border border-[#181715]/12 bg-[#F4F1EA] p-7 md:p-10 text-[#181715] shadow-[0_24px_70px_rgba(0,0,0,0.48)] transition-all duration-500"
          >
            <div className="flex items-baseline justify-between border-b border-[#181715]/12 pb-3 font-tabular text-[11px] uppercase tracking-[0.12em] text-[#181715]/55">
              <span>{day.dateLabel}</span>
              <span>{day.textNuance.nuanceTags.slice(0, 2).join(' · ')}</span>
            </div>
            <blockquote className="font-editorial mt-5 text-2xl md:text-[26px] leading-[1.45] text-[#181715]">
              “{day.rawText}”
            </blockquote>
            {day.textNuance.paradoxReason && (
              <p className="mt-5 border-t border-[#181715]/10 pt-4 text-xs leading-relaxed text-[#181715]/70">
                {day.textNuance.paradoxReason}
              </p>
            )}
          </section>
        )}
      </main>

      {/* Cinema Captions during Voiceover */}
      {isVoiceoverPlaying && (
        <div
          data-testid="voiceover-caption"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-6"
        >
          <p className="max-w-2xl bg-black/82 px-5 py-2.5 text-center font-editorial text-lg md:text-xl italic text-[#F4F1EA] shadow-lg">
            {captionLines[activeCaptionIdx] ?? day.rawText}
          </p>
        </div>
      )}

      {/* Bottom Floating Control Dock */}
      <nav
        aria-label="Living memory controls"
        className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4"
      >
        <div
          className={`flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 rounded-sm border p-1.5 shadow-2xl ${
            isLightPaper
              ? 'border-[#161513]/15 bg-[#F4F1EA]/94 text-[#161513]'
              : 'border-[#F4F1EA]/18 bg-[#141312]/90 text-[#F4F1EA]'
          }`}
        >
          {!isSinglePhoto && (
            <div className="flex items-center border-r border-current/12 pr-1.5 mr-0.5">
              <button
                type="button"
                onClick={() => handleStepMoment(-1)}
                aria-label="Previous moment"
                className="rounded-sm p-2 hover:bg-black/10 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleStepMoment(1)}
                aria-label="Next moment"
                className="rounded-sm p-2 hover:bg-black/10 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleReplay}
            className="inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-medium hover:bg-black/10 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Replay Reveal</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMusic}
            className="inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-medium hover:bg-black/10 cursor-pointer whitespace-nowrap font-tabular"
          >
            {isMusicPlaying ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{isMusicPlaying ? `Pause · ${activeBpm} BPM` : `Play · ${activeBpm} BPM`}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleVoiceover}
            className="inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-medium hover:bg-black/10 cursor-pointer whitespace-nowrap"
          >
            {isVoiceoverPlaying ? (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{isVoiceoverPlaying ? 'Stop Voiceover' : 'Voiceover (Озвучка)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsStoryOpen((prev) => !prev)}
            aria-expanded={isStoryOpen}
            className="inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-medium hover:bg-black/10 cursor-pointer whitespace-nowrap"
          >
            {isStoryOpen ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{isStoryOpen ? 'Hide Story' : 'Full Story'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
