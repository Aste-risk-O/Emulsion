import type {
  MemoryDay,
  MusicSpec,
  SynthMotif,
  VisualRuleId,
} from '../types/memory';
import { extractPaletteFromImages } from './pixelExtractor';
import { analyzeTextNuance, generateDeterministicTitle } from './textAnalyzer';
import { buildMemoryPhotosFromRaw, synthesizeVisualDirective } from './memorySynthesizer';

export interface CreateMemoryInput {
  rawText: string;
  customTitle?: string;
  dateLabel?: string;
  photoSrcs: string[];
  music: MusicSpec;
}

export function inferMotifFromGenre(genre: string, mode: 'major' | 'minor', bpm: number): SynthMotif {
  const g = genre.toLowerCase();
  if (g.includes('baroque') || g.includes('vivaldi') || g.includes('string') || g.includes('classic')) {
    return 'baroque-strings';
  }
  if (g.includes('lo-fi') || g.includes('lofi') || g.includes('jazz') || g.includes('key') || g.includes('piano')) {
    return 'lofi-keys';
  }
  if (g.includes('acoustic') || g.includes('folk') || g.includes('indie') || g.includes('guitar')) {
    return 'acoustic-breeze';
  }
  if (g.includes('electronic') || g.includes('synth') || bpm >= 122) {
    return mode === 'minor' ? 'electronic-drift' : 'ambient-pulse';
  }
  return 'ambient-pulse';
}

export async function createMemoryDay(input: CreateMemoryInput): Promise<MemoryDay> {
  const { palette, perPhoto } = await extractPaletteFromImages(input.photoSrcs);
  const nuance = analyzeTextNuance(input.rawText);

  let title = input.customTitle?.trim() || generateDeterministicTitle(input.rawText, nuance);
  let forcedRule: VisualRuleId | undefined;
  let customCaptions: string[] | undefined;
  let analysisSource: MemoryDay['analysisSource'] = 'deterministic-signals';

  // Attempt server-side Gemini 4 Hydrogen enrichment when GEMINI_API_KEY is configured
  try {
    const resp = await fetch('/api/analyze-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: input.rawText,
        photoCount: input.photoSrcs.length,
        dominantHex: palette.dominantHex,
        shadowHex: palette.shadowHex,
        highlightHex: palette.highlightHex,
        accentHex: palette.accentHex,
        averageLuminance: palette.averageLuminance,
        music: input.music,
      }),
    });

    if (resp.ok) {
      const data = (await resp.json()) as {
        result?: {
          title?: string;
          visualRuleId?: VisualRuleId;
          paradoxDetected?: boolean;
          paradoxReason?: string;
          nuanceTags?: string[];
          photoCaptions?: string[];
        };
      };

      if (data.result) {
        if (!input.customTitle?.trim() && data.result.title) {
          title = data.result.title;
        }
        if (data.result.visualRuleId) {
          forcedRule = data.result.visualRuleId;
        }
        if (typeof data.result.paradoxDetected === 'boolean') {
          nuance.paradoxDetected = data.result.paradoxDetected;
        }
        if (data.result.paradoxReason) {
          nuance.paradoxReason = data.result.paradoxReason;
        }
        if (Array.isArray(data.result.nuanceTags) && data.result.nuanceTags.length > 0) {
          nuance.nuanceTags = data.result.nuanceTags.slice(0, 4);
        }
        if (Array.isArray(data.result.photoCaptions)) {
          customCaptions = data.result.photoCaptions;
        }
        analysisSource = 'gemini+signals';
      }
    }
  } catch {
    // Deterministic multi-signal engine remains active seamlessly
  }

  const visual = synthesizeVisualDirective(palette, nuance, input.music, forcedRule);
  const photos = buildMemoryPhotosFromRaw(
    input.photoSrcs.map((src, idx) => ({
      src,
      luminance: perPhoto[idx]?.luminance,
      dominantHex: perPhoto[idx]?.dominantHex,
      accentHex: perPhoto[idx]?.accentHex,
      highlightHex: perPhoto[idx]?.highlightHex,
      orientation: perPhoto[idx]?.orientation,
      caption: customCaptions?.[idx],
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
    dateLabel: formattedDate,
    createdAt: now.toISOString(),
    isPreloaded: false,
    rawText: input.rawText.trim(),
    photos,
    music: input.music,
    palette,
    textNuance: nuance,
    visual,
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
  // Preserve curated paradox reasoning if present
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
  };
}
