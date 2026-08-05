import { useMemo, useState } from 'react'
import type { ScreeningCategory } from '../../domain/risk/riskScreeningInsights'
import { riskLawTrackingItems, type LawTrackingRiskLevel, type RiskLawTrackingItem } from '../../domain/risk/riskLawTracking'
import type { DeveloperLawQueueItem } from './developerStep2Adapter'

function buildLocalItems(laws: DeveloperLawQueueItem[]): RiskLawTrackingItem[] {
  return laws.map((law) => ({
    id: law.id,
    sourceType: 'administrative',
    typeLabel: law.institution,
    institution: law.institution,
    title: law.title,
    summary: law.description,
    status: law.verificationStatus,
    expectedEffectiveDate: law.date,
    lastUpdated: law.date,
    riskLevel: 'low',
    categories: ['legal'],
    sourceUrl: law.sourceUrl,
    relatedCaseCount: 0,
    relatedLossCount: 0,
    timeline: [{ label: '법령 원문 기준', stage: 'current', date: law.date }],
    beforeChanges: [{ label: '소관·출처', value: law.sourceName }, { label: '문서 기준일', value: law.date }],
    afterChanges: [{ label: '상품화 연결', value: '적용 대상·책임 주체·보상 범위를 후보 위험의 보충 근거로 연결합니다.', emphasis: 'blue' }],
    changeBadge: '원문 근거 연결',
    relatedCases: [],
    relatedLossCases: [],
    checklist: ['근거 ID: ' + law.id, '관련 위험 후보의 책임 주체·적용 범위와 조문 기준을 연결'],
    evidenceIds: [law.id],
  }))
}

function ChangeCard({ title, changes, variant }: { title: string; changes: RiskLawTrackingItem['beforeChanges']; variant: 'before' | 'after' }) {
  return <article className={`risk-law-change-card ${variant}`}><div className="risk-law-change-heading"><div><span className="risk-law-change-dot" aria-hidden="true" /><strong>{title}</strong></div><span>{variant === 'before' ? '법령 기준' : '상품화 연결'}</span></div><ul>{changes.map((change) => <li key={`${change.label}-${change.value}`}><b>{change.label}</b><span className={change.emphasis}>{change.value}</span></li>)}</ul></article>
}

function TrackingTimeline({ item }: { item: RiskLawTrackingItem }) {
  return <div className="risk-law-timeline" aria-label="법령 기준 흐름"><div className="risk-law-timeline-line" aria-hidden="true" />{item.timeline.map((step, index) => <div className={`risk-law-timeline-step ${step.stage}`} key={`${step.label}-${index}`}><span className="risk-law-timeline-marker">{step.stage === 'complete' ? '✓' : index + 1}</span><strong>{step.label}</strong><small>{step.date}</small></div>)}</div>
}

