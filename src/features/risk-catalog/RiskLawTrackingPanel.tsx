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
    timeline: [
      { label: '법령 원문 기준', stage: 'complete', date: law.date },
      { label: '적용 조항·대상 확인', stage: 'complete', date: '조문 연결' },
      { label: '보험료·책임 기준 연결', stage: 'current', date: '상품화 영향 검토' },
      { label: '예외·제재·시행 기준', stage: 'pending', date: '원문 추가 확인' },
      { label: '상품화 후보 반영', stage: 'pending', date: '담당자 검토' },
    ],
    beforeChanges: [
      { label: '소관·출처', value: law.sourceName },
      { label: '적용 대상', value: `${law.title}의 적용 대상과 부담 주체를 원문 조항 기준으로 구분합니다.` },
      { label: '핵심 내용', value: law.description },
      { label: '문서 기준일', value: law.date },
    ],
    afterChanges: [
      { label: '적용 범위', value: '관련 사업자·근로자·보험관계의 적용 범위와 예외를 조문 기준으로 연결합니다.', emphasis: 'red' },
      { label: '보험·책임', value: '보험료·보수·책임 주체·보상 범위를 신규 위험의 상품화 검토 항목으로 분리합니다.', emphasis: 'red' },
      { label: '추가 근거', value: '시행령·고시·유권해석·관련 판례의 적용 여부를 원문과 함께 확인합니다.', emphasis: 'blue' },
      { label: '검토 결과', value: '적용 대상·책임 주체·보장 범위가 확인되면 후보 위험의 보충 근거로 반영합니다.', emphasis: 'blue' },
    ],
    changeBadge: '법령 원문·적용 기준 연결',
    relatedCases: [],
    relatedLossCases: [],
    checklist: ['법령 원문·적용 기준 확인', '관련 위험 후보의 책임 주체·적용 범위와 조문 기준을 연결'],
    evidenceIds: [law.id],
  }))
}

function ChangeCard({ title, changes, variant }: { title: string; changes: RiskLawTrackingItem['beforeChanges']; variant: 'before' | 'after' }) {
  return <article className={`risk-law-change-card ${variant}`}><div className="risk-law-change-heading"><div><span className="risk-law-change-dot" aria-hidden="true" /><strong>{title}</strong></div><span>{variant === 'before' ? '법령 기준' : '상품화 연결'}</span></div><ul>{changes.map((change) => <li key={`${change.label}-${change.value}`}><b>{change.label}</b><span className={change.emphasis}>{change.value}</span></li>)}</ul></article>
}

function TrackingTimeline({ item }: { item: RiskLawTrackingItem }) {
  return <div className="risk-law-timeline" aria-label="법령 기준 흐름"><div className="risk-law-timeline-line" aria-hidden="true" />{item.timeline.map((step, index) => <div className={`risk-law-timeline-step ${step.stage}`} key={`${step.label}-${index}`}><span className="risk-law-timeline-marker">{step.stage === 'complete' ? '✓' : index + 1}</span><strong>{step.label}</strong><small>{step.date}</small></div>)}</div>
}

function InsuranceClauseCard({ item }: { item: RiskLawTrackingItem }) {
  if (!item.insuranceClauseCandidates?.length) return null
  const heading = item.insuranceMandate ? '가입 의무 보험 약관 검토 조항' : '관련 보험 약관 검토 조항'
  return <section className="risk-law-insurance-clauses" aria-labelledby="risk-law-insurance-clauses-title"><div className="risk-law-section-heading"><div><h4 id="risk-law-insurance-clauses-title">{heading}</h4><span>법령에 확인되는 내용과 약관 설계가 필요한 항목을 구분해 제시합니다.</span></div><em>원문 연결</em></div><div className="risk-law-insurance-clause-list">{item.insuranceClauseCandidates.map((clause) => <article className="risk-law-insurance-clause" key={clause.title}><div><strong>{clause.title}</strong><em className={`is-${clause.status === '법령 연결' ? 'law' : clause.status === '하위법령 확인' ? 'decree' : 'design'}`}>{clause.status}</em></div><p>{clause.detail}</p><a href={clause.sourceUrl} target="_blank" rel="noreferrer">{clause.sourceLabel} 원문 →</a></article>)}</div></section>
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
    <div className="risk-law-list" aria-label="법령 목록">{items.map((item) => <button type="button" className={`risk-law-list-item ${item.id === selected?.id ? 'active' : ''}`} key={item.id} onClick={() => setSelectedId(item.id)}><div className="risk-law-list-meta"><b>{item.institution}</b><em className={`is-${item.riskLevel}`}>{item.changeBadge}</em></div><strong>{item.title}</strong><small>{item.summary}</small></button>)}{!items.length ? <p className="risk-law-empty">조건에 맞는 법령 자료가 없습니다.</p> : null}</div>
    </div>
      {selected ? <article className="risk-law-detail">
        <header className="risk-law-detail-heading"><div><h3>{selected.title}</h3><p>{selected.typeLabel} · {selected.status}</p></div>{selected.sourceUrl ? <a href={selected.sourceUrl} target="_blank" rel="noreferrer">원문 확인 ↗</a> : null}</header>
        <p className="risk-law-priority-summary"><strong>{selected.changeBadge}</strong><span>{selected.summary}</span></p>
        <div className="risk-law-timeline-card"><div className="risk-law-card-heading"><h4>법령 기준 흐름</h4><span>문서 기준일 연결</span></div><TrackingTimeline item={selected} /></div>
        <div className="risk-law-change-grid"><ChangeCard title="문서 기준" changes={selected.beforeChanges} variant="before" /><ChangeCard title="상품화 연결" changes={selected.afterChanges} variant="after" /></div>
        <section className="risk-law-cases" aria-labelledby="risk-law-cases-title"><div className="risk-law-section-heading"><div><h4 id="risk-law-cases-title">⚖️ 연관 법원 판례 및 실제 손해 사례</h4><span>법령 기준과 연결된 보충 자료</span></div><div className="risk-law-case-tabs" role="tablist" aria-label="연관 사례 유형"><button type="button" role="tab" aria-selected={caseTab === 'precedent'} className={caseTab === 'precedent' ? 'active' : ''} onClick={() => setCaseTab('precedent')}>관련 판례 ({selected.relatedCases.length})</button><button type="button" role="tab" aria-selected={caseTab === 'loss'} className={caseTab === 'loss' ? 'active' : ''} onClick={() => setCaseTab('loss')}>사고·손해 사례 ({selected.relatedLossCases.length})</button></div></div>{(caseTab === 'precedent' ? selected.relatedCases : selected.relatedLossCases).length ? <div className="risk-law-case-list">{(caseTab === 'precedent' ? selected.relatedCases : selected.relatedLossCases).map((item) => <article className="risk-law-case-card" key={item.caseNumber}><div className="risk-law-case-meta"><span>{item.type}</span><b>{item.caseNumber}</b><em>{item.badge}</em></div><h5>{item.title}</h5><div className="risk-law-case-summary"><p><b>쟁점</b>{item.issue}</p><p><b>판단</b>{item.judgment}</p></div><div className="risk-law-case-footer"><span>확인 금액</span><strong>{item.award}</strong></div></article>)}</div> : <p className="risk-law-empty">현재 연결된 사례가 없으며, 법령 원문 기준을 상품화 후보의 보충 근거로 연결하고 있습니다.</p>}</section>
        <InsuranceClauseCard item={selected} />
      </article> : <div className="risk-law-detail risk-law-empty">법령 자료를 불러오는 중입니다.</div>}
  </section>
}
