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

export interface SemanticThemes {
  school: boolean;
  rain: boolean;
  friends: boolean;
  coffee: boolean;
  music: boolean;
  tension: boolean;
  nostalgia: boolean;
  sky: boolean;
  transit: boolean;
  courtyard: boolean;
}

export function extractSemanticThemes(text: string): SemanticThemes {
  return {
    school: /урок|пар[ауе]|школ|лекц|тетрад|записк|класс|парт|учител|перемен|скучн|class|lesson|school|lecture|desk|notebook|notes|boring/i.test(text),
    rain: /дожд|ливн|мокр|зонт|лужа|пасмурн|туман|сыр|rain|wet|umbrella|puddle|fog|mist|storm|drizzle/i.test(text),
    friends: /друз|подруг|ребят|однокласс|вместе|смея|болтал|компани|friend|buddy|together|crew|hangout/i.test(text),
    coffee: /кофе|кафе|чай|кружк|латте|эспрессо|coffee|cafe|tea|mug|espresso/i.test(text),
    music: /наушник|музык|трек|плейлист|гитар|песн|headphone|airpods|music|song|track|guitar/i.test(text),
    tension: /тревог|напряж|устал|тяжел|беспок|волнен|дедлайн|нерв|один|одиноч|tense|anxious|tired|heavy|stress|deadline|alone/i.test(text),
    nostalgia: /скуча|помн|тепл|детств|стары|давн|забыт|бумаж|письм|ностальг|nostalg|warmth|remember|paper|polaroid/i.test(text),
    sky: /неб|облак|солнц|луч|воздух|ветер|sky|cloud|sun|sunlight|breeze/i.test(text),
    transit: /метро|автобус|поезд|такси|дорог|остановк|вокзал|train|bus|subway|road|station|drive/i.test(text),
    courtyard: /двор|окн|подъезд|дом|фасад|крыш|courtyard|window|building|roof|balcony/i.test(text),
  };
}

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
  const themes = extractSemanticThemes(text);

  const chaosHits = countMatches(text, CHAOS_PATTERNS);
  const calmHits = countMatches(text, CALM_PATTERNS);
  const paradoxHits = countMatches(text, PARADOX_PATTERNS);
  const playfulHits = countMatches(text, PLAYFUL_PATTERNS);
  const kineticHits = countMatches(text, KINETIC_PATTERNS);

  const paradoxDetected =
    (chaosHits > 0 && calmHits > 0) ||
    paradoxHits > 0 ||
    (playfulHits > 0 && timeOfDay === 'night') ||
    (themes.school && themes.friends && themes.nostalgia);

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
  } else if (themes.school && themes.friends) {
    paradoxReason =
      language === 'ru'
        ? 'Скука учебного расписания и живое тепло в мелочах'
        : 'Slow classroom hours brightened by quiet shared humor';
  }

  const pace = Math.min(
    1,
    Math.max(
      0.15,
      0.35 +
        chaosHits * 0.22 +
        kineticHits * 0.18 +
        playfulHits * 0.12 +
        (themes.tension ? 0.14 : 0) -
        calmHits * 0.14 -
        (themes.rain ? 0.08 : 0)
    )
  );
  const playfulness = Math.min(1, playfulHits * 0.32 + (paradoxHits > 0 ? 0.15 : 0) + (themes.friends ? 0.18 : 0));
  const warmth = Math.min(
    1,
    Math.max(
      0.12,
      0.45 +
        (timeOfDay === 'dawn' || timeOfDay === 'dusk' ? 0.25 : 0) +
        (themes.nostalgia || themes.coffee || themes.friends ? 0.2 : 0) +
        (timeOfDay === 'night' || themes.rain ? -0.18 : 0) +
        playfulHits * 0.12 +
        calmHits * 0.08
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
  if (themes.rain) nuanceTags.push(language === 'ru' ? 'Дождь и влага' : 'Rain & mist');
  if (themes.school) nuanceTags.push(language === 'ru' ? 'Учёба и бумага' : 'Class & paper');
  if (themes.nostalgia) nuanceTags.push(language === 'ru' ? 'Тёплая память' : 'Warm nostalgia');
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
  } else if (nuanceTags.length < 2) {
    nuanceTags.push(language === 'ru' ? 'Созерцание' : 'Observational');
  }

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
    nuanceTags: nuanceTags.slice(0, 4),
    voiceoverRate,
    voiceoverPitch,
    captionSegments: segmentCaptions(text),
  };
}

/**
 * Cleanly enforces maxLen without ever appending "..." truncation.
 */
export function sanitizeMicroCaption(text: string, maxLen = 32): string {
  const clean = text.replace(/[.…]+$/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= maxLen) return clean;
  const words = clean.split(' ');
  let out = '';
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length <= maxLen) {
      out = next;
    } else {
      break;
    }
  }
  return out || clean.slice(0, maxLen).trim();
}

/**
 * Synthesizes a poetic, complete 3–6 word title from semantic signals & mood.
 * NEVER slices raw words from the start of the diary input.
 */
