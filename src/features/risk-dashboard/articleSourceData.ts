import { readPdfFile } from '../llm-util/fileContext'
import type { RadarDashboardData, RadarNewsArticle, RadarRiskCandidate } from '../../domain/risk/riskRadarTypes'

// The source PDFs are kept in public/articles so the browser can load the same
// files that are referenced by the saved Step 2 workbook. Keep the manifest
// explicit: Vite cannot enumerate files in its public directory at runtime.
const articleFiles = [
  '/articles/Warming Switzerland_ supporting our community to thrive in a hotter future _ Swiss Re-B08qVvNS.pdf',
  '/articles/sri-2026-06-warming-switzerland-version-de-DFNu51l8.pdf',
  '/articles/afoMp8BOoF08xomN_AXA_PR_20260505-DtwmCOyG.pdf',
  '/articles/고용보험_및_산업재해보상보험의_보험료징수_등에_관한_법률(법률)(제21472호)(20270101) (1)-BsQPp5NI.pdf',
  '/articles/보험개발원_신기술-CerngTVi.pdf',
  '/articles/보험연구원_AI_데이터센터_건설_붐과_보장_공백-Ct_yc2Xr.pdf',
] as const

function fileName(path: string) {
  return path.split(/[\\/]/).pop() ?? path
}

function titleFromFile(name: string) {
  return name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function articleId(index: number) {
  return `ARTICLE-${String(index + 1).padStart(3, '0')}`
}

export type ArticleSourceRecord = RadarNewsArticle & { text: string; fileName: string }

export async function loadArticleSourceRecords(): Promise<ArticleSourceRecord[]> {
  return Promise.all(articleFiles.map(async (url, index) => {
    const name = fileName(url)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${name}: 원문 파일을 읽지 못했습니다.`)
    const blob = await response.blob()
    const text = await readPdfFile(new File([blob], name, { type: 'application/pdf' }))
    const title = titleFromFile(name)
    return {
      id: articleId(index),
      title,
      summary: text.slice(0, 360),
      content: text,
      source: name.includes('Swiss') || name.includes('sri-') ? 'Swiss Re 원문' : '보험 연구·산업 원문',
      collectedAt: new Date().toISOString(),
      contentStatus: '원문 PDF 추출 완료',
      contentSource: 'src/article',
      contentQuality: { chars: text.length, paragraphs: text.split(/\n{2,}/).length, titleMatched: 0, titleTokens: 0 },
      analysisStatus: '대시보드 파생 전',
      verificationStatus: '담당자 검토 필요',
      text,
      fileName: name,
    }
  }))
}

export function deriveArticleDashboard(records: ArticleSourceRecord[]): {
  dashboard: RadarDashboardData
  news: RadarNewsArticle[]
  risks: RadarRiskCandidate[]
} {
  const news = records.map((record) => {
    const { text, fileName, ...article } = record
    void text
    void fileName
    return article
  })
  const risks = records.map((article) => ({
    id: `RISK-${article.id}`,
    articleId: article.id,
    clusterId: `CLUSTER-${article.id}`,
    name: article.title,
    source: article.source,
    status: '원문 기반 후보 · AI/담당자 검토 필요',
    eligibleForProductReview: false,
    promotionBlockReason: '원문 단독으로 후보 확정·상품화 판단을 하지 않음',
    confidence: { level: article.contentQuality?.chars && article.contentQuality.chars > 1000 ? '중간' : '낮음', reason: `원문 ${article.contentQuality?.chars ?? 0}자 추출. 독립 출처와 교차검증 필요.` },
  }))
  const generatedAt = new Date().toISOString()
  const dashboard: RadarDashboardData = {
    generatedAt,
    metrics: {
      news: records.length,
      contentReady: records.length,
      analyzed: 0,
      pending: records.length,
      failed: 0,
      clusters: records.length,
      evidencePending: records.length,
      riskCandidates: risks.length,
      totalSignals: records.length,
      verificationPassed: 0,
      verificationPending: records.length,
      lawMatched: 0,
      reviewerPending: records.length,
      productApiWaiting: records.length,
    },
    channels: { 'src/article 원문': records.length },
    analysisCounts: { '원문 추출 완료': records.length, 'AI 분석 대기': records.length },
    clusters: records.map((record) => ({ id: `CLUSTER-${record.id}`, title: record.title, articleIds: [record.id], articleCount: 1, sourceCount: 1, keywords: [] })),
    topNews: news,
    risks,
    issues: [],
    signals: [],
    recentActivities: records.map((record) => ({ type: 'article', title: `${record.title} 원문 반영`, status: '완료', at: generatedAt })),
    failures: [],
    apiStatus: { potens: 'not_used', law: 'not_run', products: 'not_run' },
    lastSync: { completedAt: generatedAt, status: 'local-article-source' },
  }
  return { dashboard, news, risks }
}
