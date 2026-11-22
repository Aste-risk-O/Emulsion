import React, { useMemo, useRef, useState } from 'react';
import { ImagePlus, Music, Sparkles, Upload, X } from 'lucide-react';
import type { ExtractedPalette, MemoryDay } from '../types/memory';
import { extractPaletteFromImages } from '../engine/pixelExtractor';
import { analyzeTextNuance } from '../engine/textAnalyzer';
import { audioEngine } from '../engine/audioEngine';
import { createMemoryDay, inferMotifFromGenre } from '../engine/createMemoryService';
import { createSampleUploadFile } from '../utils/demoPlates';

interface NewDayModalProps {
  onClose: () => void;
  onCreated: (day: MemoryDay) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export const NewDayModal: React.FC<NewDayModalProps> = ({ onClose, onCreated }) => {
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const [rawText, setRawText] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [photoSrcs, setPhotoSrcs] = useState<string[]>([]);
  const [livePalette, setLivePalette] = useState<ExtractedPalette | null>(null);

  const [musicTitle, setMusicTitle] = useState('Late Night Synth Keys');
  const [musicUrl, setMusicUrl] = useState('');
  const [genre, setGenre] = useState('Ambient Keys');
  const [bpm, setBpm] = useState(86);
  const [mode, setMode] = useState<'major' | 'minor'>('minor');
  const [energy, setEnergy] = useState(0.5);
  const [audioDataUrl, setAudioDataUrl] = useState<string | undefined>(undefined);
  const [analyzedFromAudioFile, setAnalyzedFromAudioFile] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isDeveloping, setIsDeveloping] = useState(false);

  const liveNuance = useMemo(() => {
    if (!rawText.trim()) return null;
    return analyzeTextNuance(rawText);
  }, [rawText]);

