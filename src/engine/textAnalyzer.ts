import type { LanguageCode, TextNuanceAnalysis, TimeOfDay } from '../types/memory';

const CYRILLIC_RE = /[а-яёА-ЯЁ]/g;
const LATIN_RE = /[a-zA-Z]/g;

const NIGHT_PATTERNS = [
  /ноч/i, /полноч/i, /поздно/i, /фонар/i, /темно/i, /night/i, /midnight/i, /late/i, /2am/i, /3am/i, /streetlight/i,
];
const DAWN_PATTERNS = [
  /утр/i, /рассвет/i, /заря/i, /ранн/i, /dawn/i, /sunrise/i, /morning/i, /early/i,
];
const DUSK_PATTERNS = [
  /закат/i, /сумерк/i, /вечер/i, /dusk/i, /sunset/i, /twilight/i, /evening/i, /golden hour/i,
];

const CHAOS_PATTERNS = [
  /безум/i, /хаос/i, /толп/i, /шум/i, /беготн/i, /сует/i, /олимпиад/i, /экзамен/i,
  /chaos/i, /frantic/i, /crowd/i, /loud/i, /rush/i, /overwhelm/i, /madness/i, /crazy/i,
];
const CALM_PATTERNS = [
  /спокой/i, /тишин/i, /тихо/i, /миг/i, /чудом/i, /облач/i, /просто/i, /неспеш/i, /воздух/i,
  /calm/i, /quiet/i, /still/i, /silence/i, /peace/i, /breathe/i, /pause/i, /gentle/i,
];
const PARADOX_PATTERNS = [
  /насколько.*настолько/i, /необычн/i, /привычн.*необычн/i, /чудом/i, /вдруг/i, /странн/i,
  /ordinary.*extraordinary/i, /familiar.*strange/i, /paradox/i, /somehow/i, /miraculously/i, /yet/i, /amidst/i,
];
const PLAYFUL_PATTERNS = [
  /придурива/i, /радост/i, /смея/i, /улыб/i, /шут/i, /дурач/i, /весел/i, /1510/i, /праздн/i,
  /laugh/i, /goof/i, /smile/i, /joy/i, /grin/i, /silly/i, /celebrat/i, /dance/i, /haha/i,
];
const KINETIC_PATTERNS = [
  /ходил/i, /гулял/i, /беж/i, /ехал/i, /шел/i, /шёл/i, /летел/i, /движ/i,
  /walked/i, /walking/i, /ran/i, /running/i, /wandering/i, /driving/i, /moving/i, /stroll/i,
];

function countMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const re of patterns) {
    if (re.test(text)) count += 1;
  }
  return count;
}

export function detectLanguage(text: string): LanguageCode {
  const cyrillicMatches = text.match(CYRILLIC_RE)?.length ?? 0;
  const latinMatches = text.match(LATIN_RE)?.length ?? 0;
  if (cyrillicMatches > 0 && latinMatches > 0) {
    const ratio = Math.min(cyrillicMatches, latinMatches) / Math.max(cyrillicMatches, latinMatches);
    if (ratio > 0.25) return 'mixed';
  }
  return cyrillicMatches >= latinMatches ? 'ru' : 'en';
}

export function detectTimeOfDay(text: string): TimeOfDay {
  const night = countMatches(text, NIGHT_PATTERNS);
  const dawn = countMatches(text, DAWN_PATTERNS);
  const dusk = countMatches(text, DUSK_PATTERNS);

  if (night > dawn && night > dusk) return 'night';
  if (dawn > night && dawn > dusk) return 'dawn';
  if (dusk > night && dusk > dawn) return 'dusk';
  if (night > 0) return 'night';
  if (dusk > 0) return 'dusk';
  if (dawn > 0) return 'dawn';
  return 'unspecified';
}

