import { useMemo, useState } from 'react'
import type { ScreeningCategory } from '../../domain/risk/riskScreeningInsights'
import {
  riskLawTrackingItems,
  type LawTrackingCaseTab,
  type LawTrackingRiskLevel,
  type RiskLawTrackingItem,
} from '../../domain/risk/riskLawTracking'

type LawTrackingFilter = 'all' | 'assembly' | 'administrative'

const riskLabels: Record<LawTrackingRiskLevel, string> = {
  high: '🔥 리스크 High',
  medium: '⚠️ 리스크 Medium',
  low: '리스크 Low',
}

const riskClassNames: Record<LawTrackingRiskLevel, string> = {
  high: 'is-high',
  medium: 'is-medium',
  low: 'is-low',
}

function TrackingTimeline({ item }: { item: RiskLawTrackingItem }) {
  return (
    <div className="risk-law-timeline" aria-label="입법 또는 개정 진행 단계">
      <div className="risk-law-timeline-line" aria-hidden="true" />
      {item.timeline.map((step, index) => (
        <div className={`risk-law-timeline-step ${step.stage}`} key={`${step.label}-${index}`}>
          <span className="risk-law-timeline-marker">{step.stage === 'complete' ? '✓' : index + 1}</span>
          <strong>{step.label}</strong>
          <small>{step.date}</small>
        </div>
      ))}
    </div>
  )
}

function ChangeCard({ title, changes, variant }: { title: string; changes: RiskLawTrackingItem['beforeChanges']; variant: 'before' | 'after' }) {
  return (
    <article className={`risk-law-change-card ${variant}`}>
      <div className="risk-law-change-heading">
        <div><span className="risk-law-change-dot" aria-hidden="true" /><strong>{title}</strong></div>
        <span>{variant === 'before' ? '기존 기준' : '변경안 확인'}</span>
      </div>
      <ul>
        {changes.map((change) => <li key={`${change.label}-${change.value}`}><b>{change.label}</b><span className={change.emphasis}>{change.value}</span></li>)}
      </ul>
    </article>
  )
}

function RelatedCases({ item }: { item: RiskLawTrackingItem }) {
  const [caseTab, setCaseTab] = useState<LawTrackingCaseTab>('precedent')
  const currentCase = (caseTab === 'precedent' ? item.relatedCases : item.relatedLossCases)[0]

  return (
    <section className="risk-law-cases" aria-labelledby="risk-law-cases-title">
      <div className="risk-law-section-heading">
        <div><h4 id="risk-law-cases-title">⚖️ 연관 법원 판례 및 실제 손해 사례</h4><span>법안·규제와 연결된 검토 자료</span></div>
        <div className="risk-law-case-tabs" role="tablist" aria-label="연관 사례 유형">
          <button type="button" role="tab" aria-selected={caseTab === 'precedent'} className={caseTab === 'precedent' ? 'active' : ''} onClick={() => setCaseTab('precedent')}>관련 판례 ({item.relatedCaseCount})</button>
          <button type="button" role="tab" aria-selected={caseTab === 'loss'} className={caseTab === 'loss' ? 'active' : ''} onClick={() => setCaseTab('loss')}>사고·손해 사례 ({item.relatedLossCount})</button>
        </div>
      </div>
      {currentCase ? (
        <article className="risk-law-case-card" role="tabpanel">
          <div className="risk-law-case-meta"><span>{currentCase.type}</span><b>{currentCase.caseNumber}</b><em>{currentCase.badge}</em></div>
          <h5>{currentCase.title}</h5>
          <div className="risk-law-case-summary"><p><b>핵심 쟁점</b>{currentCase.issue}</p><p><b>검토 판단</b>{caseTab === 'precedent' ? currentCase.judgment : '사고 발생 사실과 손해 범위는 원문·손해자료 확인이 필요합니다.'}</p></div>
          <div className="risk-law-case-footer"><span>손해액: <strong>{currentCase.award}</strong></span><span className="risk-law-sample-label">SAMPLE · 원문 확인 필요</span></div>
        </article>
      ) : <p className="risk-law-empty">연결된 사례가 없습니다.</p>}
    </section>
  )
}

