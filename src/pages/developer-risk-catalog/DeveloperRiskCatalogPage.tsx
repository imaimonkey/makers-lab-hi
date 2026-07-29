import { useEffect, useMemo, useState } from 'react'
import { loadArticleSourceRecords, type ArticleSourceRecord } from '../../features/risk-dashboard/articleSourceData'
import { runStep2Analysis, saveStep2AnalysisResults, step2PromptDefinitions, type Step2AnalysisKey } from '../../features/llm-util/util-2'
import { PageHeader } from '../../shared/components/PageHeader'

const promptLabels: Record<Step2AnalysisKey, string> = {
  candidate: '위험 후보 기본 카드',
  metrics: '8개 스크리닝 지표',
  law: '법률·규제 카드',
  caseLossMarket: '사례·손실·시장 신호',
  articleQueue: '기사 분석 큐',
  candidateReview: '상품개발 후보 검토',
  signalTrend: '위험 신호 추세',
}
const promptCards = step2PromptDefinitions.map(([, key]) => [key, promptLabels[key]] as const)

type AnalysisResult = {
  key: string
  label: string
  text: string
  generatedAt: string
  mode: string
  error?: string
}

function DerivedCard({ result }: { result: AnalysisResult }) {
  let data: Record<string, unknown> | null = null
  try {
    const parsed: unknown = JSON.parse(result.text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, ''))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed as Record<string, unknown>
  } catch { data = null }
  if (!data) return <pre>{result.text}</pre>
  const root = data.candidate ?? data.metrics ?? data.references ?? data.articleQueue ?? data.candidateReview ?? data.signalTrend ?? data
  const record = root && typeof root === 'object' && !Array.isArray(root) ? root as Record<string, unknown> : data
  return <div className="developer-derived-view"><dl>{Object.entries(record).filter(([key]) => !['metricEvidence', 'observations'].includes(key)).slice(0, 12).map(([key, value]) => <div className="developer-derived-field" key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? <ul className="developer-derived-list">{value.slice(0, 8).map((item, index) => <li key={`${String(item)}-${index}`}>{String(item)}</li>)}</ul> : value === null || value === undefined || value === '' ? <span className="developer-derived-empty">확인 필요</span> : String(value)}</dd></div>)}</dl><details className="developer-raw-result"><summary>원본 JSON 결과</summary><pre>{JSON.stringify(data, null, 2)}</pre></details></div>
}

function buildArticleInput(article: ArticleSourceRecord) {
  return JSON.stringify({
    articleId: article.id,
    title: article.title,
    body: article.text,
    sourceName: article.source,
    collectedAt: article.collectedAt,
    knownEvidenceIds: [article.id],
    priorArticles: [],
  }, null, 2)
}

