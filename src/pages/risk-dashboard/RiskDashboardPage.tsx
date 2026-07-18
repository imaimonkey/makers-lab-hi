import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearCustomerSignals, readCustomerSignals } from '../../domain/risk/customerSignalStorage'
import type { CustomerSignal } from '../../domain/risk/types'
import { sampleOnlyNotice, sampleRiskCandidates } from '../../domain/risk/sampleData'
import { AppIcon } from '../../shared/components/AppIcon'
import { PageHeader } from '../../shared/components/PageHeader'

const trendBars = [38, 44, 41, 53, 49, 61, 58, 68, 72, 70, 82, 86]

const channelRows = [
  { name: '뉴스·글로벌 미디어', role: '최초 탐지', count: '248', health: '정상' },
  { name: '보험연구·산업자료', role: '상품성 검증', count: '34', health: '정상' },
  { name: '법령·정책·판례', role: '책임·제도 확인', count: '19', health: '확인 필요' },
  { name: '통계·공시', role: '노출·정량 검증', count: '56', health: '정상' },
]

export function RiskDashboardPage() {
  const [customerSignals, setCustomerSignals] = useState<CustomerSignal[]>([])

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
    <div className="page dashboard-page">
      <PageHeader
        step="01"
        eyebrow="EMERGING RISK RADAR"
        title="위험 레이더"
        description="산업·기술·사회 변화의 신호를 한 화면에서 비교하고, 검토할 위험 후보를 다음 단계로 넘깁니다."
        status="INTEGRATION FRAME"
      />

      <div className="sample-notice"><span>SAMPLE</span>{sampleOnlyNotice}</div>

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

      <section className="dashboard-grid">
        <article className="trend-panel surface-card">
          <div className="panel-heading">
            <div><p className="eyebrow">SIGNAL VELOCITY</p><h2>위험 신호 변화</h2></div>
            <span className="updated-label">최근 12주 · 고정 샘플</span>
          </div>
          <div className="chart-legend"><span><i className="navy" /> 전체 신호</span><span><i className="orange" /> 신규 후보</span></div>
          <div className="bar-chart" aria-label="최근 12주 신호 변화 예시 차트">
            {trendBars.map((height, index) => (
              <div className="bar-column" key={`${height}-${index}`}>
                <span style={{ height: `${height}%` }}><i style={{ height: `${Math.max(16, height - 34)}%` }} /></span>
                <small>{index % 2 === 0 ? `${index + 1}주` : ''}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="priority-panel surface-card">
          <div className="panel-heading">
            <div><p className="eyebrow">PRIORITY QUEUE</p><h2>우선 검토 후보</h2></div>
            <Link to="/risks">전체 보기 <AppIcon name="arrow" size={15} /></Link>
          </div>
          <div className="priority-list">
            {sampleRiskCandidates.slice(0, 3).map((risk, index) => (
              <Link to={`/risks/${risk.id}`} className="priority-row" key={risk.id}>
                <span className="rank">0{index + 1}</span>
                <div><strong>{risk.title}</strong><small>{risk.themeLabel} · 근거 {risk.evidenceCount}건</small></div>
                <span className="score">{risk.signalStrength}<small>신호</small></span>
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
              <div><strong>아직 전달된 고객 신호가 없습니다.</strong><p>우상단에서 개인고객 화면으로 전환해 예시 상황을 분석하고 연구 의견을 보내보세요.</p></div>
            </div>
          )}
          <p className="aggregation-note"><AppIcon name="lock" size={14} /> 고객 신호는 단건으로 위험 후보가 되지 않으며, 집계 기준과 실무자 검토를 통과해야 합니다.</p>
        </article>
      </section>
    </div>
  )
}
