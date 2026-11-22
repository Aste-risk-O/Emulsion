import type { ColorSwatch, ExtractedPalette } from '../types/memory';
import { rgbToHex } from './memorySynthesizer';

interface PixelSample {
  r: number;
  g: number;
  b: number;
  lum: number;
  sat: number;
  isTopThird: boolean;
}

function rgbToSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const d = max - min;
  const l = (max + min) / 2;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to decode image: ${src.slice(0, 64)}`));
    img.src = src;
  });
}

export interface PerPhotoPixelMeta {
  luminance: number;
  dominantHex: string;
  accentHex: string;
  highlightHex: string;
  orientation: 'portrait' | 'landscape';
}

export async function extractPaletteFromImages(
  srcs: string[]
): Promise<{ palette: ExtractedPalette; perPhoto: PerPhotoPixelMeta[] }> {
  const samples: PixelSample[] = [];
  const perPhoto: PerPhotoPixelMeta[] = [];

  const canvas = document.createElement('canvas');
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  for (const src of srcs) {
    try {
      const img = await loadImageElement(src);
      const orientation: 'portrait' | 'landscape' =
        img.naturalHeight > img.naturalWidth * 1.04 ? 'portrait' : 'landscape';

      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      let photoLumSum = 0;
      let photoCount = 0;
      let photoBestAccent = { r: 217, g: 119, b: 54, score: -1 };
      let photoBestHighlight = { r: 244, g: 241, b: 234, count: 0, rSum: 0, gSum: 0, bSum: 0 };
      const photoBuckets = new Map<string, { r: number; g: number; b: number; count: number; score: number }>();

      for (let y = 0; y < size; y += 2) {
        for (let x = 0; x < size; x += 2) {
          const i = (y * size + x) * 4;
          const a = data[i + 3];
          if (a < 128) continue;

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          const sat = rgbToSaturation(r, g, b);

          samples.push({
            r,
            g,
            b,
            lum,
            sat,
            isTopThird: y < size * 0.36,
          });

          photoLumSum += lum;
          photoCount += 1;

          // Score chromatic mood carrier over flat neutral grays
          const qr = Math.round(r / 32) * 32;
          const qg = Math.round(g / 32) * 32;
          const qb = Math.round(b / 32) * 32;
          const key = `${qr},${qg},${qb}`;
          const chromaBoost = 0.6 + sat * 3.8 * (1 - Math.abs(lum - 0.48));
          const existing = photoBuckets.get(key);
          if (existing) {
            existing.r += r;
            existing.g += g;
            existing.b += b;
            existing.count += 1;
            existing.score += chromaBoost;
          } else {
            photoBuckets.set(key, { r, g, b, count: 1, score: chromaBoost });
          }

          const accentScore = sat * (1.2 - Math.abs(lum - 0.5));
          if (accentScore > photoBestAccent.score) {
            photoBestAccent = { r, g, b, score: accentScore };
          }

          if (lum > 0.68) {
            photoBestHighlight.rSum += r;
            photoBestHighlight.gSum += g;
            photoBestHighlight.bSum += b;
            photoBestHighlight.count += 1;
          }
        }
      }

      const topPhotoBucket = Array.from(photoBuckets.values()).sort((a, b) => b.score - a.score)[0];
      const photoDominant = topPhotoBucket
        ? rgbToHex(
            topPhotoBucket.r / topPhotoBucket.count,
            topPhotoBucket.g / topPhotoBucket.count,
            topPhotoBucket.b / topPhotoBucket.count
          )
        : '#3A3A3A';
      const photoAccent = rgbToHex(photoBestAccent.r, photoBestAccent.g, photoBestAccent.b);
      const photoHighlight =
        photoBestHighlight.count > 0
          ? rgbToHex(
              photoBestHighlight.rSum / photoBestHighlight.count,
              photoBestHighlight.gSum / photoBestHighlight.count,
              photoBestHighlight.bSum / photoBestHighlight.count
            )
          : '#F4F1EA';

      perPhoto.push({
        luminance: photoCount > 0 ? Number((photoLumSum / photoCount).toFixed(2)) : 0.4,
        dominantHex: photoDominant,
        accentHex: photoAccent,
        highlightHex: photoHighlight,
        orientation,
      });
    } catch {
      perPhoto.push({
        luminance: 0.4,
        dominantHex: '#3A3A3A',
        accentHex: '#D97736',
        highlightHex: '#F4F1EA',
        orientation: 'landscape',
      });
    }
  }

  if (samples.length === 0) {
    const fallbackSwatches: ColorSwatch[] = [
      { hex: '#2B2927', role: 'dominant', label: 'Midtone Emulsion', weight: 0.35 },
      { hex: '#141312', role: 'shadow', label: 'Shadow Silver', weight: 0.25 },
      { hex: '#EAE4D8', role: 'highlight', label: 'Paper Highlight', weight: 0.2 },
      { hex: '#8A7E72', role: 'sky', label: 'Upper Frame', weight: 0.1 },
      { hex: '#C87D55', role: 'accent', label: 'Warm Halation', weight: 0.1 },
    ];
    return {
      palette: {
        swatches: fallbackSwatches,
        dominantHex: '#2B2927',
        shadowHex: '#141312',
        highlightHex: '#EAE4D8',
        accentHex: '#C87D55',
        averageLuminance: 0.4,
        contrastSpread: 0.5,
        source: 'canvas-pixels',
      },
      perPhoto,
    };
  }

  const buckets = new Map<string, { r: number; g: number; b: number; count: number; score: number }>();
  let lumSum = 0;
  let minLum = 1;
  let maxLum = 0;

  let shadowR = 0, shadowG = 0, shadowB = 0, shadowCount = 0;
  let highR = 0, highG = 0, highB = 0, highCount = 0;
  let skyR = 0, skyG = 0, skyB = 0, skyCount = 0;
  let bestAccent: PixelSample & { score: number } = {
    r: 217,
    g: 119,
    b: 54,
    lum: 0.5,
    sat: 0,
    isTopThird: false,
    score: -1,
  };

  for (const s of samples) {
    lumSum += s.lum;
    if (s.lum < minLum) minLum = s.lum;
    if (s.lum > maxLum) maxLum = s.lum;

    if (s.lum < 0.22) {
      shadowR += s.r;
      shadowG += s.g;
      shadowB += s.b;
      shadowCount += 1;
    }
    if (s.lum > 0.72) {
      highR += s.r;
      highG += s.g;
      highB += s.b;
      highCount += 1;
    }
    if (s.isTopThird) {
      skyR += s.r;
      skyG += s.g;
      skyB += s.b;
      skyCount += 1;
    }

    const accentScore = s.sat * (1.2 - Math.abs(s.lum - 0.52));
    if (accentScore > bestAccent.score) {
      bestAccent = { ...s, score: accentScore };
    }

    const qr = Math.round(s.r / 32) * 32;
    const qg = Math.round(s.g / 32) * 32;
    const qb = Math.round(s.b / 32) * 32;
    const key = `${qr},${qg},${qb}`;
    const existing = buckets.get(key);
    // Prioritize chromatic mood-carrying clusters over dark neutral shadows
    const weight = 0.75 + s.sat * 3.4 * (1 - Math.abs(s.lum - 0.5));
    if (existing) {
      existing.r += s.r;
      existing.g += s.g;
      existing.b += s.b;
      existing.count += 1;
      existing.score += weight;
    } else {
      buckets.set(key, { r: s.r, g: s.g, b: s.b, count: 1, score: weight });
    }
  }

  const sortedBuckets = Array.from(buckets.values()).sort((a, b) => b.score - a.score);
  const topBucket = sortedBuckets[0];
  const dominantHex = topBucket
    ? rgbToHex(topBucket.r / topBucket.count, topBucket.g / topBucket.count, topBucket.b / topBucket.count)
    : '#3A3A3A';

  const shadowHex =
    shadowCount > 0
      ? rgbToHex(shadowR / shadowCount, shadowG / shadowCount, shadowB / shadowCount)
      : rgbToHex(samples[0].r * 0.3, samples[0].g * 0.3, samples[0].b * 0.3);

  const highlightHex =
    highCount > 0
      ? rgbToHex(highR / highCount, highG / highCount, highB / highCount)
      : rgbToHex(
          Math.min(255, samples[0].r + 70),
          Math.min(255, samples[0].g + 70),
          Math.min(255, samples[0].b + 70)
        );

  const skyHex =
    skyCount > 0 ? rgbToHex(skyR / skyCount, skyG / skyCount, skyB / skyCount) : dominantHex;

  const accentHex = rgbToHex(bestAccent.r, bestAccent.g, bestAccent.b);
  const averageLuminance = Number((lumSum / samples.length).toFixed(2));
  const contrastSpread = Number(Math.max(0.1, Math.min(1, maxLum - minLum)).toFixed(2));

  const swatches: ColorSwatch[] = [
    { hex: dominantHex, role: 'dominant', label: 'Mood Carrier', weight: 0.38 },
    { hex: shadowHex, role: 'shadow', label: 'Shadow Floor', weight: 0.24 },
    { hex: highlightHex, role: 'highlight', label: 'Highlight Bloom', weight: 0.16 },
    { hex: skyHex, role: 'sky', label: 'Upper Atmosphere', weight: 0.12 },
    { hex: accentHex, role: 'accent', label: 'Chromatic Accent', weight: 0.1 },
  ];

  return {
    palette: {
      swatches,
      dominantHex,
      shadowHex,
      highlightHex,
      accentHex,
      averageLuminance,
      contrastSpread,
      source: 'canvas-pixels',
    },
    perPhoto,
  };
}
