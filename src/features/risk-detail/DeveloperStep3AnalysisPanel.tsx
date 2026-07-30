import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { readStep3AnalysisResults, runStep3Analysis, saveStep3AnalysisResults, step3PromptDefinitions, type SavedStep3AnalysisRow, type Step3AnalysisKey, type Step3RiskInput } from '../llm-util/util-3'
import { parseStep3Json, step3Text } from './step3ResultAdapter'

type Step3Result = { text: string; mode: string; model?: string; generatedAt: string; error?: string }

function parseResult(text: string): Record<string, unknown> {
  return parseStep3Json(text)
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function listOf(value: unknown): string[] {
  if (!Array.isArray(value)) return textOf(value) ? [textOf(value)] : []
  return value.map(textOf).filter(Boolean)
}

function firstLongText(value: unknown): string {
  if (typeof value === 'string' && value.trim().length >= 24) return value.trim()
  if (!value || typeof value !== 'object') return ''
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstLongText(item)
      if (found) return found
    }
    return ''
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    const found = firstLongText(child)
    if (found) return found
  }
  return ''
}

function resultHighlights(text: string) {
  const root = parseResult(text)
  const values = Object.values(root)
  const first = values.find((value) => value && typeof value === 'object' && !Array.isArray(value))
  const body = first && typeof first === 'object' ? first as Record<string, unknown> : root
  const summary = textOf(body.summary)
    || textOf(body.conclusion)
    || textOf(body.riskStatement)
    || textOf(body.judgment)
    || textOf(body.logicComment)
    || textOf(body.draftMemo)
    || textOf(body.title)
  const nestedArrays = Object.values(body).flatMap((value) => Array.isArray(value) ? value : [])
  const nestedSummary = nestedArrays.map((item) => {
    if (!item || typeof item !== 'object') return ''
    const record = item as Record<string, unknown>
    return step3Text(record.interpretation) || step3Text(record.summary) || step3Text(record.conclusion) || step3Text(record.note)
  }).find(Boolean) || ''
  const bullets = [
    ...listOf(body.nextActions),
    ...listOf(body.nextAction),
    ...listOf(body.blockers),
    ...listOf(body.uncertainty),
    ...listOf(body.uncertainties),
    ...listOf(body.counterpoints),
    ...listOf(body.evidenceIds),
    ...nestedArrays.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const record = item as Record<string, unknown>
      return [record.task, record.question, record.fact, record.evidenceRef, record.interpretation, record.excerpt, record.title, record.label].map((value) => step3Text(value)).filter(Boolean)
    }),
  ].slice(0, 3)
  const rawPreview = text.replace(/```(?:json|markdown)?/gi, '').replace(/```/g, '').replace(/\s+/g, ' ').trim()
  return { summary: summary || nestedSummary || bullets[0] || firstLongText(body) || rawPreview.slice(0, 420), bullets }
}

