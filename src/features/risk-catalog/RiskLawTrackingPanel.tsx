import { useEffect, useMemo, useState } from 'react'
import { getOfficialLawArticle, getOfficialLawDetail, searchOfficialLaw } from '../law/lawOpenApi'
import { searchOfficialPrecedents } from '../law/precedentOpenApi'
import type { ScreeningCategory } from '../../domain/risk/riskScreeningInsights'
import {
  lawProductizationPriority,
  type LawTrackingCaseTab,
  type LawTrackingRiskLevel,
  type RiskLawTrackingItem,
} from '../../domain/risk/riskLawTracking'
import { riskLawTrackingItems } from '../../domain/risk/riskLawTracking'
import type { DeveloperLawQueueItem } from './developerStep2Adapter'

type LawTrackingFilter = 'all' | 'assembly' | 'administrative'

type OfficialLawResult = RiskLawTrackingItem & { sourceUrl: string; officialId: string; lawId?: string }

type OfficialPrecedentResult = {
  id: string
  type: string
  caseNumber: string
  title: string
  badge: string
  issue: string
  judgment: string
  award: string
  sourceUrl?: string
}

function officialPrecedentCases(payload: Record<string, unknown>, query: string): OfficialPrecedentResult[] {
  const rows: Record<string, unknown>[] = []
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((item) => { if (item && typeof item === 'object' && !Array.isArray(item)) rows.push(item as Record<string, unknown>) })
      return
    }
    if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach(visit)
  }
  visit(payload)
  const read = (row: Record<string, unknown>, keys: string[]) => keys.map((key) => row[key]).find((value) => typeof value === 'string' && value.trim()) as string | undefined
  return rows.map<OfficialPrecedentResult | null>((row, index) => {
    const id = read(row, ['판례일련번호', '판례정보일련번호', 'precId', 'id'])
    const title = read(row, ['사건명', 'caseName', 'title'])
    if (!id || !title) return null
    const caseNumber = read(row, ['사건번호', 'caseNumber']) ?? '사건번호 원문 확인 필요'
    const court = read(row, ['법원명', 'court']) ?? '법원명 원문 확인 필요'
    const date = read(row, ['선고일자', 'decisionDate', 'date']) ?? '선고일자 원문 확인 필요'
    const sourceUrl = read(row, ['판례상세링크', 'detailUrl', 'url']) ?? `https://www.law.go.kr/DRF/lawService.do?target=prec&ID=${encodeURIComponent(id)}`
    return {
      id: `official-precedent-${id}-${index}`,
      type: `국가법령정보센터 · ${court}`,
      caseNumber,
      title,
      badge: `공식 판례 API · ${date}`,
      issue: `검색어 “${query}”로 확인된 사건입니다. 판시사항은 판례 본문 원문에서 확인하세요.`,
      judgment: '판결요지는 판례 본문 API 원문 확인 후 기록합니다.',
      award: '손해액·배상액은 판례 본문 원문 확인 필요',
      sourceUrl,
    }
  }).filter((item): item is OfficialPrecedentResult => item !== null)
}