export function RiskLawTrackingPanel({ category, localLaws = [] }: { category: ScreeningCategory; localLaws?: DeveloperLawQueueItem[] }) {
  const sourceItems = useMemo(() => {
    const curatedItems = riskLawTrackingItems
    const articleItems = buildLocalItems(localLaws)
    const knownIds = new Set(curatedItems.map((item) => item.id))
    return [...curatedItems, ...articleItems.filter((item) => !knownIds.has(item.id))]
  }, [localLaws])
  const [query, setQuery] = useState('')
  const [institution, setInstitution] = useState('all')
  const [riskLevel, setRiskLevel] = useState<LawTrackingRiskLevel | 'all'>('all')
  const [caseTab, setCaseTab] = useState<'precedent' | 'loss'>('precedent')
  const [selectedId, setSelectedId] = useState(sourceItems[0]?.id ?? '')
  const institutions = useMemo(() => Array.from(new Set(sourceItems.map((item) => item.institution))), [sourceItems])
  const items = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    return sourceItems.filter((item) => {
      const categoryMatch = category === 'all' || item.categories.includes(category)
      const institutionMatch = institution === 'all' || item.institution === institution
      const riskMatch = riskLevel === 'all' || item.riskLevel === riskLevel
      const queryMatch = !normalized || `${item.title} ${item.institution} ${item.summary}`.toLocaleLowerCase('ko-KR').includes(normalized)
      return categoryMatch && institutionMatch && riskMatch && queryMatch
    })
  }, [category, institution, query, riskLevel, sourceItems])
  const selected = items.find((item) => item.id === selectedId) ?? items[0]

  return <section className="risk-law-tracking">
    <div className="risk-law-tracking-sidebar">
    <div className="risk-law-filter-panel">
      <label className="risk-law-search"><span className="sr-only">법령 검색</span><input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="법령명·소관부처·내용 검색" /></label>
      <div className="risk-law-filter-selects"><label><span className="sr-only">소관부처</span><select value={institution} onChange={(event) => setInstitution(event.currentTarget.value)}><option value="all">소관부처·기관 전체</option>{institutions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span className="sr-only">위험 수준</span><select value={riskLevel} onChange={(event) => setRiskLevel(event.currentTarget.value as LawTrackingRiskLevel | 'all')}><option value="all">리스크 레벨·전체</option><option value="high">높음</option><option value="medium">중간</option><option value="low">낮음</option></select></label></div>
    </div>
    <div className="risk-law-list" aria-label="법령 목록">{items.map((item) => <button type="button" className={`risk-law-list-item ${item.id === selected?.id ? 'active' : ''}`} key={item.id} onClick={() => setSelectedId(item.id)}><div className="risk-law-list-meta"><b>{item.institution}</b><em className={`is-${item.riskLevel}`}>{item.changeBadge}</em></div><strong>{item.title}</strong><small>{item.summary}</small><span className="risk-law-list-priority">적용 기준일 {item.expectedEffectiveDate}</span></button>)}{!items.length ? <p className="risk-law-empty">조건에 맞는 법령 자료가 없습니다.</p> : null}</div>
    </div>
      {selected ? <article className="risk-law-detail">
        <header className="risk-law-detail-heading"><div><h3>{selected.title}</h3><p>{selected.typeLabel} · {selected.status}</p></div>{selected.sourceUrl ? <a href={selected.sourceUrl} target="_blank" rel="noreferrer">원문 확인 ↗</a> : null}</header>
        <p className="risk-law-priority-summary"><strong>{selected.changeBadge}</strong><span>{selected.summary}</span></p>
        <div className="risk-law-timeline-card"><div className="risk-law-card-heading"><h4>법령 기준 흐름</h4><span>문서 기준일 연결</span></div><TrackingTimeline item={selected} /></div>
        <div className="risk-law-change-grid"><ChangeCard title="문서 기준" changes={selected.beforeChanges} variant="before" /><ChangeCard title="상품화 연결" changes={selected.afterChanges} variant="after" /></div>
        <section className="risk-law-cases" aria-labelledby="risk-law-cases-title"><div className="risk-law-section-heading"><div><h4 id="risk-law-cases-title">⚖️ 연관 법원 판례 및 실제 손해 사례</h4><span>법령 기준과 연결된 보충 자료</span></div><div className="risk-law-case-tabs" role="tablist" aria-label="연관 사례 유형"><button type="button" role="tab" aria-selected={caseTab === 'precedent'} className={caseTab === 'precedent' ? 'active' : ''} onClick={() => setCaseTab('precedent')}>관련 판례 ({selected.relatedCases.length})</button><button type="button" role="tab" aria-selected={caseTab === 'loss'} className={caseTab === 'loss' ? 'active' : ''} onClick={() => setCaseTab('loss')}>사고·손해 사례 ({selected.relatedLossCases.length})</button></div></div>{(caseTab === 'precedent' ? selected.relatedCases : selected.relatedLossCases).length ? <div className="risk-law-case-list">{(caseTab === 'precedent' ? selected.relatedCases : selected.relatedLossCases).map((item) => <article className="risk-law-case-card" key={item.caseNumber}><div className="risk-law-case-meta"><span>{item.type}</span><b>{item.caseNumber}</b><em>{item.badge}</em></div><h5>{item.title}</h5><div className="risk-law-case-summary"><p><b>쟁점</b>{item.issue}</p><p><b>판단</b>{item.judgment}</p></div><div className="risk-law-case-footer"><span>확인 금액</span><strong>{item.award}</strong></div></article>)}</div> : <p className="risk-law-empty">현재 연결된 사례가 없으며, 법령 원문 기준을 상품화 후보의 보충 근거로 연결하고 있습니다.</p>}</section>
        <div className="risk-law-detail-footer"><span>적용 기준일 <strong>{selected.expectedEffectiveDate}</strong></span><span>근거 ID <strong>{selected.evidenceIds[0]}</strong></span>{selected.sourceUrl ? <a href={selected.sourceUrl} target="_blank" rel="noreferrer">원문 확인 ↗</a> : null}</div>
      </article> : <div className="risk-law-detail risk-law-empty">법령 자료를 불러오는 중입니다.</div>}
  </section>
}
