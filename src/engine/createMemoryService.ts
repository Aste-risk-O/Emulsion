import type {
  MemoryDay,
  MusicSpec,
  SynthMotif,
  VisualRuleId,
} from '../types/memory';
import { extractPaletteFromImages } from './pixelExtractor';
import {
  analyzeTextNuance,
  generateDeterministicSubtitle,
  generateDeterministicTitle,
  sanitizeMicroCaption,
} from './textAnalyzer';
import {
  buildCouplingExplanation,
  buildMemoryPhotosFromRaw,
  chooseNewDayVisualMode,
  pickMusicForMood,
  synthesizeVisualDirective,
} from './memorySynthesizer';

export interface CreateMemoryInput {
  rawText: string;
  customTitle?: string;
  dateLabel?: string;
  photoSrcs: string[];
  autoPickMusic?: boolean;
  music?: MusicSpec;
}

export function inferMotifFromGenre(genre: string, mode: 'major' | 'minor', bpm: number): SynthMotif {
  const g = genre.toLowerCase();
  if (g.includes('baroque') || g.includes('vivaldi') || g.includes('string') || g.includes('classic')) {
    return 'baroque-strings';
  }
  if (g.includes('lo-fi') || g.includes('lofi') || g.includes('jazz') || g.includes('key') || g.includes('piano') || g.includes('rhodes')) {
    return 'lofi-keys';
  }
  if (g.includes('acoustic') || g.includes('folk') || g.includes('indie') || g.includes('guitar')) {
    return 'acoustic-breeze';
  }
  if (g.includes('electronic') || g.includes('synth') || bpm >= 120) {
    return mode === 'minor' ? 'electronic-drift' : 'ambient-pulse';
  }
  return 'ambient-pulse';
}