export function DeveloperStep3AnalysisPanel({ input }: { input: Step3RiskInput }) {
  const navigate = useNavigate()
  const [results, setResults] = useState<Partial<Record<Step3AnalysisKey, Step3Result>>>({})
  const [hasSavedResults, setHasSavedResults] = useState(false)
  const [running, setRunning] = useState<Step3AnalysisKey | 'all' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void readStep3AnalysisResults().then((rows) => {
      if (!active) return
      const stored = rows.filter((row) => row.riskId === input.riskId && row.mode !== 'mock')
      setHasSavedResults(stored.length > 0)
      setResults(Object.fromEntries(stored.map((row: SavedStep3AnalysisRow) => [row.step, { text: row.resultJson, mode: row.mode, model: row.model, generatedAt: row.generatedAt }])) as Partial<Record<Step3AnalysisKey, Step3Result>>)
    }).catch(() => undefined)
    return () => { active = false }
  }, [input.riskId])

  const run = async (key: Step3AnalysisKey) => {
    setRunning(key); setError('')
    try {
      const response = await runStep3Analysis(key, input)
      if (response.mode === 'mock') throw new Error('개발자 화면에서는 mock Step 3 결과를 저장하지 않습니다. 실제 LLM 응답을 확인하세요.')
      const next = { text: response.text, mode: response.mode, model: response.model, generatedAt: response.generatedAt }
      setResults((current) => ({ ...current, [key]: next }))
      await saveStep3AnalysisResults({ riskId: input.riskId, articleId: input.articleId, results: { [key]: next } })
      setHasSavedResults(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Step 3 분석에 실패했습니다.') } finally { setRunning(null) }
  }

  const runAll = async () => {
    setRunning('all'); setError('')
    try {
      const next: Record<string, Step3Result> = {}
      for (const [, key] of step3PromptDefinitions) {
        const response = await runStep3Analysis(key, input)
        if (response.mode === 'mock') throw new Error('개발자 화면에서는 mock Step 3 결과를 저장하지 않습니다. 실제 LLM 응답을 확인하세요.')
        next[key] = { text: response.text, mode: response.mode, model: response.model, generatedAt: response.generatedAt }
        setResults((current) => ({ ...current, [key]: next[key] }))
      }
      await saveStep3AnalysisResults({ riskId: input.riskId, articleId: input.articleId, results: next })
      setHasSavedResults(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Step 3 전체 분석에 실패했습니다.') } finally { setRunning(null) }
  }

  return <section className="surface-card developer-step3-panel" aria-label="Developer Step 3 analysis">
    <div className="panel-heading"><div><p className="eyebrow">DEVELOPER / STEP 3 / UTIL-3</p><h2>위험 상세 AI 분석</h2><p className="panel-heading-description">근거·평가·판단·상품화·담당자 인계 프롬프트를 페이지별로 실행합니다.</p></div><div className="developer-run-actions"><button type="button" className="primary-action developer-run-button" onClick={() => void runAll()} disabled={running !== null}>{running === 'all' ? '전체 분석 중...' : '전체 Step 3 실행'}</button><button type="button" className="secondary-action developer-run-button" onClick={() => navigate(`/developer-test/reports?articleId=${encodeURIComponent(input.articleId)}`)} disabled={!hasSavedResults || running !== null}>Step 4 리포트로 이동 →</button></div></div>
    {error ? <p className="developer-inline-error" role="alert">{error}</p> : null}
    <div className="developer-step3-card-grid">{step3PromptDefinitions.map(([fileName, key]) => {
      const result = results[key]
      const highlights = result ? resultHighlights(result.text) : { summary: '', bullets: [] }
      return <article className={`developer-step3-card ${result ? 'is-complete' : 'is-pending'}`} key={key}>
        <div className="developer-step3-card-heading"><div><strong>{key}</strong><small>{fileName}</small></div><span>{result ? '결과 저장됨' : '실행 대기'}</span></div>
        <button type="button" className="secondary-action developer-run-button" onClick={() => void run(key)} disabled={running !== null}>{running === key ? '분석 중...' : result ? '다시 실행' : '개별 실행'}</button>
        {result ? <><div className="developer-step3-result-meta"><span>{result.mode.toUpperCase()}</span><span>{result.model || '모델 정보 없음'}</span><time>{new Date(result.generatedAt).toLocaleString('ko-KR')}</time></div><p className="developer-step3-summary">{highlights.summary || '구조화된 요약 필드가 없어 원문 결과에서 확인해야 합니다.'}</p>{highlights.bullets.length ? <ul className="developer-step3-highlights">{highlights.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}<details><summary>전체 결과 보기</summary><pre>{result.text}</pre></details></> : <p className="developer-step3-pending">아직 실행하지 않았습니다. 실행 후 결과·모델·생성시각이 이 카드에 저장됩니다.</p>}
      </article>
    })}</div>
  </section>
}
