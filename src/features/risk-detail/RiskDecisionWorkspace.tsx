import { useMemo, useState } from 'react'
import type { SampleRiskCandidate, SampleRiskDetail, SampleRiskEvidence } from '../../domain/risk/sampleData'
import { toEvidenceLedger, type EvidenceLedgerItem } from '../../domain/risk/evidenceLedger'
import { AppIcon } from '../../shared/components/AppIcon'
import { buildAiQualitativeSummary, buildJudgmentSignalDetails, buildTrendAiSummary, getSafeSourceUrl } from './qualitativeAssessment'
import type { SavedStep3AnalysisRow } from '../llm-util/util-3'
import { step3Nested, step3Text } from './step3ResultAdapter'

const confidenceLabel: Record<SampleRiskEvidence['confidence'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

const trendOffsets = [31, 26, 20, 23, 14, 10, 6, 0]

function getTrend(signalStrength: number) {
  return trendOffsets.map((offset) => Math.max(20, signalStrength - offset))
}

function trendPointX(index: number, total: number) {
  return total <= 1 ? 151 : (index * 294) / (total - 1) + 4
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR')
}

function getEvidenceDate(evidence: EvidenceLedgerItem): string {
  if (evidence.publishedAt) return formatDate(evidence.publishedAt)
  if (evidence.collectedAt) return formatDate(evidence.collectedAt)
  return '확인 필요'
}

function sourceKindLabel(evidence: EvidenceLedgerItem): string {
  if (evidence.sourceType === 'news' || evidence.type.includes('뉴스')) return '뉴스'
  if (evidence.sourceType === 'research' || evidence.sourceType === 'report' || evidence.type.includes('보고서') || evidence.type.includes('논문')) return '논문·보고서'
  if (evidence.sourceType === 'regulation' || evidence.type.includes('기관') || evidence.type.includes('규제')) return '기관·법령'
  if (evidence.sourceType === 'internal-sample') return '분석 결과'
  return '연결 자료'
}

const trendMonths = ['11월', '12월', '1월', '2월', '3월', '4월', '5월', '6월']

export function RiskDecisionWorkspace({
  risk,
  detail,
  developerMode = false,
  step3Results = [],
}: {
  risk: SampleRiskCandidate
  detail: SampleRiskDetail
  developerMode?: boolean
  step3Results?: SavedStep3AnalysisRow[]
}) {
  const [activeEvidence, setActiveEvidence] = useState('전체')
  const [showTable, setShowTable] = useState(false)
  const [showEvidence, setShowEvidence] = useState(false)
  const [showJudgmentDetail, setShowJudgmentDetail] = useState(true)
  const evidenceLedger = useMemo(() => toEvidenceLedger(detail.evidence), [detail.evidence])
  const evidenceTypes = useMemo(
    () => ['전체', ...new Set(evidenceLedger.map((item) => item.type))],
    [evidenceLedger],
  )
  const filteredEvidence = evidenceLedger.filter(
    (item) => activeEvidence === '전체' || item.type === activeEvidence,
  )
  const step3Decision = step3Nested(step3Results, 'decisionBrief', 'decisionBrief')
  const step3Trend = step3Nested(step3Results, 'trend', 'signalTrend')
  const step3Points = Array.isArray(step3Trend.points) ? step3Trend.points.flatMap((point) => {
    const item = point && typeof point === 'object' ? point as Record<string, unknown> : {}
    const value = Number(item.value)
    return Number.isFinite(value) ? [{ value, label: step3Text(item.observedAt, '현재'), unit: step3Text(item.unit, '관측값') }] : []
  }) : []
  const trend = developerMode && step3Points.length ? step3Points.map((point) => point.value) : developerMode ? [risk.signalStrength] : getTrend(risk.signalStrength)
  const trendLabels = developerMode && step3Points.length ? step3Points.map((point) => point.label) : developerMode ? ['현재'] : trendMonths
  const actualTrend = developerMode && step3Points.length > 0
  const maxTrend = Math.max(...trend, 1)
  const minTrend = Math.min(...trend)
  const savedChangeRate = Number(step3Trend.changeRate)
  const trendRise = actualTrend && Number.isFinite(savedChangeRate)
    ? Math.round(savedChangeRate)
    : actualTrend || developerMode ? 0 : Math.round(((risk.signalStrength - minTrend) / Math.max(minTrend, 1)) * 100)
  const hasTrendRate = actualTrend ? Number.isFinite(savedChangeRate) : !developerMode
  const linkedSourceCount = evidenceLedger.filter((item) => getSafeSourceUrl(item.sourceUrl ?? null)).length
  const aiQualitativeSummary = developerMode
    ? step3Text(step3Decision.logicComment, step3Text(step3Decision.summary, buildAiQualitativeSummary(risk, detail)))
    : buildAiQualitativeSummary(risk, detail)
  const decisionSummary = detail.decisionTitle.replace(/\s+/g, ' ')
  const judgmentSignals = buildJudgmentSignalDetails(risk, detail).filter((signal) => signal.label !== '근거 신뢰도')

  return (
    <section className="detail-workspace" aria-label="위험상세 평가 워크스페이스">
      <div className="detail-workspace-grid" id="assessment-signal">
        <article className="detail-trend-panel surface-card">
           <div className="panel-heading">
             <div><p className="eyebrow">OBSERVED SIGNAL TREND</p><h2>관측 신호 추이</h2></div>
             <div className="panel-heading-side"><span className="updated-label">{actualTrend ? `${trend.length}개 실제 관측점` : developerMode ? '시계열 미확보' : '최근 8개월'}</span><details className="score-logic-disclosure score-logic-disclosure--light"><summary>관측값 산출·해석</summary><div className="logic-step-list">{actualTrend ? <><p><b>01</b><span>원자료</span><code>{step3Text(step3Trend.signalType, '관측값')} · {trend.length}개</code></p>{trendLabels.map((label, index) => <p key={`${label}-${index}`}><b>{String(index + 2).padStart(2, '0')}</b><span>{label}</span><code>{trend[index]} {step3Points[index]?.unit ?? ''}</code></p>)}<p className="logic-step-note"><b>변화율</b> {Number.isFinite(savedChangeRate) ? `= ${savedChangeRate}%` : '= 산출하지 않음'}</p><p className="logic-step-note">{step3Text(step3Trend.aiComment, step3Text(step3Trend.calculationNote, '추세 결과를 확인했습니다.'))}</p></> : developerMode ? <><p><b>01</b><span>원자료</span><code>현재 후보 관측 신호 = {risk.signalStrength}</code></p><p className="logic-step-note">비교 가능한 시점이 없어 변화율을 산출하지 않았습니다.</p></> : <><p><b>01</b><span>기준값</span><code>현재 후보 관측 신호 = {risk.signalStrength}</code></p><p><b>02</b><span>월별 값</span><code>max(20, 기준값 − 보정값)</code></p>{trendMonths.map((month, index) => <p key={month}><b>{String(index + 3).padStart(2, '0')}</b><span>{month}</span><code>max(20, {risk.signalStrength} − {trendOffsets[index]}) = {trend[index]}</code></p>)}<p className="logic-step-note"><b>변화율</b> = ({risk.signalStrength} − 최저값 {minTrend}) ÷ {minTrend} × 100 = +{trendRise}%</p><p className="logic-step-note">{buildTrendAiSummary(risk, trendRise)}</p></>}</div></details></div>
          </div>
          <p className="detail-panel-description">{developerMode ? actualTrend ? '저장된 실제 관측점만 표시합니다. 기사 빈도·사고 손해액·보험료와 동일한 값으로 해석하지 않습니다.' : '비교 가능한 시계열이 없어 현재 관측값만 표시합니다. 없는 기간은 채우지 않았습니다.' : '기사·시장에 나타난 관측 신호의 상대적 변화를 보여줍니다. 위험의 손해액이나 상단 우선 검토 지수와 같은 값으로 해석하지 않습니다.'}</p>
          <div className="detail-sparkline-layout">
            <div>
                <div className="detail-sparkline" role="img" aria-label={`${risk.title} ${actualTrend ? '실제 관측' : developerMode ? '현재 관측' : '최근 8개월'} 관측 신호 추이`}>
                <svg viewBox="0 0 302 118" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={`risk-area-${risk.id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--orange)" stopOpacity=".24" /><stop offset="100%" stopColor="var(--orange)" stopOpacity="0" /></linearGradient></defs>{[20, 56, 92].map((y) => <line key={y} x1="0" x2="302" y1={y} y2={y} />)}<polygon points={`4,118 ${trend.map((value, index) => `${trendPointX(index, trend.length)},${108 - ((value - minTrend) / Math.max(maxTrend - minTrend, 1)) * 82}`).join(' ')} 298,118`} fill={`url(#risk-area-${risk.id})`} /><polyline points={trend.map((value, index) => `${trendPointX(index, trend.length)},${108 - ((value - minTrend) / Math.max(maxTrend - minTrend, 1)) * 82}`).join(' ')} />{trend.map((value, index) => <circle key={`${value}-${index}`} cx={trendPointX(index, trend.length)} cy={108 - ((value - minTrend) / Math.max(maxTrend - minTrend, 1)) * 82} r="3.5" />)}</svg>
                <div>{trendLabels.map((month, index) => <span key={`${month}-${index}`}>{month}</span>)}</div>
              </div>
              <button type="button" className={showTable ? 'detail-chart-toggle active' : 'detail-chart-toggle'} aria-expanded={showTable} onClick={() => setShowTable((current) => !current)}>{showTable ? '차트만 보기' : '표로 보기'}</button>
              {showTable ? <div className="detail-chart-table-wrap"><table><caption className="sr-only">관측 신호 표</caption><thead><tr>{trendLabels.map((month, index) => <th scope="col" key={`${month}-${index}`}>{month}</th>)}</tr></thead><tbody><tr>{trend.map((value, index) => <td key={`${trendLabels[index]}-${index}`}>{value}</td>)}</tr></tbody></table></div> : null}
            </div>
            <aside><strong>{hasTrendRate ? `+${trendRise}%` : '—'}</strong><span>{actualTrend ? '관측 변화율' : developerMode ? '변화율 산출 대기' : '최근 8개월 변화'}</span><dl><div><dt>최고 관측</dt><dd>{Math.max(...trend)}</dd></div><div><dt>관측 범위</dt><dd>{actualTrend ? `${trend.length}개 시점` : '최근 8개월'}</dd></div><div><dt>연결 근거</dt><dd>{evidenceLedger.length}건</dd></div></dl></aside>
          </div>
        </article>

        <article id="judgment-materials" className={showEvidence ? 'detail-evidence-panel surface-card is-expanded' : 'detail-evidence-panel surface-card is-collapsed'}>
          <div className="panel-heading">
            <div><p className="eyebrow">EVIDENCE LEDGER</p><button type="button" className="detail-panel-toggle" aria-expanded={showEvidence} aria-controls="judgment-materials" onClick={() => setShowEvidence((current) => !current)}><strong>근거 자료</strong><span>{showEvidence ? '접기' : '펼치기'}</span><i aria-hidden="true">{showEvidence ? '−' : '+'}</i></button></div>
            <span className="status-badge sample">{linkedSourceCount}/{evidenceLedger.length} URL 연결 · 원문 확인 필요</span>
          </div>
          {showEvidence ? <div className="detail-evidence-content">
            <div className="detail-evidence-tabs" aria-label="근거 자료 유형 필터">
              {evidenceTypes.map((type) => (
                <button key={type} type="button" className={activeEvidence === type ? 'active' : ''} aria-pressed={activeEvidence === type} onClick={() => setActiveEvidence(type)}>
                  {type}
                </button>
              ))}
            </div>
            <div className="detail-evidence-list">
              {filteredEvidence.map((evidence) => (
                <article key={evidence.id}>
                  <span>{evidence.type}</span>
                  <strong>{evidence.title}</strong>
                  <small>{evidence.sourceName} · {getEvidenceDate(evidence)} · 신뢰도 {confidenceLabel[evidence.confidence]}</small>
                  <p>{evidence.excerpt}</p>
                  <dl>
                    <div><dt>근거 ID</dt><dd>{evidence.id}</dd></div>
                    <div><dt>연결 판단</dt><dd>{evidence.supports.join(', ')}</dd></div>
                    <div><dt>불확실성</dt><dd>{evidence.uncertainty}</dd></div>
                    <div><dt>반증·주의</dt><dd>{evidence.counterpoint}</dd></div>
                  </dl>
                  <div className="detail-evidence-source-action">
                    {getSafeSourceUrl(evidence.sourceUrl ?? null)
                      ? <a href={getSafeSourceUrl(evidence.sourceUrl ?? null) ?? undefined} target="_blank" rel="noreferrer noopener">원문 후보 열기 ↗</a>
                      : <span>원문 URL 연결 대기</span>}
                  </div>
                </article>
              ))}
              {!filteredEvidence.length && <p className="table-empty">선택한 근거 자료 유형이 없습니다.</p>}
            </div>
            <p className="detail-evidence-rule"><AppIcon name="shield" size={14} /> 링크 제공 항목도 구체적 주장·발행일·인용 범위 검증 전에는 확정 자료가 아닙니다.</p>
          </div> : <p className="detail-evidence-collapsed">근거 ID, 출처, 불확실성, 반증·주의를 확인하려면 <strong>근거 자료</strong>를 펼쳐 주세요.</p>}
        </article>
      </div>

      <section id="ai-judgment-evidence" className={showJudgmentDetail ? 'detail-judgment-detail surface-card is-expanded' : 'detail-judgment-detail surface-card'} aria-labelledby="judgment-detail-title">
        <div className="detail-judgment-detail-heading">
          <div><p className="eyebrow">AI JUDGMENT EVIDENCE</p><h2 id="judgment-detail-title">AI 판단 근거</h2><p>AI가 왜 이 위험을 검토 대상으로 판단했는지, 뉴스·논문·기관 자료와 연결해 확인합니다.</p></div>
          <button type="button" className="detail-panel-toggle detail-panel-toggle--outline" aria-expanded={showJudgmentDetail} aria-controls="judgment-detail-content" onClick={() => setShowJudgmentDetail((current) => !current)}><strong>{showJudgmentDetail ? '근거 접기' : 'AI 판단 근거 보기'}</strong><i aria-hidden="true">{showJudgmentDetail ? '−' : '+'}</i></button>
        </div>
        {showJudgmentDetail ? <div id="judgment-detail-content" className="detail-judgment-detail-content">
          <div className="detail-judgment-callout"><span>현재 판단 · {detail.decisionStatus}</span><strong>{decisionSummary}</strong><p>{aiQualitativeSummary}</p></div>
          <div className="detail-judgment-metrics">
            {judgmentSignals.map((signal) => (
              <article key={signal.label}>
                <div className="detail-judgment-metric-heading">
                  <span>{signal.label}</span>
                  <strong>{signal.score}<small>/100</small></strong>
                </div>
                <div className="detail-judgment-metric-bar"><i style={{ width: `${signal.score}%` }} /></div>
                <p className="detail-judgment-metric-note">{signal.note}</p>
                <details className="detail-judgment-metric-details" open>
                  <summary>근거·계산·AI 논리</summary>
                  <dl>
                    <div><dt>수치 근거</dt><dd>{signal.basis}</dd></div>
                    <div><dt>계산 방식</dt><dd><code>{signal.calculation}</code></dd></div>
                  </dl>
                  <div className="detail-judgment-ai-comment">
                    <span>AI 논리 코멘트</span>
                    <p>{signal.aiComment}</p>
                  </div>
                  <div className="detail-judgment-sources">
                    <span>판단에 연결된 근거 · {signal.evidence.length}건</span>
                    {signal.evidence.length ? (
                      <ul>
                        {signal.evidence.map((evidence) => {
                          const sourceUrl = getSafeSourceUrl(evidence.sourceUrl)
                          return (
                            <li key={evidence.id}>
                              <strong>{evidence.id}</strong>
                              <small><b>{sourceKindLabel(evidence)}</b> · {evidence.sourceName} · {evidence.title}</small>
                              {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer noopener">URL 후보 ↗</a> : <em>원문 연결 대기</em>}
                            </li>
                          )
                        })}
                      </ul>
                    ) : <p>연결된 근거 자료가 없습니다. 원문 확인 후 자료를 추가해야 합니다.</p>}
                  </div>
                </details>
              </article>
            ))}
          </div>
          <div className="detail-judgment-next"><div><span>다음 근거 확인</span><small>결론 확정 전 확인할 항목</small></div><ul>{detail.decisionChecks.slice(0, 3).map((check) => <li key={check}>{check}</li>)}</ul></div>
        </div> : <p className="detail-judgment-collapsed">AI가 위험으로 판단한 이유와 연결 근거를 보려면 <strong>AI 판단 근거 보기</strong>를 눌러 주세요.</p>}
      </section>

    </section>
  )
}
