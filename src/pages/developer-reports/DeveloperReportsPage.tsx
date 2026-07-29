import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { readStep4AnalysisResults, runStep4Analysis, saveStep4AnalysisResults, step4PromptDefinitions, type Step4AnalysisKey } from '../../features/llm-util/util-4'
import { loadArticleSourceRecords, type ArticleSourceRecord } from '../../features/risk-dashboard/articleSourceData'
import { ReportPage } from '../../report/ReportPage'
import { createDeveloperReportData } from '../../report/data/developer-report-adapter'
import { createResilientReportProxy } from '../../report/api/resilient-report-proxy'
import '../../report/report.css'

type Result = { text: string; mode: string; model?: string; generatedAt: string; error?: string }
const reportProxy = createResilientReportProxy('/api/report-assistant')

export function DeveloperReportsPage() {
  const navigate = useNavigate()
  const [articles, setArticles] = useState<ArticleSourceRecord[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [results, setResults] = useState<Partial<Record<Step4AnalysisKey, Result>>>({})
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { const timer = window.setTimeout(() => { void loadArticleSourceRecords().then((records) => { setArticles(records); setSelectedId(records[0]?.id ?? '') }).catch((reason) => setError(reason instanceof Error ? reason.message : '아티클을 불러오지 못했습니다.')) }, 0); return () => window.clearTimeout(timer) }, [])
  useEffect(() => { if (!selectedId) return; const timer = window.setTimeout(() => { void readStep4AnalysisResults().then((rows) => { const stored = rows.filter((row) => row.articleId === selectedId); setResults(Object.fromEntries(stored.map((row) => [row.step, { text: row.resultJson, mode: row.mode, model: row.model, generatedAt: row.generatedAt }])) as Partial<Record<Step4AnalysisKey, Result>>) }).catch(() => undefined) }, 0); return () => window.clearTimeout(timer) }, [selectedId])
  const article = articles.find((item) => item.id === selectedId) ?? articles[0]
  const reportData = useMemo(() => article ? createDeveloperReportData(article, results) : null, [article, results])

  const runAll = async () => {
    if (!article || running) return
    setRunning(true); setError(''); setResults({})
    try {
      const nextResults: Record<string, { text: string; mode: string; model?: string; generatedAt: string }> = {}
      for (const key of step4PromptDefinitions) {
        const response = await runStep4Analysis(key, { articleId: article.id, title: article.title, body: article.text, sourceName: article.source ?? 'src/article', collectedAt: article.collectedAt ?? new Date().toISOString(), knownEvidenceIds: [article.id], priorArticles: [] })
        nextResults[key] = { text: response.text, mode: response.mode, model: response.model, generatedAt: response.generatedAt }
        setResults((current) => ({ ...current, [key]: response }))
        await saveStep4AnalysisResults({ articleId: article.id, fileName: article.fileName, results: nextResults })
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Step 4 분석에 실패했습니다.') } finally { setRunning(false) }
  }

  if (!article || !reportData) return <div className="page developer-reports-page"><div className="sample-notice"><span>DEVELOPER</span>분석할 실제 아티클을 불러오는 중입니다.</div></div>

  return <div className="page reports-page jh-visual developer-reports-page">
    {error ? <p className="developer-inline-error" role="alert">{error}</p> : null}
    <section className="report-generation-slice surface-card" aria-label="개발자 실제 아티클 리포트">
      <div className="report-page__list-intro">
        <div className="sample-notice developer-test-notice"><span>DEVELOPER / ACTUAL ARTICLE</span>{article.id} · {article.fileName} · Step 4 결과를 실무자 리포트 UI에 대입합니다.</div>
        <div className="report-generation-slice-heading"><div><p className="eyebrow">REPORT GENERATION / ACTUAL ARTICLE</p><h2>실제 아티클 기반 종합 리포트</h2><p>{article.source} · {article.contentQuality?.chars.toLocaleString('ko-KR') ?? '확인 필요'}자 · 모든 판단은 근거와 확인 상태를 함께 표시합니다.</p></div><div><span className="status-badge">ACTUAL ARTICLE</span><button type="button" className="primary-action developer-run-button" onClick={() => void runAll()} disabled={running}>{running ? 'Step 4 분석 중...' : '전체 Step 4 실행'}</button></div></div>
      </div>
      <ReportPage riskData={reportData.riskData} fallbackReport={reportData.report} reportProxy={reportProxy} navigation={navigate} />
    </section>
  </div>
}
