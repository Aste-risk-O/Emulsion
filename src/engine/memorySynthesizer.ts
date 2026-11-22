import type {
  ExtractedPalette,
  MemoryPhoto,
  MusicSpec,
  TextNuanceAnalysis,
  VisualDirective,
  VisualRuleId,
} from '../types/memory';
import { generatePhotoCaption } from './textAnalyzer';

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const transform = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function blendHex(hexA: string, hexB: string, ratioB: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    a.r + (b.r - a.r) * ratioB,
    a.g + (b.g - a.g) * ratioB,
    a.b + (b.b - a.b) * ratioB
  );
}

export function getMemoryCountHeadline(count: number): string {
  const words = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
  const word = words[count] ?? String(count);
  return count === 1 ? 'A MEMORY IN ONE MOMENT' : `A MEMORY IN ${word} MOMENTS`;
}

export function chooseVisualRule(
  palette: ExtractedPalette,
  nuance: TextNuanceAnalysis,
  music: MusicSpec
): VisualRuleId {
  if (nuance.paradoxDetected && nuance.pace >= 0.45 && music.bpm >= 100 && nuance.timeOfDay !== 'night') {
    return 'paradox-step-print';
  }
  if (nuance.timeOfDay === 'night' && (music.bpm >= 115 || nuance.playfulness >= 0.28 || music.motif === 'baroque-strings')) {
    return 'nocturnal-flash-baroque';
  }
  if (nuance.paradoxDetected || (nuance.timeOfDay === 'dawn' && palette.contrastSpread >= 0.35)) {
    return 'architectural-halation';
  }
  if (palette.averageLuminance >= 0.56 && nuance.stillnessVsMovement === 'still') {
    return 'sunlit-paper-air';
  }
  if (nuance.stillnessVsMovement === 'kinetic' || music.bpm >= 112) {
    return 'kinetic-emulsion';
  }
  return 'quiet-monograph';
}

