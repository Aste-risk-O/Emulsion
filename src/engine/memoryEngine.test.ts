import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeTextNuance,
  detectLanguage,
  detectTimeOfDay,
  generateDeterministicTitle,
  segmentCaptions,
} from './textAnalyzer';
import {
  buildMemoryPhotosFromRaw,
  chooseVisualRule,
  contrastRatio,
  getMemoryCountHeadline,
  synthesizeVisualDirective,
} from './memorySynthesizer';
import type { ExtractedPalette, MusicSpec } from '../types/memory';

test('detects Russian, English, and mixed diary notes accurately', () => {
  assert.equal(detectLanguage('Просто красивый, облачный день'), 'ru');
  assert.equal(detectLanguage('Walking late under amber streetlights'), 'en');
  assert.equal(detectLanguage('Walking home in ночная Астана after 1510'), 'mixed');
});

test('detects paradox between chaos and calm in Russian Olympiad case', () => {
  const nuance = analyzeTextNuance('безумие, день в котором находишь миги спокойствия чудом.');
  assert.equal(nuance.language, 'ru');
  assert.equal(nuance.paradoxDetected, true);
  assert.ok(nuance.nuanceTags.length >= 2);
});

test('detects nocturnal euphoria in Astana 1510 Vivaldi case', () => {
  const nuance = analyzeTextNuance('Я ходил радостный, гулял по ночной астане, придуривался, музыку слушал');
  assert.equal(nuance.timeOfDay, 'night');
  assert.ok(nuance.playfulness > 0.3);
  assert.equal(nuance.stillnessVsMovement, 'kinetic');
});

test('synthesizes accessible contrast >= 4.5:1 across dark and bright palettes', () => {
  const darkPalette: ExtractedPalette = {
    swatches: [],
    dominantHex: '#152A5E',
    shadowHex: '#090B14',
    highlightHex: '#E09132',
    accentHex: '#2563EB',
    averageLuminance: 0.18,
    contrastSpread: 0.72,
    source: 'canvas-pixels',
  };
  const brightPalette: ExtractedPalette = {
    swatches: [],
    dominantHex: '#B6D0E2',
    shadowHex: '#4F6D54',
    highlightHex: '#F7F3E9',
    accentHex: '#8EC5E8',
    averageLuminance: 0.78,
    contrastSpread: 0.34,
    source: 'canvas-pixels',
  };

  const nightNuance = analyzeTextNuance('Я ходил радостный, гулял по ночной астане, придуривался');
  const vivaldi: MusicSpec = {
    title: 'Vivaldi — Strings in G Minor',
    genre: 'Baroque Strings',
    bpm: 132,
    mode: 'minor',
    energy: 0.85,
    motif: 'baroque-strings',
  };
  const nightDirective = synthesizeVisualDirective(darkPalette, nightNuance, vivaldi);
  assert.equal(nightDirective.ruleId, 'nocturnal-flash-baroque');
  assert.equal(nightDirective.inkPolarity, 'light');
  assert.ok(contrastRatio(nightDirective.gradientStops[0], nightDirective.textColor) >= 4.5);

  const cloudNuance = analyzeTextNuance('Просто красивый, облачный день');
  const acoustic: MusicSpec = {
    title: 'Warm Acoustic Breeze',
    genre: 'Acoustic',
    bpm: 68,
    mode: 'major',
    energy: 0.25,
    motif: 'acoustic-breeze',
  };
  const cloudDirective = synthesizeVisualDirective(brightPalette, cloudNuance, acoustic);
  assert.equal(cloudDirective.ruleId, 'sunlit-paper-air');
  assert.equal(cloudDirective.inkPolarity, 'dark');
  assert.ok(contrastRatio(cloudDirective.gradientStops[0], cloudDirective.textColor) >= 4.5);
});

test('formats memory count headline for 1 to 5 photos', () => {
  assert.equal(getMemoryCountHeadline(1), 'A MEMORY IN ONE MOMENT');
  assert.equal(getMemoryCountHeadline(2), 'A MEMORY IN TWO MOMENTS');
  assert.equal(getMemoryCountHeadline(3), 'A MEMORY IN THREE MOMENTS');
  assert.equal(getMemoryCountHeadline(5), 'A MEMORY IN FIVE MOMENTS');
});

test('paradox step-print marks final frame calm and earlier frames kinetic', () => {
  const nuance = analyzeTextNuance('безумие, день в котором находишь миги спокойствия чудом.');
  const photos = buildMemoryPhotosFromRaw(
    [{ src: '1' }, { src: '2' }, { src: '3' }, { src: '4' }, { src: '5' }],
    'безумие, день в котором находишь миги спокойствия чудом.',
    nuance,
    'paradox-step-print'
  );
  assert.equal(photos.length, 5);
  assert.equal(photos[0].frameTone, 'kinetic');
  assert.equal(photos[4].frameTone, 'calm');
  assert.equal(photos[4].tiltDeg, 0);
});

test('fallback title and caption segmentation stay concise', () => {
  const nuance = analyzeTextNuance('Насколько привычный вид настолько же необычный в своей конфигурации');
  const title = generateDeterministicTitle('Насколько привычный вид настолько же необычный в своей конфигурации', nuance);
  const words = title.split(/\s+/);
  assert.ok(words.length >= 3 && words.length <= 7);
  assert.ok(segmentCaptions('Первая мысль. Вторая мысль о тишине!').length === 2);
});

test('time of day handles English and Russian cues', () => {
  assert.equal(detectTimeOfDay('Early sunrise through my courtyard window'), 'dawn');
  assert.equal(detectTimeOfDay('Тихий закат на кампусе'), 'dusk');
});

test('chooseVisualRule handles courtyard paradox cleanly', () => {
  const nuance = analyzeTextNuance('Насколько привычный вид настолько же необычный в своей конфигурации');
  const palette: ExtractedPalette = {
    swatches: [],
    dominantHex: '#E97B56',
    shadowHex: '#283655',
    highlightHex: '#FFD3B6',
    accentHex: '#FF6B4A',
    averageLuminance: 0.45,
    contrastSpread: 0.62,
    source: 'canvas-pixels',
  };
  const music: MusicSpec = {
    title: 'Lo-Fi Morning Keys',
    genre: 'Lo-Fi',
    bpm: 76,
    mode: 'major',
    energy: 0.4,
    motif: 'lofi-keys',
  };
  assert.equal(chooseVisualRule(palette, nuance, music), 'architectural-halation');
});
