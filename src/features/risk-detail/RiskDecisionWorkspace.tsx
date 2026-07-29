import { useEffect, useMemo, useState } from 'react'
import type { SampleRiskCandidate, SampleRiskDetail, SampleRiskEvidence } from '../../domain/risk/sampleData'
import { AppIcon } from '../../shared/components/AppIcon'
import { buildAiQualitativeSummary, buildJudgmentSignalDetails, buildTrendAiSummary, getSafeSourceUrl } from './qualitativeAssessment'

const confidenceLabel: Record<SampleRiskEvidence['confidence'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

const trendOffsets = [31, 26, 20, 23, 14, 10, 6, 0]

function getTrend(signalStrength: number) {
  return trendOffsets.map((offset) => Math.max(20, signalStrength - offset))
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR')
}

function getEvidenceDate(evidence: SampleRiskEvidence): string {
  return evidence.publishedAt ? formatDate(evidence.publishedAt) : evidence.date
}

const trendMonths = ['11월', '12월', '1월', '2월', '3월', '4월', '5월', '6월']

export function RiskDecisionWorkspace({
  risk,
  detail,
}: {
  risk: SampleRiskCandidate
  detail: SampleRiskDetail
}) {
  const [activeEvidence, setActiveEvidence] = useState('전체')
  const [showTable, setShowTable] = useState(false)
  const [showEvidence, setShowEvidence] = useState(false)
  const [showJudgmentDetail, setShowJudgmentDetail] = useState(false)
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

  const evidenceTypes = useMemo(
    () => ['전체', ...new Set(detail.evidence.map((item) => item.type))],
    [detail.evidence],
  )
  const filteredEvidence = detail.evidence.filter(
    (item) => activeEvidence === '전체' || item.type === activeEvidence,
  )
  const trend = getTrend(risk.signalStrength)
  const maxTrend = Math.max(...trend, 1)
  const minTrend = Math.min(...trend)
  const trendRise = Math.round(((risk.signalStrength - minTrend) / Math.max(minTrend, 1)) * 100)
  const driverScores = [
    { label: '증가성', score: detail.assessments[1]?.score ?? risk.signalStrength, reason: detail.assessments[1]?.note ?? '추가 확인 필요' },
    { label: '피해 심각성', score: detail.assessments[2]?.score ?? risk.signalStrength, reason: detail.assessments[2]?.note ?? detail.primaryLoss },
    { label: '보험 사각지대', score: detail.assessments[4]?.score ?? 50, reason: detail.assessments[4]?.note ?? '보장 공백 확인 필요' },
  ]
  const linkedSourceCount = detail.evidence.filter((item) => getSafeSourceUrl(item.sourceUrl)).length
  const nextSteps = detail.decisionChecks.slice(0, 3).map((label, index) => ({
    label,
    kind: index === 0 ? '우선 확인' : index === 1 ? '보장·책임 확인' : '재검토 조건',
  }))
  const aiQualitativeSummary = buildAiQualitativeSummary(risk, detail)
  const decisionSummary = detail.decisionTitle.replace(/\s+/g, ' ')
  const judgmentSignals = buildJudgmentSignalDetails(risk, detail)

  function toggleNextStep(label: string) {
    setCheckedNextSteps((current) => current.includes(label)
      ? current.filter((item) => item !== label)
      : [...current, label])
  }

  return (
    <section className="detail-workspace" aria-label="위험상세 평가 워크스페이스">
      <article className="detail-driver-panel surface-card">
        <div><p className="eyebrow">KEY DECISION SIGNALS · SAMPLE</p><h2>핵심 판단 신호</h2><p>우선순위를 설명하는 3개 신호를 요약합니다. 최종 결정 전 연결 자료를 확인하세요.</p>{driverScores.map((driver) => <div className="detail-driver-row" key={driver.label}><span>{driver.label}</span><div><i style={{ width: `${driver.score}%` }} /></div><strong>{(driver.score / 20).toFixed(1)}/5</strong><small>{driver.reason}</small></div>)}</div>
        <aside>
          <strong>{risk.signalStrength}</strong>
          <span>{risk.signalStrength >= 80 ? 'CRITICAL PRIORITY' : risk.signalStrength >= 65 ? 'HIGH PRIORITY' : 'REVIEW PRIORITY'}</span>
          <p>비교용 SAMPLE입니다. 최종 결정 전 담당자 검토가 필요합니다.</p>
          <details className="score-logic-disclosure">
            <summary>우선순위 계산</summary>
            <div className="logic-step-list">
              <p><b>01</b><span>입력</span><code>수요 신호 {risk.signalStrength}%</code></p>
              <p><b>02</b><span>환산</span><code>{risk.signalStrength}% → {risk.signalStrength}점</code></p>
              <p><b>03</b><span>구간</span><code>{risk.signalStrength >= 80 ? '80 이상 → CRITICAL' : risk.signalStrength >= 65 ? '65–79 → HIGH' : '64 이하 → REVIEW'}</code></p>
              <p className="logic-step-note">현재 SAMPLE은 수요 신호를 우선순위 지수로 직접 사용합니다. 세 가지 판단 근거는 점수를 임의로 더하는 값이 아니라 왜 이 구간인지 설명하는 보조 지표입니다.</p>
              <div className="ai-qualitative-assessment">
                <span>AI 정성 해석 · SAMPLE</span>
                <p>{aiQualitativeSummary}</p>
              </div>
            </div>
          </details>
        </aside>
      </article>

      <section className="detail-next-checks surface-card" aria-labelledby="next-checks-title">
        <div className="detail-next-checks-heading"><div><p className="eyebrow">NEXT REVIEW ACTIONS</p><h2 id="next-checks-title">다음 확인 항목</h2><p>결론 확정 전에 확인할 실무 항목입니다. 체크 상태는 이 브라우저의 SAMPLE 진행 상태로만 저장됩니다.</p></div><strong>{checkedNextSteps.length}<small>/{nextSteps.length} 완료</small></strong></div>
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
             <div><p className="eyebrow">SIGNAL TREND · SAMPLE</p><h2>신호 추이</h2></div>
             <div className="panel-heading-side"><span className="updated-label">최근 8개월 · SAMPLE</span><details className="score-logic-disclosure score-logic-disclosure--light"><summary>추세 계산</summary><div className="logic-step-list"><p><b>01</b><span>기준값</span><code>현재 수요 신호 = {risk.signalStrength}</code></p><p><b>02</b><span>월별 값</span><code>max(20, 기준값 − 보정값)</code></p>{trendMonths.map((month, index) => <p key={month}><b>{String(index + 3).padStart(2, '0')}</b><span>{month}</span><code>max(20, {risk.signalStrength} − {trendOffsets[index]}) = {trend[index]}</code></p>)}<p className="logic-step-note"><b>변화율</b> = ({risk.signalStrength} − 최저값 {minTrend}) ÷ {minTrend} × 100 = +{trendRise}%</p><p className="logic-step-note">{buildTrendAiSummary(risk, trendRise)}</p></div></details></div>
          </div>
          <p className="detail-panel-description">절대 손실액이나 보험료가 아닌 TOP-10 수요 신호에서 파생한 정규화 SAMPLE 지수입니다.</p>
          <div className="detail-sparkline-layout">
            <div>
              <div className="detail-sparkline" role="img" aria-label={`${risk.title} 최근 8개월 SAMPLE 신호 추이`}>
                <svg viewBox="0 0 302 118" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={`risk-area-${risk.id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--orange)" stopOpacity=".24" /><stop offset="100%" stopColor="var(--orange)" stopOpacity="0" /></linearGradient></defs>{[20, 56, 92].map((y) => <line key={y} x1="0" x2="302" y1={y} y2={y} />)}<polygon points={`4,118 ${trend.map((value, index) => `${index * 42 + 4},${108 - ((value - minTrend) / Math.max(maxTrend - minTrend, 1)) * 82}`).join(' ')} 298,118`} fill={`url(#risk-area-${risk.id})`} /><polyline points={trend.map((value, index) => `${index * 42 + 4},${108 - ((value - minTrend) / Math.max(maxTrend - minTrend, 1)) * 82}`).join(' ')} />{trend.map((value, index) => <circle key={`${value}-${index}`} cx={index * 42 + 4} cy={108 - ((value - minTrend) / Math.max(maxTrend - minTrend, 1)) * 82} r="3.5" />)}</svg>
                <div>{trendMonths.map((month) => <span key={month}>{month}</span>)}</div>
              </div>
              <button type="button" className={showTable ? 'detail-chart-toggle active' : 'detail-chart-toggle'} aria-expanded={showTable} onClick={() => setShowTable((current) => !current)}>{showTable ? '차트만 보기' : '표로 보기'}</button>
              {showTable ? <div className="detail-chart-table-wrap"><table><caption className="sr-only">최근 8개월 위험 탐지 SAMPLE 지수 표</caption><thead><tr>{trendMonths.map((month) => <th scope="col" key={month}>{month}</th>)}</tr></thead><tbody><tr>{trend.map((value, index) => <td key={trendMonths[index]}>{value}</td>)}</tr></tbody></table></div> : null}
            </div>
            <aside><strong>+{trendRise}%</strong><span>8개월 SAMPLE 변화</span><dl><div><dt>최고 관측</dt><dd>{risk.signalStrength}</dd></div><div><dt>관측 범위</dt><dd>비교 레코드</dd></div><div><dt>근거 유형</dt><dd>{evidenceTypes.length - 1}개</dd></div></dl></aside>
          </div>
        </article>

        <article className={showEvidence ? 'detail-evidence-panel surface-card is-expanded' : 'detail-evidence-panel surface-card is-collapsed'}>
          <div className="panel-heading">
            <div><p className="eyebrow">EVIDENCE LEDGER</p><button type="button" className="detail-panel-toggle" aria-expanded={showEvidence} aria-controls="judgment-materials" onClick={() => setShowEvidence((current) => !current)}><strong>판단 자료</strong><span>{showEvidence ? '접기' : '펼치기'}</span><i aria-hidden="true">{showEvidence ? '−' : '+'}</i></button></div>
            <span className="status-badge sample">{linkedSourceCount}/{detail.evidence.length} URL 연결</span>
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
                  <span>{evidence.type} · {evidence.dataStatus === 'sample-only' ? 'SAMPLE' : ''}</span>
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
                    {getSafeSourceUrl(evidence.sourceUrl)
                      ? <a href={getSafeSourceUrl(evidence.sourceUrl) ?? undefined} target="_blank" rel="noreferrer noopener">원문 후보 열기 ↗</a>
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
          <div><p className="eyebrow">DECISION BRIEF · SAMPLE</p><h2 id="judgment-detail-title">판단 상세</h2><p>신호·손실·자료 신뢰도를 한 번에 읽고 다음 확인으로 연결합니다.</p></div>
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
                    <span>AI 논리 코멘트 · SAMPLE</span>
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
