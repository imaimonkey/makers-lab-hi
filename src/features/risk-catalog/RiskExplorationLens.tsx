import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  riskExplorationRecords,
  type ExplorationCategory,
  type RiskExplorationRecord,
} from '../../domain/risk/riskExplorationDemo'
import { getCandidateViewModelById } from '../../domain/risk/candidateViewModel'
import {
  getRiskCandidateQuantification,
  type RiskCandidateQuantificationKey,
} from '../../domain/risk/riskCandidateQuantification'
import type { ScreeningCategory } from '../../domain/risk/riskScreeningInsights'
import { lawProductizationPriority, riskLawTrackingItems } from '../../domain/risk/riskLawTracking'
import { riskCandidateEvidenceSnapshots } from '../../domain/risk/riskCandidateEvidence'
import { RiskLawTrackingPanel } from './RiskLawTrackingPanel'
import type { DeveloperLawQueueItem, DeveloperRiskCatalogViewData } from './developerStep2Adapter'

const categoryFilters: Array<{ key: ScreeningCategory; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'individual', label: '개인 위험' },
  { key: 'corporate', label: '기업 위험' },
  { key: 'legal', label: '법률 및 규제 위험' },
  { key: 'department', label: '사내 요청' },
  { key: 'customer', label: '고객 요청' },
]

function tagClass(tag: string) {
  if (tag === '개인') return 'tag-blue'
  if (tag === '기업') return 'tag-purple'
  return 'tag-default'
}

type ScreeningSort = 'score' | 'title' | RiskCandidateQuantificationKey
type SearchParamKey = 'q' | 'category' | 'sort'

const SCREENING_PAGE_SIZE = 5
const SCREENING_MAX_RECORDS = 15

const isScreeningCategory = (value: string | null): value is ScreeningCategory => (
  categoryFilters.some((filter) => filter.key === value)
)

const isScreeningSort = (value: string | null): value is ScreeningSort => (
  value === 'score' || value === 'title' || value === 'market' || value === 'fortuity' || value === 'legalExposure' || value === 'pml'
)

function metricSortValue(record: RiskExplorationRecord, key: RiskCandidateQuantificationKey) {
  return getRiskCandidateQuantification(record)[key].numericValue
}