async function resizeImageToJpegBase64(
  src: string,
  maxDim = 640,
  quality = 0.72
): Promise<{ base64: string; mimeType: string } | null> {
  if (typeof document === 'undefined') return null;
  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width || 640;
        const h = img.naturalHeight || img.height || 480;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, cw, ch);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];
        resolve(base64 ? { base64, mimeType: 'image/jpeg' } : null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function createMemoryDay(input: CreateMemoryInput): Promise<MemoryDay> {
  const { palette, perPhoto } = await extractPaletteFromImages(input.photoSrcs);
  const nuance = analyzeTextNuance(input.rawText);

  const autoPick = input.autoPickMusic ?? !input.music;
  let finalMusic: MusicSpec = input.music
    ? { ...input.music, autoMatched: false }
    : pickMusicForMood(palette, nuance, input.rawText);

  let title = input.customTitle?.trim() || generateDeterministicTitle(input.rawText, nuance);
  let subtitle = generateDeterministicSubtitle(input.rawText, nuance);
  let forcedRule: VisualRuleId | undefined;
  let customCaptions: string[] | undefined;
  let customTimestamps: string[] | undefined;
  let geminiCoupling: string | undefined;
  let analysisSource: MemoryDay['analysisSource'] = 'deterministic-signals';

  // Resize images for lightweight Multimodal Vision analysis
  const resizedImages = (
    await Promise.all(input.photoSrcs.slice(0, 5).map((src) => resizeImageToJpegBase64(src)))
  ).filter((item): item is { base64: string; mimeType: string } => item !== null);

  // Attempt server-side Gemini Multimodal Vision enrichment
  try {
    const resp = await fetch('/api/analyze-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: input.rawText,
        photoCount: input.photoSrcs.length,
        images: resizedImages,
        dominantHex: palette.dominantHex,
        shadowHex: palette.shadowHex,
        highlightHex: palette.highlightHex,
        accentHex: palette.accentHex,
        averageLuminance: palette.averageLuminance,
        autoPickMusic: autoPick,
        music: finalMusic,
      }),
    });

    if (resp.ok) {
      const data = (await resp.json()) as {
        result?: {
          title?: string;
          subtitle?: string;
          visualMode?: VisualRuleId;
          paradoxDetected?: boolean;
          paradoxReason?: string;
          nuanceTags?: string[];
          photoCaptions?: string[];
          photoTimestamps?: string[];
          musicSuggestion?: {
            title?: string;
            genre?: string;
            bpm?: number;
            mode?: 'major' | 'minor';
            energy?: number;
          };
          couplingExplanation?: string;
        };
      };

      if (data.result) {
        if (!input.customTitle?.trim() && data.result.title?.trim()) {
          title = data.result.title.replace(/[.…]+$/g, '').trim();
        }
        if (data.result.subtitle?.trim()) {
          subtitle = data.result.subtitle.replace(/…+$/g, '').trim();
        }
        if (data.result.visualMode) {
          forcedRule = data.result.visualMode;
        }
        if (typeof data.result.paradoxDetected === 'boolean') {
          nuance.paradoxDetected = data.result.paradoxDetected;
        }
        if (data.result.paradoxReason?.trim()) {
          nuance.paradoxReason = data.result.paradoxReason.trim();
        }
        if (Array.isArray(data.result.nuanceTags) && data.result.nuanceTags.length > 0) {
          nuance.nuanceTags = data.result.nuanceTags.slice(0, 4);
        }
        if (Array.isArray(data.result.photoCaptions)) {
          customCaptions = data.result.photoCaptions.map((c) => sanitizeMicroCaption(c, 32));
        }
        if (Array.isArray(data.result.photoTimestamps)) {
          customTimestamps = data.result.photoTimestamps.map((t) => t.trim().slice(0, 18));
        }
        const suggestedTitle = data.result.musicSuggestion?.title?.trim();
        if (autoPick && data.result.musicSuggestion && suggestedTitle) {
          const ms = data.result.musicSuggestion;
          const sugBpm = Math.max(48, Math.min(180, Number(ms.bpm) || finalMusic.bpm));
          const sugMode: 'major' | 'minor' = ms.mode === 'major' ? 'major' : 'minor';
          const sugGenre = ms.genre?.trim() || finalMusic.genre;
          finalMusic = {
            title: suggestedTitle,
            genre: sugGenre,
            bpm: sugBpm,
            mode: sugMode,
            energy: Math.max(0.12, Math.min(0.98, Number(ms.energy) || finalMusic.energy)),
            motif: inferMotifFromGenre(sugGenre, sugMode, sugBpm),
            autoMatched: true,
          };
        }
        if (data.result.couplingExplanation?.trim()) {
          geminiCoupling = data.result.couplingExplanation.trim();
        }
        analysisSource = 'gemini+signals';
      }
    }
  } catch {
    // Deterministic multi-signal engine remains active seamlessly
  }

  // If user chose custom music manually or Gemini wasn't available, route cleanly across the 5 modes
  const resolvedRule = forcedRule ?? chooseNewDayVisualMode(palette, nuance, finalMusic, input.rawText);
  const visual = synthesizeVisualDirective(palette, nuance, finalMusic, resolvedRule);
  const couplingExplanation =
    geminiCoupling || buildCouplingExplanation(palette, nuance, finalMusic, visual);

  const photos = buildMemoryPhotosFromRaw(
    input.photoSrcs.map((src, idx) => ({
      src,
      luminance: perPhoto[idx]?.luminance,
      dominantHex: perPhoto[idx]?.dominantHex,
      accentHex: perPhoto[idx]?.accentHex,
      highlightHex: perPhoto[idx]?.highlightHex,
      orientation: perPhoto[idx]?.orientation,
      caption: customCaptions?.[idx],
      timestampLabel: customTimestamps?.[idx],
    })),
    input.rawText,
    nuance,
    visual.ruleId
  );

  const now = new Date();
  const formattedDate =
    input.dateLabel?.trim() ||
    now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return {
    id: `day-${Date.now().toString(36)}`,
    title,
    subtitle,
    dateLabel: formattedDate,
    createdAt: now.toISOString(),
    isPreloaded: false,
    rawText: input.rawText.trim(),
    photos,
    music: finalMusic,
    palette,
    textNuance: nuance,
    visual,
    couplingExplanation,
    analysisSource,
  };
}

export async function recomputeMemoryWithNewPhotos(
  day: MemoryDay,
  newPhotos: Array<{ id?: string; src: string; caption?: string; timestampLabel?: string; preferredDemoPath?: string }>
): Promise<MemoryDay> {
  const clipped = newPhotos.slice(0, 5);
  const { palette, perPhoto } = await extractPaletteFromImages(clipped.map((p) => p.src));
  const nuance = analyzeTextNuance(day.rawText);
  if (day.textNuance.paradoxDetected) {
    nuance.paradoxDetected = true;
    nuance.paradoxReason = day.textNuance.paradoxReason ?? nuance.paradoxReason;
  }
  const visual = synthesizeVisualDirective(palette, nuance, day.music, day.visual.ruleId);
  const photos = buildMemoryPhotosFromRaw(
    clipped.map((p, idx) => ({
      ...p,
      luminance: perPhoto[idx]?.luminance,
      dominantHex: perPhoto[idx]?.dominantHex,
      accentHex: perPhoto[idx]?.accentHex,
      highlightHex: perPhoto[idx]?.highlightHex,
      orientation: perPhoto[idx]?.orientation,
    })),
    day.rawText,
    nuance,
    visual.ruleId
  );

  return {
    ...day,
    photos,
    palette,
    visual,
    couplingExplanation:
      day.isPreloaded ? day.couplingExplanation : buildCouplingExplanation(palette, nuance, day.music, visual),
  };
}