export function segmentCaptions(rawText: string): string[] {
  const cleaned = rawText.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  // Split first by sentence boundaries, then gentle clauses if needed
  const rawSentences = cleaned
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const segments: string[] = [];
  for (const sentence of rawSentences) {
    if (sentence.length <= 72) {
      segments.push(sentence);
    } else {
      const clauses = sentence.split(/,\s+/).map((c) => c.trim()).filter(Boolean);
      let current = '';
      for (const clause of clauses) {
        const candidate = current ? `${current}, ${clause}` : clause;
        if (candidate.length <= 72) {
          current = candidate;
        } else {
          if (current) segments.push(current);
          current = clause;
        }
      }
      if (current) segments.push(current);
    }
  }
  return segments;
}

export function analyzeTextNuance(rawText: string): TextNuanceAnalysis {
  const text = rawText.trim();
  const language = detectLanguage(text);
  const timeOfDay = detectTimeOfDay(text);

  const chaosHits = countMatches(text, CHAOS_PATTERNS);
  const calmHits = countMatches(text, CALM_PATTERNS);
  const paradoxHits = countMatches(text, PARADOX_PATTERNS);
  const playfulHits = countMatches(text, PLAYFUL_PATTERNS);
  const kineticHits = countMatches(text, KINETIC_PATTERNS);

  const paradoxDetected =
    (chaosHits > 0 && calmHits > 0) ||
    paradoxHits > 0 ||
    (playfulHits > 0 && timeOfDay === 'night');

  let paradoxReason: string | undefined;
  if (chaosHits > 0 && calmHits > 0) {
    paradoxReason =
      language === 'ru'
        ? 'Контраст между суетой/безумием и внезапной тишиной'
        : 'Tension between surrounding chaos and a sudden pocket of stillness';
  } else if (paradoxHits > 0) {
    paradoxReason =
      language === 'ru'
        ? 'Привычная сцена увидена в необычном, почти сюрреалистичном ракурсе'
        : 'Familiar everyday frame transformed by unexpected geometry or light';
  } else if (playfulHits > 0 && timeOfDay === 'night') {
    paradoxReason =
      language === 'ru'
        ? 'Ночная декорация и приподнятая ироничная радость'
        : 'Nocturnal city setting paired with playful celebration';
  }

  const pace = Math.min(
    1,
    Math.max(0.15, 0.35 + chaosHits * 0.22 + kineticHits * 0.18 + playfulHits * 0.12 - calmHits * 0.14)
  );
  const playfulness = Math.min(1, playfulHits * 0.32 + (paradoxHits > 0 ? 0.15 : 0));
  const warmth = Math.min(
    1,
    Math.max(
      0.15,
      0.45 +
        (timeOfDay === 'dawn' || timeOfDay === 'dusk' ? 0.25 : 0) +
        (timeOfDay === 'night' ? -0.15 : 0) +
        playfulHits * 0.15 +
        calmHits * 0.1
    )
  );

  const stillnessVsMovement: TextNuanceAnalysis['stillnessVsMovement'] =
    pace >= 0.62 ? 'kinetic' : pace <= 0.36 ? 'still' : 'balanced';

  const nuanceTags: string[] = [];
  if (timeOfDay !== 'unspecified') {
    const todLabels: Record<TimeOfDay, string> = {
      dawn: language === 'ru' ? 'Рассвет' : 'Dawn light',
      day: language === 'ru' ? 'Дневной свет' : 'Daylight',
      dusk: language === 'ru' ? 'Сумерки' : 'Dusk glow',
      night: language === 'ru' ? 'Ночь' : 'Night walk',
      unspecified: '',
    };
    if (todLabels[timeOfDay]) nuanceTags.push(todLabels[timeOfDay]);
  }
  if (paradoxDetected) {
    nuanceTags.push(language === 'ru' ? 'Контраст / Парадокс' : 'Contrast & Paradox');
  }
  if (playfulness >= 0.3) {
    nuanceTags.push(language === 'ru' ? 'Ирония и радость' : 'Playful Euphoria');
  }
  if (stillnessVsMovement === 'kinetic') {
    nuanceTags.push(language === 'ru' ? 'Движение' : 'Kinetic Pace');
  } else if (stillnessVsMovement === 'still') {
    nuanceTags.push(language === 'ru' ? 'Тишина и воздух' : 'Stillness & Air');
  } else {
    nuanceTags.push(language === 'ru' ? 'Созерцание' : 'Observational');
  }

  // Voiceover prosody tuned to energy & tone
  const voiceoverRate = Number((0.86 + pace * 0.22 - (stillnessVsMovement === 'still' ? 0.05 : 0)).toFixed(2));
  const voiceoverPitch = Number((0.94 + warmth * 0.12 + playfulness * 0.08).toFixed(2));

  return {
    language,
    timeOfDay,
    paradoxDetected,
    paradoxReason,
    pace: Number(pace.toFixed(2)),
    playfulness: Number(playfulness.toFixed(2)),
    warmth: Number(warmth.toFixed(2)),
    stillnessVsMovement,
    nuanceTags,
    voiceoverRate,
    voiceoverPitch,
    captionSegments: segmentCaptions(text),
  };
}

