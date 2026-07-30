import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  riskExplorationRecords,
  type ExplorationCategory,
  type RiskExplorationMetricEvidence,
  type RiskExplorationRecord,
} from '../../domain/risk/riskExplorationDemo'
import { getCandidateViewModelById } from '../../domain/risk/candidateViewModel'
import {
  getContextualScreeningInsight,
  screeningInsights,
  screeningMetricContexts,
  type ContextualScreeningInsight,
  type ScreeningCategory,
  type ScreeningMetricKey,
} from '../../domain/risk/riskScreeningInsights'
import { RiskLawTrackingPanel } from './RiskLawTrackingPanel'
import type { DeveloperLawQueueItem, DeveloperRiskCatalogViewData } from './developerStep2Adapter'

const categoryFilters: Array<{ key: ScreeningCategory; label: string; icon: string }> = [
  { key: 'all', label: '전체', icon: '◈' },
  { key: 'individual', label: '개인 위험', icon: '🧍' },
  { key: 'corporate', label: '기업 위험', icon: '🏢' },
  { key: 'legal', label: '법률·규제', icon: '⚖️' },
  { key: 'department', label: '타 부서 신호', icon: '🏬' },
  { key: 'customer', label: '고객 신호', icon: '🤝' },
]

const tagClassByLabel: Record<string, string> = {
  개인: 'tag-blue',
  기업: 'tag-purple',
  자동차: 'tag-green',
  제조물책임: 'tag-red',
  배상책임: 'tag-rose',
  내부책임: 'tag-amber',
  금융: 'tag-indigo',
  기후: 'tag-cyan',
  사이버: 'tag-slate',
  에너지: 'tag-orange',
  건강: 'tag-teal',
  상해: 'tag-lime',
}

const getTagClass = (tag: string) => tagClassByLabel[tag] ?? 'tag-default'

