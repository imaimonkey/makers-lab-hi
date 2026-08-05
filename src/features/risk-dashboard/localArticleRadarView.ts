import { groupArticleSourceRecords, isArticleReportCandidate, isMeaningfulRiskCandidate, selectArticleGroupRepresentative, type ArticleSourceRecord } from './articleSourceData'
import type { ExclusiveRight, GlobalInsuranceInsight, MarketUpdate, RecentInsuranceProduct, RiskRadarCandidate, RiskRadarKpi, RiskRadarKeyword, RiskRadarPriorityRisk, RiskRadarRegulation, RiskRadarScrap, RiskRadarSourceShare } from './riskRadarContent'
import { calculateProductizationScores } from '../risk-catalog/productizationScore'

export type LocalArticleRadarView = {
  kpis: RiskRadarKpi[]
  priorityRisks: RiskRadarPriorityRisk[]
  topPriority: { detailRiskId: string; reportId: string; title: string; summary: string; marketScore: string; totalScore: string }
  candidates: RiskRadarCandidate[]
  regulations: RiskRadarRegulation[]
  exclusiveRights: ExclusiveRight[]
  recentProducts: RecentInsuranceProduct[]
  marketUpdates: MarketUpdate[]
  globalInsights: GlobalInsuranceInsight[]
  scraps: RiskRadarScrap[]
  keywords: RiskRadarKeyword[]
  sourceShares: RiskRadarSourceShare[]
}

const dateLabel = (value?: string) => value?.slice(0, 10).replaceAll('-', '.') || '문서 기준일 없음'
const articleDateLabel = (article: ArticleSourceRecord) => dateLabel(article.derived.publishedAt ?? article.collectedAt)

function scores(article: ArticleSourceRecord) {
  const calculated = calculateProductizationScores(article.derived.metricScores)
  return { market: calculated.market, pml: calculated.pml, productization: calculated.total }
}

function priority(article: ArticleSourceRecord): RiskRadarPriorityRisk {
  const score = scores(article)
  const source = article.source ?? '문서 원문'
  return {
    id: `priority-${article.id}`,
    detailRiskId: `developer-${article.id}`,
    title: article.title,
    marketGrade: score.market >= 4.3 ? 'S' : 'A',
    category: article.contentProfile.topic,
    score: score.productization,
    summary: `${article.summary} 시장성 ${score.market.toFixed(1)}점, PML ${score.pml.toFixed(1)}점, 상품화 종합점수 ${score.productization.toFixed(1)}점으로 산정했습니다.`,
    detectionSummary: `[분류: ${article.contentProfile.topic}] ${source} 문서에서 확인한 ${article.contentProfile.facts.slice(0, 2).join(' · ')} 근거를 위험 후보로 연결했습니다.`,
    evidence: article.contentProfile.facts.slice(0, 4).map((fact) => ({ type: article.derived.isRegulatory ? '법령 원문' : '문서 근거', title: fact, source, date: articleDateLabel(article), sourceUrl: article.fileUrl || null })),
  }
}

function keywordTone(label: string): RiskRadarKeyword['tone'] {
  if (/화재|열폭주|손해|폭염|테러|사고|침수|누출|중단|재난/.test(label)) return 'loss'
  if (/공백|책임|보험|면책|재보험|배상/.test(label)) return 'issue'
  return 'tech'
}

function buildRiskDiscoveryKeywords(articles: ArticleSourceRecord[]): RiskRadarKeyword[] {
  const keywordCounts = new Map<string, number>()
  articles.forEach((article) => {
    article.contentProfile.keywords
      .filter((keyword) => keyword.length > 1 && !/^(문서 원문|보험 위험)$/.test(keyword))
      .forEach((keyword) => keywordCounts.set(keyword, (keywordCounts.get(keyword) ?? 0) + 1))
  })

  return [...keywordCounts.entries()]
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0], 'ko-KR'))
    .slice(0, 12)
    .map(([label, count], index) => ({
      label,
      tone: keywordTone(label),
      size: (index < 3 ? 'lg' : count > 1 ? 'md' : 'sm') as RiskRadarKeyword['size'],
      filter: label,
    }))
}

