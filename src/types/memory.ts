export type LanguageCode = 'ru' | 'en' | 'mixed';

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night' | 'unspecified';

export type VisualRuleId =
  | 'dawn-halation'
  | 'nocturnal-step-print'
  | 'wet-cyanotype'
  | 'light-leak-double-exposure'
  | 'direct-flash-grain'
  | 'paradox-step-print'
  | 'architectural-halation'
  | 'nocturnal-flash-baroque'
  | 'sunlit-paper-air'
  | 'kinetic-emulsion'
  | 'quiet-monograph';

export type SynthMotif =
  | 'ambient-pulse'
  | 'lofi-keys'
  | 'baroque-strings'
  | 'acoustic-breeze'
  | 'electronic-drift';

export interface ColorSwatch {
  hex: string;
  role: 'dominant' | 'shadow' | 'highlight' | 'sky' | 'accent';
  label: string;
  weight: number;
}

export interface ExtractedPalette {
  swatches: ColorSwatch[];
  dominantHex: string;
  shadowHex: string;
  highlightHex: string;
  accentHex: string;
  averageLuminance: number; // 0..1
  contrastSpread: number;   // 0..1
  source: 'canvas-pixels' | 'seeded-pixels';
}

export interface MusicSpec {
  title: string;
  artist?: string;
  sourceUrl?: string;
  audioDataUrl?: string;
  genre: string;
  bpm: number;
  secondaryBpm?: number; // e.g., slows down on calm dusk frame
  mode: 'major' | 'minor';
  energy: number; // 0..1
  motif: SynthMotif;
  analyzedFromAudioFile?: boolean;
  autoMatched?: boolean;
}

export interface TextNuanceAnalysis {
  language: LanguageCode;
  timeOfDay: TimeOfDay;
  paradoxDetected: boolean;
  paradoxReason?: string;
  pace: number;       // 0 (still) .. 1 (frantic)
  playfulness: number; // 0 .. 1
  warmth: number;     // 0 (cool) .. 1 (warm)
  stillnessVsMovement: 'still' | 'balanced' | 'kinetic';
  nuanceTags: string[];
  voiceoverRate: number;
  voiceoverPitch: number;
  captionSegments: string[];
}

export interface MemoryPhoto {
  id: string;
  src: string;
  preferredDemoPath?: string;
  fallbackPlateId?: string;
  caption: string;
  timestampLabel: string;
  frameTone: 'kinetic' | 'calm' | 'flash' | 'grounded' | 'airy';
  tiltDeg: number;
  orientation?: 'portrait' | 'landscape';
  luminance?: number;
  dominantHex?: string;
  accentHex?: string;
  highlightHex?: string;
}

export interface VisualDirective {
  ruleId: VisualRuleId;
  ruleName: string;
  ruleDescription: string;
  typographyStyle: string;
  gradientStops: [string, string, string];
  inkPolarity: 'light' | 'dark';
  borderTone?: 'cream' | 'dark' | 'cool';
  textColor: string;
  mutedTextColor: string;
  scrimStyle: string;
  grainOpacity: number;
  halationStrength: number;
  flashContrast: boolean;
  motionBlurOnKinetic: boolean;
  particleStyle: 'dust' | 'motes' | 'embers' | 'clouds' | 'sparks';
  particleSpeedMultiplier?: number;
  beatStepMs: number;
  calmFrameSlowdownMs?: number;
}

export interface MemoryDay {
  id: string;
  title: string;
  subtitle?: string;
  dateLabel: string;
  createdAt: string;
  isPreloaded?: boolean;
  rawText: string;
  photos: MemoryPhoto[];
  music: MusicSpec;
  palette: ExtractedPalette;
  textNuance: TextNuanceAnalysis;
  visual: VisualDirective;
  couplingExplanation?: string;
  analysisSource: 'gemini+signals' | 'deterministic-signals' | 'curated-case-study';
}
