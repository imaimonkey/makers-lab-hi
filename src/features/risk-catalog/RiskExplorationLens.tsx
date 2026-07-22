import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { riskExplorationRecords, type ExplorationCategory, type RiskExplorationRecord } from '../../domain/risk/riskExplorationDemo'
import { screeningCases, screeningInsights, screeningLaws, type ScreeningInsight, type ScreeningMetricKey, type ScreeningReference } from '../../domain/risk/riskScreeningInsights'

const categoryFilters: Array<{ key: 'all' | ExplorationCategory; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'individual', label: '개인 위험' },
  { key: 'corporate', label: '기업 위험' },
  { key: 'legal', label: '법률·규제' },
  { key: 'department', label: '타 부서 신호' },
  { key: 'customer', label: '고객 신호' },
]

const metricColumns: Array<{ key: ScreeningMetricKey; label: string; value: (record: RiskExplorationRecord) => string }> = [
  { key: 'demand', label: '시장 수요', value: (record) => record.demand },
  { key: 'fortuity', label: '우연성', value: (record) => record.fortuity },
  { key: 'accumulation', label: '누적위험', value: (record) => record.accumulation },
  { key: 'measurability', label: '측정 가능성', value: (record) => record.measurability },
  { key: 'adverseSelection', label: '역선택 통제성', value: (record) => record.adverseSelection },
  { key: 'moralHazard', label: '도덕적 해이', value: (record) => record.moralHazard },
  { key: 'dataConfidence', label: '데이터 신뢰도', value: (record) => record.dataConfidence },
  { key: 'legalExposure', label: '규제·법적', value: (record) => record.legalExposure },
]

const detailRoutes: Record<string, string> = {
  'ev-battery-fire': 'home-ess-fire',
  'generative-ai-copyright': 'ai-liability',
  'commercial-drone': 'physical-ai-accident',
  'autonomous-level4': 'physical-ai-accident',
  'deepfake-phishing': 'platform-worker-gap',
}

function MetricTooltip({ insight }: { insight: ScreeningInsight }) {
  return (
    <span className="screening-tooltip" data-tone={insight.tone} role="tooltip">
      <strong>{insight.title}</strong>
      <span className="screening-tooltip-section"><b>AI 분석 근거</b>{insight.reasons.map((reason) => <small key={reason}>• {reason}</small>)}</span>
      <span className="screening-tooltip-section source"><b>데이터 출처</b>{insight.sources.map((source) => <small key={source}>• {source}</small>)}</span>
      <span className="screening-tooltip-section judgment"><b>최종 판단</b><em>{insight.judgment}</em></span>
      <i>모든 값과 출처는 SAMPLE이며 원문 검증이 필요합니다.</i>
    </span>
  )
}

function ReferencePanel({ eyebrow, title, records }: { eyebrow: string; title: string; records: ScreeningReference[] }) {
  return (
    <article className="screening-reference-panel">
      <div className="screening-reference-heading"><div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div><span>원문 확인 대기</span></div>
      <div>{records.length ? records.map((record) => <section data-tone={record.tone} key={record.title}><div><span>{record.type}</span><time>{record.date}</time></div><strong>{record.title}</strong><p>{record.description}</p></section>) : <p className="screening-empty">선택한 분류에 연결된 자료가 없습니다.</p>}</div>
    </article>
  )
}

