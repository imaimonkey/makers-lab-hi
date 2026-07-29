import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearCustomerSignals, readCustomerSignals } from '../../domain/risk/customerSignalStorage'
import type { CustomerSignal } from '../../domain/risk/types'
import { sampleOnlyNotice } from '../../domain/risk/sampleData'
import { candidateListViewModels } from '../../domain/risk/candidateViewModel'
import { RiskSignalPipeline } from '../../features/risk-dashboard/RiskSignalPipeline'
import { RiskRadarOperationsPanel } from '../../features/risk-dashboard/RiskRadarOperationsPanel'
import { RiskProductDevelopmentBoard } from '../../features/risk-dashboard/RiskProductDevelopmentBoard'
import { RiskRadarLiveSnapshotPanel } from '../../features/risk-dashboard/RiskRadarSnapshot'
import { useRiskRadarSnapshot } from '../../features/risk-dashboard/useRiskRadarSnapshot'
import { AppIcon } from '../../shared/components/AppIcon'
import { PageHeader } from '../../shared/components/PageHeader'

const channelRows = [
  { name: '뉴스·글로벌 미디어', role: '최초 탐지', count: '248', health: '정상' },
  { name: '보험연구·산업자료', role: '상품성 검증', count: '34', health: '정상' },
  { name: '법령·정책·판례', role: '책임·제도 확인', count: '19', health: '확인 필요' },
  { name: '통계·공시', role: '노출·정량 검증', count: '56', health: '정상' },
]

