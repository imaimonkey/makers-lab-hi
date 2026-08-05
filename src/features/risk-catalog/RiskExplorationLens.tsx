import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  calculateRiskExplorationScore,
  riskExplorationRecords,
  type RiskExplorationMetricKey,
  type RiskExplorationRecord,
} from '../../domain/risk/riskExplorationDemo'
import { getCandidateViewModelById } from '../../domain/risk/candidateViewModel'
import {
  getRiskCandidateQuantification,
  type RiskCandidateQuantificationKey,
} from '../../domain/risk/riskCandidateQuantification'
import type { ScreeningCategory } from '../../domain/risk/riskScreeningInsights'
import { riskCandidateEvidenceSnapshots } from '../../domain/risk/riskCandidateEvidence'
import { PRODUCT_FINANCIAL_ESTIMATE } from '../../report/data/financial-estimate-mock'
import { RiskLawTrackingPanel } from './RiskLawTrackingPanel'
import type { DeveloperLawQueueItem, DeveloperRiskCatalogViewData } from './developerStep2Adapter'
import { calculateProductizationScores } from './productizationScore'

const categoryFilters: Array<{ key: ScreeningCategory; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'individual', label: '가계 위험' },
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

function normalizeSearchText(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g, ' ').trim()
}

function matchesRiskQuery(record: RiskExplorationRecord, query: string) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return true
  const haystack = normalizeSearchText([
    record.title,
    record.summary,
    record.tags.join(' '),
    record.secondaryTags.join(' '),
    record.categories.join(' '),
    record.gap,
    record.nextAction,
    record.signalOrigin ?? '',
    record.sourceName ?? '',
    record.contentInsight?.topic ?? '',
    record.contentInsight?.event ?? '',
    ...(record.facts ?? []),
    ...(record.metrics ?? []).flatMap((metric) => [metric.label, metric.value, metric.sourceHint ?? '']),
  ].join(' '))
  if (haystack.includes(normalizedQuery)) return true
  const tokens = normalizedQuery.split(/\s+/).filter((token) => token.length > 1)
  if (!tokens.length) return false
  const matchedTokens = tokens.filter((token) => haystack.includes(token)).length
  return matchedTokens >= Math.ceil(tokens.length / 2)
}

function metricSortValue(record: RiskExplorationRecord, key: RiskCandidateQuantificationKey) {
  return getRiskCandidateQuantification(record)[key].numericValue
}

function metricSubLabel(sub: string) {
  return sub
    .replace(/^상품화 종합평가\s*/, '')
    .replace(/\s*·\s*상품화 종합평가\s*$/, '')
    .trim()
}

type TamAssumption = {
  facilityCount: number
  premiumRange: [number, number, number]
}

// Prototype assumptions for candidates without a report-specific TAM estimate.
// All values are calculated with: target facilities × expected annual premium.
const marketTamAssumptions: Record<string, TamAssumption> = {
  'ai-transparency-obligation': { facilityCount: 3200, premiumRange: [300000, 550000, 900000] },
  'mydata-portability-demand': { facilityCount: 1800, premiumRange: [250000, 450000, 750000] },
  'heatwave-workplace-duty': { facilityCount: 6500, premiumRange: [180000, 320000, 550000] },
  'kuam-urban-pilot': { facilityCount: 12000, premiumRange: [220000, 400000, 700000] },
  'ai-voice-investigation': { facilityCount: 2800, premiumRange: [280000, 500000, 850000] },
  'medical-liability-insurance': { facilityCount: 900, premiumRange: [1200000, 2000000, 3500000] },
  'sns-impersonation-commerce': { facilityCount: 20000, premiumRange: [30000, 60000, 100000] },
  'ota-delivery-consumer-disputes': { facilityCount: 5000, premiumRange: [120000, 240000, 400000] },
  'generative-ai-copyright': { facilityCount: 4200, premiumRange: [300000, 550000, 900000] },
  'commercial-drone': { facilityCount: 1800, premiumRange: [450000, 800000, 1200000] },
  'autonomous-level4': { facilityCount: 1200, premiumRange: [1200000, 2200000, 3800000] },
  'deepfake-phishing': { facilityCount: 60000, premiumRange: [30000, 70000, 120000] },
  'urban-flooding': { facilityCount: 15000, premiumRange: [800000, 1500000, 2500000] },
  'enterprise-ransomware': { facilityCount: 7000, premiumRange: [1500000, 3000000, 5000000] },
  'ess-ups-battery-fire': { facilityCount: 3200, premiumRange: [1500000, 3000000, 5000000] },
  'heatwave-health-income-loss': { facilityCount: 10000, premiumRange: [100000, 250000, 450000] },
  'platform-worker-transit-accident': { facilityCount: 300000, premiumRange: [30000, 70000, 120000] },
}

