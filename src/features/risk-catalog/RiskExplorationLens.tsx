import { useMemo, useState } from 'react'
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
  type RiskCandidateQuantificationMetric,
} from '../../domain/risk/riskCandidateQuantification'
import type { ScreeningCategory } from '../../domain/risk/riskScreeningInsights'
import { RiskLawTrackingPanel } from './RiskLawTrackingPanel'
import type { DeveloperLawQueueItem, DeveloperRiskCatalogViewData } from './developerStep2Adapter'

const categoryFilters: Array<{ key: ScreeningCategory; label: string; icon: string }> = [
  { key: 'all', label: '전체', icon: '◉' },
  { key: 'individual', label: '개인 위험', icon: '◌' },
  { key: 'corporate', label: '기업 위험', icon: '▣' },
  { key: 'legal', label: '법률·규제', icon: '§' },
  { key: 'department', label: '부처 신호', icon: '⌘' },
  { key: 'customer', label: '고객 신호', icon: '♧' },
]

function tagClass(tag: string) {
  if (tag === '개인') return 'tag-blue'
  if (tag === '기업') return 'tag-purple'
  return 'tag-default'
}

type ScreeningSort = 'score' | 'title' | RiskCandidateQuantificationKey
type SearchParamKey = 'q' | 'category' | 'sort'

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

function cardRiskLevel(record: RiskExplorationRecord) {
  if (record.display.riskLabel.includes('고위험')) return 'high'
  if (record.display.riskLabel.includes('중위험')) return 'medium'
  return 'low'
}

function riskLevelLabel(record: RiskExplorationRecord) {
  return record.display.riskLabel.replace(/^[^가-힣A-Za-z]+/, '')
}

function MetricDetail({ metric }: { metric: RiskCandidateQuantificationMetric }) {
  return (
    <div className="risk-candidate-metric-detail" role="region" aria-label={`${metric.label} 산식과 근거`}>
      <div className="risk-candidate-detail-heading">
        <strong>{metric.label} 상세</strong>
        <span>{metric.confidence} · SAMPLE</span>
      </div>
      <dl>
        <div><dt>공식·공개 입력</dt><dd>{metric.official.length ? metric.official.join(' · ') : '입력 자료 없음 · 확인 필요'}</dd></div>
        <div><dt>프로젝트 가정값</dt><dd>{metric.assumption.join(' · ')}</dd></div>
        <div><dt>산식</dt><dd>{metric.formula.join(' · ')}</dd></div>
        <div><dt>결과</dt><dd>{metric.result}</dd></div>
      </dl>
    </div>
  )
}

function RiskCandidateCard({ record, index, developerMode }: { record: RiskExplorationRecord; index: number; developerMode: boolean }) {
  const [openMetric, setOpenMetric] = useState<RiskCandidateQuantificationKey | null>(null)
  const candidate = getCandidateViewModelById(record.id)
  const quantification = getRiskCandidateQuantification(record)
  const detailPath = `${developerMode ? '/developer-test' : ''}/risks/${candidate?.detailRiskId ?? record.detailRiskId}`

  return (
    <article className="risk-candidate-card">
      <div className="risk-candidate-card-topline">
        <span className="risk-candidate-rank">TOP {String(index + 1).padStart(2, '0')}</span>
        <span className={`risk-candidate-level ${cardRiskLevel(record)}`}>● {riskLevelLabel(record)}</span>
      </div>
      <div className="risk-candidate-tags">
        {record.tags.map((tag) => <span className={`screening-tag ${tagClass(tag)}`} key={tag}>{tag}</span>)}
      </div>
      <h4>{record.title}</h4>
      <p className="risk-candidate-summary">{record.summary}</p>

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

      <div className="risk-candidate-score">
        <div><span>기존 AI 종합점수</span><strong>{(developerMode ? actualScore(record) : candidate?.screeningScore.value)?.toFixed(2) ?? '확인 필요'}</strong></div>
        <small>{developerMode ? '0–5 · 실제 Step 2 결과 · 근거 검증 필요' : '0–5 · 후보 선별 보조값 · SAMPLE'}</small>
      </div>

      <section className="risk-candidate-quantification" aria-label="신규 위험 타당성 스크리닝 평가 항목">
          <div className="risk-candidate-metrics">
            {(Object.keys(quantification) as RiskCandidateQuantificationKey[]).map((key) => {
              const metric = quantification[key]
              const isOpen = openMetric === key
              return (
                <div className={`risk-candidate-metric ${metric.color} ${isOpen ? 'active' : ''}`} key={key}>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpenMetric(isOpen ? null : key)}>
                    <span><strong>{metric.label}</strong><small>{metric.sub}</small></span>
                    <b>{metric.value}</b>
                  </button>
                </div>
              )
            })}
          </div>
      </section>
      {openMetric ? <MetricDetail metric={quantification[openMetric]} /> : null}

      <div className="risk-candidate-confidence">
        <div><span>데이터 신뢰도 · {developerMode ? '실제 Step 2' : 'SAMPLE'}</span><strong>{record.display.dataVal}</strong></div>
        <div className="risk-candidate-confidence-track" aria-hidden="true"><span style={{ width: `${record.display.dataConfidencePercent}%` }} /></div>
      </div>

      <div className="risk-candidate-actions">
        <Link to={detailPath}>후보 상세</Link>
        <Link to={`${detailPath}#evidence`}>근거 검증</Link>
        <Link to={`${developerMode ? '/developer-test' : ''}/reports?sourceRiskId=${encodeURIComponent(candidate?.detailRiskId ?? record.detailRiskId)}`}>종합 평가</Link>
      </div>
    </article>
  )
}

