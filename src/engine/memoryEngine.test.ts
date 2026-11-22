import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeTextNuance,
  detectLanguage,
  detectTimeOfDay,
  generateDeterministicSubtitle,
  generateDeterministicTitle,
  sanitizeMicroCaption,
  segmentCaptions,
} from './textAnalyzer';
import {
  buildCouplingExplanation,
  buildMemoryPhotosFromRaw,
  chooseNewDayVisualMode,
  chooseVisualRule,
  contrastRatio,
  getMemoryCountHeadline,
  pickMusicForMood,
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

test('never slices raw diary text into title or polaroid captions and keeps <=32 chars without ellipsis', () => {
  const schoolNote =
    'Сегодня всю пару по физике сидели с друзьями на задней парте и перекидывались смешными бумажными записками пока учитель не видел.';
  const nuance = analyzeTextNuance(schoolNote);
  const title = generateDeterministicTitle(schoolNote, nuance);
  const subtitle = generateDeterministicSubtitle(schoolNote, nuance);

  assert.ok(!title.startsWith('Сегодня всю пару'));
  assert.ok(!title.includes('...'));
  assert.ok(!subtitle.includes('...'));

  const photos = buildMemoryPhotosFromRaw(
    [
      { src: 'a', orientation: 'portrait', luminance: 0.6 },
      { src: 'b', orientation: 'landscape', luminance: 0.48 },
      { src: 'c', orientation: 'portrait', luminance: 0.35 },
    ],
    schoolNote,
    nuance,
    'light-leak-double-exposure'
  );

  for (const p of photos) {
    assert.ok(p.caption.length > 0 && p.caption.length <= 32, `caption too long: ${p.caption}`);
    assert.ok(!p.caption.includes('...') && !p.caption.includes('…'));
    assert.ok(!schoolNote.startsWith(p.caption));
  }

  assert.equal(sanitizeMicroCaption('очень длинная тестовая подпись для карточки поляроида...', 32).includes('...'), false);
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

test('routes + New Day cleanly across all 5 distinct visual modes and couples BPM/borders', () => {
  const warmPalette: ExtractedPalette = {
    swatches: [],
    dominantHex: '#D89A6C',
    shadowHex: '#33241D',
    highlightHex: '#F9E7D2',
    accentHex: '#E68449',
    averageLuminance: 0.62,
    contrastSpread: 0.5,
    source: 'canvas-pixels',
  };
  const coolRainPalette: ExtractedPalette = {
    swatches: [],
    dominantHex: '#2D4F73',
    shadowHex: '#101B29',
    highlightHex: '#AEC6DE',
    accentHex: '#5A89B8',
    averageLuminance: 0.34,
    contrastSpread: 0.48,
    source: 'canvas-pixels',
  };
  const darkPalette: ExtractedPalette = {
    swatches: [],
    dominantHex: '#1B1F2E',
    shadowHex: '#08090F',
    highlightHex: '#D6D8E0',
    accentHex: '#E08C45',
    averageLuminance: 0.16,
    contrastSpread: 0.78,
    source: 'canvas-pixels',
  };

  // 1. Dawn Halation (warm coffee/morning + cream borders)
  const dawnText = 'Тихое раннее утро, тёплый кофе на кухне';
  const dawnNuance = analyzeTextNuance(dawnText);
  const dawnMusic = pickMusicForMood(warmPalette, dawnNuance, dawnText);
  const dawnMode = chooseNewDayVisualMode(warmPalette, dawnNuance, dawnMusic, dawnText);
  assert.equal(dawnMode, 'dawn-halation');
  assert.equal(synthesizeVisualDirective(warmPalette, dawnNuance, dawnMusic, dawnMode).borderTone, 'cream');

  // 2. Light-Leak Double Exposure (warm nostalgic school notes + cream borders)
  const schoolText = 'Скучный урок с друзьями, смеялись и писали записки в тетради';
  const schoolNuance = analyzeTextNuance(schoolText);
  const schoolMusic = pickMusicForMood(warmPalette, schoolNuance, schoolText);
  const schoolMode = chooseNewDayVisualMode(warmPalette, schoolNuance, schoolMusic, schoolText);
  assert.equal(schoolMode, 'light-leak-double-exposure');
  assert.equal(synthesizeVisualDirective(warmPalette, schoolNuance, schoolMusic, schoolMode).borderTone, 'cream');

  // 3. Wet Cyanotype (rain + cool blue pixels + cool borders)
  const rainText = 'Иду под холодным дождём и смотрю на мокрые окна';
  const rainNuance = analyzeTextNuance(rainText);
  const rainMusic = pickMusicForMood(coolRainPalette, rainNuance, rainText);
  const rainMode = chooseNewDayVisualMode(coolRainPalette, rainNuance, rainMusic, rainText);
  assert.equal(rainMode, 'wet-cyanotype');
  assert.equal(synthesizeVisualDirective(coolRainPalette, rainNuance, rainMusic, rainMode).borderTone, 'cool');

  // 4. Nocturnal Step-Print (tense night + dark obsidian borders)
  const tenseNightText = 'Поздняя ночь, тяжёлая усталость и тревога перед экзаменом';
  const tenseNuance = analyzeTextNuance(tenseNightText);
  const tenseMusic = pickMusicForMood(darkPalette, tenseNuance, tenseNightText);
  const tenseMode = chooseNewDayVisualMode(darkPalette, tenseNuance, tenseMusic, tenseNightText);
  assert.equal(tenseMode, 'nocturnal-step-print');
  assert.equal(synthesizeVisualDirective(darkPalette, tenseNuance, tenseMusic, tenseMode).borderTone, 'dark');

  // 5. Direct Flash & Grain (high BPM music manually selected)
  const fastMusic: MusicSpec = {
    title: 'Fast Club Pulse',
    genre: 'Electronic',
    bpm: 138,
    mode: 'minor',
    energy: 0.9,
    motif: 'electronic-drift',
  };
  const flashMode = chooseNewDayVisualMode(darkPalette, tenseNuance, fastMusic, tenseNightText);
  assert.equal(flashMode, 'direct-flash-grain');
  const slowDirective = synthesizeVisualDirective(darkPalette, tenseNuance, tenseMusic, tenseMode);
  const fastDirective = synthesizeVisualDirective(darkPalette, tenseNuance, fastMusic, flashMode);
  assert.ok(fastDirective.beatStepMs < slowDirective.beatStepMs);
  assert.ok((fastDirective.particleSpeedMultiplier ?? 1) > (slowDirective.particleSpeedMultiplier ?? 1));
  assert.ok(buildCouplingExplanation(darkPalette, tenseNuance, fastMusic, fastDirective).includes('138 BPM'));
});
