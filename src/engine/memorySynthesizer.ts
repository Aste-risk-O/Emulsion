import type {
  ExtractedPalette,
  MemoryPhoto,
  MusicSpec,
  TextNuanceAnalysis,
  VisualDirective,
  VisualRuleId,
} from '../types/memory';
import { extractSemanticThemes, generatePhotoCaption, sanitizeMicroCaption } from './textAnalyzer';

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

function isCoolDominant(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  return b > r + 16 && b >= g - 8;
}

/**
 * Auto-picks fitting music for a newly created memory based on real pixels + text nuance.
 */
export function pickMusicForMood(
  palette: ExtractedPalette,
  nuance: TextNuanceAnalysis,
  rawText = ''
): MusicSpec {
  const themes = extractSemanticThemes(rawText);
  const cool = isCoolDominant(palette.dominantHex) || isCoolDominant(palette.accentHex);

  if (themes.rain || (cool && nuance.warmth < 0.45 && nuance.timeOfDay !== 'night')) {
    return {
      title: 'Rainy Rhodes & Tape',
      genre: 'Ambient Minimal',
      bpm: 68,
      mode: 'minor',
      energy: 0.34,
      motif: 'lofi-keys',
      autoMatched: true,
    };
  }
  if (themes.school && (themes.friends || themes.nostalgia || nuance.playfulness >= 0.2)) {
    return {
      title: 'Warm Afternoon Tape Keys',
      genre: 'Lo-Fi Keys',
      bpm: 82,
      mode: 'major',
      energy: 0.45,
      motif: 'lofi-keys',
      autoMatched: true,
    };
  }
  if (nuance.timeOfDay === 'night' && !themes.tension && (nuance.playfulness >= 0.3 || nuance.pace >= 0.6)) {
    return {
      title: 'Late City Flash 909',
      genre: 'Electronic Pulse',
      bpm: 124,
      mode: 'minor',
      energy: 0.82,
      motif: 'electronic-drift',
      autoMatched: true,
    };
  }
  if (nuance.timeOfDay === 'night' || (palette.averageLuminance < 0.3 && themes.tension)) {
    return {
      title: 'Midnight Analog Drift',
      genre: 'Ambient Electronic',
      bpm: 92,
      mode: 'minor',
      energy: 0.56,
      motif: 'electronic-drift',
      autoMatched: true,
    };
  }
  if (nuance.paradoxDetected && nuance.pace >= 0.48) {
    return {
      title: 'Atrium Pulse / Dusk Rest',
      genre: 'Ambient Minimal',
      bpm: 114,
      secondaryBpm: 66,
      mode: 'minor',
      energy: 0.68,
      motif: 'ambient-pulse',
      autoMatched: true,
    };
  }
  if (nuance.timeOfDay === 'dawn' || themes.coffee || nuance.warmth >= 0.62) {
    return {
      title: 'Morning Window Keys',
      genre: 'Lo-Fi Keys',
      bpm: 74,
      mode: 'major',
      energy: 0.38,
      motif: 'lofi-keys',
      autoMatched: true,
    };
  }
  return {
    title: 'Sunlit Acoustic Breeze',
    genre: 'Acoustic Breeze',
    bpm: 70,
    mode: 'major',
    energy: 0.3,
    motif: 'acoustic-breeze',
    autoMatched: true,
  };
}

/**
 * Clean 5-mode visual routing for "+ New Day" memories.
 * Maps text mood + extracted pixels + music energy across all 5 distinct visual modes.
 */
