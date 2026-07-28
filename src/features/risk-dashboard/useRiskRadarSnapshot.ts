import { useCallback, useEffect, useRef, useState } from 'react'
import {
  demoDashboardMetrics,
  demoIssues,
  demoRisks,
} from '../../domain/risk/riskRadarDemo'
import type {
  RadarDashboardData,
  RadarIssueRecord,
  RadarNewsArticle,
  RadarRiskCandidate,
} from '../../domain/risk/riskRadarTypes'
import { riskRadarApi } from './riskRadarApi'

export type RadarSnapshotSource = 'dashboard' | 'news' | 'risks'
export type RadarSnapshotSourceStatus = 'loading' | 'live' | 'stale' | 'sample'

export type RiskRadarSnapshotState = {
  dashboard: RadarDashboardData
  news: RadarNewsArticle[]
  risks: RadarRiskCandidate[]
  sourceStatus: Record<RadarSnapshotSource, RadarSnapshotSourceStatus>
  errors: Partial<Record<RadarSnapshotSource, string>>
  initialLoading: boolean
  refreshing: boolean
  lastAttemptAt?: string
  lastSuccessfulAt?: string
}

export type RiskRadarRefreshResult = {
  failedSources: RadarSnapshotSource[]
  liveSources: RadarSnapshotSource[]
  completedAt: string
}

const sampleGeneratedAt = '2026-07-19T09:40:00+09:00'

const sampleNews: RadarNewsArticle[] = demoRisks.map((risk) => ({
  id: risk.articleId,
  title: `${risk.keyword} 관련 보험상품 개발 이슈`,
  summary: risk.impact,
  source: '보험상품 개발 SAMPLE 리서치',
  publishedAt: '2026-07-19T09:00:00+09:00',
  collectedAt: sampleGeneratedAt,
  contentStatus: '본문 추출 완료 · SAMPLE',
  analysisStatus: 'AI 분석 완료 · SAMPLE',
  verificationStatus: '교차검증 보류',
  lawSearchStatus: risk.law === '확인' ? 'matched' : 'not_run',
  clusterId: `sample-cluster-${risk.id}`,
}))

const sampleRisks: RadarRiskCandidate[] = demoRisks.map((risk) => ({
  id: risk.id,
  articleId: risk.articleId,
  clusterId: `sample-cluster-${risk.id}`,
  name: risk.keyword,
  source: '보험상품 개발 SAMPLE 리서치',
  status: 'AI 탐색 후보 · SAMPLE',
  eligibleForProductReview: risk.data === '충분' && risk.law !== '검토 필요',
  promotionBlockReason: risk.next,
  confidence: {
    level: risk.data === '충분' ? '높음' : '중간',
    reason: risk.data === '충분' ? '독립 출처 후보가 확보된 SAMPLE입니다.' : '추가 근거 확인이 필요한 SAMPLE입니다.',
  },
}))

const sampleIssues: RadarIssueRecord[] = demoIssues.map((issue) => {
  const relatedRisk = demoRisks.find((risk) => risk.articleId === `demo-news-${issue.id.replace('issue-', '')}`)
  return {
    id: issue.id,
    kind: 'issue',
    type: issue.type,
    title: issue.title,
    problemStatement: `${issue.target}의 ${issue.riskEvent}로 ${issue.expectedLoss} 가능성이 관찰된 SAMPLE 이슈입니다.`,
    affectedTargets: [issue.target],
    damageTypes: [issue.expectedLoss],
    industries: [],
    sourceChannels: [issue.audience],
    articleIds: relatedRisk ? [relatedRisk.articleId] : [],
    signalCount: issue.sourceCount,
    sourceCount: issue.sourceCount,
    repeatedKeywords: relatedRisk?.keywords ?? [],
    contentStatus: issue.data === '없음' ? '본문 확보 필요' : '본문 확보 · SAMPLE',
    analysisStatus: issue.data === '충분' ? '분석 완료 · SAMPLE' : '분석 보강 필요',
    evidenceStatus: issue.data,
    coverageGap: issue.coverageGap,
    nextAction: issue.next,
    latestAt: sampleGeneratedAt,
  }
})

