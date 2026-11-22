import type { ExtractedPalette, MemoryDay, MusicSpec } from '../types/memory';
import { analyzeTextNuance } from '../engine/textAnalyzer';
import { buildMemoryPhotosFromRaw, synthesizeVisualDirective } from '../engine/memorySynthesizer';
import { renderDemoPlateDataUrl } from '../utils/demoPlates';

const STORAGE_KEY = 'emulsion_memories_v2';

function buildCuratedCaseStudies(): MemoryDay[] {
  // 1. Ночная Астана, 1510 и Вивальди (3 real uploaded frames)
  const satText = 'Я ходил радостный, гулял по ночной астане, придуривался, музыку слушал';
  const satNuance = analyzeTextNuance(satText);
  const satMusic: MusicSpec = {
    title: 'Antonio Vivaldi — Strings and Continuo in G Minor',
    artist: 'Antonio Vivaldi',
    sourceUrl: 'https://music.yandex.ru/search?text=Vivaldi%20Strings%20and%20Continuo%20in%20G%20Minor',
    genre: 'Baroque Strings',
    bpm: 132,
    mode: 'minor',
    energy: 0.86,
    motif: 'baroque-strings',
  };
  const satPalette: ExtractedPalette = {
    swatches: [
      { hex: '#2845B8', role: 'dominant', label: 'SAT Report Cobalt', weight: 0.34 },
      { hex: '#0D0E14', role: 'shadow', label: 'Midnight Bus & Street', weight: 0.28 },
      { hex: '#F3D13A', role: 'accent', label: 'Yandex Player Gold', weight: 0.18 },
      { hex: '#F5F6FA', role: 'highlight', label: 'Flash & Score Card', weight: 0.12 },
      { hex: '#C67B2C', role: 'sky', label: 'Amber Bottle Warmth', weight: 0.08 },
    ],
    dominantHex: '#2845B8',
    shadowHex: '#0D0E14',
    highlightHex: '#F5F6FA',
    accentHex: '#F3D13A',
    averageLuminance: 0.32,
    contrastSpread: 0.88,
    source: 'seeded-pixels',
  };
  const satVisual = synthesizeVisualDirective(
    satPalette,
    satNuance,
    satMusic,
    'nocturnal-flash-baroque'
  );
  const satPhotos = buildMemoryPhotosFromRaw(
    [
      {
        id: 'sat-1',
        src: '/assets/aistudio/photo_2026-11-22_19-01-36__2__2b7337c9.jpg',
        preferredDemoPath: '/assets/aistudio/photo_2026-11-22_19-01-36__2__2b7337c9.jpg',
        caption: 'дурачился по ночной Астане',
        timestampLabel: '23:18 · STREET',
        orientation: 'portrait',
        dominantHex: '#8E5824',
        accentHex: '#D98A3C',
        highlightHex: '#E8D5BD',
      },
      {
        id: 'sat-2',
        src: '/assets/aistudio/photo_2026-11-22_19-01-36_d31b682c.jpg',
        preferredDemoPath: '/assets/aistudio/photo_2026-11-22_19-01-36_d31b682c.jpg',
        caption: '1510 на экране · можно выдохнуть',
        timestampLabel: '17:52 · SAT',
        orientation: 'portrait',
        dominantHex: '#2845B8',
        accentHex: '#3B63E6',
        highlightHex: '#FFFFFF',
      },
      {
        id: 'sat-3',
        src: '/assets/aistudio/photo_2026-11-22_19-01-57_a8934c5f.jpg',
        preferredDemoPath: '/assets/aistudio/photo_2026-11-22_19-01-57_a8934c5f.jpg',
        caption: 'Вивальди в AirPods без слов',
        timestampLabel: '15:47 · YANDEX MUSIC',
        orientation: 'portrait',
        dominantHex: '#3A3832',
        accentHex: '#F3E130',
        highlightHex: '#F4E5CE',
      },
    ],
    satText,
    satNuance,
    'nocturnal-flash-baroque'
  );

  // 2. Хаос Олимпиады и миг тишины (4 real uploaded frames — 3 chaos + 1 calm dusk breath)
  const ioaiText = 'безумие, день в котором находишь миги спокойствия чудом.';
  const ioaiNuance = analyzeTextNuance(ioaiText);
  ioaiNuance.paradoxDetected = true;
  ioaiNuance.paradoxReason =
    'Контраст между шумом и вспышками олимпиадных залов и внезапной тишиной розового заката на дороге';
  const ioaiMusic: MusicSpec = {
    title: 'Ambient Minimal / Dynamic Pulse',
    genre: 'Ambient Minimal',
    bpm: 118,
    secondaryBpm: 66,
    mode: 'minor',
    energy: 0.72,
    motif: 'ambient-pulse',
  };
  const ioaiPalette: ExtractedPalette = {
    swatches: [
      { hex: '#4D9596', role: 'dominant', label: 'IOAI Astana Teal', weight: 0.34 },
      { hex: '#141B22', role: 'shadow', label: 'Atrium Shadow', weight: 0.24 },
      { hex: '#E8B8A6', role: 'highlight', label: 'Campus Dusk Sky', weight: 0.18 },
      { hex: '#2B87C4', role: 'sky', label: 'Arena Bleachers Blue', weight: 0.12 },
      { hex: '#DF7A66', role: 'accent', label: 'Quiet Brick & Sunset', weight: 0.12 },
    ],
    dominantHex: '#4D9596',
    shadowHex: '#141B22',
    highlightHex: '#E8B8A6',
    accentHex: '#DF7A66',
    averageLuminance: 0.38,
    contrastSpread: 0.78,
    source: 'seeded-pixels',
  };
  const ioaiVisual = synthesizeVisualDirective(ioaiPalette, ioaiNuance, ioaiMusic, 'paradox-step-print');
  const ioaiPhotos = buildMemoryPhotosFromRaw(
    [
      {
        id: 'ioai-1',
        src: '/assets/aistudio/photo_2026-11-22_19-03-03__4__31560c87.jpg',
        preferredDemoPath: '/assets/aistudio/photo_2026-11-22_19-03-03__4__31560c87.jpg',
        caption: 'флаги, делегации и суета олимпиады',
        timestampLabel: '11:20 · IOAI ASTANA',
        orientation: 'landscape',
        dominantHex: '#8FB7B5',
        accentHex: '#239E5C',
        highlightHex: '#E7F0EE',
      },
      {
        id: 'ioai-2',
        src: '/assets/aistudio/photo_2026-11-22_19-03-03__3__b6607f24.jpg',
        preferredDemoPath: '/assets/aistudio/photo_2026-11-22_19-03-03__3__b6607f24.jpg',
        caption: 'гул большого холла и сотни шагов',
        timestampLabel: '14:45 · ATRIUM',
        orientation: 'landscape',
        dominantHex: '#284548',
        accentHex: '#1DB38E',
        highlightHex: '#E2E4E6',
      },
      {
        id: 'ioai-3',
        src: '/assets/aistudio/photo_2026-11-22_19-03-03_f8663061.jpg',
        preferredDemoPath: '/assets/aistudio/photo_2026-11-22_19-03-03_f8663061.jpg',
        caption: 'минута на трибуне сквозь блик',
        timestampLabel: '17:10 · ARENA',
        orientation: 'portrait',
        dominantHex: '#2B87C4',
        accentHex: '#5BB6EC',
        highlightHex: '#F9F6EE',
      },
      {
        id: 'ioai-4',
        src: '/assets/aistudio/photo_2026-11-22_19-03-02_74d81ad4.jpg',
        preferredDemoPath: '/assets/aistudio/photo_2026-11-22_19-03-02_74d81ad4.jpg',
        caption: 'чудом найденный миг тишины',
        timestampLabel: '19:48 · DUSK ROAD',
        orientation: 'portrait',
        dominantHex: '#C57D6D',
        accentHex: '#E7A38F',
        highlightHex: '#F3DDD2',
      },
    ],
    ioaiText,
    ioaiNuance,
    'paradox-step-print'
  );

  // 3. Привычный двор в необычном свете (2 real uploaded frames)
  const morningText = 'Насколько привычный вид настолько же необычный в своей конфигурации';
  const morningNuance = analyzeTextNuance(morningText);
  morningNuance.timeOfDay = 'dawn';
  morningNuance.paradoxDetected = true;
  morningNuance.paradoxReason =
    'Обычный двор панельных домов в неожиданной кораллово-сумеречной геометрии';
  const morningMusic: MusicSpec = {
    title: 'Lo-Fi Morning Keys',
    genre: 'Lo-Fi Keys',
    bpm: 76,
    mode: 'major',
    energy: 0.42,
    motif: 'lofi-keys',
  };
  const morningPalette: ExtractedPalette = {
    swatches: [
      { hex: '#EA7A58', role: 'dominant', label: 'Coral Sky Bands', weight: 0.38 },
      { hex: '#1F2A3E', role: 'shadow', label: 'Tower Silhouette', weight: 0.24 },
      { hex: '#FFB536', role: 'highlight', label: 'Molten Horizon', weight: 0.16 },
      { hex: '#4B6B9B', role: 'sky', label: 'Upper Twilight', weight: 0.12 },
      { hex: '#FF6B42', role: 'accent', label: 'Sunrise Flame', weight: 0.1 },
    ],
    dominantHex: '#EA7A58',
    shadowHex: '#1F2A3E',
    highlightHex: '#FFB536',
    accentHex: '#FF6B42',
    averageLuminance: 0.4,
    contrastSpread: 0.74,
    source: 'seeded-pixels',
  };
  const morningVisual = synthesizeVisualDirective(
    morningPalette,
    morningNuance,
    morningMusic,
    'architectural-halation'
  );
  const morningPhotos = buildMemoryPhotosFromRaw(
    [
      {
        id: 'morning-1',
        src: '/assets/aistudio/photo_2026-11-22_19-00-59_8885d051.jpg',
        preferredDemoPath: '/assets/aistudio/photo_2026-11-22_19-00-59_8885d051.jpg',
        caption: 'огненные полосы за домами',
        timestampLabel: '07:14 · HORIZON',
        orientation: 'landscape',
        dominantHex: '#EA7A58',
        accentHex: '#FFB536',
        highlightHex: '#FFD59E',
      },
      {
        id: 'morning-2',
        src: '/assets/aistudio/photo_2026-11-22_19-01-00_3dff6cb4.jpg',
        preferredDemoPath: '/assets/aistudio/photo_2026-11-22_19-01-00_3dff6cb4.jpg',
        caption: 'привычный двор под синим куполом',
        timestampLabel: '07:16 · COURTYARD',
        orientation: 'landscape',
        dominantHex: '#4B6B9B',
        accentHex: '#F27C5B',
        highlightHex: '#F9C49A',
      },
    ],
    morningText,
    morningNuance,
    'architectural-halation'
  );

  // 4. Просто красивый облачный день (1 real uploaded frame)
  const dayText = 'Просто красивый, облачный день';
  const dayNuance = analyzeTextNuance(dayText);
  dayNuance.timeOfDay = 'day';
  const dayMusic: MusicSpec = {
    title: 'Warm Acoustic Breeze',
    genre: 'Acoustic Breeze',
    bpm: 68,
    mode: 'major',
    energy: 0.24,
    motif: 'acoustic-breeze',
  };
  const dayPalette: ExtractedPalette = {
    swatches: [
      { hex: '#6393C9', role: 'dominant', label: 'Clear Summer Azure', weight: 0.38 },
      { hex: '#F6E8CC', role: 'highlight', label: 'Golden Cumulus Rim', weight: 0.28 },
      { hex: '#2D3A29', role: 'shadow', label: 'Courtyard Trees', weight: 0.14 },
      { hex: '#86ADD9', role: 'sky', label: 'Upper Sky', weight: 0.12 },
      { hex: '#F5C478', role: 'accent', label: 'Warm Cloud Light', weight: 0.08 },
    ],
    dominantHex: '#6393C9',
    shadowHex: '#2D3A29',
    highlightHex: '#F6E8CC',
    accentHex: '#F5C478',
    averageLuminance: 0.64,
    contrastSpread: 0.56,
    source: 'seeded-pixels',
  };
  const dayVisual = synthesizeVisualDirective(dayPalette, dayNuance, dayMusic, 'sunlit-paper-air');
  const dayPhotos = buildMemoryPhotosFromRaw(
    [
      {
        id: 'day-1',
        src: '/assets/aistudio/photo_2026-11-22_19-04-01_27aad61d.jpg',
        preferredDemoPath: '/assets/aistudio/photo_2026-11-22_19-04-01_27aad61d.jpg',
        caption: 'просто красивый, облачный день',
        timestampLabel: '18:30 · SKY',
        orientation: 'portrait',
        dominantHex: '#6393C9',
        accentHex: '#F5C478',
        highlightHex: '#FBF2DC',
      },
    ],
    dayText,
    dayNuance,
    'sunlit-paper-air'
  );

  return [
    {
      id: 'case-astana-1510',
      title: 'Ночная Астана, 1510 и Вивальди',
      dateLabel: 'August 22, 2026',
      createdAt: '2026-08-22T23:50:00Z',
      isPreloaded: true,
      rawText: satText,
      photos: satPhotos,
      music: satMusic,
      palette: satPalette,
      textNuance: satNuance,
      visual: satVisual,
      analysisSource: 'curated-case-study',
    },
    {
      id: 'case-ioai-chaos',
      title: 'Хаос Олимпиады и миг тишины',
      dateLabel: 'August 2026',
      createdAt: '2026-08-06T19:48:00Z',
      isPreloaded: true,
      rawText: ioaiText,
      photos: ioaiPhotos,
      music: ioaiMusic,
      palette: ioaiPalette,
      textNuance: ioaiNuance,
      visual: ioaiVisual,
      analysisSource: 'curated-case-study',
    },
    {
      id: 'case-courtyard-light',
      title: 'Привычный двор в необычном свете',
      dateLabel: 'Autumn 2026',
      createdAt: '2026-09-18T07:16:00Z',
      isPreloaded: true,
      rawText: morningText,
      photos: morningPhotos,
      music: morningMusic,
      palette: morningPalette,
      textNuance: morningNuance,
      visual: morningVisual,
      analysisSource: 'curated-case-study',
    },
    {
      id: 'case-cloudy-day',
      title: 'Просто красивый облачный день',
      dateLabel: 'Summer 2026',
      createdAt: '2026-07-09T18:30:00Z',
      isPreloaded: true,
      rawText: dayText,
      photos: dayPhotos,
      music: dayMusic,
      palette: dayPalette,
      textNuance: dayNuance,
      visual: dayVisual,
      analysisSource: 'curated-case-study',
    },
  ];
}

export function loadStoredMemories(): MemoryDay[] {
  const seed = buildCuratedCaseStudies();
  if (typeof window === 'undefined') return seed;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as MemoryDay[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return parsed.map((day) => ({
      ...day,
      photos: day.photos.map((p) => {
        if (!p.src && p.fallbackPlateId) {
          return {
            ...p,
            src: renderDemoPlateDataUrl(p.fallbackPlateId as Parameters<typeof renderDemoPlateDataUrl>[0]),
          };
        }
        return p;
      }),
    }));
  } catch {
    return seed;
  }
}

export function saveStoredMemories(memories: MemoryDay[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  } catch {
    // Handle storage quota gracefully
  }
}

export function resetAllMemoriesToSeed(): MemoryDay[] {
  const seed = buildCuratedCaseStudies();
  saveStoredMemories(seed);
  return seed;
}
