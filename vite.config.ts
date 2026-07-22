import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

declare const process: { cwd(): string }
declare const fetch: (input: string, init: Record<string, unknown>) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>

const MAX_PROXY_BODY_BYTES = 100 * 1024
const REPORT_ASSISTANT_PATH = '/api/report-assistant'

type ProxyRequest = {
  method?: string
  on(event: 'data', listener: (chunk: { length?: number; toString(encoding: string): string }) => void): void
  on(event: 'end' | 'error', listener: (error?: Error) => void): void
  destroy(): void
}

type ProxyResponse = { statusCode: number; setHeader(name: string, value: string): void; end(body?: string): void }

const writeJson = (response: ProxyResponse, status: number, value: unknown) => {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(value))
}

const readBody = (request: ProxyRequest): Promise<string> => new Promise((resolve, reject) => {
  let body = ''
  let size = 0
  request.on('data', (chunk) => {
    const part = chunk.toString('utf8')
    size += chunk.length ?? part.length
    if (size > MAX_PROXY_BODY_BYTES) {
      reject(new Error('REQUEST_TOO_LARGE'))
      request.destroy()
      return
    }
    body += part
  })
  request.on('end', () => resolve(body))
  request.on('error', reject)
})

type MiddlewareServer = { middlewares: { use(path: string, handler: (request: unknown, response: unknown) => void): void } }

const installReportAssistantProxy = (server: MiddlewareServer, gasUrl: string) => {
  server.middlewares.use(REPORT_ASSISTANT_PATH, (request, response) => {
    void (async () => {
      const incoming = request as ProxyRequest
      const outgoing = response as ProxyResponse
      if (incoming.method !== 'POST') {
        outgoing.setHeader('Allow', 'POST')
        writeJson(outgoing, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only.' } })
        return
      }
      if (!gasUrl) {
        writeJson(outgoing, 503, { ok: false, error: { code: 'PROXY_URL_MISSING', message: 'VITE_POTENS_PROXY_URL is not configured.' } })
        return
      }

      try {
        const parsed: unknown = JSON.parse(await readBody(incoming))
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          writeJson(outgoing, 400, { ok: false, error: { code: 'INVALID_JSON', message: 'Request body must be an object.' } })
          return
        }
        const body = parsed as Record<string, unknown>
        const action = body.action
        if (!['generateReport', 'generatePolicyDraft', 'askReportQuestion', 'getReportContent', 'saveReportContent'].includes(String(action))) {
          writeJson(outgoing, 400, { ok: false, error: { code: 'INVALID_ACTION', message: 'Unsupported report action.' } })
          return
        }

        const upstreamBody = action === 'generateReport'
          ? { action, riskInput: body.riskInput }
          : action === 'generatePolicyDraft'
            ? { action, reportContext: body.reportContext }
            : action === 'askReportQuestion'
              ? { action, reportContext: body.reportContext, question: body.question, recentConversation: body.recentConversation }
              : action === 'getReportContent'
                ? { action, reportId: body.reportId }
                : { action, reportId: body.reportId, content: body.content }

        const upstream = await fetch(gasUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(upstreamBody), redirect: 'follow' })
        const upstreamText = await upstream.text()
        let upstreamJson: unknown
        try {
          upstreamJson = JSON.parse(upstreamText)
        } catch {
          writeJson(outgoing, 502, { ok: false, error: { code: 'UPSTREAM_RESPONSE_INVALID', message: 'The report service did not return JSON.' } })
          return
        }
        if (!upstream.ok) {
          writeJson(outgoing, 502, { ok: false, error: { code: 'UPSTREAM_HTTP_ERROR', message: `Report service request failed (HTTP ${upstream.status}).` } })
          return
        }
        writeJson(outgoing, 200, upstreamJson)
      } catch (error) {
        const code = error instanceof Error && error.message === 'REQUEST_TOO_LARGE' ? 'REQUEST_TOO_LARGE' : 'VITE_PROXY_ERROR'
        writeJson(outgoing, code === 'REQUEST_TOO_LARGE' ? 413 : 502, { ok: false, error: { code, message: 'Report assistant proxy request failed.' } })
      }
    })()
  })
}

const reportAssistantProxy = (gasUrl: string): Plugin => ({
  name: 'report-assistant-gas-proxy',
  configureServer(server) { installReportAssistantProxy(server as unknown as MiddlewareServer, gasUrl) },
  configurePreviewServer(server) { installReportAssistantProxy(server as unknown as MiddlewareServer, gasUrl) },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [react(), reportAssistantProxy(env.VITE_POTENS_PROXY_URL?.trim() ?? '')] }
})