function officialLawItems(payload: Record<string, unknown>, query: string): OfficialLawResult[] {
  const rows: Record<string, unknown>[] = []
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((item) => { if (item && typeof item === 'object' && !Array.isArray(item)) rows.push(item as Record<string, unknown>) })
      return
    }
    if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach(visit)
  }
  visit(payload)
  const read = (row: Record<string, unknown>, keys: string[]) => keys.map((key) => row[key]).find((value) => typeof value === 'string' && value.trim()) as string | undefined
  return rows.map((row, index) => {
    const title = read(row, ['법령명한글', '법령명', 'lawName', 'name', 'title'])
    if (!title) return null
    // Keep both identifiers: MST identifies the search record, while 법령ID is
    // the law-service identifier used for the full article body.
    const lawId = read(row, ['법령일련번호', 'MST']) ?? `${query}-${index + 1}`
    const serviceLawId = read(row, ['법령ID', 'ID', 'lawId'])
    const agency = read(row, ['소관부처명', '소관부처', 'agency', 'institution']) ?? '국가법령정보센터'
    const date = read(row, ['시행일자', '시행일', 'effectiveDate', 'date']) ?? '원문에서 확인 필요'
    const url = read(row, ['법령상세링크', 'detailUrl', 'url']) ?? `https://www.law.go.kr/법령/${encodeURIComponent(title)}`
    return {
      id: `official-law-${lawId}`, officialId: lawId, lawId: serviceLawId, sourceType: 'administrative', typeLabel: '국가법령정보센터', institution: agency,
      title, summary: `국가법령정보 API 검색 결과 · 검색어 ${query}`, status: 'API 원문 확인 필요', expectedEffectiveDate: date, lastUpdated: date, riskLevel: 'low', categories: ['legal'], sourceUrl: url,
      relatedCaseCount: 0, relatedLossCount: 0, timeline: [{ label: 'API 검색 결과', stage: 'current', date }], beforeChanges: [{ label: 'API 상태', value: '법령명·소관부처·시행일 확인 필요' }], afterChanges: [{ label: '실무 확인', value: '상세 원문과 개정 조문을 직접 확인하세요.', emphasis: 'blue' }], changeBadge: 'API 원문 확인 필요', relatedCases: [], relatedLossCases: [], checklist: [`근거 ID: ${lawId}`, '국가법령정보센터 원문·개정 이력 확인 필요'], evidenceIds: [String(lawId)],
    } as OfficialLawResult
  }).filter((item): item is OfficialLawResult => Boolean(item))
}

function collectOfficialLawFields(payload: Record<string, unknown>) {
  const rows: Array<[string, string]> = []
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (!value || typeof value !== 'object') return
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (typeof entry === 'string' && entry.trim() && rows.length < 40) rows.push([key, entry.trim()])
      else if (entry && typeof entry === 'object') visit(entry)
    }
  }
  visit(payload)
  return rows.filter(([key, value]) => !/메시지|resultCode|totalCnt|page|display/i.test(key) && value.length < 900)
}

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

function RelatedCases({ item, officialCases = [] }: { item: RiskLawTrackingItem; officialCases?: OfficialPrecedentResult[] }) {
  const [caseTab, setCaseTab] = useState<LawTrackingCaseTab>('precedent')
  const precedentCases = officialCases.length ? officialCases : item.relatedCases
  const currentCase = (caseTab === 'precedent' ? precedentCases : item.relatedLossCases)[0]

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
          <div className="risk-law-case-footer"><span>손해액: <strong>{currentCase.award}</strong></span><span className="risk-law-sample-label">{officialCases.length ? '공식 판례 검색 결과 · 본문 확인 필요' : '원문 확인 필요'}</span></div>
        </article>
      ) : <p className="risk-law-empty">연결된 사례가 없습니다.</p>}
    </section>
  )
}

function buildDeveloperTrackingItems(laws: DeveloperLawQueueItem[]): RiskLawTrackingItem[] {
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
    timeline: [{ label: '원문 확인', stage: 'current', date: law.date }],
    beforeChanges: [{ label: '출처', value: law.sourceName }],
    afterChanges: [{ label: '검토 내용', value: law.description, emphasis: 'blue' }],
    changeBadge: law.verificationStatus,
    relatedCases: [],
    relatedLossCases: [],
    checklist: ['근거 ID: ' + law.id, '법령 원문과 최신 개정 여부 확인 필요'],
    evidenceIds: [law.id],
  }))
}