function actualScore(record: RiskExplorationRecord) {
  const values = Object.values(record.metricScores).filter((value) => Number.isFinite(value) && value > 0)
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function riskLevelLabel(record: RiskExplorationRecord) {
  return record.display.riskLabel.replace(/^[^가-힣A-Za-z]+/, '')
}

function metricSubLabel(sub: string) {
  return sub
    .replace(/^상품화 종합평가\s*/, '')
    .replace(/\s*·\s*상품화 종합평가\s*$/, '')
    .trim()
}

function legalPriorityForRecord(record: RiskExplorationRecord) {
  const linkedLaws = riskLawTrackingItems.filter((item) => item.candidateIds?.includes(record.id))
  return linkedLaws.length ? Math.max(...linkedLaws.map(lawProductizationPriority)) : null
}

const screeningColumns: RiskCandidateQuantificationKey[] = ['market', 'fortuity', 'pml']

function screeningScoreFor(record: RiskExplorationRecord, developerMode: boolean) {
  return developerMode ? actualScore(record) : getCandidateViewModelById(record.id)?.screeningScore.value ?? null
}

function screeningStatusLabel(record: RiskExplorationRecord, score: number | null) {
  if (score === null) return '추가 검토'
  const label = riskLevelLabel(record)
  if (label.includes('고위험')) return '고위험'
  if (label.includes('중위험')) return '중위험'
  return '추가 검토'
}

function formatScreeningScore(score: number | null) {
  if (score === null) return '확인 필요'
  const rounded = Math.round(score * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}점`
}

function confirmationBadgeLabel(metricKey: RiskCandidateQuantificationKey) {
  return metricKey === 'pml' ? 'PML 미확정' : '검증 필요'
}

function metricValueIsUnconfirmed(value: string) {
  return value.includes('확인 필요')
}

const CATEGORY_TABS_REVEAL_DISTANCE = 4

function useRiskCategoryTabsVisibility() {
  const [isVisible, setIsVisible] = useState(true)
  const visibilityRef = useRef(true)
  const previousScrollYRef = useRef(0)

  useEffect(() => {
    const setVisibility = (nextVisibility: boolean) => {
      if (visibilityRef.current === nextVisibility) return
      visibilityRef.current = nextVisibility
      setIsVisible(nextVisibility)
    }

    previousScrollYRef.current = window.scrollY
    const handleScroll = () => {
      const currentScrollY = Math.max(window.scrollY, 0)
      const scrollDelta = currentScrollY - previousScrollYRef.current
      previousScrollYRef.current = currentScrollY

      if (scrollDelta > 0) {
        // Hide on the first downward scroll event. The previous distance
        // threshold made the tab appear stuck until the page was touched.
        setVisibility(false)
        return
      }

      if (scrollDelta <= -CATEGORY_TABS_REVEAL_DISTANCE) {
        setVisibility(true)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return isVisible
}

function RiskCandidateComparisonRow({ record, index, developerMode, selected, onSelect, legalPriority }: { record: RiskExplorationRecord; index: number; developerMode: boolean; selected: boolean; onSelect: () => void; legalPriority?: number | null }) {
  const quantification = getRiskCandidateQuantification(record)
  const score = screeningScoreFor(record, developerMode)

  return (
    <>
      <tr className={`risk-candidate-comparison-row ${selected ? 'selected' : ''}`} onClick={onSelect}>
        <td className="screening-rank">{index + 1}</td>
        <td className="screening-keyword">
          <strong>{record.title}</strong>
          <small>{record.summary}</small>
          <em className="screening-keyword-detail">{record.contentInsight?.event ?? `다음 검토: ${record.nextAction}`}</em>
          <span>{record.tags.map((tag) => <i className={`screening-tag ${tagClass(tag)}`} key={tag}>{tag}</i>)}</span>
        </td>
        {screeningColumns.map((key) => {
          const metric = quantification[key]
          return (
            <td className="screening-metric-cell risk-candidate-metric-cell" key={key}>
              {metricValueIsUnconfirmed(metric.value) ? <span className="risk-metric-badge warning">[{confirmationBadgeLabel(key)}]</span> : <strong className={`risk-metric-value risk-metric-${key}`}>{metric.value}</strong>}
              <small>{metricSubLabel(metric.sub)}</small>
            </td>
          )
        })}
        <td className="screening-score">
          <div className="risk-screening-score-wrap">
            {score === null ? <span className="risk-metric-badge warning">[추가 검토]</span> : <strong>{formatScreeningScore(score)}</strong>}
            {score !== null && score !== undefined ? <i aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, score / 5 * 100))}%` }} /></i> : null}
            {legalPriority ? <small>법률 우선 {legalPriority.toFixed(1)} · 시행·제재 반영</small> : developerMode ? <small>0-5 · 실제 Step 2 결과</small> : null}
            <em>{screeningStatusLabel(record, score)}</em>
          </div>
        </td>
      </tr>
    </>
  )
}

