import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

const app = express();
app.use(express.json({ limit: '16mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

interface IncomingImagePart {
  base64: string;
  mimeType?: string;
}

const VALID_VISUAL_MODES = new Set([
  'dawn-halation',
  'nocturnal-step-print',
  'wet-cyanotype',
  'light-leak-double-exposure',
  'direct-flash-grain',
]);

app.post('/api/analyze-memory', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      configured: false,
      error: 'GEMINI_API_KEY is not configured; using deterministic multi-signal engine.',
    });
    return;
  }

  try {
    const {
      rawText,
      photoCount,
      images,
      dominantHex,
      shadowHex,
      highlightHex,
      accentHex,
      averageLuminance,
      autoPickMusic,
      music,
    } = req.body ?? {};

    if (!rawText || typeof rawText !== 'string') {
      res.status(400).json({ error: 'rawText is required' });
      return;
    }

    const expectedCount = Math.min(5, Math.max(1, Number(photoCount) || (Array.isArray(images) ? images.length : 1) || 1));

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    if (Array.isArray(images)) {
      images.slice(0, 5).forEach((img: IncomingImagePart, idx: number) => {
        if (img && typeof img.base64 === 'string' && img.base64.length > 20) {
          parts.push({ text: `Frame ${idx + 1}:` });
          parts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/jpeg',
              data: img.base64,
            },
          });
        }
      });
    }

    const musicContext = autoPickMusic
      ? 'Music selection: AUTO-PICK requested. Choose an evocative track title, genre, BPM (52–150), mode (major/minor), and energy (0.15–0.95) that genuinely fits the emotional cadence and visual light of these photos.'
      : `Music selected by user: title="${music?.title || 'Custom Track'}", genre="${music?.genre || 'Ambient'}", bpm=${music?.bpm || 84}, mode="${music?.mode || 'minor'}", energy=${music?.energy ?? 0.5}. Respect this exact BPM & mood when choosing the visual mode and explaining the coupling.`;

    parts.push({
      text: `Analyze this personal diary memory by LOOKING closely at every uploaded frame above and reading the diary note.
Respond strictly in the primary language of the diary note (Russian if Russian, English if English).

Diary note: """${rawText}"""
Photo count: ${expectedCount}
Extracted Canvas pixels: dominant=${dominantHex}, shadow=${shadowHex}, highlight=${highlightHex}, accent=${accentHex}, averageLuminance=${averageLuminance}
${musicContext}

Strict Editorial Rules:
1. NEVER copy or slice the first words of the diary note as the title, and NEVER copy diary sentences onto Polaroid captions.
2. title: Synthesize a complete, poetic 3–6 word title capturing the core essence/contrast (e.g., "Скучный урок и бумажные записки" or "Midnight Flash After the Score").
3. subtitle: 1 short complete atmospheric line (max 72 chars, no trailing "...") reflecting the day's mood.
4. photoCaptions: Provide EXACTLY ${expectedCount} micro-labels (2–5 words each, STRICTLY <= 32 characters, NEVER end with "..."). Each caption must describe what is ACTUALLY visible in THAT specific numbered frame (people, notes, screens, coffee, sky, gestures, objects) fused with the diary's emotion — like "дурачился по ночной Астане", "1510 на экране", "записки на парте".
5. photoTimestamps: Provide ${expectedCount} brief 1–2 word atmospheric tags in uppercase (max 16 chars, e.g., "DESK · 11:20", "STREET · NIGHT", "WINDOW · DUSK").
6. visualMode: Choose the single best mode from these 5 exact IDs:
   - "dawn-halation": warm nostalgic mornings, golden light, calm warmth, cream borders
   - "nocturnal-step-print": tense/contemplative nights, sharp shadows, dark obsidian borders
   - "wet-cyanotype": rain, overcast cool blue tones, mist, reflective quiet
   - "light-leak-double-exposure": nostalgic school/friends warmth, playful layered afternoons, amber edge leaks
   - "direct-flash-grain": high-BPM (>110) kinetic rush, flashlit late-night portraits, raw 35mm energy
7. couplingExplanation: 1–2 crisp sentences in the diary language explaining how what is seen in the photos + diary mood + music BPM/key produced this visual mode, border tone, and reveal pace.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        systemInstruction:
          'You are the editorial curator of EMULSION, an intimate Polaroid film diary. Observe each uploaded photograph directly, avoid generic clichés, never truncate text with "...", and output valid JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            visualMode: { type: Type.STRING },
            paradoxDetected: { type: Type.BOOLEAN },
            paradoxReason: { type: Type.STRING },
            nuanceTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            photoCaptions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            photoTimestamps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            musicSuggestion: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                genre: { type: Type.STRING },
                bpm: { type: Type.INTEGER },
                mode: { type: Type.STRING },
                energy: { type: Type.NUMBER },
              },
            },
            couplingExplanation: { type: Type.STRING },
          },
          required: [
            'title',
            'subtitle',
            'visualMode',
            'paradoxDetected',
            'nuanceTags',
            'photoCaptions',
            'couplingExplanation',
          ],
        },
      },
    });

    const jsonText = (response.text ?? '').trim();
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    if (typeof parsed.visualMode === 'string' && !VALID_VISUAL_MODES.has(parsed.visualMode)) {
      parsed.visualMode = 'light-leak-double-exposure';
    }
    res.json({ configured: true, result: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gemini analysis failed';
    res.status(502).json({ configured: true, error: message });
  }
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EMULSION server listening on http://localhost:${PORT}`);
  });
}

start();