const sampleDashboard: RadarDashboardData = {
  generatedAt: sampleGeneratedAt,
  metrics: {
    news: 42,
    contentReady: 31,
    analyzed: 24,
    pending: 11,
    failed: 2,
    clusters: 8,
    evidencePending: 5,
    riskCandidates: sampleRisks.length,
    totalSignals: demoDashboardMetrics.unresolved,
    verificationPassed: 12,
    verificationPending: 6,
    lawMatched: 9,
    reviewerPending: demoDashboardMetrics.reviewerPending,
    productApiWaiting: 1,
    issueClusters: sampleIssues.length,
    issueSignals: sampleIssues.reduce((total, issue) => total + issue.signalCount, 0),
  },
  channels: {
    '개인 니즈': 11,
    '기업 니즈': 14,
    '영업·현장 요청': 8,
    '뉴스·산업 변화': 31,
    '법령·규제 변화': 9,
  },
  analysisCounts: {},
  clusters: demoRisks.map((risk) => ({
    id: `sample-cluster-${risk.id}`,
    title: risk.keyword,
    articleIds: [risk.articleId],
    articleCount: Math.max(1, Math.round(risk.mentions / 10)),
    sourceCount: risk.sourceCount,
    keywords: risk.keywords,
  })),
  topNews: sampleNews,
  risks: sampleRisks,
  issues: sampleIssues,
  signals: [],
  recentActivities: [],
  failures: [],
  apiStatus: { potens: 'unconfigured', law: 'unconfigured', products: 'unconfigured' },
  lastSync: { completedAt: sampleGeneratedAt, status: 'sample-fallback' },
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason)
}

function fallbackStatus(previous: RadarSnapshotSourceStatus): RadarSnapshotSourceStatus {
  return previous === 'live' || previous === 'stale' ? 'stale' : 'sample'
}

export function useRiskRadarSnapshot() {
  const requestSequence = useRef(0)
  const [snapshot, setSnapshot] = useState<RiskRadarSnapshotState>({
    dashboard: sampleDashboard,
    news: sampleNews,
    risks: sampleRisks,
    sourceStatus: { dashboard: 'loading', news: 'loading', risks: 'loading' },
    errors: {},
    initialLoading: true,
    refreshing: false,
  })

  const refresh = useCallback(async (): Promise<RiskRadarRefreshResult> => {
    const requestId = ++requestSequence.current
    setSnapshot((current) => ({
      ...current,
      refreshing: !current.initialLoading,
      errors: {},
    }))

    const [dashboardResult, newsResult, risksResult] = await Promise.allSettled([
      riskRadarApi.dashboard(),
      riskRadarApi.news(100),
      riskRadarApi.risks(),
    ])
    const completedAt = new Date().toISOString()
    const results = {
      dashboard: dashboardResult,
      news: newsResult,
      risks: risksResult,
    }
    const failedSources = (Object.entries(results) as Array<[RadarSnapshotSource, PromiseSettledResult<unknown>]>)
      .filter(([, result]) => result.status === 'rejected')
      .map(([source]) => source)
    const liveSources = (Object.entries(results) as Array<[RadarSnapshotSource, PromiseSettledResult<unknown>]>)
      .filter(([, result]) => result.status === 'fulfilled')
      .map(([source]) => source)

    if (requestId === requestSequence.current) {
      setSnapshot((current) => {
        const dashboard = dashboardResult.status === 'fulfilled' ? dashboardResult.value : current.dashboard
        const news = newsResult.status === 'fulfilled' ? newsResult.value.articles : current.news
        const risks = risksResult.status === 'fulfilled' ? risksResult.value.risks : current.risks
        return {
          dashboard,
          news,
          risks,
          sourceStatus: {
            dashboard: dashboardResult.status === 'fulfilled' ? 'live' : fallbackStatus(current.sourceStatus.dashboard),
            news: newsResult.status === 'fulfilled' ? 'live' : fallbackStatus(current.sourceStatus.news),
            risks: risksResult.status === 'fulfilled' ? 'live' : fallbackStatus(current.sourceStatus.risks),
          },
          errors: {
            ...(dashboardResult.status === 'rejected' ? { dashboard: errorMessage(dashboardResult.reason) } : {}),
            ...(newsResult.status === 'rejected' ? { news: errorMessage(newsResult.reason) } : {}),
            ...(risksResult.status === 'rejected' ? { risks: errorMessage(risksResult.reason) } : {}),
          },
          initialLoading: false,
          refreshing: false,
          lastAttemptAt: completedAt,
          lastSuccessfulAt: liveSources.length ? completedAt : current.lastSuccessfulAt,
        }
      })
    }

    return { failedSources, liveSources, completedAt }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => {
      window.clearTimeout(timer)
      requestSequence.current += 1
    }
  }, [refresh])

  return { snapshot, refresh }
}

