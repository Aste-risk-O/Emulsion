import React, { useState } from 'react';
import { Disc3, RotateCcw, Trash2 } from 'lucide-react';
import type { MemoryDay } from '../types/memory';
import type { ArchiveFilter } from './TopBar';
import { audioEngine } from '../engine/audioEngine';

interface ArchiveViewProps {
  memories: MemoryDay[];
  filter: ArchiveFilter;
  onFilterChange: (filter: ArchiveFilter) => void;
  onSelectDay: (day: MemoryDay) => void;
  onDeleteDay: (id: string) => void;
  onNewDay: () => void;
  onResetArchive: () => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  memories,
  filter,
  onFilterChange,
  onSelectDay,
  onDeleteDay,
  onNewDay,
  onResetArchive,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = memories.filter((m) => {
    if (filter === 'series') return m.photos.length >= 2;
    if (filter === 'single') return m.photos.length === 1;
    return true;
  });

  const hoveredDay = memories.find((m) => m.id === hoveredId) ?? null;

  return (
    <main className="relative min-h-[calc(100vh-65px)] overflow-hidden bg-[#121110] px-6 py-12 md:py-16">
      {/* Subtle darkroom table ambient glow awakened by hovered folder */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 transition-opacity duration-700"
        style={{
          opacity: hoveredDay ? 0.32 : 0.08,
          background: hoveredDay
            ? `radial-gradient(circle at 50% 42%, ${hoveredDay.palette.accentHex}38 0%, ${hoveredDay.palette.dominantHex}22 38%, transparent 72%)`
            : 'radial-gradient(circle at 50% 35%, rgba(244,241,234,0.06) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1280px]">
        {/* Editorial Header */}
        <section className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-[#F2EFE9]/10 pb-8">
          <div className="max-w-2xl">
            <p className="font-tabular text-xs tracking-[0.14em] text-[#F2EFE9]/55 uppercase">
              Archive of Days
            </p>
            <h1 className="font-editorial mt-3 text-4xl md:text-5xl font-normal tracking-tight text-[#F2EFE9] text-balance">
              Unpolished moments, developed into light and tempo.
            </h1>
            <p className="mt-3 text-sm md:text-base leading-relaxed text-[#F2EFE9]/65 max-w-xl">
              Every Day Folder synthesizes real pixel pigments, raw diary cadence,
              and musical pulse into a living Polaroid sequence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#F2EFE9]/55 font-tabular shrink-0">
            <span>{filtered.length} {filtered.length === 1 ? 'day' : 'days'}</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onResetArchive}
              className="inline-flex items-center gap-1.5 text-[#F2EFE9]/60 hover:text-[#F2EFE9] transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Restore Demo Cases</span>
            </button>
          </div>
        </section>

        {/* Mobile filter row (desktop uses TopBar nav) */}
        <div className="mb-8 flex md:hidden items-center gap-4 overflow-x-auto pb-2 text-xs">
          {(['all', 'series', 'single'] as ArchiveFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFilterChange(f)}
              className={`whitespace-nowrap pb-1 border-b cursor-pointer ${
                filter === f
                  ? 'border-[#D97736] text-[#F2EFE9] font-medium'
                  : 'border-transparent text-[#F2EFE9]/55'
              }`}
            >
              {f === 'all' ? 'All Days' : f === 'series' ? 'Series' : 'One Moment'}
            </button>
          ))}
        </div>

        {/* Day Folder Grid */}
        {filtered.length === 0 ? (
          <div className="my-16 border border-[#F2EFE9]/10 bg-[#181614] p-12 text-center">
            <p className="font-editorial text-2xl text-[#F2EFE9]">No memories in this filter yet.</p>
            <p className="mt-2 text-sm text-[#F2EFE9]/60">
              Switch filters or develop a new day from your photos and notes.
            </p>
            <button
              type="button"
              onClick={onNewDay}
              className="mt-6 rounded-sm bg-[#F2EFE9] px-5 py-2.5 text-xs font-medium text-[#121110] hover:bg-[#E5DFD3] cursor-pointer"
            >
              Develop a New Day
            </button>
          </div>
        ) : (
          <div
            data-testid="archive-grid"
            className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4"
          >
            {filtered.map((day) => {
              const isHovered = hoveredId === day.id;
              const isDimmed = hoveredId !== null && hoveredId !== day.id;
              const isSeries = day.photos.length > 1;
              const coverPhoto =
                day.id === 'case-astana-1510'
                  ? day.photos[0]
                  : day.id === 'case-ioai-chaos'
                    ? day.photos[day.photos.length - 1]
                    : day.photos.find((p) => !p.fallbackPlateId) ?? day.photos[0];

              return (
                <article
                  key={day.id}
                  data-testid={`folder-card-${day.id}`}
                  className={`group relative transition-all duration-300 ${
                    isDimmed ? 'opacity-40 scale-[0.985]' : 'opacity-100'
                  }`}
                  onMouseEnter={() => {
                    setHoveredId(day.id);
                    audioEngine.playHoverMotif(day.music);
                  }}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Ambient color aura on hover */}
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute -inset-4 -z-10 rounded-sm blur-2xl transition-opacity duration-500 ${
                      isHovered ? 'opacity-65' : 'opacity-0'
                    }`}
                    style={{
                      background: `radial-gradient(circle, ${day.palette.accentHex}60 0%, ${day.palette.dominantHex}38 60%, transparent 100%)`,
                    }}
                  />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDay(day.id);
                    }}
                    aria-label={`Delete memory ${day.title}`}
                    title="Delete memory"
                    className="absolute right-3 top-4 z-20 inline-flex items-center gap-1 rounded-sm bg-[#121110]/85 px-2 py-1 text-[11px] font-medium text-[#F2EFE9]/90 backdrop-blur-sm transition-colors duration-150 hover:bg-red-600 hover:text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    <span>Delete</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    aria-label={`Open memory ${day.title}`}
                    className="block w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D97736]"
                  >
                    {/* Polaroid Sleeve Stack */}
                    <div className="relative mx-auto w-full pt-2">
                      {/* Stacked Polaroids peeking underneath for 2–5 photo folders */}
                      {isSeries && (
                        <>
                          <div
                            aria-hidden="true"
                            className="absolute inset-x-2 top-1 bottom-2 rounded-[2px] bg-[#E3DDD1] shadow-md transition-transform duration-300 group-hover:-rotate-3 group-hover:-translate-x-1.5"
                            style={{ transform: 'rotate(-2.2deg)' }}
                          />
                          {day.photos.length >= 3 && (
                            <div
                              aria-hidden="true"
                              className="absolute inset-x-1 top-1.5 bottom-1 rounded-[2px] bg-[#ECE7DC] shadow-md transition-transform duration-300 group-hover:rotate-3 group-hover:translate-x-1.5"
                              style={{ transform: 'rotate(1.8deg)' }}
                            />
                          )}
                        </>
                      )}

                      {/* Primary Polaroid Sleeve */}
                      <div className="relative rounded-[2px] bg-[#F4F1EA] p-3.5 pb-6 shadow-[0_14px_34px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:-translate-y-1.5">
                        {/* Image Well */}
                        <div
                          className="relative aspect-[4/3] w-full overflow-hidden bg-[#1D1B18]"
                          style={{
                            boxShadow: 'inset 0 0 0 1px rgba(24,23,21,0.08)',
                          }}
                        >
                          {coverPhoto ? (
                            <img
                              src={coverPhoto.src}
                              alt={day.title}
                              referrerPolicy="no-referrer"
                              className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] ${
                                coverPhoto.orientation === 'portrait' ? 'object-[50%_45%]' : 'object-center'
                              }`}
                            />
                          ) : (
                            <div
                              className="flex h-full w-full items-center justify-center p-4 text-center"
                              style={{ backgroundColor: day.palette.dominantHex }}
                            >
                              <span className="font-editorial text-sm text-[#F4F1EA]/80">{day.title}</span>
                            </div>
                          )}

                          {/* Subtle real-pixel color strip at very bottom of image frame */}
                          <div className="absolute inset-x-0 bottom-0 flex h-1">
                            {day.palette.swatches.slice(0, 4).map((sw, idx) => (
                              <span
                                key={`${day.id}-sw-${idx}`}
                                className="flex-1"
                                style={{ backgroundColor: sw.hex }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Sleeve Handwritten / Editorial Label Area */}
                        <div className="mt-4 flex items-baseline justify-between gap-2">
                          <span className="font-tabular text-[11px] tracking-[0.06em] text-[#181715]/60 uppercase">
                            {day.dateLabel}
                          </span>
                          <span className="font-tabular text-[11px] text-[#181715]/55">
                            {day.photos.length === 1 ? '1 print' : `${day.photos.length} prints`}
                          </span>
                        </div>

                        <h2 className="font-editorial mt-1.5 text-[21px] leading-[1.22] text-[#181715] line-clamp-2 min-h-[52px]">
                          {day.title}
                        </h2>

                        {/* Clean unboxed mood & music metadata */}
                        <div className="mt-3 flex items-center gap-1.5 border-t border-[#181715]/10 pt-2.5 text-[11px] text-[#181715]/68 font-tabular">
                          <Disc3
                            className={`h-3 w-3 shrink-0 ${isHovered ? 'animate-spin' : ''}`}
                            style={{ animationDuration: '4s' }}
                            aria-hidden="true"
                          />
                          <span className="shrink-0 whitespace-nowrap">{day.music.bpm} BPM</span>
                          <span aria-hidden="true" className="shrink-0">·</span>
                          <span className="truncate">{day.visual.ruleName}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};