function actualScore(record: RiskExplorationRecord) {
  const values = Object.values(record.metricScores).filter((value) => Number.isFinite(value) && value > 0)
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

const renderDotValue = (value: string, dots: number) => (
  <span className="screening-metric-pill screening-metric-pill-dots">
    <span className="screening-dot-value" aria-hidden="true">{value}</span>
    <span className="sr-only">{dots}/5</span>
  </span>
)

const renderProgressValue = (value: string, percent: number) => (
  <span className="screening-metric-pill screening-progress-pill">
    <span className="screening-progress-track" aria-hidden="true">
      <span style={{ width: `${percent}%` }} />
    </span>
    <span className="screening-progress-value">{value}</span>
  </span>
)

const metricColumns: Array<{
  key: ScreeningMetricKey
  value: (record: RiskExplorationRecord) => string
  render: (record: RiskExplorationRecord) => ReactNode
}> = [
  { key: 'demand', value: (record) => record.display.demandVal, render: (record) => <span className="screening-metric-pill">{record.display.demandVal}</span> },
  { key: 'fortuity', value: (record) => record.display.fortVal, render: (record) => renderDotValue(record.display.fortVal, record.display.fortuityDots) },
  { key: 'accumulation', value: (record) => record.display.accumVal, render: (record) => renderDotValue(record.display.accumVal, record.display.accumulationDots) },
  { key: 'measurability', value: (record) => record.display.measVal, render: (record) => renderDotValue(record.display.measVal, record.display.measurabilityDots) },
  { key: 'adverseSelection', value: (record) => record.display.adverseVal, render: (record) => <span className="screening-metric-pill">{record.display.adverseVal}</span> },
  { key: 'moralHazard', value: (record) => record.display.moralVal, render: (record) => <span className="screening-metric-pill">{record.display.moralVal}</span> },
  { key: 'dataConfidence', value: (record) => record.display.dataVal, render: (record) => renderProgressValue(record.display.dataVal, record.display.dataConfidencePercent) },
  {
    key: 'legalExposure',
    value: (record) => record.display.riskLabel,
    render: (record) => (
      <span className="screening-metric-pill screening-legal-pill">
        <strong data-tone={record.metricScores.legalExposure >= 4 ? 'critical' : 'warning'}>{record.display.riskLabel}</strong>
        <small>{record.display.legalRiskSub}</small>
      </span>
    ),
  },
]

type ScreeningSort = 'score' | 'title'
type SearchParamKey = 'q' | 'category' | 'sort'

const isScreeningCategory = (value: string | null): value is ScreeningCategory => (
  categoryFilters.some((filter) => filter.key === value)
)

function MetricTooltip({ id, insight, evidenceCount, actualEvidence }: { id: string; insight: ContextualScreeningInsight; evidenceCount: number; actualEvidence?: RiskExplorationMetricEvidence }) {
  const tooltipStyle = { '--screening-tooltip-tone': insight.color } as CSSProperties

  return (
    <span id={id} className="screening-tooltip" data-tone={insight.tone} style={tooltipStyle} role="tooltip">
      <strong>{insight.title}</strong>
      <span className="screening-tooltip-section">
        <b>대표 사유</b>
        {insight.reasons.slice(0, 2).map((reason) => <small key={reason}>• {reason}</small>)}
      </span>
      <small className="screening-tooltip-evidence">{evidenceCount ? `연결 근거 ${evidenceCount}건 · 전체 판단 자료는 위험 상세에서 확인` : '유효한 원문 근거 없음 · 점수는 0 또는 확인 필요로 표시'}</small>
      {actualEvidence?.sourceIds.length ? <small className="screening-tooltip-evidence">근거 ID · {actualEvidence.sourceIds.join(' · ')}</small> : null}
      {actualEvidence?.quotes.length ? <span className="screening-tooltip-section"><b>원문 인용</b>{actualEvidence.quotes.slice(0, 2).map((quote) => <small key={quote}>“{quote}”</small>)}</span> : null}
      {actualEvidence?.scoreRationale ? <span className="screening-tooltip-section"><b>점수 산식·판정</b><small>{actualEvidence.scoreRationale}</small></span> : null}
      {actualEvidence?.confidence ? <small className="screening-tooltip-evidence">신뢰도 · {actualEvidence.confidence}</small> : null}
      {actualEvidence?.counterEvidence.length ? <span className="screening-tooltip-section"><b>반대·제한 근거</b><small>{actualEvidence.counterEvidence.join(' · ')}</small></span> : null}
      {actualEvidence?.uncertainty.length ? <span className="screening-tooltip-section"><b>불확실성</b><small>{actualEvidence.uncertainty.join(' · ')}</small></span> : null}
      <i>{insight.sources[0] === 'actual' ? '실제 Step 2 결과 · 원문 검증 필요' : 'SAMPLE · 원문과 최신성 확인 필요'}</i>
    </span>
  )
}

export function RiskExplorationLens({ sourceRecords, developerMode = false, developerLaws, developerData, onRunDeveloperStep2, developerRunning = false }: { sourceRecords?: RiskExplorationRecord[]; developerMode?: boolean; developerLaws?: DeveloperLawQueueItem[]; developerData?: DeveloperRiskCatalogViewData; onRunDeveloperStep2?: () => void; developerRunning?: boolean } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState(sourceRecords?.[0]?.id ?? riskExplorationRecords[0]?.id ?? '')
  const [period, setPeriod] = useState<'all' | '7' | '30' | '90'>('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [now] = useState(() => Date.now())

  const categoryParam = searchParams.get('category')
  const category: ScreeningCategory = isScreeningCategory(categoryParam) ? categoryParam : 'all'
  const query = searchParams.get('q') ?? ''
  const sort: ScreeningSort = searchParams.get('sort') === 'title' ? 'title' : 'score'
  const metricContexts = screeningMetricContexts[category]
  const actualSources = useMemo(() => [...new Set((sourceRecords ?? []).map((record) => record.sourceName).filter((source): source is string => Boolean(source)))], [sourceRecords])
  const actualEvidenceCount = (record: RiskExplorationRecord, metric?: ScreeningMetricKey) => {
    if (metric) return record.metricEvidence?.[metric]?.sourceIds.length ?? 0
    return record.evidenceIds?.length ?? 0
  }

  const updateSearchParam = (
    key: SearchParamKey,
    value: string,
    defaultValue = '',
  ) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    if (!value.trim() || value === defaultValue) {
      nextSearchParams.delete(key)
    } else {
      nextSearchParams.set(key, value)
    }
    setSearchParams(nextSearchParams, { replace: true })
  }

  const records = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    const filtered = (developerMode ? (sourceRecords ?? []) : (sourceRecords ?? riskExplorationRecords)).filter((record) => {
      const matchesCategory = category === 'all' || record.categories.includes(category as ExplorationCategory)
      const haystack = `${record.title} ${record.summary} ${record.tags.join(' ')}`.toLocaleLowerCase('ko-KR')
      const matchesSource = sourceFilter === 'all' || record.sourceName === sourceFilter
      const date = record.collectedAt ? new Date(record.collectedAt).getTime() : Number.NaN
      const matchesPeriod = period === 'all' || (Number.isFinite(date) && date >= now - Number(period) * 24 * 60 * 60 * 1000)
      return matchesCategory && matchesSource && matchesPeriod && (!normalizedQuery || haystack.includes(normalizedQuery))
    })

    return [...filtered].sort((first, second) => (
      sort === 'title'
        ? first.title.localeCompare(second.title, 'ko-KR')
        : (developerMode ? actualScore(second) : getCandidateViewModelById(second.id)?.screeningScore.value ?? 0) - (developerMode ? actualScore(first) : getCandidateViewModelById(first.id)?.screeningScore.value ?? 0)
    ))
  }, [category, developerMode, now, period, query, sort, sourceFilter, sourceRecords])

  const selected = records.find((record) => record.id === selectedId) ?? records[0]

  return (
    <section className="risk-exploration-lens surface-card screening-lens" aria-labelledby="risk-exploration-title">
      <div className="risk-exploration-heading">
        <div>
          <p className="eyebrow">PRODUCTABILITY COMPARISON LENS · SEOYEON</p>
          <h2 id="risk-exploration-title">신규 위험 타당성 스크리닝 TOP-10</h2>
          <p>8개 선별 지표로 무엇을 상세 검증할지 비교합니다. 상품화 승인이나 최종 보험 판단은 이 화면의 역할이 아닙니다.</p>
        </div>
        <span className="status-badge sample">{developerMode ? `ACTUAL ARTICLE · STEP 2 · 근거 ${sourceRecords?.reduce((count, record) => count + actualEvidenceCount(record), 0) ?? 0}건` : 'SAMPLE · 검토용'}</span>
      </div>

      <div className="screening-control-bar">
        <div className="risk-exploration-tabs" aria-label="위험 후보 분류 필터">
          {categoryFilters.map((filter) => (
            <button
              type="button"
              key={filter.key}
              className={category === filter.key ? 'active' : ''}
              aria-pressed={category === filter.key}
              onClick={() => updateSearchParam('category', filter.key, 'all')}
            >
              <span aria-hidden="true">{filter.icon}</span>{filter.label}
            </button>
          ))}
        </div>
        <div className="screening-filter-group">
          <label>
            <span className="sr-only">후보 검색</span>
            <input
              type="search"
              value={query}
              onChange={(event) => updateSearchParam('q', event.target.value)}
              placeholder="위험·기술·이슈 검색"
            />
          </label>
          <label>
            <span className="sr-only">기간</span>
            <select value={developerMode ? period : 'all'} disabled={!developerMode} onChange={(event) => setPeriod(event.target.value as typeof period)} aria-label="원문 수집 기간">
              <option value="all">전체 기간</option>
              <option value="7">최근 7일</option>
              <option value="30">최근 30일</option>
              <option value="90">최근 90일</option>
            </select>
          </label>
          <label>
            <span className="sr-only">출처</span>
            <select value={developerMode ? sourceFilter : 'all'} disabled={!developerMode} onChange={(event) => setSourceFilter(event.target.value)} aria-label="원문 출처">
              <option value="all">출처 전체</option>
              {actualSources.map((source) => <option value={source} key={source}>{source}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">정렬</span>
            <select
              value={sort}
              onChange={(event) => updateSearchParam('sort', event.target.value, 'score')}
            >
              <option value="score">후보 선별점수 순</option>
              <option value="title">후보명 순</option>
            </select>
          </label>
        </div>
      </div>

      <RiskLawTrackingPanel category={category} developerLaws={developerMode ? (developerLaws ?? []) : undefined} onRunDeveloperStep2={developerMode ? onRunDeveloperStep2 : undefined} developerRunning={developerRunning} />

      <div className="screening-table-heading">
        <div><p className="eyebrow">AI-ASSISTED SCREENING</p><h3>동일 기준 비교표</h3></div>
        <span>지표 셀에는 대표 사유만 표시합니다. 전체 근거·반증은 탭 3의 Evidence Ledger에서 확인합니다.</span>
      </div>
      <div className="screening-table-viewport">
        <table className="screening-comparison-table">
          <caption className="sr-only">위험 후보 선별 지표와 상세 검증 진입 비교표</caption>
          <thead>
            <tr>
              <th>순위</th>
              <th>위험 후보</th>
              {metricColumns.map((metric) => <th key={metric.key}>{metricContexts[metric.key].label}</th>)}
              <th>후보 선별점수</th>
              <th>상세 검증</th>
            </tr>
          </thead>
          <tbody>
            {records.length ? records.map((record, index) => (
              <tr className={selected?.id === record.id ? 'selected' : ''} key={record.id}>
                <td className="screening-rank">{index + 1}</td>
                <td className="screening-keyword">
                  <strong>{record.title}</strong>
                  <small>{record.summary}</small>
                  <span className="screening-tag-group">
                    {record.tags.map((tag) => <i className={`screening-tag ${getTagClass(tag)}`} key={tag}>{tag}</i>)}
                  </span>
                </td>
                {metricColumns.map((metric) => {
                  const tooltipId = `screening-tooltip-${record.id}-${metric.key}`
                  const contextualInsight = developerMode
                    ? { title: '실제 Step 2 결과', valueLabel: metric.value(record), reasons: record.metricEvidence?.[metric.key]?.reasons.length ? record.metricEvidence[metric.key]?.reasons ?? [] : [record.metricEvidence?.[metric.key]?.scoreRationale ?? '이 지표에 연결된 근거 문장이 없습니다.'], sources: ['actual'], judgment: record.metricEvidence?.[metric.key]?.judgment ?? '저장된 Step 2 결과를 확인합니다.', tone: 'warning' as const, color: '#ff9e1b' }
                    : getContextualScreeningInsight((screeningInsights[record.id] ?? screeningInsights[Object.keys(screeningInsights)[0]])[metric.key], category, metric.key)
                  return (
                    <td className="screening-metric-cell" key={metric.key}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(record.id)}
                        aria-label={`${record.title} ${metricContexts[metric.key].label} ${metric.value(record)} 근거 보기`}
                        aria-describedby={tooltipId}
                      >
                        {metric.render(record)}
                        <MetricTooltip id={tooltipId} insight={contextualInsight} evidenceCount={developerMode ? actualEvidenceCount(record, metric.key) : getCandidateViewModelById(record.id)?.evidence.count ?? 0} actualEvidence={developerMode ? record.metricEvidence?.[metric.key] : undefined} />
                      </button>
                    </td>
                  )
                })}
                <td className="screening-score">
                  <strong>{developerMode ? (actualScore(record) ? `${actualScore(record).toFixed(2)} / 5` : '점수 확인 필요') : getCandidateViewModelById(record.id)?.screeningScore.value?.toFixed(2) ?? '—'}</strong>
                  <small>{developerMode ? '8개 지표 AI 보조 평균 · 원문 인용 확인 필요' : '우선순위 SAMPLE'}</small>
                  <em>{developerMode ? '담당자 검토 필요' : getCandidateViewModelById(record.id)?.candidateStatus}</em>
                </td>
                <td>
                  {getCandidateViewModelById(record.id)?.detailRiskId ?? record.detailRiskId ? (
                    <Link
                      className="screening-detail-link"
                      to={{
                        pathname: `${developerMode ? '/developer-test' : ''}/risks/${getCandidateViewModelById(record.id)?.detailRiskId ?? record.detailRiskId}`,
                        search: new URLSearchParams({
                          ...(query ? { q: query } : {}),
                          ...(category !== 'all' ? { category } : {}),
                          ...(sort !== 'score' ? { sort } : {}),
                          from: developerMode ? '/developer-test/risks' : '/risks',
                        }).toString(),
                      }}
                    >상세 검증</Link>
                  ) : <span className="table-empty">canonical mapping 대기</span>}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={12} className="table-empty">조건에 맞는 위험 후보가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
        {developerMode && !records.length ? <div className="developer-catalog-empty"><strong>아직 비교할 Step 2 결과가 없습니다</strong><p>현재 {developerData?.counts.articles ?? 0}건의 실제 원문이 준비되어 있습니다. Step 2를 실행하면 후보·8개 지표·근거 ID가 이 표에 연결됩니다.</p>{onRunDeveloperStep2 ? <button type="button" onClick={onRunDeveloperStep2} disabled={developerRunning}>{developerRunning ? 'Step 2 분석 중…' : 'Step 2 전체 실행'}</button> : null}</div> : null}
      </div>

      <p className="risk-exploration-disclaimer">
        {developerMode
          ? 'ACTUAL ARTICLE · Step 2 저장 결과에 없는 값은 확인 필요로 표시합니다. 점수는 담당자 검토 순서를 정하는 보조값입니다.'
          : 'SAMPLE · 후보 선별점수와 셀별 판단은 상세 검증 순서를 정하는 예시이며 보험료·보장·가입 가능 여부를 의미하지 않습니다. 표시된 기관 자료도 공식 원문과 최신성 확인 전에는 사실 근거로 사용할 수 없습니다.'}
      </p>
    </section>
  )
}
