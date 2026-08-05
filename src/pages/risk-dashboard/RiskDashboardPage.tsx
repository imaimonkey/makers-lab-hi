import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { browserReportListPreferences, type ReportListPreferences } from '../../report/services/report-list-preferences'
import { AppIcon } from '../../shared/components/AppIcon'
import {
  riskRadarCandidates as staticRiskRadarCandidates,
  riskRadarKpis as staticRiskRadarKpis,
  riskRadarKeywords as staticRiskRadarKeywords,
  globalInsuranceInsights as staticGlobalInsuranceInsights,
  exclusiveRights as staticExclusiveRights,
  marketUpdates as staticMarketUpdates,
  recentInsuranceProducts as staticRecentInsuranceProducts,
  riskRadarPriorityRisks as staticRiskRadarPriorityRisks,
  riskRadarRegulations as staticRiskRadarRegulations,
  riskRadarScraps as staticRiskRadarScraps,
  riskRadarSourceShares as staticRiskRadarSourceShares,
  riskRadarTopPriority as staticRiskRadarTopPriority,
} from '../../features/risk-dashboard/riskRadarContent'
import type { ExclusiveRight, GlobalInsuranceInsight, MarketUpdate, RecentInsuranceProduct, RiskRadarPriorityRisk } from '../../features/risk-dashboard/riskRadarContent'
import { loadArticleSourceRecords } from '../../features/risk-dashboard/articleSourceData'
import { buildLocalArticleRadarView } from '../../features/risk-dashboard/localArticleRadarView'
import './riskDashboardPage.css'

function buildDeveloperPath(path: string, developerMode: boolean) {
  return developerMode ? `/developer-test${path === '/' ? '' : path}` : path
}

function buildCatalogFilterPath(keyword: string, developerMode: boolean, category = 'all') {
  const search = new URLSearchParams({ q: keyword, category, sort: 'score' })
  return `${buildDeveloperPath('/risks', developerMode)}?${search.toString()}`
}

function buildRiskDetailPath(riskId: string, developerMode: boolean) {
  return buildDeveloperPath(`/risks/${riskId}`, developerMode)
}

function KpiIcon({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6.5h16M4 12h10M4 17.5h7" />
        <circle cx="18" cy="12" r="2.5" />
        <path d="m19.8 13.8 2.2 2.2" />
      </svg>
    )
  }

  if (index === 1) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 5 6v5c0 4.6 2.7 8.3 7 10 4.3-1.7 7-5.4 7-10V6l-7-3Z" />
        <path d="m9.2 12 1.8 1.8 3.8-4" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h8l4 4v14H7V3Z" />
      <path d="M15 3v5h4M10 12h6M10 16h4" />
    </svg>
  )
}

function EvidenceButton({ sourceUrl }: { sourceUrl: string | null }) {
  const handleClick = () => {
    if (!sourceUrl) return
    window.open(sourceUrl, '_blank', 'noopener,noreferrer')
    }

  return (
    <button className="evidence-link" type="button" onClick={handleClick}>
      원문 보기 →
    </button>
  )
}

function SourceLink({ sourceUrl, label, className = 'evidence-link' }: { sourceUrl: string | null; label: string; className?: string }) {
  if (!sourceUrl) return null

  return (
    <a className={className} href={sourceUrl} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  )
}

function RadarIcon() {
  return (
    <svg className="radar-evidence-icon" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="radar-evidence-beam" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#f4bb91" stopOpacity=".24" />
          <stop offset="1" stopColor="#ea8a4c" stopOpacity=".78" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="#fff" stroke="#dfe7f0" />
      <circle cx="32" cy="32" r="20" fill="none" stroke="#dfe7f0" />
      <circle cx="32" cy="32" r="11" fill="none" stroke="#dfe7f0" />
      <path d="M32 32 L54 13 A29 29 0 0 1 59 32 Z" fill="url(#radar-evidence-beam)" />
      <path d="M32 32 L54 13" stroke="#dc7b3e" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="32" r="3" fill="#173b6d" />
      <circle cx="44" cy="24" r="3.4" fill="#ea8a4c" />
      <circle cx="22" cy="41" r="2.8" fill="#6e8bae" />
    </svg>
  )
}

