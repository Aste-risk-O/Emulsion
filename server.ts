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
app.use(express.json({ limit: '4mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

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
    const { rawText, photoCount, dominantHex, shadowHex, highlightHex, accentHex, averageLuminance, music } =
      req.body ?? {};

    if (!rawText || typeof rawText !== 'string') {
      res.status(400).json({ error: 'rawText is required' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Analyze this real, unpolished personal diary memory and synthesize its film-developing curation.
Respond strictly in the same primary language as the diary note (Russian if Russian, English if English).

Diary note: """${rawText}"""
Photo count: ${Number(photoCount) || 1}
Extracted pixel colors: dominant=${dominantHex}, shadow=${shadowHex}, highlight=${highlightHex}, accent=${accentHex}, averageLuminance=${averageLuminance}
Music: title="${music?.title || 'Ambient'}", genre="${music?.genre || 'Ambient'}", bpm=${music?.bpm || 84}, mode="${music?.mode || 'major'}", energy=${music?.energy || 0.5}

Rules:
- Respect irony, paradox, quiet moments inside chaos, and nocturnal euphoria without cliché "sad=blue/happy=yellow" tropes.
- Folder title MUST be 3 to 7 thoughtful words.
- Provide exactly ${Math.min(5, Math.max(1, Number(photoCount) || 1))} short Polaroid captions (2 to 6 words each, grounded and human).
- Pick the best visualRuleId from: paradox-step-print, architectural-halation, nocturnal-flash-baroque, sunlit-paper-air, kinetic-emulsion, quiet-monograph.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: '3 to 7 word poetic/grounded folder title' },
            visualRuleId: {
              type: Type.STRING,
              description:
                'One of paradox-step-print, architectural-halation, nocturnal-flash-baroque, sunlit-paper-air, kinetic-emulsion, quiet-monograph',
            },
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
          },
          required: ['title', 'visualRuleId', 'paradoxDetected', 'nuanceTags', 'photoCaptions'],
        },
      },
    });

    const jsonText = (response.text ?? '').trim();
    const parsed = JSON.parse(jsonText);
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