export type RadarCatalogSource = 'news' | 'risks' | 'issues'
export type RadarCatalogSourceStatus = 'loading' | 'live' | 'stale' | 'sample'

export type RiskRadarCatalogSnapshotState = {
  news: RadarNewsArticle[]
  risks: RadarRiskCandidate[]
  issues: RadarIssueRecord[]
  sourceStatus: Record<RadarCatalogSource, RadarCatalogSourceStatus>
  errors: Partial<Record<RadarCatalogSource, string>>
  initialLoading: boolean
  refreshing: boolean
  lastAttemptAt?: string
  lastSuccessfulAt?: string
}

export type RiskRadarCatalogRefreshResult = {
  failedSources: RadarCatalogSource[]
  liveSources: RadarCatalogSource[]
  completedAt: string
}

export function useRiskRadarCatalogSnapshot() {
  const requestSequence = useRef(0)
  const [snapshot, setSnapshot] = useState<RiskRadarCatalogSnapshotState>({
    news: [],
    risks: [],
    issues: [],
    sourceStatus: { news: 'loading', risks: 'loading', issues: 'loading' },
    errors: {},
    initialLoading: true,
    refreshing: false,
  })

  const refresh = useCallback(async (): Promise<RiskRadarCatalogRefreshResult> => {
    const requestId = ++requestSequence.current
    setSnapshot((current) => ({
      ...current,
      refreshing: !current.initialLoading,
      errors: {},
    }))

    const [newsResult, risksResult, issuesResult] = await Promise.allSettled([
      riskRadarApi.news(100),
      riskRadarApi.risks(),
      riskRadarApi.issues(),
    ])
    const completedAt = new Date().toISOString()
    const results = { news: newsResult, risks: risksResult, issues: issuesResult }
    const failedSources = (Object.entries(results) as Array<[RadarCatalogSource, PromiseSettledResult<unknown>]>).
      filter(([, result]) => result.status === 'rejected').map(([source]) => source)
    const liveSources = (Object.entries(results) as Array<[RadarCatalogSource, PromiseSettledResult<unknown>]>).
      filter(([, result]) => result.status === 'fulfilled').map(([source]) => source)

    if (requestId === requestSequence.current) {
      setSnapshot((current) => ({
        news: newsResult.status === 'fulfilled' ? newsResult.value.articles : current.news,
        risks: risksResult.status === 'fulfilled' ? risksResult.value.risks : current.risks,
        issues: issuesResult.status === 'fulfilled' ? issuesResult.value.issues : current.issues,
        sourceStatus: {
          news: newsResult.status === 'fulfilled' ? 'live' : fallbackCatalogStatus(current.sourceStatus.news),
          risks: risksResult.status === 'fulfilled' ? 'live' : fallbackCatalogStatus(current.sourceStatus.risks),
          issues: issuesResult.status === 'fulfilled' ? 'live' : fallbackCatalogStatus(current.sourceStatus.issues),
        },
        errors: {
          ...(newsResult.status === 'rejected' ? { news: errorMessage(newsResult.reason) } : {}),
          ...(risksResult.status === 'rejected' ? { risks: errorMessage(risksResult.reason) } : {}),
          ...(issuesResult.status === 'rejected' ? { issues: errorMessage(issuesResult.reason) } : {}),
        },
        initialLoading: false,
        refreshing: false,
        lastAttemptAt: completedAt,
        lastSuccessfulAt: liveSources.length ? completedAt : current.lastSuccessfulAt,
      }))
    }

    return { failedSources, liveSources, completedAt }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => {
      window.clearTimeout(timer)
      requestSequence.current += 1
    }
  }, [refresh])

  return { snapshot, refresh }
}

function fallbackCatalogStatus(previous: RadarCatalogSourceStatus): RadarCatalogSourceStatus {
  return previous === 'live' || previous === 'stale' ? 'stale' : 'sample'
}
