import { useMemo, useState } from 'react'
import {
  createRiskReviewRecord,
  readRiskReview,
  RiskReviewStorageError,
  saveRiskReview,
} from '../../domain/risk/riskReviewStorage'
import type { SampleRiskCandidate, SampleRiskDetail, SampleRiskEvidence } from '../../domain/risk/sampleData'
import type { RiskReviewPersona, RiskReviewRecord } from '../../domain/risk/types'
import { AppIcon } from '../../shared/components/AppIcon'

const personaGuidance: Record<RiskReviewPersona, string> = {
  인수심사: '질문서·보장 조건과 책임 경계를 먼저 확인하는 뷰입니다.',
  손해사정: '사고 징후·손실 유형과 근거의 구체성을 먼저 확인하는 뷰입니다.',
  리스크관리: '조직 단위 추이와 통제 공백을 먼저 확인하는 뷰입니다.',
}

const personaActions: Record<RiskReviewPersona, string> = {
  인수심사: '기존 약관과 인수 질문서 비교',
  손해사정: '사고 유형·손해 심도 자료 보강',
  리스크관리: '통제 수준과 재검토 주기 합의',
}

const reviewStatusLabel: Record<RiskReviewRecord['status'], string> = {
  pending: '검토 전',
  completed: '검토 완료',
}

