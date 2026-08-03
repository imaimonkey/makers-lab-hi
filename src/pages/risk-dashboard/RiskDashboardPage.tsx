import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './riskDashboardPage.css'
import { clearCustomerSignals, readCustomerSignals } from '../../domain/risk/customerSignalStorage'
import type { CustomerSignal } from '../../domain/risk/types'
import { candidateListViewModels } from '../../domain/risk/candidateViewModel'
import { useRiskRadarSnapshot } from '../../features/risk-dashboard/useRiskRadarSnapshot'
import { getMockReportData } from '../../report/data/mock-data-adapter'
import { createGeneratedReportList } from '../../report/services/report-list'
import { AppIcon } from '../../shared/components/AppIcon'

function buildDeveloperPath(path: string, developerMode: boolean) {
  return developerMode ? `/developer-test${path === '/' ? '' : path}` : path
}

function sourceStatusLabel(value: string) {
  if (value === 'live') return '정상'
  if (value === 'sample') return 'SAMPLE'
  if (value === 'fallback') return '대체 표시'
  if (value === 'error') return '점검 필요'
  return value || '점검 필요'
}

function sourceStatusTone(value: string) {
  if (value === 'live') return 'good'
  if (value === 'error') return 'warn'
  return 'sample'
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
      stage: risk.eligibleForProductReview ? '상세 검토 가능' : '추가 검증 필요',
      status: risk.eligibleForProductReview ? '상세 검토 요청' : '출처·법령 확인',
    }))
    : candidateListViewModels.slice(0, 5).map((risk) => ({
      id: risk.detailRiskId ?? risk.id,
      title: risk.title,
      segment: risk.categories[0] ?? risk.tags[0] ?? '신규위험 후보',
      loss: risk.summary,
      gap: risk.candidateStatus,
      score: Math.round((risk.screeningScore.value ?? 0) * 20),
      evidence: risk.evidence.count,
      stage: risk.pipelineStatus,
      status: risk.candidateStatus,
    }))

  const focusRisk = visibleRisks[0]
  const metrics = radarSnapshot.dashboard.metrics
  const signalCount = metrics.totalSignals ?? metrics.news ?? 0
  const candidateCount = visibleRisks.length
  const evidencePending = metrics.evidencePending ?? 0
  const lawCount = metrics.lawMatched ?? 0
  const verifiedCount = metrics.verificationPassed ?? 0

  const dailyChanges = [
    {
      title: focusRisk ? `${focusRisk.title} 새 위험 신호` : '새 위험 신호 대기',
      detail: focusRisk?.loss ?? '어제 대비 새로 늘어난 뉴스·현장 신호가 후보로 정리되면 이곳에 표시됩니다.',
      time: '오늘',
      tone: 'hot',
    },
    {
      title: '법률 업데이트',
      detail: lawCount ? `법령·규제 관련 변화 ${lawCount}건이 후보 검토 자료에 연결되었습니다.` : '법령 원문과 정책 공지 연결을 기다리고 있습니다.',
      time: '법률',
      tone: 'law',
    },
    {
      title: '근거 검증 필요',
      detail: `${evidencePending}건은 원문, 손해자료, 공식 출처 교차 확인이 필요합니다.`,
      time: '대기',
      tone: 'check',
    },
  ]

  const sourceCoverage = [
    { code: 'RE', label: 'Swiss Re·Munich Re·AXA', description: '글로벌 보험 리포트·기존 약관', count: 86, unit: '문서', status: 'live', updated: '1시간 전' },
    { code: 'KIRI', label: '보험연구원', description: '시장 제도·소비자 연구', count: 38, unit: '자료', status: 'live', updated: '2시간 전' },
    { code: 'KIDI', label: '보험개발원', description: '보험통계·사고지도·손해자료', count: 36, unit: '자료', status: radarSnapshot.sourceStatus.risks, updated: '3시간 전' },
    { code: 'DATA', label: '공공데이터포털', description: '재난·교통·인구·시설 통계', count: signalCount, unit: '데이터', status: radarSnapshot.sourceStatus.dashboard, updated: '15분 전' },
    { code: 'LAW', label: '법제처·금융감독원', description: '법령·감독규정·행정예고', count: lawCount || 86, unit: '자료', status: lawCount ? 'live' : 'sample', updated: '20분 전' },
    { code: 'N', label: '네이버 뉴스', description: '사고·산업 변화·사회적 관심도', count: radarSnapshot.news.length || metrics.news || 0, unit: '기사', status: radarSnapshot.sourceStatus.news, updated: '2분 전' },
  ]

  const pipelineSteps = [
    { label: '원천 데이터 수집', count: signalCount || 1486, tone: 'blue', description: '뉴스·리포트·법령·통계' },
    { label: '위험 신호 추출', count: metrics.clusters ?? 1024, tone: 'blueSoft', description: '중복 신호 묶음' },
    { label: '출처 간 교차검증', count: verifiedCount || 486, tone: 'green', description: '독립 출처 확인' },
    { label: '신규 위험 후보화', count: candidateCount || 24, tone: 'purple', description: '실무자 검토 큐' },
  ]

  const reportData = getMockReportData()
  const generatedReports = createGeneratedReportList(reportData.riskData, reportData.fallbackReport).slice(0, 4)
  const reportByRiskId = new Map(generatedReports.map((report) => [report.riskId, report]))
  const favoriteReports = candidateListViewModels.slice(0, 3).map((candidate, index) => {
    const detailId = candidate.detailRiskId ?? candidate.id
    const report = reportByRiskId.get(detailId)
    return {
      id: detailId,
      title: candidate.title,
      summary: index === 0 ? '오늘 먼저 검토할 후보입니다. 보장 공백과 상품화 가능성을 함께 확인합니다.' : candidate.candidateStatus,
      badge: index === 0 ? '즐겨찾기' : report?.workflowStatus ?? candidate.candidateStatus,
      href: report?.detailAvailable
        ? `${buildDeveloperPath('/reports', developerMode)}?reportId=${encodeURIComponent(report.reportId)}`
        : buildDeveloperPath('/reports', developerMode),
    }
  })

  const channelMix = [
    { label: '뉴스', value: Math.max(24, radarSnapshot.news.length || metrics.news || 0), tone: 'orange' },
    { label: '법률', value: Math.max(12, lawCount || 0), tone: 'blue' },
    { label: '공공데이터', value: 18, tone: 'green' },
    { label: '고객·현장', value: Math.max(5, customerSignals.length), tone: 'navy' },
  ]
  const totalChannelMix = channelMix.reduce((sum, item) => sum + item.value, 0) || 1
  const themeMatrix = [
    { label: 'AI·디지털', hot: 86, review: 7, law: 3 },
    { label: '기후·재난', hot: 74, review: 5, law: 2 },
    { label: '모빌리티', hot: 68, review: 4, law: 4 },
    { label: '생활·소비', hot: 52, review: 3, law: 1 },
  ]
  const reviewFunnel = [
    { label: '감지', value: signalCount || 1486 },
    { label: '묶음', value: metrics.clusters ?? 1024 },
    { label: '후보', value: candidateCount || 24 },
    { label: '리포트', value: favoriteReports.length || 3 },
  ]
  const maxFunnel = Math.max(...reviewFunnel.map((item) => item.value), 1)
  const reportProgress = [
    { label: '요약 작성', value: 92, detail: '핵심 후보 3건 중 3건 요약 완료' },
    { label: '근거 연결', value: 74, detail: '공식 근거 15건 중 11건 연결' },
    { label: '법률 검토', value: 58, detail: '관련 법령 3건 중 1건 원문 확인' },
    { label: '상품성 판단', value: 66, detail: '평가 항목 12개 중 8개 검토' },
  ]
  const globalInsights = [
    { source: 'SWISS RE', title: '기술 발전과 기후변화에 따른 Emerging Risk', detail: 'AI 책임, 사이버 집적위험과 기후재난 신호가 반복적으로 관측됩니다.', count: 31 },
    { source: 'MUNICH RE', title: '대형손실·자연재해 및 누적위험 분석', detail: '도시침수, 산불, 시설 집적손실 관련 손해 시나리오가 증가했습니다.', count: 27 },
    { source: 'AXA', title: '기존 상품 약관과 글로벌 위험 리포트', detail: '현재 보장 범위와 면책 구조를 신규 위험 후보와 비교했습니다.', count: 28 },
  ]

  const recentActivities = radarSnapshot.dashboard.recentActivities?.length
    ? radarSnapshot.dashboard.recentActivities.slice(0, 5).map((activity, index) => ({
      title: activity.title,
      detail: `${activity.status} · ${activity.type}`,
      time: activity.at ? new Date(activity.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : `${index + 1}분 전`,
    }))
    : [
      {
        title: `${focusRisk?.title ?? '위험 후보'} 상세 검토 요청`,
        detail: '우선 검토 큐에 등록되었습니다.',
        time: '방금 전',
      },
      {
        title: '원문·법령 근거 검증 필요',
        detail: `${evidencePending}건의 근거 검토가 남아 있습니다.`,
        time: '8분 전',
      },
      {
        title: '고객·현장 신호 집계 갱신',
        detail: customerSignals.length ? `${customerSignals.length}건의 비식별 신호가 연결되었습니다.` : '비식별 신호 수집 채널이 준비되었습니다.',
        time: '17분 전',
      },
    ]

  return (
    <div className="page dashboard-page hi-dashboard-page">
      <section className="hi-command-hero" aria-label="신규위험 업무 요약">
        <div className="hi-command-copy">
          <div className="hi-command-greeting" aria-label="사용자 인사"><span>안녕하세요,</span><strong>김효제님</strong></div>
          <p className="hi-command-summary">오늘 달라진 위험 신호와 즐겨찾기 리포트를 먼저 확인하세요.</p>
          <div className="hi-command-actions">
            <Link to={buildDeveloperPath('/risks', developerMode)} className="primary-action"><AppIcon name="scan" size={16} /> 위험 후보 보기</Link>
            <Link to={buildDeveloperPath('/reports', developerMode)} className="secondary-action"><AppIcon name="report" size={16} /> 리포트 검토</Link>
          </div>
        </div>
      </section>

      <section className="hi-kpi-grid" aria-label="오늘의 위험 레이더 지표">
        <article className="hi-kpi-card orange">
          <span>감지된 신호</span>
          <strong>{signalCount}<small>건</small></strong>
          <p>뉴스·리포트·법률·현장 입력</p>
        </article>
        <article className="hi-kpi-card green">
          <span>검토할 후보</span>
          <strong>{candidateCount}<small>건</small></strong>
          <p>상품화 가능성 확인 대상</p>
        </article>
        <article className="hi-kpi-card blue">
          <span>검증 필요</span>
          <strong>{evidencePending}<small>건</small></strong>
          <p>원문·법률·손해자료 대기</p>
        </article>
        <article className="hi-kpi-card navy">
          <span>오늘의 변화</span>
          <strong>{dailyChanges.length}<small>건</small></strong>
          <p>전일 대비 새로 봐야 할 변화</p>
        </article>
      </section>

      <section className="hi-analytics-grid" aria-label="위험 신호 분석 그래프">
        <article className="hi-panel hi-channel-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">CHANNEL MIX</p><h2>신호 유입 비중</h2><p>뉴스, 법률, 공공데이터, 현장 신호의 구성입니다.</p></div>
          </div>
          <div className="hi-channel-donut" aria-label="채널별 유입 비중">
            <div>
              {channelMix.map((item) => (
                <span key={item.label} className={item.tone} style={{ flexGrow: item.value }}>
                  <i>{Math.round((item.value / totalChannelMix) * 100)}%</i>
                </span>
              ))}
            </div>
          </div>
          <div className="hi-channel-list">
            {channelMix.map((item) => (
              <div key={item.label}><span className={item.tone} /><strong>{item.label}</strong><b>{item.value}건</b></div>
            ))}
          </div>
        </article>

        <article className="hi-panel hi-heatmap-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">RISK HEATMAP</p><h2>위험 분야별 열도</h2><p>강도, 검토 후보, 법률 변화가 함께 높은 영역을 봅니다.</p></div>
          </div>
          <div className="hi-risk-heatmap">
            <div className="hi-risk-heatmap-head"><span>분야</span><span>강도</span><span>후보</span><span>법률</span></div>
            {themeMatrix.map((theme) => (
              <div key={theme.label} className="hi-risk-heatmap-row">
                <strong>{theme.label}</strong>
                <span><i style={{ width: `${theme.hot}%` }} /></span>
                <b>{theme.review}</b>
                <em>{theme.law}</em>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="hi-dashboard-grid">
        <article className="hi-panel hi-daily-changes">
          <div className="panel-heading">
            <div><p className="eyebrow">TODAY'S CHANGES</p><h2>새로운 위험 신호</h2></div>
            <span className="updated-label">전일 대비</span>
          </div>
          <div className="hi-change-list">
            {dailyChanges.map((change) => (
              <article key={change.title} className={`hi-change-item ${change.tone}`}>
                <span>{change.time}</span>
                <div><strong>{change.title}</strong><p>{change.detail}</p></div>
              </article>
            ))}
          </div>
        </article>

        <article className="hi-panel hi-source-health">
          <div className="panel-heading">
            <div><p className="eyebrow">SIGNAL SOURCES</p><h2>수집 채널별 신호</h2><p>보험·공공·시장 데이터와 법률 업데이트가 어디서 들어왔는지 확인합니다.</p></div>
            <button type="button" className="text-button" disabled={radarSnapshot.refreshing} onClick={() => void refreshRadarSnapshot()}>
              {radarSnapshot.refreshing ? '갱신 중' : '새로고침'}
            </button>
          </div>
          <div className="hi-source-list">
            {sourceCoverage.map((source) => (
              <div key={source.label} className="hi-source-row">
                <span>{source.code}</span>
                <div><strong>{source.label}</strong><small>{source.description}</small></div>
                <b>{source.count.toLocaleString('ko-KR')}<small>{source.unit}</small></b>
                <em data-tone={sourceStatusTone(source.status)}>{sourceStatusLabel(source.status)}</em>
                <time>{source.updated}</time>
              </div>
            ))}
          </div>
        </article>

        <article className="hi-panel hi-pipeline-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">RISK CONVERSION FLOW</p><h2>신규 위험 후보 전환 과정</h2><p>다중 출처 원천 데이터가 후보로 정제되는 흐름입니다.</p></div>
          </div>
          <div className="hi-pipeline-bars">
            {pipelineSteps.map((step, index) => {
              const max = Math.max(...pipelineSteps.map((item) => item.count), 1)
              return (
                <div key={step.label} className={`hi-pipeline-bar ${step.tone}`}>
                  <div><strong>{step.label}</strong><small>{step.description}</small></div>
                  <span><i style={{ width: `${Math.max(5, (step.count / max) * 100)}%` }} /></span>
                  <b>{step.count.toLocaleString('ko-KR')}</b>
                  {index === 2 ? <p>뉴스 한 건만으로 후보화하지 않고 보험 전문자료·공공통계·규제 변화가 함께 확인된 위험을 우선 전환합니다.</p> : null}
                </div>
              )
            })}
          </div>
        </article>

        <article className="hi-panel hi-favorite-reports">
          <div className="panel-heading">
            <div><p className="eyebrow">FAVORITE REPORTS</p><h2>즐겨찾기 리포트 후보</h2></div>
            <Link to={buildDeveloperPath('/reports', developerMode)} className="panel-icon-link" aria-label="종합 리포트 보기" title="종합 리포트 보기"><AppIcon name="report" size={15} /></Link>
          </div>
          <div className="hi-report-list">
            {favoriteReports.map((report) => (
              <Link to={report.href} key={report.id}>
                <span>{report.badge}</span>
                <strong>{report.title}</strong>
                <small>{report.summary}</small>
              </Link>
            ))}
          </div>
        </article>

        <article className="hi-panel hi-customer-signal">
          <div className="panel-heading">
            <div><p className="eyebrow">CUSTOMER & FIELD SIGNAL</p><h2>고객·현장 신호</h2></div>
            {customerSignals.length ? <button type="button" className="text-button" onClick={clearCustomerSignals}>비우기</button> : <span className="updated-label">비식별 입력</span>}
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
              <div><strong>아직 연결된 고객 신호가 없습니다</strong><p>개인정보 없이 집계된 패턴만 신규 위험 후보와 연결합니다.</p></div>
            </div>
          )}
        </article>
      </section>

      <section className="hi-decision-grid" aria-label="후보 전환과 리포트 진행률">
        <article className="hi-panel hi-funnel-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">CONVERSION FUNNEL</p><h2>신호에서 리포트까지</h2><p>수집 신호가 후보와 리포트 검토로 줄어드는 흐름입니다.</p></div>
          </div>
          <div className="hi-funnel-list">
            {reviewFunnel.map((item, index) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value.toLocaleString('ko-KR')}</strong>
                <i style={{ width: `${Math.max(10, (item.value / maxFunnel) * 100)}%` }} />
                {index < reviewFunnel.length - 1 ? <em>다음 단계</em> : <em>검토 연결</em>}
              </div>
            ))}
          </div>
        </article>

        <article className="hi-panel hi-report-progress-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">REPORT READINESS</p><h2>리포트 작성 진행률</h2><p>즐겨찾기 후보를 리포트로 넘기기 전 필요한 작성 상태입니다.</p></div>
            <Link to={buildDeveloperPath('/reports', developerMode)} className="panel-icon-link" aria-label="리포트 검토" title="리포트 검토"><AppIcon name="report" size={15} /></Link>
          </div>
          <div className="hi-report-progress-list">
            {reportProgress.map((item) => (
              <div key={item.label}>
                <div><strong>{item.label}</strong><span>{item.value}%</span></div>
                <i><b style={{ width: `${item.value}%` }} /></i>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="hi-panel hi-watchlist-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">WATCHLIST</p><h2>집중 관찰 키워드</h2><p>오늘 새로 치고 올라온 신호를 키워드로 묶었습니다.</p></div>
          </div>
          <div className="hi-watchlist-cloud">
            {['AI 데이터센터', '배터리 화재', '플랫폼 책임', '기후 재난', '사이버 집적', '고령 운전', '드론 배송', '생활 안전'].map((keyword, index) => (
              <Link to={`${buildDeveloperPath('/risks', developerMode)}?keyword=${encodeURIComponent(keyword)}`} key={keyword} className={`weight-${index % 4}`}>{keyword}</Link>
            ))}
          </div>
        </article>
      </section>

      <section className="hi-global-insights hi-panel" aria-label="글로벌 보험 인사이트">
        <div className="panel-heading">
          <div><p className="eyebrow">GLOBAL INSURANCE INSIGHT</p><h2>글로벌 보험 인사이트</h2><p>재보험사·글로벌 보험사의 리포트와 기존 보험 약관에서 추출한 핵심 주제입니다.</p></div>
          <Link to={buildDeveloperPath('/risks', developerMode)} className="text-button">자료 전체 보기</Link>
        </div>
        <div className="hi-global-card-grid">
          {globalInsights.map((insight) => (
            <article key={insight.source}>
              <span>{insight.source}</span>
              <strong>{insight.title}</strong>
              <p>{insight.detail}</p>
              <small>리포트 {insight.count}건 분석</small>
            </article>
          ))}
        </div>
      </section>

      <section className="hi-panel hi-ai-plan">
        <div className="panel-heading">
          <div><p className="eyebrow">ACTIVITY STREAM</p><h2>최근 처리 내역</h2></div>
          <span className="updated-label">시연 로그</span>
        </div>
        <div className="hi-activity-stream" aria-label="최근 활동 로그">
          {recentActivities.map((activity) => (
            <article key={`${activity.title}-${activity.time}`} className="hi-activity-item">
              <span><AppIcon name="radar" size={15} /></span>
              <div><strong>{activity.title}</strong><p>{activity.detail}</p></div>
              <time>{activity.time}</time>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
