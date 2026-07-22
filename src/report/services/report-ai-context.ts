import type { JsonObject, JsonValue, ReportResult, RiskSourceData } from '../types'
import { ensureCommercializationAssessment } from './commercialization-assessment'

export const REPORT_AI_CONTEXT_SCHEMA = 'riskon.report-ai-context/v1'

const isRecord = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: JsonValue | undefined, fallback = ''): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const texts = (value: JsonValue | undefined): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []

const compactScenario = (scenario: JsonObject): JsonObject => {
  const keys = ['title', 'summary', 'description', 'scenario', 'trigger', 'damage', 'loss']
  const result = keys.reduce<JsonObject>((result, key) => {
    const value = scenario[key]
    if (typeof value === 'string' && value.trim()) result[key] = value.trim()
    return result
  }, {})
  const sequence = texts(scenario.sequence).slice(0, 6)
  if (sequence.length) result.sequence = sequence
  return result
}

/**
 * Browser-to-GAS context for assist features only. It intentionally excludes
 * reviewer notes, UI state, validation-only material, credentials, and full prompts.
 */
export const buildReportAiContext = (
  riskData: RiskSourceData,
  reportResult: ReportResult,
): JsonObject => {
  const normalizedReport = ensureCommercializationAssessment(reportResult)
  const feasibilityAssessment = normalizedReport.productFeasibility.assessment
  const gapSummary = isRecord(reportResult.riskGapSummary) ? reportResult.riskGapSummary : {}
  const existingCoverageMap = Array.isArray(gapSummary.existingCoverageMap)
    ? gapSummary.existingCoverageMap.filter(isRecord).map((item) => ({
        loss: text(item.loss ?? item.damage ?? item.risk),
        existingCoverage: text(item.existingCoverage ?? item.coverage),
        remainingGap: text(item.remainingGap ?? item.gap),
      }))
    : []

  const nextTasks = [
    ...reportResult.aiSummary.nextActions.map((item) => ({
      task: item.action,
      reason: item.reason,
      responsibleTeams: item.responsibleTeams,
      evidenceIds: item.evidenceIds,
    })),
    ...reportResult.aiSummary.additionalConfirmations.map((item) => ({
      task: item.whatToConfirm || item.title,
      reason: item.whyNeeded,
      responsibleTeams: item.responsibleTeams,
      evidenceIds: item.evidenceIds,
      requiredMaterials: item.requiredMaterials,
    })),
  ].slice(0, 6)

  return {
    schemaVersion: REPORT_AI_CONTEXT_SCHEMA,
    risk: {
      name: riskData.risk.title,
      accidentScenario: compactScenario(riskData.accidentScenario),
    },
    productDirection: {
      insuranceTarget: reportResult.aiSummary.cards
        .filter((item) => /보험 대상|대상/.test(item.label))
        .map((item) => ({ result: item.result, reason: item.shortReason })),
      productDirection: reportResult.aiSummary.cards
        .filter((item) => /상품 방향|상품/.test(item.label))
        .map((item) => ({ result: item.result, reason: item.shortReason })),
      coveredObject: reportResult.productProposal.coveredObject,
      recommendedForm: reportResult.productProposal.recommendedForm,
      coveredEvent: reportResult.productProposal.coveredEvent,
    },
    overallOpinion: reportResult.aiSummary.overallOpinion,
    feasibility: {
      overallStatus: feasibilityAssessment?.overallStatus,
      overallSummary: feasibilityAssessment?.overallSummary,
      overallReason: feasibilityAssessment?.overallReason,
      topStrengths: feasibilityAssessment?.topStrengths ?? [],
      topRisks: feasibilityAssessment?.topRisks ?? [],
      priorityActions: feasibilityAssessment?.priorityActions ?? [],
      criteria: (feasibilityAssessment?.criteria ?? []).map((item) => ({
        id: item.id,
        category: item.category,
        title: item.title,
        question: item.question,
        status: item.status,
        summary: item.summary,
        rationale: item.rationale,
        evidence: item.evidence.map((evidence) => ({ id: evidence.id, title: evidence.title, summary: evidence.excerpt ?? '' })),
        missingInformation: item.missingInformation,
        nextActions: item.nextActions.map((action) => ({ text: action.text, owner: action.owner, priority: action.priority, completed: action.completed })),
        isBlocking: item.isBlocking,
      })),
      discoveryContext: feasibilityAssessment?.discoveryContext,
      externalConstraints: feasibilityAssessment?.externalConstraints,
    },
    coverageGap: {
      summary: text(gapSummary.summary ?? gapSummary.overallSummary),
      existingCoverageMap,
    },
    recommendedWording: {
      coverageDraft: reportResult.wordingFeasibility.coverageDraft,
      definitions: reportResult.wordingFeasibility.definitions.slice(0, 4),
      paymentConditions: reportResult.wordingFeasibility.paymentConditions,
      exclusions: reportResult.wordingFeasibility.exclusionCandidates,
    },
    nextReviewTasks: nextTasks,
    missingData: reportResult.missingResearch.map((item) => ({
      topic: item.topic,
      reason: item.reason,
      responsibleTeam: item.responsibleTeam ?? '',
      requiredMaterials: item.requiredMaterials ?? [],
    })),
    evidence: reportResult.evidence.map((item) => ({
      id: item.id,
      title: item.title,
      summary: texts(item.usedFor).slice(0, 2).join(', '),
    })),
  }
}

/** Runtime guard used before a browser request is created; no context is logged. */
export const isReportAiContext = (value: unknown): value is JsonObject =>
  (() => {
    const context = value as JsonValue | undefined
    if (!isRecord(context)) return false
    return context.schemaVersion === REPORT_AI_CONTEXT_SCHEMA
      && isRecord(context.risk)
      && typeof context.risk.name === 'string'
      && Array.isArray(context.evidence)
  })()
