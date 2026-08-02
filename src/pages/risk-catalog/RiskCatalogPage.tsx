import { RiskExplorationLens } from '../../features/risk-catalog/RiskExplorationLens'
import { useEffect, useState } from 'react'
import { buildDeveloperRiskCatalogViewData, buildDeveloperStep2Records, type DeveloperRiskCatalogViewData } from '../../features/risk-catalog/developerStep2Adapter'
import type { RiskExplorationRecord } from '../../domain/risk/riskExplorationDemo'
import { loadArticleSourceRecords } from '../../features/risk-dashboard/articleSourceData'
import { readStep2AnalysisResults, runStep2Analysis, saveStep2AnalysisResults, step2PromptDefinitions, type Step2AnalysisKey } from '../../features/llm-util/util-2'
import { searchOfficialLaw } from '../../features/law/lawOpenApi'

export function RiskCatalogPage({ mode = 'analyst' }: { mode?: 'analyst' | 'developer' }) {
  const [developerRecords, setDeveloperRecords] = useState<RiskExplorationRecord[]>([])
  const [developerViewData, setDeveloperViewData] = useState<DeveloperRiskCatalogViewData>()
  const [developerRunning, setDeveloperRunning] = useState(false)
  const loadDeveloperData = async () => {
    const [articles, rows] = await Promise.all([loadArticleSourceRecords(), readStep2AnalysisResults()])
    return { viewData: buildDeveloperRiskCatalogViewData(articles, rows), records: buildDeveloperStep2Records(rows, articles) }
  }
  useEffect(() => {
    if (mode !== 'developer') return
    let cancelled = false
    void loadDeveloperData().then(({ viewData, records }) => {
      if (cancelled) return
      setDeveloperViewData(viewData)
      setDeveloperRecords(records)
    }).catch((error) => {
      if (cancelled) return
      console.error(error)
    })
    return () => { cancelled = true }
  }, [mode])
  const runDeveloperStep2 = async () => {
    if (developerRunning) return
    setDeveloperRunning(true)
    try {
      const articles = await loadArticleSourceRecords()
      for (const article of articles) {
        const results: Record<string, { text: string; mode: string; generatedAt: string }> = {}
        for (const [, key] of step2PromptDefinitions) {
          let officialLawResults: unknown = { status: 'not-requested' }
          if (key === 'law') {
            try {
              officialLawResults = await searchOfficialLaw(article.title.slice(0, 80))
            } catch (error) {
              officialLawResults = { status: 'error', message: error instanceof Error ? error.message : 'official law API error' }
            }
          }
          const result = await runStep2Analysis(key as Step2AnalysisKey, { articleId: article.id, title: article.title, body: article.text, sourceName: article.source ?? '', collectedAt: article.collectedAt ?? new Date().toISOString(), knownEvidenceIds: [article.id, `${article.id}-source`], officialLawResults, priorArticles: [] })
          if (result.mode === 'mock') throw new Error('개발자 화면에서는 mock Step 2 결과를 저장하지 않습니다. Gemini 또는 Potens 연결을 확인하세요.')
          results[key] = { text: result.text, mode: result.mode, generatedAt: result.generatedAt }
        }
        await saveStep2AnalysisResults({ articleId: article.id, fileName: article.fileName, results })
      }
      const { viewData, records } = await loadDeveloperData()
      setDeveloperViewData(viewData)
      setDeveloperRecords(records)
    } catch (error) { console.error(error) }
    finally { setDeveloperRunning(false) }
  }
  return (
    <div className="page catalog-page seoyeon-visual">
      {mode === 'developer' && developerViewData ? <div className="article-source-sync-strip" role="status"><strong>src/article 자동 반영</strong><span>본문 확보 {developerViewData.counts.bodyReady}건</span><span>구조화 후보 {developerViewData.counts.candidates}건</span><span>실제 Step 2 저장 결과 {developerViewData.counts.analyzed}건</span><small>저장 결과가 없어도 PDF 본문 기반 더미 구조화 결과가 표시됩니다.</small></div> : null}
      <RiskExplorationLens developerMode={mode === 'developer'} developerLaws={mode === 'developer' ? (developerViewData?.laws ?? []) : undefined} sourceRecords={mode === 'developer' ? developerRecords : undefined} developerData={mode === 'developer' ? developerViewData : undefined} onRunDeveloperStep2={mode === 'developer' ? runDeveloperStep2 : undefined} developerRunning={developerRunning} />
      {/* <section className="integration-contract surface-card">
        <h2>위험후보는 근거와 함께 관리되는 <em>상품화 후보</em>입니다.</h2>
        <div>
          <p><strong>필수 입력</strong>RiskCandidate, evidenceCount, signalStrength, status</p>
          <p><strong>필수 출력</strong>선택한 riskId를 `/risks/:riskId`로 전달</p>
          <p><strong>금지</strong>근거 없는 AI 점수, 플랫폼 외부 링크만 제공</p>
        </div>
      </section> */}
    </div>
  )
}
