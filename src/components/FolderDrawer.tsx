import React, { useRef, useState } from 'react';
import { ImagePlus, Music, Trash2, Upload, X } from 'lucide-react';
import type { MemoryDay } from '../types/memory';

interface FolderDrawerProps {
  day: MemoryDay;
  onClose: () => void;
  onBindPhotos: (files: FileList, replaceIndex?: number) => Promise<void>;
  onUpdateDayMeta: (updates: { rawText?: string; title?: string; bpm?: number; mode?: 'major' | 'minor' }) => void;
  onDeleteDay: (id: string) => void;
}

export const FolderDrawer: React.FC<FolderDrawerProps> = ({
  day,
  onClose,
  onBindPhotos,
  onUpdateDayMeta,
  onDeleteDay,
}) => {
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const singleInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceIdx, setReplaceIdx] = useState<number | undefined>(undefined);
  const [draftText, setDraftText] = useState(day.rawText);
  const [draftTitle, setDraftTitle] = useState(day.title);
  const [draftBpm, setDraftBpm] = useState(day.music.bpm);
  const [draftMode, setDraftMode] = useState<'major' | 'minor'>(day.music.mode);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleBulkFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUpdating(true);
    try {
      await onBindPhotos(e.target.files);
    } finally {
      setIsUpdating(false);
      e.target.value = '';
    }
  };

  const handleSingleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || replaceIdx === undefined) return;
    setIsUpdating(true);
    try {
      await onBindPhotos(e.target.files, replaceIdx);
    } finally {
      setIsUpdating(false);
      setReplaceIdx(undefined);
      e.target.value = '';
    }
  };

  const handleSaveMeta = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDayMeta({
      title: draftTitle.trim() || day.title,
      rawText: draftText.trim() || day.rawText,
      bpm: Number(draftBpm) || day.music.bpm,
      mode: draftMode,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/75"
      onClick={onClose}
    >
      <aside
        className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-[#F2EFE9]/15 bg-[#161412] p-6 text-[#F2EFE9] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#F2EFE9]/10 pb-4">
          <div>
            <p className="font-tabular text-[11px] tracking-[0.14em] text-[#F2EFE9]/55 uppercase">
              Folder Contents · {day.dateLabel}
            </p>
            <h2 id="folder-drawer-title" className="font-editorial mt-1 text-2xl text-[#F2EFE9]">
              {day.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Folder Contents"
            className="rounded-sm p-2 text-[#F2EFE9]/70 hover:bg-[#F2EFE9]/10 hover:text-[#F2EFE9] cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* 1-Click Upload / Bind Real Photos */}
        <section className="mt-6 border border-[#F2EFE9]/15 bg-[#1E1B18] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-[#F2EFE9]">Real Photos ({day.photos.length}/5)</h3>
              <p className="mt-0.5 text-xs text-[#F2EFE9]/60">
                Drop your own photos to re-extract Canvas pixels &amp; atmospheric gradient live.
              </p>
            </div>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => bulkInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-sm bg-[#F2EFE9] px-3.5 py-2 text-xs font-medium text-[#121110] hover:bg-[#E5DFD3] disabled:opacity-50 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isUpdating ? 'Developing…' : 'Upload/Bind Real Photos'}</span>
            </button>
          </div>
          <input
            ref={bulkInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleBulkFiles}
          />
          <input
            ref={singleInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSingleFile}
          />

          <div className="mt-4 space-y-2.5">
            {day.photos.map((photo, idx) => (
              <div
                key={photo.id}
                className="flex items-center justify-between gap-3 border border-[#F2EFE9]/10 bg-[#151311] p-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={photo.src}
                    alt={photo.caption}
                    referrerPolicy="no-referrer"
                    className="h-12 w-16 shrink-0 object-cover bg-black"
                  />
                  <div className="min-w-0">
                    <p className="font-tabular text-xs text-[#F2EFE9] truncate">
                      {String(idx + 1).padStart(2, '0')} — {photo.caption}
                    </p>
                    <p className="font-tabular text-[11px] text-[#F2EFE9]/50 truncate">
                      {photo.preferredDemoPath ?? photo.timestampLabel}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReplaceIdx(idx);
                    singleInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1.5 border border-[#F2EFE9]/20 px-2.5 py-1.5 text-[11px] text-[#F2EFE9]/80 hover:bg-[#F2EFE9]/10 cursor-pointer shrink-0"
                >
                  <ImagePlus className="h-3 w-3" aria-hidden="true" />
                  <span>Replace</span>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Editable Raw Text & Music */}
        <form onSubmit={handleSaveMeta} className="mt-6 space-y-4">
          <div>
            <label htmlFor="folder-edit-title" className="block font-tabular text-[11px] uppercase tracking-wider text-[#F2EFE9]/60">
              Folder Title
            </label>
            <input
              id="folder-edit-title"
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="mt-1.5 w-full border border-[#F2EFE9]/15 bg-[#121110] px-3 py-2 text-sm text-[#F2EFE9] focus:border-[#D97736] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="folder-edit-text" className="block font-tabular text-[11px] uppercase tracking-wider text-[#F2EFE9]/60">
              Raw Diary Note
            </label>
            <textarea
              id="folder-edit-text"
              rows={4}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="mt-1.5 w-full border border-[#F2EFE9]/15 bg-[#121110] px-3 py-2 text-sm leading-relaxed text-[#F2EFE9] focus:border-[#D97736] focus:outline-none"
            />
          </div>

          <div className="border-t border-[#F2EFE9]/10 pt-4">
            <div className="flex items-center gap-2 text-xs text-[#F2EFE9]/80">
              <Music className="h-3.5 w-3.5 text-[#D97736]" aria-hidden="true" />
              <span className="font-medium truncate">{day.music.title}</span>
            </div>
            {day.music.sourceUrl && (
              <p className="mt-1 font-tabular text-[11px] text-[#F2EFE9]/50 truncate">
                Source: {day.music.sourceUrl}
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="folder-edit-bpm" className="block font-tabular text-[11px] text-[#F2EFE9]/60">
                  Tempo (BPM)
                </label>
                <input
                  id="folder-edit-bpm"
                  type="number"
                  min={48}
                  max={180}
                  value={draftBpm}
                  onChange={(e) => setDraftBpm(Number(e.target.value))}
                  className="mt-1 w-full border border-[#F2EFE9]/15 bg-[#121110] px-3 py-1.5 font-tabular text-sm text-[#F2EFE9]"
                />
              </div>
              <div>
                <label htmlFor="folder-edit-mode" className="block font-tabular text-[11px] text-[#F2EFE9]/60">
                  Harmonic Mode
                </label>
                <select
                  id="folder-edit-mode"
                  value={draftMode}
                  onChange={(e) => setDraftMode(e.target.value as 'major' | 'minor')}
                  className="mt-1 w-full border border-[#F2EFE9]/15 bg-[#121110] px-3 py-1.5 font-tabular text-sm text-[#F2EFE9]"
                >
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              className="rounded-sm bg-[#F2EFE9] px-4 py-2 text-xs font-medium text-[#121110] hover:bg-[#E5DFD3] cursor-pointer"
            >
              Re-Develop &amp; Save
            </button>

            <button
              type="button"
              onClick={() => onDeleteDay(day.id)}
              className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Delete Day</span>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
};
