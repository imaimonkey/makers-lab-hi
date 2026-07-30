import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { type IssueAudience } from '../../domain/risk/riskRadarDemo'
import { AppIcon } from '../../shared/components/AppIcon'
import type { RiskRadarSnapshotState } from './useRiskRadarSnapshot'
import type { DeveloperRiskCatalogViewData } from '../risk-catalog/developerStep2Adapter'

const audiences: IssueAudience[] = ['전체', '개인 니즈', '기업 니즈', '영업·현장', '뉴스·산업', '법령·규제']

export function RiskSignalPipeline({ radarSnapshot, developerMode = false, developerData }: { radarSnapshot: RiskRadarSnapshotState; developerMode?: boolean; developerData?: DeveloperRiskCatalogViewData }) {
  const [audience, setAudience] = useState<IssueAudience>('전체')
  const actualIssues = developerMode && developerData
    ? developerData.risks.map((risk) => ({
      id: risk.articleId ?? risk.id,
      type: 'Step 2 저장 후보',
      title: risk.keyword,
      target: risk.industry ?? 'src/article PDF',
      sourceCount: risk.sourceCount,
      coverageGap: risk.coverageGap,
      severity: risk.severity,
      audience: '기업 니즈' as const,
    }))
    : radarSnapshot.risks.map((risk) => ({
    id: risk.id,
    type: '원문 후보',
    title: risk.name,
    target: risk.source ?? 'src/article PDF',
    sourceCount: 1,
    coverageGap: risk.promotionBlockReason ?? 'Step 2 분석 결과 확인 필요',
    severity: risk.confidence?.level === '높음' ? '높음' : '중간',
    audience: '기업 니즈' as const,
  }))
  const issues = useMemo(
    () => actualIssues.filter((issue) => audience === '전체' || issue.audience === audience),
    [audience, actualIssues],
  )
  const trend: number[] = developerMode ? (developerData?.trends.find((item) => item.values.length)?.values ?? []) : []
  const maxTrend = Math.max(...trend, 1)
  const pipelineMetrics = {
    unresolved: radarSnapshot.dashboard.metrics.totalSignals ?? radarSnapshot.dashboard.metrics.news,
    candidates: radarSnapshot.risks.length,
    gaps: radarSnapshot.dashboard.metrics.evidencePending,
    lawPending: radarSnapshot.dashboard.metrics.verificationPending ?? radarSnapshot.dashboard.metrics.evidencePending,
    reviewerPending: radarSnapshot.dashboard.metrics.reviewerPending ?? 0,
  }

  return (
    <section className="risk-signal-pipeline" aria-label="위험 레이더 통합 신호 파이프라인">
      <div className="risk-pipeline-ribbon surface-card">
        <div><p className="eyebrow">PRODUCT DEVELOPMENT SIGNAL PIPELINE</p><h2>뉴스·현장·법령 신호를 검증 큐로 연결</h2></div>
        <div className="risk-pipeline-metrics"><span><strong>{pipelineMetrics.unresolved}</strong>전체 신호</span><span><strong>{pipelineMetrics.candidates}</strong>후보</span><span><strong>{pipelineMetrics.gaps}</strong>근거 보류</span><span><strong>{pipelineMetrics.lawPending}</strong>법령 보류</span></div>
      </div>

      <div className="risk-pipeline-grid">
        <article className="risk-pipeline-issues surface-card">
          <div className="panel-heading"><div><p className="eyebrow">ISSUE REGISTER</p><h2>상품개발 이슈 큐</h2></div><Link to={developerMode ? '/developer-test/risks' : '/risks'} className="panel-icon-link" aria-label="위험 후보 보기" title="위험 후보 보기"><AppIcon name="arrow" size={15} /></Link></div>
          <div className="risk-audience-tabs" aria-label="신호 유입 채널 필터">{audiences.map((item) => <button type="button" key={item} aria-pressed={audience === item} className={audience === item ? 'active' : ''} onClick={() => setAudience(item)}>{item}</button>)}</div>
          <div className="risk-issue-list">
            {issues.slice(0, 4).map((issue) => <Link to={developerMode ? `/developer-test/risks/developer-${encodeURIComponent(issue.id.replace(/^RISK-/, ''))}` : '/risks'} className="risk-issue-row" key={issue.id}><span className={`risk-issue-status ${issue.severity === '심각' ? 'critical' : 'high'}`}>{issue.type}</span><div><strong>{issue.title}</strong><small>{issue.target} · 신호 {issue.sourceCount}건</small></div><span className="risk-issue-gap">{issue.coverageGap}</span><AppIcon name="arrow" size={15} /></Link>)}
            {!issues.length && <div className="table-empty">{developerMode ? '현재 저장된 실제 후보가 없습니다. Step 2 분석을 실행해 주세요.' : '선택한 채널의 이슈가 없습니다.'}</div>}
          </div>
        </article>

        <article className="risk-pipeline-flow surface-card">
          <div className="panel-heading"><div><p className="eyebrow">PROCESS GATES</p><h2>검증 단계 현황</h2></div><span className="updated-label">{developerMode ? 'ACTUAL ARTICLE' : 'API 연결 상태'}</span></div>
          <ol className="risk-pipeline-steps"><li><span>01</span><div><strong>수집</strong><small>뉴스·현장 신호</small></div><b>{pipelineMetrics.unresolved}</b></li><li><span>02</span><div><strong>위험 후보화</strong><small>클러스터·반복성</small></div><b>{pipelineMetrics.candidates}</b></li><li><span>03</span><div><strong>근거·법령 확인</strong><small>검증 보류 포함</small></div><b>{pipelineMetrics.lawPending}</b></li><li><span>04</span><div><strong>상품성 검토</strong><small>담당자 판단</small></div><b>{pipelineMetrics.reviewerPending}</b></li></ol>
          <div className="risk-pipeline-bottleneck"><span>현재 병목</span><strong>{developerMode ? 'Step 2·법령 근거 보강' : '법령·손해 데이터 보강'}</strong><small>자동 점수는 우선순위 보조이며 최종 결정은 실무자가 수행합니다.</small></div>
        </article>
      </div>

      <div className="risk-pipeline-grid secondary">
        <article className="risk-pipeline-trend surface-card">
          <div className="panel-heading"><div><p className="eyebrow">SIGNAL VELOCITY</p><h2>주요 위험 신호 추이</h2></div><span className="updated-label">{developerMode ? 'Step 2 signalTrend 결과' : 'API 연결 상태'}</span></div>
          {trend.length ? <div className="risk-trend-chart" aria-label="최근 위험 신호 추이">{trend.map((value, index) => <div className="risk-trend-column" key={`${value}-${index}`}><span style={{ height: `${(value / maxTrend) * 100}%` }} /><small>{index === trend.length - 1 ? '오늘' : `${trend.length - index}일 전`}</small></div>)}</div> : <div className="table-empty">{developerMode ? 'Step 2 signalTrend 결과가 있는 후보가 없습니다.' : '추이 데이터가 없습니다.'}</div>}
        </article>
        <article className="risk-pipeline-laws surface-card">
          <div className="panel-heading"><div><p className="eyebrow">LAW & REGULATION</p><h2>법령·정책 변화</h2></div><span className="updated-label">{developerMode ? '검색 결과 대기' : '공식 출처 확인 대기'}</span></div>
          {developerMode ? developerData?.laws.length ? <ul className="risk-pipeline-law-list">{developerData.laws.slice(0, 5).map((law) => <li key={law.id}><strong>{law.title}</strong><small>{law.institution} · {law.date} · {law.verificationStatus}</small></li>)}</ul> : <div className="table-empty">저장된 공식 법률 결과가 없습니다. 페이지 1의 법령 검색을 실행하거나 Step 2 법령 분석을 저장하세요.</div> : <div className="table-empty">연결된 공식 법률 결과가 없습니다. Step 2 법령 검토 또는 국가법령정보 API 조회가 필요합니다.</div>}
        </article>
      </div>
    </section>
  )
}