export function RiskLawTrackingPanel({ category, developerLaws, onRunDeveloperStep2, developerRunning = false }: { category: ScreeningCategory; developerLaws?: DeveloperLawQueueItem[]; onRunDeveloperStep2?: () => void; developerRunning?: boolean }) {
  const developerMode = developerLaws !== undefined
  const sourceItems = useMemo(() => developerMode ? buildDeveloperTrackingItems(developerLaws) : riskLawTrackingItems, [developerLaws, developerMode])
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<LawTrackingFilter>('all')
  const [institution, setInstitution] = useState('all')
  const [riskLevel, setRiskLevel] = useState<LawTrackingRiskLevel | 'all'>('all')
  const [selectedId, setSelectedId] = useState(sourceItems[0]?.id ?? '')
  const [officialResults, setOfficialResults] = useState<OfficialLawResult[]>([])
  const [officialLoading, setOfficialLoading] = useState(false)
  const [officialError, setOfficialError] = useState('')
  const [precedentResults, setPrecedentResults] = useState<OfficialPrecedentResult[]>([])
  const [precedentLoading, setPrecedentLoading] = useState(false)
  const [precedentError, setPrecedentError] = useState('')
  const [lawDetail, setLawDetail] = useState<Record<string, unknown> | null>(null)
  const [lawArticle, setLawArticle] = useState<Record<string, unknown> | null>(null)
  const [lawDetailLoading, setLawDetailLoading] = useState(false)
  const [lawDetailError, setLawDetailError] = useState('')

  const connectedItems = useMemo(() => [...sourceItems, ...officialResults], [officialResults, sourceItems])
  const institutions = useMemo(() => Array.from(new Set(connectedItems.map((item) => item.institution))), [connectedItems])
  const items = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    return connectedItems.filter((item) => {
      const categoryMatch = category === 'all' || item.categories.includes(category)
      const sourceMatch = sourceFilter === 'all' || item.sourceType === sourceFilter
      const institutionMatch = institution === 'all' || item.institution === institution
      const riskMatch = riskLevel === 'all' || item.riskLevel === riskLevel
      const searchMatch = !normalizedQuery || `${item.title} ${item.institution} ${item.summary}`.toLocaleLowerCase('ko-KR').includes(normalizedQuery)
      return categoryMatch && sourceMatch && institutionMatch && riskMatch && searchMatch
    })
  }, [category, connectedItems, institution, query, riskLevel, sourceFilter])
  const selected = items.find((item) => item.id === selectedId) ?? items[0]
  const selectedWithPrecedents = selected && precedentResults.length
    ? { ...selected, relatedCases: [], relatedCaseCount: precedentResults.length }
    : selected

  useEffect(() => {
    const official = selected && 'officialId' in selected ? selected as OfficialLawResult : null
    if (!official) {
      const resetTimer = window.setTimeout(() => {
        setLawDetail(null)
        setLawArticle(null)
        setLawDetailError('')
      }, 0)
      return () => window.clearTimeout(resetTimer)
    }
    let active = true
    const loadingTimer = window.setTimeout(() => {
      setLawDetailLoading(true)
      setLawDetailError('')
    }, 0)
    void Promise.all([
      getOfficialLawDetail(official.officialId, official.lawId),
      getOfficialLawArticle(official.officialId, official.lawId),
    ]).then(([payload, article]) => {
      if (active) { setLawDetail(payload); setLawArticle(article) }
    }).catch((reason) => {
      if (active) setLawDetailError(reason instanceof Error ? reason.message : '법령 상세 API 조회에 실패했습니다.')
    }).finally(() => {
      if (active) setLawDetailLoading(false)
    })
    return () => { active = false; window.clearTimeout(loadingTimer) }
  }, [selected])

  const searchOfficial = async () => {
    const normalized = query.trim()
    if (!normalized) { setOfficialError('법령 검색어를 입력하세요.'); return }
    setOfficialLoading(true); setOfficialError('')
    try {
      const payload = await searchOfficialLaw(normalized)
      const next = officialLawItems(payload, normalized)
      setOfficialResults(next)
      if (next[0]) setSelectedId(next[0].id)
      else setOfficialError('국가법령정보 API에서 일치하는 법령을 찾지 못했습니다. AI 법률 판단은 원문 근거 없음으로 표시합니다.')
    } catch (reason) {
      setOfficialResults([])
      setOfficialError(reason instanceof Error ? reason.message : '국가법령정보 API 연결에 실패했습니다.')
    } finally { setOfficialLoading(false) }
  }

  const searchPrecedents = async () => {
    const normalized = query.trim()
    if (!normalized) { setPrecedentError('판례 검색어를 입력하세요.'); return }
    setPrecedentLoading(true); setPrecedentError('')
    try {
      const payload = await searchOfficialPrecedents(normalized)
      const next = officialPrecedentCases(payload, normalized)
      setPrecedentResults(next)
      if (!next.length) setPrecedentError('국가법령정보 판례 API에서 일치하는 판례를 찾지 못했습니다. 검색어와 검색범위를 확인하세요.')
    } catch (reason) {
      setPrecedentResults([])
      setPrecedentError(reason instanceof Error ? reason.message : '국가법령정보 판례 API 연결에 실패했습니다.')
    } finally { setPrecedentLoading(false) }
  }

  return (
    <section className="risk-law-tracking" aria-labelledby="risk-law-tracking-title">
      <div className="risk-law-tracking-sidebar">
        <div className="risk-law-filter-panel">
          <label className="risk-law-search"><span className="sr-only">법령 검색</span><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void searchOfficial() }} placeholder="법령명, 소관부처, 키워드 검색" /></label>
          <button type="button" className="secondary-action risk-law-api-search" onClick={() => void searchOfficial()} disabled={officialLoading}>{officialLoading ? '국가법령정보 조회 중...' : '국가법령정보 API 조회'}</button>
          <button type="button" className="secondary-action risk-law-api-search" onClick={() => void searchPrecedents()} disabled={precedentLoading}>{precedentLoading ? '판례 API 조회 중...' : '국가법령정보 판례 API 조회'}</button>
          {officialError ? <p className="developer-inline-error" role="alert">{officialError}</p> : null}
          {precedentError ? <p className="developer-inline-error" role="alert">{precedentError}</p> : null}
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
        {developerMode && !sourceItems.length ? <div className="developer-empty-panel__body"><span className="developer-empty-panel__step">STEP 2 · LAW</span><p>저장된 실제 법령 결과가 없습니다. 공식 API 검색 또는 Step 2 분석을 실행하세요.</p>{onRunDeveloperStep2 ? <button type="button" onClick={onRunDeveloperStep2} disabled={developerRunning}>{developerRunning ? '분석 중…' : 'Step 2 분석 실행'}</button> : null}</div> : null}
        <div className="risk-law-list" aria-label="법령·규제 목록">
          {items.length ? items.map((item) => (
            <button type="button" className={`risk-law-list-item ${selected?.id === item.id ? 'active' : ''}`} key={item.id} onClick={() => setSelectedId(item.id)}>
              <span className="risk-law-list-meta"><b>{item.typeLabel}</b><em className={riskClassNames[item.riskLevel]}>{developerMode ? '확인 필요' : riskLabels[item.riskLevel]}</em></span>
              <strong>{item.title}</strong>
              <small>{item.summary}</small>
              {item.insuranceMandate ? <span className="risk-law-list-priority">보험 가입 의무 · 우선 {lawProductizationPriority(item).toFixed(1)}/5</span> : null}
              <span className="risk-law-list-counts"><i>⚖️ 연관 판례 {item.relatedCaseCount}건</i><i>💥 사고 사례 {item.relatedLossCount}건</i></span>
            </button>
          )) : <p className="risk-law-empty">조건에 맞는 법령·규제가 없습니다.</p>}
        </div>
      </div>
      <div className="risk-law-detail" aria-live="polite">
        {selectedWithPrecedents ? <>
          <div className="risk-law-detail-heading"><div><h3 id="risk-law-tracking-title">{selectedWithPrecedents.title}</h3><p>소관: {selectedWithPrecedents.institution} | 상태: {selectedWithPrecedents.status} | 예상 시행일: {selectedWithPrecedents.expectedEffectiveDate}</p></div>{selectedWithPrecedents.sourceUrl ? <a href={selectedWithPrecedents.sourceUrl} target="_blank" rel="noreferrer">원문 확인하기 ↗</a> : <span className="risk-law-source-pending">원문 확인 필요</span>}</div>
          <div className="risk-law-update-label">{developerMode ? 'ACTUAL ARTICLE · STEP 2' : 'SAMPLE · 기존 더미 데이터'} {selectedWithPrecedents.lastUpdated}</div>
          <div className="risk-law-priority-summary"><strong>{selectedWithPrecedents.insuranceMandate ? '보험 가입 의무 후보' : '법률·규제 신호'}</strong><span>상품화 우선 {lawProductizationPriority(selectedWithPrecedents).toFixed(1)}/5 · 진행 단계와 미이행 제재 강도 반영</span></div>
          <section className="risk-law-timeline-card"><div className="risk-law-card-heading"><h4>📍 입법·개정 진행 단계</h4><span>최근 상태 변경: <strong>{selectedWithPrecedents.lastUpdated}</strong></span></div><TrackingTimeline item={selectedWithPrecedents} /></section>
          <section className="risk-law-changes"><div className="risk-law-change-grid"><ChangeCard title="기존 기준" changes={selectedWithPrecedents.beforeChanges} variant="before" /><ChangeCard title="개정안·현재 기준" changes={selectedWithPrecedents.afterChanges} variant="after" /></div><span className="risk-law-change-badge">{selectedWithPrecedents.changeBadge}</span></section>
          <RelatedCases item={selectedWithPrecedents} officialCases={precedentResults} />
          {lawDetailLoading ? <section className="risk-law-official-detail"><h4>국가법령정보센터 법령 상세</h4><p>법령 본문·조문·개정 정보를 불러오는 중입니다.</p></section> : null}
          {lawDetailError ? <section className="risk-law-official-detail is-error"><h4>법령 상세를 확인하지 못했습니다</h4><p>{lawDetailError}</p><small>검색 결과의 법령 ID와 원문 링크는 유지됩니다. 원문 확인하기에서 직접 확인하세요.</small></section> : null}
          {lawDetail && !lawDetailLoading ? <section className="risk-law-official-detail"><div className="risk-law-card-heading"><h4>국가법령정보센터 상세 원문</h4><span>법령 상세 API · ID {('officialId' in selected ? (selected as OfficialLawResult).officialId : '확인 필요')}</span></div><dl>{collectOfficialLawFields(lawDetail).map(([label, value]) => <div key={`${label}-${value}`}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{lawArticle ? <div className="risk-law-article-detail"><h5>제1조 조문 원문</h5><dl>{collectOfficialLawFields(lawArticle).filter(([label]) => /조문번호|조문제목|조문내용|항번호|항내용|호번호|호내용/.test(label)).map(([label, value]) => <div key={`${label}-${value}`}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>조문 API 요청: `lawjosub` · JO 000100 (제1조). 필요한 조문은 담당자가 조문번호를 추가 확인해야 합니다.</p></div> : null}<p className="risk-law-detail-note">검색 결과의 요약이 아니라 국가법령정보센터 상세·조문 API 응답을 표시합니다. 조문 적용·개정 여부는 담당자가 원문과 시행일을 최종 확인해야 합니다.</p></section> : null}
          <section className="risk-law-checklist"><h4>☑️ 판례 및 법안 반영 대응 체크리스트</h4><ul>{selectedWithPrecedents.checklist.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <p className="risk-law-disclaimer">{developerMode ? 'ACTUAL ARTICLE · Step 2 law 결과입니다. 원문에 없는 판례·손해 사례는 추가하지 않고 확인 필요로 표시합니다.' : 'SAMPLE · 법률·규제 정보와 사례는 공식 원문·최신성 확인 전 판단 근거로 사용할 수 없습니다. 보험 보장·면책·보험료·가입 가능 여부를 의미하지 않습니다.'}</p>
        </> : <p className="risk-law-empty">선택할 법령·규제가 없습니다.</p>}
      </div>
    </section>
  )
}