  const handlePhotoFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, 5 - photoSrcs.length);
    if (list.length === 0) return;

    const urls = await Promise.all(list.map(readFileAsDataUrl));
    const next = [...photoSrcs, ...urls].slice(0, 5);
    setPhotoSrcs(next);
    setError(null);

    const { palette } = await extractPaletteFromImages(next);
    setLivePalette(palette);
  };

  const handleLoadSamplePhotos = async (variant: 'dusk' | 'midnight' | 'clouds') => {
    const file = await createSampleUploadFile(variant);
    await handlePhotoFiles([file]);
  };

  const handleRemovePhoto = async (index: number) => {
    const next = photoSrcs.filter((_, i) => i !== index);
    setPhotoSrcs(next);
    if (next.length > 0) {
      const { palette } = await extractPaletteFromImages(next);
      setLivePalette(palette);
    } else {
      setLivePalette(null);
    }
  };

  const handleAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const [dataUrl, analyzed] = await Promise.all([
        readFileAsDataUrl(file),
        audioEngine.analyzeAudioFile(file),
      ]);
      setAudioDataUrl(dataUrl);
      setMusicTitle(file.name.replace(/\.[^.]+$/, ''));
      setBpm(analyzed.bpm);
      setEnergy(analyzed.energy);
      setAnalyzedFromAudioFile(true);
    } catch {
      setError('Could not decode audio file. Try MP3/WAV or enter track details.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setError('Write a few honest words in Russian or English about this day.');
      return;
    }
    if (photoSrcs.length === 0) {
      setError('Add 1 to 5 photos so EMULSION can extract real colors from your frame.');
      return;
    }

    setError(null);
    setIsDeveloping(true);
    try {
      const motif = inferMotifFromGenre(genre, mode, bpm);
      const day = await createMemoryDay({
        rawText,
        customTitle: customTitle.trim() || undefined,
        dateLabel: dateLabel.trim() || undefined,
        photoSrcs,
        music: {
          title: musicTitle.trim() || 'Untitled Soundtrack',
          sourceUrl: musicUrl.trim() || undefined,
          audioDataUrl,
          genre: genre.trim() || 'Ambient',
          bpm: Math.max(48, Math.min(180, Number(bpm) || 86)),
          mode,
          energy,
          motif,
          analyzedFromAudioFile,
        },
      });
      onCreated(day);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to develop memory.');
      setIsDeveloping(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-day-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-[#F2EFE9]/15 bg-[#161412] p-6 md:p-8 text-[#F2EFE9] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#F2EFE9]/10 pb-4">
          <div>
            <p className="font-tabular text-[11px] tracking-[0.14em] text-[#F2EFE9]/55 uppercase">
              Darkroom Intake · 3 Real Signals
            </p>
            <h2 id="new-day-title" className="font-editorial mt-1 text-2xl md:text-3xl text-[#F2EFE9]">
              Develop a New Day
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close New Day dialog"
            className="rounded-sm p-2 text-[#F2EFE9]/70 hover:bg-[#F2EFE9]/10 hover:text-[#F2EFE9] cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Step 1: Photos (1-5) + Live Canvas Palette */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="font-tabular text-xs uppercase tracking-wider text-[#F2EFE9]/75">
                1. Photos ({photoSrcs.length}/5)
              </label>
              <div className="flex items-center gap-3 text-[11px] text-[#F2EFE9]/55">
                <button
                  type="button"
                  onClick={() => handleLoadSamplePhotos('dusk')}
                  className="underline hover:text-[#F2EFE9] cursor-pointer"
                >
                  + Sample Dusk
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSamplePhotos('midnight')}
                  className="underline hover:text-[#F2EFE9] cursor-pointer"
                >
                  + Sample Night
                </button>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              {photoSrcs.map((src, idx) => (
                <div key={idx} className="relative h-20 w-24 border border-[#F2EFE9]/15 bg-black">
                  <img
                    src={src}
                    alt={`Uploaded frame ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    aria-label={`Remove photo ${idx + 1}`}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#121110] text-[#F2EFE9] border border-[#F2EFE9]/25 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {photoSrcs.length < 5 && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex h-20 w-28 flex-col items-center justify-center gap-1.5 border border-dashed border-[#F2EFE9]/25 bg-[#1C1A17] text-xs text-[#F2EFE9]/75 hover:border-[#F2EFE9]/50 hover:text-[#F2EFE9] cursor-pointer"
                >
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  <span>Add Photos</span>
                </button>
              )}
            </div>

            <input
              ref={photoInputRef}
              data-testid="new-day-photo-input"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void handlePhotoFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {livePalette && (
              <div className="mt-3 flex items-center gap-3 border border-[#F2EFE9]/10 bg-[#1C1A17] p-2.5">
                <span className="font-tabular text-[11px] text-[#F2EFE9]/60">Canvas pixels:</span>
                <div className="flex items-center gap-1.5">
                  {livePalette.swatches.map((sw, i) => (
                    <span
                      key={i}
                      title={`${sw.label} (${sw.hex})`}
                      className="h-4 w-6 border border-white/15"
                      style={{ backgroundColor: sw.hex }}
                    />
                  ))}
                </div>
                <span className="font-tabular text-[11px] text-[#F2EFE9]/50 ml-auto">
                  Lum {Math.round(livePalette.averageLuminance * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Step 2: Raw Diary Note */}
          <div>
            <label htmlFor="new-day-note" className="block font-tabular text-xs uppercase tracking-wider text-[#F2EFE9]/75">
              2. Raw Diary Note (Russian or English)
            </label>
            <textarea
              id="new-day-note"
              rows={3}
              required
              placeholder="Напр.: Шёл домой после смены под дождём, а в наушниках играл Шопен..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="mt-2 w-full border border-[#F2EFE9]/18 bg-[#121110] px-3.5 py-2.5 text-sm leading-relaxed text-[#F2EFE9] placeholder:text-[#F2EFE9]/35 focus:border-[#D97736] focus:outline-none"
            />
            {liveNuance && (
              <p className="mt-1.5 font-tabular text-[11px] text-[#F2EFE9]/60">
                Detected: {liveNuance.language.toUpperCase()} · {liveNuance.nuanceTags.join(' · ')}
              </p>
            )}
          </div>

          {/* Optional Title & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-day-custom-title" className="block font-tabular text-[11px] uppercase tracking-wider text-[#F2EFE9]/60">
                Folder Title (optional — auto-generated if empty)
              </label>
              <input
                id="new-day-custom-title"
                type="text"
                placeholder="Leave blank to synthesize"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="mt-1.5 w-full border border-[#F2EFE9]/15 bg-[#121110] px-3 py-2 text-sm text-[#F2EFE9] placeholder:text-[#F2EFE9]/30 focus:border-[#D97736] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="new-day-date" className="block font-tabular text-[11px] uppercase tracking-wider text-[#F2EFE9]/60">
                Date Stamp (optional)
              </label>
              <input
                id="new-day-date"
                type="text"
                placeholder="e.g. November 2026"
                value={dateLabel}
                onChange={(e) => setDateLabel(e.target.value)}
                className="mt-1.5 w-full border border-[#F2EFE9]/15 bg-[#121110] px-3 py-2 text-sm text-[#F2EFE9] placeholder:text-[#F2EFE9]/30 focus:border-[#D97736] focus:outline-none"
              />
            </div>
          </div>

          {/* Step 3: Music Influence */}
          <div className="border-t border-[#F2EFE9]/10 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-tabular text-xs uppercase tracking-wider text-[#F2EFE9]/75">
                3. Soundtrack (Audio File or Track Link / Details)
              </span>
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 border border-[#F2EFE9]/20 px-2.5 py-1 text-[11px] text-[#F2EFE9]/80 hover:bg-[#F2EFE9]/10 cursor-pointer"
              >
                <Upload className="h-3 w-3" aria-hidden="true" />
                <span>Analyze Audio File (Web Audio)</span>
              </button>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioFile}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="new-day-track" className="block font-tabular text-[11px] text-[#F2EFE9]/60">
                  Track Title / Artist
                </label>
                <input
                  id="new-day-track"
                  type="text"
                  value={musicTitle}
                  onChange={(e) => setMusicTitle(e.target.value)}
                  className="mt-1 w-full border border-[#F2EFE9]/15 bg-[#121110] px-3 py-1.5 text-sm text-[#F2EFE9]"
                />
              </div>
              <div>
                <label htmlFor="new-day-link" className="block font-tabular text-[11px] text-[#F2EFE9]/60">
                  Spotify / Yandex / YouTube Link (optional)
                </label>
                <input
                  id="new-day-link"
                  type="url"
                  placeholder="https://..."
                  value={musicUrl}
                  onChange={(e) => setMusicUrl(e.target.value)}
                  className="mt-1 w-full border border-[#F2EFE9]/15 bg-[#121110] px-3 py-1.5 text-sm text-[#F2EFE9]"
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="new-day-genre" className="block font-tabular text-[11px] text-[#F2EFE9]/60">
                  Genre / Texture
                </label>
                <select
                  id="new-day-genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="mt-1 w-full border border-[#F2EFE9]/15 bg-[#121110] px-2.5 py-1.5 text-sm text-[#F2EFE9]"
                >
                  <option value="Ambient Keys">Ambient Minimal</option>
                  <option value="Lo-Fi Keys">Lo-Fi Keys</option>
                  <option value="Baroque Strings">Baroque / Classical Strings</option>
                  <option value="Acoustic Breeze">Acoustic / Folk</option>
                  <option value="Electronic Drift">Electronic / Synth</option>
                </select>
              </div>
              <div>
                <label htmlFor="new-day-bpm" className="block font-tabular text-[11px] text-[#F2EFE9]/60">
                  BPM
                </label>
                <input
                  id="new-day-bpm"
                  type="number"
                  min={48}
                  max={180}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="mt-1 w-full border border-[#F2EFE9]/15 bg-[#121110] px-3 py-1.5 font-tabular text-sm text-[#F2EFE9]"
                />
              </div>
              <div>
                <label htmlFor="new-day-mode" className="block font-tabular text-[11px] text-[#F2EFE9]/60">
                  Key Mode
                </label>
                <select
                  id="new-day-mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'major' | 'minor')}
                  className="mt-1 w-full border border-[#F2EFE9]/15 bg-[#121110] px-2.5 py-1.5 text-sm text-[#F2EFE9]"
                >
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                </select>
              </div>
            </div>

            {analyzedFromAudioFile && (
              <p className="mt-2 inline-flex items-center gap-1.5 font-tabular text-[11px] text-[#E5B692]">
                <Music className="h-3 w-3" aria-hidden="true" />
                <span>Analyzed via Web Audio API: {bpm} BPM · Energy {Math.round(energy * 100)}%</span>
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="border border-red-400/35 bg-red-950/40 px-3.5 py-2 text-xs text-red-200">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-[#F2EFE9]/10 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#F2EFE9]/70 hover:text-[#F2EFE9] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeveloping}
              className="inline-flex items-center gap-2 rounded-sm bg-[#F2EFE9] px-5 py-2.5 text-xs font-medium text-[#121110] hover:bg-[#E5DFD3] disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isDeveloping ? 'Developing Film…' : 'Develop Memory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