const confidenceLabel: Record<SampleRiskEvidence['confidence'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

function getOwner(themeLabel: string) {
  if (themeLabel.includes('AI') || themeLabel.includes('디지털') || themeLabel.includes('사이버')) return '사이버·배상책임 검토'
  if (themeLabel.includes('기후') || themeLabel.includes('에너지')) return '재물·기업보험 검토'
  if (themeLabel.includes('플랫폼')) return '상해·소득보장 검토'
  if (themeLabel.includes('모빌리티') || themeLabel.includes('자동차')) return '자동차·배상책임 검토'
  return '장기·일반보험 검토'
}

function getTrend(signalStrength: number) {
  return [
    Math.max(20, signalStrength - 31),
    Math.max(20, signalStrength - 26),
    Math.max(20, signalStrength - 20),
    Math.max(20, signalStrength - 23),
    Math.max(20, signalStrength - 14),
    Math.max(20, signalStrength - 10),
    Math.max(20, signalStrength - 6),
    signalStrength,
  ]
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
  const evidenceIds = useMemo(() => detail.evidence.map((item) => item.id), [detail.evidence])
  const storedReview = useMemo(() => readRiskReview(risk.id), [risk.id])
  const [review, setReview] = useState<RiskReviewRecord>(
    () => storedReview
      ? { ...storedReview, evidenceIds: [...new Set([...storedReview.evidenceIds, ...evidenceIds])] }
      : createRiskReviewRecord(risk.id, evidenceIds),
  )
  const [activeEvidence, setActiveEvidence] = useState('전체')
  const [showTable, setShowTable] = useState(false)
  const [saveMessage, setSaveMessage] = useState(
    storedReview ? '이 브라우저에 저장된 SAMPLE 초안을 불러왔습니다.' : '저장되지 않은 SAMPLE 초안입니다.',
  )
  const [shareMessage, setShareMessage] = useState('')

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
    { label: '발생 가능성', score: detail.assessments[0]?.score ?? risk.signalStrength, reason: detail.assessments[0]?.note ?? '추가 확인 필요' },
    { label: '예상 영향도', score: Math.min(96, Math.round((risk.signalStrength + (detail.assessments[2]?.score ?? 50)) / 2)), reason: detail.primaryLoss },
    { label: '통제 공백', score: Math.max(20, 100 - (detail.assessments[4]?.score ?? 50)), reason: detail.assessments[4]?.note ?? '통제 수준 확인 필요' },
  ]
  const reviewItems = [
    ...detail.decisionChecks.slice(0, 3).map((label, index) => ({ id: `decision-${index}`, label })),
    { id: `persona-${review.persona}`, label: personaActions[review.persona] },
  ]

  function updateReview(patch: Partial<RiskReviewRecord>) {
    setReview((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }))
    setSaveMessage('저장되지 않은 변경이 있습니다.')
  }

  function toggleItem(itemId: string) {
    updateReview({
      checkedItemIds: review.checkedItemIds.includes(itemId)
        ? review.checkedItemIds.filter((value) => value !== itemId)
        : [...review.checkedItemIds, itemId],
    })
  }

  function saveLocalReview() {
    try {
      const saved = saveRiskReview({ ...review, evidenceIds })
      setReview(saved)
      setSaveMessage('이 브라우저에 SAMPLE 초안을 저장했습니다. 서버나 API로 전송하지 않았습니다.')
    } catch (error) {
      setSaveMessage(error instanceof RiskReviewStorageError
        ? error.message
        : 'SAMPLE 초안을 로컬에 저장하지 못했습니다.')
    }
  }

  async function shareReview() {
    if (!navigator.clipboard) {
      setShareMessage('클립보드를 사용할 수 없어 링크를 복사하지 못했습니다.')
      return
    }
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareMessage('현재 상세 링크를 복사했습니다.')
    } catch {
      setShareMessage('브라우저 권한으로 링크를 복사하지 못했습니다.')
    }
  }

  return (
    <section className="detail-workspace" aria-label="역할별 위험 검토 워크스페이스">
      <div className="detail-workspace-toolbar surface-card">
        <div>
          <span className="workspace-label">WORKSPACE VIEW · SAMPLE</span>
          <div className="persona-tabs" role="tablist" aria-label="검토 역할 선택">
            {(Object.keys(personaGuidance) as RiskReviewPersona[]).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={review.persona === item}
                className={review.persona === item ? 'active' : ''}
                onClick={() => updateReview({ persona: item })}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <p aria-live="polite">{personaGuidance[review.persona]}</p>
        <div className="detail-workspace-actions" aria-label="상세 검토 액션">
          <button
            type="button"
            onClick={() => updateReview({ status: review.status === 'completed' ? 'pending' : 'completed' })}
          >
            {review.status === 'completed' ? '검토 완료 취소' : '검토 완료 처리'}
          </button>
          <button type="button" onClick={() => window.print()}>PDF 출력</button>
          <button type="button" onClick={saveLocalReview}>SAMPLE 로컬 저장</button>
          <button type="button" className="primary" onClick={() => void shareReview()}>링크 공유</button>
        </div>
      </div>
      <div className="detail-workspace-feedback" aria-live="polite">
        <span>{saveMessage}</span>
        {shareMessage ? <span>{shareMessage}</span> : null}
      </div>

      <div className="detail-decision-strip" aria-label="검토 실행 요약">
        <article className="recommended">
          <span>RECOMMENDED NEXT STEP</span>
          <strong>{personaActions[review.persona]}</strong>
          <p>자동 확정이 아닌 담당자 검토용 제안입니다.</p>
        </article>
        <article>
          <span>OWNER / SAMPLE</span>
          <strong>{getOwner(risk.themeLabel)}</strong>
          <p>담당자와 역할 배정 확인 필요</p>
        </article>
        <article>
          <span>REVIEW STATUS</span>
          <strong>{reviewStatusLabel[review.status]}</strong>
          <p>{detail.decisionStatus} · 데이터 기준 {formatDate(risk.updatedAt)}</p>
        </article>
      </div>

      <div className="detail-core-stats" aria-label="위험 핵심 통계 SAMPLE">
        <article><span>사각지대 가능성</span><strong>{Math.max(18, 100 - (risk.productFit ?? 42))}<em>%</em></strong><small>상품 적합성 역산 SAMPLE</small></article>
        <article><span>관련 근거 후보</span><strong>{risk.evidenceCount}<em>건</em></strong><small>원문 검증 전 SAMPLE</small></article>
        <article><span>수요 신호</span><strong>{risk.signalStrength}<em>%</em></strong><small>TOP-10 비교 레코드 기반</small></article>
        <article><span>평균 탐지 지연</span><strong>{Math.max(7, 35 - Math.round(risk.signalStrength / 5))}<em>일</em></strong><small>검증용 가정값</small></article>
      </div>

      <article className="detail-driver-panel surface-card">
        <div><p className="eyebrow">RISK DRIVER MATRIX · SH</p><h2>위험 판단 근거</h2><p>발생 가능성, 예상 영향도, 통제 공백을 분리해 현재 신호 점수에 영향을 주는 이유를 확인합니다.</p>{driverScores.map((driver) => <div className="detail-driver-row" key={driver.label}><span>{driver.label}</span><div><i style={{ width: `${driver.score}%` }} /></div><strong>{(driver.score / 20).toFixed(1)}/5</strong><small>{driver.reason}</small></div>)}</div>
        <aside><strong>{risk.signalStrength}</strong><span>{risk.signalStrength >= 80 ? 'CRITICAL PRIORITY' : risk.signalStrength >= 65 ? 'HIGH PRIORITY' : 'REVIEW PRIORITY'}</span><p>SAMPLE 우선순위이며 상품 개발·인수 결정을 단독 수행하지 않습니다.</p></aside>
      </article>

      <div className="detail-workspace-grid">
        <article className="detail-trend-panel surface-card">
          <div className="panel-heading">
            <div><p className="eyebrow">SIGNAL TREND · SAMPLE</p><h2>위험 신호 추이</h2></div>
            <span className="updated-label">최근 8개월 · 가정값</span>
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
            <span className="status-badge sample">SAMPLE</span>
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
                  {evidence.sourceUrl
                    ? <a href={evidence.sourceUrl} target="_blank" rel="noreferrer">원문 후보 열기 ↗</a>
                    : <span>원문 확인 대기</span>}
                </div>
              </article>
            ))}
            {!filteredEvidence.length && <p className="table-empty">선택한 근거 유형이 없습니다.</p>}
          </div>
          <p className="detail-evidence-rule"><AppIcon name="shield" size={14} /> 링크 제공 항목도 구체적 주장·발행일·인용 범위 검증 전에는 확정 근거가 아닙니다.</p>
        </article>
      </div>

      <div className="detail-priority-response" aria-label="보험 관점 우선 대응">
        <article><span>01</span><strong>질문서 검토</strong><p>{risk.title}의 노출 여부와 통제 수준을 확인할 질문 항목을 검토합니다.</p></article>
        <article><span>02</span><strong>책임 경계 확인</strong><p>{detail.primaryLoss}의 직접·간접 손해와 기존 약관 적용 여부를 공식 문서로 확인합니다.</p></article>
        <article><span>03</span><strong>근거 모니터링</strong><p>근거 ID와 외부 변화 신호를 다음 재검토 주기의 조기 경보 후보로 연결합니다.</p></article>
      </div>

      <article className="detail-judgment-card">
        <div>
          <p className="eyebrow">JUDGMENT MEMO · LOCAL SAMPLE</p>
          <h2>이번 검토에서 남길 판단</h2>
          <p>{detail.decisionTitle.replace('\n', ' ')} 최종 결정 전 근거 ID·불확실성·반증 또는 보류 이유를 구분해 기록합니다.</p>
          <div className="detail-review-fields">
            <label className="detail-memo-label">
              <span>판단 메모</span>
              <textarea value={review.memo} onChange={(event) => updateReview({ memo: event.target.value })} placeholder="개인정보 없이 판단 요약과 근거 ID를 입력하세요." />
            </label>
            <label className="detail-memo-label">
              <span>불확실성</span>
              <textarea value={review.uncertainty} onChange={(event) => updateReview({ uncertainty: event.target.value })} placeholder="확인되지 않은 데이터·시점·가정을 입력하세요." />
            </label>
            <label className="detail-memo-label">
              <span>반증 또는 보류 이유</span>
              <textarea value={review.counterpoint} onChange={(event) => updateReview({ counterpoint: event.target.value })} placeholder="가설을 약화하는 근거나 보류 이유를 입력하세요." />
            </label>
          </div>
          <small className="detail-review-storage-boundary">SAMPLE 로컬 저장 전용 · 서버/API 전송 없음 · 고객 이름, 연락처, 주민등록번호, 계약번호, 상세 주소, 고객 원문 입력 금지. 이메일·전화번호·주민번호 등 인식 가능한 식별정보는 저장을 차단합니다.</small>
        </div>
        <div className="detail-review-checklist" aria-label={`${review.persona} 검토 체크리스트`}>
          {reviewItems.map((item) => (
            <label key={item.id}>
              <input type="checkbox" checked={review.checkedItemIds.includes(item.id)} onChange={() => toggleItem(item.id)} />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </article>
    </section>
  )
}
