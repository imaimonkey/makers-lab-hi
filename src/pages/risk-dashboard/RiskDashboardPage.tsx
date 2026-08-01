import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './riskDashboardPage.css'
import { clearCustomerSignals, readCustomerSignals } from '../../domain/risk/customerSignalStorage'
import type { CustomerSignal } from '../../domain/risk/types'
import { candidateListViewModels } from '../../domain/risk/candidateViewModel'
import { useRiskRadarSnapshot } from '../../features/risk-dashboard/useRiskRadarSnapshot'
import { AppIcon } from '../../shared/components/AppIcon'

function buildDeveloperPath(path: string, developerMode: boolean) {
  return developerMode ? `/developer-test${path === '/' ? '' : path}` : path
}

export function RiskDashboardPage({ mode = 'analyst' }: { mode?: 'analyst' | 'developer' }) {
  const developerMode = mode === 'developer'
  const [customerSignals, setCustomerSignals] = useState<CustomerSignal[]>([])
  const { snapshot: radarSnapshot, refresh: refreshRadarSnapshot } = useRiskRadarSnapshot({ preferLocalArticles: developerMode })

  useEffect(() => {
    const refresh = () => setCustomerSignals(readCustomerSignals())
    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener('hi-risk-studio:customer-signal', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('hi-risk-studio:customer-signal', refresh)
    }
  }, [])

  const visibleRisks = developerMode
    ? radarSnapshot.risks.map((risk) => ({
      id: risk.articleId ? `developer-${risk.articleId}` : risk.id,
      title: risk.name,
      segment: risk.facts?.affectedTargets?.[0] ?? risk.source ?? 'AI 분류 후보',
      loss: risk.riskInterpretation?.riskEnvironment ?? risk.facts?.event ?? risk.promotionBlockReason ?? '위험 구조 확인 필요',
      gap: risk.promotionBlockReason ?? '보장 공백 검토 필요',
      score: risk.confidence?.level === 'high' ? 82 : risk.confidence?.level === 'medium' ? 64 : 42,
      evidence: risk.facts?.facts?.length ?? (risk.articleId ? 1 : 0),
      stage: risk.eligibleForProductReview ? 'Step 2 후보화 실행' : '근거·법령 보강',
    }))
    : candidateListViewModels.slice(0, 5).map((risk) => ({
      id: risk.detailRiskId ?? risk.id,
      title: risk.title,
      segment: risk.categories[0] ?? risk.tags[0] ?? '신위험 후보',
      loss: risk.summary,
      gap: risk.candidateStatus,
      score: Math.round((risk.screeningScore.value ?? 0) * 20),
      evidence: risk.evidence.count,
      stage: risk.pipelineStatus,
    }))
  const focusRisk = visibleRisks[0]
  const metrics = radarSnapshot.dashboard.metrics
  const signalCount = metrics.totalSignals ?? metrics.news ?? 0
  const candidateCount = visibleRisks.length
  const evidencePending = metrics.evidencePending ?? 0
  const reviewerPending = metrics.reviewerPending ?? candidateCount
  const sourceHealth = [
    { label: '뉴스 원문', value: radarSnapshot.sourceStatus.news, count: radarSnapshot.news.length },
    { label: '위험 후보', value: radarSnapshot.sourceStatus.risks, count: radarSnapshot.risks.length },
    { label: '대시보드', value: radarSnapshot.sourceStatus.dashboard, count: signalCount },
  ]

  return (
    <div className="page dashboard-page hi-dashboard-page">
      <section className="hi-command-hero" aria-label="보험 리스크 관제 요약">
        <div className="hi-command-copy">
          <div className="hi-command-greeting" aria-label="사용자 인사"><span>안녕하세요,</span><strong>000님</strong></div>
          <div className="hi-command-actions">
            <Link to={buildDeveloperPath('/risks', developerMode)} className="primary-action"><AppIcon name="scan" size={16} /> 위험 후보 보기</Link>
            <Link to={buildDeveloperPath('/reports', developerMode)} className="secondary-action"><AppIcon name="report" size={16} /> 리포트 검토</Link>
          </div>
        </div>
        <aside className="hi-focus-insurance-card" aria-label="최우선 보험 검토 후보">
          <strong>{focusRisk?.title ?? '분석 대기 중'}</strong>
          <p>{focusRisk?.loss ?? '원문 수집 후 AI 위험 후보 분류를 실행하세요.'}</p>
          <div className="hi-risk-meter">
            <span style={{ width: `${Math.max(8, focusRisk?.score ?? 8)}%` }} />
          </div>
          <dl>
            <div><dt>보장 공백</dt><dd>{focusRisk?.gap ?? '검토 대기'}</dd></div>
            <div><dt>근거</dt><dd>{focusRisk?.evidence ?? 0}건</dd></div>
            <div><dt>다음 행동</dt><dd>{focusRisk?.stage ?? 'AI 후보 분류'}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="hi-kpi-grid" aria-label="핵심 보험 리스크 지표">
        <article className="hi-kpi-card orange">
          <span>수집 신호</span>
          <strong>{signalCount}<small>건</small></strong>
          <p>뉴스·산업·현장 입력</p>
        </article>
        <article className="hi-kpi-card green">
          <span>상품화 후보</span>
          <strong>{candidateCount}<small>건</small></strong>
          <p>보장 공백 검토 대상</p>
        </article>
        <article className="hi-kpi-card blue">
          <span>근거 보강</span>
          <strong>{evidencePending}<small>건</small></strong>
          <p>법령·판례·원문 확인 필요</p>
        </article>
        <article className="hi-kpi-card navy">
          <span>담당자 심사</span>
          <strong>{reviewerPending}<small>건</small></strong>
          <p>AI 결과 승인 전 보류</p>
        </article>
      </section>

      <section className="hi-dashboard-grid">
        <article className="hi-panel hi-priority-board">
          <div className="panel-heading">
            <div><p className="eyebrow">PRIORITY INSURANCE QUEUE</p><h2>눈에 먼저 들어와야 하는 보험 이슈</h2></div>
            <Link to={buildDeveloperPath('/risks', developerMode)} className="panel-icon-link" aria-label="위험 후보 전체 보기" title="위험 후보 전체 보기"><AppIcon name="arrow" size={15} /></Link>
          </div>
          <div className="hi-priority-list">
            {visibleRisks.slice(0, 4).map((risk, index) => (
              <Link to={buildDeveloperPath(`/risks/${risk.id}`, developerMode)} className="hi-priority-row" key={risk.id}>
                <span className="rank">0{index + 1}</span>
                <div>
                  <strong>{risk.title}</strong>
                  <small>{risk.segment} · 근거 {risk.evidence}건 · AI 보조점수 {risk.score}</small>
                </div>
                <em>{risk.gap}</em>
                <AppIcon name="arrow" size={16} />
              </Link>
            ))}
            {!visibleRisks.length ? <div className="table-empty">표시할 위험 후보가 없습니다. 원문 수집 후 AI 분류를 실행하세요.</div> : null}
          </div>
        </article>

        <article className="hi-panel hi-ai-plan">
          <div className="hi-ai-plan-blank" aria-label="AI 및 API 운영 계획 빈 영역" />
        </article>

        <article className="hi-panel hi-source-health">
          <div className="panel-heading">
            <div><p className="eyebrow">SOURCE HEALTH</p><h2>API·데이터 연결 상태</h2></div>
            <button type="button" className="text-button" disabled={radarSnapshot.refreshing} onClick={() => void refreshRadarSnapshot()}>
              {radarSnapshot.refreshing ? '갱신 중' : '상태 갱신'}
            </button>
          </div>
          <div className="hi-source-list">
            {sourceHealth.map((source) => (
              <div key={source.label}>
                <span><AppIcon name="radar" size={16} /></span>
                <strong>{source.label}</strong>
                <small>{source.value}</small>
                <b>{source.count}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="hi-panel hi-customer-signal">
          <div className="panel-heading">
            <div><p className="eyebrow">CUSTOMER & FIELD SIGNAL</p><h2>고객·현장 신호</h2></div>
            {customerSignals.length ? <button type="button" className="text-button" onClick={clearCustomerSignals}>비우기</button> : <span className="updated-label">비식별 입력만</span>}
          </div>
          {customerSignals.length ? (
            <div className="voice-list">
              {customerSignals.slice(0, 3).map((signal) => (
                <article key={signal.id}>
                  <span><AppIcon name="user" size={16} /> 비식별 고객 신호</span>
                  <strong>{signal.title}</strong>
                  <p>{signal.anonymizedSummary}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="voice-empty">
              <span><AppIcon name="lock" size={24} /></span>
              <div><strong>아직 연결된 고객 신호가 없습니다</strong><p>개인정보 없이 집계된 패턴만 위험 후보와 연결합니다.</p></div>
            </div>
          )}
        </article>
      </section>

    </div>
  )
}