function RadarDetectionEvidence({
  candidates,
  selectedIndex,
  onSelect,
  onPrevious,
  onNext,
}: {
  candidates: RiskRadarPriorityRisk[]
  selectedIndex: number
  onSelect: (index: number) => void
  onPrevious: () => void
  onNext: () => void
}) {
  const candidate = candidates[selectedIndex]

  return (
    <div className="radar-evidence-wrap">
      <section className="radar-evidence-panel" aria-label="레이더 포착 근거">
        <div className="radar-evidence-head">
          <div className="radar-evidence-heading">
            <RadarIcon />
            <div>
              <h3 className="radar-evidence-title">레이더 포착 근거</h3>
              <p className="radar-evidence-summary">{candidate.detectionSummary}</p>
            </div>
          </div>
          <div className="radar-evidence-controls" aria-label="레이더 포착 근거 후보 이동">
            <button className="radar-evidence-arrow" type="button" aria-label="이전 후보 근거" onClick={onPrevious}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" /></svg>
            </button>
            <span className="radar-evidence-index">{selectedIndex + 1} / {candidates.length}</span>
            <button className="radar-evidence-arrow" type="button" aria-label="다음 후보 근거" onClick={onNext}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5 7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <nav className="radar-candidate-tabs" aria-label="상품화 우선 검토 TOP 5 후보 선택">
          {candidates.map((item, index) => (
            <button
              className={`radar-candidate-tab${index === selectedIndex ? ' active' : ''}`}
              type="button"
              aria-pressed={index === selectedIndex}
              key={item.id}
              onClick={() => onSelect(index)}
            >
              <span className="radar-tab-rank">{index + 1}위</span>
              <span className="radar-tab-name">{item.title}</span>
            </button>
          ))}
        </nav>

        <div className="radar-evidence-content">
          <div className="radar-evidence-meta">
            <span className="radar-evidence-count">확인된 주요 근거 {candidate.evidence.length}건</span>
            <span className="radar-linked-risk">연결 위험 · {candidate.title}</span>
          </div>
          <div className="radar-evidence-grid">
            {candidate.evidence.map((evidence, index) => (
              <article className="radar-evidence-card" key={`${candidate.id}-${evidence.type}-${index}`}>
                <div className="radar-evidence-type"><span className="radar-evidence-dot" aria-hidden="true" />{evidence.type}</div>
                <div className="radar-evidence-card-title">{evidence.title}</div>
                <div className="radar-evidence-source">{evidence.source} · {evidence.date}</div>
                {evidence.sourceUrl ? <div className="radar-evidence-footer"><EvidenceButton sourceUrl={evidence.sourceUrl} /></div> : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function ExclusiveRightCard({ item }: { item: ExclusiveRight }) {
  return (
    <article className="exclusive-right-card" key={item.id}>
      <span className={`trend-status ${item.statusKey}`}>{item.statusLabel}</span>
      <div className="trend-company">{item.company}</div>
      <div className="trend-title">{item.title}</div>
      <div className="trend-summary">{item.summary}</div>
      <div className="trend-meta">
        <div className="exclusive-right-meta-copy">
          <span className="exclusive-right-status-detail">{item.statusDetail}</span>
          <span>{item.sourceType} · {item.date}</span>
        </div>
        <SourceLink sourceUrl={item.sourceUrl} label="출처 보기 →" />
      </div>
    </article>
  )
}

function RecentProductListItem({ item }: { item: RecentInsuranceProduct }) {
  return (
    <article className="recent-product-item" key={item.id}>
      <div className="recent-product-main">
        <div className="recent-product-title">{item.title}</div>
        <div className="recent-product-summary"><span>{item.company}</span><span> · </span><span>{item.summary}</span></div>
        <div className="recent-product-source">{item.sourceType} · {item.date}</div>
      </div>
      <SourceLink sourceUrl={item.sourceUrl} label="출처 보기 →" />
    </article>
  )
}

function MarketUpdateItem({ item }: { item: MarketUpdate }) {
  return (
    <article className="update-item domestic-update-item">
      <div className="update-source"><span>{item.type} · {item.source}</span><time dateTime={item.date}>{item.displayDate}</time></div>
      <div className="update-title">{item.title}</div>
      <div className="update-meaning"><b>검토 포인트</b> {item.insight}</div>
      <div className="update-related"><span>연결 주제</span> {item.relatedTopic}</div>
      <SourceLink sourceUrl={item.sourceUrl} label="출처 보기 →" className="update-link" />
    </article>
  )
}

function GlobalInsightItem({ item }: { item: GlobalInsuranceInsight }) {
  return (
    <article className="global-insight-item">
      <div className="global-insight-meta">
        <span className="global-insight-organization">{item.organization}</span>
        <time dateTime={item.date}>{item.displayDate}</time>
      </div>
      <div className="global-insight-title">{item.title}</div>
      <div className="global-insight-summary">{item.summary}</div>
      <div className="global-insight-footer">
        <span><b>연결 위험</b> {item.relatedRisk}</span>
        <SourceLink sourceUrl={item.sourceUrl} label="출처 보기 →" className="update-link" />
      </div>
    </article>
  )
}

export function RiskDashboardPage({ mode = 'analyst' }: { mode?: 'analyst' | 'developer' }) {
  const developerMode = mode === 'developer'
  const navigate = useNavigate()
  const [articleView, setArticleView] = useState(() => buildLocalArticleRadarView([]))
  useEffect(() => {
    let cancelled = false
    void loadArticleSourceRecords().then((records) => { if (!cancelled) setArticleView(buildLocalArticleRadarView(records)) }).catch((error) => console.error(error))
    return () => { cancelled = true }
  }, [])
  const riskRadarKpis = articleView.kpis.length ? articleView.kpis : staticRiskRadarKpis
  const riskRadarCandidates = articleView.candidates.length ? articleView.candidates : staticRiskRadarCandidates
  const riskRadarKeywords = articleView.keywords.length ? articleView.keywords : staticRiskRadarKeywords
  const globalInsuranceInsights = articleView.globalInsights.length ? articleView.globalInsights : staticGlobalInsuranceInsights
  const exclusiveRights = articleView.exclusiveRights.length ? articleView.exclusiveRights : staticExclusiveRights
  const marketUpdates = articleView.marketUpdates.length ? articleView.marketUpdates : staticMarketUpdates
  const recentInsuranceProducts = articleView.recentProducts.length ? articleView.recentProducts : staticRecentInsuranceProducts
  const riskRadarPriorityRisks = articleView.priorityRisks.length ? articleView.priorityRisks : staticRiskRadarPriorityRisks
  const riskRadarRegulations = articleView.regulations.length ? articleView.regulations : staticRiskRadarRegulations
  const riskRadarScraps = articleView.scraps.length ? articleView.scraps : staticRiskRadarScraps
  const riskRadarSourceShares = articleView.sourceShares.length ? articleView.sourceShares : staticRiskRadarSourceShares
  const riskRadarTopPriority = articleView.priorityRisks.length ? articleView.topPriority : staticRiskRadarTopPriority
  const sourceShareLabel = riskRadarSourceShares.map((source) => `${source.label} ${source.share}%`).join(', ')
  const [scrapPreferences, setScrapPreferences] = useState<ReportListPreferences>(() => browserReportListPreferences.load())
  const [priorityIndex, setPriorityIndex] = useState(0)
  const handlePreviousPriority = () => setPriorityIndex((current) => (current - 1 + riskRadarPriorityRisks.length) % riskRadarPriorityRisks.length)
  const handleNextPriority = () => setPriorityIndex((current) => (current + 1) % riskRadarPriorityRisks.length)

  const toggleScrap = (reportId: string) => {
    setScrapPreferences((current) => {
      const next = { ...current, [reportId]: { pinned: !(current[reportId]?.pinned ?? true) } }
      browserReportListPreferences.save(next)
      return next
    })
  }

  return (
    <div className="page riskRadarPage">
      <header className="riskRadarIntro" aria-label="오늘의 위험 신호와 분석 기준">
        <div>
          <h1>허웅님, 오늘도 반가워요</h1>
          <p className="subtitle">오늘의 새로운 위험 신호와 주요 검토 후보를 한눈에 확인해 보세요.</p>
        </div>
        <div className="analysis-meta" aria-label="분석 기준 정보">
          <div className="meta-card">
            <span className="meta-card-label">분석 기준</span>
            <span className="meta-card-value">최근 30일 기준</span>
          </div>
        </div>
      </header>

      <section className="kpi-grid" aria-label="최근 30일 핵심 KPI">
        {riskRadarKpis.map((kpi, index) => (
          <article className="kpi" key={kpi.label}>
            <div className="kpi-top">
              <div className="kpi-title-wrap">
                <div className="kpi-icon"><KpiIcon index={index} /></div>
                <div className="kpi-label">{kpi.label}</div>
              </div>
              <span className="kpi-period">{kpi.meta}</span>
            </div>
            <div className="kpi-value"><strong>{kpi.value}</strong><span>{kpi.unit}</span></div>
            <div className="kpi-note">{kpi.description}</div>
          </article>
        ))}
      </section>

      <section className="row-grid" id="priority-panel">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">상품화 우선 검토 TOP 5</h2>
              <div className="panel-desc">상품화 검토 후보 8건 중 종합점수가 높은 5건입니다.</div>
            </div>
            <Link className="text-link" to={buildDeveloperPath('/risks', developerMode)}>위험탐색에서 전체 보기 →</Link>
          </div>

          <div className="priority-body">
            <div className="ranking-chart">
              <h3 className="chart-label">상품화 종합점수 상위 5건</h3>
              <p className="chart-sub">상품화 검토 후보 8건 중 종합점수가 높은 순서입니다.</p>
              <div className="bar-list">
                {riskRadarPriorityRisks.map((risk, index) => (
                  <button className={`bar-row${index === priorityIndex ? ' active' : ''}`} type="button" aria-pressed={index === priorityIndex} onClick={() => setPriorityIndex(index)} key={risk.id}>
                    <span className="bar-rank">{index + 1}</span>
                    <div className="bar-name-wrap">
                      <div className="bar-name">{risk.title}</div>
                      <span className="grade">시장성 {risk.marketGrade}{risk.category ? ` · ${risk.category}` : ''}</span>
                    </div>
                    <div className="bar-track"><div className={`bar-fill${index === 0 ? ' is-top' : ''}`} style={{ width: `${(risk.score / 5) * 100}%` }} /></div>
                    <div className="bar-score">{risk.score.toFixed(1)}</div>
                  </button>
                ))}
              </div>
            </div>

            <aside className="top-risk-carousel" aria-label="상품화 우선 검토 후보 상세">
              <div className="top-risk-viewport" aria-live="polite">
                <div className="top-risk-track" style={{ transform: `translateX(-${priorityIndex * 100}%)` }}>
                  {riskRadarPriorityRisks.map((risk, index) => {
                    const isTopPriority = index === 0
                    const reportPath = isTopPriority
                      ? `${buildDeveloperPath('/reports', developerMode)}?reportId=${encodeURIComponent(riskRadarTopPriority.reportId)}`
                      : buildDeveloperPath('/reports', developerMode)

                    return (
                      <article className="top-risk" key={risk.id}>
                        <span className="top-badge">상품화 우선순위 {index + 1}위</span>
                        <h3 className="top-title">{risk.title}</h3>
                        <p className="top-copy">{isTopPriority ? riskRadarTopPriority.summary : risk.summary}</p>
                        <div className="top-metrics">
                          <div className="top-metric"><div className="top-metric-label">시장성</div><div className="top-metric-value">{isTopPriority ? riskRadarTopPriority.marketScore : `시장성 ${risk.marketGrade}`}</div></div>
                          <div className="top-metric"><div className="top-metric-label">종합점수</div><div className="top-metric-value">{isTopPriority ? riskRadarTopPriority.totalScore : `${risk.score.toFixed(1)} / 5점`}</div></div>
                        </div>
                        <div className="top-actions">
                          <Link className="small-btn" to={buildRiskDetailPath(risk.detailRiskId, developerMode)}>위험 상세</Link>
                          <Link className="small-btn primary" to={reportPath}>종합리포트</Link>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
              <div className="top-risk-carousel-controls" aria-label="상품화 우선 검토 후보 이동">
                <button className="top-risk-carousel-control" type="button" aria-label="이전 우선 검토 후보" onClick={handlePreviousPriority}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" /></svg>
                </button>
                <button className="top-risk-carousel-control" type="button" aria-label="다음 우선 검토 후보" onClick={handleNextPriority}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5 7 7-7 7" /></svg>
                </button>
              </div>
              <div className="top-risk-carousel-note" aria-label="현재 우선 검토 순위">{priorityIndex + 1} / {riskRadarPriorityRisks.length}</div>
            </aside>
          </div>
          <RadarDetectionEvidence
            candidates={riskRadarPriorityRisks}
            selectedIndex={priorityIndex}
            onSelect={setPriorityIndex}
            onPrevious={handlePreviousPriority}
            onNext={handleNextPriority}
          />
        </article>
      </section>

      <section className="row-grid secondary">
        <article className="panel" id="candidate-panel">
          <div className="panel-head">
            <div><h2 className="panel-title">신규 위험 후보</h2><div className="panel-desc">대표 후보를 간결하게 확인하고 상세 분석으로 이동합니다.</div></div>
          </div>

          <div className="candidate-list">
            {riskRadarCandidates.slice(0, 3).map((candidate) => (
              <Link
                className="candidate"
                data-keywords={candidate.keywords.join(' ')}
                key={candidate.id}
                to={buildRiskDetailPath(candidate.detailRiskId, developerMode)}
                aria-label={`${candidate.title} 위험 상세 열기`}
              >
                <div>
                  <div className="candidate-name">{candidate.title}</div>
                  <div className="candidate-copy">{candidate.description}</div>
                  <div className="chips">{candidate.tags.map((tag, index) => <span className={`chip${index === 0 ? ' orange' : ''}`} key={tag}>{tag}</span>)}</div>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel" id="regulation-panel">
          <div className="panel-head">
            <div><h2 className="panel-title">주요 법·규제 변화</h2><div className="panel-desc">연결 문서에서 법률명 기준으로 묶은 법·규제 연계 이슈 {riskRadarRegulations.length}건입니다.</div></div>
            <Link className="text-link" to={buildCatalogFilterPath('법·규제 변화', developerMode, 'legal')}>전체 보기 →</Link>
          </div>
          <div className="event-list">
            {riskRadarRegulations.map((item) => (
              <article className="event" key={item.id}>
                <div className="event-source">{item.source}</div>
                <div className="event-title">{item.title}</div>
                <p className="event-copy">{item.description}</p>
                <div className="event-footer"><span><b>연결 위험</b> {item.relatedRisk}</span></div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="panel market-panel">
        <div className="panel-head market-panel-head">
          <div className="market-panel-title-wrap">
            <span className="market-panel-icon"><AppIcon name="trend" size={22} /></span>
            <div><h2 className="panel-title">보험시장 상품개발 동향</h2><div className="panel-desc">업계의 최근 상품개발 사례와 관련 보험 이슈입니다.</div></div>
          </div>
        </div>
        <div className="market-grid">
          <section className="market-box market-card industry-market-box" aria-label="업계 상품개발 동향">
            <div className="market-box-head">
              <div className="market-card-heading"><span className="market-card-icon"><AppIcon name="user" size={19} /></span><div><h3 className="market-box-title">업계 상품개발 동향</h3><div className="market-box-desc">기업성·배상책임·기술위험 관련 상품개발 사례</div></div></div>
            </div>
            <section className="exclusive-section" aria-labelledby="exclusive-rights-title">
              <h4 className="market-subtitle" id="exclusive-rights-title">배타적사용권</h4>
              <div className="exclusive-rights-grid">
                {exclusiveRights.map((item) => <ExclusiveRightCard item={item} key={item.id} />)}
              </div>
            </section>
          </section>

          <section className="market-box market-card market-insights market-updates-card" aria-label="국내 보험 인사이트">
            <div className="market-box-head">
              <div className="market-card-heading"><span className="market-card-icon"><AppIcon name="report" size={19} /></span><div><h3 className="market-box-title">국내 보험 인사이트</h3><div className="market-box-desc">상품개발에 참고할 국내 정책과 해외 보험산업 자료</div></div></div>
            </div>
            <section className="market-insight-section market-updates-section" aria-labelledby="market-updates-title">
              <h4 className="insight-subtitle" id="market-updates-title">최근 보험시장 업데이트</h4>
              <div className="update-list">
                {marketUpdates.map((item) => <MarketUpdateItem item={item} key={item.id} />)}
              </div>
            </section>
          </section>

          <section className="market-box market-card recent-products-card" aria-label="최근 신상품">
            <div className="market-box-head">
              <div className="market-card-heading"><span className="market-card-icon"><AppIcon name="spark" size={19} /></span><div><h3 className="market-box-title">최근 출시 상품</h3></div></div>
            </div>
            <div className="recent-products-section">
              <div className="recent-products-list">
                {recentInsuranceProducts.map((item) => <RecentProductListItem item={item} key={item.id} />)}
              </div>
            </div>
          </section>

          <section className="market-box market-card global-insights-card" aria-label="글로벌 보험 인사이트">
            <div className="market-box-head">
              <div className="market-card-heading"><span className="market-card-icon"><AppIcon name="radar" size={19} /></span><div><h3 className="market-box-title">글로벌 보험 인사이트</h3></div></div>
            </div>
            <div className="global-insights-section">
              <div className="global-insight-list">
                {globalInsuranceInsights.map((item) => <GlobalInsightItem item={item} key={item.id} />)}
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="row-grid tertiary">
        <article className="panel">
          <div className="panel-head"><div><h2 className="panel-title">스크랩한 종합리포트</h2><div className="panel-desc">저장한 종합리포트로 빠르게 다시 이동합니다.</div></div><Link className="text-link" to={buildDeveloperPath('/reports', developerMode)}>전체 →</Link></div>
          <div className="scrap-list">
            {riskRadarScraps.map((scrap) => {
              const isScrapped = scrapPreferences[scrap.reportId]?.pinned ?? true
              const reportPath = `${buildDeveloperPath('/reports', developerMode)}?reportId=${encodeURIComponent(scrap.reportId)}`
              return (
                <article
                  className="scrap-item"
                  key={scrap.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`${scrap.title} 종합리포트 열기`}
                  onClick={() => navigate(reportPath)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(reportPath)
                    }
                  }}
                >
                  <div className="scrap-name">{scrap.title}</div>
                  <div className="scrap-conclusion">{scrap.conclusion}</div>
                  <button className={`bookmark-btn${isScrapped ? '' : ' unsaved'}`} type="button" aria-pressed={isScrapped} aria-label={isScrapped ? '스크랩 해제' : '스크랩'} onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggleScrap(scrap.reportId) }}>
                    <svg className="bookmark-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5c0-.83.67-1.5 1.5-1.5h8c.83 0 1.5.67 1.5 1.5V21l-5.5-3.5L6.5 21V4.5Z" /></svg>
                  </button>
                </article>
              )
            })}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2 className="panel-title">핵심 위험 키워드</h2><div className="panel-desc">키워드를 누르면 관련 위험 후보로 이동합니다.</div></div></div>
          <div className="keyword-body">
            <div className="keyword-cloud">
              {riskRadarKeywords.map((keyword) => <Link className={`keyword-btn ${keyword.tone} ${keyword.size}`} to={buildCatalogFilterPath(keyword.filter, developerMode)} aria-label={`${keyword.label} 키워드로 위험탐색`} key={keyword.label}>{keyword.label}</Link>)}
            </div>
            <div className="keyword-legend"><span className="legend-chip"><span className="legend-dot navy" />산업·기술</span><span className="legend-chip"><span className="legend-dot orange" />사고·손해</span><span className="legend-chip"><span className="legend-dot issue" />책임·보험 쟁점</span></div>
            <div className="keyword-help">선택 시 위험탐색에서 해당 키워드가 검색어로 적용됩니다.</div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2 className="panel-title">분석 자료 구성</h2><div className="panel-desc">위험 후보 도출에 연결된 자료 유형입니다.</div></div></div>
          <div className="source-body">
            <div className="source-visual">
              <div className="donut-wrap">
                <div className="source-donut" role="img" aria-label={sourceShareLabel}>
                  <div className="donut-center">분석 자료<strong>{riskRadarSourceShares.length}개</strong>유형</div>
                </div>
                <div className="donut-caption">위험 후보 도출에 활용된<br />자료 유형별 구성비</div>
              </div>
              <div className="source-legend">
                {riskRadarSourceShares.map((source) => <div className="source-legend-item" key={source.label}><span className="source-swatch" aria-hidden="true" /><div className="source-info"><div className="source-name">{source.label}</div><div className="source-role">{source.role}</div></div><div className="source-share">{source.share}%</div></div>)}
              </div>
            </div>
            <div className="source-note">최근 30일 동안 도출된 위험 후보에 연결된 분석 자료 기준</div>
          </div>
        </article>
      </section>
    </div>
  )
}
