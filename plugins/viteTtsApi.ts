import type { Connect, Plugin } from 'vite'
import { EdgeTTS } from 'edge-tts-universal'

const TTS_PATH = '/api/tts'
const JAPANESE_VOICE = 'ja-JP-NanamiNeural'
const MAX_TEXT_LENGTH = 500

async function readJsonBody(req: Connect.IncomingMessage): Promise<{ text?: string }> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return {}
  return JSON.parse(raw) as { text?: string }
}

function attachTtsMiddleware(middlewares: Connect.Server): void {
  middlewares.use(TTS_PATH, async (req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Allow', 'POST')
      res.end('Method Not Allowed')
      return
    }

    try {
      const body = await readJsonBody(req)
      const text = body.text?.trim() ?? ''
      if (!text) {
        res.statusCode = 400
        res.end('Missing text')
        return
      }
      if (text.length > MAX_TEXT_LENGTH) {
        res.statusCode = 413
        res.end('Text too long')
        return
      }

      const tts = new EdgeTTS(text, JAPANESE_VOICE, {
        rate: '-5%',
        volume: '+0%',
        pitch: '+0Hz',
      })
      const result = await tts.synthesize()
      const audioBuffer = Buffer.from(await result.audio.arrayBuffer())

      res.statusCode = 200
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Cache-Control', 'private, max-age=3600')
      res.end(audioBuffer)
    } catch (err) {
      console.error('[vite-tts-api]', err)
      res.statusCode = 502
      res.end('TTS synthesis failed')
    }
  })
}

export function viteTtsApi(): Plugin {
  return {
    name: 'vite-tts-api',
    configureServer(server) {
      attachTtsMiddleware(server.middlewares)
    },
    configurePreviewServer(server) {
      attachTtsMiddleware(server.middlewares)
    },
  }
}