export function RiskExplorationLens({ sourceRecords, developerMode = false, developerLaws, developerData, onRunDeveloperStep2, developerRunning = false }: { sourceRecords?: RiskExplorationRecord[]; developerMode?: boolean; developerLaws?: DeveloperLawQueueItem[]; developerData?: DeveloperRiskCatalogViewData; onRunDeveloperStep2?: () => void; developerRunning?: boolean } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [period, setPeriod] = useState<'all' | '7' | '30' | '90'>('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [now] = useState(() => Date.now())
  const categoryParam = searchParams.get('category')
  const category: ScreeningCategory = isScreeningCategory(categoryParam) ? categoryParam : 'all'
  const query = searchParams.get('q') ?? ''
  const sort: ScreeningSort = isScreeningSort(searchParams.get('sort')) ? searchParams.get('sort') as ScreeningSort : 'score'

  const updateSearchParam = (key: SearchParamKey, value: string, defaultValue = '') => {
    const nextSearchParams = new URLSearchParams(searchParams)
    if (!value.trim() || value === defaultValue) nextSearchParams.delete(key)
    else nextSearchParams.set(key, value)
    setSearchParams(nextSearchParams, { replace: true })
  }

  const records = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    const filtered = (developerMode ? (sourceRecords ?? []) : (sourceRecords ?? riskExplorationRecords)).filter((record) => {
      const matchesCategory = category === 'all' || record.categories.includes(category as ExplorationCategory)
      const haystack = `${record.title} ${record.summary} ${record.tags.join(' ')}`.toLocaleLowerCase('ko-KR')
      const matchesSource = sourceFilter === 'all' || record.sourceName === sourceFilter
      const collectedAt = record.collectedAt ? new Date(record.collectedAt).getTime() : Number.NaN
      const matchesPeriod = period === 'all' || (Number.isFinite(collectedAt) && collectedAt >= now - Number(period) * 24 * 60 * 60 * 1000)
      return matchesCategory && matchesSource && matchesPeriod && (!normalizedQuery || haystack.includes(normalizedQuery))
    })
    return [...filtered].sort((first, second) => {
      if (sort === 'title') return first.title.localeCompare(second.title, 'ko-KR')
      if (sort === 'score') return (developerMode ? actualScore(second) : getCandidateViewModelById(second.id)?.screeningScore.value ?? 0) - (developerMode ? actualScore(first) : getCandidateViewModelById(first.id)?.screeningScore.value ?? 0)
      const secondValue = metricSortValue(second, sort)
      const firstValue = metricSortValue(first, sort)
      if (secondValue === null && firstValue === null) return 0
      if (secondValue === null) return -1
      if (firstValue === null) return 1
      return secondValue - firstValue
    })
  }, [category, developerMode, now, period, query, sort, sourceFilter, sourceRecords])

  const actualSources = useMemo(() => [...new Set((sourceRecords ?? []).map((record) => record.sourceName).filter((source): source is string => Boolean(source)))], [sourceRecords])

  return (
    <section className="risk-exploration-lens surface-card screening-lens" aria-labelledby="risk-exploration-title">
      <div className="risk-exploration-heading">
        <div>
          <p className="eyebrow">LAW & REGULATION UPDATES · SEOYEON</p>
          <h2 id="risk-exploration-title">주요 법률 및 규제 업데이트</h2>
          <p>주요 법률·규제 변화와 상품화 종합평가 기준에 따른 위험 후보 수치화를 함께 확인합니다.</p>
        </div>
        <span className="status-badge sample">{developerMode ? `CONTENT-DERIVED SAMPLE · 본문 구조화 · 근거 ${sourceRecords?.reduce((count, record) => count + (record.evidenceIds?.length ?? 0), 0) ?? 0}건` : 'SAMPLE · 검증용'}</span>
      </div>

      <div className="screening-control-bar">
        <div className="risk-exploration-tabs" aria-label="위험 후보 분류 필터">
          {categoryFilters.map((filter) => (
            <button type="button" key={filter.key} className={category === filter.key ? 'active' : ''} aria-pressed={category === filter.key} onClick={() => updateSearchParam('category', filter.key, 'all')}>
              <span aria-hidden="true">{filter.icon}</span>{filter.label}
            </button>
          ))}
        </div>
        <div className="screening-filter-group">
          <label><span className="sr-only">후보 검색</span><input type="search" value={query} onChange={(event) => updateSearchParam('q', event.target.value)} placeholder="위험·기술·이슈 검색" /></label>
          <label><span className="sr-only">기간</span><select value={developerMode ? period : 'all'} disabled={!developerMode} onChange={(event) => setPeriod(event.target.value as typeof period)} aria-label="원문 수집 기간">
            <option value="all">전체 기간</option><option value="7">최근 7일</option><option value="30">최근 30일</option><option value="90">최근 90일</option>
          </select></label>
          <label><span className="sr-only">출처</span><select value={developerMode ? sourceFilter : 'all'} disabled={!developerMode} onChange={(event) => setSourceFilter(event.target.value)} aria-label="원문 출처">
            <option value="all">출처 전체</option>{actualSources.map((source) => <option value={source} key={source}>{source}</option>)}
          </select></label>
          <label><span className="sr-only">정렬</span><select value={sort} onChange={(event) => updateSearchParam('sort', event.target.value, 'score')}>
            <option value="score">후보 선별점수 순</option><option value="market">시장성 순</option><option value="fortuity">우연성 순</option><option value="legalExposure">법률 및 규제 리스크 순</option><option value="pml">PML 순</option><option value="title">후보명 순</option>
          </select></label>
        </div>
      </div>

      <RiskLawTrackingPanel category={category} developerLaws={developerMode ? (developerLaws ?? []) : undefined} onRunDeveloperStep2={developerMode ? onRunDeveloperStep2 : undefined} developerRunning={developerRunning} />

      <div className="risk-candidate-grid-heading">
        <div><p className="eyebrow">AI-ASSISTED SCREENING</p><h3>신규 위험 타당성 스크리닝</h3></div>
        <span>시장성·우연성·법률 및 규제 리스크·PML을 카드별로 확인하고 근거 검증으로 이동합니다.</span>
      </div>
      {records.length ? (
        <div className="risk-candidate-grid">
          {records.map((record, index) => <RiskCandidateCard key={record.id} record={record} index={index} developerMode={developerMode} />)}
        </div>
      ) : <div className="risk-candidate-empty">{developerMode ? <><strong>선택 조건에 맞는 원문 기반 후보가 없습니다.</strong><br />현재 {developerData?.counts.articles ?? 0}건의 원문은 본문 구조화 더미 결과로 준비되어 있습니다.{onRunDeveloperStep2 ? <button type="button" onClick={onRunDeveloperStep2} disabled={developerRunning}>{developerRunning ? 'Step 2 분석 중…' : '실제 Step 2 전체 실행'}</button> : null}</> : '조건에 맞는 위험 후보가 없습니다.'}</div>}

      <p className="risk-exploration-disclaimer">SAMPLE · 카드의 점수·시장성·우연성·법률 및 규제 리스크는 기사 기반 예비 검토값입니다. PML처럼 입력 근거가 없는 항목은 추정하지 않으며, 공식 출처·독립 통계·반증은 상세 검증에서 확인해야 합니다.</p>
    </section>
  )
}