function tamFromAssumption({ facilityCount, premiumRange }: TamAssumption) {
  return premiumRange.map((premium) => Math.round(facilityCount * premium / 100_000_000))
}

function marketTamDisplay(record: RiskExplorationRecord) {
  if (record.id === 'ev-battery-fire') {
    const { min, max } = PRODUCT_FINANCIAL_ESTIMATE.tamRange
    return {
      label: '총도달가능시장(TAM)',
      value: `연 ${min}억~${max}억 원`,
    }
  }

  if (record.articleId || record.id.startsWith('developer-')) {
    return {
      label: '총도달가능시장(TAM)',
      value: '국내 노출량·보험료 자료 확인 필요',
    }
  }

  const assumption = marketTamAssumptions[record.id] ?? {
    facilityCount: Math.max(1000, Math.round(record.metricScores.demand * 10000)),
    premiumRange: [200000, 400000, 700000] as [number, number, number],
  }
  const [min, , max] = tamFromAssumption(assumption)
  return {
    label: '총도달가능시장(TAM)',
    value: `연 ${min}억~${max}억 원`,
  }
}

function removeDetailMetricLabel(text: string) {
  return text
    .replace(/^(?:\uC57D\s*[\d,]+(?:\.\d+)?\s*\uC5B5\s*\uC6D0|(?:\uB9E4\uC6B0\s*)?(?:\uB192\uC74C|\uBCF4\uD1B5|\uB0AE\uC74C))(?:\s*[·.,]?\s*\d+(?:\.\d+)?\s*\/\s*5)?(?:\s*[·.,]\s*)?/u, '')
    .trim()
}

const screeningColumns: RiskCandidateQuantificationKey[] = ['market', 'pml']

