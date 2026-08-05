import { groupArticleSourceRecords, selectArticleGroupRepresentative, type ArticleSourceRecord } from './articleSourceData'
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
    evidence: article.contentProfile.facts.slice(0, 4).map((fact) => ({ type: article.derived.isRegulatory ? '법령 원문' : '문서 근거', title: fact, source, date: dateLabel(article.collectedAt), sourceUrl: article.fileUrl || null })),
  }
}

export function buildLocalArticleRadarView(records: ArticleSourceRecord[]): LocalArticleRadarView {
  const ordered = [...records].sort((a, b) => scores(b).productization - scores(a).productization)
  const displayOrdered = groupArticleSourceRecords(ordered).map(selectArticleGroupRepresentative)
  const priorities = displayOrdered.slice(0, 5).map(priority)
  const first = displayOrdered[0]
  const firstScores = first ? scores(first) : { market: 0, pml: 0, productization: 0 }
  const firstPriority = priorities[0]
  const candidates = displayOrdered.slice(0, 8).map((article) => ({ id: article.id, detailRiskId: `developer-${article.id}`, title: article.title, description: `[${article.contentProfile.topic}] ${article.summary}`, tags: [article.contentProfile.topic, ...article.contentProfile.keywords.slice(0, 2)], keywords: [article.contentProfile.topic, ...article.contentProfile.keywords] }))
  const legalArticles = records.filter((article) => article.derived.isRegulatory)
  const legalGroups = groupArticleSourceRecords(legalArticles)
  const regulations = legalGroups.map((group) => {
    const article = selectArticleGroupRepresentative(group)
    const dates = [...new Set(group.map((item) => dateLabel(item.collectedAt)))]
    const industries = [...new Set(group.flatMap((item) => item.contentProfile.industries))].slice(0, 3)
    return { id: `regulation-${article.id}`, source: article.source ?? '국가법령정보센터', title: article.title, description: `${article.summary} 연결 문서 기준일 ${dates.join(' · ')}.`, relatedRisk: industries.join(' · '), detailRiskId: `developer-${article.id}` }
  })
  const marketUpdates = displayOrdered.slice(0, 6).map((article) => ({ id: `update-${article.id}`, type: article.derived.isRegulatory ? '법령·규제 자료' : '보험·재보험 자료', source: article.source ?? '문서 원문', date: dateLabel(article.collectedAt), displayDate: dateLabel(article.collectedAt), title: article.title, insight: article.summary ?? article.contentProfile.summary, relatedTopic: article.contentProfile.topic, sourceUrl: article.fileUrl || null }))
  const globalInsights = displayOrdered.filter((article) => !article.derived.isRegulatory).slice(0, 4).map((article) => ({ id: `global-${article.id}`, organization: article.source ?? '문서 원문', date: dateLabel(article.collectedAt), displayDate: dateLabel(article.collectedAt), title: article.title, summary: article.summary ?? article.contentProfile.summary, relatedRisk: article.contentProfile.topic, sourceType: '문서 원문', sourceTitle: article.title, sourceUrl: article.fileUrl || null }))
  const recentProducts = displayOrdered.filter((article) => /보험시장|반려동물|건강보험|생명보험|재보험/.test(article.contentProfile.topic)).slice(0, 4).map((article) => ({ id: `product-${article.id}`, company: article.source ?? '문서 원문', title: article.title, summary: article.summary ?? article.contentProfile.summary, date: dateLabel(article.collectedAt), sourceType: '시장 자료', sourceUrl: article.fileUrl || null }))
  const exclusiveRights: ExclusiveRight[] = []
  const scraps = displayOrdered.slice(0, 4).map((article) => ({ id: `scrap-${article.id}`, title: article.title, conclusion: `시장성 ${scores(article).market.toFixed(1)}점 · PML ${scores(article).pml.toFixed(1)}점 · 상품화 종합점수 ${scores(article).productization.toFixed(1)}점`, reportId: `article-report-${article.id}` }))
  const keywordCounts = new Map<string, number>()
  records.forEach((article) => article.contentProfile.keywords.forEach((keyword) => keywordCounts.set(keyword, (keywordCounts.get(keyword) ?? 0) + 1)))
  const keywords: RiskRadarKeyword[] = [...keywordCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([label, count], index) => ({ label, tone: (/화재|손해|폭염|테러|사고/.test(label) ? 'loss' : /법|규제|공백|책임/.test(label) ? 'issue' : 'tech') as RiskRadarKeyword['tone'], size: (index < 3 ? 'lg' : count > 1 ? 'md' : 'sm') as RiskRadarKeyword['size'], filter: label }))
  const sourceCounts = new Map<string, number>()
  records.forEach((article) => { const label = article.derived.isRegulatory ? '법령·규제 자료' : /보험연구원|보험개발원/.test(article.source ?? '') ? '보험 전문연구' : /AXA|Swiss Re Capital Markets/.test(article.source ?? '') ? '보험시장·기업자료' : '해외 보험·재보험 자료'; sourceCounts.set(label, (sourceCounts.get(label) ?? 0) + 1) })
  const total = records.length || 1
  const sourceShares: RiskRadarSourceShare[] = [...sourceCounts.entries()].map(([label, count], index) => ({ label, count, share: Math.round(count / total * 100), role: label === '법령·규제 자료' ? '적용 범위·책임 주체·보상 기준' : label === '보험시장·기업자료' ? '보험료·자본력·시장 흐름' : '위험 신호·시장·손해 구조', tone: index === 0 ? 'orange' : index === 1 ? 'navy' : index === 2 ? 'blue' : 'mist' }))
  if (sourceShares.length) sourceShares[sourceShares.length - 1].share += 100 - sourceShares.reduce((sum, item) => sum + item.share, 0)

  return {
    kpis: [{ label: '신규 위험 후보', value: displayOrdered.length, unit: '건', description: '중복 문서를 묶어 화면에 표시한 위험 후보', meta: `원문 ${records.length}건 연결`, icon: 'radar', tone: 'orange' }, { label: '상품화 검토 후보', value: Math.min(displayOrdered.length, 8), unit: '건', description: '시장성·PML·근거 수준을 함께 계산한 후보', meta: '종합점수 기준', icon: 'report', tone: 'navy' }, { label: '법·규제 연계 위험', value: legalGroups.length, unit: '건', description: '개정본을 법률명 단위로 묶은 규제 위험', meta: `원문 ${legalArticles.length}건 연결`, icon: 'shield', tone: 'blue' }],
    priorityRisks: priorities,
    topPriority: firstPriority ? { detailRiskId: firstPriority.detailRiskId, reportId: `article-report-${first?.id ?? ''}`, title: firstPriority.title, summary: firstPriority.summary, marketScore: `시장성 ${firstScores.market.toFixed(1)} / 5점`, totalScore: `${firstScores.productization.toFixed(1)} / 5점` } : { detailRiskId: '', reportId: '', title: '연결된 문서 없음', summary: '연결된 문서에서 분석 자료를 준비하고 있습니다.', marketScore: '시장성 0.0 / 5점', totalScore: '0.0 / 5점' },
    candidates, regulations, exclusiveRights, recentProducts, marketUpdates, globalInsights, scraps, keywords, sourceShares,
  }
}

export function articleScores(article: ArticleSourceRecord) { return scores(article) }
