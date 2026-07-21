import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { demoDashboardMetrics, demoIssues, demoLaws, demoTrend, type IssueAudience } from '../../domain/risk/riskRadarDemo'
import { AppIcon } from '../../shared/components/AppIcon'

const audiences: IssueAudience[] = ['전체', '개인 니즈', '기업 니즈', '영업·현장', '뉴스·산업', '법령·규제']

export function RiskSignalPipeline() {
  const [audience, setAudience] = useState<IssueAudience>('전체')
  const issues = useMemo(
    () => audience === '전체' ? demoIssues : demoIssues.filter((issue) => issue.audience === audience),
    [audience],
  )
  const trend = demoTrend[0]?.values ?? []
  const maxTrend = Math.max(...trend, 1)

  return (
    <section className="risk-signal-pipeline" aria-label="위험 레이더 통합 신호 파이프라인">
      <div className="risk-pipeline-ribbon surface-card">
        <div>
          <p className="eyebrow">PRODUCT DEVELOPMENT SIGNAL PIPELINE</p>
          <h2>뉴스·현장·법령 신호를 검증 큐로 연결</h2>
          <p>hyoje 위험 레이더의 채널별 유입, 검증 단계, 상품화 병목을 현재 워크벤치 계약에 맞춘 샘플입니다.</p>
        </div>
        <div className="risk-pipeline-metrics">
          <span><strong>{demoDashboardMetrics.unresolved}</strong>전체 신호</span>
          <span><strong>{demoDashboardMetrics.candidates}</strong>후보</span>
          <span><strong>{demoDashboardMetrics.gaps}</strong>보장 공백</span>
          <span><strong>{demoDashboardMetrics.lawPending}</strong>법령 보류</span>
        </div>
      </div>

      <div className="risk-pipeline-grid">
        <article className="risk-pipeline-issues surface-card">
          <div className="panel-heading">
            <div><p className="eyebrow">ISSUE REGISTER</p><h2>상품개발 이슈 큐</h2></div>
            <Link to="/risks">위험 후보로 보기 <AppIcon name="arrow" size={15} /></Link>
          </div>
          <div className="risk-audience-tabs" aria-label="신호 유입 채널 필터">
            {audiences.map((item) => (
              <button type="button" key={item} aria-pressed={audience === item} className={audience === item ? 'active' : ''} onClick={() => setAudience(item)}>
                {item}
              </button>
            ))}
          </div>
          <div className="risk-issue-list">
            {issues.slice(0, 4).map((issue) => (
              <Link to="/risks" className="risk-issue-row" key={issue.id}>
                <span className={`risk-issue-status ${issue.severity === '심각' ? 'critical' : 'high'}`}>{issue.type}</span>
                <div><strong>{issue.title}</strong><small>{issue.target} · 신호 {issue.sourceCount}건</small></div>
                <span className="risk-issue-gap">{issue.coverageGap}</span>
                <AppIcon name="arrow" size={15} />
              </Link>
            ))}
            {!issues.length && <div className="table-empty">선택한 채널의 이슈가 없습니다.</div>}
          </div>
        </article>

        <article className="risk-pipeline-flow surface-card">
          <div className="panel-heading"><div><p className="eyebrow">PROCESS GATES</p><h2>검증 단계 현황</h2></div><span className="updated-label">SAMPLE</span></div>
          <ol className="risk-pipeline-steps">
            <li><span>01</span><div><strong>수집</strong><small>뉴스·현장 신호</small></div><b>{demoDashboardMetrics.unresolved}</b></li>
            <li><span>02</span><div><strong>위험 후보화</strong><small>클러스터·반복성</small></div><b>{demoDashboardMetrics.candidates}</b></li>
            <li><span>03</span><div><strong>근거·법령 확인</strong><small>검증 보류 포함</small></div><b>{demoDashboardMetrics.lawPending}</b></li>
            <li><span>04</span><div><strong>상품성 검토</strong><small>담당자 판단</small></div><b>{demoDashboardMetrics.reviewerPending}</b></li>
          </ol>
          <div className="risk-pipeline-bottleneck"><span>현재 병목</span><strong>법령·손해 데이터 보강</strong><small>자동 점수는 우선순위 보조이며 최종 결정은 실무자가 수행합니다.</small></div>
        </article>
      </div>

      <div className="risk-pipeline-grid secondary">
        <article className="risk-pipeline-trend surface-card">
          <div className="panel-heading"><div><p className="eyebrow">SIGNAL VELOCITY</p><h2>주요 위험 신호 추이</h2></div><span className="updated-label">최근 7일 · 샘플</span></div>
          <div className="risk-trend-chart" aria-label="자동차·모빌리티 위험 신호 추이">
            {trend.map((value, index) => <div className="risk-trend-column" key={`${value}-${index}`}><span style={{ height: `${(value / maxTrend) * 100}%` }} /><small>{index === trend.length - 1 ? '오늘' : `${trend.length - index}일 전`}</small></div>)}
          </div>
        </article>
        <article className="risk-pipeline-laws surface-card">
          <div className="panel-heading"><div><p className="eyebrow">LAW & REGULATION</p><h2>법령·정책 변화</h2></div><span className="updated-label">공식 출처 확인 대기</span></div>
          <ul>{demoLaws.slice(0, 3).map((law) => <li key={law.title}><span>{law.institution}</span><strong>{law.title}</strong><small>{law.impact} · {law.when}</small></li>)}</ul>
        </article>
      </div>
    </section>
  )
}
