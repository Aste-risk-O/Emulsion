import React from 'react';
import { X } from 'lucide-react';
import type { MemoryDay } from '../types/memory';

interface WhyThisMoodModalProps {
  day: MemoryDay;
  onClose: () => void;
}

export const WhyThisMoodModal: React.FC<WhyThisMoodModalProps> = ({ day, onClose }) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="why-mood-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-[#F2EFE9]/15 bg-[#171513] p-6 text-[#F2EFE9] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#F2EFE9]/10 pb-4">
          <div>
            <p className="font-tabular text-[11px] tracking-[0.14em] text-[#F2EFE9]/55 uppercase">
              Multi-Signal Synthesis Breakdown
            </p>
            <h2 id="why-mood-title" className="font-editorial mt-1 text-2xl text-[#F2EFE9]">
              Why This Mood
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Why This Mood breakdown"
            className="rounded-sm p-2 text-[#F2EFE9]/70 hover:bg-[#F2EFE9]/10 hover:text-[#F2EFE9] cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Signal 1: Real Pixel Extraction */}
          <section>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-medium tracking-[0.1em] text-[#F2EFE9]/60 uppercase font-tabular">
                01. Real Pixel Extraction (HTML5 Canvas)
              </h3>
              <span className="font-tabular text-xs text-[#F2EFE9]/55">
                Luminance {Math.round(day.palette.averageLuminance * 100)}% · Spread {Math.round(day.palette.contrastSpread * 100)}%
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
              {day.palette.swatches.map((swatch, idx) => (
                <div
                  key={`${swatch.hex}-${idx}`}
                  className="border border-[#F2EFE9]/10 bg-[#1E1C19] p-2.5"
                >
                  <div
                    className="h-12 w-full border border-white/10"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  <p className="font-tabular mt-2 text-xs text-[#F2EFE9]">{swatch.hex}</p>
                  <p className="mt-0.5 text-[11px] text-[#F2EFE9]/60 leading-tight">{swatch.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Signal 2: Real Text Nuance */}
          <section className="border-t border-[#F2EFE9]/10 pt-5">
            <h3 className="text-xs font-medium tracking-[0.1em] text-[#F2EFE9]/60 uppercase font-tabular">
              02. Text Nuance & Paradox Detection
            </h3>
            <p className="font-editorial mt-2 text-lg italic text-[#F2EFE9]/90">
              “{day.rawText}”
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#F2EFE9]/75 font-tabular">
              <span>Language: {day.textNuance.language.toUpperCase()}</span>
              <span aria-hidden="true">·</span>
              <span>Time: {day.textNuance.timeOfDay}</span>
              <span aria-hidden="true">·</span>
              <span>Movement: {day.textNuance.stillnessVsMovement}</span>
              <span aria-hidden="true">·</span>
              <span>Pace: {Math.round(day.textNuance.pace * 100)}%</span>
            </div>
            {day.textNuance.paradoxDetected && day.textNuance.paradoxReason && (
              <p className="mt-2.5 text-sm text-[#E5B692]">
                Detected contrast: {day.textNuance.paradoxReason}
              </p>
            )}
            <p className="mt-2 text-xs text-[#F2EFE9]/60 font-tabular">
              Nuances: {day.textNuance.nuanceTags.join(' · ')}
            </p>
          </section>

          {/* Signal 3: Music Influence */}
          <section className="border-t border-[#F2EFE9]/10 pt-5">
            <h3 className="text-xs font-medium tracking-[0.1em] text-[#F2EFE9]/60 uppercase font-tabular">
              03. Music Tempo, Key & Energy
            </h3>
            <p className="mt-2 text-sm text-[#F2EFE9] font-medium">{day.music.title}</p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#F2EFE9]/70 font-tabular">
              <span>{day.music.bpm} BPM{day.music.secondaryBpm ? ` -> ${day.music.secondaryBpm} BPM` : ''}</span>
              <span aria-hidden="true">·</span>
              <span>Mode: {day.music.mode}</span>
              <span aria-hidden="true">·</span>
              <span>Energy: {Math.round(day.music.energy * 100)}%</span>
              <span aria-hidden="true">·</span>
              <span>Motif: {day.music.motif}</span>
            </div>
          </section>

          {/* Resulting Visual & Typography Rule */}
          <section className="border-t border-[#F2EFE9]/10 pt-5">
            <h3 className="text-xs font-medium tracking-[0.1em] text-[#F2EFE9]/60 uppercase font-tabular">
              Resulting Visual & Typography Directive
            </h3>
            <p className="font-editorial mt-2 text-xl text-[#F2EFE9]">{day.visual.ruleName}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#F2EFE9]/75">
              {day.visual.ruleDescription}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#F2EFE9]/65 font-tabular">
              <span>Typography: {day.visual.typographyStyle}</span>
              <span aria-hidden="true">·</span>
              <span>Reveal step: {day.visual.beatStepMs}ms</span>
              <span aria-hidden="true">·</span>
              <span>Ink: {day.visual.inkPolarity}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