export function DeveloperRiskCatalogPage() {
  const [articles, setArticles] = useState<ArticleSourceRecord[]>([])
  const [selectedArticleId, setSelectedArticleId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [runningKey, setRunningKey] = useState('')
  const [results, setResults] = useState<Record<string, AnalysisResult>>({})
  const [autoRunning, setAutoRunning] = useState(false)
  const [autoProgress, setAutoProgress] = useState({ current: 0, total: 0, fileName: '' })
  const [autoError, setAutoError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  const selectedArticle = useMemo(
    () => articles.find((article) => article.id === selectedArticleId) ?? articles[0],
    [articles, selectedArticleId],
  )

  useEffect(() => {
    let active = true
    loadArticleSourceRecords()
      .then((records) => {
        if (!active) return
        setArticles(records)
        setSelectedArticleId(records[0]?.id ?? '')
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error.message : '아티클 PDF를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const runPrompt = async (key: Step2AnalysisKey, article = selectedArticle) => {
    if (!article) return
    const definition = promptCards.find((item) => item[0] === key)
    if (!definition) return
    const [, label] = definition
    setRunningKey(key)
    setResults((current) => ({ ...current, [key]: { key, label, text: '', generatedAt: new Date().toISOString(), mode: 'loading' } }))
    try {
      const response = await runStep2Analysis(key, JSON.parse(buildArticleInput(article)))
      setResults((current) => ({ ...current, [key]: { key, label, text: response.text, generatedAt: response.generatedAt, mode: response.mode } }))
    } catch (error) {
      setResults((current) => ({ ...current, [key]: { key, label, text: '', generatedAt: new Date().toISOString(), mode: 'error', error: error instanceof Error ? error.message : 'AI 분석에 실패했습니다.' } }))
    } finally {
      setRunningKey('')
    }
  }

  const runAll = async () => {
    for (const [key] of promptCards) await runPrompt(key)
  }

  const runAllArticles = async () => {
    if (autoRunning || !articles.length) return
    setAutoRunning(true)
    setAutoError('')
    setResults({})
    setAutoProgress({ current: 0, total: articles.length, fileName: '' })
    try {
      for (const [index, article] of articles.entries()) {
        setSelectedArticleId(article.id)
        setAutoProgress({ current: index + 1, total: articles.length, fileName: article.fileName })
        for (const [key] of promptCards) await runPrompt(key, article)
      }
    } catch (error) {
      setAutoError(error instanceof Error ? error.message : '아티클 자동 분석에 실패했습니다.')
    } finally {
      setAutoRunning(false)
    }
  }

  const saveResults = async () => {
    if (!selectedArticle || !Object.keys(results).length) return
    try {
      const saved = await saveStep2AnalysisResults({ articleId: selectedArticle.id, fileName: selectedArticle.fileName, results })
      setSaveMessage(`${saved.file ?? '서버 Excel'}에 저장했습니다.`)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : '서버 Excel 저장에 실패했습니다.')
    }
  }

  return (
    <div className="page developer-risk-catalog-page">
      <PageHeader
        step="02"
        eyebrow="DEVELOPER MODE / ARTICLE ANALYSIS"
        title="실제 아티클 기반 위험 후보"
        description="src/article PDF와 Step 2 시스템 프롬프트를 연결해 개발자용 도출값을 확인하는 화면입니다. 모든 결과는 SAMPLE이며 실무자 검토 전 초안입니다."
        status="GEMINI INTEGRATION"
      />

      <div className="sample-notice developer-test-notice"><span>DEVELOPER</span>실제 PDF 본문과 Gemini 분석 결과를 확인하는 테스트 화면입니다. 시스템 프롬프트는 스텝 문서에서 자동으로 읽습니다.</div>

      {loading && <section className="surface-card developer-article-empty"><strong>아티클 PDF를 불러오는 중입니다.</strong></section>}
      {loadError && <section className="surface-card developer-article-empty has-error"><strong>아티클 로딩 실패</strong><p>{loadError}</p></section>}
      {!loading && !loadError && !articles.length && <section className="surface-card developer-article-empty"><strong>연결된 아티클이 없습니다.</strong><p>src/article 폴더의 PDF를 확인해 주세요.</p></section>}

      {!loading && !loadError && selectedArticle && (
        <>
          <section className="surface-card developer-article-selector">
            <div className="developer-article-heading"><div><p className="eyebrow">SOURCE ARTICLE / src/article</p><h2>분석할 아티클 선택</h2></div><span className="developer-mode-chip">PDF EXTRACTED</span></div>
            <div className="developer-article-controls">
              <label htmlFor="developer-article-select">아티클<select id="developer-article-select" value={selectedArticle.id} onChange={(event) => { setSelectedArticleId(event.target.value); setResults({}) }}><option value="" disabled>아티클 선택</option>{articles.map((article) => <option value={article.id} key={article.id}>{article.id} · {article.fileName}</option>)}</select></label>
              <div className="developer-article-meta"><span><strong>{selectedArticle.id}</strong> · {selectedArticle.source}</span><span>{selectedArticle.contentQuality?.chars.toLocaleString('ko-KR')}자 · {selectedArticle.contentQuality?.paragraphs}문단</span></div>
              <div className="developer-run-actions"><button type="button" className="secondary-action developer-run-button" onClick={() => void runAll()} disabled={Boolean(runningKey) || autoRunning}>현재 아티클 실행</button><button type="button" className="primary-action developer-run-button" onClick={() => void runAllArticles()} disabled={Boolean(runningKey) || autoRunning}>{autoRunning ? `자동 분석 ${autoProgress.current}/${autoProgress.total}` : '전체 아티클 자동 분석'}</button><button type="button" className="secondary-action developer-run-button" onClick={() => void saveResults()} disabled={autoRunning || !Object.keys(results).length}>서버 Excel 저장</button></div>
            </div>
            {autoRunning && <p className="developer-save-message" role="status">{autoProgress.current}/{autoProgress.total} · {autoProgress.fileName} 분석 중입니다.</p>}
            {autoError && <p className="developer-inline-error" role="alert">{autoError}</p>}
            {saveMessage && <p className="developer-save-message" role="status">{saveMessage}</p>}
            <details className="developer-article-preview"><summary>추출된 PDF 본문 미리보기</summary><pre>{selectedArticle.text.slice(0, 6000)}</pre></details>
          </section>

          <section className="developer-analysis-grid" aria-label="Step 2 아티클 분석 결과">
            {promptCards.map(([key, label]) => {
              const result = results[key]
              return <article className="surface-card developer-analysis-card" key={key}><div className="developer-analysis-heading"><div><p className="eyebrow">STEP 2 / {key}</p><h2>{label}</h2></div><button type="button" className="secondary-action developer-run-button" onClick={() => void runPrompt(key)} disabled={Boolean(runningKey)}>개별 실행</button></div><div className="developer-analysis-result">{!result && <p className="developer-result-placeholder">이 카드의 프롬프트로 분석을 실행하면 결과가 표시됩니다.</p>}{result?.mode === 'loading' && <p className="developer-result-placeholder">Gemini 분석 중입니다...</p>}{result?.error && <p className="developer-inline-error" role="alert">{result.error}</p>}{result?.text && <DerivedCard result={result} />}</div>{result && !result.error && result.mode !== 'loading' && <small className="developer-analysis-meta">{result.mode.toUpperCase()} · {new Date(result.generatedAt).toLocaleString('ko-KR')} · 근거 {selectedArticle.id}</small>}</article>
            })}
          </section>
        </>
      )}
    </div>
  )
}
