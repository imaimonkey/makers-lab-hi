import { RiskExplorationLens } from '../../features/risk-catalog/RiskExplorationLens'
import { useEffect, useState } from 'react'
import { buildDeveloperRiskCatalogViewData, buildDeveloperStep2Records, type DeveloperRiskCatalogViewData } from '../../features/risk-catalog/developerStep2Adapter'
import { riskExplorationRecords, type RiskExplorationRecord } from '../../domain/risk/riskExplorationDemo'
import { groupArticleSourceRecords, isMeaningfulRiskCandidate, loadArticleSourceRecords, selectArticleGroupRepresentative } from '../../features/risk-dashboard/articleSourceData'

function mergePractitionerRiskRecords(articleRecords: RiskExplorationRecord[]) {
  const merged = new Map<string, RiskExplorationRecord>()
  riskExplorationRecords.forEach((record) => merged.set(record.id, record))
  articleRecords.forEach((record) => merged.set(record.id, record))
  return [...merged.values()]
}

export function RiskCatalogPage({ mode = 'analyst' }: { mode?: 'analyst' | 'developer' }) {
  const [developerRecords, setDeveloperRecords] = useState<RiskExplorationRecord[]>([])
  const [developerViewData, setDeveloperViewData] = useState<DeveloperRiskCatalogViewData>()
  const [practitionerRecords, setPractitionerRecords] = useState<RiskExplorationRecord[]>()
  const [loadError, setLoadError] = useState('')
  useEffect(() => {
    let cancelled = false
    void loadArticleSourceRecords().then((articles) => {
      const viewData = buildDeveloperRiskCatalogViewData(articles, [])
      const candidateArticles = groupArticleSourceRecords(articles.filter(isMeaningfulRiskCandidate)).map(selectArticleGroupRepresentative)
      const records = buildDeveloperStep2Records([], candidateArticles)
      if (cancelled) return
      setDeveloperViewData(viewData)
      setDeveloperRecords(records)
      setPractitionerRecords(mergePractitionerRiskRecords(records))
      setLoadError('')
    }).catch((error) => {
      console.error(error)
      if (!cancelled) setLoadError('src/article 원문을 불러오지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.')
    })
    return () => { cancelled = true }
  }, [mode])

  // The analyst route is the practitioner workflow surface. It keeps the
  // curated examples and adds only meaningful source-backed candidates.
  if (mode === 'analyst') {
    return (
      <div className="page catalog-page seoyeon-visual">
        <RiskExplorationLens sourceRecords={practitionerRecords} developerLaws={developerViewData?.laws} />
      </div>
    )
  }

  if (!developerViewData && !loadError) {
    return (
      <div className="page catalog-page seoyeon-visual">
        <section className="panel article-source-state" role="status">
          <p className="eyebrow">ARTICLE SOURCE</p>
          <h1>원문 자료를 불러오는 중입니다</h1>
          <p>src/article에 연결된 원문을 기준으로 위험 후보와 평가 기준을 구성하고 있습니다.</p>
        </section>
      </div>
    )
  }
  return (
    <div className="page catalog-page seoyeon-visual">
      {loadError ? <section className="panel article-source-state" role="alert"><p className="eyebrow">ARTICLE SOURCE</p><h1>원문 자료를 불러오지 못했습니다</h1><p>{loadError}</p></section> : null}
      {developerViewData ? <div className="article-source-sync-strip" role="status"><strong>기관·문서 자료 연결</strong><span>본문 확보 {developerViewData.counts.bodyReady}건</span><span>상품화 후보 {developerViewData.counts.candidates}건</span><span>법령 자료 {developerViewData.counts.laws}건</span><small>문서의 사실·지표·법령 기준을 위험 후보와 함께 표시합니다.</small></div> : null}
      {developerViewData ? <RiskExplorationLens developerMode={mode === 'developer'} developerLaws={developerViewData.laws} sourceRecords={developerRecords} developerData={developerViewData} /> : null}
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