export function buildLocalArticleRadarView(records: ArticleSourceRecord[]): LocalArticleRadarView {
  const ordered = [...records].sort((a, b) => scores(b).productization - scores(a).productization)
  const displayOrdered = groupArticleSourceRecords(ordered).map(selectArticleGroupRepresentative)
  const meaningfulOrdered = displayOrdered.filter(isMeaningfulRiskCandidate)
  const reportableOrdered = meaningfulOrdered.filter(isArticleReportCandidate)
  const priorities = reportableOrdered.slice(0, 5).map(priority)
  const first = reportableOrdered[0]
  const firstScores = first ? scores(first) : { market: 0, pml: 0, productization: 0 }
  const firstPriority = priorities[0]
  const candidates = meaningfulOrdered.slice(0, 8).map((article) => ({ id: article.id, detailRiskId: `developer-${article.id}`, title: article.title, description: `[${article.contentProfile.topic}] ${article.summary}`, tags: [article.contentProfile.topic, ...article.contentProfile.keywords.slice(0, 2)], keywords: [article.contentProfile.topic, ...article.contentProfile.keywords] }))
  const legalArticles = records.filter((article) => article.derived.isRegulatory)
  const legalGroups = groupArticleSourceRecords(legalArticles)
  const regulations = legalGroups.map((group) => {
    const article = selectArticleGroupRepresentative(group)
    const dates = [...new Set(group.map(articleDateLabel))]
    const industries = [...new Set(group.flatMap((item) => item.contentProfile.industries))].slice(0, 3)
    return { id: `regulation-${article.id}`, source: article.source ?? '국가법령정보센터', title: article.title, description: `${article.summary} 연결 문서 기준일 ${dates.join(' · ')}.`, relatedRisk: industries.join(' · '), detailRiskId: `developer-${article.id}` }
  })
  const marketUpdates = displayOrdered.slice(0, 6).map((article) => ({ id: `update-${article.id}`, type: article.derived.isRegulatory ? '법령·규제 자료' : '보험·재보험 자료', source: article.source ?? '문서 원문', date: articleDateLabel(article), displayDate: articleDateLabel(article), title: article.title, insight: article.summary ?? article.contentProfile.summary, relatedTopic: article.contentProfile.topic, sourceUrl: article.fileUrl || null }))
  const globalInsights = displayOrdered.filter((article) => !article.derived.isRegulatory).slice(0, 4).map((article) => ({ id: `global-${article.id}`, organization: article.source ?? '문서 원문', date: articleDateLabel(article), displayDate: articleDateLabel(article), title: article.title, summary: article.summary ?? article.contentProfile.summary, relatedRisk: article.contentProfile.topic, sourceType: '문서 원문', sourceTitle: article.title, sourceUrl: article.fileUrl || null }))
  const recentProducts = displayOrdered.filter((article) => /보험시장|반려동물|건강보험|생명보험|재보험/.test(article.contentProfile.topic)).slice(0, 4).map((article) => ({ id: `product-${article.id}`, company: article.source ?? '문서 원문', title: article.title, summary: article.summary ?? article.contentProfile.summary, date: articleDateLabel(article), sourceType: '시장 자료', sourceUrl: article.fileUrl || null }))
  const exclusiveRights: ExclusiveRight[] = []
  const scraps = reportableOrdered.slice(0, 4).map((article) => ({ id: `scrap-${article.id}`, title: article.title, conclusion: `시장성 ${scores(article).market.toFixed(1)}점 · PML ${scores(article).pml.toFixed(1)}점 · 상품화 종합점수 ${scores(article).productization.toFixed(1)}점`, reportId: `article-report-${article.id}` }))
  // Regulation keywords describe the legal reference layer. They should not
  // compete with emerging-risk discovery keywords on the dashboard.
  const keywords = buildRiskDiscoveryKeywords(meaningfulOrdered)
  const sourceCounts = new Map<string, number>()
  records.forEach((article) => { const label = article.derived.isRegulatory ? '법령·규제 자료' : /보험연구원|보험개발원/.test(article.source ?? '') ? '보험 전문연구' : /AXA|Swiss Re Capital Markets/.test(article.source ?? '') ? '보험시장·기업자료' : '해외 보험·재보험 자료'; sourceCounts.set(label, (sourceCounts.get(label) ?? 0) + 1) })
  const total = records.length || 1
  const sourceShares: RiskRadarSourceShare[] = [...sourceCounts.entries()].map(([label, count], index) => ({ label, count, share: Math.round(count / total * 100), role: label === '법령·규제 자료' ? '적용 범위·책임 주체·보상 기준' : label === '보험시장·기업자료' ? '보험료·자본력·시장 흐름' : '위험 신호·시장·손해 구조', tone: index === 0 ? 'orange' : index === 1 ? 'navy' : index === 2 ? 'blue' : 'mist' }))
  if (sourceShares.length) sourceShares[sourceShares.length - 1].share += 100 - sourceShares.reduce((sum, item) => sum + item.share, 0)

  return {
    kpis: [{ label: '신규 위험 후보', value: meaningfulOrdered.length, unit: '건', description: '원문을 주제별로 묶고 신규성·손해·보장 공백을 확인한 후보', meta: `원문 ${records.length}건 중 선별`, icon: 'radar', tone: 'orange' }, { label: '상품화 검토 후보', value: reportableOrdered.length, unit: '건', description: '시장성·PML·보험성·근거 수준을 함께 검토할 후보', meta: '원문 기준 우선순위', icon: 'report', tone: 'navy' }, { label: '법·규제 연계 위험', value: legalGroups.length, unit: '건', description: '법률명·시행본을 묶어 적용 범위와 책임 주체를 확인하는 자료', meta: `원문 ${legalArticles.length}건 연결`, icon: 'shield', tone: 'blue' }],
    priorityRisks: priorities,
    topPriority: firstPriority ? { detailRiskId: firstPriority.detailRiskId, reportId: `article-report-${first?.id ?? ''}`, title: firstPriority.title, summary: firstPriority.summary, marketScore: `시장성 ${firstScores.market.toFixed(1)} / 5점`, totalScore: `${firstScores.productization.toFixed(1)} / 5점` } : { detailRiskId: '', reportId: '', title: '연결된 문서 없음', summary: '연결된 문서에서 분석 자료를 준비하고 있습니다.', marketScore: '시장성 0.0 / 5점', totalScore: '0.0 / 5점' },
    candidates, regulations, exclusiveRights, recentProducts, marketUpdates, globalInsights, scraps, keywords, sourceShares,
  }
}

export function articleScores(article: ArticleSourceRecord) { return scores(article) }