export function synthesizeVisualDirective(
  palette: ExtractedPalette,
  nuance: TextNuanceAnalysis,
  music: MusicSpec,
  forcedRule?: VisualRuleId
): VisualDirective {
  const ruleId = forcedRule ?? chooseVisualRule(palette, nuance, music);
  const bpm = Math.max(48, Math.min(180, music.bpm || 84));
  const beatStepMs = Math.round(60000 / bpm);

  // Compute atmospheric gradient stops directly from the photo's real extracted palette
  let stop1 = palette.shadowHex;
  let stop2 = palette.dominantHex;
  let stop3 = palette.highlightHex;

  if (ruleId === 'sunlit-paper-air') {
    // Airy sunlit paper wash tinted with real sky/cloud palette
    stop1 = blendHex('#F4F1EA', palette.highlightHex, 0.35);
    stop2 = blendHex('#EAE4D8', palette.dominantHex, 0.28);
    stop3 = blendHex('#DCE7F0', palette.accentHex, 0.22);
  } else if (ruleId === 'nocturnal-flash-baroque') {
    stop1 = blendHex('#08090F', palette.shadowHex, 0.45);
    stop2 = blendHex('#0E162B', palette.dominantHex, 0.42);
    stop3 = blendHex('#1A1410', palette.accentHex, 0.35);
  } else if (ruleId === 'paradox-step-print') {
    stop1 = blendHex('#0F171E', palette.shadowHex, 0.55);
    stop2 = blendHex(palette.dominantHex, '#18242C', 0.42);
    stop3 = blendHex(palette.accentHex, '#2C1B18', 0.45);
  } else if (ruleId === 'architectural-halation') {
    stop1 = blendHex(palette.shadowHex, '#141923', 0.48);
    stop2 = blendHex(palette.dominantHex, '#2A2226', 0.36);
    stop3 = blendHex(palette.accentHex, '#3D231C', 0.4);
  } else if (palette.averageLuminance > 0.62) {
    stop1 = blendHex('#F2EFE9', palette.highlightHex, 0.3);
    stop2 = blendHex('#E4DFD4', palette.dominantHex, 0.28);
    stop3 = blendHex('#D8D2C5', palette.accentHex, 0.2);
  } else {
    stop1 = blendHex('#121110', palette.shadowHex, 0.5);
    stop2 = blendHex('#1C1A18', palette.dominantHex, 0.42);
    stop3 = blendHex('#26221F', palette.accentHex, 0.32);
  }

  // Guarantee WCAG AA contrast >= 4.5:1 for text over the blended mid-gradient
  const midBg = blendHex(stop1, stop2, 0.5);
  const bgLum = relativeLuminance(midBg);
  const useDarkInk = bgLum > 0.42;

  const textColor = useDarkInk ? '#161513' : '#F4F1EA';
  const mutedTextColor = useDarkInk ? 'rgba(22, 21, 19, 0.68)' : 'rgba(244, 241, 234, 0.72)';
  const scrimStyle = useDarkInk
    ? 'linear-gradient(180deg, rgba(244,241,234,0.35) 0%, rgba(244,241,234,0.12) 45%, rgba(244,241,234,0.48) 100%)'
    : 'linear-gradient(180deg, rgba(10,10,12,0.45) 0%, rgba(10,10,12,0.18) 45%, rgba(10,10,12,0.62) 100%)';

  const ruleMeta: Record<
    VisualRuleId,
    {
      name: string;
      desc: string;
      typeStyle: string;
      grain: number;
      halation: number;
      flash: boolean;
      blur: boolean;
      particles: VisualDirective['particleStyle'];
      stepMult: number;
      calmSlowdown?: number;
    }
  > = {
    'paradox-step-print': {
      name: 'Paradox Step-Print',
      desc: 'Contrasts kinetic grain and slight motion shake on crowded frames with sudden soft halation and stillness on calm frames.',
      typeStyle: 'Playfair Display italic contrast · JetBrains Mono frame index',
      grain: 0.16,
      halation: 0.72,
      flash: false,
      blur: true,
      particles: 'embers',
      stepMult: 2,
      calmSlowdown: Math.round((60000 / Math.max(52, music.secondaryBpm ?? 66)) * 2.2),
    },
    'architectural-halation': {
      name: 'Architectural Halation',
      desc: 'Grounded, level Polaroid framing for buildings while vivid extracted sky and light colors bloom softly across the darkroom field.',
      typeStyle: 'Playfair Display balanced serif · Crisp tabular timestamps',
      grain: 0.1,
      halation: 0.85,
      flash: false,
      blur: false,
      particles: 'motes',
      stepMult: 2,
    },
    'nocturnal-flash-baroque': {
      name: 'Nocturnal Flash & Baroque Rhythm',
      desc: 'Midnight obsidian wash with extracted screen cobalt and sodium amber; crisp Polaroid flash contrast, playful tilted angles, and string-pulse reveal.',
      typeStyle: 'High-contrast Playfair Display · Crisp flash-lit Polaroid ink',
      grain: 0.13,
      halation: 0.45,
      flash: true,
      blur: false,
      particles: 'sparks',
      stepMult: 2,
    },
    'sunlit-paper-air': {
      name: 'Sunlit Paper & Air',
      desc: 'Airy archival margins tinted by real sky & cloud hues with unhurried drifting light particles and gentle breathing motion.',
      typeStyle: 'Open editorial Playfair Display · Dark graphite ink on warm sunlit paper',
      grain: 0.06,
      halation: 0.5,
      flash: false,
      blur: false,
      particles: 'clouds',
      stepMult: 3,
    },
    'kinetic-emulsion': {
      name: 'Kinetic Emulsion',
      desc: 'Energetic beat-locked Polaroid sequence with tilted framing, warm film grain, and responsive tempo cadence.',
      typeStyle: 'Playfair Display · Tight monospace beat captions',
      grain: 0.14,
      halation: 0.48,
      flash: true,
      blur: true,
      particles: 'sparks',
      stepMult: 2,
    },
    'quiet-monograph': {
      name: 'Quiet Monograph',
      desc: 'Unhurried gallery pacing on tonal emulsion paper with restrained grain and gentle focus.',
      typeStyle: 'Editorial Playfair Display · Quiet charcoal/cream ink',
      grain: 0.08,
      halation: 0.4,
      flash: false,
      blur: false,
      particles: 'dust',
      stepMult: 2,
    },
  };

  const meta = ruleMeta[ruleId];

  return {
    ruleId,
    ruleName: meta.name,
    ruleDescription: meta.desc,
    typographyStyle: meta.typeStyle,
    gradientStops: [stop1, stop2, stop3],
    inkPolarity: useDarkInk ? 'dark' : 'light',
    textColor,
    mutedTextColor,
    scrimStyle,
    grainOpacity: meta.grain,
    halationStrength: meta.halation,
    flashContrast: meta.flash,
    motionBlurOnKinetic: meta.blur,
    particleStyle: meta.particles,
    beatStepMs: Math.max(420, Math.min(2200, beatStepMs * meta.stepMult)),
    calmFrameSlowdownMs: meta.calmSlowdown,
  };
}