export function RiskLawTrackingPanel({ category }: { category: ScreeningCategory }) {
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<LawTrackingFilter>('all')
  const [institution, setInstitution] = useState('all')
  const [riskLevel, setRiskLevel] = useState<LawTrackingRiskLevel | 'all'>('all')
  const [selectedId, setSelectedId] = useState(riskLawTrackingItems[0]?.id ?? '')

  const institutions = useMemo(() => Array.from(new Set(riskLawTrackingItems.map((item) => item.institution))), [])
  const items = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    return riskLawTrackingItems.filter((item) => {
      const categoryMatch = category === 'all' || item.categories.includes(category)
      const sourceMatch = sourceFilter === 'all' || item.sourceType === sourceFilter
      const institutionMatch = institution === 'all' || item.institution === institution
      const riskMatch = riskLevel === 'all' || item.riskLevel === riskLevel
      const searchMatch = !normalizedQuery || `${item.title} ${item.institution} ${item.summary}`.toLocaleLowerCase('ko-KR').includes(normalizedQuery)
      return categoryMatch && sourceMatch && institutionMatch && riskMatch && searchMatch
    })
  }, [category, institution, query, riskLevel, sourceFilter])
  const selected = items.find((item) => item.id === selectedId) ?? items[0]

  return (
    <section className="risk-law-tracking" aria-labelledby="risk-law-tracking-title">
      <div className="risk-law-tracking-sidebar">
        <div className="risk-law-filter-panel">
          <label className="risk-law-search"><span className="sr-only">법령 검색</span><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="법령명, 소관부처, 키워드 검색" /></label>
          <div className="risk-law-filter-chips" aria-label="법령 유형 필터">
            <button type="button" className={sourceFilter === 'all' ? 'active' : ''} aria-pressed={sourceFilter === 'all'} onClick={() => setSourceFilter('all')}>전체 보기</button>
            <button type="button" className={sourceFilter === 'assembly' ? 'active' : ''} aria-pressed={sourceFilter === 'assembly'} onClick={() => setSourceFilter('assembly')}>🏛️ 국회 입법</button>
            <button type="button" className={sourceFilter === 'administrative' ? 'active' : ''} aria-pressed={sourceFilter === 'administrative'} onClick={() => setSourceFilter('administrative')}>📄 행정·가이드라인</button>
          </div>
          <div className="risk-law-filter-selects">
            <label><span className="sr-only">소관부처</span><select value={institution} onChange={(event) => setInstitution(event.target.value)}><option value="all">소관부처: 전체</option>{institutions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><span className="sr-only">리스크 레벨</span><select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value as LawTrackingRiskLevel | 'all')}><option value="all">리스크 레벨: 전체</option><option value="high">🔥 High (고위험)</option><option value="medium">⚠️ Medium (주의)</option><option value="low">Low</option></select></label>
          </div>
        </div>
        <div className="risk-law-list" aria-label="법령·규제 목록">
          {items.length ? items.map((item) => (
            <button type="button" className={`risk-law-list-item ${selected?.id === item.id ? 'active' : ''}`} key={item.id} onClick={() => setSelectedId(item.id)}>
              <span className="risk-law-list-meta"><b>{item.typeLabel}</b><em className={riskClassNames[item.riskLevel]}>{riskLabels[item.riskLevel]}</em></span>
              <strong>{item.title}</strong>
              <small>{item.summary}</small>
              <span className="risk-law-list-counts"><i>⚖️ 연관 판례 {item.relatedCaseCount}건</i><i>💥 사고 사례 {item.relatedLossCount}건</i></span>
            </button>
          )) : <p className="risk-law-empty">조건에 맞는 법령·규제가 없습니다.</p>}
        </div>
      </div>
      <div className="risk-law-detail" aria-live="polite">
        {selected ? <>
          <div className="risk-law-detail-heading"><div><h3 id="risk-law-tracking-title">{selected.title}</h3><p>소관: {selected.institution} | 상태: {selected.status} | 예상 시행일: {selected.expectedEffectiveDate}</p></div>{selected.sourceUrl ? <a href={selected.sourceUrl} target="_blank" rel="noreferrer">원문 확인하기 ↗</a> : <span className="risk-law-source-pending">원문 확인 필요</span>}</div>
          <div className="risk-law-update-label">SAMPLE · 최종 업데이트 {selected.lastUpdated}</div>
          <section className="risk-law-timeline-card"><div className="risk-law-card-heading"><h4>📍 입법·개정 진행 단계</h4><span>최근 상태 변경: <strong>{selected.lastUpdated}</strong></span></div><TrackingTimeline item={selected} /></section>
          <section className="risk-law-changes"><div className="risk-law-change-grid"><ChangeCard title="기존 기준" changes={selected.beforeChanges} variant="before" /><ChangeCard title="개정안·현재 기준" changes={selected.afterChanges} variant="after" /></div><span className="risk-law-change-badge">{selected.changeBadge}</span></section>
          <RelatedCases item={selected} />
          <section className="risk-law-checklist"><h4>☑️ 판례 및 법안 반영 대응 체크리스트</h4><ul>{selected.checklist.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <p className="risk-law-disclaimer">SAMPLE · 법률·규제 정보와 사례는 공식 원문·최신성 확인 전 판단 근거로 사용할 수 없습니다. 보험 보장·면책·보험료·가입 가능 여부를 의미하지 않습니다.</p>
        </> : <p className="risk-law-empty">선택할 법령·규제가 없습니다.</p>}
      </div>
    </section>
  )
}
