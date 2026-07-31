import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { readStep4AnalysisResults, runStep4Analysis, saveStep4AnalysisResults, step4PromptDefinitions, type Step4AnalysisKey } from '../../features/llm-util/util-4'
import { readStep3AnalysisResults, step3PromptDefinitions } from '../../features/llm-util/util-3'
import { loadArticleSourceRecords, type ArticleSourceRecord } from '../../features/risk-dashboard/articleSourceData'
import { ReportPage } from '../../report/ReportPage'
import { createDeveloperReportData } from '../../report/data/developer-report-adapter'
import { createResilientReportProxy } from '../../report/api/resilient-report-proxy'
import '../../report/report.css'

type Result = { text: string; mode: string; model?: string; generatedAt: string; error?: string }
const reportProxy = createResilientReportProxy('/api/report-assistant')

export function DeveloperReportsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [articles, setArticles] = useState<ArticleSourceRecord[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [results, setResults] = useState<Partial<Record<Step4AnalysisKey, Result>>>({})
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { const timer = window.setTimeout(() => { void loadArticleSourceRecords().then((records) => { setArticles(records); setSelectedId(records[0]?.id ?? '') }).catch((reason) => setError(reason instanceof Error ? reason.message : '아티클을 불러오지 못했습니다.')) }, 0); return () => window.clearTimeout(timer) }, [])
  useEffect(() => { const timer = window.setTimeout(() => { const requestedId = searchParams.get('articleId'); if (requestedId && articles.some((record) => record.id === requestedId)) setSelectedId(requestedId) }, 0); return () => window.clearTimeout(timer) }, [articles, searchParams])
  useEffect(() => { if (!selectedId) return; const timer = window.setTimeout(() => { void readStep4AnalysisResults().then((rows) => { const stored = rows.filter((row) => row.articleId === selectedId && row.mode !== 'mock'); setResults(Object.fromEntries(stored.map((row) => [row.step, { text: row.resultJson, mode: row.mode, model: row.model, generatedAt: row.generatedAt }])) as Partial<Record<Step4AnalysisKey, Result>>) }).catch(() => undefined) }, 0); return () => window.clearTimeout(timer) }, [selectedId])
  const article = articles.find((item) => item.id === selectedId) ?? articles[0]
  const hasCompleteStep4 = step4PromptDefinitions.every((key) => Boolean(results[key]))
  const reportData = useMemo(() => article && hasCompleteStep4 ? createDeveloperReportData(article, results) : null, [article, hasCompleteStep4, results])

  const runAll = async () => {
    if (!article || running) return
    setRunning(true); setError(''); setResults({})
    try {
      const existingStep3Rows = await readStep3AnalysisResults()
      const articleStep3Rows = existingStep3Rows.filter((row) => row.articleId === article.id && row.mode !== 'mock')
      if (articleStep3Rows.length < step3PromptDefinitions.length) throw new Error(`Step 3 결과가 완전하지 않습니다. ${article.id}의 위험 상세에서 Step 3 8개 분석을 모두 저장해 주세요.`)
      const nextResults: Record<string, { text: string; mode: string; model?: string; generatedAt: string }> = {}
      for (const key of step4PromptDefinitions) {
        const response = await runStep4Analysis(key, { articleId: article.id, title: article.title, body: article.text, sourceName: article.source ?? 'src/article', collectedAt: article.collectedAt ?? new Date().toISOString(), knownEvidenceIds: [article.id, `${article.id}-source`], priorArticles: [], step3Results: articleStep3Rows.map((row) => ({ step: row.step, resultJson: row.resultJson })) })
        if (response.mode === 'mock') throw new Error('개발자 화면에서는 mock Step 4 결과를 저장하지 않습니다. 실제 LLM 응답을 확인하세요.')
        nextResults[key] = { text: response.text, mode: response.mode, model: response.model, generatedAt: response.generatedAt }
        setResults((current) => ({ ...current, [key]: response }))
        await saveStep4AnalysisResults({ articleId: article.id, fileName: article.fileName, results: nextResults })
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Step 4 분석에 실패했습니다.') } finally { setRunning(false) }
  }

  if (!article) return <div className="page developer-reports-page"><div className="sample-notice"><span>DEVELOPER</span>실제 아티클을 불러오는 중입니다.</div></div>

  if (!reportData) return <div className="page reports-page jh-visual developer-reports-page"><div className="report-generation-slice surface-card"><div className="sample-notice developer-test-notice"><span>DEVELOPER / ACTUAL ARTICLE</span>{article.id} · {article.fileName}</div><div className="developer-article-empty"><strong>Step 4 결과가 아직 없습니다.</strong><p>페이지 3에서 같은 articleId의 Step 3 결과를 저장한 뒤 전체 Step 4를 실행하세요. 결과가 없는 섹션은 보고서에 표시하지 않습니다.</p><button type="button" className="primary-action developer-run-button" onClick={() => void runAll()} disabled={running}>{running ? 'Step 4 분석 중...' : '전체 Step 4 실행'}</button></div></div></div>

  return <div className="page reports-page jh-visual developer-reports-page">
    {error ? <p className="developer-inline-error" role="alert">{error}</p> : null}
    <section className="report-generation-slice surface-card" aria-label="개발자 실제 아티클 리포트">
      <div className="report-page__list-intro">
        <div className="sample-notice developer-test-notice"><span>DEVELOPER / ACTUAL ARTICLE</span>{article.id} · {article.fileName} · Step 4 결과를 실무자 리포트 UI에 대입합니다.</div>
        <div className="report-generation-slice-heading"><div><p className="eyebrow">REPORT GENERATION / ACTUAL ARTICLE</p><h2>실제 아티클 기반 종합 리포트</h2><p>{article.source} · {article.contentQuality?.chars.toLocaleString('ko-KR') ?? '확인 필요'}자 · 모든 판단은 근거와 확인 상태를 함께 표시합니다.</p></div><div><span className="status-badge">ACTUAL ARTICLE</span><button type="button" className="primary-action developer-run-button" onClick={() => void runAll()} disabled={running}>{running ? 'Step 4 분석 중...' : '전체 Step 4 실행'}</button></div></div>
      </div>
      <ReportPage riskData={reportData.riskData} fallbackReport={reportData.report} reportProxy={reportProxy} navigation={navigate} includeLayoutMocks={false} />
    </section>
  </div>
}
