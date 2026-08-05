import { RiskExplorationLens } from '../../features/risk-catalog/RiskExplorationLens'
import { useEffect, useState } from 'react'
import { buildDeveloperRiskCatalogViewData, buildDeveloperStep2Records, type DeveloperRiskCatalogViewData } from '../../features/risk-catalog/developerStep2Adapter'
import type { RiskExplorationRecord } from '../../domain/risk/riskExplorationDemo'
import { loadArticleSourceRecords } from '../../features/risk-dashboard/articleSourceData'

export function RiskCatalogPage({ mode = 'analyst' }: { mode?: 'analyst' | 'developer' }) {
  const [developerRecords, setDeveloperRecords] = useState<RiskExplorationRecord[]>([])
  const [developerViewData, setDeveloperViewData] = useState<DeveloperRiskCatalogViewData>()
  useEffect(() => {
    let cancelled = false
    void loadArticleSourceRecords().then((articles) => {
      const viewData = buildDeveloperRiskCatalogViewData(articles, [])
      const records = buildDeveloperStep2Records([], articles)
      if (cancelled) return
      setDeveloperViewData(viewData)
      setDeveloperRecords(records)
    }).catch((error) => {
      if (cancelled) return
      console.error(error)
    })
    return () => { cancelled = true }
  }, [mode])
  return (
    <div className="page catalog-page seoyeon-visual">
      {developerViewData ? <div className="article-source-sync-strip" role="status"><strong>기관·문서 자료 연결</strong><span>본문 확보 {developerViewData.counts.bodyReady}건</span><span>상품화 후보 {developerViewData.counts.candidates}건</span><span>법령 자료 {developerViewData.counts.laws}건</span><small>문서의 사실·지표·법령 기준을 위험 후보와 함께 표시합니다.</small></div> : null}
      <RiskExplorationLens developerMode={mode === 'developer'} developerLaws={developerViewData?.laws ?? []} sourceRecords={developerRecords} developerData={developerViewData} />
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