export function generateDeterministicTitle(rawText: string, nuance: TextNuanceAnalysis): string {
  const isRu = nuance.language === 'ru';
  const themes = extractSemanticThemes(rawText);

  if (themes.school && (themes.friends || themes.nostalgia || nuance.playfulness >= 0.2)) {
    return isRu ? 'Скучный урок и бумажные записки' : 'Slow Class and Folded Notes';
  }
  if (themes.school) {
    return isRu ? 'Тихий свет пустого класса' : 'Quiet Light Across the Desk';
  }
  if (themes.rain && nuance.timeOfDay === 'night') {
    return isRu ? 'Ночной дождь и мокрый асфальт' : 'Midnight Rain on Wet Asphalt';
  }
  if (themes.rain && themes.coffee) {
    return isRu ? 'Тёплая кружка под шум дождя' : 'Warm Mug Against the Rain';
  }
  if (themes.rain) {
    return isRu ? 'Дождь на холодном стекле' : 'Cold Rain Along the Glass';
  }
  if (themes.transit && nuance.timeOfDay === 'night') {
    return isRu ? 'Поздняя дорога и свет фонарей' : 'Late Transit Under Streetlight';
  }
  if (themes.transit) {
    return isRu ? 'Дорога сквозь меняющийся свет' : 'Frames Along the Moving Road';
  }
  if (themes.courtyard && (nuance.timeOfDay === 'dawn' || nuance.timeOfDay === 'dusk')) {
    return isRu ? 'Привычный двор в редком свете' : 'Familiar Courtyard in Rare Light';
  }
  if (themes.coffee && themes.friends) {
    return isRu ? 'Неспешный разговор за тёплым столом' : 'Unhurried Talk Over Warm Cups';
  }
  if (themes.coffee) {
    return isRu ? 'Пауза и пар над чашкой' : 'Quiet Pause Over Warm Coffee';
  }
  if (nuance.timeOfDay === 'night' && nuance.playfulness >= 0.3) {
    return isRu ? 'Ночная прогулка и вспышка смеха' : 'Midnight Walk and Sudden Joy';
  }
  if (nuance.timeOfDay === 'night' && themes.tension) {
    return isRu ? 'Напряжённая тишина поздней ночи' : 'Sharp Shadows After Midnight';
  }
  if (nuance.timeOfDay === 'night') {
    return isRu ? 'Поздние огни на тихой улице' : 'Late Lights on Quiet Streets';
  }
  if (nuance.paradoxDetected) {
    return isRu ? 'Миг тишины посреди общего шума' : 'Still Pocket Inside the Rush';
  }
  if (themes.sky || nuance.timeOfDay === 'dawn' || nuance.timeOfDay === 'dusk') {
    return isRu ? 'Воздух и мягкий дневной свет' : 'Open Sky and Unhurried Light';
  }
  if (themes.music) {
    return isRu ? 'Один трек и пауза дня' : 'Single Track Through the Day';
  }
  return isRu ? 'Отпечаток дня на тёплой плёнке' : 'Quiet Film Strip of the Day';
}

export function generateDeterministicSubtitle(rawText: string, nuance: TextNuanceAnalysis): string {
  const isRu = nuance.language === 'ru';
  const themes = extractSemanticThemes(rawText);

  if (themes.school && themes.friends) {
    return isRu
      ? 'Когда время тянется медленно, но рядом свои люди.'
      : 'Hours stretch slowly while quiet jokes pass across the desk.';
  }
  if (themes.rain) {
    return isRu
      ? 'Влага на стекле и прохладная синева вокруг обычных улиц.'
      : 'Wet glass and cool blue air turning streets into quiet film.';
  }
  if (nuance.timeOfDay === 'night' && themes.tension) {
    return isRu
      ? 'Резкие тени, поздний воздух и мысли без лишних слов.'
      : 'Sharp night shadows holding the quiet weight of late hours.';
  }
  if (nuance.timeOfDay === 'night') {
    return isRu
      ? 'Ночные огни и короткая свобода после долгого дня.'
      : 'Streetlights and unhurried air after the long day settles.';
  }
  if (nuance.paradoxDetected) {
    return isRu
      ? 'Столкновение суеты и редкой минуты, в которой можно выдохнуть.'
      : 'Where surrounding noise suddenly gives way to clear breath.';
  }
  if (nuance.warmth >= 0.6) {
    return isRu
      ? 'Тёплый свет на простых вещах, которые хочется запомнить.'
      : 'Warm everyday light lingering on things worth keeping.';
  }
  return isRu
    ? 'Живые фрагменты дня, собранные в одну световую линию.'
    : 'Unpolished everyday frames gathered into a single quiet strip.';
}

/**
 * Generates short, complete 2–5 word micro-labels (<= 32 chars, ZERO ellipsis).
 * Combines semantic cues + individual photo brightness/orientation.
 */
