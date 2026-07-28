import { useEffect, useMemo, useState } from 'react'
import type { SampleRiskCandidate, SampleRiskDetail, SampleRiskEvidence } from '../../domain/risk/sampleData'
import { AppIcon } from '../../shared/components/AppIcon'

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

function getSafeSourceUrl(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null
  try {
    const url = new URL(sourceUrl)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
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

  function toggleNextStep(label: string) {
    setCheckedNextSteps((current) => current.includes(label)
      ? current.filter((item) => item !== label)
      : [...current, label])
  }

  return (
    <section className="detail-workspace" aria-label="위험상세 평가 워크스페이스">
      <article className="detail-driver-panel surface-card">
        <div><p className="eyebrow">PRIORITY EXPLANATION · SAMPLE</p><h2>위험 판단 근거</h2><p>6개 평가 척도 중 현재 우선순위를 설명하는 증가성·피해 심각성·보험 사각지대를 먼저 보여줍니다.</p>{driverScores.map((driver) => <div className="detail-driver-row" key={driver.label}><span>{driver.label}</span><div><i style={{ width: `${driver.score}%` }} /></div><strong>{(driver.score / 20).toFixed(1)}/5</strong><small>{driver.reason}</small></div>)}</div>
        <aside>
          <strong>{risk.signalStrength}</strong>
          <span>{risk.signalStrength >= 80 ? 'CRITICAL PRIORITY' : risk.signalStrength >= 65 ? 'HIGH PRIORITY' : 'REVIEW PRIORITY'}</span>
          <p>SAMPLE 우선순위이며 상품 개발·인수 결정을 단독 수행하지 않습니다.</p>
          <details className="score-logic-disclosure">
            <summary>산출 로직 확인</summary>
            <div className="logic-step-list">
              <p><b>01</b><span>입력</span><code>수요 신호 {risk.signalStrength}%</code></p>
              <p><b>02</b><span>환산</span><code>{risk.signalStrength}% → {risk.signalStrength}점</code></p>
              <p><b>03</b><span>구간</span><code>{risk.signalStrength >= 80 ? '80 이상 → CRITICAL' : risk.signalStrength >= 65 ? '65–79 → HIGH' : '64 이하 → REVIEW'}</code></p>
              <p className="logic-step-note">현재 SAMPLE은 수요 신호를 우선순위 지수로 직접 사용합니다. 세 가지 판단 근거는 점수를 임의로 더하는 값이 아니라 왜 이 구간인지 설명하는 보조 지표입니다.</p>
            </div>
          </details>
        </aside>
      </article>

      <section className="detail-next-checks surface-card" aria-labelledby="next-checks-title">
        <div className="detail-next-checks-heading"><div><p className="eyebrow">PRACTICAL REVIEW PLAN</p><h2 id="next-checks-title">다음 검증 행동</h2><p>이 페이지에서 바로 결론을 확정하기보다, 부족한 근거를 확인한 뒤 다시 판단합니다.</p></div><strong>{checkedNextSteps.length}<small>/{nextSteps.length} 완료</small></strong></div>
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
            <div><p className="eyebrow">SIGNAL TREND · SAMPLE</p><h2>위험 신호 추이</h2></div>
            <div className="panel-heading-side"><span className="updated-label">최근 8개월 · 가정값</span><details className="score-logic-disclosure score-logic-disclosure--light"><summary>산출 로직</summary><div className="logic-step-list"><p><b>01</b><span>기준값</span><code>현재 수요 신호 = {risk.signalStrength}</code></p><p><b>02</b><span>월별 값</span><code>max(20, 기준값 − 보정값)</code></p>{trendMonths.map((month, index) => <p key={month}><b>{String(index + 3).padStart(2, '0')}</b><span>{month}</span><code>max(20, {risk.signalStrength} − {trendOffsets[index]}) = {trend[index]}</code></p>)}<p className="logic-step-note"><b>변화율</b> = ({risk.signalStrength} − 최저값 {minTrend}) ÷ {minTrend} × 100 = +{trendRise}%</p></div></details></div>
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

        <article className="detail-evidence-panel surface-card">
          <div className="panel-heading">
            <div><p className="eyebrow">EVIDENCE LEDGER</p><h2>판단 근거</h2></div>
            <span className="status-badge sample">{linkedSourceCount}/{detail.evidence.length} URL 연결</span>
          </div>
          <div className="detail-evidence-tabs" aria-label="근거 유형 필터">
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
            {!filteredEvidence.length && <p className="table-empty">선택한 근거 유형이 없습니다.</p>}
          </div>
          <p className="detail-evidence-rule"><AppIcon name="shield" size={14} /> 링크 제공 항목도 구체적 주장·발행일·인용 범위 검증 전에는 확정 근거가 아닙니다.</p>
        </article>
      </div>

    </section>
  )
}
