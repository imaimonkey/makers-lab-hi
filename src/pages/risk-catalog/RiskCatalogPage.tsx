import { sampleOnlyNotice } from '../../domain/risk/sampleData'
import { RiskExplorationLens } from '../../features/risk-catalog/RiskExplorationLens'
import { RiskExplorationOperations } from '../../features/risk-catalog/RiskExplorationOperations'
import { PageHeader } from '../../shared/components/PageHeader'
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
  const [developerMessage, setDeveloperMessage] = useState('')
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
      setDeveloperMessage('')
    }).catch((error) => {
      if (cancelled) return
      setDeveloperMessage(error instanceof Error ? `실제 원문 로딩 실패: ${error.message}` : '실제 원문 로딩 실패')
    })
    return () => { cancelled = true }
  }, [mode])
  const runDeveloperStep2 = async () => {
    if (developerRunning) return
    setDeveloperRunning(true); setDeveloperMessage('Step 2 전체 아티클 분석 중...')
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
      setDeveloperMessage('Step 2 결과를 Excel에 저장하고 화면에 반영했습니다.')
    } catch (error) { setDeveloperMessage(error instanceof Error ? error.message : 'Step 2 분석에 실패했습니다.') }
    finally { setDeveloperRunning(false) }
  }
  return (
    <div className="page catalog-page seoyeon-visual">
      <PageHeader
        step="02"
        eyebrow="RISK CANDIDATE CATALOG"
        title="위험 탐색"
        description="새로운 위험 신호를 카테고리와 근거 중심으로 탐색하고 상품화 가능성을 비교합니다."
      />
      <div className="sample-notice"><span>{mode === 'developer' ? 'DEVELOPER' : 'SAMPLE'}</span>{mode === 'developer' ? <><span>Step 2 Gemini/Excel 결과를 이 실무자 UI 형식으로 표시하는 개발자 화면입니다.</span><button type="button" onClick={() => void runDeveloperStep2()} disabled={developerRunning}>{developerRunning ? '분석 중...' : 'Step 2 전체 실행 · Excel 저장'}</button>{developerMessage ? <small role="status">{developerMessage}</small> : null}</> : sampleOnlyNotice}</div>
      <RiskExplorationLens developerMode={mode === 'developer'} developerLaws={mode === 'developer' ? (developerViewData?.laws ?? []) : undefined} sourceRecords={mode === 'developer' ? developerRecords : undefined} developerData={mode === 'developer' ? developerViewData : undefined} onRunDeveloperStep2={mode === 'developer' ? runDeveloperStep2 : undefined} developerRunning={developerRunning} />
      <RiskExplorationOperations developerMode={mode === 'developer'} sourceRisks={mode === 'developer' ? developerViewData?.risks : undefined} developerData={mode === 'developer' ? developerViewData : undefined} onRunDeveloperStep2={mode === 'developer' ? runDeveloperStep2 : undefined} />
      <section className="integration-contract surface-card">
        <span className="contract-label">TEAM 02 INTEGRATION CONTRACT</span>
        <h2>위험후보는 근거와 함께 관리되는 <em>상품화 후보</em>입니다.</h2>
        <div>
          <p><strong>필수 입력</strong>RiskCandidate, evidenceCount, signalStrength, status</p>
          <p><strong>필수 출력</strong>선택한 riskId를 `/risks/:riskId`로 전달</p>
          <p><strong>금지</strong>근거 없는 AI 점수, 플랫폼 외부 링크만 제공</p>
        </div>
      </section>
    </div>
  )
}
