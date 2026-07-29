import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  calculateRiskExplorationScore,
  riskExplorationRecords,
  type ExplorationCategory,
  type RiskExplorationRecord,
} from '../../domain/risk/riskExplorationDemo'
import {
  getContextualScreeningInsight,
  screeningInsights,
  screeningMetricContexts,
  type ContextualScreeningInsight,
  type ScreeningCategory,
  type ScreeningMetricKey,
} from '../../domain/risk/riskScreeningInsights'
import { RiskLawTrackingPanel } from './RiskLawTrackingPanel'

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
  value !== 'legal' && categoryFilters.some((filter) => filter.key === value)
)

function MetricTooltip({ id, insight }: { id: string; insight: ContextualScreeningInsight }) {
  const tooltipStyle = { '--screening-tooltip-tone': insight.color } as CSSProperties

  return (
    <span id={id} className="screening-tooltip" data-tone={insight.tone} style={tooltipStyle} role="tooltip">
      <strong>{insight.title}</strong>
      <span className="screening-tooltip-section">
        <b>AI 분석 근거</b>
        {insight.reasons.map((reason) => <small key={reason}>• {reason}</small>)}
      </span>
      <span className="screening-tooltip-section source">
        <b>데이터 출처</b>
        {insight.sources.map((source) => <small key={source}>• {source}</small>)}
      </span>
      <span className="screening-tooltip-section judgment">
        <b>최종 판단</b>
        <em>{insight.judgment}</em>
      </span>
      <i>모든 값과 출처는 SAMPLE이며 원문 검증이 필요합니다.</i>
    </span>
  )
}

export function RiskExplorationLens({ sourceRecords, developerMode = false }: { sourceRecords?: RiskExplorationRecord[]; developerMode?: boolean } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState(sourceRecords?.[0]?.id ?? riskExplorationRecords[0]?.id ?? '')

  const categoryParam = searchParams.get('category')
  const category: ScreeningCategory = isScreeningCategory(categoryParam) ? categoryParam : 'all'
  const query = searchParams.get('q') ?? ''
  const sort: ScreeningSort = searchParams.get('sort') === 'title' ? 'title' : 'score'
  const metricContexts = screeningMetricContexts[category]

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
    const filtered = (sourceRecords ?? riskExplorationRecords).filter((record) => {
      const matchesCategory = category === 'all' || record.categories.includes(category as ExplorationCategory)
      const haystack = `${record.title} ${record.summary} ${record.tags.join(' ')}`.toLocaleLowerCase('ko-KR')
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery))
    })

    return [...filtered].sort((first, second) => (
      sort === 'title'
        ? first.title.localeCompare(second.title, 'ko-KR')
        : calculateRiskExplorationScore(second.metricScores) - calculateRiskExplorationScore(first.metricScores)
    ))
  }, [category, query, sort, sourceRecords])

  const selected = records.find((record) => record.id === selectedId) ?? records[0]

  return (
    <section className="risk-exploration-lens surface-card screening-lens" aria-labelledby="risk-exploration-title">
      <div className="risk-exploration-heading">
        <div>
          <p className="eyebrow">PRODUCTABILITY COMPARISON LENS · SEOYEON</p>
          <h2 id="risk-exploration-title">신규 위험 타당성 스크리닝 TOP-10</h2>
          <p>각 지표 셀에서 분석 근거를 확인하고 법령 트래킹·판례·손해 자료와 함께 비교합니다.</p>
        </div>
        <span className="status-badge sample">{developerMode ? 'ACTUAL ARTICLE · STEP 2' : 'SAMPLE · 검토용'}</span>
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
            <select value="sample" disabled aria-label="기간 필터 미연동, SAMPLE">
              <option value="sample">기간 미연동 · SAMPLE</option>
            </select>
          </label>
          <label>
            <span className="sr-only">지역</span>
            <select value="sample" disabled aria-label="지역 필터 미연동, SAMPLE">
              <option value="sample">지역 미연동 · SAMPLE</option>
            </select>
          </label>
          <label>
            <span className="sr-only">정렬</span>
            <select
              value={sort}
              onChange={(event) => updateSearchParam('sort', event.target.value, 'score')}
            >
              <option value="score">AI 보조점수 순</option>
              <option value="title">후보명 순</option>
            </select>
          </label>
        </div>
      </div>

      <RiskLawTrackingPanel category={category} />

      <div className="screening-table-heading">
        <div><p className="eyebrow">AI-ASSISTED SCREENING</p><h3>동일 기준 비교표</h3></div>
        <span>지표 셀에 마우스를 올리거나 키보드 포커스를 이동하면 심층 근거가 표시됩니다.</span>
      </div>
      <div className="screening-table-viewport">
        <table className="screening-comparison-table">
          <caption className="sr-only">seoyeon 브랜치 보험상품화 검토 후보 TOP-10 12열 비교표</caption>
          <thead>
            <tr>
              <th>순위</th>
              <th>위험 후보</th>
              {metricColumns.map((metric) => <th key={metric.key}>{metricContexts[metric.key].label}</th>)}
              <th>AI 보조점수</th>
              <th>공동 평가</th>
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
                  const contextualInsight = getContextualScreeningInsight(
                    (screeningInsights[record.id] ?? screeningInsights[Object.keys(screeningInsights)[0]])[metric.key],
                    category,
                    metric.key,
                  )
                  return (
                    <td className="screening-metric-cell" key={metric.key}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(record.id)}
                        aria-label={`${record.title} ${metricContexts[metric.key].label} ${metric.value(record)} 근거 보기`}
                        aria-describedby={tooltipId}
                      >
                        {metric.render(record)}
                        <MetricTooltip id={tooltipId} insight={contextualInsight} />
                      </button>
                    </td>
                  )
                })}
                <td className="screening-score">
                  <strong>{calculateRiskExplorationScore(record.metricScores).toFixed(2)}</strong>
                  <small>/ 5.00</small>
                </td>
                <td>
                  <Link className="screening-detail-link" to={`${developerMode ? '/developer-test' : ''}/risks/${record.detailRiskId}`}>상세 분석</Link>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={12} className="table-empty">조건에 맞는 위험 후보가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="risk-exploration-disclaimer">
        SAMPLE · AI 보조점수와 셀별 판단은 우선순위 논의를 위한 예시이며 보험료·보장·가입 가능 여부를 의미하지 않습니다.
        표시된 기관 자료도 공식 원문과 최신성 확인 전에는 사실 근거로 사용할 수 없습니다.
      </p>
    </section>
  )
}