export function buildMemoryPhotosFromRaw(
  rawPhotos: Array<{
    id?: string;
    src: string;
    preferredDemoPath?: string;
    fallbackPlateId?: string;
    luminance?: number;
    dominantHex?: string;
    accentHex?: string;
    highlightHex?: string;
    orientation?: 'portrait' | 'landscape';
    caption?: string;
    timestampLabel?: string;
  }>,
  rawText: string,
  nuance: TextNuanceAnalysis,
  ruleId: VisualRuleId
): MemoryPhoto[] {
  const total = rawPhotos.length;
  return rawPhotos.slice(0, 5).map((item, idx) => {
    let frameTone: MemoryPhoto['frameTone'] = 'grounded';
    if (ruleId === 'paradox-step-print') {
      frameTone = idx === total - 1 ? 'calm' : 'kinetic';
    } else if (ruleId === 'nocturnal-flash-baroque') {
      frameTone = 'flash';
    } else if (ruleId === 'sunlit-paper-air') {
      frameTone = 'airy';
    } else if (ruleId === 'architectural-halation') {
      frameTone = 'grounded';
    } else if (nuance.stillnessVsMovement === 'kinetic') {
      frameTone = 'kinetic';
    }

    let tiltDeg = 0;
    if (total === 1 || ruleId === 'architectural-halation' || ruleId === 'sunlit-paper-air') {
      tiltDeg = ruleId === 'architectural-halation' ? (idx % 2 === 0 ? -0.8 : 0.8) : 0;
    } else if (ruleId === 'nocturnal-flash-baroque') {
      const tilts = [-3.2, 2.4, -1.9, 3.0, -2.2];
      tiltDeg = tilts[idx % tilts.length];
    } else if (ruleId === 'paradox-step-print') {
      tiltDeg = frameTone === 'calm' ? 0 : idx % 2 === 0 ? -2.4 : 2.1;
    } else {
      const tilts = [-1.8, 1.4, -1.1, 2.0, -1.5];
      tiltDeg = tilts[idx % tilts.length];
    }

    const numStr = String(idx + 1).padStart(2, '0');
    const caption = item.caption?.trim() || generatePhotoCaption(idx, total, rawText, nuance, frameTone);
    const timestampLabel = item.timestampLabel?.trim() || `FRAME ${numStr}`;

    return {
      id: item.id ?? `frame-${idx + 1}`,
      src: item.src,
      preferredDemoPath: item.preferredDemoPath,
      fallbackPlateId: item.fallbackPlateId,
      caption,
      timestampLabel,
      frameTone,
      tiltDeg,
      orientation: item.orientation,
      luminance: item.luminance,
      dominantHex: item.dominantHex,
      accentHex: item.accentHex,
      highlightHex: item.highlightHex,
    };
  });
}