export function generateDeterministicTitle(rawText: string, nuance: TextNuanceAnalysis): string {
  const words = rawText
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return nuance.language === 'ru' ? 'Неподписанная плёнка дня' : 'Untitled Film Frame';
  }

  if (words.length <= 6) {
    const joined = words.join(' ');
    return joined.charAt(0).toUpperCase() + joined.slice(1);
  }

  // Pick meaningful slice (3-6 words) keeping key nouns/adjectives
  const meaningful = words.filter((w) => w.length > 2);
  const picked = (meaningful.length >= 3 ? meaningful : words).slice(0, 5);
  const title = picked.join(' ');
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function generatePhotoCaption(
  index: number,
  total: number,
  rawText: string,
  nuance: TextNuanceAnalysis,
  frameTone: 'kinetic' | 'calm' | 'flash' | 'grounded' | 'airy'
): string {
  const segments = nuance.captionSegments;
  if (segments.length >= total && segments[index]) {
    const seg = segments[index];
    return seg.length > 52 ? `${seg.slice(0, 49).trim()}…` : seg;
  }

  const isRu = nuance.language === 'ru';
  if (total === 1) {
    return segments[0] && segments[0].length <= 54
      ? segments[0]
      : isRu
        ? 'один кадр без спешки'
        : 'one unhurried frame';
  }

  const poolRu: Record<typeof frameTone, string[]> = {
    kinetic: ['пульс толпы и шаги', 'внутри общего шума', 'движение между залами', 'размытый поток дня'],
    calm: ['внезапный миг тишины', 'воздух и сумерки', 'пауза среди суеты', 'тихий выдох'],
    flash: ['вспышка на ночной улице', 'свет фонаря и эйфория', 'случайный кадр на ходу', 'отражение ночи'],
    grounded: ['линии привычного двора', 'свет в обычном окне', 'геометрия утра', 'тишина фасада'],
    airy: ['облака и лёгкий ветер', 'просто ясный воздух', 'солнечная бумага', 'мягкий дневной свет'],
  };

  const poolEn: Record<typeof frameTone, string[]> = {
    kinetic: ['inside the moving crowd', 'restless steps through the hall', 'rush between rooms', 'kinetic blur'],
    calm: ['ten seconds of stillness', 'quiet dusk pocket', 'a breath outside the noise', 'unhurried pause'],
    flash: ['flash on midnight asphalt', 'streetlight glow & celebration', 'candid frame mid-walk', 'late night echo'],
    grounded: ['familiar concrete lines', 'light across the courtyard', 'quiet geometry', 'morning stillness'],
    airy: ['drifting summer clouds', 'open sky and soft light', 'sunlit paper margin', 'unhurried afternoon'],
  };

  const list = isRu ? poolRu[frameTone] : poolEn[frameTone];
  return list[index % list.length];
}