export function chooseNewDayVisualMode(
  palette: ExtractedPalette,
  nuance: TextNuanceAnalysis,
  music: MusicSpec,
  rawText = ''
): VisualRuleId {
  const themes = extractSemanticThemes(rawText);
  const coolPixels = isCoolDominant(palette.dominantHex) || isCoolDominant(palette.accentHex);

  // 1. Direct Flash & Grain: high BPM/energy, kinetic rush, or playful flash night
  if (
    music.bpm >= 114 ||
    music.energy >= 0.72 ||
    (nuance.timeOfDay === 'night' && nuance.playfulness >= 0.32) ||
    (nuance.stillnessVsMovement === 'kinetic' && music.bpm >= 104)
  ) {
    return 'direct-flash-grain';
  }

  // 2. Wet Cyanotype: rain/mist/cool blue pixels with quiet or minor energy
  if (
    themes.rain ||
    (coolPixels && nuance.warmth <= 0.46 && nuance.timeOfDay !== 'night') ||
    (coolPixels && music.mode === 'minor' && music.bpm < 96 && nuance.timeOfDay !== 'night')
  ) {
    return 'wet-cyanotype';
  }

  // 3. Nocturnal Step-Print: tense/quiet nights or low-luminance minor frames
  if (
    nuance.timeOfDay === 'night' ||
    (palette.averageLuminance < 0.3 && music.mode === 'minor' && nuance.warmth < 0.5)
  ) {
    return 'nocturnal-step-print';
  }

  // 4. Light-Leak Double Exposure: nostalgic school/friends/ironic afternoon warmth
  if (
    (themes.school && (themes.friends || themes.nostalgia || nuance.playfulness >= 0.18)) ||
    (nuance.playfulness >= 0.25 && nuance.warmth >= 0.48) ||
    (themes.nostalgia && music.bpm >= 78) ||
    (nuance.paradoxDetected && nuance.warmth >= 0.45)
  ) {
    return 'light-leak-double-exposure';
  }

  // 5. Dawn Halation: warm golden mornings, coffee stillness, calm sunlit warmth
  return 'dawn-halation';
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
  const energy = Math.max(0.1, Math.min(1, music.energy ?? 0.5));
  const isMinor = music.mode === 'minor';

  // Music-coupled particle velocity (visibly faster on high BPM / energetic tracks)
  const particleSpeedMultiplier = Number(
    (0.45 + ((bpm - 48) / 132) * 1.15 + energy * 0.45).toFixed(2)
  );

  // Compute atmospheric gradient stops from real pixels, modulated by music mode & energy
  let stop1 = palette.shadowHex;
  let stop2 = palette.dominantHex;
  let stop3 = palette.highlightHex;

  if (ruleId === 'dawn-halation') {
    stop1 = blendHex('#F4EAD9', palette.highlightHex, 0.34);
    stop2 = blendHex('#E8C3A4', palette.accentHex, isMinor ? 0.32 : 0.24);
    stop3 = blendHex('#2F2829', palette.shadowHex, isMinor ? 0.45 : 0.25);
    if (palette.averageLuminance < 0.4) {
      stop1 = blendHex('#2B2120', palette.shadowHex, 0.4);
      stop2 = blendHex('#7C4936', palette.dominantHex, 0.35);
      stop3 = blendHex('#DDA16E', palette.accentHex, 0.42);
    }
  } else if (ruleId === 'nocturnal-step-print') {
    stop1 = blendHex('#07080D', palette.shadowHex, 0.38);
    stop2 = blendHex('#111622', palette.dominantHex, 0.36);
    stop3 = blendHex('#221B1D', palette.accentHex, 0.32);
  } else if (ruleId === 'wet-cyanotype') {
    stop1 = blendHex('#0C1D2E', palette.shadowHex, 0.42);
    stop2 = blendHex('#1B3B5A', palette.dominantHex, 0.46);
    stop3 = blendHex('#5C87A8', palette.highlightHex, 0.34);
  } else if (ruleId === 'light-leak-double-exposure') {
    stop1 = blendHex('#261A18', palette.shadowHex, 0.48);
    stop2 = blendHex('#59332A', palette.dominantHex, 0.42);
    stop3 = blendHex('#DF7A4E', palette.accentHex, 0.45);
    if (palette.averageLuminance > 0.6 && !isMinor) {
      stop1 = blendHex('#F2E8DA', palette.highlightHex, 0.36);
      stop2 = blendHex('#E4C6AF', palette.dominantHex, 0.32);
      stop3 = blendHex('#D99B7A', palette.accentHex, 0.28);
    }
  } else if (ruleId === 'direct-flash-grain') {
    const darkBase = nuance.timeOfDay === 'night' || palette.averageLuminance < 0.42 || isMinor;
    if (darkBase) {
      stop1 = blendHex('#08080A', palette.shadowHex, 0.35);
      stop2 = blendHex('#1A1B22', palette.dominantHex, 0.4);
      stop3 = blendHex('#3A2B26', palette.accentHex, 0.38);
    } else {
      stop1 = blendHex('#ECE9E1', palette.highlightHex, 0.28);
      stop2 = blendHex('#D4CEC2', palette.dominantHex, 0.26);
      stop3 = blendHex('#B8AFA2', palette.accentHex, 0.24);
    }
  } else if (ruleId === 'sunlit-paper-air') {
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

  // Deepen contrast subtly on intense/minor soundtracks
  if (isMinor && energy >= 0.68 && relativeLuminance(stop1) < 0.35) {
    stop1 = blendHex(stop1, '#050507', 0.35);
  }

  // Guarantee WCAG AA contrast >= 4.5:1 for text over the blended mid-gradient
  const midBg = blendHex(stop1, stop2, 0.5);
  const bgLum = relativeLuminance(midBg);
  const useDarkInk = bgLum > 0.42;

  const textColor = useDarkInk ? '#161513' : '#F4F1EA';
  const mutedTextColor = useDarkInk ? 'rgba(22, 21, 19, 0.68)' : 'rgba(244, 241, 234, 0.74)';
  const scrimStyle = useDarkInk
    ? 'linear-gradient(180deg, rgba(244,241,234,0.35) 0%, rgba(244,241,234,0.12) 45%, rgba(244,241,234,0.48) 100%)'
    : 'linear-gradient(180deg, rgba(10,10,12,0.45) 0%, rgba(10,10,12,0.18) 45%, rgba(10,10,12,0.62) 100%)';

  const ruleMeta: Record<
    VisualRuleId,
    {
      name: string;
      desc: string;
      typeStyle: string;
      borderTone: 'cream' | 'dark' | 'cool';
      grain: number;
      halation: number;
      flash: boolean;
      blur: boolean;
      particles: VisualDirective['particleStyle'];
      stepMult: number;
      calmSlowdown?: number;
    }
  > = {
    'dawn-halation': {
      name: 'Dawn Halation',
      desc: 'Warm cream Polaroid borders with golden sky rays, gentle dust motes, and soft atmospheric bloom drawn from the warmest frame tones.',
      typeStyle: 'Playfair Display warm serif · Tabular sunlit ink',
      borderTone: 'cream',
      grain: 0.08,
      halation: 0.85,
      flash: false,
      blur: false,
      particles: 'motes',
      stepMult: 2.2,
    },
    'nocturnal-step-print': {
      name: 'Nocturnal Step-Print',
      desc: 'Dark obsidian Polaroid borders with restrained embers, deep contrast shadows, and contemplative step-print cadence.',
      typeStyle: 'High-contrast Playfair Display · Cream ink on obsidian frame',
      borderTone: 'dark',
      grain: 0.14,
      halation: 0.55,
      flash: false,
      blur: true,
      particles: 'embers',
      stepMult: 2.2,
    },
    'wet-cyanotype': {
      name: 'Wet Cyanotype',
      desc: 'Cool Prussian-blue emulsion wash with silver-tinted borders, unhurried drifting rain motes, and reflective clarity.',
      typeStyle: 'Playfair Display cool editorial · Deep slate tabular marks',
      borderTone: 'cool',
      grain: 0.11,
      halation: 0.62,
      flash: false,
      blur: false,
      particles: 'dust',
      stepMult: 2.4,
    },
    'light-leak-double-exposure': {
      name: 'Light-Leak Double Exposure',
      desc: 'Warm cream borders framed by nostalgic amber edge leaks, overlapping optical glow, and playful angled prints.',
      typeStyle: 'Playfair Display warm editorial · Handwritten frame rhythm',
      borderTone: 'cream',
      grain: 0.11,
      halation: 0.92,
      flash: false,
      blur: false,
      particles: 'motes',
      stepMult: 2,
    },
    'direct-flash-grain': {
      name: 'Direct Flash & Grain',
      desc: 'Crisp camera-flash pop, pronounced 35mm emulsion grain, fast beat-locked sparks, and high-contrast Polaroid borders.',
      typeStyle: 'Sharp Playfair Display · High-contrast tabular stamps',
      borderTone: useDarkInk ? 'cream' : 'dark',
      grain: 0.17,
      halation: 0.44,
      flash: true,
      blur: true,
      particles: 'sparks',
      stepMult: 1.6,
    },
    'paradox-step-print': {
      name: 'Paradox Step-Print',
      desc: 'Contrasts kinetic grain and slight motion shake on crowded frames with sudden soft halation and stillness on calm frames.',
      typeStyle: 'Playfair Display italic contrast · JetBrains Mono frame index',
      borderTone: 'cream',
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
      borderTone: 'cream',
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
      borderTone: 'cream',
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
      borderTone: 'cream',
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
      borderTone: 'cream',
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
      borderTone: 'cream',
      grain: 0.08,
      halation: 0.4,
      flash: false,
      blur: false,
      particles: 'dust',
      stepMult: 2,
    },
  };

  const meta = ruleMeta[ruleId];
  const computedBeatStep = Math.max(380, Math.min(2400, Math.round(beatStepMs * meta.stepMult)));

  return {
    ruleId,
    ruleName: meta.name,
    ruleDescription: meta.desc,
    typographyStyle: meta.typeStyle,
    gradientStops: [stop1, stop2, stop3],
    inkPolarity: useDarkInk ? 'dark' : 'light',
    borderTone: meta.borderTone,
    textColor,
    mutedTextColor,
    scrimStyle,
    grainOpacity: Math.min(0.22, Number((meta.grain + energy * 0.03).toFixed(3))),
    halationStrength: meta.halation,
    flashContrast: meta.flash,
    motionBlurOnKinetic: meta.blur,
    particleStyle: meta.particles,
    particleSpeedMultiplier,
    beatStepMs: computedBeatStep,
    calmFrameSlowdownMs: meta.calmSlowdown,
  };
}

export function buildCouplingExplanation(
  palette: ExtractedPalette,
  nuance: TextNuanceAnalysis,
  music: MusicSpec,
  visual: VisualDirective
): string {
  const isRu = nuance.language === 'ru';
  const lumPct = Math.round(palette.averageLuminance * 100);
  const borderLabel =
    visual.borderTone === 'dark'
      ? isRu ? 'тёмные рамки' : 'obsidian borders'
      : visual.borderTone === 'cool'
        ? isRu ? 'прохладная цианотипная бумага' : 'cool cyanotype paper'
        : isRu ? 'тёплые кремовые рамки' : 'warm cream borders';

  if (isRu) {
    return `Режим «${visual.ruleName}» (${borderLabel}) выбран из сочетания тональности текста (${nuance.nuanceTags.slice(0, 2).join(', ')}), реальной яркости кадров (${lumPct}%) и трека «${music.title}» (${music.bpm} BPM, ${music.mode === 'minor' ? 'минор' : 'мажор'}). Темп ${music.bpm} BPM задаёт шаг проявки ${visual.beatStepMs} мс и скорость частиц ×${visual.particleSpeedMultiplier ?? 1}.`;
  }
  return `Mode "${visual.ruleName}" (${borderLabel}) couples the diary tone (${nuance.nuanceTags.slice(0, 2).join(', ')}), extracted pixel luminance (${lumPct}%), and "${music.title}" (${music.bpm} BPM, ${music.mode}). Tempo directly drives the ${visual.beatStepMs}ms reveal cadence and ×${visual.particleSpeedMultiplier ?? 1} particle drift velocity.`;
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
    } else if (ruleId === 'nocturnal-flash-baroque' || ruleId === 'direct-flash-grain') {
      frameTone = 'flash';
    } else if (ruleId === 'sunlit-paper-air' || ruleId === 'dawn-halation') {
      frameTone = 'airy';
    } else if (ruleId === 'nocturnal-step-print') {
      frameTone = idx === total - 1 ? 'calm' : 'kinetic';
    } else if (ruleId === 'architectural-halation' || ruleId === 'wet-cyanotype') {
      frameTone = 'grounded';
    } else if (ruleId === 'light-leak-double-exposure') {
      frameTone = nuance.stillnessVsMovement === 'kinetic' ? 'kinetic' : 'airy';
    } else if (nuance.stillnessVsMovement === 'kinetic') {
      frameTone = 'kinetic';
    }

    let tiltDeg = 0;
    if (
      total === 1 ||
      ruleId === 'architectural-halation' ||
      ruleId === 'sunlit-paper-air' ||
      ruleId === 'dawn-halation' ||
      ruleId === 'wet-cyanotype'
    ) {
      tiltDeg =
        ruleId === 'architectural-halation' || ruleId === 'wet-cyanotype'
          ? idx % 2 === 0
            ? -0.8
            : 0.8
          : 0;
    } else if (
      ruleId === 'nocturnal-flash-baroque' ||
      ruleId === 'direct-flash-grain' ||
      ruleId === 'light-leak-double-exposure'
    ) {
      const tilts = [-2.8, 2.2, -1.7, 2.6, -2.0];
      tiltDeg = tilts[idx % tilts.length];
    } else if (ruleId === 'paradox-step-print' || ruleId === 'nocturnal-step-print') {
      tiltDeg = frameTone === 'calm' ? 0 : idx % 2 === 0 ? -2.2 : 1.9;
    } else {
      const tilts = [-1.8, 1.4, -1.1, 2.0, -1.5];
      tiltDeg = tilts[idx % tilts.length];
    }

    const numStr = String(idx + 1).padStart(2, '0');
    const customCap = item.caption?.trim();
    const caption = customCap
      ? item.preferredDemoPath
        ? customCap // preserve preloaded curated captions exactly
        : sanitizeMicroCaption(customCap, 32)
      : generatePhotoCaption(idx, total, rawText, nuance, frameTone, {
          luminance: item.luminance,
          orientation: item.orientation,
        });
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
