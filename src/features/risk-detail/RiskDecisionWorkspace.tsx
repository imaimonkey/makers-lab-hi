import { useEffect, useMemo, useState } from 'react'
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
  const [showJudgmentDetail, setShowJudgmentDetail] = useState(false)
  const [checksSavedAt, setChecksSavedAt] = useState<string | null>(null)
  const [checkedNextSteps, setCheckedNextSteps] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem(`risk-next-checks:${risk.id}`)
      const parsed = saved ? JSON.parse(saved) as unknown : []
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(`risk-next-checks:${risk.id}`, JSON.stringify(checkedNextSteps))
    } catch {
      // Local SAMPLE progress is optional when browser storage is unavailable.
    }
  }, [checkedNextSteps, risk.id])

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
  const trend = developerMode && step3Points.length ? step3Points.map((point) => point.value) : getTrend(risk.signalStrength)
  const trendLabels = developerMode && step3Points.length ? step3Points.map((point) => point.label) : trendMonths
  const actualTrend = developerMode && step3Points.length > 0
  const maxTrend = Math.max(...trend, 1)
  const minTrend = Math.min(...trend)
  const savedChangeRate = Number(step3Trend.changeRate)
  const trendRise = actualTrend && Number.isFinite(savedChangeRate)
    ? Math.round(savedChangeRate)
    : actualTrend || developerMode ? 0 : Math.round(((risk.signalStrength - minTrend) / Math.max(minTrend, 1)) * 100)
  const driverScores = [
    { label: '증가성', assessmentId: 'assessment:trend', score: detail.assessments[1]?.score ?? risk.signalStrength, reason: detail.assessments[1]?.note ?? '추가 확인 필요' },
    { label: '피해 심각성', assessmentId: 'assessment:severity', score: detail.assessments[2]?.score ?? risk.signalStrength, reason: detail.assessments[2]?.note ?? detail.primaryLoss },
    { label: '보험 사각지대', assessmentId: 'assessment:coverage-gap', score: detail.assessments[4]?.score ?? 50, reason: detail.assessments[4]?.note ?? '보장 공백 확인 필요' },
  ]
  const linkedSourceCount = evidenceLedger.filter((item) => getSafeSourceUrl(item.sourceUrl ?? null)).length
  const nextSteps = detail.decisionChecks.slice(0, 3).map((label, index) => ({
    label,
    kind: index === 0 ? '우선 확인' : index === 1 ? '보장·책임 확인' : '재검토 조건',
  }))
  const aiQualitativeSummary = developerMode
    ? step3Text(step3Decision.logicComment, step3Text(step3Decision.summary, buildAiQualitativeSummary(risk, detail)))
    : buildAiQualitativeSummary(risk, detail)
  const decisionSummary = detail.decisionTitle.replace(/\s+/g, ' ')
  const judgmentSignals = buildJudgmentSignalDetails(risk, detail)

  function toggleNextStep(label: string) {
    setChecksSavedAt(new Date().toISOString())
    setCheckedNextSteps((current) => current.includes(label)
      ? current.filter((item) => item !== label)
      : [...current, label])
  }

  return (
    <section className="detail-workspace" aria-label="위험상세 평가 워크스페이스">
      <article className="detail-driver-panel surface-card">
        <div><p className="eyebrow">DRIVERS / ASSESSMENT REFERENCES · {developerMode ? 'ACTUAL ARTICLE · STEP 3' : 'SAMPLE'}</p><h2>우선순위를 설명하는 평가 항목</h2><p>이 영역은 priorityIndex를 다시 계산하지 않습니다. 현재 저장된 AI 평가와 근거 ID를 미리 보여주며, 전체 자료는 아래 원장에서 확인합니다.</p>{driverScores.map((driver) => <div className="detail-driver-row" key={driver.label}><span>{driver.label}<small>{driver.assessmentId}</small></span><div><i style={{ width: `${driver.score}%` }} /></div><strong>{(driver.score / 20).toFixed(1)}/5</strong><small>{driver.reason}</small></div>)}</div>
        <aside>
          <strong>priorityIndex</strong>
          <span>권위 값은 상단 hero에 1회 표시</span>
          <p>이 카드의 driverScore는 assessment 설명용입니다. 상품화 승인이나 최종 보험 판단이 아닙니다.</p>
          <details className="score-logic-disclosure">
            <summary>우선순위 계산</summary>
            <div className="logic-step-list">
              <p><b>01</b><span>입력</span><code>수요 신호 {risk.signalStrength}%</code></p>
              <p><b>02</b><span>환산</span><code>{risk.signalStrength}% → {risk.signalStrength}점</code></p>
              <p><b>03</b><span>구간</span><code>{risk.signalStrength >= 80 ? '80 이상 → CRITICAL' : risk.signalStrength >= 65 ? '65–79 → HIGH' : '64 이하 → REVIEW'}</code></p>
              <p className="logic-step-note">{developerMode ? 'Step 2 저장 점수를 우선순위 보조값으로 표시하고, Step 3 AI 판단은 별도 근거와 함께 아래에 연결했습니다.' : '현재 SAMPLE은 수요 신호를 priorityIndex로 직접 사용합니다. 아래 세 값은 assessmentScore를 다시 합산하지 않는 설명용 driverScore입니다.'}</p>
              <div className="ai-qualitative-assessment">
                <span>AI 정성 해석 · {developerMode ? 'STEP 3 저장 결과' : 'SAMPLE'}</span>
                <p>{aiQualitativeSummary}</p>
              </div>
            </div>
          </details>
        </aside>
      </article>

      <section className="detail-next-checks surface-card" aria-labelledby="next-checks-title">
        <div className="detail-next-checks-heading"><div><p className="eyebrow">NEXT REVIEW ACTIONS</p><h2 id="next-checks-title">다음 확인 항목</h2><p>결론 확정 전에 확인할 실무 항목입니다. 체크 상태는 이 브라우저의 {developerMode ? '개발자 검토' : 'SAMPLE'} 진행 상태로만 저장되며 서버·다른 사용자에게 반영되지 않습니다.{checksSavedAt ? ` 마지막 로컬 저장 ${new Date(checksSavedAt).toLocaleString('ko-KR')}` : ''}</p></div><strong>{checkedNextSteps.length}<small>/{nextSteps.length} 완료</small></strong></div>
        <div className="detail-next-check-list">
          {nextSteps.map((step, index) => (
            <label className={checkedNextSteps.includes(step.label) ? 'is-checked' : ''} key={step.label}>
              <input type="checkbox" checked={checkedNextSteps.includes(step.label)} onChange={() => toggleNextStep(step.label)} />
              <span><small>0{index + 1} · {step.kind}</small><strong>{step.label}</strong></span>
            </label>
          ))}
        </div>
      </section>

      <div className="detail-workspace-grid" id="assessment-signal">
        <article className="detail-trend-panel surface-card">
           <div className="panel-heading">
             <div><p className="eyebrow">TREND INDEX · {developerMode ? 'ACTUAL ARTICLE · STEP 3' : 'SAMPLE'}</p><h2>신호 추이</h2></div>
             <div className="panel-heading-side"><span className="updated-label">{actualTrend ? `${trend.length}개 실제 관측점 · STEP 3` : developerMode ? '실제 관측 시계열 없음' : '최근 8개월 · SAMPLE'}</span><details className="score-logic-disclosure score-logic-disclosure--light"><summary>trendIndex 계산</summary><div className="logic-step-list">{actualTrend ? <><p><b>01</b><span>원자료</span><code>{step3Text(step3Trend.signalType, '관측값')} · {trend.length}개</code></p>{trendLabels.map((label, index) => <p key={`${label}-${index}`}><b>{String(index + 2).padStart(2, '0')}</b><span>{label}</span><code>{trend[index]} {step3Points[index]?.unit ?? ''}</code></p>)}<p className="logic-step-note"><b>변화율</b> {Number.isFinite(savedChangeRate) ? `= ${savedChangeRate}%` : '= 산출하지 않음'}</p><p className="logic-step-note">{step3Text(step3Trend.aiComment, step3Text(step3Trend.calculationNote, 'Step 3 추세 결과를 확인했습니다.'))}</p></> : developerMode ? <><p><b>01</b><span>원자료</span><code>현재 수요 신호 = {risk.signalStrength}</code></p><p className="logic-step-note">Step 3 결과에 비교 가능한 복수 시점이 없어 8개월 추세·변화율을 만들지 않았습니다.</p></> : <><p><b>01</b><span>기준값</span><code>현재 수요 신호 = {risk.signalStrength}</code></p><p><b>02</b><span>월별 값</span><code>max(20, 기준값 − 보정값)</code></p>{trendMonths.map((month, index) => <p key={month}><b>{String(index + 3).padStart(2, '0')}</b><span>{month}</span><code>max(20, {risk.signalStrength} − {trendOffsets[index]}) = {trend[index]}</code></p>)}<p className="logic-step-note"><b>변화율</b> = ({risk.signalStrength} − 최저값 {minTrend}) ÷ {minTrend} × 100 = +{trendRise}%</p><p className="logic-step-note">{buildTrendAiSummary(risk, trendRise)}</p></>}</div></details></div>
          </div>
          <p className="detail-panel-description">{developerMode ? actualTrend ? 'Step 3가 저장한 실제 관측점만 표시합니다. 기사 빈도·사고 손해액·보험료와 동일한 값으로 해석하지 않습니다.' : 'Step 3 결과에 비교 가능한 시계열이 없어 현재 관측값만 표시합니다. 없는 기간은 채우지 않았습니다.' : 'trendIndex · 절대 손실액·보험료가 아닌 TOP-10 관측 변화에서 파생한 정규화 SAMPLE 지수입니다. priorityIndex와 같은 값으로 해석하지 않습니다.'}</p>
          <div className="detail-sparkline-layout">
            <div>
                <div className="detail-sparkline" role="img" aria-label={`${risk.title} ${actualTrend ? '실제 관측' : '최근 8개월 SAMPLE'} trendIndex 추이`}>
                <svg viewBox="0 0 302 118" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={`risk-area-${risk.id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--orange)" stopOpacity=".24" /><stop offset="100%" stopColor="var(--orange)" stopOpacity="0" /></linearGradient></defs>{[20, 56, 92].map((y) => <line key={y} x1="0" x2="302" y1={y} y2={y} />)}<polygon points={`4,118 ${trend.map((value, index) => `${trendPointX(index, trend.length)},${108 - ((value - minTrend) / Math.max(maxTrend - minTrend, 1)) * 82}`).join(' ')} 298,118`} fill={`url(#risk-area-${risk.id})`} /><polyline points={trend.map((value, index) => `${trendPointX(index, trend.length)},${108 - ((value - minTrend) / Math.max(maxTrend - minTrend, 1)) * 82}`).join(' ')} />{trend.map((value, index) => <circle key={`${value}-${index}`} cx={trendPointX(index, trend.length)} cy={108 - ((value - minTrend) / Math.max(maxTrend - minTrend, 1)) * 82} r="3.5" />)}</svg>
                <div>{trendLabels.map((month, index) => <span key={`${month}-${index}`}>{month}</span>)}</div>
              </div>
              <button type="button" className={showTable ? 'detail-chart-toggle active' : 'detail-chart-toggle'} aria-expanded={showTable} onClick={() => setShowTable((current) => !current)}>{showTable ? '차트만 보기' : '표로 보기'}</button>
              {showTable ? <div className="detail-chart-table-wrap"><table><caption className="sr-only">{actualTrend ? 'Step 3 실제 관측 trendIndex 표' : '최근 8개월 trendIndex SAMPLE 지수 표'}</caption><thead><tr>{trendLabels.map((month, index) => <th scope="col" key={`${month}-${index}`}>{month}</th>)}</tr></thead><tbody><tr>{trend.map((value, index) => <td key={`${trendLabels[index]}-${index}`}>{value}</td>)}</tr></tbody></table></div> : null}
            </div>
            <aside><strong>{actualTrend && !Number.isFinite(savedChangeRate) ? '—' : `+${trendRise}%`}</strong><span>{actualTrend ? 'Step 3 실제 관측 변화율' : developerMode ? '과거 시계열 확인 필요' : 'trendIndex 8개월 SAMPLE 변화'}</span><dl><div><dt>최고 관측</dt><dd>{Math.max(...trend)}</dd></div><div><dt>관측 범위</dt><dd>{actualTrend ? `${trend.length}개 시점` : '비교 레코드'}</dd></div><div><dt>근거 유형</dt><dd>{evidenceTypes.length - 1}개</dd></div></dl></aside>
          </div>
        </article>

        <article className={showEvidence ? 'detail-evidence-panel surface-card is-expanded' : 'detail-evidence-panel surface-card is-collapsed'}>
          <div className="panel-heading">
            <div><p className="eyebrow">EVIDENCE LEDGER</p><button type="button" className="detail-panel-toggle" aria-expanded={showEvidence} aria-controls="judgment-materials" onClick={() => setShowEvidence((current) => !current)}><strong>판단 자료</strong><span>{showEvidence ? '접기' : '펼치기'}</span><i aria-hidden="true">{showEvidence ? '−' : '+'}</i></button></div>
            <span className="status-badge sample">{linkedSourceCount}/{evidenceLedger.length} URL 연결 · {developerMode ? 'Step 3 근거 확인' : evidenceLedger.length ? evidenceLedger[0].dataStatus : 'pending'}</span>
          </div>
          {showEvidence ? <div id="judgment-materials" className="detail-evidence-content">
            <div className="detail-evidence-tabs" aria-label="판단 자료 유형 필터">
              {evidenceTypes.map((type) => (
                <button key={type} type="button" className={activeEvidence === type ? 'active' : ''} aria-pressed={activeEvidence === type} onClick={() => setActiveEvidence(type)}>
                  {type}
                </button>
              ))}
            </div>
            <div className="detail-evidence-list">
              {filteredEvidence.map((evidence) => (
                <article key={evidence.id}>
                  <span>{evidence.type} · {evidence.dataStatus === 'sample-only' ? 'SAMPLE' : developerMode ? 'ACTUAL ARTICLE' : ''}</span>
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
              {!filteredEvidence.length && <p className="table-empty">선택한 판단 자료 유형이 없습니다.</p>}
            </div>
            <p className="detail-evidence-rule"><AppIcon name="shield" size={14} /> 링크 제공 항목도 구체적 주장·발행일·인용 범위 검증 전에는 확정 자료가 아닙니다.</p>
          </div> : <p className="detail-evidence-collapsed">근거 ID, 출처, 불확실성, 반증·주의를 확인하려면 <strong>판단 자료</strong>를 펼쳐 주세요.</p>}
        </article>
      </div>

      <section className={showJudgmentDetail ? 'detail-judgment-detail surface-card is-expanded' : 'detail-judgment-detail surface-card'} aria-labelledby="judgment-detail-title">
        <div className="detail-judgment-detail-heading">
          <div><p className="eyebrow">DECISION BRIEF · {developerMode ? 'ACTUAL ARTICLE · STEP 3' : 'SAMPLE'}</p><h2 id="judgment-detail-title">판단 상세</h2><p>신호·손실·자료 신뢰도를 한 번에 읽고 다음 확인으로 연결합니다.</p></div>
          <button type="button" className="detail-panel-toggle detail-panel-toggle--outline" aria-expanded={showJudgmentDetail} aria-controls="judgment-detail-content" onClick={() => setShowJudgmentDetail((current) => !current)}><strong>{showJudgmentDetail ? '상세 접기' : '판단 상세 보기'}</strong><i aria-hidden="true">{showJudgmentDetail ? '−' : '+'}</i></button>
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
                    <span>AI 논리 코멘트 · {developerMode ? 'STEP 3 저장 결과' : 'SAMPLE'}</span>
                    <p>{signal.aiComment}</p>
                  </div>
                  <div className="detail-judgment-sources">
                    <span>연결 자료 · {signal.evidence.length}건</span>
                    {signal.evidence.length ? (
                      <ul>
                        {signal.evidence.map((evidence) => {
                          const sourceUrl = getSafeSourceUrl(evidence.sourceUrl)
                          return (
                            <li key={evidence.id}>
                              <strong>{evidence.id}</strong>
                              <small>{evidence.sourceName} · {evidence.title}</small>
                              {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer noopener">URL 후보 ↗</a> : <em>원문 연결 대기</em>}
                            </li>
                          )
                        })}
                      </ul>
                    ) : <p>연결된 판단 자료가 없습니다. 원문 확인 후 자료를 추가해야 합니다.</p>}
                  </div>
                </details>
              </article>
            ))}
          </div>
          <div className="detail-judgment-next"><div><span>다음 판단 자료</span><small>결론 확정 전 확인할 항목</small></div><ul>{detail.decisionChecks.slice(0, 3).map((check) => <li key={check}>{check}</li>)}</ul></div>
        </div> : <p className="detail-judgment-collapsed">판단 상태와 주요 지표를 한눈에 보려면 <strong>판단 상세 보기</strong>를 눌러 주세요.</p>}
      </section>

    </section>
  )
}
