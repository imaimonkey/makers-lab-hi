import { useMemo, useState } from 'react'
import type { SampleRiskCandidate, SampleRiskDetail } from '../../domain/risk/sampleData'
import { AppIcon } from '../../shared/components/AppIcon'

type Persona = '인수심사' | '손해사정' | '리스크관리'

const personaGuidance: Record<Persona, string> = {
  인수심사: '질문서·보장 조건과 책임 경계를 먼저 확인하는 뷰입니다.',
  손해사정: '사고 징후·손실 유형과 근거의 구체성을 먼저 확인하는 뷰입니다.',
  리스크관리: '조직 단위 추이와 통제 공백을 먼저 확인하는 뷰입니다.',
}

const personaActions: Record<Persona, string> = {
  인수심사: '기존 약관과 인수 질문서 비교',
  손해사정: '사고 유형·손해 심도 자료 보강',
  리스크관리: '통제 수준과 재검토 주기 합의',
}

function getOwner(themeLabel: string) {
  if (themeLabel.includes('AI') || themeLabel.includes('디지털')) return '사이버·배상책임 검토'
  if (themeLabel.includes('기후') || themeLabel.includes('에너지')) return '재물·기업보험 검토'
  if (themeLabel.includes('플랫폼')) return '상해·소득보장 검토'
  return '장기·일반보험 검토'
}

function getTrend(signalStrength: number) {
  return [
    Math.max(20, signalStrength - 26),
    Math.max(20, signalStrength - 20),
    Math.max(20, signalStrength - 23),
    Math.max(20, signalStrength - 14),
    Math.max(20, signalStrength - 10),
    Math.max(20, signalStrength - 6),
    signalStrength,
  ]
}

export function RiskDecisionWorkspace({
  risk,
  detail,
}: {
  risk: SampleRiskCandidate
  detail: SampleRiskDetail
}) {
  const [persona, setPersona] = useState<Persona>('인수심사')
  const [activeEvidence, setActiveEvidence] = useState('전체')
  const [memo, setMemo] = useState('')
  const [checkedItems, setCheckedItems] = useState<string[]>([])
  const [reviewStatus, setReviewStatus] = useState<'검토 전' | '검토 완료'>('검토 전')
  const [saved, setSaved] = useState(false)
  const [shared, setShared] = useState(false)
  const evidenceTypes = useMemo(
    () => ['전체', ...new Set(detail.evidence.map((item) => item.type))],
    [detail.evidence],
  )
  const filteredEvidence = detail.evidence.filter(
    (item) => activeEvidence === '전체' || item.type === activeEvidence,
  )
  const trend = getTrend(risk.signalStrength)
  const maxTrend = Math.max(...trend, 1)
  const reviewItems = [
    ...detail.decisionChecks.slice(0, 3),
    personaActions[persona],
  ]

  function toggleItem(item: string) {
    setCheckedItems((current) => current.includes(item)
      ? current.filter((value) => value !== item)
      : [...current, item])
  }

  async function shareReview() {
    try {
      await navigator.clipboard?.writeText(window.location.href)
    } catch {
      // 클립보드 권한이 없는 환경에서도 공유 상태 자체는 확인할 수 있습니다.
    }
    setShared(true)
  }

  return (
    <section className="detail-workspace" aria-label="역할별 위험 검토 워크스페이스">
      <div className="detail-workspace-toolbar surface-card">
        <div>
          <span className="workspace-label">WORKSPACE VIEW · SAMPLE</span>
          <div className="persona-tabs" role="tablist" aria-label="검토 역할 선택">
            {(Object.keys(personaGuidance) as Persona[]).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={persona === item}
                className={persona === item ? 'active' : ''}
                onClick={() => setPersona(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <p aria-live="polite">{personaGuidance[persona]}</p>
        <div className="detail-workspace-actions" aria-label="상세 검토 액션">
          <button type="button" onClick={() => setReviewStatus((current) => current === '검토 완료' ? '검토 전' : '검토 완료')}>{reviewStatus === '검토 완료' ? '검토 완료 취소' : '검토 완료 처리'}</button>
          <button type="button" onClick={() => window.print()}>PDF 출력</button>
          <button type="button" onClick={() => setSaved((current) => !current)}>{saved ? '✓ 저장됨' : '리포트 저장'}</button>
          <button type="button" className="primary" onClick={() => void shareReview()}>{shared ? '✓ 링크 복사됨' : '링크 공유'}</button>
        </div>
      </div>

      <div className="detail-decision-strip" aria-label="검토 실행 요약">
        <article className="recommended">
          <span>RECOMMENDED NEXT STEP</span>
          <strong>{personaActions[persona]}</strong>
          <p>자동 확정이 아닌 담당자 검토용 제안입니다.</p>
        </article>
        <article>
          <span>OWNER / SAMPLE</span>
          <strong>{getOwner(risk.themeLabel)}</strong>
          <p>담당자와 역할 배정 확인 필요</p>
        </article>
        <article>
          <span>REVIEW STATUS</span>
          <strong>{detail.decisionStatus}</strong>
          <p>{reviewStatus} · 업데이트 {risk.updatedAt} · 최신 시각 확인 필요</p>
        </article>
      </div>

      <div className="detail-workspace-grid">
        <article className="detail-trend-panel surface-card">
          <div className="panel-heading">
            <div><p className="eyebrow">SIGNAL TREND · SAMPLE</p><h2>위험 신호 추이</h2></div>
            <span className="updated-label">최근 7개 관측</span>
          </div>
          <p className="detail-panel-description">절대 손실액이나 보험료가 아닌 탐색용 신호 강도입니다.</p>
          <div className="detail-trend-chart" role="img" aria-label={`${risk.title} 최근 7개 관측 신호 추이`}>
            {trend.map((value, index) => (
              <div className="detail-trend-column" key={`${value}-${index}`}>
                <span style={{ height: `${(value / maxTrend) * 100}%` }} />
                <small>{index === trend.length - 1 ? '현재' : `${trend.length - index}회 전`}</small>
              </div>
            ))}
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
              <article key={evidence.title}>
                <span>{evidence.type}</span>
                <strong>{evidence.title}</strong>
                <small>{evidence.source} · {evidence.date} · 신뢰도 {evidence.confidence}</small>
              </article>
            ))}
            {!filteredEvidence.length && <p className="table-empty">선택한 근거 유형이 없습니다.</p>}
          </div>
          <p className="detail-evidence-rule"><AppIcon name="shield" size={14} /> 평가 문장과 근거 ID의 연결은 운영 검토 단계에서 확인합니다.</p>
        </article>
      </div>

      <article className="detail-judgment-card">
        <div>
          <p className="eyebrow">JUDGMENT MEMO · SAMPLE</p>
          <h2>이번 검토에서 남길 판단</h2>
          <p>{detail.decisionTitle.replace('\n', ' ')} 최종 결정 전 반증·보류 이유와 다음 확인 항목을 기록합니다.</p>
          <label className="detail-memo-label">
            <span className="sr-only">검토 메모</span>
            <textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="근거 ID, 불확실성, 반증 또는 보류 이유를 입력하세요." />
          </label>
          <small className="detail-memo-status" aria-live="polite">{memo.trim() ? '로컬 화면 메모 · 저장 API 미연동' : '메모를 입력하면 이 화면에서만 확인할 수 있습니다.'}</small>
        </div>
        <div className="detail-review-checklist" aria-label={`${persona} 검토 체크리스트`}>
          {reviewItems.map((item) => (
            <label key={item}>
              <input type="checkbox" checked={checkedItems.includes(item)} onChange={() => toggleItem(item)} />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </article>
    </section>
  )
}
