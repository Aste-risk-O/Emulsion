import { useEffect, useState } from 'react';
import type { MemoryDay } from './types/memory';
import {
  loadStoredMemories,
  resetAllMemoriesToSeed,
  saveStoredMemories,
} from './data/seedData';
import { TopBar, type ArchiveFilter } from './components/TopBar';
import { ArchiveView } from './components/ArchiveView';
import { LivingMemoryView } from './components/LivingMemoryView';
import { FolderDrawer } from './components/FolderDrawer';
import { WhyThisMoodModal } from './components/WhyThisMoodModal';
import { NewDayModal } from './components/NewDayModal';
import { recomputeMemoryWithNewPhotos } from './engine/createMemoryService';
import { extractPaletteFromImages } from './engine/pixelExtractor';
import { analyzeTextNuance } from './engine/textAnalyzer';
import {
  buildCouplingExplanation,
  chooseNewDayVisualMode,
  synthesizeVisualDirective,
} from './engine/memorySynthesizer';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [memories, setMemories] = useState<MemoryDay[]>(() => loadStoredMemories());
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ArchiveFilter>('all');
  const [isNewDayOpen, setIsNewDayOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [isWhyMoodOpen, setIsWhyMoodOpen] = useState(false);

  const activeDay = memories.find((m) => m.id === activeDayId) ?? null;

  // Hydrate real Canvas pixel extraction on preloaded days once their images are available
  useEffect(() => {
    let cancelled = false;
    const hydratePixels = async () => {
      const updated = await Promise.all(
        memories.map(async (day) => {
          if (day.palette.source === 'canvas-pixels') return day;
          try {
            const { palette, perPhoto } = await extractPaletteFromImages(day.photos.map((p) => p.src));
            const visual = synthesizeVisualDirective(palette, day.textNuance, day.music, day.visual.ruleId);
            return {
              ...day,
              palette,
              visual,
              photos: day.photos.map((p, idx) => ({
                ...p,
                luminance: perPhoto[idx]?.luminance ?? p.luminance,
                dominantHex: perPhoto[idx]?.dominantHex ?? p.dominantHex,
                accentHex: perPhoto[idx]?.accentHex ?? p.accentHex,
                highlightHex: perPhoto[idx]?.highlightHex ?? p.highlightHex,
                orientation: perPhoto[idx]?.orientation ?? p.orientation,
              })),
            };
          } catch {
            return day;
          }
        })
      );
      if (!cancelled) {
        setMemories(updated);
        saveStoredMemories(updated);
      }
    };
    void hydratePixels();
    return () => {
      cancelled = true;
    };
    // Run once on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateMemories = (next: MemoryDay[]) => {
    setMemories(next);
    saveStoredMemories(next);
  };

  const handleCreatedDay = (newDay: MemoryDay) => {
    const next = [newDay, ...memories];
    updateMemories(next);
    setIsNewDayOpen(false);
    setActiveDayId(newDay.id);
  };

  const handleBindPhotos = async (files: FileList, replaceIndex?: number) => {
    if (!activeDay) return;
    const urls = await Promise.all(Array.from(files).slice(0, 5).map(fileToDataUrl));

    let nextPhotos;
    if (replaceIndex !== undefined && urls[0]) {
      nextPhotos = activeDay.photos.map((p, idx) =>
        idx === replaceIndex
          ? {
              ...p,
              src: urls[0],
              preferredDemoPath: files[0]?.name ?? p.preferredDemoPath,
              fallbackPlateId: undefined,
            }
          : p
      );
    } else {
      nextPhotos = urls.map((src, idx) => ({
        id: `bound-${Date.now()}-${idx}`,
        src,
        preferredDemoPath: files[idx]?.name,
        caption: activeDay.photos[idx]?.caption,
        timestampLabel: activeDay.photos[idx]?.timestampLabel,
      }));
    }

    const recomputed = await recomputeMemoryWithNewPhotos(activeDay, nextPhotos);
    const nextList = memories.map((m) => (m.id === activeDay.id ? recomputed : m));
    updateMemories(nextList);
  };

  const handleUpdateDayMeta = (updates: {
    rawText?: string;
    title?: string;
    bpm?: number;
    mode?: 'major' | 'minor';
  }) => {
    if (!activeDay) return;
    const nextText = updates.rawText ?? activeDay.rawText;
    const nextBpm = updates.bpm ?? activeDay.music.bpm;
    const nextMode = updates.mode ?? activeDay.music.mode;
    const nextMusic = {
      ...activeDay.music,
      bpm: nextBpm,
      mode: nextMode,
      energy: activeDay.music.analyzedFromAudioFile
        ? activeDay.music.energy
        : Math.min(0.95, Math.max(0.18, Number((((nextBpm - 48) / 132) * 0.65 + (nextMode === 'minor' ? 0.2 : 0.12)).toFixed(2)))),
    };
    const nextNuance = analyzeTextNuance(nextText);
    const nextRule = activeDay.isPreloaded
      ? activeDay.visual.ruleId
      : chooseNewDayVisualMode(activeDay.palette, nextNuance, nextMusic, nextText);
    const nextVisual = synthesizeVisualDirective(
      activeDay.palette,
      nextNuance,
      nextMusic,
      nextRule
    );

    const updatedDay: MemoryDay = {
      ...activeDay,
      title: updates.title ?? activeDay.title,
      rawText: nextText,
      music: nextMusic,
      textNuance: nextNuance,
      visual: nextVisual,
      couplingExplanation: activeDay.isPreloaded
        ? activeDay.couplingExplanation
        : buildCouplingExplanation(activeDay.palette, nextNuance, nextMusic, nextVisual),
    };
    updateMemories(memories.map((m) => (m.id === activeDay.id ? updatedDay : m)));
  };

  const handleDeleteDay = (id: string) => {
    const next = memories.filter((m) => m.id !== id);
    updateMemories(next);
    setIsFolderOpen(false);
    setActiveDayId(null);
  };

  const handleResetArchive = () => {
    const fresh = resetAllMemoriesToSeed();
    setMemories(fresh);
    setActiveDayId(null);
  };

  return (
    <div className="min-h-screen bg-[#121110] text-[#F2EFE9]">
      {!activeDay ? (
        <>
          <TopBar
            activeFilter={filter}
            onFilterChange={setFilter}
            onNewDay={() => setIsNewDayOpen(true)}
            onLogoClick={() => setFilter('all')}
          />
          <ArchiveView
            memories={memories}
            filter={filter}
            onFilterChange={setFilter}
            onSelectDay={(day) => {
              setActiveDayId(day.id);
              setIsFolderOpen(false);
              setIsWhyMoodOpen(false);
            }}
            onNewDay={() => setIsNewDayOpen(true)}
            onResetArchive={handleResetArchive}
          />
        </>
      ) : (
        <>
          <LivingMemoryView
            day={activeDay}
            onBack={() => {
              setActiveDayId(null);
              setIsFolderOpen(false);
              setIsWhyMoodOpen(false);
            }}
            onOpenFolder={() => setIsFolderOpen(true)}
            onOpenWhyMood={() => setIsWhyMoodOpen(true)}
          />

          {isFolderOpen && (
            <FolderDrawer
              day={activeDay}
              onClose={() => setIsFolderOpen(false)}
              onBindPhotos={handleBindPhotos}
              onUpdateDayMeta={handleUpdateDayMeta}
              onDeleteDay={handleDeleteDay}
            />
          )}

          {isWhyMoodOpen && (
            <WhyThisMoodModal day={activeDay} onClose={() => setIsWhyMoodOpen(false)} />
          )}
        </>
      )}

      {isNewDayOpen && (
        <NewDayModal
          onClose={() => setIsNewDayOpen(false)}
          onCreated={handleCreatedDay}
        />
      )}
    </div>
  );
}
