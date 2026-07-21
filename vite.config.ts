import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

type LlmApiOptions = {
  apiKey: string
  model: string
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
  error?: {
    message?: string
  }
}

function writeJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = []

    request.on('data', (chunk) => chunks.push(String(chunk)))
    request.on('end', () => {
      try {
        resolve(JSON.parse(chunks.join('') || '{}'))
      } catch {
        reject(new Error('Request body must be valid JSON.'))
      }
    })
    request.on('error', reject)
  })
}

function createLlmApiPlugin(options: LlmApiOptions): Plugin {
  return {
    name: 'hi-emerging-risk-llm-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = request.url?.split('?')[0]
        if (pathname !== '/api/llm/generate') {
          next()
          return
        }

        if (request.method !== 'POST') {
          writeJson(response, 405, { error: 'Only POST is supported.' })
          return
        }

        if (!options.apiKey) {
          writeJson(response, 503, { error: 'GEMINI_API_KEY is not configured.' })
          return
        }

        try {
          const body = await readJsonBody(request)
          const prompt = typeof body === 'object'
            && body !== null
            && 'prompt' in body
            && typeof body.prompt === 'string'
            ? body.prompt.trim()
            : ''

          if (!prompt) {
            writeJson(response, 400, { error: 'A prompt is required.' })
            return
          }

          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(options.model)}:generateContent?key=${encodeURIComponent(options.apiKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
              }),
            },
          )
          const payload = await geminiResponse.json() as GeminiResponse

          if (!geminiResponse.ok) {
            writeJson(response, geminiResponse.status, {
              error: payload.error?.message ?? 'Gemini API request failed.',
            })
            return
          }

          const text = payload.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? '')
            .join('')
            .trim()

          if (!text) {
            writeJson(response, 502, { error: 'Gemini returned an empty response.' })
            return
          }

          writeJson(response, 200, {
            text,
            provider: 'gemini',
            model: options.model,
            generatedAt: new Date().toISOString(),
          })
        } catch (error) {
          console.error('LLM development proxy failed.', error)
          writeJson(response, 500, { error: 'The LLM development proxy failed.' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      createLlmApiPlugin({
        apiKey: env.GEMINI_API_KEY ?? '',
        model: env.GEMINI_MODEL || 'gemini-2.5-flash',
      }),
    ],
  }
})