export function RiskExplorationLens() {
  const [category, setCategory] = useState<'all' | ExplorationCategory>('all')
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState('최근 7일')
  const [region, setRegion] = useState('지역 전체')
  const [sort, setSort] = useState('score')
  const [selectedId, setSelectedId] = useState(riskExplorationRecords[0]?.id ?? '')

  const records = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    const filtered = riskExplorationRecords.filter((record) => {
      const matchesCategory = category === 'all' || record.categories.includes(category)
      const haystack = `${record.title} ${record.summary} ${record.tags.join(' ')}`.toLocaleLowerCase('ko-KR')
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery))
    })
    return [...filtered].sort((first, second) => sort === 'title' ? first.title.localeCompare(second.title, 'ko-KR') : second.score - first.score)
  }, [category, query, sort])
  const selected = records.find((record) => record.id === selectedId) ?? records[0]
  const laws = screeningLaws.filter((record) => category === 'all' || record.categories.includes(category))
  const cases = screeningCases.filter((record) => category === 'all' || record.categories.includes(category))

  return (
    <section className="risk-exploration-lens surface-card screening-lens" aria-labelledby="risk-exploration-title">
      <div className="risk-exploration-heading">
        <div><p className="eyebrow">PRODUCTABILITY COMPARISON LENS · SEOYEON</p><h2 id="risk-exploration-title">신규 위험 타당성 스크리닝 TOP-5</h2><p>각 지표 셀에서 분석 근거, 데이터 출처, 최종 판단을 분리해 확인하고 법률·판례 신호와 함께 비교합니다.</p></div>
        <span className="status-badge sample">SAMPLE · 검토용</span>
      </div>

      <div className="screening-control-bar">
        <div className="risk-exploration-tabs" aria-label="위험 후보 분류 필터">{categoryFilters.map((filter) => <button type="button" key={filter.key} className={category === filter.key ? 'active' : ''} aria-pressed={category === filter.key} onClick={() => setCategory(filter.key)}>{filter.label}</button>)}</div>
        <div className="screening-filter-group">
          <label><span className="sr-only">후보 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="위험·기술·이슈 검색" /></label>
          <label><span className="sr-only">기간</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option>최근 7일</option><option>최근 30일</option><option>최근 90일</option></select></label>
          <label><span className="sr-only">지역</span><select value={region} onChange={(event) => setRegion(event.target.value)}><option>지역 전체</option><option>국내</option><option>해외</option></select></label>
          <label><span className="sr-only">정렬</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="score">AI 보조점수 순</option><option value="title">후보명 순</option></select></label>
        </div>
      </div>

      <div className="screening-reference-grid">
        <ReferencePanel eyebrow="LAW & REGULATION" title="주요 부처별 최신 법률·규제" records={laws} />
        <ReferencePanel eyebrow="CASE & LOSS SIGNAL" title="연관 판례·실제 손해·시장 이슈" records={cases} />
      </div>

      <div className="screening-table-heading"><div><p className="eyebrow">AI-ASSISTED SCREENING</p><h3>동일 기준 비교표</h3></div><span>지표 셀에 마우스를 올리거나 키보드 포커스를 이동하면 심층 근거가 표시됩니다.</span></div>
      <div className="screening-table-viewport">
        <table className="screening-comparison-table">
          <caption className="sr-only">seoyeon 브랜치 보험상품화 검토 후보 12열 비교표</caption>
          <thead><tr><th>순위</th><th>위험 후보</th>{metricColumns.map((metric) => <th key={metric.key}>{metric.label}</th>)}<th>AI 보조점수</th><th>공동 평가</th></tr></thead>
          <tbody>{records.length ? records.map((record, index) => <tr className={selected?.id === record.id ? 'selected' : ''} key={record.id}>
            <td className="screening-rank">{index + 1}</td>
            <td className="screening-keyword"><strong>{record.title}</strong><small>{record.summary}</small><span>{record.tags.map((tag) => <i key={tag}>{tag}</i>)}</span></td>
            {metricColumns.map((metric) => <td className="screening-metric-cell" key={metric.key}><button type="button" onClick={() => setSelectedId(record.id)} aria-label={`${record.title} ${metric.label} 근거 보기`}><span>{metric.value(record)}</span><MetricTooltip insight={screeningInsights[record.id][metric.key]} /></button></td>)}
            <td className="screening-score"><strong>{record.score.toFixed(2)}</strong><small>/ 5.00</small></td>
            <td><Link className="screening-detail-link" to={`/risks/${detailRoutes[record.id] ?? 'ai-liability'}`}>상세 분석</Link></td>
          </tr>) : <tr><td colSpan={12} className="table-empty">조건에 맞는 위험 후보가 없습니다.</td></tr>}</tbody>
        </table>
      </div>

      {selected ? <aside className="risk-exploration-detail" aria-live="polite"><div><p className="eyebrow">SELECTED CANDIDATE</p><h3>{selected.title}</h3><p>{selected.nextAction}</p></div><dl><div><dt>시장 수요</dt><dd>{selected.demand}</dd></div><div><dt>측정 가능성</dt><dd>{selected.measurability}</dd></div><div><dt>역선택 통제</dt><dd>{selected.adverseSelection}</dd></div><div><dt>도덕적 해이</dt><dd>{selected.moralHazard}</dd></div><div><dt>데이터·법적</dt><dd>{selected.dataConfidence} · {selected.legalExposure}</dd></div><div><dt>보장 공백</dt><dd>{selected.gap}</dd></div></dl></aside> : null}
      <p className="risk-exploration-disclaimer">SAMPLE · AI 보조점수와 셀별 판단은 우선순위 논의를 위한 예시이며 보험료·보장·가입 가능 여부를 의미하지 않습니다. 표시된 기관 자료도 공식 원문과 최신성 확인 전에는 사실 근거로 사용할 수 없습니다.</p>
    </section>
  )
}
