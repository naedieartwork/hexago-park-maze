import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

type NarratorSpeaker = 'naedie' | 'guru';

const VOICE_PROFILE_BY_SPEAKER: Record<
  NarratorSpeaker,
  { voiceName: string; style: string }
> = {
  naedie: {
    voiceName: 'Charon',
    style:
      'Pria dewasa yang hangat, ramah, ceria, dan penuh semangat seperti penjaga kebun binatang yang berbicara dalam Bahasa Indonesia kepada anak usia 4–6 tahun.',
  },
  guru: {
    voiceName: 'Aoede',
    style:
      'Wanita dewasa yang lembut, ramah, sabar, dan penuh kasih sayang seperti guru TK yang membimbing anak usia 4–6 tahun dalam Bahasa Indonesia.',
  },
};

const geminiApiKey = process.env.GEMINI_API_KEY;
const aiClient = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        apiVersion: 'v1beta',
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const ttsResponseCache = new Map<
  string,
  { audioBase64: string; mimeType: string; voiceName: string }
>();
const MAX_TTS_CACHE_ENTRIES = 120;

async function startServer(): Promise<void> {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '64kb' }));

  app.get('/assets/voice/:filename', (req, res, next) => {
    const rawName = path.basename(req.params.filename || '');
    if (!rawName) {
      next();
      return;
    }

    const hyphenName = rawName.replace(/_/g, '-');
    const underscoreName = rawName.replace(/-/g, '_');
    const nameVariants = Array.from(
      new Set([rawName, hyphenName, underscoreName])
    );
    const searchDirs = [
      path.resolve(__dirname, 'public/assets/voice'),
      path.resolve(__dirname, 'src/assets/voice'),
      path.resolve(__dirname, 'assets/voice'),
      path.resolve(__dirname, 'public/assets'),
      path.resolve(__dirname, 'src/assets'),
    ];

    for (const dir of searchDirs) {
      for (const candidate of nameVariants) {
        const fullPath = path.join(dir, candidate);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          res.sendFile(fullPath);
          return;
        }
      }
    }

    next();
  });

  app.post('/api/tts', async (req, res) => {
    try {
      if (!aiClient) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
        return;
      }

      const rawText =
        typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      const rawSpeaker = req.body?.speaker;
      const speaker: NarratorSpeaker =
        rawSpeaker === 'naedie' ? 'naedie' : 'guru';

      if (!rawText) {
        res.status(400).json({ error: 'Text is required for TTS.' });
        return;
      }

      const clippedText = rawText.slice(0, 600);
      const profile = VOICE_PROFILE_BY_SPEAKER[speaker];
      const cacheKey = `${speaker}::${clippedText}`;

      const cached = ttsResponseCache.get(cacheKey);
      if (cached) {
        res.json({
          audioBase64: cached.audioBase64,
          mimeType: cached.mimeType,
          speaker,
          voiceName: cached.voiceName,
          cached: true,
        });
        return;
      }

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: clippedText,
                speechMetadata: {
                  style: profile.style,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: profile.voiceName,
              },
            },
          },
        },
      });

      const inlineData =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Audio = inlineData?.data;
      const mimeType = inlineData?.mimeType || 'audio/wav';

      if (!base64Audio) {
        res.status(502).json({
          error: 'No audio data returned by Gemini TTS.',
        });
        return;
      }

      if (ttsResponseCache.size >= MAX_TTS_CACHE_ENTRIES) {
        const oldestKey = ttsResponseCache.keys().next().value;
        if (oldestKey) {
          ttsResponseCache.delete(oldestKey);
        }
      }
      ttsResponseCache.set(cacheKey, {
        audioBase64: base64Audio,
        mimeType,
        voiceName: profile.voiceName,
      });

      res.json({
        audioBase64: base64Audio,
        mimeType,
        speaker,
        voiceName: profile.voiceName,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'TTS generation failed.';
      const isQuotaError =
        message.includes('"code":429') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('429');

      if (isQuotaError) {
        const retryMatch = message.match(/retryDelay["']?\s*:\s*["']?(\d+)s/i);
        const retryAfterSeconds = retryMatch ? Number(retryMatch[1]) : 30;
        res.status(429).json({
          error: 'TTS quota temporarily reached.',
          retryAfterSeconds,
        });
        return;
      }

      console.warn('[TTS] Generation failed:', message);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/license/verify', async (req, res) => {
    try {
      const supabaseUrl = (
        process.env.VITE_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        ''
      ).trim();
      const supabaseAnonKey = (
        process.env.VITE_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        ''
      ).trim();

      const hasValidServerSupabase =
        Boolean(supabaseUrl) &&
        Boolean(supabaseAnonKey) &&
        /^https?:\/\//i.test(supabaseUrl) &&
        !supabaseUrl.toUpperCase().includes('YOUR_PROJECT_ID') &&
        !supabaseUrl.toUpperCase().includes('TEMPEL_') &&
        !supabaseAnonKey.toUpperCase().includes('YOUR_SUPABASE_ANON') &&
        !supabaseAnonKey.toUpperCase().includes('TEMPEL_');

      if (!hasValidServerSupabase) {
        res.status(503).json({
          configured: false,
          error:
            'Kredensial Supabase (URL & Anon Key) belum terisi di server Secrets maupun supabaseClient.ts.',
        });
        return;
      }

      const p_license_key =
        typeof req.body?.p_license_key === 'string'
          ? req.body.p_license_key.trim().toUpperCase()
          : '';
      const p_device_id =
        typeof req.body?.p_device_id === 'string'
          ? req.body.p_device_id.trim()
          : '';

      if (!p_license_key || !p_device_id) {
        res.status(400).json({
          configured: true,
          error: 'Kode lisensi dan ID perangkat wajib diisi.',
        });
        return;
      }

      const rpcUrl = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/verify_and_activate_license`;
      const rpcRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ p_license_key, p_device_id }),
      });

      const responseText = await rpcRes.text();
      let parsedBody: unknown = null;
      try {
        parsedBody = responseText ? JSON.parse(responseText) : null;
      } catch {
        parsedBody = null;
      }

      if (!rpcRes.ok) {
        const errMsg =
          (parsedBody &&
            typeof parsedBody === 'object' &&
            'message' in parsedBody &&
            typeof (parsedBody as { message?: unknown }).message === 'string' &&
            (parsedBody as { message: string }).message) ||
          `Gagal memverifikasi lisensi ke Supabase (HTTP ${rpcRes.status}).`;
        res.status(rpcRes.status).json({ configured: true, error: errMsg });
        return;
      }

      res.json({ configured: true, data: parsedBody });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal menghubungi server verifikasi Supabase.';
      res.status(500).json({ configured: true, error: msg });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan pada http://0.0.0.0:${PORT}`);
  });
}

void startServer();