export function generatePhotoCaption(
  index: number,
  _total: number,
  rawText: string,
  nuance: TextNuanceAnalysis,
  frameTone: 'kinetic' | 'calm' | 'flash' | 'grounded' | 'airy',
  photoMeta?: { luminance?: number; orientation?: 'portrait' | 'landscape' }
): string {
  const isRu = nuance.language === 'ru';
  const themes = extractSemanticThemes(rawText);
  const lum = photoMeta?.luminance ?? 0.45;
  const isPortrait = photoMeta?.orientation === 'portrait';

  if (themes.school) {
    const ruSchool = isPortrait
      ? ['взгляд между уроками', 'живой смех за партой', 'тетрадь на краю стола', 'записка на полях', 'тихая перемена']
      : ['бумажные записки на парте', 'свет из школьного окна', 'доска и долгий урок', 'тишина пустого класса', 'книги после звонка'];
    const enSchool = isPortrait
      ? ['candid glance in class', 'folded note on the desk', 'notebook margin sketch', 'quiet smile mid-lecture', 'pause between bells']
      : ['folded notes across desks', 'afternoon light on chalk', 'open notebook by window', 'quiet row of desks', 'after the final bell'];
    const pool = isRu ? ruSchool : enSchool;
    return sanitizeMicroCaption(pool[index % pool.length]);
  }

  if (themes.rain) {
    const ruRain = lum < 0.35
      ? ['тёмный мокрый асфальт', 'отсвет фонаря в луже', 'сырой ночной воздух', 'тени под дождём', 'тишина после ливня']
      : ['капли на стекле окна', 'прохладный дождевой свет', 'пасмурное небо над улицей', 'влажные контуры домов', 'чистый воздух после дождя'];
    const enRain = lum < 0.35
      ? ['wet midnight asphalt', 'streetlights in puddles', 'damp shadow at the curb', 'rain-soaked night glass', 'stillness after storm']
      : ['raindrops on window glass', 'cool overcast skyline', 'mist across quiet roofs', 'silver light on stone', 'fresh air after rain'];
    const pool = isRu ? ruRain : enRain;
    return sanitizeMicroCaption(pool[index % pool.length]);
  }

  if (themes.coffee) {
    const ruCoffee = ['пар над тёплой кружкой', 'тихий угол за столом', 'кофе и долгий разговор', 'мягкий свет кофейни', 'пауза посреди дня'];
    const enCoffee = ['steam over warm porcelain', 'quiet corner table', 'unhurried coffee pause', 'soft afternoon cafe light', 'warm cup in cold hands'];
    const pool = isRu ? ruCoffee : enCoffee;
    return sanitizeMicroCaption(pool[index % pool.length]);
  }

  if (themes.transit) {
    const ruTransit = ['окно в вечерней дороге', 'огни мимо стекла', 'остановка на пустой улице', 'движение сквозь город', 'шаги к дому'];
    const enTransit = ['passing lights by window', 'evening road blur', 'quiet station platform', 'city drift in transit', 'last stretch toward home'];
    const pool = isRu ? ruTransit : enTransit;
    return sanitizeMicroCaption(pool[index % pool.length]);
  }

  const poolRu: Record<typeof frameTone, string[]> = {
    kinetic: ['пульс шагов и движения', 'внутри живого потока', 'смазанный кадр на ходу', 'быстрый поворот камеры', 'среди шума зала'],
    calm: ['внезапный миг тишины', 'чистый воздух и покой', 'долгий выдох в тишине', 'мягкий свет без спешки', 'остановившееся мгновение'],
    flash: ['вспышка в тёмном кадре', 'резкий свет поздней ночи', 'случайный портрет в темноте', 'блик фонаря на стекле', 'ночной силуэт'],
    grounded:
      lum > 0.55
        ? ['ясный свет на фасаде', 'геометрия открытого окна', 'тёплый кадр без фильтров', 'утренний воздух во дворе', 'живая деталь дня']
        : ['тихие линии в полутени', 'спокойный контур дома', 'ровный свет в конце дня', 'простая фактура стен', 'пауза перед вечером'],
    airy: ['высокое небо и воздух', 'лёгкий дневной свет', 'облака над крышами', 'прозрачная пауза дня', 'мягкое солнце в окне'],
  };

  const poolEn: Record<typeof frameTone, string[]> = {
    kinetic: ['pulse of hurried steps', 'inside the moving crowd', 'candid frame mid-stride', 'sharp turn through noise', 'restless corridor light'],
    calm: ['sudden pocket of calm', 'quiet breath in dusk', 'unhurried stillness', 'soft light after rush', 'time held still'],
    flash: ['direct flash in the dark', 'sharp midnight contrast', 'candid frame after dark', 'streetlight glare', 'late night silhouette'],
    grounded:
      lum > 0.55
        ? ['clear light on stone', 'open window geometry', 'warm unfiltered frame', 'bright courtyard air', 'honest midday detail']
        : ['quiet lines in half-light', 'steady evening shadow', 'grounded dusk geometry', 'muted wall texture', 'calm before nightfall'],
    airy: ['open sky above roofs', 'soft unhurried daylight', 'drifting afternoon clouds', 'warm air through glass', 'sunlit quiet frame'],
  };

  const list = isRu ? poolRu[frameTone] : poolEn[frameTone];
  return sanitizeMicroCaption(list[index % list.length]);
}