export function RiskDashboardPage({ mode = 'analyst' }: { mode?: 'analyst' | 'developer' }) {
  const [customerSignals, setCustomerSignals] = useState<CustomerSignal[]>([])
  const { snapshot: radarSnapshot, refresh: refreshRadarSnapshot } = useRiskRadarSnapshot({ preferLocalArticles: mode === 'developer' })
  const risks = Array.isArray(radarSnapshot.risks) ? radarSnapshot.risks : []
  const news = Array.isArray(radarSnapshot.news) ? radarSnapshot.news : []
  const displayRisks = risks.map((risk) => ({
    id: risk.id,
    title: risk.name,
    themeLabel: risk.source ?? 'src/article',
    evidenceCount: news.find((article) => article.id === risk.articleId)?.contentQuality?.chars ?? 0,
    signalStrength: risk.confidence?.level === '높음' ? 70 : 40,
  }))
  const focusRisk = {
    id: risks[0]?.id,
    title: risks[0]?.name ?? candidateListViewModels[0]?.title ?? '원문 기반 후보 없음',
    evidenceCount: news[0]?.contentQuality?.chars ?? candidateListViewModels[0]?.evidence.count ?? 0,
    signalStrength: risks[0] ? 40 : 0,
  }
  const developerPath = (path: string) => mode === 'developer' ? `/developer-test${path}` : path
  const priorityRows = mode === 'developer'
    ? displayRisks.slice(0, 3).map((risk) => ({
      id: risk.id,
      title: risk.title,
      detailPath: developerPath(`/risks/${risk.id}`),
      meta: `${risk.themeLabel} · 근거 ${risk.evidenceCount}건`,
      score: `${risk.signalStrength}`,
      scoreLabel: '신호',
    }))
    : candidateListViewModels.slice(0, 3).map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      detailPath: candidate.detailRiskId ? `/risks/${candidate.detailRiskId}?from=%2Frisks` : '/risks',
      meta: `${candidate.pipelineStatus} · ${candidate.candidateStatus} · 근거 ${candidate.evidence.count}건`,
      score: candidate.screeningScore.value?.toFixed(2) ?? '—',
      scoreLabel: '후보 점수',
    }))

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

  return (
    <div className="page dashboard-page hyoje-visual">
      <PageHeader
        step="01"
        eyebrow="EMERGING RISK RADAR"
        title="위험 레이더"
        description="산업·기술·사회 변화의 신호를 한 화면에서 비교하고, 검토할 위험 후보를 다음 단계로 넘깁니다."
        status={mode === 'developer' ? 'DEVELOPER / LOCAL ARTICLES' : 'INTEGRATION FRAME'}
      />

      <div className="sample-notice"><span>{mode === 'developer' ? 'DEVELOPER' : 'SAMPLE'}</span>{mode === 'developer' ? 'src/article PDF에서 추출한 실제 테스트 데이터입니다. 결과는 검증 전 도출값입니다.' : sampleOnlyNotice}</div>

      <RiskRadarLiveSnapshotPanel state={radarSnapshot} onRefresh={refreshRadarSnapshot} />

      <section className="dashboard-overview-grid" aria-label="오늘의 위험 탐지 개요">
        <article className="dashboard-welcome-card surface-card">
          <div className="dashboard-welcome-copy">
            <p className="eyebrow">WORKBENCH OVERVIEW</p>
            <h2>오늘 주목할 위험 신호를 한눈에</h2>
            <div className="dashboard-welcome-actions" aria-label="주요 화면 바로가기">
              <Link to={developerPath('/risks')} className="dashboard-icon-action" aria-label="위험 후보 보기" title="위험 후보 보기"><AppIcon name="scan" size={17} /></Link>
              <Link to={developerPath('/reports')} className="dashboard-icon-action" aria-label="종합 리포트 보기" title="종합 리포트 보기"><AppIcon name="report" size={17} /></Link>
            </div>
          </div>
          <div className="dashboard-welcome-orbit" aria-hidden="true">
            <span><AppIcon name="radar" size={28} /></span>
            <i />
            <b />
          </div>
        </article>

        <article className="dashboard-focus-card surface-card">
          <div className="dashboard-focus-heading">
            <span className="dashboard-focus-icon"><AppIcon name="scan" size={18} /></span>
            <div><p className="eyebrow">FOCUS TODAY</p><h2>대표 후보 검토</h2></div>
            <span className="status-badge ready">SAMPLE</span>
          </div>
          <strong>{focusRisk.title}</strong>
          <p>근거 {focusRisk.evidenceCount}건 · 후보 선별 {candidateListViewModels[0]?.screeningScore.value?.toFixed(2) ?? '—'}/5</p>
          <div className="dashboard-focus-bar" aria-label="후보 선별점수 0에서 5"><span style={{ width: `${candidateListViewModels[0] ? ((candidateListViewModels[0].screeningScore.value ?? 0) / 5) * 100 : focusRisk.signalStrength}%` }} /></div>
          <Link to={developerPath(`/risks/${focusRisk.id ?? ''}`)} className="dashboard-focus-link" aria-label={`${focusRisk.title} 상세 보기`} title="대표 후보 상세 보기"><AppIcon name="arrow" size={14} /></Link>
        </article>
      </section>

      <section className="metric-grid" aria-label="핵심 현황 예시">
        <article className="metric-card">
          <span>감시 채널</span><strong>12<small>개</small></strong><p><i className="positive">+2</i> 이번 달 확장</p>
        </article>
        <article className="metric-card">
          <span>신규 위험 후보</span><strong>28<small>건</small></strong><p><i className="positive">+8</i> 최근 30일</p>
        </article>
        <article className="metric-card emphasis">
          <span>상품성 검토 필요</span><strong>6<small>건</small></strong><p><i>3건</i> 담당자 미지정</p>
        </article>
        <article className="metric-card customer-metric">
          <span>고객 인사이트 유입</span><strong>{customerSignals.length}<small>건</small></strong><p><i className="orange">LOCAL</i> 비식별 샘플</p>
        </article>
      </section>

      <section className="dashboard-workflow surface-card" aria-labelledby="dashboard-workflow-title">
        <div className="panel-heading">
          <div><p className="eyebrow">ONE WORKFLOW / TAB 1→4</p><h2 id="dashboard-workflow-title">신호를 판단 가능한 리포트로 연결</h2></div>
          <span className="updated-label">SAMPLE · 기준일 2026.07.23</span>
        </div>
        <div className="dashboard-workflow-steps">
          <Link to="/" className="is-current"><span>01</span><strong>신호 관제</strong><small>변화·최신성·소스 상태 확인</small></Link>
          <i aria-hidden="true">→</i>
          <Link to="/risks"><span>02</span><strong>후보 비교</strong><small>8개 지표로 상세 검증 선택</small></Link>
          <i aria-hidden="true">→</i>
          <Link to={focusRisk.id ? developerPath(`/risks/${focusRisk.id}?from=%2Frisks`) : developerPath('/risks')}><span>03</span><strong>근거 검증</strong><small>평가·추세·Evidence Ledger</small></Link>
          <i aria-hidden="true">→</i>
          <Link to="/reports"><span>04</span><strong>리포트 스냅샷</strong><small>검토 결과·다음 게이트 기록</small></Link>
        </div>
        <p className="dashboard-workflow-note"><AppIcon name="shield" size={14} /> 각 단계는 원본 데이터를 자동 확정하지 않습니다. 샘플 수치와 고객 신호는 사람의 검토·최소 집계 후 다음 단계로 이동합니다.</p>
      </section>

      <RiskSignalPipeline radarSnapshot={radarSnapshot} />
      <RiskRadarOperationsPanel radarSnapshot={radarSnapshot} onRefresh={refreshRadarSnapshot} />
      <RiskProductDevelopmentBoard radarSnapshot={radarSnapshot} />

      <section className="dashboard-grid">
        <article className="priority-panel surface-card">
          <div className="panel-heading">
            <div><p className="eyebrow">PRIORITY QUEUE</p><h2>우선 검토 후보</h2></div>
            <Link to={developerPath('/risks')} className="panel-icon-link" aria-label="위험 후보 전체 보기" title="위험 후보 전체 보기"><AppIcon name="arrow" size={15} /></Link>
          </div>
          <div className="priority-list">
            {priorityRows.map((candidate, index) => (
              <Link to={candidate.detailPath} className="priority-row" key={candidate.id}>
                <span className="rank">0{index + 1}</span>
                <div><strong>{candidate.title}</strong><small>{candidate.meta}</small></div>
                <span className="score">{candidate.score}<small>{candidate.scoreLabel}</small></span>
                <AppIcon name="arrow" size={17} />
              </Link>
            ))}
          </div>
        </article>

        <article className="channel-panel surface-card">
          <div className="panel-heading">
            <div><p className="eyebrow">SOURCE HEALTH</p><h2>채널 역할·수집 상태</h2></div>
            <span className="updated-label">프레임 샘플</span>
          </div>
          <div className="channel-table" role="table" aria-label="채널 상태 예시">
            {channelRows.map((channel) => (
              <div role="row" className="channel-row" key={channel.name}>
                <span role="cell" className="channel-icon"><AppIcon name="radar" size={17} /></span>
                <span role="cell"><strong>{channel.name}</strong><small>{channel.role}</small></span>
                <span role="cell"><strong>{channel.count}</strong><small>수집</small></span>
                <span role="cell" className={channel.health === '정상' ? 'health-ok' : 'health-check'}><i />{channel.health}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="voice-panel surface-card">
          <div className="panel-heading">
            <div><p className="eyebrow">CUSTOMER VOICE INTAKE</p><h2>고객 인사이트 유입 큐</h2></div>
            {customerSignals.length ? (
              <button type="button" className="text-button" onClick={clearCustomerSignals}>데모 큐 비우기</button>
            ) : (
              <span className="updated-label">별도 고객 채널 연동</span>
            )}
          </div>
          {customerSignals.length ? (
            <div className="voice-list">
              {customerSignals.slice(0, 3).map((signal) => (
                <article key={signal.id}>
                  <span><AppIcon name="user" size={16} /> 비식별 고객 신호</span>
                  <strong>{signal.title}</strong>
                  <p>{signal.anonymizedSummary}</p>
                  <div>{signal.keywords.map((keyword) => <i key={keyword}>#{keyword}</i>)}</div>
                </article>
              ))}
            </div>
          ) : (
            <div className="voice-empty">
              <span><AppIcon name="spark" size={24} /></span>
              <div><strong>전달된 고객 신호 없음</strong></div>
            </div>
          )}
          <p className="aggregation-note"><AppIcon name="lock" size={14} /> 집계·검토 전에는 위험 후보로 승격되지 않습니다.</p>
        </article>
      </section>

    </div>
  )
}