function screeningScoreFor(record: RiskExplorationRecord, developerMode: boolean) {
  if (record.articleId || record.id.startsWith('developer-')) return calculateProductizationScores(record.metricScores).total
  return developerMode ? calculateRiskExplorationScore(record.metricScores) : getCandidateViewModelById(record.id)?.screeningScore.value ?? null
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

function renderCandidateSummary(record: RiskExplorationRecord) {
  if (record.id !== 'ev-battery-fire' || !record.summary.includes('지하주차장')) return record.summary
  const [firstLine, secondLine] = record.summary.split('지하주차장')
  return <>{firstLine}<br />지하주차장{secondLine}</>
}

const CATEGORY_TABS_COLLAPSE_DISTANCE = 72
const CATEGORY_TABS_REVEAL_DISTANCE = 4

function useRiskCategoryTabsVisibility() {
  const [isVisible, setIsVisible] = useState(true)
  const visibilityRef = useRef(true)
  const previousScrollYRef = useRef(0)
  const downwardScrollDistanceRef = useRef(0)

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

      if (currentScrollY <= 16) {
        downwardScrollDistanceRef.current = 0
        setVisibility(true)
        return
      }

      if (scrollDelta > 0) {
        downwardScrollDistanceRef.current += scrollDelta
        if (downwardScrollDistanceRef.current >= CATEGORY_TABS_COLLAPSE_DISTANCE) {
          setVisibility(false)
        }
        return
      }

      if (scrollDelta <= -CATEGORY_TABS_REVEAL_DISTANCE) {
        downwardScrollDistanceRef.current = 0
        setVisibility(true)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return isVisible
}

function RiskCandidateComparisonRow({ record, index, developerMode, selected, onSelect }: { record: RiskExplorationRecord; index: number; developerMode: boolean; selected: boolean; onSelect: () => void }) {
  const quantification = getRiskCandidateQuantification(record)
  const score = screeningScoreFor(record, developerMode)

  return (
    <>
      <tr className={`risk-candidate-comparison-row ${selected ? 'selected' : ''}`} onClick={onSelect}>
        <td className="screening-rank">{index + 1}</td>
        <td className="screening-keyword">
          <strong>{record.title}</strong>
          <small>{renderCandidateSummary(record)}</small>
          <span>{record.secondaryTags.map((tag) => <i className={`screening-tag ${tagClass(tag)}`} key={tag}>{tag}</i>)}</span>
        </td>
        {screeningColumns.map((key) => {
          const metric = quantification[key]
          const tam = key === 'market' ? marketTamDisplay(record) : null
          return (
            <td className="screening-metric-cell risk-candidate-metric-cell" key={key}>
              {metricValueIsUnconfirmed(metric.value) ? <span className="risk-metric-badge warning">[{confirmationBadgeLabel(key)}]</span> : <strong className={`risk-metric-value risk-metric-${key}`}>{metric.value}</strong>}
              {tam ? (
                <small className="risk-market-tam" aria-label={`${tam.label}: ${tam.value}`}>
                  <b>{tam.label}</b>
                  <span>{tam.value}</span>
                </small>
              ) : <small>{metricSubLabel(metric.sub)}</small>}
            </td>
          )
        })}
        <td className="screening-score">
          <div className="risk-screening-score-wrap">
            {score === null ? <span className="risk-metric-badge warning">[추가 검토]</span> : <strong>{formatScreeningScore(score)}</strong>}
            {score !== null && score !== undefined ? <i aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, score / 5 * 100))}%` }} /></i> : null}
            <small>AI 종합점수 · 5점 기준</small>
          </div>
        </td>
      </tr>
    </>
  )
}

function RiskCandidateDetail({ record, developerMode }: { record: RiskExplorationRecord; developerMode: boolean }) {
  const candidate = getCandidateViewModelById(record.id)
  const quantification = getRiskCandidateQuantification(record)
  const detailPath = `${developerMode ? '/developer-test' : ''}/risks/${candidate?.detailRiskId ?? record.detailRiskId}`
  const isOtaCandidate = record.id === 'ota-delivery-consumer-disputes'
  const evidenceSnapshot = riskCandidateEvidenceSnapshots[record.id]
  const evidenceSourceName = evidenceSnapshot?.sourceName ?? record.sourceName ?? '공식 원문 확인 필요'
  const evidenceSourceUrl = evidenceSnapshot?.sourceUrl ?? record.sourceUrl
  const evidenceSourceDate = evidenceSnapshot?.sourceDate ?? (record.collectedAt ? new Date(record.collectedAt).toLocaleDateString('ko-KR') : '발행일 확인 필요')
  const evidenceNextChecks = Array.from(new Set([
    ...(evidenceSnapshot?.nextChecks ?? []),
    ...(record.contentInsight?.reviewActions ?? []),
    record.gap,
    record.nextAction,
  ])).filter(Boolean)
  const factualEvidence = [
    ...(evidenceSnapshot?.facts ?? []),
    ...(record.contentInsight?.facts ?? []),
    ...(record.facts ?? []),
  ]
  const metricEvidenceText = (metricKey: RiskExplorationMetricKey, fallback: string, factIndex: number, checkIndex: number) => {
    const evidence = record.metricEvidence?.[metricKey]
    return evidence?.quotes?.[0]
      ?? evidence?.reasons?.[0]
      ?? factualEvidence[factIndex]
      ?? evidenceNextChecks[checkIndex]
      ?? fallback
  }
  const flowMetricKeys: Record<string, RiskExplorationMetricKey> = {
    '01': 'demand',
    '02': 'measurability',
    '03': 'fortuity',
    '04': 'legalExposure',
    '05': 'moralHazard',
    '06': 'accumulation',
  }
  const flowStatusLabel = (number: string) => {
    const score = record.metricScores[flowMetricKeys[number]]
    if (!Number.isFinite(score)) return { label: '확인 필요', tone: 'review' as const }
    const definitions: Record<string, { positive: string; middle: string; negative: string; isRisk: boolean }> = {
      '01': { positive: '수요 강함', middle: '수요 확인 중', negative: '수요 제한적', isRisk: false },
      '02': { positive: '측정 용이', middle: '추가 계측 필요', negative: '측정 불확실', isRisk: false },
      '03': { positive: '사고 정의 명확', middle: '조건 구체화 필요', negative: '사고 정의 불명확', isRisk: false },
      '04': { positive: '규제 부담 낮음', middle: '규제 검토 필요', negative: '규제 부담 큼', isRisk: true },
      '05': { positive: '통제 용이', middle: '통제 기준 보완', negative: '통제 어려움', isRisk: true },
      '06': { positive: '누적 영향 제한적', middle: '누적 위험 주의', negative: '누적 영향 큼', isRisk: true },
    }
    const definition = definitions[number]
    if (!definition) return { label: '확인 필요', tone: 'review' as const }
    const isHighScore = score >= 4
    const isLowScore = score < 3
    const label = definition.isRisk
      ? isHighScore ? definition.negative : isLowScore ? definition.positive : definition.middle
      : isHighScore ? definition.positive : isLowScore ? definition.negative : definition.middle
    const tone = definition.isRisk ? (isHighScore ? 'review' : isLowScore ? 'high' : undefined) : (isHighScore ? 'high' : isLowScore ? 'review' : undefined)
    return { label, tone }
  }
  const judgmentEvidence = isOtaCandidate
    ? [
        { number: '01', label: '시장성', text: '피해 대상과 반복 수요가 확인되며, 잠재 가입자군을 비교적 명확히 특정할 수 있음.' },
        { number: '02', label: '손해 측정 가능성', text: '취소·지연·오배송 등 사고 유형별 피해 금액은 산정 가능하나 세부 통계 확보가 추가로 필요함.' },
        { number: '03', label: '보험사고 성립성', text: '사고 발생 여부와 피해 시점을 객관적으로 확인할 수 있어 보험사고 정의가 비교적 명확함.' },
        { number: '04', label: '법적 책임·규제 부담', text: 'OTA·항공사·택배사·판매자 간 책임 주체와 환불·배상 기준을 약관에 명확히 반영할 필요가 있음.' },
        { number: '05', label: '통제 가능성', text: '고의적 청구·중복 보상 방지를 위해 예약·배송·환불 이력과의 연계가 필요함.' },
        { number: '06', label: '손실 규모', text: '개별 사고의 손실은 제한적이나 다수 사고가 동시에 발생하는 누적 노출을 고려해야 함.' },
      ]
    : [
        { number: '01', label: '시장성', text: metricEvidenceText('demand', record.summary, 0, 0) },
        { number: '02', label: '손해 측정 가능성', text: [quantification.pml.numericValue !== null ? `PML ${quantification.pml.value}` : null, metricEvidenceText('measurability', record.gap, 1, 1)].filter(Boolean).join(' · ') },
        { number: '03', label: '보험사고 성립성', text: metricEvidenceText('fortuity', `${record.fortuity} · ${record.summary}`, -1, 0) },
        { number: '04', label: '법적 책임·규제 부담', text: metricEvidenceText('legalExposure', `${record.legalExposure} · ${evidenceNextChecks[0] ?? record.nextAction}`, 2, 0) },
        { number: '05', label: '통제 가능성', text: metricEvidenceText('moralHazard', record.nextAction, 0, 0) },
        { number: '06', label: '손실 규모', text: metricEvidenceText('accumulation', record.gap, -1, 1) },
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
        `${record.secondaryTags.join('·')} 대상의 제휴형 또는 특화 담보 구조 검토`,
      ]
  const flowGroups = [
    { number: '01', title: '수요와 손해 파악', question: '보험을 필요로 하는 시장이 있고 손해를 계산할 수 있는가?', items: judgmentEvidence.slice(0, 2) },
    { number: '02', title: '보험 성립 가능성', question: '사고를 명확히 정의하고 책임과 보상 범위를 정할 수 있는가?', items: judgmentEvidence.slice(2, 4) },
    { number: '03', title: '상품 설계 가능성', question: '위험을 통제하고 예상되는 손실을 감당할 수 있는가?', items: judgmentEvidence.slice(4, 6) },
  ]
  const additionalReviewPoints = Array.from(new Set([...evidenceNextChecks, record.gap, record.nextAction])).filter(Boolean).slice(0, 4)
  const productDesignDirection = record.nextAction

  return (
    <aside className="risk-screening-detail-panel" aria-label={`${record.title} 상세 평가`}>
      <div className="risk-screening-detail-topline">
        <span>{record.secondaryTags[0] ?? '위험 후보'}</span>
        <Link className="risk-screening-detail-link" to={detailPath}>위험 상세 &gt;</Link>
      </div>
      <h4>{record.title}</h4>
      <p className="risk-screening-detail-description">{record.summary}</p>
      <div className="risk-screening-detail-divider" aria-hidden="true" />
      <section className="risk-screening-flow">
        <div className="risk-screening-flow-card">
          <div className="risk-screening-flow-heading">
            <strong>핵심 평가 메트릭스</strong>
          </div>
          <div className="risk-screening-flow-metrics">
            {flowGroups.flatMap((group) => group.items).map((item) => {
                  const status = flowStatusLabel(item.number)
                  return <div className="risk-screening-flow-metric" key={item.number}><strong>{item.label}</strong><em className={status.tone}>{status.label}</em><span>{removeDetailMetricLabel(item.text)}</span></div>
            })}
          </div>
        </div>
      </section>
      <section className="risk-screening-product-direction"><span>S</span><div><strong>최종 상품 설계 포인트</strong><p>{productDesignDirection}</p></div></section>
      <div className="risk-screening-detail-summary-grid">
        <section className="risk-screening-strengths"><strong>상품화 강점</strong><ul>{productizationPoints.slice(0, 3).map((point) => <li key={point}>{point}</li>)}</ul></section>
        <section className="risk-screening-additional-review"><strong>주요 보완 사항</strong><ul>{additionalReviewPoints.slice(0, 3).map((point) => <li key={point}>{point}</li>)}</ul></section>
      </div>
      <footer className="risk-screening-source-footer"><strong>주요 출처</strong><span>{evidenceSourceName} · {evidenceSourceDate}</span>{evidenceSourceUrl ? <a href={evidenceSourceUrl} target="_blank" rel="noreferrer">원문 확인 ↗</a> : null}</footer>
    </aside>
  )
}

export function RiskExplorationLens({ sourceRecords, developerMode = false, developerLaws, developerData }: { sourceRecords?: RiskExplorationRecord[]; developerMode?: boolean; developerLaws?: DeveloperLawQueueItem[]; developerData?: DeveloperRiskCatalogViewData } = {}) {
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
    const frame = window.requestAnimationFrame(() => {
      const tab = document.getElementById(`risk-category-${category}`)
      const tabList = tab?.closest<HTMLElement>('.risk-category-tabs')
      if (!tab || !tabList) return

      // Keep category changes from moving the document vertically. Only the
      // horizontal tab rail should adjust when the selected tab is off-screen.
      const tabRect = tab.getBoundingClientRect()
      const tabListRect = tabList.getBoundingClientRect()
      const offset = tabRect.left - tabListRect.left - (tabListRect.width - tabRect.width) / 2
      const maxScrollLeft = Math.max(0, tabList.scrollWidth - tabList.clientWidth)
      tabList.scrollLeft = Math.min(maxScrollLeft, Math.max(0, tabList.scrollLeft + offset))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [category])

  const updateSearchParam = (key: SearchParamKey, value: string, defaultValue = '') => {
    setSearchParams((currentSearchParams) => {
      const nextSearchParams = new URLSearchParams(currentSearchParams)
      if (!value.trim() || value === defaultValue) nextSearchParams.delete(key)
      else nextSearchParams.set(key, value)
      return nextSearchParams
    }, { replace: true })
  }

  const selectCategory = (nextCategory: ScreeningCategory) => {
    setScreeningPage(1)
    setSelectedRecordId(undefined)
    updateSearchParam('category', nextCategory, 'all')
  }

  const handleCategoryKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const targetIndex = event.key === 'Home' ? 0 : categoryFilters.length - 1
      const target = categoryFilters[targetIndex]
      selectCategory(target.key)
      document.getElementById(`risk-category-${target.key}`)?.focus()
      return
    }
    if (!direction) return
    event.preventDefault()
    const nextIndex = (index + direction + categoryFilters.length) % categoryFilters.length
    const target = categoryFilters[nextIndex]
    selectCategory(target.key)
    document.getElementById(`risk-category-${target.key}`)?.focus()
  }

  const sortedRecords = useMemo(() => {
    const filtered = (developerMode ? (sourceRecords ?? []) : (sourceRecords ?? riskExplorationRecords)).filter((record) => {
      // `categories` is the canonical multi-select classification. Using
      // `primaryCategory` here hid mixed-scope risks from the legal,
      // individual, and corporate tabs even though the record explicitly
      // belonged to those categories.
      const matchesCategory = category === 'all'
        ? true
        : category === 'department'
          ? record.categories.includes('department') || record.signalOrigin === 'department-intake'
          : category === 'customer'
            ? record.categories.includes('customer') || record.signalOrigin === 'customer-intake'
            : record.categories.includes(category)
      const matchesSource = sourceFilter === 'all' || record.sourceName === sourceFilter
      const collectedAt = record.collectedAt ? new Date(record.collectedAt).getTime() : Number.NaN
      const matchesPeriod = period === 'all' || (Number.isFinite(collectedAt) && collectedAt >= now - Number(period) * 24 * 60 * 60 * 1000)
      return matchesCategory && matchesSource && matchesPeriod && matchesRiskQuery(record, query)
    })
    return [...filtered].sort((first, second) => {
      if (sort === 'title') return first.title.localeCompare(second.title, 'ko-KR')
      if (sort === 'score') {
        // The visible AI composite score is the only sort key so rank and score never diverge.
        const scoreValue = (record: RiskExplorationRecord) => screeningScoreFor(record, developerMode) ?? Number.NEGATIVE_INFINITY
        return scoreValue(second) - scoreValue(first)
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

  return (
    <section id="risk-exploration-content" className="risk-exploration-lens surface-card screening-lens" aria-labelledby={category === 'legal' ? 'risk-exploration-title' : undefined} aria-label={category === 'legal' ? undefined : '신규 위험 타당성 스크리닝'}>
      <div className="risk-exploration-filter-row">
        <div className={`risk-category-shell${categoryTabsVisible ? '' : ' is-collapsed'}`}>
          <div className="risk-category-tabs" role="tablist" aria-label="위험 후보 카테고리 필터">
            {categoryFilters.map((filter, index) => (
              <Fragment key={filter.key}>
                {index === 3 || index === 4 ? <span className="risk-category-divider" aria-hidden="true" /> : null}
                <button id={`risk-category-${filter.key}`} type="button" role="tab" aria-selected={category === filter.key} aria-controls="risk-exploration-content" tabIndex={category === filter.key ? 0 : -1} className={`risk-category-button ${category === filter.key ? 'active' : ''}`} aria-pressed={category === filter.key} onClick={() => selectCategory(filter.key)} onKeyDown={(event) => handleCategoryKeyDown(event, index)}>
                  {filter.label}
                </button>
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {category === 'legal' ? <div className="risk-exploration-heading">
        <div>
          <p className="eyebrow">LAW & REGULATION EVALUATION</p>
          <h2 id="risk-exploration-title">주요 법률 및 규제 평가</h2>
        </div>
      </div> : null}

      {category === 'legal' ? <RiskLawTrackingPanel category={category} localLaws={developerLaws ?? []} /> : null}

      {category !== 'legal' ? <>
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
              <option value="score">AI 종합점수 순</option><option value="market">시장성 순</option><option value="fortuity">우연성 순</option><option value="legalExposure">법률 및 규제 리스크 순</option><option value="pml">PML 순</option><option value="title">후보명 순</option>
            </select></label>
          </div>
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
                  {records.map((record, index) => <RiskCandidateComparisonRow key={record.id} record={record} index={pageStart + index} developerMode={developerMode} selected={record.id === selectedRecord?.id} onSelect={() => setSelectedRecordId(record.id)} />)}
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
          {selectedRecord ? <RiskCandidateDetail record={selectedRecord} developerMode={developerMode} /> : null}
        </div>
      ) : <div className="risk-candidate-empty">{developerMode ? <><strong>선택 조건에 맞는 원문 기반 후보가 없습니다.</strong><br />현재 연결된 {developerData?.counts.articles ?? 0}건의 문서에서 조건에 맞는 후보가 없습니다.</> : '조건에 맞는 위험 후보가 없습니다.'}</div>}
      </> : null}

    </section>
  )
}