function RiskCandidateDetail({ record, rank, developerMode }: { record: RiskExplorationRecord; rank: number; developerMode: boolean }) {
  const candidate = getCandidateViewModelById(record.id)
  const quantification = getRiskCandidateQuantification(record)
  const detailPath = `${developerMode ? '/developer-test' : ''}/risks/${candidate?.detailRiskId ?? record.detailRiskId}`
  const isOtaCandidate = record.id === 'ota-delivery-consumer-disputes'
  const evidenceSnapshot = riskCandidateEvidenceSnapshots[record.id]
  const evidenceFacts = evidenceSnapshot?.facts ?? record.contentInsight?.facts ?? [record.metricEvidence?.demand?.quotes?.[0] ?? record.summary]
  const evidenceSourceName = evidenceSnapshot?.sourceName ?? record.sourceName ?? '공식 원문 확인 필요'
  const evidenceSourceUrl = evidenceSnapshot?.sourceUrl ?? record.sourceUrl
  const evidenceSourceDate = evidenceSnapshot?.sourceDate ?? (record.collectedAt ? new Date(record.collectedAt).toLocaleDateString('ko-KR') : '발행일 확인 필요')
  const evidenceScope = evidenceSnapshot?.scope ?? (record.sourceUrl ? '공개 원문에서 확인한 사실이며, 보험화 판단과 손해액은 별도 검증이 필요합니다.' : '현재 후보 설명만 연결되어 있어 공식 원문과 발행일 확인이 필요합니다.')
  const evidenceNextChecks = evidenceSnapshot?.nextChecks ?? [record.gap, record.nextAction]
  const judgmentEvidence = isOtaCandidate
    ? [
        { number: '01', label: '시장성', text: '피해 대상과 반복 수요가 확인되며, 잠재 가입자군을 비교적 명확히 특정할 수 있음.' },
        { number: '02', label: '손해 측정 가능성', text: '취소·지연·오배송 등 사고 유형별 피해 금액은 산정 가능하나 세부 통계 확보가 추가로 필요함.' },
        { number: '03', label: '보험사고 성립성', text: '사고 발생 여부와 피해 시점을 객관적으로 확인할 수 있어 보험사고 정의가 비교적 명확함.' },
        { number: '04', label: '법적 책임·규제 안정성', text: 'OTA·항공사·택배사·판매자 간 책임 주체와 환불·배상 기준을 약관에 명확히 반영할 필요가 있음.' },
        { number: '05', label: '통제 가능성', text: '고의적 청구·중복 보상 방지를 위해 예약·배송·환불 이력과의 연계가 필요함.' },
        { number: '06', label: '손실 규모', text: '개별 사고의 손실은 제한적이나 다수 사고가 동시에 발생하는 누적 노출을 고려해야 함.' },
      ]
    : [
        { number: '01', label: '시장성', text: `${quantification.market.official[0] ?? '시장 수요 신호'} ${quantification.market.assumption[0] ?? '잠재 가입자군과 반복 수요 확인 필요'}` },
        { number: '02', label: '손해 측정 가능성', text: `${quantification.pml.result}. ${quantification.pml.uncertainty[0] ?? '실제 손해액과 누적 범위 확인 필요'}` },
        { number: '03', label: '보험사고 성립성', text: `${record.fortuity}. 사고 발생 조건과 피해 시점의 객관적 확인 가능성을 검토합니다.` },
        { number: '04', label: '법적 책임·규제 안정성', text: `${record.legalExposure}. 책임 주체와 약관 반영 기준을 추가 확인합니다.` },
        { number: '05', label: '통제 가능성', text: `${record.moralHazard}. ${record.nextAction}` },
        { number: '06', label: '손실 규모', text: `${quantification.pml.result}. ${record.gap}` },
      ]
  const productizationPoints = isOtaCandidate
    ? [
        '취소·지연·오배송을 묶은 소비자 비용보전형 담보',
        '사고 확인 데이터를 활용한 간편 청구 구조',
        'OTA·항공사·택배사와 제휴형 단체보험 검토 가능',
      ]
    : [
        record.gap,
        record.nextAction,
        `${record.tags.join('·')} 대상의 제휴형 또는 특화 담보 구조 검토`,
      ]
  const judgmentGroups = [
    { title: '보험화 가능성', items: judgmentEvidence.slice(0, 3) },
    { title: '통제·설계 가능성', items: judgmentEvidence.slice(3) },
  ]

  return (
    <aside className="risk-screening-detail-panel" aria-label={`${record.title} 상세 평가`}>
      <div className="risk-screening-detail-topline">
        <span>{record.tags[0] ?? '위험 후보'}</span>
        <small>상품화 우선순위 {rank}위</small>
      </div>
      <h4>{record.title}</h4>
      <p className="risk-screening-detail-description">{record.summary}</p>
      <section className="risk-screening-source-evidence">
        <div className="risk-screening-source-heading"><strong>근거 데이터</strong><span>{evidenceSourceDate}</span></div>
        <ul>{evidenceFacts.slice(0, 3).map((fact) => <li key={fact}>{fact}</li>)}</ul>
        <p>{evidenceScope}</p>
        <div className="risk-screening-source-link"><span>출처</span>{evidenceSourceUrl ? <a href={evidenceSourceUrl} target="_blank" rel="noreferrer">{evidenceSourceName} ↗</a> : <b>공식 원문 확인 필요</b>}</div>
        <div className="risk-screening-source-next"><strong>추가 확인</strong>{evidenceNextChecks.slice(0, 2).map((item) => <span key={item}>{item}</span>)}</div>
      </section>
      {record.contentInsight ? (
        <details className="risk-candidate-content-insight">
          <summary>본문 기반 구조화 결과</summary>
          <div className="risk-candidate-content-topic"><span>{record.contentInsight.topic}</span><p>{record.contentInsight.event}</p></div>
          <div className="risk-candidate-content-signals">
            {record.contentInsight.signals.slice(0, 4).map((signal) => <div key={`${signal.label}-${signal.value}`}><small>{signal.label}</small><strong>{signal.value}</strong><span>{signal.basis}</span></div>)}
          </div>
          <ul className="risk-candidate-content-facts">{record.contentInsight.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
          <div className="risk-candidate-content-actions"><b>다음 검토</b>{record.contentInsight.reviewActions.map((action) => <span key={action}>{action}</span>)}</div>
        </details>
      ) : null}
      <div className="risk-screening-judgment">
        <section className="risk-screening-judgment-evidence">
          {judgmentGroups.map((group) => (
            <div className="risk-screening-evidence-group" key={group.title}>
              <h5>{group.title}</h5>
              <ol>{group.items.map((item) => <li key={item.number}><b>{item.number}</b><div><strong>{item.label}</strong><p>{item.text}</p></div></li>)}</ol>
            </div>
          ))}
        </section>
        <section className="risk-screening-productization-points">
          <strong>상품화 포인트</strong>
          <ol>{productizationPoints.map((point, index) => <li key={point}><b>{String(index + 1).padStart(2, '0')}</b><span>{point}</span></li>)}</ol>
        </section>
      </div>
      <div className="risk-screening-detail-actions">
        <Link to={detailPath}>위험 상세</Link>
        <Link to={`${developerMode ? '/developer-test' : ''}/reports?sourceRiskId=${encodeURIComponent(candidate?.detailRiskId ?? record.detailRiskId)}`}>종합 리포트</Link>
      </div>
    </aside>
  )
}

export function RiskExplorationLens({ sourceRecords, developerMode = false, developerLaws, developerData, onRunDeveloperStep2, developerRunning = false }: { sourceRecords?: RiskExplorationRecord[]; developerMode?: boolean; developerLaws?: DeveloperLawQueueItem[]; developerData?: DeveloperRiskCatalogViewData; onRunDeveloperStep2?: () => void; developerRunning?: boolean } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [queryInput, setQueryInput] = useState(() => searchParams.get('q') ?? '')
  const [period, setPeriod] = useState<'all' | '7' | '30' | '90'>('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [selectedRecordId, setSelectedRecordId] = useState<string>()
  const [screeningPage, setScreeningPage] = useState(1)
  const [now] = useState(() => Date.now())
  const queryComposingRef = useRef(false)
  const categoryParam = searchParams.get('category')
  const category: ScreeningCategory = isScreeningCategory(categoryParam) ? categoryParam : 'all'
  const query = queryInput
  const sort: ScreeningSort = isScreeningSort(searchParams.get('sort')) ? searchParams.get('sort') as ScreeningSort : 'score'
  const categoryTabsVisible = useRiskCategoryTabsVisibility()

  useEffect(() => {
    window.requestAnimationFrame(() => {
      document.getElementById(`risk-category-${category}`)?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' })
    })
  }, [category])

  const updateSearchParam = (key: SearchParamKey, value: string, defaultValue = '') => {
    setSearchParams((currentSearchParams) => {
      const nextSearchParams = new URLSearchParams(currentSearchParams)
      if (!value.trim() || value === defaultValue) nextSearchParams.delete(key)
      else nextSearchParams.set(key, value)
      return nextSearchParams
    }, { replace: true })
  }

  const sortedRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    const filtered = (developerMode ? (sourceRecords ?? []) : (sourceRecords ?? riskExplorationRecords)).filter((record) => {
      const matchesCategory = category === 'all'
        || (category === 'department' && record.signalOrigin === 'department-intake')
        || (category === 'customer' && record.signalOrigin === 'customer-intake')
        || (category !== 'department' && category !== 'customer' && record.categories.includes(category as ExplorationCategory))
      const haystack = `${record.title} ${record.summary} ${record.tags.join(' ')}`.toLocaleLowerCase('ko-KR')
      const matchesSource = sourceFilter === 'all' || record.sourceName === sourceFilter
      const collectedAt = record.collectedAt ? new Date(record.collectedAt).getTime() : Number.NaN
      const matchesPeriod = period === 'all' || (Number.isFinite(collectedAt) && collectedAt >= now - Number(period) * 24 * 60 * 60 * 1000)
      return matchesCategory && matchesSource && matchesPeriod && (!normalizedQuery || haystack.includes(normalizedQuery))
    })
    return [...filtered].sort((first, second) => {
      if (sort === 'title') return first.title.localeCompare(second.title, 'ko-KR')
      if (sort === 'score') {
        const baseline = (record: RiskExplorationRecord) => developerMode ? actualScore(record) : getCandidateViewModelById(record.id)?.screeningScore.value ?? 0
        const priority = (record: RiskExplorationRecord) => category === 'legal' && !developerMode ? legalPriorityForRecord(record) : null
        const scoreWithLegalPriority = (record: RiskExplorationRecord) => {
          const lawPriority = priority(record)
          return lawPriority ? 10 + lawPriority : baseline(record)
        }
        return scoreWithLegalPriority(second) - scoreWithLegalPriority(first)
      }
      const secondValue = metricSortValue(second, sort)
      const firstValue = metricSortValue(first, sort)
      if (secondValue === null && firstValue === null) return 0
      if (secondValue === null) return -1
      if (firstValue === null) return 1
      return secondValue - firstValue
    }).slice(0, SCREENING_MAX_RECORDS)
  }, [category, developerMode, now, period, query, sort, sourceFilter, sourceRecords])

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / SCREENING_PAGE_SIZE))
  const currentPage = Math.min(screeningPage, totalPages)
  const pageStart = (currentPage - 1) * SCREENING_PAGE_SIZE
  const records = sortedRecords.slice(pageStart, pageStart + SCREENING_PAGE_SIZE)

  const actualSources = useMemo(() => [...new Set((sourceRecords ?? []).map((record) => record.sourceName).filter((source): source is string => Boolean(source)))], [sourceRecords])
  const selectedRecord = records.find((record) => record.id === selectedRecordId) ?? records[0]
  const selectedRank = selectedRecord ? sortedRecords.findIndex((record) => record.id === selectedRecord.id) + 1 : 0

  return (
    <section className="risk-exploration-lens surface-card screening-lens" aria-labelledby={category === 'legal' ? 'risk-exploration-title' : undefined} aria-label={category === 'legal' ? undefined : '신규 위험 타당성 스크리닝'}>
      <div className="risk-exploration-filter-row">
        <div className={`risk-category-shell${categoryTabsVisible ? '' : ' is-collapsed'}`}>
          <div className="risk-category-tabs" role="tablist" aria-label="위험 후보 카테고리 필터">
            {categoryFilters.map((filter) => (
              <button id={`risk-category-${filter.key}`} type="button" role="tab" aria-selected={category === filter.key} className={`risk-category-button ${category === filter.key ? 'active' : ''}`} key={filter.key} aria-pressed={category === filter.key} onClick={() => { setScreeningPage(1); setSelectedRecordId(undefined); updateSearchParam('category', filter.key, 'all') }}>
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {category === 'legal' ? <div className="risk-exploration-heading">
        <div>
          <p className="eyebrow">LAW & REGULATION EVALUATION</p>
          <h2 id="risk-exploration-title">주요 법률 및 규제 평가</h2>
          <p>신설·개정 법률 중 보험 가입 의무, 시행 단계, 미이행 제재를 확인하고 상품화 우선순위에 반영합니다.</p>
        </div>
      </div> : null}

      {category === 'legal' ? <RiskLawTrackingPanel category={category} developerLaws={developerMode ? (developerLaws ?? []) : undefined} onRunDeveloperStep2={developerMode ? onRunDeveloperStep2 : undefined} developerRunning={developerRunning} /> : null}

      <div className="screening-table-heading">
        <div><p className="eyebrow">AI-ASSISTED SCREENING</p><h3>신규 위험 타당성 스크리닝</h3></div>
        <div className="screening-table-heading-side">
          <div className="screening-filter-group risk-screening-toolbar">
            <label><span className="sr-only">후보 검색</span><input type="search" value={queryInput} onChange={(event) => {
              const nextQuery = event.currentTarget.value
              setQueryInput(nextQuery)
              setScreeningPage(1)
              setSelectedRecordId(undefined)
              if (!queryComposingRef.current) updateSearchParam('q', nextQuery)
            }} onCompositionStart={() => { queryComposingRef.current = true }} onCompositionEnd={(event) => {
              queryComposingRef.current = false
              const nextQuery = event.currentTarget.value
              setQueryInput(nextQuery)
              setScreeningPage(1)
              setSelectedRecordId(undefined)
              updateSearchParam('q', nextQuery)
            }} placeholder="위험·기술·이슈 검색" /></label>
            <label><span className="sr-only">기간</span><select value={developerMode ? period : 'all'} disabled={!developerMode} onChange={(event) => { setPeriod(event.target.value as typeof period); setScreeningPage(1); setSelectedRecordId(undefined) }} aria-label="원문 수집 기간">
              <option value="all">전체 기간</option><option value="7">최근 7일</option><option value="30">최근 30일</option><option value="90">최근 90일</option>
            </select></label>
            <label><span className="sr-only">출처</span><select value={developerMode ? sourceFilter : 'all'} disabled={!developerMode} onChange={(event) => { setSourceFilter(event.target.value); setScreeningPage(1); setSelectedRecordId(undefined) }} aria-label="원문 출처">
              <option value="all">출처 전체</option>{actualSources.map((source) => <option value={source} key={source}>{source}</option>)}
            </select></label>
            <label><span className="sr-only">정렬</span><select value={sort} onChange={(event) => { setScreeningPage(1); setSelectedRecordId(undefined); updateSearchParam('sort', event.target.value, 'score') }}>
              <option value="score">후보 선별점수 순</option><option value="market">시장성 순</option><option value="fortuity">우연성 순</option><option value="legalExposure">법률 및 규제 리스크 순</option><option value="pml">PML 순</option><option value="title">후보명 순</option>
            </select></label>
          </div>
          <span>시장성·우연성·법률 및 규제 리스크·PML을 후보별 가로 비교로 확인합니다.</span>
        </div>
      </div>
      {sortedRecords.length ? (
        <div className="risk-screening-board">
          <section className="risk-screening-list-panel" aria-label="상품화 우선 검토 후보 목록">
            <div className="risk-screening-list-heading"><strong>상품화 우선 검토 후보</strong><span>{sortedRecords.length}건</span><small>{currentPage}/{totalPages} 페이지</small></div>
            <div className="risk-screening-table-wrap">
              <table className="risk-screening-table">
                <caption className="sr-only">위험 후보별 신규 위험 타당성 스크리닝 목록</caption>
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>위험 후보</th>
                    {screeningColumns.map((key) => <th key={key}>{getRiskCandidateQuantification(records[0])[key].label}</th>)}
                    <th>AI 종합점수</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => <RiskCandidateComparisonRow key={record.id} record={record} index={pageStart + index} developerMode={developerMode} selected={record.id === selectedRecord?.id} legalPriority={category === 'legal' ? legalPriorityForRecord(record) : undefined} onSelect={() => setSelectedRecordId(record.id)} />)}
                </tbody>
              </table>
            </div>
            {totalPages > 1 ? (
              <nav className="risk-screening-pagination" aria-label="상품화 우선 검토 후보 페이지">
                <div className="risk-screening-pagination-buttons">
                  <button type="button" className="risk-screening-pagination-arrow" disabled={currentPage === 1} onClick={() => { setScreeningPage(currentPage - 1); setSelectedRecordId(undefined) }}>
                    ‹ 이전
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <button key={pageNumber} type="button" className={pageNumber === currentPage ? 'active' : ''} aria-current={pageNumber === currentPage ? 'page' : undefined} onClick={() => { setScreeningPage(pageNumber); setSelectedRecordId(undefined) }}>
                      {pageNumber}
                    </button>
                  ))}
                  <button type="button" className="risk-screening-pagination-arrow" disabled={currentPage === totalPages} onClick={() => { setScreeningPage(currentPage + 1); setSelectedRecordId(undefined) }}>
                    다음 ›
                  </button>
                </div>
              </nav>
            ) : null}
          </section>
          {selectedRecord ? <RiskCandidateDetail record={selectedRecord} rank={selectedRank} developerMode={developerMode} /> : null}
        </div>
      ) : <div className="risk-candidate-empty">{developerMode ? <><strong>선택 조건에 맞는 원문 기반 후보가 없습니다.</strong><br />현재 {developerData?.counts.articles ?? 0}건의 원문은 본문 구조화 더미 결과로 준비되어 있습니다.{onRunDeveloperStep2 ? <button type="button" onClick={onRunDeveloperStep2} disabled={developerRunning}>{developerRunning ? 'Step 2 분석 중…' : '실제 Step 2 전체 실행'}</button> : null}</> : '조건에 맞는 위험 후보가 없습니다.'}</div>}

      <p className="risk-exploration-disclaimer">카드의 점수·시장성·우연성·법률 및 규제 리스크는 기사 기반 예비 검토값입니다. AI는 판단 근거와 검토 우선순위를 지원하며 최종 판단은 실무자 검토가 필요합니다. PML처럼 입력 근거가 없는 항목은 추정하지 않으며, 공식 출처·독립 통계·반증은 상세 검증에서 확인해야 합니다.</p>
    </section>
  )
}
