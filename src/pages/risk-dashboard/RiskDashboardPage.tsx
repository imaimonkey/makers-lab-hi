import { type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import './riskDashboardPage.css'
import { candidateListViewModels } from '../../domain/risk/candidateViewModel'
import { useRiskRadarSnapshot } from '../../features/risk-dashboard/useRiskRadarSnapshot'
import { getMockReportData } from '../../report/data/mock-data-adapter'
import { createGeneratedReportList } from '../../report/services/report-list'

function buildDeveloperPath(path: string, developerMode: boolean) {
  return developerMode ? `/developer-test${path === '/' ? '' : path}` : path
}

function buildCatalogFilterPath(keyword: string, developerMode: boolean, category = 'all') {
  const search = new URLSearchParams({ q: keyword, category, sort: 'score' })
  return `${buildDeveloperPath('/risks', developerMode)}?${search.toString()}`
}

export function RiskDashboardPage({ mode = 'analyst' }: { mode?: 'analyst' | 'developer' }) {
  const developerMode = mode === 'developer'
  const { snapshot: radarSnapshot } = useRiskRadarSnapshot({ mode })

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

  const metrics = radarSnapshot.dashboard.metrics
  const candidateCount = visibleRisks.length
  const evidencePending = metrics.evidencePending ?? 0
  const lawCount = metrics.lawMatched ?? 0
  const globalReportSourceCount = 86
  const insuranceResearchSourceCount = 38
  const insuranceStatsSourceCount = 36
  const publicDataSourceCount = 0
  const lawSourceCount = lawCount || 86
  const newsSourceCount = radarSnapshot.news.length || metrics.news || 0
  const signalCount = globalReportSourceCount
    + insuranceResearchSourceCount
    + insuranceStatsSourceCount
    + publicDataSourceCount
    + lawSourceCount
    + newsSourceCount

  const sourceCoverage = [
    { code: 'RE', label: 'Swiss Re·Munich Re·AXA', description: '글로벌 보험 리포트·기존 약관', count: globalReportSourceCount, unit: '문서', status: 'live', updated: '1시간 전' },
    { code: 'KIRI', label: '보험연구원', description: '시장 제도·소비자 연구', count: insuranceResearchSourceCount, unit: '자료', status: 'live', updated: '2시간 전' },
    { code: 'KIDI', label: '보험개발원', description: '보험통계·사고지도·손해자료', count: insuranceStatsSourceCount, unit: '자료', status: radarSnapshot.sourceStatus.risks, updated: '3시간 전' },
    { code: 'DATA', label: '공공데이터포털', description: '재난·교통·인구·시설 통계', count: publicDataSourceCount, unit: '데이터', status: radarSnapshot.sourceStatus.dashboard, updated: '15분 전' },
    { code: 'LAW', label: '법제처·금융감독원', description: '법령·감독규정·행정예고', count: lawSourceCount, unit: '자료', status: lawCount ? 'live' : 'sample', updated: '20분 전' },
    { code: 'N', label: '네이버 뉴스', description: '사고·산업 변화·사회적 관심도', count: newsSourceCount, unit: '기사', status: radarSnapshot.sourceStatus.news, updated: '2분 전' },
  ]

  const reportData = getMockReportData()
  const generatedReports = createGeneratedReportList(reportData.riskData, reportData.fallbackReport).slice(0, 4)
  const reportByRiskId = new Map(generatedReports.map((report) => [report.riskId, report]))
  const favoriteReports = candidateListViewModels.slice(0, 3).map((candidate) => {
    const detailId = candidate.detailRiskId ?? candidate.id
    const report = reportByRiskId.get(detailId)
    return {
      id: detailId,
      title: candidate.title,
      summary: candidate.summary,
      href: report?.detailAvailable
        ? `${buildDeveloperPath('/reports', developerMode)}?reportId=${encodeURIComponent(report.reportId)}`
        : buildDeveloperPath('/reports', developerMode),
    }
  })

  const channelMix = [
    { label: '글로벌 리포트', value: globalReportSourceCount, tone: 'orange' },
    { label: '보험 연구', value: insuranceResearchSourceCount + insuranceStatsSourceCount, tone: 'blue' },
    { label: '법률·감독', value: lawSourceCount, tone: 'green' },
    { label: '뉴스·공공', value: newsSourceCount + publicDataSourceCount, tone: 'navy' },
  ]
  const totalChannelMix = channelMix.reduce((sum, item) => sum + item.value, 0) || 1
  const themeMatrix = [
    { label: 'AI·디지털', attention: 86 },
    { label: '기후·재난', attention: 74 },
    { label: '모빌리티', attention: 68 },
    { label: '생활·소비', attention: 52 },
  ]
  const lawMonitorItems = [
    {
      type: '법제처',
      title: '전기차 충전시설 안전관리 기준 변화',
      detail: '시설 운영자 책임과 보험 의무화 가능성을 탐지했습니다.',
      related: 3,
    },
    {
      type: '금감원',
      title: '디지털 금융사기 피해보상 관련 감독 동향',
      detail: '금융소비자 피해 보장과 보험상품 연계 가능성을 확인했습니다.',
      related: 2,
    },
    {
      type: '법제처',
      title: '플랫폼 사업자 안전책임 범위 확대 논의',
      detail: '종사자 상해와 제3자 배상책임 위험에 영향을 줄 수 있습니다.',
      related: 4,
    },
  ]
  const emergingKeywords = [
    { label: '전기차 배터리 화재', articles: 84, tone: 'red' },
    { label: 'AI 데이터센터 보장 공백', articles: 76, tone: 'red' },
    { label: '드론 배송 사고', articles: 63, tone: 'gold' },
    { label: '생성형 AI 저작권', articles: 59, tone: 'blue' },
    { label: '사이버 공격', articles: 57, tone: 'red' },
    { label: '충전 인프라', articles: 55, tone: 'red' },
    { label: '기후재난', articles: 45, tone: 'gold' },
    { label: '플랫폼 책임', articles: 43, tone: 'gold' },
    { label: '공급망 중단', articles: 42, tone: 'blue' },
    { label: '도시 침수', articles: 39, tone: 'gold' },
    { label: '메타버스 내 사기', articles: 34, tone: 'blueSoft' },
    { label: '소상공인 영업중단', articles: 31, tone: 'blueSoft' },
    { label: '자율주행 사고', articles: 29, tone: 'blueSoft' },
    { label: '산불 피해', articles: 27, tone: 'gold' },
    { label: '배상책임 확대', articles: 26, tone: 'red' },
    { label: '의료 AI 오류', articles: 24, tone: 'blueSoft' },
    { label: '개인정보 유출', articles: 22, tone: 'blue' },
    { label: '시설 안전관리', articles: 19, tone: 'blueSoft' },
    { label: '영업배상 리스크', articles: 18, tone: 'blueSoft' },
  ]
  const maxKeywordArticles = Math.max(...emergingKeywords.map((keyword) => keyword.articles), 1)

  return (
    <div className="page dashboard-page hi-dashboard-page">
      <section className="hi-command-hero" aria-label="신규위험 업무 요약">
        <div className="hi-command-copy">
          <div className="hi-command-greeting" aria-label="사용자 인사"><span>안녕하세요,</span><strong>김효제님</strong></div>
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
      </section>

      <section className="hi-dashboard-grid">
        <article className="hi-panel hi-law-monitor">
          <div className="panel-heading">
            <div><p className="eyebrow">LAW & SUPERVISION</p><h2>법률·감독 변화 모니터</h2><p>법제처와 금융감독원 자료 중 보험과 연결되는 변화입니다.</p></div>
          </div>
          <div className="hi-law-monitor-list">
            {lawMonitorItems.map((item) => (
              <Link
                to={buildCatalogFilterPath(item.title, developerMode, 'legal')}
                key={item.title}
              >
                <span>{item.type}</span>
                <div><strong>{item.title}</strong><small>{item.detail}</small></div>
                <b>연관 후보 {item.related}건</b>
              </Link>
            ))}
          </div>
        </article>

        <article className="hi-panel hi-source-health">
          <div className="panel-heading">
            <div><p className="eyebrow">SIGNAL SOURCES</p><h2>수집 채널별 신호</h2><p>보험·공공·시장 데이터와 법률 업데이트가 어디서 들어왔는지 확인합니다.</p></div>
          </div>
          <div className="hi-source-list">
            {sourceCoverage.map((source) => (
              <div key={source.label} className="hi-source-row">
                <span>{source.code}</span>
                <div><strong>{source.label}</strong><small>{source.description}</small></div>
                <b>{source.count.toLocaleString('ko-KR')}<small>{source.unit}</small></b>
              </div>
            ))}
          </div>
        </article>

        <article className="hi-panel hi-favorite-reports">
          <div className="panel-heading">
            <div><p className="eyebrow">SCRAPPED RISKS</p><h2>스크랩된 위험</h2></div>
          </div>
          <div className="hi-report-list">
            {favoriteReports.map((report) => (
              <Link to={report.href} key={report.id}>
                <strong>{report.title}</strong>
                <small>{report.summary}</small>
              </Link>
            ))}
          </div>
        </article>

        <section className="hi-decision-grid" aria-label="집중 관찰 키워드">
          <article className="hi-panel hi-watchlist-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">EMERGING KEYWORDS</p><h2>주요 떠오르는 키워드</h2></div>
            </div>
            <div className="hi-watchlist-cloud">
              {emergingKeywords.map((keyword) => (
                <Link
                  to={buildCatalogFilterPath(keyword.label, developerMode)}
                  key={keyword.label}
                  className={`keyword-${keyword.tone}`}
                  style={{ '--keyword-weight': keyword.articles / maxKeywordArticles } as CSSProperties}
                  aria-label={`${keyword.label}, 관련 아티클 ${keyword.articles}건`}
                  title={`관련 아티클 ${keyword.articles}건`}
                >
                  {keyword.label}
                </Link>
              ))}
            </div>
          </article>
        </section>

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
            <div><p className="eyebrow">RISK FOCUS</p><h2>분야별 주목도</h2><p>최근 위험 신호가 많이 모인 분야를 빠르게 확인합니다.</p></div>
          </div>
          <div className="hi-risk-heatmap">
            <div className="hi-risk-heatmap-head"><span>분야</span><span>주목도</span></div>
            {themeMatrix.map((theme) => (
              <div key={theme.label} className="hi-risk-heatmap-row">
                <strong>{theme.label}</strong>
                <span><i style={{ width: `${theme.attention}%` }} /><b>{theme.attention}</b></span>
              </div>
            ))}
          </div>
        </article>
      </section>

    </div>
  )
}
