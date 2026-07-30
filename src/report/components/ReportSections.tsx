import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type {
  CommercializationCriterion,
  CommercializationCriterionCategory,
  CommercializationCriterionStatus,
  CommercializationAiDecision,
  CommercializationCriterionDetail,
  CommercializationCriterionReviewStatus,
  CommercializationReviewAction,
  CommercializationEvidenceStatus,
  CommercializationGateGroup,
  CommercializationRateDataPoint,
  CommercializationInputDataPoint,
  CommercializationReviewerReview,
  CommercializationReviewStatus,
  BriefingReviewStatus,
  ReportResult,
  RiskSourceData,
} from '../types'
import type { ReportProxy } from '../api/report-proxy'
import { cloneReport, parseStoredReportContent, updateReportContent } from '../services/report-content'
import { commercializationEvidenceStatusLabel, commercializationStatusLabel, ensureCommercializationAssessment, deriveCommercializationAiJudgment, deriveCommercializationReviewerProductJudgment, COMMERCIALIZATION_GATE_GROUPS, RATE_DATA_FIELD_DEFINITIONS, RATE_DATA_STATUS_LABELS, validateCommercializationAssessment } from '../services/commercialization-assessment'
import { ReportModal } from './ReportModal'
import { PolicyDraftModal } from './ReportAssistPanels'
import { ReportEditorPanel } from './ReportEditorPanel'
import { AppIcon } from '../../shared/components/AppIcon'
import { createPortal } from 'react-dom'
import { createBriefingContent } from '../services/briefing-content'
import { pushPreservingHistoryState, type ReportNavigation } from '../services/browser-history'
import { WORDING_ANALYSIS_RISK } from '../data/wording-review-mock'
import { aiFullPolicyDraftMock, buildFullPolicyCopyText, type PolicyArticle, type PolicyArticleItem, type SpecialClause } from '../data/aiFullPolicyDraftMock'
import { FEASIBILITY_EXPECTED_OUTPUTS, FEASIBILITY_PML_DATA, type FeasibilityPmlScenarioId } from '../data/product-feasibility-mock'
import { PROPOSAL_CALCULATION_EVIDENCE, PROPOSAL_CLAIM_FLOW_DISPLAY, PROPOSAL_CONTRACT_ROLE_SUMMARY, PROPOSAL_COVERAGE_SUMMARY, PROPOSAL_DECISIONS, PROPOSAL_HERO_FACTS, PROPOSAL_PRICING_SCENARIO_OUTPUTS, PROPOSAL_RECOMMENDATION_DETAIL_BLOCKS, PROPOSAL_RECOMMENDATION_DISPLAY, PROPOSAL_UNDERWRITING_AI_SUMMARY, PROPOSAL_UNDERWRITING_DISPLAY, type ProposalPricingScenarioOutput } from '../data/product-proposal-mock'
import { createFinancialEstimate, PRODUCT_FINANCIAL_ESTIMATE, type EstimateConfidence, type FinancialEstimate } from '../data/financial-estimate-mock'
import { COVERAGE_GAP_ANALYSIS_PREMISE, COVERAGE_GAP_ASSUMPTIONS, COVERAGE_GAP_CATEGORY_SUMMARY, COVERAGE_GAP_LIMITATION, COVERAGE_GAP_PRODUCT_INPUTS, COVERAGE_GAP_RESULT_CARDS } from '../data/coverage-gap-mock'
import { PRODUCT_REVIEW_SUMMARY_COPY } from '../data/product-review-summary-mock'

type SummaryCard = {
  id: string
  label: string
  result: string
  status: string
  shortReason: string
  detail: string
  evidenceIds?: string[]
  caveat?: string
}

type EvidenceItem = {
  id: string
  type: string
  title: string
  source: string
  referenceDate?: string | null
  usedFor?: string[]
  reliability?: string
  isMockData?: boolean
  originalAvailable?: boolean
  /** Optional explicit section references from a future report repository. */
  usedInSections?: string[]
}

type ReportView = {
  meta: {
    reportId?: string
    sourceRiskId: string
    sourceAsOf?: string | null
    title: string
    riskTitle?: string
    riskCategories?: string[]
    analysisBaseDate?: string
    generatedAt?: string | null
    evidenceCount?: number
    aiStatus?: string
    dataStatus?: string
    badges?: string[]
    disclaimer?: string
  }
  aiSummary: {
    decisionLabel?: string
    primaryConclusionReason?: string
    cards?: SummaryCard[]
    overallOpinion?: string
    recommendedNextAction?: string
    nextActions?: Array<{
      id: string
      action: string
      reason: string
      evaluationIds?: string[]
      evidenceIds?: string[]
      responsibleTeams?: string[]
    }>
    additionalConfirmations?: Array<{
      id: string
      title: string
      whatToConfirm: string
      whyNeeded: string
      requiredMaterials?: string[]
      responsibleTeams?: string[]
      evidenceIds?: string[]
    }>
  }
  riskGapSummary: {
    definition?: string
    whyNow?: string[]
    damageTypes?: Array<{
      id: string
      name: string
      examples?: string[]
      initialScope?: string
    }>
    affectedParties?: string[]
    existingCoverageMap?: Array<{
      id: string
      damage?: string
      coverageName: string
      possibleCoverage?: string
      remainingGap?: string
      status?: string
    }>
    keyCoverageGaps?: Array<{
      id: string
      title: string
      description?: string
      importance?: string
    }>
  }
  targetSuitability: {
    recommendation?: string
    recommendationLabel?: string
    options?: Array<{
      id: string
      target: string
      suitability: string
      rank?: number
      reason?: string
      limitation?: string
    }>
    roleStructure?: Array<{
      role: string
      candidates?: string[]
      status?: string
      question?: string
    }>
    caution?: string
  }
  productFeasibility: {
    overallStatus?: string
    overallAssessment?: {
      conclusion?: string
      strengths?: string[]
      improvements?: string[]
      entryConditions?: string[]
    }
    items?: Array<{
      id: string
      criterion: string
      status: string
      displayStatus?: string
      judgment?: string
      evidenceIds?: string[]
      additionalChecks?: string[]
    }>
    interpretation?: string
    assessment?: {
      overallStatus: string
      overallSummary: string
      overallReason: string
      topStrengths: string[]
      topRisks: string[]
      priorityActions: string[]
      aiProductJudgment?: keyof typeof AI_PRODUCT_JUDGMENT_LABELS
      aiProductJudgmentReason?: string
      reviewerProductJudgment?: keyof typeof REVIEWER_PRODUCT_JUDGMENT_LABELS
      criteria: CommercializationCriterion[]
      discoveryContext?: {
        discoveryType: string
        sourceName: string
        sourceSummary: string
        marketImpactSummary?: string
        detailUrl?: string
      }
      externalConstraints?: Array<{
        id: string
        title: string
        summary: string
        severity: string
        confirmed: boolean
        requiresLegalReview: boolean
        nextAction: string
      }>
      reviewedAt?: string | null
      inputChangedAt?: string | null
      reviewerMemo?: string
    }
  }
  productProposal: {
    status?: string
    workingName?: string
    recommendedForm?: string
    alternativeForms?: string[]
    expectedPolicyholder?: string[]
    expectedInsured?: string
    coveredObject?: string
    coveredEvent?: string
    coveredLoss?: string
    existingInsuranceRelationship?: string
    settlementDirection?: string
    policyPeriodDirection?: string
    coverageLimitDirection?: string
    deductibleDirection?: string
    underwritingCandidates?: string[]
    outOfScopeCandidates?: string[]
    recommendationReason?: string
    unresolvedItems?: string[]
  }
  wordingFeasibility: {
    status?: string
    label?: string
    disclaimer?: string
    possibleReasons?: string[]
    improvementReasons?: string[]
    assessmentCriteria?: Array<{
      id: string
      question: string
      status?: string
      note?: string
      reference?: string
      sourceName?: string
      assumption?: string
    }>
    structureOptions?: Array<{
      id: string
      name: string
      selected?: boolean
      description?: string
      strength?: string

      limitation?: string
    }>
    selectedDraftType?: string
    coverageDraft?: string
    alternativeLiabilityDraft?: string
    definitions?: Array<{
      term: string
      draftDefinition?: string
      status?: string
    }>
    paymentConditions?: Array<{
      id: string
      text: string
      verification?: string
    }>
    exclusionCandidates?: Array<{
      id: string
      text: string
      reason?: string
      status?: string
    }>
    ambiguities?: Array<{
      id: string
      issue: string
      question?: string
      owner?: string
    }>
    referenceDocuments?: Array<{
      id: string
      name: string
      role?: string
      usedFor?: string
      includedInAiInput?: boolean
      badge?: string
    }>
  }
  evidence: EvidenceItem[]
  missingResearch: Array<{
    id: string
    priority?: string
    topic: string
    reason?: string
    responsibleTeam?: string
    status?: string
    acquisitionType?: string
    requiredMaterials?: string[]
  }>
  ui?: ReportResult['ui']
}

type ModalState =
  | { type: 'evidence'; evidence: EvidenceItem }
  | { type: 'document'; document: NonNullable<ReportView['wordingFeasibility']['referenceDocuments']>[number] }
  | { type: 'unsaved'; target: ReportTabId | null; reason: 'editor' | 'review' | 'both' }
  | null

function asReportView(report: ReportResult): ReportView {
  return report as unknown as ReportView
}

function reportLabel(report: ReportView, key: string, fallback: string) {
  const value = report.ui?.labels?.[key]
  return typeof value === 'string' && value.trim() ? value : fallback
}

function displayDate(value?: string | null, includeTime = false) {
  if (!value) return '확인 필요'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.replaceAll('-', '.')
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime
      ? ({ hour: '2-digit', minute: '2-digit' } as const)
      : {}),
  }).format(date)
}

function toneClass(status?: string) {
  if (!status) return 'report-page__badge--neutral'
  if (/양호|긍정|추천|우선|가능|완료|positive/i.test(status)) {
    return 'report-page__badge--success'
  }
  if (/부족|보완|주의|미확보|needs|재검토|불가|critical/i.test(status)) {
    return 'report-page__badge--danger'
  }
  if (/조건|확인|검토|보류|conditional/i.test(status)) {
    return 'report-page__badge--warning'
  }
  return 'report-page__badge--neutral'
}

function localizeStatus(status?: string) {
  const labels: Record<string, string> = {
    positive: '긍정',
    // Legacy overallStatus values are still accepted for persisted reports,
    // but the UI uses the four criterion result states instead of showing
    // the ambiguous "조건부" label.
    conditional: '보완 필요',
    'needs-data': '보완 필요',
    pending: '검토 대기',
    review: '검토 필요',
    draft: '검토 초안',
    available: '확보 가능',
    unavailable: '확보 필요',
    reviewable: '검토 가능',
    needs_more_data: '추가 자료 필요',
    redesign: '상품 구조 재검토',
    not_viable: '현재 상품화 곤란',
  }
  return status ? labels[status.toLowerCase()] ?? status : status
}

function StatusBadge({ children }: { children?: string }) {
  if (!children) return null
  return (
    <span className={`report-page__badge ${toneClass(children)}`}>{localizeStatus(children)}</span>
  )
}

function SectionHeading({
  number,
  eyebrow,
  title,
  aside,
}: {
  number: string
  eyebrow: string
  title: string
  aside?: ReactNode
}) {
  return (
    <div className="report-page__section-heading">
      <div>
        <p className="report-page__section-number">{number}</p>
        <p className="report-page__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {aside}
    </div>
  )
}

function ChipList({ items }: { items?: string[] }) {
  if (!items?.length) return <span className="report-page__muted">추가 확인 필요</span>
  return (
    <ul className="report-page__chip-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function ReportHeader({
  report,
  activeTab,
  pdfMenuOpen,
  onTogglePdfMenu,
  onPrintAll,
  onPrintCurrent,
  onOpenPdfSelection,
  editorMode,
  editorPreview,
  saveState,
  onEdit,
  onSave,
  onCancel,
  onPreview,
  onContinueEdit,
}: {
  report: ReportView
  activeTab: ReportTabId
  pdfMenuOpen: boolean
  onTogglePdfMenu: () => void
  onPrintAll: () => void
  onPrintCurrent: () => void
  onOpenPdfSelection: () => void
  editorMode: boolean
  editorPreview: boolean
  saveState: 'idle' | 'loading' | 'error'
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onPreview: () => void
  onContinueEdit: () => void
}) {
  const meta = report.meta
  return (
    <section className="report-page__report-header" aria-labelledby="report-title">
      <div className="report-page__report-header-top">
        <div>
          <div className="report-page__badge-row">
            <StatusBadge>{activeTab === 'feasibility' ? '평가 결과' : meta.aiStatus ?? 'AI 생성 초안'}</StatusBadge>
            {(meta.badges ?? []).filter((badge) => badge !== meta.aiStatus && (activeTab !== 'feasibility' || !/AI/i.test(badge))).map((badge) => (
              <span className="report-page__badge report-page__badge--neutral" key={badge}>
                {badge}
              </span>
            ))}
          </div>
          <p className="report-page__eyebrow">INSURANCE PRODUCT REVIEW</p>
          <h1 id="report-title">{meta.title}</h1>
          <ChipList items={meta.riskCategories} />
        </div>
        <div className="report-page__header-actions report-page__no-print">

          {!editorMode && !editorPreview ? (
            <button className="report-page__button" type="button" onClick={onEdit}>
              편집
            </button>
          ) : null}
          {editorMode ? (
            <>
              <button className="report-page__button" type="button" onClick={onCancel}>
                취소
              </button>
              <button className="report-page__button" type="button" onClick={onPreview}>
                미리보기
              </button>
              <button className="report-page__button report-page__button--primary" type="button" onClick={onSave} disabled={saveState === 'loading'}>
                {saveState === 'loading' ? '저장 중…' : '저장'}
              </button>
            </>
          ) : null}
          {editorPreview ? (
            <>
              <span className="report-page__editor-preview-label">저장 전 미리보기</span>
              <button className="report-page__button" type="button" onClick={onContinueEdit}>
                편집 계속
              </button>
              <button className="report-page__button" type="button" onClick={onCancel}>
                변경 취소
              </button>
            </>
          ) : null}
          <ReportPdfMenu
            activeTab={activeTab}
            open={pdfMenuOpen}
            onToggle={onTogglePdfMenu}
            onPrintAll={onPrintAll}
            onPrintCurrent={onPrintCurrent}
            onOpenSelection={onOpenPdfSelection}
          />
          <button
            className="report-page__button report-page__button--primary report-page__legacy-print-button"
            type="button"
            onClick={() => window.print()}
          >
            인쇄/PDF 저장
          </button>
        </div>
      </div>

      <dl className="report-page__meta-grid">
        <div><dt>위험 ID</dt><dd>{meta.sourceRiskId}</dd></div>
        <div><dt>분석 기준일</dt><dd>{displayDate(meta.analysisBaseDate)}</dd></div>
        <div><dt>생성일시</dt><dd>{displayDate(meta.generatedAt, true)}</dd></div>
        <div><dt>근거자료</dt><dd>{meta.evidenceCount ?? report.evidence.length}건</dd></div>
      </dl>
      {meta.disclaimer ? <p className="report-page__disclaimer">{activeTab === 'feasibility' ? neutralizeCommercializationText(meta.disclaimer) : meta.disclaimer}</p> : null}
    </section>
  )
}

function AiSummarySection({ report, onNavigateTab }: { report: ReportView; onNavigateTab?: (id: ReportTabId) => void }) {
  const copy = PRODUCT_REVIEW_SUMMARY_COPY
  const criteria = report.productFeasibility.assessment?.criteria ?? []
  const mandatoryCriteria = criteria.filter((criterion) => criterion.gateGroup === 'insurance_gate')
  const insuranceTotal = mandatoryCriteria.length || copy.criteria.groups[0].criterionIds.length
  const insuranceSatisfied = mandatoryCriteria.length
    ? mandatoryCriteria.filter((criterion) => aiDecisionOf(criterion) === 'fulfilled').length
    : insuranceTotal
  const coverageRows = report.riskGapSummary.existingCoverageMap ?? []
  const overlappingRows = coverageRows.filter((row) => /자동차보험|자기차량손해|화재보험|재산종합보험/u.test(row.coverageName))
  const overlappingInsuranceCount = overlappingRows.length || copy.coreJudgments.existingInsurance.comparison.filter((item) => item.sourceId).length
  const coverageGapCount = report.riskGapSummary.keyCoverageGaps?.length ?? 0
  const financialEstimate = createFinancialEstimate({
    analyzedAt: report.meta.analysisBaseDate ?? report.meta.sourceAsOf ?? report.meta.generatedAt,
    evidenceIds: report.evidence.slice(0, 6).map((item) => item.id),
  })
  const navigate = (tab: ReportTabId) => onNavigateTab?.(tab)
  const marketGrade = financialEstimate.marketGrade
  const marketScore = financialEstimate.marketScore
  const evaluationCriteriaNames = criteria.length
    ? criteria.map((criterion) => criterion.title)
    : copy.criteria.groups.flatMap((group) => group.itemLabels)
  const evaluationTotal = evaluationCriteriaNames.length
  const coreJudgmentCards = [
    { id: 'marketability', label: '보장 공백·시장성', title: copy.coreJudgments.marketability.result, metric: `시장성 ${marketScore}점 · ${marketGrade}등급`, description: copy.coreJudgments.marketability.description, footer: '잠재 수요 및 보장 공백 분석', tab: 'coverage-gap' as ReportTabId },
    { id: 'insurability', label: '보험성', title: copy.coreJudgments.insurability.result, metric: `필수 기준 ${insuranceSatisfied}/${insuranceTotal} 충족`, description: copy.coreJudgments.insurability.description, footer: '보험 성립 필수 요건 집계', tab: 'feasibility' as ReportTabId },
    { id: 'existing-insurance', label: '기존 보험 관계', title: copy.coreJudgments.existingInsurance.result, metric: `중복 가능 보험 ${overlappingInsuranceCount}종 · 주요 보장 공백 ${coverageGapCount}건`, description: copy.coreJudgments.existingInsurance.description, footer: '기존 보험 적용 후 차이 분석', tab: 'coverage-gap' as ReportTabId },
  ] as const
  const evaluationStatuses = [
    { id: 'pass', label: '충족', count: evaluationTotal, tone: 'pass', names: evaluationCriteriaNames },
    { id: 'critical', label: '불충족', count: 0, tone: 'critical', names: [] as string[] },
  ] as const
  const evaluationHeadline = `충족 ${evaluationTotal}개 · 불충족 0개`
  const opinionCards = [
    {
      id: 'coverage-gap',
      title: copy.reviewOpinions[0].title,
      items: [
        ...copy.coreJudgments.existingInsurance.comparison.filter((item) => item.sourceId).slice(0, 2).map((item) => `${item.label} · ${item.result}`),
        ...copy.coreJudgments.coverageGap.gaps.slice(0, 1),
      ],
    },
    {
      id: 'productization',
      title: copy.reviewOpinions[1].title,
      items: [copy.coreJudgments.insurability.result, copy.coreJudgments.coverageGap.differentiation, copy.recommendation.title],
    },
    {
      id: 'verification',
      title: copy.reviewOpinions[2].title,
      items: copy.nextTasks.slice(0, 3).map((task) => task.title),
    },
  ] as const

  return (
    <section className="report-page__section report-page__ai-summary-section report-page__ai-summary-section--compact" aria-labelledby="ai-summary-title">
      <SectionHeading number="01" eyebrow="INITIAL REVIEW SUMMARY" title="상품화 검토 요약" aside={<span className="report-page__ai-draft-badge">AI 분석 초안</span>} />

      <section className="report-page__ai-summary-conclusion report-page__ai-summary-conclusion--recommendation" aria-labelledby="ai-summary-title">
        <div className="report-page__ai-summary-conclusion-heading"><p className="report-page__eyebrow">{copy.recommendation.eyebrow}</p></div>
        <h3 id="ai-summary-title">{copy.recommendation.title}</h3>
        <strong className="report-page__ai-summary-action-title">{copy.recommendation.actionTitle}</strong>
        <p>{copy.recommendation.description}</p>
      </section>

      <section className="report-page__ai-summary-block report-page__ai-summary-judgment-cards" aria-labelledby="ai-summary-judgment-title">
        <div className="report-page__ai-summary-block-heading"><div><p className="report-page__eyebrow">CORE JUDGMENTS</p><h3 id="ai-summary-judgment-title">핵심 판단 근거</h3></div><span>검토 가치 판단에 필요한 세 가지 결과</span></div>
        <div className="report-page__ai-summary-core-grid report-page__ai-summary-core-grid--three">
          {coreJudgmentCards.map((card) => <article className={`report-page__ai-summary-core-card report-page__ai-summary-core-card--${card.id}`} key={card.id}>
            <span className="report-page__ai-summary-card-label">{card.label}</span>
            <h4 className="report-page__ai-summary-decision-title">{card.title}</h4>
            <strong className="report-page__ai-summary-metric-value">{card.metric}</strong>
            <p className="report-page__ai-summary-card-result">{card.description}</p>
            <small className="report-page__ai-summary-inline-result">{card.footer}</small>
            <button className="report-page__ai-summary-link report-page__no-print" type="button" onClick={() => navigate(card.tab)}>상세 보기 <span aria-hidden="true">→</span></button>
          </article>)}
        </div>
      </section>

      <section className="report-page__ai-summary-block report-page__ai-summary-evaluation-status" aria-labelledby="ai-summary-evaluation-title">
        <div className="report-page__ai-summary-block-heading"><div><p className="report-page__eyebrow">EVALUATION STATUS</p><h3 id="ai-summary-evaluation-title">상품화 평가 현황</h3></div><span>현재 평가 데이터 기준</span></div>
        <div className="report-page__ai-summary-evaluation-summary"><strong>{evaluationTotal}개 기준 중 {evaluationTotal}개 충족</strong><span>{evaluationHeadline}</span></div>
        <div className="report-page__ai-summary-evaluation-list">{evaluationStatuses.map((status) => <div className={`report-page__ai-summary-evaluation-row report-page__ai-summary-evaluation-row--${status.tone}`} key={status.id}>
          <div><span>{status.label}</span><strong>{status.count}개</strong></div><p>{status.names.length ? status.names.join(' · ') : '해당 기준 없음'}</p>
        </div>)}</div>
      </section>

      <section className="report-page__ai-summary-block report-page__ai-summary-opinions report-page__ai-summary-secondary" aria-labelledby="ai-summary-opinions-title">
        <div className="report-page__ai-summary-block-heading"><div><p className="report-page__eyebrow">REVIEW OPINIONS</p><h3 id="ai-summary-opinions-title">핵심 검토 의견</h3></div><span>상세 판단은 상품화 종합평가에서 확인</span></div>
        <div className="report-page__ai-summary-opinion-grid">{opinionCards.map((item) => <article className="report-page__ai-summary-opinion-card" key={item.id}><h4>{item.title}</h4><ul>{item.items.map((point) => <li key={point}><span aria-hidden="true">•</span>{point}</li>)}</ul></article>)}</div>
        <button className="report-page__ai-summary-link report-page__no-print" type="button" onClick={() => navigate('feasibility')}>상세 판단 근거 보기 <span aria-hidden="true">→</span></button>
      </section>

      <section className="report-page__ai-summary-block report-page__ai-summary-tasks report-page__ai-summary-secondary" aria-labelledby="ai-summary-tasks-title">
        <div className="report-page__ai-summary-block-heading"><div><p className="report-page__eyebrow">NEXT REVIEW TASKS</p><h3 id="ai-summary-tasks-title">다음 검토 과제</h3></div></div>
        <div className="report-page__ai-summary-task-grid">{copy.nextTasks.map((task, index) => <article key={task.id}><span className="report-page__ai-summary-task-number">{String(index + 1).padStart(2, '0')}</span><h4>{task.title}</h4><p>{task.action}</p></article>)}</div>
      </section>
    </section>
  )
}

function getCoverageDamageLabel(
  item: NonNullable<ReportView['riskGapSummary']['existingCoverageMap']>[number],
  data: ReportView['riskGapSummary'],
  index: number,
) {
  if (item.damage?.trim() && !/^발생 손해\s*\d+$/.test(item.damage.trim())) return item.damage
  const coverageName = item.coverageName
  const damageTypes = data.damageTypes ?? []
  const damageName = (id: string, fallback: string) => damageTypes.find((damage) => damage.id === id)?.name ?? fallback

  if (item.id === 'COV-03' || /건물 화재보험|재산종합보험/.test(coverageName)) {
    return '건물·주차장 시설의 직접 화재손해'
  }
  if (item.id === 'COV-05' || /시설소유·관리자/.test(coverageName)) {
    return '시설 관리상 과실로 인한 제3자 손해'
  }
  if (/자기차량손해/.test(coverageName)) return '피해 차량 자체 손해'
  if (/생산물배상책임/.test(coverageName)) return '발화 차량·배터리 결함으로 인한 제3자 손해'
  if (/자동차보험.*대물배상/.test(coverageName)) return damageName('DMG-01', '인접 차량 재산손해')
  return damageTypes[index]?.name ?? '적용 대상 확인 필요'
}

type CoverageGapBullet = {
  prefix: string
  emphasis?: string
  suffix?: string
}

const COVERAGE_GAP_BULLETS: Record<string, readonly CoverageGapBullet[]> = {
  'COV-01': [
    { prefix: '', emphasis: '법률상 배상책임', suffix: '이 인정되지 않으면 보상 어려움' },
    { prefix: '', emphasis: '대물배상 한도 초과', suffix: ' 손해 미보장' },
  ],
  'COV-02': [
    { prefix: '', emphasis: '자차 미가입', suffix: ' 차량의 손해 미보장' },
    { prefix: '', emphasis: '자기부담금·면책조건', suffix: '에 따른 차량 소유자 부담 발생' },
  ],
  'COV-03': [
    { prefix: '', emphasis: '보험 목적에 포함되지 않은', suffix: ' 충전설비 미보장' },
    { prefix: '', emphasis: '보험가입금액·보상한도 초과', suffix: ' 손해 미보장' },
  ],
  'COV-04': [
    { prefix: '배터리 결함과 ', emphasis: '제조사 책임 확정 전', suffix: ' 보상 지연' },
    { prefix: '', emphasis: '제조사 책임이 인정되지 않으면', suffix: ' 보험 적용 어려움' },
  ],
  'COV-05': [
    { prefix: '', emphasis: '관리상 과실이 인정되지 않으면', suffix: ' 배상책임보험 적용 어려움' },
    { prefix: '', emphasis: '화재 확산과 관리 과실의 인과관계가 입증되지 않으면', suffix: ' 보상 어려움' },
  ],
}

function getCoverageGapBullets(item: NonNullable<ReportView['riskGapSummary']['existingCoverageMap']>[number]) {
  return COVERAGE_GAP_BULLETS[item.id] ?? (item.remainingGap ? [{ prefix: item.remainingGap }] : [])
}


function CoverageGapEvidenceContent({
  coverageRows,
  data,
  sourceGaps,
}: {
  coverageRows: NonNullable<ReportView['riskGapSummary']['existingCoverageMap']>
  data: ReportView['riskGapSummary']
  sourceGaps: NonNullable<ReportView['riskGapSummary']['keyCoverageGaps']>
}) {
  return (
    <div className="report-page__coverage-gap-evidence-content">
      <div className="report-page__coverage-gap-evidence-grid">
        <article><h4>AI 판단 근거</h4><ul>{coverageRows.map((item, index) => <li key={item.id}><strong>{getCoverageDamageLabel(item, data, index)}</strong><span>{item.coverageName}의 부분 적용 가능성 및 조건부 공백</span></li>)}</ul></article>
        <article><h4>적용 가정</h4><ul>{COVERAGE_GAP_ASSUMPTIONS.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul></article>
        <article><h4>신뢰도와 한계</h4><p><strong>신뢰도 · 보통</strong></p><p>{COVERAGE_GAP_LIMITATION}</p><p>보정 대상 · 공백의 범위, 손해 유형별 중요도, 지급절차와 한도 공백의 우선순위</p></article>
      </div>
      <p className="report-page__coverage-gap-source-count">기존 mock 핵심 공백 원자료 {sourceGaps.length}건과 현재 비교표 {coverageRows.length}건을 연결해 표시했습니다.</p>
    </div>
  )
}

function RiskGapSection({ report, onNavigateTab, printMode = false }: { report: ReportView; onNavigateTab?: (id: ReportTabId) => void; printMode?: boolean }) {
  const data = report.riskGapSummary
  const coverageRows = data.existingCoverageMap ?? []
  const sourceGaps = data.keyCoverageGaps ?? []
  const damageCount = coverageRows.length || data.damageTypes?.length || 0
  const partialCoverageCount = coverageRows.filter((item) => Boolean(item.possibleCoverage?.trim())).length
  const gapCount = coverageRows.filter((item) => getCoverageGapBullets(item).length > 0).length
  void onNavigateTab
  void printMode

  const resultCardCopy = {
    'gap-status': {
      title: '보장 공백',
      conclusion: '보장 공백 확인됨',
      bullets: ['기존 보험은 일부 손해만 보장', '책임·가입·보상한도 조건에서 직접손해 공백 발생'],
    },
    'gap-significance': {
      title: '상품개발 검토 가치',
      conclusion: '검토 가치 있음',
      bullets: ['다수 차량과 시설에 동시 손해 발생 가능', '기존 보험만으로 보완하기 어려운 직접손해 존재'],
    },
    'next-evaluation': {
      title: '다음 검토 단계',
      conclusion: '상품화 종합평가 진행',
      bullets: ['시장성·우연성·도덕적 해이·최대가능손해 평가', '평가 결과를 바탕으로 상품개발 진행 여부 검토'],
    },
  } as const

  const productInputCopy = [
    { title: '기존 보험금 차감 기준', description: '기존 보험에서 지급된 금액을 제외한 직접손해만 보장합니다.' },
    { title: '책임 확정 전 지급 여부', description: '책임 조사 중에도 보험금을 지급할지, 지급 조건과 한도를 정해야 합니다.' },
    { title: '사고당 보상한도', description: '다수 차량과 시설에 발생한 동시 손해를 하나의 사고 한도에 반영합니다.' },
    { title: '하나의 사고 범위', description: '동일 화재로 발생한 차량·시설 손해를 하나의 사고로 볼 기준을 정합니다.' },
    { title: '보장할 손해 범위', description: '직접손해, 자차 미가입 차량, 시설 손해의 포함 범위를 정합니다.' },
    { title: '보상 제외 기준', description: '고의 사고와 이미 다른 보험에서 보상받은 손해는 지급 대상에서 제외합니다.' },
  ] as const

  return (
    <section className="report-page__section report-page__coverage-gap-section" aria-label="기존 보험의 보장 범위와 공백">
      <SectionHeading number="04" eyebrow="RISK & COVERAGE GAP" title="기존 보험의 보장 범위와 공백" />

      <section className="report-page__coverage-gap-results" aria-labelledby="coverage-gap-results-title">
        <div className="report-page__coverage-gap-section-heading"><div><p className="report-page__eyebrow">COVERAGE GAP SUMMARY</p><h3 id="coverage-gap-results-title">보장 공백 분석 요약</h3></div></div>
        <div className="report-page__coverage-gap-judgment-copy"><p>기존 보험 적용 후에도 <strong>직접손해 보장 공백이 확인되었습니다.</strong></p><p>보장 공백이 확인되어 상품개발 검토 가치가 있으며, 다음 단계에서 시장성·우연성·도덕적 해이·최대가능손해를 종합적으로 평가합니다.</p></div>
        <div className="report-page__coverage-gap-result-grid">{COVERAGE_GAP_RESULT_CARDS.map((card) => { const copy = resultCardCopy[card.id]; return <article className={`report-page__coverage-gap-result-card report-page__coverage-gap-result-card--${card.tone}`} key={card.id}><div className="report-page__coverage-gap-result-head"><h4>{copy.title}</h4></div><p className="report-page__coverage-gap-result-conclusion">{copy.conclusion}</p><ul>{copy.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></article> })}</div>
        <p className="report-page__coverage-gap-meta-line">프로토타입 mock 분석 <span>·</span> 신뢰도 보통 <span>·</span> 손해 유형 {damageCount}개 분석</p>
      </section>

      <section className="report-page__coverage-gap-premise" aria-labelledby="coverage-gap-premise-title"><div className="report-page__coverage-gap-scope"><div className="report-page__coverage-gap-section-heading"><div><p className="report-page__eyebrow">ANALYSIS SCOPE</p><h3 id="coverage-gap-premise-title">분석 범위</h3></div></div><p>{COVERAGE_GAP_ANALYSIS_PREMISE}</p></div></section>

      <section className="report-page__coverage-gap-comparison" aria-labelledby="coverage-gap-comparison-title">
        <div className="report-page__coverage-gap-section-heading"><div><p className="report-page__eyebrow">COMPARISON EVIDENCE</p><h3 id="coverage-gap-comparison-title">기존 보험의 보장 범위와 공백 비교표</h3></div></div>
        <p className="report-page__coverage-gap-summary-line"><span>{damageCount}개 손해 유형 분석</span><span>· 기존 보험 부분 적용 {partialCoverageCount}건</span><strong>· 보장 공백 {gapCount}건</strong><span>· 주요 공백 유형 {COVERAGE_GAP_CATEGORY_SUMMARY.length}종</span></p>
        <div className="report-page__table-wrap"><table className="report-page__gap-table"><thead><tr><th><span aria-hidden="true">①</span> 발생 가능한 손해</th><th><span aria-hidden="true">②</span> 기존 보험의 보장 가능 범위</th><th><span aria-hidden="true">③</span> 보장 공백</th></tr></thead><tbody>{coverageRows.map((item, index) => <tr key={item.id}><td><strong>{getCoverageDamageLabel(item, data, index)}</strong></td><td><strong>{item.coverageName}</strong><p>{item.possibleCoverage}</p></td><td className="report-page__gap-cell"><ul className="report-page__gap-bullets">{getCoverageGapBullets(item).map((bullet) => <li key={`${bullet.prefix}-${bullet.emphasis ?? ''}`}>{bullet.prefix}{bullet.emphasis ? <strong>{bullet.emphasis}</strong> : null}{bullet.suffix ?? ''}</li>)}</ul></td></tr>)}</tbody></table></div>
      </section>

      <section className="report-page__coverage-gap-inputs" aria-labelledby="coverage-gap-inputs-title"><div className="report-page__coverage-gap-section-heading"><div><p className="report-page__eyebrow">PRODUCT DEVELOPMENT INPUTS</p><h3 id="coverage-gap-inputs-title">상품개발 시 정해야 할 사항</h3><p>보장 공백을 실제 상품에 반영하기 위해 아래 기준을 먼저 정해야 합니다.</p></div></div><ul>{COVERAGE_GAP_PRODUCT_INPUTS.slice(0, 6).map((input, index) => { const copy = productInputCopy[index] ?? { title: input.condition, description: input.reason }; return <li key={input.id}><span className="report-page__coverage-gap-input-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><div className="report-page__coverage-gap-input-title"><strong>{copy.title}</strong></div><p>{copy.description}</p></div></li> })}</ul></section>

      <section className="report-page__coverage-gap-evidence-print-only" aria-labelledby="coverage-gap-evidence-print-title"><div className="report-page__coverage-gap-section-heading"><div><p className="report-page__eyebrow">REASONING & ASSUMPTIONS</p><h3 id="coverage-gap-evidence-print-title">분석 근거 및 적용 가정</h3></div></div><CoverageGapEvidenceContent coverageRows={coverageRows} data={data} sourceGaps={sourceGaps} /></section>
    </section>
  )
}

type FeasibilityDisplayGroup = {
  id: string
  eyebrow: string
  title: string
  description: string
  scope?: string
  criterionIds: string[]
}

/** 화면용 그룹입니다. 원본 criterion.gateGroup과 데이터 계약은 변경하지 않습니다. */
const FEASIBILITY_DISPLAY_GROUPS: FeasibilityDisplayGroup[] = [
  {
    id: 'insurance-gate',
    eyebrow: '필수 기준',
    title: '보험성 필수 기준',
    description: '보험상품으로 성립하기 위해 반드시 충족해야 하는 기준입니다.',
    criterionIds: COMMERCIALIZATION_GATE_GROUPS.insurance_gate.slice(),
  },
  {
    id: 'core-judgment',
    eyebrow: '핵심 판단',
    title: '상품화 핵심 판단 기준',
    description: '상품화 검토를 계속할 가치와 주요 위험을 판단하는 핵심 기준입니다.',
    criterionIds: COMMERCIALIZATION_GATE_GROUPS.productization_gate.slice(),
  },
  {
    id: 'development-readiness',
    eyebrow: '설계·실행 보완',
    title: '설계·실행 보완 기준',
    description: '상품화 가능성이 확인된 뒤 실제 개발과 운영을 위해 추가로 검토하는 기준입니다.',
    criterionIds: COMMERCIALIZATION_GATE_GROUPS.supplementary_execution.slice(),
  },
]

const FEASIBILITY_QUESTION_TITLES: Record<string, string> = {
  insurable_interest: '누가 어떤 손해를 보장받는가?',
  fortuity: '고의로 만들기 어려운 사고인가?',
  gambling_like_structure: '실제 발생한 손해만 보상하는 구조인가?',
  moral_hazard_control: '고의·보험사기 위험을 통제할 수 있는가?',
  coverage_gap: '기존 보험과 겹치지 않고 실제 보장 공백이 있는가?',
  actual_market_demand: '실제로 가입할 기업과 계약 수요가 있는가?',
  pml_accumulation: '사고 한 번의 최대 손해를 감당할 수 있는가?',
  liability_clarity: '사고 책임주체를 구분할 수 있는가?',
  loss_verifiability: '사고 여부와 손해액을 객관적으로 확인할 수 있는가?',
  risk_pooling: '위험을 여러 계약으로 분산할 수 있는가?',
  wording_clarity: '보장·비보장 범위를 약관으로 명확히 쓸 수 있는가?',
  pricing_data_readiness: '보험료 산출에 필요한 데이터가 충분한가?',
}

const FEASIBILITY_CRITERION_DISPLAY: Record<string, { title: string; description: string; facts?: readonly { tone: 'confirmed' | 'missing'; text: string }[] }> = {
  insurable_interest: { title: '피보험이익', description: '보장 대상과 실제 경제적 손해의 관계를 확인할 수 있습니다.' },
  fortuity: { title: '우연성', description: '화재 발생 여부와 시점을 사전에 확정하기 어려워 우연한 사고로 볼 수 있습니다.' },
  gambling_like_structure: { title: '사행성 배제·실손보상 원칙', description: '실제 발생한 직접 재산손해 범위에서 보상하고, 중복 보상액을 조정할 수 있습니다.' },
  moral_hazard_control: { title: '고의·도덕적 해이 통제', description: '고의사고와 보험사기 위험을 확인하고 통제할 수 있는지 검토합니다.' },
  coverage_gap: { title: '보장 공백·중복 여부', description: '기존 보험과 겹치는 보장과 새롭게 보완할 보장 공백을 확인합니다.' },
  actual_market_demand: { title: '실제 시장 수요', description: '실제로 가입할 기업과 계약 수요가 있는지 확인합니다.' },
  pml_accumulation: { title: '최대가능손해(PML)', description: '사고 한 번에 발생할 수 있는 최대 손해와 누적 위험을 검토합니다.' },
  liability_clarity: { title: '책임주체 명확성', description: '차량 소유자, 제조사, 충전시설과 시설관리자의 책임을 구분할 수 있는지 검토합니다.' },
  loss_verifiability: { title: '손해 확인·산정 가능성', description: '사고 발생 여부와 손해액을 객관적인 자료로 확인할 수 있는지 검토합니다.' },
  risk_pooling: { title: '위험 분산 가능성', description: '특정 지역이나 시설에 손해가 집중되지 않도록 위험을 분산할 수 있는지 검토합니다.' },
  wording_clarity: { title: '약관·보장조건 명확성', description: '보장하는 손해, 보장하지 않는 손해와 보험금 지급요건을 명확히 정할 수 있는지 검토합니다.' },
  pricing_data_readiness: {
    title: '위험 데이터 확보 가능성',
    description: '위험을 지속적으로 확인할 수 있는 자료가 있고, 사고 빈도와 손해액을 추정할 데이터를 확보할 수 있는지 검토합니다.',
    facts: [
      { tone: 'confirmed', text: '상품·약관 자료 확인 가능' },
      { tone: 'confirmed', text: '공개 사고자료와 시장 통계 접근 가능' },
      { tone: 'missing', text: '사고별 실제 손해액 자료 부족' },
      { tone: 'missing', text: '내부 계약·보험금·보험료 데이터 미확보' },
    ],
  },
}

type FeasibilityQuickFilter = 'all' | 'pending' | 'completed' | 'modified'
type FeasibilityGroupFilter = 'all' | FeasibilityDisplayGroup['id']
type FeasibilityAiFilter = 'all' | CommercializationAiDecision
type FeasibilitySort = 'default' | 'pending-first' | 'recent'

type FeasibilityCriterionDisplay = (typeof FEASIBILITY_CRITERION_DISPLAY)[string]

const feasibilityQuestionTitle = (criterion: CommercializationCriterion): string => FEASIBILITY_QUESTION_TITLES[criterion.id] ?? criterion.question
const feasibilityCriterionDisplay = (criterion: CommercializationCriterion): FeasibilityCriterionDisplay => FEASIBILITY_CRITERION_DISPLAY[criterion.id] ?? {
  title: feasibilityQuestionTitle(criterion),
  description: compactCriterionText(criterionSummary(criterion), 140),
}

const formatKrwCompact = (value: number): string => {
  if (value >= 100_000_000) {
    const billions = value / 100_000_000
    return `${Number.isInteger(billions) ? billions.toLocaleString('ko-KR') : billions.toFixed(1).replace(/\.0$/u, '')}억 원`
  }
  if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString('ko-KR')}만 원`
  return `₩${Math.round(value).toLocaleString('ko-KR')}`
}

type FeasibilityMetricBulletTone = 'confirmed' | 'follow-up' | 'additional-check'

type FeasibilityMetricDetail = {
  label: string
  value?: string
  items?: string[]
}

type FeasibilityMetricDisplay = {
  id: 'market' | 'tam' | 'frequency' | 'pml'
  title: string
  value: string
  subvalue: string
  items: Array<{ tone: FeasibilityMetricBulletTone; text: string }>
  details: FeasibilityMetricDetail[]
  scenarios?: Array<{ label: string; calculation: string; result: string }>
  printNote: string
}

/** 상품화 종합평가 화면 전용 정량지표입니다. 원본 평가 기준·데이터 계약은 변경하지 않습니다. */
const FEASIBILITY_METRIC_DISPLAY: FeasibilityMetricDisplay[] = [
  {
    id: 'market',
    title: '시장성',
    value: `${PRODUCT_FINANCIAL_ESTIMATE.marketGrade} · ${PRODUCT_FINANCIAL_ESTIMATE.marketScore}점`,
    subvalue: 'A 등급 기준 · 75~89점',
    items: [
      { tone: 'confirmed', text: '전기차·충전시설 시장 확대' },
      { tone: 'confirmed', text: '관련 보험 수요와 제도적 필요성 증가' },
      { tone: 'confirmed', text: '동일 위험의 실제 상품화 사례 확인' },
      { tone: 'follow-up', text: '실제 가입 의향과 계약 규모 확인 필요' },
    ],
    details: [
      { label: '배점 구성', items: ['시장 성장성 23/25', '보험 수요·제도 변화 24/25', '실제 상품화 검증 22/25', '구매 접근성·실수요 확인 15/25'] },
      { label: '합계', items: ['84/100', 'S 90~100', 'A 75~89', 'B 60~74', 'C 60 미만'] },
      { label: '점수 산정 이유', value: '시장 확대와 유사 상품 사례는 확인했으나, 실제 가입 의향과 계약 규모는 내부 수요조사 전 단계입니다.' },
      { label: '사용 자료', items: ['공개 전기차·충전시설 시장자료', '유사 보험상품 및 약관자료'] },
      { label: '추가 확인 자료', items: ['실제 가입 의향', '예상 계약 규모', '영업 채널별 수요조사 결과'] },
    ],
    printNote: '배점 23/25·24/25·22/25·15/25 = 84/100',
  },
  {
    id: 'tam',
    title: '총도달가능시장(TAM)',
    value: `연 ${PRODUCT_FINANCIAL_ESTIMATE.tamRange.min}억~${PRODUCT_FINANCIAL_ESTIMATE.tamRange.max}억 원`,
    subvalue: `기준 시나리오 · 약 ${PRODUCT_FINANCIAL_ESTIMATE.tamRange.base}억 원/년`,
    items: [
      { tone: 'confirmed', text: '의무관리대상 공동주택 중심 산정' },
      { tone: 'confirmed', text: '시설 단위 연간 계약 가정' },
      { tone: 'follow-up', text: '상업·공공·산업시설 제외' },
      { tone: 'follow-up', text: '실제 판매 대상과 보험료율 확인 필요' },
    ],
    details: [
      { label: '산정식', value: '대상 시설 수 × 시설당 예상 연보험료' },
      { label: '대상 시설', value: '의무관리대상 공동주택 17,189개' },
      { label: '계약 단위', value: '시설당 연간 계약' },
      { label: '보험료 가정', items: ['보수적 38만 원', '기준 70만 원', '확장 111만 원'] },
      { label: '제외 범위', items: ['상업시설', '공공시설', '산업시설'] },
      { label: '추가 확인 자료', items: ['실제 판매 대상', '실제 계약 단위', '적용 보험료율'] },
    ],
    scenarios: [
      { label: '보수적', calculation: '17,189 × 38만 원', result: `약 ${PRODUCT_FINANCIAL_ESTIMATE.tamRange.min}억 원` },
      { label: '기준', calculation: '17,189 × 70만 원', result: `약 ${PRODUCT_FINANCIAL_ESTIMATE.tamRange.base}억 원` },
      { label: '확장', calculation: '17,189 × 111만 원', result: `약 ${PRODUCT_FINANCIAL_ESTIMATE.tamRange.max}억 원` },
    ],
    printNote: `17,189개 × 시설당 연 38만~111만 원 · 기준 70만 원 = 연 ${PRODUCT_FINANCIAL_ESTIMATE.tamRange.min}억~${PRODUCT_FINANCIAL_ESTIMATE.tamRange.max}억 원`,
  },
  {
    id: 'frequency',
    title: '위험 발생 빈도',
    value: '시설당 연 0.08~0.12%',
    subvalue: '기준 추정 · 약 0.10%/년',
    items: [
      { tone: 'confirmed', text: '공개 전기차 화재 통계 적용' },
      { tone: 'confirmed', text: '주차장 화재 비중 반영' },
      { tone: 'confirmed', text: '시설별 전기차 노출 규모 반영' },
      { tone: 'follow-up', text: '충전 여부와 주차 구조에 따라 변동' },
    ],
    details: [
      { label: '차량당 화재 발생률', value: '약 0.0107%/년' },
      { label: '주차장 발생 비중', value: '약 38%' },
      { label: '시설당 전기차 노출', items: ['20~30대', '기준 25대'] },
      { label: '산식', value: '차량당 화재 발생률 × 주차장 발생 비중 × 시설당 전기차 노출대수' },
      { label: '해석', value: '동일 조건 시설 1,000개 기준 연간 약 0.8~1.2건 예상' },
      { label: '추가 확인 자료', items: ['시설별 실제 사고 이력', '충전 중·비충전 중 사고 구분', '주차장 구조와 방재설비 수준'] },
    ],
    scenarios: [
      { label: '낮음', calculation: '0.0107% × 38% × 20대', result: '0.08%' },
      { label: '기준', calculation: '0.0107% × 38% × 25대', result: '0.10%' },
      { label: '높음', calculation: '0.0107% × 38% × 30대', result: '0.12%' },
    ],
    printNote: '0.0107% × 38% × 20~30대 = 시설당 연 0.08~0.12% · 프로토타입 시나리오 추정',
  },
  {
    id: 'pml',
    title: '최대가능손해(PML)',
    value: `기준 ${formatKrwCompact(FEASIBILITY_PML_DATA.scenarios.find((scenario) => scenario.id === FEASIBILITY_PML_DATA.baseScenario)?.result ?? 0)}`,
    subvalue: `추정 범위 · ${formatKrwCompact(FEASIBILITY_PML_DATA.range.low)}~${formatKrwCompact(FEASIBILITY_PML_DATA.range.high)}`,
    items: [
      { tone: 'confirmed', text: '다수 차량의 동시 피해 반영' },
      { tone: 'confirmed', text: '시설 복구·긴급대응 비용 포함' },
      { tone: 'follow-up', text: '실제 확정 손해액이 아닌 시나리오 추정' },
      { tone: 'follow-up', text: '차량가액과 시설 구조에 따라 변동' },
    ],
    details: [
      { label: '피해 규모 기준', items: [`전소 차량 ${FEASIBILITY_PML_DATA.damageBasis.totalLossVehicles}대`, `부분·그을림 피해 차량 ${FEASIBILITY_PML_DATA.damageBasis.partialDamageVehicles}대`, ...FEASIBILITY_PML_DATA.damageBasis.categories] },
      { label: '산정식', value: 'PML = 전소 차량 손해 + 부분 피해 차량 손해 + 시설·긴급대응 비용' },
      { label: '산정 기준', items: [...FEASIBILITY_PML_DATA.references] },
      { label: '추가 확인 자료', items: ['실제 차량가액 분포', '시설 복구비', '긴급대응비용', '보상한도와 재보험 조건'] },
    ],
    scenarios: FEASIBILITY_PML_DATA.scenarios.map((scenario) => ({ label: scenario.label, calculation: scenario.calculation, result: formatKrwCompact(scenario.result) })),
    printNote: `PML 시나리오 · 보수적 ${formatKrwCompact(FEASIBILITY_PML_DATA.range.low)} / 기준 ${formatKrwCompact(FEASIBILITY_PML_DATA.scenarios.find((scenario) => scenario.id === FEASIBILITY_PML_DATA.baseScenario)?.result ?? 0)} / 확대 ${formatKrwCompact(FEASIBILITY_PML_DATA.range.high)}`,
  },
]

const criterionOwner = (criterion?: CommercializationCriterion): string => {
  const owners = Array.from(new Set((criterion?.nextActions ?? []).filter((action) => !action.completed).map((action) => action.owner).filter(Boolean)))
  return owners.join(' / ') || '담당 부서 결정 필요'
}

const criterionExpectedOutput = (criterion: CommercializationCriterion): string => FEASIBILITY_EXPECTED_OUTPUTS[criterion.id] ?? '검토 결과 및 추가 근거자료 정리본'

const criterionConfidenceLabel = (criterion: CommercializationCriterion): string => ({ high: '높음', medium: '보통', low: '낮음', unknown: '미입력' } as const)[criterion.confidence]

// 기존 실무 검토 필터에서 사용하는 그룹 정의입니다. 실제로 보이는 의사결정 그룹은
// FEASIBILITY_DISPLAY_GROUPS에서 별도로 구성해 원본 데이터 계약을 유지합니다.
const FEASIBILITY_CATEGORIES: Array<[CommercializationCriterionCategory, string]> = [
  ['market', '시장성·수요'],
  ['insurability', '보험성·위험 구조'],
  ['coverage', '보장 범위·위험 구조'],
  ['wording', '약관·규제'],
  ['data', '데이터·운영 준비'],
]

const FEASIBILITY_GATE_GROUPS: Array<[CommercializationGateGroup, string, string]> = [
  ['insurance_gate', '보험성 필수 기준', '보험상품으로 성립하기 위해 반드시 충족해야 하는 기준입니다.'],
  ['productization_gate', '상품화 핵심 판단 기준', '상품화 검토를 계속할 가치와 주요 위험을 판단하는 핵심 기준입니다.'],
  ['supplementary_execution', '설계·실행 보완 기준', '상품화 가능성이 확인된 뒤 실제 개발과 운영을 위해 추가로 검토하는 기준입니다.'],
]

const criteriaInGateOrder = (criteria: CommercializationCriterion[], gateGroup: CommercializationGateGroup): CommercializationCriterion[] => {
  const ids = COMMERCIALIZATION_GATE_GROUPS[gateGroup]
  return criteria
    .filter((criterion) => criterion.gateGroup === gateGroup)
    .sort((left, right) => {
      const leftIndex = ids.indexOf(left.id)
      const rightIndex = ids.indexOf(right.id)
      return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex)
        || left.order - right.order
    })
}

type PrecedingAnalysisLink = {
  key: string
  sourceKeys: string[]
  label: string
  tabId: ReportTabId
  linkLabel: string
}


const PRECEDING_ANALYSIS_LINKS: PrecedingAnalysisLink[] = [
  { key: 'risk-detail', sourceKeys: ['risk-detail'], label: '위험 상세', tabId: 'ai-judgment', linkLabel: '관련 요약 보기' },
  { key: 'coverage-gap', sourceKeys: ['coverage-gap'], label: '보장 공백', tabId: 'coverage-gap', linkLabel: '보장 공백 보기' },
  { key: 'wording', sourceKeys: ['wording'], label: '약관 검토', tabId: 'wording', linkLabel: '약관 검토 보기' },
  { key: 'evidence', sourceKeys: ['evidence'], label: '근거자료', tabId: 'evidence', linkLabel: '근거자료 보기' },
  { key: 'internal_data', sourceKeys: ['internal_data'], label: '실무 입력자료', tabId: 'feasibility', linkLabel: '실무 입력 항목 보기' },
]

const RESULT_STATUS_ORDER: CommercializationCriterionStatus[] = ['critical', 'needs_review', 'additional_check', 'pass']
const RESULT_STATUS_SUMMARY_ORDER: CommercializationCriterionStatus[] = ['pass', 'needs_review', 'additional_check', 'critical']
const RESULT_STATUS_LABELS: Record<CommercializationCriterionStatus, string> = {
  pass: '충족',
  needs_review: '보완 필요',
  additional_check: '추가 확인',
  critical: '불충족',
}

function screeningGroupSummary(gateGroup: CommercializationGateGroup, counts: Record<CommercializationCriterionStatus, number>, total: number) {
  const pass = counts.pass ?? 0
  const needsReview = counts.needs_review ?? 0
  const additionalCheck = counts.additional_check ?? 0
  const critical = counts.critical ?? 0
  if (gateGroup === 'insurance_gate') {
    if (pass === total) return '필수 기준 모두 충족'
    const details = [
      needsReview ? `보완 필요 ${needsReview}` : '',
      additionalCheck ? `추가 확인 ${additionalCheck}` : '',
      critical ? `불충족 ${critical}` : '',
    ].filter(Boolean)
    return `필수 기준 ${total}개 중 ${pass}개 충족${details.length ? ` · ${details.join(' · ')}` : ''}`
  }
  if (gateGroup === 'productization_gate') {
    const details = [
      needsReview ? `보완 필요 ${needsReview}` : '',
      pass ? `충족 ${pass}` : '',
      additionalCheck ? `추가 확인 ${additionalCheck}` : '',
      critical ? `불충족 ${critical}` : '',
    ].filter(Boolean)
    return `${total}개 기준 중 ${details.join(' · ') || '평가 결과 입력 필요'}`
  }
  return [
    pass ? `충족 ${pass}` : '',
    needsReview ? `보완 필요 ${needsReview}` : '',
    additionalCheck ? `추가 확인 ${additionalCheck}` : '',
    critical ? `불충족 ${critical}` : '',
  ].filter(Boolean).join(' · ') || '평가 결과 입력 필요'
}

const MATERIAL_STATUS_LABELS: Record<string, string> = {
  sufficient: '근거 충분',
  external_data_required: '외부자료 필요',
  internal_data_required: '내부자료 필요',
  reviewer_confirmation_required: '자료 확인 필요',
}

const REVIEW_STATUS_LABELS: Record<CommercializationReviewStatus, string> = {
  not_started: '검토 전',
  in_progress: '검토 중',
  additional_data_required: '추가 자료 필요',
  completed: '검토 완료',
  deferred: '보류',
}

const REVIEW_STATUS_ORDER: CommercializationReviewStatus[] = ['completed', 'in_progress', 'additional_data_required', 'not_started', 'deferred']
const AI_PRODUCT_JUDGMENT_LABELS = {
  review_worthy: '상품성 있음',
  additional_check_required: '추가 확인 필요',
  likely_initial_rejection: '상품화 어려움 가능성 높음',
} as const
const REVIEWER_PRODUCT_JUDGMENT_LABELS = {
  has_product_potential: '상품성 있음',
  no_product_potential: '상품성 없음',
  deferred: '판단 보류',
  undetermined: '아직 미확정',
} as const

function reviewStatusOf(criterion: CommercializationCriterion): CommercializationReviewStatus {
  const review = criterion.reviewerReview
  if (review?.decision === 'deferred' || review?.status === 'deferred') return 'deferred'
  // A confirmed acceptance or edit is a completed review even when an older
  // persisted record omitted the explicit status field.
  if (review?.confirmed && (review.acceptedAi || review.resultStatus || review.status === 'completed')) return 'completed'
  if (review?.status) return review.status
  if (review?.confirmed) return 'completed'
  if (review?.decision && review.decision !== 'keep_ai') return 'in_progress'
  return 'not_started'
}

function appliedStatusOf(criterion: CommercializationCriterion): CommercializationCriterionStatus {
  const review = criterion.reviewerReview
  if (review?.confirmed && review.resultStatus) return review.resultStatus
  return criterion.status
}

function appliedSourceOf(criterion: CommercializationCriterion): string {
  const review = criterion.reviewerReview
  if (review?.confirmed && review.resultStatus) return '실무자 수정 결과'
  if (review?.confirmed && review.acceptedAi) return 'AI 판단 수용 결과'
  if (review?.status === 'completed') return '실무 검토 완료 · AI 평가 유지'
  return 'AI 평가(미확정)'
}

function reviewerActionLabelOf(criterion: CommercializationCriterion): string {
  const review = criterion.reviewerReview
  if (review?.acceptedAi) return 'AI 판단 수용'
  if (review?.resultStatus) return '결과 수정'
  if (review?.decision === 'deferred' || review?.status === 'deferred') return '검토 보류'
  if (review?.deferReason) return '검토 보류'
  if (review?.status === 'additional_data_required' || criterion.inputData?.some((item) => item.status !== 'missing' || item.value || item.source || item.confirmed)) return '자료 추가'
  if (review?.status === 'in_progress') return '검토 진행 중'
  if (review?.status === 'completed') return '일반 검토 완료'
  return '선택된 행동 없음'
}

const uniqueCriterionText = (values: Array<string | undefined>, limit = 6) => Array.from(new Set(
  values
    .map((value) => neutralizeCommercializationText(String(value ?? '')).trim())
    .filter(Boolean),
)).slice(0, limit)

const compactCriterionText = (value: string, maxLength = 150) => value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value

const UNASSESSED_GUIDANCE: Record<string, string> = {
  actual_market_demand: '고객 요청, 가입 의향과 예상 계약 수 등 반복 가능한 수요 자료가 필요합니다.',
  risk_pooling: '유사 위험을 가진 계약자 수와 위험군 분류 자료가 필요합니다.',
  fortuity: '우연한 사고인지, 계약 전 발생이나 고의 개입이 없는지 확인해야 합니다.',
  insurable_interest: '보험금 수령 주체와 실제 경제적 손해의 관계를 확인해야 합니다.',
  moral_hazard_control: '사고 검증, 인수 기준과 고의·사기 통제 방안을 확인해야 합니다.',
  gambling_like_structure: '지급 조건과 실제 경제적 손해의 연계 여부를 검토해야 합니다.',
  loss_verifiability: '사고 확인 방법과 손해액 산정에 필요한 객관적 자료를 마련해야 합니다.',
  pml_accumulation: '단일 사고 PML과 동시다발 손해 가능성을 확인해야 합니다.',
  liability_clarity: '사고 관련 책임 주체와 책임 분담 기준을 확인해야 합니다.',
  wording_clarity: '보장 사고, 면책과 보험금 지급 조건을 정의해야 합니다.',
  pricing_data_readiness: '내부 계약·사고·보험금 자료의 확보 가능 여부 확인',
  coverage_gap: '기존 보험의 보장 범위·중복·공백 자료를 비교해야 합니다.',
}

const neutralizeCommercializationText = (value: string) => value
  .replace(/AI가\s*생성한\s*결과/g, '평가 결과')
  .replace(/AI가\s*분석한\s*결과/g, '평가 결과')
  .replace(/AI\s*종합평가|AI\s*종합\s*의견|AI\s*종합\s*판단/g, '상품화 종합평가')
  .replace(/AI\s*판단/g, '1차 평가')
  .replace(/AI\s*분석\s*또는\s*추정/g, '분석 및 추정')
  .replace(/AI\s*분석/g, '판단 근거')
  .replace(/AI\s*신뢰도/g, '근거 충분도')
  .replace(/AI\s*재분석/g, '재평가')

const criterionSummary = (criterion: CommercializationCriterion) => {
  const pendingAction = criterion.nextActions.find((action) => !action.completed && action.text.trim())?.text
  const source = criterion.summary && criterion.summary !== '추가 평가가 필요합니다.'
    ? criterion.summary
    : criterion.missingInformation[0] ?? pendingAction ?? UNASSESSED_GUIDANCE[criterion.id] ?? '현재 입력된 자료 기준으로 보완이 필요합니다.'
  return neutralizeCommercializationText(source)
}

const aiDecisionOf = (criterion: CommercializationCriterion): CommercializationAiDecision => {
  const review = criterion.reviewerReview
  if (review?.confirmed && review.resultAiDecision) return review.resultAiDecision
  if (review?.confirmed && review.resultStatus) return review.resultStatus === 'critical' ? 'unfulfilled' : 'fulfilled'
  return criterion.aiDecision ?? (criterion.status === 'critical' ? 'unfulfilled' : 'fulfilled')
}

const criterionReviewStatusOf = (criterion: CommercializationCriterion): CommercializationCriterionReviewStatus => {
  if (criterion.reviewStatus) return criterion.reviewStatus
  return reviewStatusOf(criterion) === 'completed' ? 'completed' : 'pending'
}

const criterionReviewActionOf = (criterion: CommercializationCriterion): CommercializationReviewAction | undefined => {
  if (criterion.reviewAction) return criterion.reviewAction
  if (criterion.reviewerReview?.action) return criterion.reviewerReview.action
  if (criterion.reviewerReview?.acceptedAi) return 'accepted'
  if (criterion.reviewerReview?.resultAiDecision || criterion.reviewerReview?.resultStatus) return 'modified'
  return undefined
}

const aiDecisionLabel = (decision: CommercializationAiDecision) => decision === 'fulfilled' ? '충족' : '불충족'
const reviewerDecisionLabel = (status: CommercializationCriterionReviewStatus) => status === 'completed' ? '완료' : '판단 전'

const reviewerResultSummaryOf = (criterion: CommercializationCriterion, aiDecision: CommercializationAiDecision): string => {
  const review = criterion.reviewerReview
  const action = criterionReviewActionOf(criterion)
  if (action === 'accepted' || review?.acceptedAi) return 'AI 판단 수용'
  if (action === 'modified' || review?.resultStatus) {
    const before = aiDecisionLabel(review?.resultAiDecision ?? aiDecision)
    const after = review?.resultStatus ? RESULT_STATUS_LABELS[review.resultStatus] : aiDecisionLabel(aiDecision)
    return `실무 판단 수정 · ${before} → ${after}`
  }
  return '실무 검토 완료'
}

const criterionDetailOf = (criterion: CommercializationCriterion): CommercializationCriterionDetail => criterion.analysisDetail ?? {
  aiSummary: criterionSummary(criterion),
  rationale: [criterion.rationale || criterionSummary(criterion)],
  materials: criterion.evidence.map((item) => item.title),
  assumptions: [],
  limitations: criterion.missingInformation,
  reviewerChecks: criterion.nextActions.filter((action) => !action.completed).map((action) => action.text),
}

function FeasibilityStatusBadge({ status }: { status: string }) {
  const normalizedStatus = ({ reviewable: 'pass', needs_more_data: 'additional_check', redesign: 'critical', not_viable: 'critical', review_worthy: 'pass', additional_check_required: 'additional_check', likely_initial_rejection: 'critical' } as Record<string, string>)[status]
    ?? (['pass', 'needs_review', 'additional_check', 'critical'].includes(status) ? status : 'additional_check')
  const label = ({ pass: '충족', needs_review: '보완 필요', additional_check: '추가 확인', critical: '불충족' } as Record<string, string>)[normalizedStatus] ?? commercializationStatusLabel(status)
  return (
    <span className={`report-page__assessment-status report-page__assessment-status--${normalizedStatus}`}>
      <span aria-hidden="true">●</span>
      <span>{label}</span>
      <span className="sr-only">평가 상태: {label}</span>
    </span>
  )
}

const SOURCE_SECTION_LABELS: Record<string, string> = {
  'risk-detail': '위험 상세',
  'risk-search': '위험 탐색',
  'coverage-gap': '보장 공백',
  product: '상품 구조',
  wording: '약관 검토',
  evidence: '근거자료',
  internal_data: '실무 입력자료',
  reviewer: '실무자 검토',
}

const sourceSectionLabel = (source: string) => SOURCE_SECTION_LABELS[source] ?? source

const sourceSectionConfig = (source: string) => PRECEDING_ANALYSIS_LINKS.find((config) => config.sourceKeys.includes(source))

const feasibilitySourceLinkLabel = (source: string): string => {
  if (source === 'evidence') return '사용 출처 보기'
  if (source === 'coverage-gap') return '판단 근거 보기'
  return '연동 분석 보기'
}

const evidenceTypeLabel = (evidence: CommercializationCriterion['evidence'][number]) => {
  const raw = evidence as Record<string, unknown>
  const searchable = [evidence.sourceType, evidence.sourceName, evidence.title].join(' ').toLowerCase()
  if (raw.isMockData === true || /mock|prototype|프로토타입|가상|시연/.test(searchable)) return '프로토타입 가상자료'
  if (/internal|사내|내부/.test(searchable)) return '내부자료'
  if (/official|공식|공공/.test(searchable)) return '공식자료'
  if (!evidence.sourceName && !evidence.title) return '미확보'
  return '외부 참고자료'
}

type CriterionReviewSaveResult = { persisted: boolean }
type CriterionReviewSave = (criterionId: string, reviewerReview: CommercializationReviewerReview, rateData: CommercializationRateDataPoint[], inputData: CommercializationInputDataPoint[]) => Promise<CriterionReviewSaveResult>
type CriterionReanalysisRequest = {
  criterionId: string
  inputData: CommercializationInputDataPoint[]
  rateData: CommercializationRateDataPoint[]
  reviewerReview: CommercializationReviewerReview
  precedingAnalysis: {
    title: string
    gateGroup: CommercializationGateGroup
    evidenceStatus: CommercializationEvidenceStatus
    requiresReviewerInput: boolean
    status: CommercializationCriterionStatus
    summary: string
    rationale: string
    sourceSections: string[]

    evidenceIds: string[]
  }
}
type CriterionReanalysisResult = {
  changedCriteria?: string[]
  summary?: string
  newConditions?: string[]
  missingInformation?: string[]
}
type CriterionReanalysisHandler = (request: CriterionReanalysisRequest) => Promise<CriterionReanalysisResult>
type CriterionReanalysisApply = (criterionId: string, result: CriterionReanalysisResult) => Promise<CriterionReviewSaveResult>

const reviewerOwnerOptions = ['상품개발', '계리', '법무', '보상', '재보험', '기타']

function createReviewerReview(criterion: CommercializationCriterion): CommercializationReviewerReview {
  return {
    decision: criterion.reviewerReview?.decision ?? 'keep_ai',
    status: criterion.reviewerReview?.status ?? (criterion.reviewStatus === 'completed' ? 'completed' : 'not_started'),
    action: criterion.reviewerReview?.action ?? criterion.reviewAction,
    acceptedAi: criterion.reviewerReview?.acceptedAi === true,
    resultStatus: criterion.reviewerReview?.resultStatus,
    resultAiDecision: criterion.reviewerReview?.resultAiDecision ?? criterion.aiDecision,
    changeReason: criterion.reviewerReview?.changeReason ?? '',
    followUpMaterials: criterion.reviewerReview?.followUpMaterials ?? [],
    deferReason: criterion.reviewerReview?.deferReason ?? '',
    owner: criterion.reviewerReview?.owner ?? criterion.nextActions[0]?.owner ?? '',
    memo: criterion.reviewerReview?.memo ?? criterion.reviewerMemo ?? '',
    confirmed: criterion.reviewerReview?.confirmed === true,
    updatedAt: criterion.reviewerReview?.updatedAt ?? null,
  }
}

// Only reviewer changes that could alter an AI assessment make the item
// eligible for re-analysis. Accepting an AI result or marking a review
// complete is a workflow action and should not create a false re-analysis
// warning.
function reanalysisReviewSnapshot(review?: CommercializationReviewerReview) {
  return {
    resultStatus: review?.resultStatus ?? null,
    changeReason: review?.changeReason ?? '',
    followUpMaterials: review?.followUpMaterials ?? [],
  }
}

function FeasibilityCriterionDetail({ criterion, onNavigateTab, onSaveReview, onRequestReanalysis, onApplyReanalysis, onInputDirtyChange }: { criterion: CommercializationCriterion; onNavigateTab?: (id: ReportTabId) => void; onSaveReview?: CriterionReviewSave; onRequestReanalysis?: CriterionReanalysisHandler; onApplyReanalysis?: CriterionReanalysisApply; onInputDirtyChange?: (criterionId: string, dirty: boolean) => void }) {
  const detail = criterionDetailOf(criterion)
  const openActions = criterion.nextActions.filter((action) => !action.completed)
  const [reviewerReview, setReviewerReview] = useState<CommercializationReviewerReview>(() => createReviewerReview(criterion))
  const [reviewAction, setReviewAction] = useState<'none' | 'accept' | 'edit' | 'add_data'>('none')
  const [rateData, setRateData] = useState<CommercializationRateDataPoint[]>(() => criterion.rateData ?? [])
  const [inputData, setInputData] = useState<CommercializationInputDataPoint[]>(() => criterion.inputData ?? [])
  const [reviewMessage, setReviewMessage] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reanalysisState, setReanalysisState] = useState<'idle' | 'missing_input' | 'loading' | 'success' | 'error' | 'unavailable'>('idle')
  const [reanalysisMessage, setReanalysisMessage] = useState('')
  const [pendingReanalysis, setPendingReanalysis] = useState<CriterionReanalysisResult | null>(null)
  const [reanalysisApplying, setReanalysisApplying] = useState(false)
  const reviewStatus = reviewerReview.confirmed ? 'completed' : criterionReviewStatusOf(criterion)
  const currentDecision = reviewerReview.confirmed && reviewerReview.resultAiDecision ? reviewerReview.resultAiDecision : aiDecisionOf(criterion)
  const originalInputSnapshot = JSON.stringify({ inputData: criterion.inputData ?? [], rateData: criterion.rateData ?? [], reviewerReview: reanalysisReviewSnapshot(criterion.reviewerReview) })
  const currentInputSnapshot = JSON.stringify({ inputData, rateData, reviewerReview: reanalysisReviewSnapshot(reviewerReview) })
  const inputDirty = originalInputSnapshot !== currentInputSnapshot
  const hasInputDataValues = inputData.some((item) => item.status !== 'missing' || Boolean(item.value?.trim()) || Boolean(item.asOf?.trim()) || Boolean(item.source?.trim()) || Boolean(item.memo?.trim()) || item.confirmed === true)
  const hasRateDataValues = rateData.some((item) => item.status !== 'missing' || Boolean(item.value?.trim()) || Boolean(item.asOf?.trim()) || Boolean(item.source?.trim()) || Boolean(item.reviewerMemo?.trim()) || Boolean(item.owner?.trim()) || item.confirmed === true)

  useEffect(() => {
    onInputDirtyChange?.(criterion.id, inputDirty)
  }, [criterion.id, inputDirty, onInputDirtyChange])

  const updateRateData = (index: number, key: keyof CommercializationRateDataPoint, value: string) => {
    setRateData((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item))
  }
  const updateInputData = (index: number, key: keyof CommercializationInputDataPoint, value: string | boolean) => {
    setInputData((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item))
  }

  const saveReviewerReview = async (nextReview: CommercializationReviewerReview) => {
    if (!onSaveReview) {
      setReviewMessage('현재 입력은 임시 상태로만 유지됩니다. 저장 연결 후 새로고침하면 사라집니다.')
      return
    }
    setReviewSaving(true)
    setReviewMessage('저장 중…')
    const previousReview = reviewerReview
    const reviewToSave = { ...nextReview, updatedAt: new Date().toISOString() }
    setReviewerReview((current) => ({ ...current, ...reviewToSave }))
    try {
      const result = await onSaveReview(criterion.id, reviewToSave, rateData, inputData)
      setReviewMessage(result.persisted ? '실무자 검토를 저장했습니다.' : '현재 화면에만 적용했습니다. 새로고침하면 사라집니다.')
      setReviewAction('none')
    } catch (error) {
      setReviewerReview(previousReview)
      setReviewMessage(error instanceof Error ? error.message : '실무자 검토 저장에 실패했습니다.')
    } finally {
      setReviewSaving(false)
    }
  }

  const acceptAiJudgment = () => void saveReviewerReview({
    ...reviewerReview,
    decision: 'keep_ai',
    action: 'accepted',
    acceptedAi: true,
    resultAiDecision: currentDecision,
    resultStatus: currentDecision === 'fulfilled' ? 'pass' : 'critical',
    status: 'completed',
    confirmed: true,
  })
  const saveAdditionalEvidence = () => {
    if (!reviewerReview.followUpMaterials?.length && !reviewerReview.memo?.trim() && !hasInputDataValues && !hasRateDataValues) {
      setReviewMessage('추가 근거 또는 자료를 입력해 주세요.')
      return
    }
    void saveReviewerReview({ ...reviewerReview, action: undefined, status: 'in_progress', confirmed: false, acceptedAi: false })
  }
  const saveEditedResult = () => {
    if (!reviewerReview.resultAiDecision) {
      setReviewMessage('수정 결과를 충족 또는 불충족으로 선택해 주세요.')
      return
    }
    if (!reviewerReview.changeReason?.trim()) {
      setReviewMessage('결과를 수정하는 사유를 입력해 주세요.')
      return
    }
    void saveReviewerReview({
      ...reviewerReview,
      decision: reviewerReview.resultAiDecision === 'fulfilled' ? 'pass' : 'critical',
      action: 'modified',
      acceptedAi: false,
      resultStatus: reviewerReview.resultAiDecision === 'fulfilled' ? 'pass' : 'critical',
      status: 'completed',
      confirmed: true,
    })
  }
  const cancelReviewAction = () => {
    setReviewerReview(createReviewerReview(criterion))
    setInputData(criterion.inputData ?? [])
    setRateData(criterion.rateData ?? [])
    setReviewAction('none')
    setReviewMessage('')
  }
  const requestReanalysis = async () => {
    if (!inputData.some((item) => item.status !== 'missing' || Boolean(item.value?.trim()) || Boolean(item.source?.trim()) || item.confirmed)) {
      setReanalysisState('missing_input')
      setReanalysisMessage('재검토에 사용할 입력자료가 아직 없습니다.')
      return
    }
    if (!onRequestReanalysis) {
      setReanalysisState('unavailable')
      setReanalysisMessage('AI 재검토 API가 아직 연결되지 않았습니다. 기존 평가 결과는 유지됩니다.')
      return
    }
    setReanalysisState('loading')
    try {
      const result = await onRequestReanalysis({ criterionId: criterion.id, inputData, rateData, reviewerReview, precedingAnalysis: { title: criterion.title, gateGroup: criterion.gateGroup, evidenceStatus: criterion.evidenceStatus, requiresReviewerInput: criterion.requiresReviewerInput, status: criterion.status, summary: criterion.summary, rationale: criterion.rationale, sourceSections: criterion.sourceSections, evidenceIds: criterion.evidence.map((item) => item.id) } })
      setPendingReanalysis(result)
      setReanalysisState('success')
      setReanalysisMessage('재검토 결과가 준비되었습니다. 확인 후 적용해 주세요.')
    } catch (error) {
      setReanalysisState('error')
      setReanalysisMessage(error instanceof Error ? error.message : 'AI 재검토에 실패했습니다. 기존 결과는 유지됩니다.')
    }
  }
  const applyReanalysis = async () => {
    if (!pendingReanalysis || !onApplyReanalysis) return
    setReanalysisApplying(true)
    try {
      const result = await onApplyReanalysis(criterion.id, pendingReanalysis)
      setReanalysisMessage(result.persisted ? '확인한 재검토 결과를 적용했습니다.' : '현재 화면에만 재검토 결과를 적용했습니다.')
      setPendingReanalysis(null)
      setReanalysisState('idle')
    } catch (error) {
      setReanalysisState('error')
      setReanalysisMessage(error instanceof Error ? error.message : '재검토 결과 적용에 실패했습니다.')
    } finally {
      setReanalysisApplying(false)
    }
  }

  return (
    <div className="report-page__evaluation-detail report-page__evaluation-detail--binary">
      <dl className="report-page__evaluation-detail-list">
        <div><dt>AI 판단 요약</dt><dd><p>{neutralizeCommercializationText(detail.aiSummary)}</p></dd></div>
        <div><dt>판단 근거</dt><dd><ul>{detail.rationale.map((item) => <li key={item}>{neutralizeCommercializationText(item)}</li>)}</ul></dd></div>
        <div><dt>사용 자료·산출값</dt><dd><ul>{detail.materials.map((item) => <li key={item}>{neutralizeCommercializationText(item)}</li>)}</ul>{criterion.evidence.length ? <ul className="report-page__evaluation-evidence-inline">{criterion.evidence.map((item) => <li key={item.id}><code>{item.id}</code> {neutralizeCommercializationText(item.title)}{item.sourceName ? ` · ${neutralizeCommercializationText(item.sourceName)}` : ''}</li>)}</ul> : null}{criterion.sourceSections.length ? <div className="report-page__evaluation-source-links">{criterion.sourceSections.map((source) => { const config = sourceSectionConfig(source); return config ? <button className="report-page__source-link report-page__no-print" type="button" key={source} onClick={() => onNavigateTab?.(config.tabId)}>{sourceSectionLabel(source)} 보기 →</button> : null })}</div> : null}</dd></div>
        <div><dt>가정 및 한계</dt><dd><div className="report-page__evaluation-detail-subgroup"><strong>적용 가정</strong><ul>{detail.assumptions.map((item) => <li key={item}>{neutralizeCommercializationText(item)}</li>)}</ul></div><div className="report-page__evaluation-detail-subgroup"><strong>분석 한계</strong><ul>{detail.limitations.map((item) => <li key={item}>{neutralizeCommercializationText(item)}</li>)}</ul></div></dd></div>
        <div><dt>실무 확인사항</dt><dd>{detail.reviewerChecks.length || openActions.length ? <ul>{[...detail.reviewerChecks, ...openActions.map((action) => action.text)].filter((item, index, values) => item && values.indexOf(item) === index).map((item) => <li key={item}>{neutralizeCommercializationText(item)}</li>)}</ul> : <p>추가 확인사항 없음</p>}</dd></div>
      </dl>

      <section className="report-page__evaluation-reviewer-column report-page__evaluation-reviewer-column--compact">
        <div className="report-page__inline-input-panel" data-criterion-input-id={criterion.id}>
          <div className="report-page__inline-input-heading"><div><p className="report-page__eyebrow">REVIEWER REVIEW</p><h4>실무자 검토</h4><p>AI 판단을 수용하거나 결과를 수정하고, 필요한 근거를 추가합니다.</p></div><span className="report-page__review-status-text">실무자 판단 · {reviewerDecisionLabel(reviewStatus)}</span></div>
          {onSaveReview ? <div className="report-page__review-actions report-page__no-print" role="group" aria-label="평가 항목별 실무 작업"><button type="button" className={reviewAction === 'accept' ? 'is-selected' : ''} onClick={() => setReviewAction('accept')}>AI 판단 수용</button><button type="button" className={reviewAction === 'edit' ? 'is-selected' : ''} onClick={() => { setReviewerReview((current) => ({ ...current, resultAiDecision: current.resultAiDecision ?? currentDecision })); setReviewAction('edit') }}>결과 수정</button><button type="button" className={reviewAction === 'add_data' ? 'is-selected' : ''} onClick={() => setReviewAction('add_data')}>근거 추가</button></div> : null}
          {reviewAction === 'none' ? <p className="report-page__review-action-hint">현재 실무자 상태 · {reviewerDecisionLabel(reviewStatus)}{criterionReviewActionOf(criterion) ? ` · ${criterionReviewActionOf(criterion) === 'accepted' ? 'AI 판단 수용' : '결과 수정'}` : ''}</p> : null}
          {onSaveReview && reviewAction === 'accept' ? <div className="report-page__review-action-form"><p>현재 AI 판단 · <strong>{aiDecisionLabel(currentDecision)}</strong></p><label>선택적 메모<textarea value={reviewerReview.memo ?? ''} placeholder="필요한 경우 검토 메모를 입력하세요." onChange={(event) => setReviewerReview((current) => ({ ...current, memo: event.target.value }))} /></label></div> : null}
          {onSaveReview && reviewAction === 'edit' ? <div className="report-page__review-action-form report-page__reviewer-input-grid"><label>수정 결과<select value={reviewerReview.resultAiDecision ?? currentDecision} onChange={(event) => setReviewerReview((current) => ({ ...current, resultAiDecision: event.target.value as CommercializationAiDecision }))}><option value="fulfilled">충족</option><option value="unfulfilled">불충족</option></select></label><label className="report-page__reviewer-memo-field">수정 사유<textarea required value={reviewerReview.changeReason ?? ''} placeholder="결과를 수정하는 이유를 입력하세요." onChange={(event) => setReviewerReview((current) => ({ ...current, changeReason: event.target.value }))} /></label></div> : null}
          {onSaveReview && reviewAction === 'add_data' ? <div className="report-page__review-action-form"><label>추가 근거<textarea value={(reviewerReview.followUpMaterials ?? []).join('\n')} placeholder="근거자료 ID, 자료 위치 또는 확인 내용을 입력하세요." onChange={(event) => setReviewerReview((current) => ({ ...current, followUpMaterials: event.target.value.split(/\n|,/).map((item) => item.trim()).filter(Boolean) }))} /></label>{inputData.length ? <div className="report-page__inline-input-list">{inputData.map((item, index) => <div className="report-page__inline-input-row" key={item.id}><strong>{item.label}</strong><div className="report-page__inline-input-fields"><label>자료 상태<select value={item.status} onChange={(event) => updateInputData(index, 'status', event.target.value)}><option value="available">확보</option><option value="partial">일부 확보</option><option value="missing">미확보</option><option value="not_applicable">해당 없음</option></select></label><label>값 또는 요약<input value={item.value ?? ''} onChange={(event) => updateInputData(index, 'value', event.target.value)} /></label><label>출처·위치<input value={item.source ?? ''} onChange={(event) => updateInputData(index, 'source', event.target.value)} /></label><label className="report-page__inline-input-memo">검토 메모<textarea value={item.memo ?? ''} onChange={(event) => updateInputData(index, 'memo', event.target.value)} /></label></div></div>)}</div> : null}{criterion.id === 'pricing_data_readiness' ? <p className="report-page__review-action-hint">요율 산출 관련 입력값은 추가 근거로 저장되며, 별도 AI 재검토 후 판단에 반영됩니다.</p> : null}</div> : null}
          {onSaveReview && reviewAction !== 'none' ? <div className="report-page__review-action-footer report-page__no-print"><button className="report-page__button report-page__button--secondary" type="button" disabled={reviewSaving} onClick={cancelReviewAction}>취소</button><button className="report-page__button report-page__button--primary" type="button" disabled={reviewSaving} onClick={() => reviewAction === 'accept' ? acceptAiJudgment() : reviewAction === 'edit' ? saveEditedResult() : saveAdditionalEvidence()}>{reviewSaving ? '저장 중…' : reviewAction === 'accept' ? 'AI 판단 수용 및 검토 완료' : reviewAction === 'edit' ? '수정 결과 저장 및 검토 완료' : '근거 저장 · 판단 전 유지'}</button></div> : null}
          {reviewMessage ? <p className="report-page__reviewer-input-message" role="status">{reviewMessage}</p> : null}
          {!onSaveReview && criterion.reviewerReview?.memo ? <p className="report-page__inline-input-print-note">실무자 메모 · {neutralizeCommercializationText(criterion.reviewerReview.memo)}</p> : null}
        </div>
      </section>

      {criterion.id === 'pricing_data_readiness' && (onSaveReview || hasRateDataValues) ? <div className="report-page__rate-data-panel report-page__evaluation-rate-data"><div className="report-page__rate-data-heading"><div><h4>요율 검토 입력값</h4><p>보험료·손해율 산출에 필요한 자료를 확인합니다.</p></div></div><div className="report-page__rate-data-list">{(rateData.length ? rateData : RATE_DATA_FIELD_DEFINITIONS.map((field) => ({ ...field, status: 'missing' as const, value: '', asOf: '', source: '', reviewerMemo: '', owner: '', confirmed: false }))).map((item, index) => <div className="report-page__rate-data-row" key={item.id}><strong>{item.label}</strong>{onSaveReview && reviewAction === 'add_data' ? <><select value={item.status} aria-label={`${item.label} 확보 상태`} onChange={(event) => updateRateData(index, 'status', event.target.value)}>{Object.entries(RATE_DATA_STATUS_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select><input value={item.value ?? ''} aria-label={`${item.label} 값`} placeholder="자료 값 또는 요약" onChange={(event) => updateRateData(index, 'value', event.target.value)} /><input value={item.source ?? ''} aria-label={`${item.label} 출처`} placeholder="자료 출처 또는 위치" onChange={(event) => updateRateData(index, 'source', event.target.value)} /></> : <span className="report-page__rate-data-readonly">{RATE_DATA_STATUS_LABELS[item.status]}{item.value ? ` · ${item.value}` : ''}{item.source ? ` · ${item.source}` : ''}</span>}</div>)}</div></div> : null}

      {onSaveReview && (inputDirty || reanalysisState !== 'idle') ? <div className="report-page__reanalysis-notice report-page__no-print" role="status"><strong>{reanalysisState === 'loading' ? 'AI 재검토 중' : reanalysisState === 'success' ? '재검토 완료' : reanalysisState === 'error' ? '재검토 실패' : '검토 준비 중'}</strong><p>입력 변경은 근거로 저장되며, AI 재검토 결과를 확인·적용한 뒤 판단에 반영됩니다.</p><button className="report-page__button report-page__button--secondary" type="button" disabled={reanalysisState === 'loading'} onClick={() => void requestReanalysis}>{reanalysisState === 'loading' ? '재검토 중…' : 'AI 재검토 요청'}</button>{reanalysisMessage ? <p>{reanalysisMessage}</p> : null}{pendingReanalysis && onApplyReanalysis ? <div className="report-page__reanalysis-actions"><button className="report-page__button report-page__button--primary" type="button" disabled={reanalysisApplying} onClick={() => void applyReanalysis}>새 결과 적용</button><button className="report-page__button report-page__button--secondary" type="button" disabled={reanalysisApplying} onClick={() => { setPendingReanalysis(null); setReanalysisState('idle') }}>기존 결과 유지</button></div> : null}</div> : null}
    </div>
  )
}

function FeasibilityCriterionDetailLegacy({ criterion, onNavigateTab, onSaveReview, onRequestReanalysis, onApplyReanalysis, onInputDirtyChange }: { criterion: CommercializationCriterion; onNavigateTab?: (id: ReportTabId) => void; onSaveReview?: CriterionReviewSave; onRequestReanalysis?: CriterionReanalysisHandler; onApplyReanalysis?: CriterionReanalysisApply; onInputDirtyChange?: (criterionId: string, dirty: boolean) => void }) {
  const openActions = criterion.nextActions.filter((action) => !action.completed)
  const guidance = UNASSESSED_GUIDANCE[criterion.id]
  const missingInformation = criterion.missingInformation.length
    ? criterion.missingInformation
    : ['needs_review', 'additional_check'].includes(criterion.status) && guidance ? [guidance] : []
  const [reviewerReview, setReviewerReview] = useState<CommercializationReviewerReview>(() => createReviewerReview(criterion))
  const [reviewAction, setReviewAction] = useState<'none' | 'accept' | 'edit' | 'add_data' | 'defer' | 'complete'>('none')
  const [rateData, setRateData] = useState<CommercializationRateDataPoint[]>(() => criterion.rateData ?? [])
  const [inputData, setInputData] = useState<CommercializationInputDataPoint[]>(() => criterion.inputData ?? [])
  const [reviewMessage, setReviewMessage] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reanalysisState, setReanalysisState] = useState<'idle' | 'missing_input' | 'loading' | 'success' | 'error' | 'unavailable'>('idle')
  const [reanalysisMessage, setReanalysisMessage] = useState('')
  const [pendingReanalysis, setPendingReanalysis] = useState<CriterionReanalysisResult | null>(null)
  const [reanalysisApplying, setReanalysisApplying] = useState(false)

  const originalInputSnapshot = JSON.stringify({ inputData: criterion.inputData ?? [], rateData: criterion.rateData ?? [], reviewerReview: reanalysisReviewSnapshot(criterion.reviewerReview) })
  const currentInputSnapshot = JSON.stringify({ inputData, rateData, reviewerReview: reanalysisReviewSnapshot(reviewerReview) })
  const inputDirty = originalInputSnapshot !== currentInputSnapshot
  const hasInputDataValues = inputData.some((item) => item.status !== 'missing' || Boolean(item.value?.trim()) || Boolean(item.asOf?.trim()) || Boolean(item.source?.trim()) || Boolean(item.memo?.trim()) || item.confirmed === true)
  const hasRateDataValues = rateData.some((item) => item.status !== 'missing' || Boolean(item.value?.trim()) || Boolean(item.asOf?.trim()) || Boolean(item.source?.trim()) || Boolean(item.reviewerMemo?.trim()) || Boolean(item.owner?.trim()) || item.confirmed === true)
  const hasReviewerDecision = reviewerReview.status !== 'not_started' || reviewerReview.confirmed === true || Boolean(reviewerReview.memo?.trim()) || Boolean(reviewerReview.changeReason?.trim()) || Boolean(reviewerReview.deferReason?.trim()) || Boolean(reviewerReview.followUpMaterials?.length)

  useEffect(() => {
    onInputDirtyChange?.(criterion.id, inputDirty)
  }, [criterion.id, inputDirty, onInputDirtyChange])

  const updateRateData = (index: number, key: keyof CommercializationRateDataPoint, value: string) => {
    setRateData((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item))
  }

  const updateInputData = (index: number, key: keyof CommercializationInputDataPoint, value: string | boolean) => {
    setInputData((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item))
  }

  const requestReanalysis = async () => {
    const hasValue = inputData.some((item) => item.status !== 'missing' || Boolean(item.value?.trim()) || Boolean(item.source?.trim()) || item.confirmed)
    if (!hasValue) {
      setReanalysisState('missing_input')
      setReanalysisMessage('재검토에 사용할 입력자료가 아직 없습니다. 자료 상태나 값을 먼저 입력해 주세요.')
      return
    }
    if (!onRequestReanalysis) {
      setReanalysisState('unavailable')
      setReanalysisMessage('AI 재검토 API가 아직 연결되지 않았습니다. 기존 평가 결과는 유지됩니다.')
      return
    }
    setReanalysisState('loading')
    setReanalysisMessage('현재 입력자료와 기존 분석을 기준으로 재검토를 요청하고 있습니다.')
    try {
      const result = await onRequestReanalysis({
        criterionId: criterion.id,
        inputData,
        rateData,
        reviewerReview,
        precedingAnalysis: {
          title: criterion.title,
          gateGroup: criterion.gateGroup,
          evidenceStatus: criterion.evidenceStatus,
          requiresReviewerInput: criterion.requiresReviewerInput,
          status: criterion.status,
          summary: criterion.summary,
          rationale: criterion.rationale,
          sourceSections: criterion.sourceSections,
          evidenceIds: criterion.evidence.map((item) => item.id),
        },
      })
      setPendingReanalysis(result)
      setReanalysisState('success')
      setReanalysisMessage('재검토 결과가 준비되었습니다. 변경 내용을 확인한 뒤 적용할 수 있습니다.')
    } catch (error) {
      setReanalysisState('error')
      setReanalysisMessage(error instanceof Error ? error.message : 'AI 재검토에 실패했습니다. 기존 평가 결과는 유지됩니다.')
    }
  }

  const applyReanalysis = async () => {
    if (!pendingReanalysis || !onApplyReanalysis) return
    setReanalysisApplying(true)
    try {
      const result = await onApplyReanalysis(criterion.id, pendingReanalysis)
      setReanalysisMessage(result.persisted ? '확인한 재검토 결과를 적용했습니다.' : '현재 화면에만 재검토 결과를 적용했습니다.')
      setPendingReanalysis(null)
      setReanalysisState('idle')
    } catch (error) {
      setReanalysisState('error')
      setReanalysisMessage(error instanceof Error ? error.message : '재검토 결과 적용에 실패했습니다. 기존 결과는 유지됩니다.')
    } finally {
      setReanalysisApplying(false)
    }
  }

  const reanalysisStatusLabel = ({
    idle: '검토 준비 중',
    missing_input: '입력자료 부족',
    loading: 'AI 재검토 중',
    success: '재검토 완료',
    error: '재검토 실패',
    unavailable: 'API 미연결',
  } as const)[reanalysisState]

  const saveReviewerReview = async (nextReview: CommercializationReviewerReview) => {
    if (!onSaveReview) {
      setReviewMessage('현재 입력은 임시 상태로만 유지됩니다. 저장 연결 후 새로고침하면 사라집니다.')
      return
    }
    setReviewSaving(true)
    setReviewMessage('저장 중…')
    try {
      const previousReview = reviewerReview
      const reviewToSave = { ...nextReview, updatedAt: new Date().toISOString() }
      setReviewerReview((current) => ({ ...current, ...reviewToSave }))
      try {
        const result = await onSaveReview(criterion.id, reviewToSave, rateData, inputData)
        setReviewMessage(result.persisted ? '실무자 검토를 저장했습니다.' : '현재 화면에만 적용했습니다. 새로고침하면 사라집니다.')
        setReviewAction('none')
      } catch (error) {
        setReviewerReview(previousReview)
        throw error
      }
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : '실무자 검토 저장에 실패했습니다.')
    } finally {
      setReviewSaving(false)
    }
  }

  const acceptAiJudgment = () => void saveReviewerReview({ ...reviewerReview, decision: 'keep_ai', acceptedAi: true, resultStatus: undefined, status: 'completed', confirmed: true })
  const saveReviewDraft = () => void saveReviewerReview({ ...reviewerReview, status: 'in_progress', confirmed: false, acceptedAi: false })
  const saveAdditionalDataRequired = () => void saveReviewerReview({ ...reviewerReview, status: 'additional_data_required', confirmed: false, acceptedAi: false })
  const saveAdditionalDataAndComplete = () => void saveReviewerReview({ ...reviewerReview, decision: 'keep_ai', acceptedAi: true, resultStatus: undefined, status: 'completed', confirmed: true })
  const cancelReviewAction = () => {
    setReviewerReview(createReviewerReview(criterion))
    setInputData(criterion.inputData ?? [])
    setRateData(criterion.rateData ?? [])
    setReviewAction('none')
    setReviewMessage('')
  }
  const saveEditedResult = () => {
    if (!reviewerReview.resultStatus) {
      setReviewMessage('수정 평가 결과를 선택해 주세요.')
      return
    }
    if (!reviewerReview.changeReason?.trim()) {
      setReviewMessage('결과를 수정하는 사유를 입력해 주세요.')
      return
    }
    void saveReviewerReview({ ...reviewerReview, decision: reviewerReview.resultStatus, acceptedAi: false, status: 'completed', confirmed: true })
  }
  const saveDeferredReview = () => void saveReviewerReview({ ...reviewerReview, decision: 'deferred', status: 'deferred', confirmed: false, deferReason: reviewerReview.deferReason || reviewerReview.memo })

  return (
    <div className="report-page__evaluation-detail">
      <div className="report-page__evaluation-ai-column">
        <p className="report-page__evaluation-column-label">평가 상세 근거</p>
        <div className="report-page__evaluation-standard-grid">
          <section className="report-page__evaluation-standard-block report-page__evaluation-standard-block--status">
            <h4>현재 판정</h4>
            <FeasibilityStatusBadge status={appliedStatusOf(criterion)} />
          </section>
          <section className="report-page__evaluation-standard-block report-page__evaluation-standard-block--wide">
            <h4>상세 판단</h4>
            <p>{criterionSummary(criterion)}</p>
          </section>
          <section className="report-page__evaluation-standard-block report-page__evaluation-standard-block--wide">
            <h4>판단 근거</h4>
            {criterion.confirmedFacts || criterion.rationale ? (
              <ul className="report-page__reason-list">
                {[criterion.confirmedFacts, criterion.rationale].filter(Boolean).map((item) => <li key={item}>{neutralizeCommercializationText(item as string)}</li>)}
              </ul>
            ) : <p className="report-page__empty-detail">구조화된 판단 근거가 아직 입력되지 않았습니다.</p>}
          </section>
          <section className="report-page__evaluation-standard-block">
            <h4>AI 1차 추정</h4>
            <p>{neutralizeCommercializationText(criterion.rationale || criterionSummary(criterion))}</p>
          </section>
          <section className="report-page__evaluation-standard-block">
            <h4>추정 신뢰도와 분석 한계</h4>
            <p><strong>신뢰도 · {criterionConfidenceLabel(criterion)}</strong></p>
            <p>{MATERIAL_STATUS_LABELS[criterion.evidenceStatus] ?? commercializationEvidenceStatusLabel(criterion.evidenceStatus)} · 내부 계약·손해자료 확인 전 1차 추정입니다.</p>
          </section>
          <section className="report-page__evaluation-standard-block">
            <h4>추가로 필요한 자료</h4>
            {missingInformation.length ? <ChipList items={missingInformation.map(neutralizeCommercializationText)} /> : <p className="report-page__empty-detail">추가로 확보할 정보가 없습니다.</p>}
          </section>
          <section className="report-page__evaluation-standard-block">
            <h4>다음 행동</h4>
            {openActions.length ? <ul className="report-page__compact-list">{openActions.map((action) => <li key={action.id}>{neutralizeCommercializationText(action.text)}</li>)}</ul> : <p className="report-page__empty-detail">미완료 다음 행동이 없습니다.</p>}
          </section>
          <section className="report-page__evaluation-standard-block">
            <h4>담당 부서</h4>
            <p>{criterionOwner(criterion)}</p>
          </section>
          <section className="report-page__evaluation-standard-block report-page__evaluation-standard-block--wide">
            <h4>예상 산출물</h4>
            <p>{criterionExpectedOutput(criterion)}</p>
          </section>
        </div>
        <div className="report-page__evaluation-detail-block">
          <h4>연동된 선행 분석</h4>
          {criterion.sourceSections.length ? (
            <ul className="report-page__linked-analysis-list">
              {criterion.sourceSections.map((source) => {
                const config = sourceSectionConfig(source)
                return (
                  <li key={source}>
                    <div><strong>{sourceSectionLabel(source)}</strong><span className="report-page__linked-analysis-status">연동 출처</span></div>
                    <p>{compactCriterionText(criterionSummary(criterion), 130)}</p>
                    {config ? <button className="report-page__source-link report-page__no-print" type="button" onClick={() => onNavigateTab?.(config.tabId)}>{feasibilitySourceLinkLabel(source)} →</button> : null}
                  </li>
                )
              })}
            </ul>
          ) : <p className="report-page__empty-detail">연동된 선행 분석이 없습니다.</p>}
        </div>
        <div className="report-page__evaluation-detail-block">
          <h4>판단 근거 자료</h4>
          {criterion.evidence.length ? (
            <ul className="report-page__evidence-reference-list">
              {criterion.evidence.map((evidence) => (
                <li key={evidence.id}>
                  <div className="report-page__evidence-reference-heading"><code>{evidence.id}</code><strong>{neutralizeCommercializationText(evidence.title)}</strong><span className="report-page__evidence-type-badge">{evidenceTypeLabel(evidence)}</span></div>
                  {evidence.sourceName ? <span>{neutralizeCommercializationText(evidence.sourceName)}</span> : null}
                  {evidence.excerpt ? <p>{neutralizeCommercializationText(evidence.excerpt)}</p> : null}
                </li>
              ))}
            </ul>
          ) : <p className="report-page__empty-detail">연결된 근거자료가 없습니다. 추가로 필요한 자료입니다.</p>}
        </div>
      </div>
      <div className="report-page__evaluation-reviewer-column">
      <div className="report-page__inline-input-panel" data-criterion-input-id={criterion.id}>
        {!onSaveReview && !hasInputDataValues && !hasReviewerDecision ? <p className="report-page__inline-input-print-empty">실무자 입력 없음</p> : <>
        <div className="report-page__inline-input-heading">
          <div>
            <p className="report-page__eyebrow">REVIEWER INPUT</p>
            <h4>담당자 검토 및 입력</h4>
            <p>AI 판단·근거를 확인한 뒤 담당자의 행동을 선택하고, 임시 저장 또는 검토 완료로 처리합니다.</p>
          </div>
          <span className="report-page__reviewer-input-badge">실무자 입력</span>
        </div>
        {onSaveReview ? <div className="report-page__review-actions" role="group" aria-label="평가 항목별 실무 작업">
          <button type="button" className={reviewAction === 'accept' ? 'is-selected' : ''} onClick={() => setReviewAction('accept')}>AI 판단 수용</button>
          <button type="button" className={reviewAction === 'edit' ? 'is-selected' : ''} onClick={() => setReviewAction('edit')}>결과 수정</button>
          <button type="button" className={reviewAction === 'add_data' ? 'is-selected' : ''} onClick={() => setReviewAction('add_data')}>자료 추가</button>
          <button type="button" className={reviewAction === 'defer' ? 'is-selected' : ''} onClick={() => setReviewAction('defer')}>검토 보류</button>
        </div> : null}
        {onSaveReview && reviewAction === 'none' ? <p className="report-page__review-action-hint">작업을 선택하면 필요한 입력만 표시됩니다.</p> : null}
        {reviewAction === 'none' ? <div className="report-page__reviewer-readonly">
          <p><strong>담당자 행동</strong> · {reviewerActionLabelOf(criterion)}</p>
          <p><strong>실무 검토 상태</strong> · {REVIEW_STATUS_LABELS[reviewStatusOf(criterion)]}</p>
          <p><strong>현재 반영 결과</strong> · {appliedSourceOf(criterion)} · {RESULT_STATUS_LABELS[appliedStatusOf(criterion)]}</p>
          {hasReviewerDecision ? <><p><strong>담당 분야</strong> · {reviewerReview.owner || '입력 없음'}</p>{reviewerReview.memo ? <p><strong>실무자 메모</strong> · {neutralizeCommercializationText(reviewerReview.memo)}</p> : null}{reviewerReview.updatedAt ? <p><strong>처리 시각</strong> · {displayDate(reviewerReview.updatedAt, true)}</p> : null}</> : <p className="report-page__empty-detail">실무자 검토 입력 없음</p>}
        </div> : null}
        {inputData.length ? <div className="report-page__inline-input-list">
          {inputData.map((item, index) => (
            <div className="report-page__inline-input-row" key={item.id}>
              <strong>{item.label}</strong>
              {onSaveReview && reviewAction === 'add_data' ? <div className="report-page__inline-input-fields">
                <label>자료 상태<select value={item.status} onChange={(event) => updateInputData(index, 'status', event.target.value)}><option value="available">확보</option><option value="partial">일부 확보</option><option value="missing">미확보</option><option value="not_applicable">해당 없음</option></select></label>
                <label>값 또는 요약<input value={item.value ?? ''} onChange={(event) => updateInputData(index, 'value', event.target.value)} /></label>
                <label>기준일<input value={item.asOf ?? ''} onChange={(event) => updateInputData(index, 'asOf', event.target.value)} /></label>
                <label>출처·위치<input value={item.source ?? ''} onChange={(event) => updateInputData(index, 'source', event.target.value)} /></label>
                <label>담당 분야<input value={item.owner ?? ''} onChange={(event) => updateInputData(index, 'owner', event.target.value)} /></label>
                <label className="report-page__inline-input-memo">검토 메모<textarea value={item.memo ?? ''} onChange={(event) => updateInputData(index, 'memo', event.target.value)} /></label>
                <label className="report-page__inline-input-confirm"><span>확인 완료</span><input type="checkbox" checked={item.confirmed === true} onChange={(event) => updateInputData(index, 'confirmed', event.target.checked)} /></label>
              </div> : <div className="report-page__inline-input-readonly"><span>{item.status === 'available' ? '확보' : item.status === 'partial' ? '일부 확보' : item.status === 'not_applicable' ? '해당 없음' : '미확보'}</span><p>{item.value || '입력된 값 없음'}{item.source ? ` · ${item.source}` : ''}</p>{item.owner ? <small>담당: {item.owner}</small> : null}{item.memo ? <small>{item.memo}</small> : null}{item.confirmed ? <small>확인 완료</small> : null}</div>}
            </div>
          ))}
        </div> : <p className="report-page__empty-detail">현재 항목에 연결된 입력자료가 없습니다. 필요한 자료가 확인되면 이 영역에 추가됩니다.</p>}
        {onSaveReview && reviewAction === 'accept' ? <div className="report-page__review-action-form">
          <p><strong>현재 AI 평가 결과</strong> · {RESULT_STATUS_LABELS[criterion.status]}</p>
          <p className="report-page__review-action-hint">AI 판단을 수용하면 원본 AI 결과를 그대로 현재 반영 결과로 사용합니다.</p>
          <label>선택적 메모<textarea value={reviewerReview.memo ?? ''} placeholder="필요한 경우 담당자 메모를 입력하세요." onChange={(event) => setReviewerReview((current) => ({ ...current, memo: event.target.value }))} /></label>
        </div> : null}
        {onSaveReview && (reviewAction === 'edit' || reviewAction === 'defer') ? <div className="report-page__review-action-form report-page__reviewer-input-grid">
          {reviewAction === 'edit' ? <label>실무자 평가 결과<select value={reviewerReview.resultStatus ?? criterion.status} onChange={(event) => setReviewerReview((current) => ({ ...current, resultStatus: event.target.value as CommercializationCriterionStatus }))}>{(['pass', 'needs_review', 'additional_check', 'critical'] as CommercializationCriterionStatus[]).map((status) => <option key={status} value={status}>{RESULT_STATUS_LABELS[status]}</option>)}</select></label> : <label>보류 사유<textarea value={reviewerReview.deferReason ?? ''} placeholder="검토를 보류하는 이유" onChange={(event) => setReviewerReview((current) => ({ ...current, deferReason: event.target.value }))} /></label>}
          <label>담당 분야<select value={reviewerOwnerOptions.includes(reviewerReview.owner ?? '') ? reviewerReview.owner : '기타'} onChange={(event) => setReviewerReview((current) => ({ ...current, owner: event.target.value === '기타' ? current.owner : event.target.value }))}>{reviewerOwnerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}</select></label>
          <label className="report-page__reviewer-owner-input">담당 분야 직접 입력<input value={reviewerReview.owner ?? ''} placeholder="담당 분야" onChange={(event) => setReviewerReview((current) => ({ ...current, owner: event.target.value }))} /></label>
          {reviewAction === 'edit' ? <><label className="report-page__reviewer-memo-field">수정 사유<textarea value={reviewerReview.changeReason ?? ''} placeholder="평가 결과를 수정하는 이유" onChange={(event) => setReviewerReview((current) => ({ ...current, changeReason: event.target.value }))} /></label><label className="report-page__reviewer-memo-field">참고자료<textarea value={(reviewerReview.followUpMaterials ?? []).join('\n')} placeholder="근거자료 ID 또는 자료 위치를 입력하세요." onChange={(event) => setReviewerReview((current) => ({ ...current, followUpMaterials: event.target.value.split(/\n|,/).map((item) => item.trim()).filter(Boolean) }))} /></label></> : <label className="report-page__reviewer-memo-field">필요한 후속 자료<textarea value={(reviewerReview.followUpMaterials ?? []).join('\n')} placeholder="보류 후 확보할 자료" onChange={(event) => setReviewerReview((current) => ({ ...current, followUpMaterials: event.target.value.split(/\n|,/).map((item) => item.trim()).filter(Boolean) }))} /></label>}
          <label className="report-page__reviewer-memo-field">실무자 메모<textarea value={reviewerReview.memo ?? ''} placeholder="실무자 검토 의견을 입력하세요." onChange={(event) => setReviewerReview((current) => ({ ...current, memo: event.target.value }))} /></label>
        </div> : null}
        {onSaveReview && inputDirty ? <div className="report-page__reanalysis-notice" role="status"><strong>{reanalysisStatusLabel}</strong><p>입력 내용이 변경되었습니다. 저장 후에도 기존 AI 결과는 유지되며, 재검토 결과는 사용자가 확인하고 적용해야 반영됩니다.</p><div className="report-page__reanalysis-actions"><button className="report-page__button report-page__button--secondary" type="button" disabled={reanalysisState === 'loading'} onClick={() => void requestReanalysis}>{reanalysisState === 'loading' ? 'AI 재검토 중' : 'AI 재검토 요청'}</button>{reanalysisState === 'loading' ? <span>재검토 중…</span> : null}</div>{reanalysisMessage ? <p className="report-page__reanalysis-message">{reanalysisMessage}</p> : null}{pendingReanalysis ? <div className="report-page__reanalysis-result"><strong>변경 내용 확인</strong><p>{pendingReanalysis.summary || '새로운 재검토 결과가 준비되었습니다.'}</p>{pendingReanalysis.changedCriteria?.length ? <p>변경 항목: {pendingReanalysis.changedCriteria.join(', ')}</p> : null}{pendingReanalysis.newConditions?.length ? <p>새 조건: {pendingReanalysis.newConditions.join(', ')}</p> : null}<small>현재 화면에서는 자동 적용하지 않습니다. 적용 기능은 재검토 API 연결 후 활성화됩니다.</small>{onApplyReanalysis ? <div className="report-page__reanalysis-actions"><button className="report-page__button report-page__button--primary" type="button" disabled={reanalysisApplying} onClick={() => void applyReanalysis}>새 결과 적용</button><button className="report-page__button report-page__button--secondary" type="button" disabled={reanalysisApplying} onClick={() => { setPendingReanalysis(null); setReanalysisState('idle'); setReanalysisMessage('기존 결과를 유지했습니다.') }}>기존 결과 유지</button></div> : <p>결과 적용 기능은 AI 재검토 API 연결 후 활성화됩니다.</p>}</div> : null}</div> : null}
        {onSaveReview && reviewAction !== 'none' ? <div className="report-page__review-action-footer report-page__no-print">
          <button className="report-page__button report-page__button--secondary" type="button" disabled={reviewSaving} onClick={cancelReviewAction}>취소</button>
          <button className="report-page__button report-page__button--secondary" type="button" disabled={reviewSaving} onClick={saveReviewDraft}>{reviewSaving ? '저장 중…' : '임시 저장'}</button>
          {reviewAction === 'add_data' ? <button className="report-page__button report-page__button--secondary" type="button" disabled={reviewSaving} onClick={saveAdditionalDataRequired}>추가 자료 필요로 저장</button> : null}
          <button className="report-page__button report-page__button--primary" type="button" disabled={reviewSaving} onClick={() => { if (reviewAction === 'accept') acceptAiJudgment(); else if (reviewAction === 'edit') saveEditedResult(); else if (reviewAction === 'add_data') saveAdditionalDataAndComplete(); else saveDeferredReview() }}>
            {reviewSaving ? '저장 중…' : reviewAction === 'accept' ? 'AI 판단 수용 및 검토 완료' : reviewAction === 'edit' ? '수정 결과 저장 및 검토 완료' : reviewAction === 'add_data' ? '자료 저장 및 검토 완료' : '보류로 저장'}
          </button>
        </div> : null}
        {reviewMessage ? <p className="report-page__reviewer-input-message" role="status">{reviewMessage}</p> : null}
        {!onSaveReview ? <div className="report-page__inline-input-print-note">{criterion.inputChangedAt ? '최신 입력이 반영되지 않은 상태입니다.' : '실무자 입력이 있는 경우 인쇄본에 읽기 전용으로 표시됩니다.'}</div> : null}
        </>}
      </div>
      {criterion.id === 'pricing_data_readiness' && (onSaveReview || hasRateDataValues) ? (
        <div className="report-page__rate-data-panel">
          <div className="report-page__rate-data-heading"><div><h4>요율 검토 데이터 실무 입력</h4><p>AI가 제안한 확인 대상에 대해 실무자가 확보 여부와 자료 위치를 입력합니다.</p></div><span>실무자 입력</span></div>
          <div className="report-page__rate-data-list">
            {(rateData.length ? rateData : RATE_DATA_FIELD_DEFINITIONS.map((field) => ({ ...field, status: 'missing' as const, value: '', asOf: '', source: '', reviewerMemo: '', owner: '', confirmed: false }))).map((item, index) => (
              <div className="report-page__rate-data-row" key={item.id}>
                <strong>{item.label}</strong>
                {onSaveReview && reviewAction === 'add_data' ? <>
                  <select value={item.status} aria-label={`${item.label} 확보 상태`} onChange={(event) => updateRateData(index, 'status', event.target.value)}>{Object.entries(RATE_DATA_STATUS_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select>
                  <input value={item.value ?? ''} aria-label={`${item.label} 자료 값 또는 요약`} placeholder="자료 값 또는 요약" onChange={(event) => updateRateData(index, 'value', event.target.value)} />
                  <input value={item.asOf ?? ''} aria-label={`${item.label} 기준일`} placeholder="기준일" onChange={(event) => updateRateData(index, 'asOf', event.target.value)} />
                  <input value={item.source ?? ''} aria-label={`${item.label} 자료 출처`} placeholder="자료 출처 또는 위치" onChange={(event) => updateRateData(index, 'source', event.target.value)} />
                  <input value={item.owner ?? ''} aria-label={`${item.label} 담당 분야`} placeholder="담당 분야" onChange={(event) => updateRateData(index, 'owner', event.target.value)} />
                  <input value={item.reviewerMemo ?? ''} aria-label={`${item.label} 검토 메모`} placeholder="검토 메모" onChange={(event) => updateRateData(index, 'reviewerMemo', event.target.value)} />
                  <label className="report-page__rate-data-confirm"><span>확인</span><input type="checkbox" checked={item.confirmed === true} onChange={(event) => setRateData((current) => current.map((value, valueIndex) => valueIndex === index ? { ...value, confirmed: event.target.checked } : value))} /></label>
                 </> : <span className="report-page__rate-data-readonly"><strong>{RATE_DATA_STATUS_LABELS[item.status]}</strong>{item.value ? ` · ${item.value}` : ''}{item.asOf ? ` · ${item.asOf}` : ''}{item.source ? ` · ${item.source}` : ''}{item.owner ? ` · 담당: ${item.owner}` : ''}{item.reviewerMemo ? ` · ${item.reviewerMemo}` : ''}{item.confirmed ? ' · 확인 완료' : ''}</span>}
              </div>
            ))}
          </div>
        </div>
      ) : !onSaveReview && criterion.id === 'pricing_data_readiness' ? <p className="report-page__rate-data-print-empty">요율 검토 데이터 입력 없음</p> : null}
      </div>
    </div>
  )
}

void FeasibilityCriterionDetailLegacy

const JUDGMENT_EVIDENCE_LINES = [
  {
    id: 'insurability',
    title: '보험상품 성립 요건',
    content: <><em>피보험이익·우연성·실손보상 원칙</em> 충족</>,
  },
  {
    id: 'commercialization-evidence',
    title: '실제 상품화 사례',
    content: <>동일 위험의 <em>보험상품</em> 및 <em>보험금 지급 구조</em> 확인</>,
  },
  {
    id: 'quantitative-underwriting',
    title: '정량·인수 조건',
    content: <><em>PML</em>·<em>계약 수요</em>·<em>보상한도</em> 추가 검증 필요</>,
  },
] as const

function FeasibilityDecisionOverview({ report, openCriterionId: controlledOpenCriterionId, onOpenCriterion, onNavigateTab, onSaveReview, onRequestReanalysis, onApplyReanalysis, onInputDirtyChange, discardRevision = 0, printMode = false }: { report: ReportView; openCriterionId?: string | null; onOpenCriterion?: (id: string | null) => void; onNavigateTab?: (id: ReportTabId) => void; onSaveReview?: CriterionReviewSave; onRequestReanalysis?: CriterionReanalysisHandler; onApplyReanalysis?: CriterionReanalysisApply; onInputDirtyChange?: (criterionId: string, dirty: boolean) => void; discardRevision?: number; printMode?: boolean }) {
  const assessment = report.productFeasibility.assessment
  const criteria = assessment?.criteria ?? []
  const [internalOpenCriterionId, setInternalOpenCriterionId] = useState<string | null>(null)
  const [quickFilter, setQuickFilter] = useState<FeasibilityQuickFilter>('all')
  const [groupFilter, setGroupFilter] = useState<FeasibilityGroupFilter>('all')
  const [aiFilter, setAiFilter] = useState<FeasibilityAiFilter>('all')
  const [sortMode, setSortMode] = useState<FeasibilitySort>('default')
  const openCriterionId = controlledOpenCriterionId ?? internalOpenCriterionId
  const setOpenCriterionId = onOpenCriterion ?? setInternalOpenCriterionId
  const findCriterion = (id: string) => criteria.find((criterion) => criterion.id === id)
  const mandatory = FEASIBILITY_DISPLAY_GROUPS[0].criterionIds.map(findCriterion).filter((criterion): criterion is CommercializationCriterion => Boolean(criterion))
  const mandatoryPass = mandatory.filter((criterion) => aiDecisionOf(criterion) === 'fulfilled').length
  const mandatoryCritical = mandatory.filter((criterion) => aiDecisionOf(criterion) === 'unfulfilled').length
  const pmlBaseScenario = FEASIBILITY_PML_DATA.scenarios.find((scenario) => scenario.id === FEASIBILITY_PML_DATA.baseScenario)
  const quickFilterCounts = {
    all: criteria.length,
    pending: criteria.filter((criterion) => criterionReviewStatusOf(criterion) === 'pending').length,
    completed: criteria.filter((criterion) => criterionReviewStatusOf(criterion) === 'completed').length,
    modified: criteria.filter((criterion) => criterionReviewStatusOf(criterion) === 'completed' && criterionReviewActionOf(criterion) === 'modified').length,
  }
  const hasReviewDates = criteria.some((criterion) => Boolean(criterion.reviewerReview?.updatedAt ?? criterion.updatedAt))
  const activeSortMode: FeasibilitySort = hasReviewDates || sortMode !== 'recent' ? sortMode : 'default'
  const groupCounts = (group: FeasibilityDisplayGroup) => group.criterionIds.reduce<Record<CommercializationCriterionStatus, number>>((result, id) => {
    const criterion = findCriterion(id)
    if (criterion) {
      const status = aiDecisionOf(criterion) === 'fulfilled' ? 'pass' : 'critical'
      result[status] = (result[status] ?? 0) + 1
    }
    return result
  }, { pass: 0, needs_review: 0, additional_check: 0, critical: 0 })
  const matchesFilters = (criterion: CommercializationCriterion) => {
    const reviewStatus = criterionReviewStatusOf(criterion)
    const reviewAction = criterionReviewActionOf(criterion)
    const quickMatches = quickFilter === 'all'
      || (quickFilter === 'pending' && reviewStatus === 'pending')
      || (quickFilter === 'completed' && reviewStatus === 'completed')
      || (quickFilter === 'modified' && reviewStatus === 'completed' && reviewAction === 'modified')
    const selectedGroup = FEASIBILITY_DISPLAY_GROUPS.find((group) => group.id === groupFilter)
    const groupMatches = groupFilter === 'all' || Boolean(selectedGroup?.criterionIds.includes(criterion.id))
    const aiMatches = aiFilter === 'all' || aiDecisionOf(criterion) === aiFilter
    return quickMatches && groupMatches && aiMatches
  }
  const reviewTimestamp = (criterion: CommercializationCriterion) => {
    const value = criterion.reviewerReview?.updatedAt ?? criterion.updatedAt
    return value ? Date.parse(value) : Number.NEGATIVE_INFINITY
  }
  const hasActiveFilters = quickFilter !== 'all' || groupFilter !== 'all' || aiFilter !== 'all' || activeSortMode !== 'default'
  const resetFilters = () => {
    setQuickFilter('all')
    setGroupFilter('all')
    setAiFilter('all')
    setSortMode('default')
  }
  const filteredCriteria = printMode ? criteria : criteria.filter(matchesFilters)
  const sortedCriteriaForGroup = (group: FeasibilityDisplayGroup) => {
    const groupCriteria = group.criterionIds.map(findCriterion).filter((criterion): criterion is CommercializationCriterion => Boolean(criterion))
    const visible = printMode ? groupCriteria : groupCriteria.filter(matchesFilters)
    if (activeSortMode === 'default' || printMode) return visible
    return visible
      .map((criterion, index) => ({ criterion, index }))
      .sort((left, right) => {
        if (activeSortMode === 'pending-first') {
          const pendingDifference = Number(criterionReviewStatusOf(left.criterion) === 'pending') - Number(criterionReviewStatusOf(right.criterion) === 'pending')
          if (pendingDifference !== 0) return -pendingDifference
        }
        if (activeSortMode === 'recent') {
          const recentDifference = reviewTimestamp(right.criterion) - reviewTimestamp(left.criterion)
          if (recentDifference !== 0) return recentDifference
        }
        return left.index - right.index
      })
      .map(({ criterion }) => criterion)
  }
  const quickFilterOptions: Array<{ value: FeasibilityQuickFilter; label: string }> = [
    { value: 'all', label: '전체' },
    { value: 'pending', label: '판단 전' },
    { value: 'completed', label: '검토 완료' },
    { value: 'modified', label: '결과 수정' },
  ]
  return (
    <div className="report-page__feasibility-redesign-content">
      <section className="report-page__product-decision-hero" aria-labelledby="product-decision-title">
        <div className="report-page__product-decision-copy">
          <h2 id="product-decision-title">상품화 종합판정</h2>
          <strong className="report-page__product-decision-title">{mandatoryCritical ? '상품화 가능성 재검토 필요' : '상품화 가능성 높음 · 상품 개발 검토 권고'}</strong>
          <ul className="report-page__product-decision-bullets">
            <li className="is-satisfied"><span aria-hidden="true">✓</span><span>보험성 필수 기준 {mandatoryPass}/{FEASIBILITY_DISPLAY_GROUPS[0].criterionIds.length} 충족</span></li>
            <li className="is-satisfied"><span aria-hidden="true">✓</span><span>동일 위험의 실제 상품화 사례 확인</span></li>
            {mandatoryCritical === 0 ? <li className="is-satisfied"><span aria-hidden="true">✓</span><span>확인된 검토 중단 사유 없음</span></li> : null}
          </ul>
        </div>
        <div className="report-page__product-decision-facts">
          <div className="report-page__product-decision-facts-grid">
            <span className="report-page__product-decision-fact-card is-pass"><span className="report-page__product-decision-fact-label">보험성 필수 기준</span><strong className="report-page__product-decision-fact-value">{mandatoryPass}/{FEASIBILITY_DISPLAY_GROUPS[0].criterionIds.length} 충족</strong><small>피보험이익 · 우연성 · 사행성 배제·실손보상 원칙</small></span>
            <span className="report-page__product-decision-fact-card is-market"><span className="report-page__product-decision-fact-label">시장성</span><strong className="report-page__product-decision-fact-value">A · 84점</strong><small>성장성·보험 수요·상품화 사례 기준</small></span>
            <span className="report-page__product-decision-fact-card is-tam"><span className="report-page__product-decision-fact-label">총도달가능시장</span><strong className="report-page__product-decision-fact-value">기준 연 121억 원</strong><small>추정 범위 · 연 65억~191억 원</small><em>공동주택 중심의 프로토타입 추정</em></span>
            <span className="report-page__product-decision-fact-card is-pml"><span className="report-page__product-decision-fact-label">최대가능손해(PML)</span><strong className="report-page__product-decision-fact-value">기준 {formatKrwCompact(pmlBaseScenario?.result ?? 0)}</strong><small>추정 범위 · {formatKrwCompact(FEASIBILITY_PML_DATA.range.low)}~{formatKrwCompact(FEASIBILITY_PML_DATA.range.high)}</small></span>
          </div>
        </div>
      </section>

      <section className="report-page__feasibility-judgment-section report-page__feasibility-subsection" aria-labelledby="judgment-evidence-title">
        <div className="report-page__feasibility-subsection-heading"><div><h3 id="judgment-evidence-title">상품화 판단 핵심 근거</h3><p>상품화 가능성을 판단한 핵심 근거를 체크 항목 중심으로 확인합니다.</p></div></div>
        <div className="report-page__judgment-evidence-list">
          {JUDGMENT_EVIDENCE_LINES.map((line, index) => <div className="report-page__judgment-evidence-item" key={line.id}>
            <span className="report-page__judgment-evidence-index" aria-label={`${index + 1}번 근거`}>{index + 1}</span>
            <div className="report-page__judgment-evidence-content">
              <h4>{line.title}</h4>
              <span className="report-page__judgment-evidence-separator" aria-hidden="true"> — </span>
              <span className="report-page__judgment-evidence-description">{line.content}</span>
            </div>
          </div>)}
        </div>
      </section>

      <section className="report-page__quantitative-metrics report-page__feasibility-subsection" aria-labelledby="quantitative-metrics-title">
        <div className="report-page__feasibility-subsection-heading">
          <div><h3 id="quantitative-metrics-title">핵심 정량지표</h3><p>공개자료와 mock 산식을 적용한 프로토타입 추정 결과입니다.</p></div>
        </div>
        <div className="report-page__quantitative-metric-grid">{FEASIBILITY_METRIC_DISPLAY.map((metric) => <article className={`report-page__quantitative-metric-card report-page__quantitative-metric-card--${metric.id}`} key={metric.id}>
          <header><h4>{metric.title}</h4></header>
          <strong className="report-page__quantitative-metric-value">{metric.value}</strong>
          <p className="report-page__quantitative-metric-subvalue">{metric.subvalue}</p>
          <ul>{metric.items.map((item, index) => <li className={`is-${item.tone}`} key={`${metric.id}-${index}`}><span aria-hidden="true">{item.tone === 'confirmed' ? '✓' : '–'}</span><span>{item.text}</span></li>)}</ul>
          <details className="report-page__quantitative-metric-details">
            <summary><span className="report-page__quantitative-detail-label"><span className="is-closed">산정 근거 보기</span><span className="is-open">산정 근거 닫기</span></span></summary>
            <div className="report-page__quantitative-metric-detail-body">
              <dl>{metric.details.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.items ? <ul>{detail.items.map((item) => <li key={item}>{item}</li>)}</ul> : detail.value}</dd></div>)}</dl>
              {metric.scenarios ? <div className="report-page__quantitative-scenario-table-wrap"><table className="report-page__quantitative-scenario-table"><thead><tr><th scope="col">시나리오</th><th scope="col">산정 과정</th><th scope="col">결과</th></tr></thead><tbody>{metric.scenarios.map((scenario) => <tr className={scenario.label === '기준' ? 'is-base' : undefined} key={scenario.label}><th scope="row">{scenario.label}</th><td>{scenario.calculation}</td><td>{scenario.result}</td></tr>)}</tbody></table></div> : null}
            </div>
          </details>
          <p className="report-page__quantitative-metric-print-note">{metric.printNote}</p>
        </article>)}</div>
      </section>

      <div className="report-page__feasibility-visible-groups">
        <div className="report-page__feasibility-criteria-heading"><div><p className="report-page__eyebrow">12 CRITERIA</p><h2>12개 상품화 기준 한눈에 보기</h2><p>AI 판단과 실무자 검토 상태를 분리해 확인합니다.</p></div></div>
        {!printMode ? <div className="report-page__feasibility-filter-toolbar" aria-label="상품화 기준 필터">
          <div className="report-page__feasibility-quick-filters" role="group" aria-label="실무 검토 빠른 필터">
            {quickFilterOptions.map((option) => <button key={option.value} type="button" className={`report-page__feasibility-quick-filter report-page__feasibility-quick-filter--${option.value} ${quickFilter === option.value ? 'is-active' : ''}`} aria-pressed={quickFilter === option.value} onClick={() => setQuickFilter(option.value)}>{option.label} {quickFilterCounts[option.value]}</button>)}
          </div>
          <div className="report-page__feasibility-filter-meta">
            <span className="report-page__feasibility-filter-result">필터 결과 · {filteredCriteria.length}개</span>
            <div className="report-page__feasibility-filter-selects">
              <label><span>기준 그룹</span><select aria-label="기준 그룹 필터" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value as FeasibilityGroupFilter)}><option value="all">전체 기준</option>{FEASIBILITY_DISPLAY_GROUPS.map((group) => <option value={group.id} key={group.id}>{group.title}</option>)}</select></label>
              <label><span>AI 판단</span><select aria-label="AI 판단 필터" value={aiFilter} onChange={(event) => setAiFilter(event.target.value as FeasibilityAiFilter)}><option value="all">전체</option><option value="fulfilled">충족</option><option value="unfulfilled">불충족</option></select></label>
              <label><span>정렬</span><select aria-label="상품화 기준 정렬" value={activeSortMode} onChange={(event) => setSortMode(event.target.value as FeasibilitySort)}><option value="default">기본 순서</option><option value="pending-first">판단 전 우선</option>{hasReviewDates ? <option value="recent">최근 검토순</option> : null}</select></label>
              {hasActiveFilters ? <button type="button" className="report-page__feasibility-filter-reset" onClick={resetFilters}>필터 초기화</button> : null}
            </div>
          </div>
        </div> : null}
        {!printMode && filteredCriteria.length === 0 ? <div className="report-page__feasibility-filter-empty" role="status"><p>선택한 조건에 해당하는 평가 기준이 없습니다.</p><button type="button" onClick={resetFilters}>필터 초기화</button></div> : null}
        {FEASIBILITY_DISPLAY_GROUPS.map((group) => {
          const allGroupCriteria = group.criterionIds.map(findCriterion).filter((criterion): criterion is CommercializationCriterion => Boolean(criterion))
          const groupCriteria = sortedCriteriaForGroup(group)
          const counts = groupCounts(group)
          const reviewCompletedCount = allGroupCriteria.filter((criterion) => criterionReviewStatusOf(criterion) === 'completed').length
          if (!groupCriteria.length) return null
          return <section className={'report-page__feasibility-visible-group report-page__feasibility-visible-group--' + group.id} key={group.id} aria-labelledby={'visible-group-' + group.id}>
            <div className="report-page__feasibility-visible-group-heading"><div><p className="report-page__eyebrow">{group.eyebrow}</p><h3 id={'visible-group-' + group.id}>{group.title}</h3><p>{group.description}</p>{group.scope ? <small>{group.scope}</small> : null}</div><div className="report-page__evaluation-group-status-summary" aria-label={`${group.title} 상태 집계`}><div><span>AI 판단</span><strong><b className="is-teal">충족 {counts.pass}</b><span aria-hidden="true"> · </span><b>불충족 {counts.critical}</b></strong></div><div><span>실무 검토</span><strong><b className="is-blue">완료 {reviewCompletedCount}</b>/{allGroupCriteria.length}</strong></div>{!printMode && groupCriteria.length !== allGroupCriteria.length ? <small className="report-page__feasibility-visible-count">현재 표시 {groupCriteria.length}/{allGroupCriteria.length}</small> : null}</div></div>
            {group.id === 'insurance-gate' ? <p className="report-page__evaluation-gate-note">필수 기준 중 하나라도 불충족이면 상품화 검토 중단 또는 재정의가 필요합니다.</p> : null}
            <div className="report-page__evaluation-cards">{groupCriteria.map((criterion) => {
              const aiDecision = aiDecisionOf(criterion)
              const reviewStatus = criterionReviewStatusOf(criterion)
              const isOpen = printMode || openCriterionId === criterion.id
              const display = feasibilityCriterionDisplay(criterion)
              const isReviewCompleted = reviewStatus === 'completed'
              const reviewAction = criterionReviewActionOf(criterion)
              const isModified = isReviewCompleted && reviewAction === 'modified'
              const reviewerFinalStatus = criterion.reviewerReview?.resultStatus
                ? RESULT_STATUS_LABELS[criterion.reviewerReview.resultStatus]
                : aiDecisionLabel(aiDecision)
              return <article className={'report-page__evaluation-card report-page__evaluation-card--' + (aiDecision === 'fulfilled' ? 'fulfilled' : 'unfulfilled') + (isOpen ? ' is-open' : '') + (isReviewCompleted ? ' is-review-completed' : '')} key={criterion.id}>
                <button className="report-page__evaluation-toggle" type="button" id={'redesign-feasibility-toggle-' + criterion.id} aria-label={display.title + ' 상세 평가 ' + (isOpen ? '접기' : '펼치기')} aria-expanded={isOpen} aria-controls={'redesign-feasibility-detail-' + criterion.id} onClick={() => { if (!printMode) setOpenCriterionId(isOpen ? null : criterion.id) }}>
                  <span className="report-page__evaluation-card-main"><span className="report-page__evaluation-card-heading"><strong>{display.title}</strong></span><span className="report-page__evaluation-judgment">{display.description}</span>{isModified ? <span className="report-page__evaluation-modified-detail"><span>AI 판단 · {aiDecisionLabel(aiDecision)}</span><span>실무 최종 판단 · {reviewerFinalStatus}</span></span> : null}</span>
                  <span className="report-page__evaluation-card-side"><span className="report-page__evaluation-card-side-row"><span className={`report-page__evaluation-ai-status report-page__evaluation-ai-status--${aiDecision}`}><span className="report-page__evaluation-status-icon" aria-hidden="true">{aiDecision === 'fulfilled' ? '✓' : '✕'}</span>AI {aiDecisionLabel(aiDecision)}</span><span className={`report-page__evaluation-review-status report-page__evaluation-review-status--${reviewStatus}`}>{reviewStatus === 'completed' ? <><span aria-hidden="true">✓ </span>실무 완료</> : '실무 판단 전'}</span><span className="report-page__evaluation-chevron" aria-hidden="true">{isOpen ? '⌃' : '⌄'}</span></span>{isReviewCompleted ? <span className="report-page__evaluation-review-summary">{reviewerResultSummaryOf(criterion, aiDecision)}</span> : null}</span>
                </button>
                <div id={'redesign-feasibility-detail-' + criterion.id} className="report-page__evaluation-detail-shell" hidden={!isOpen}><FeasibilityCriterionDetail key={criterion.id + '-' + discardRevision} criterion={criterion} onNavigateTab={onNavigateTab} onSaveReview={onSaveReview} onRequestReanalysis={onRequestReanalysis} onApplyReanalysis={onApplyReanalysis} onInputDirtyChange={onInputDirtyChange} /></div>
              </article>
            })}</div>
          </section>
        })}
      </div>

      <section className="report-page__follow-up-actions report-page__feasibility-subsection" aria-labelledby="follow-up-actions-title">
        <div className="report-page__feasibility-subsection-heading"><div><h3 id="follow-up-actions-title">최종 확인 필요</h3></div></div>
        <ol className="report-page__follow-up-summary" aria-label="최종 확인 필요 항목">
          <li><span aria-hidden="true">1</span><strong>실제 계약 수요 검증</strong></li>
          <li><span aria-hidden="true">2</span><strong>PML·보험료·인수조건 검증</strong></li>
          <li><span aria-hidden="true">3</span><strong>보장 범위·보험금 지급 기준 확정</strong></li>
        </ol>
      </section>
      {assessment?.reviewerMemo ? <p className="report-page__interpretation"><strong>실무자 종합 메모</strong> · {neutralizeCommercializationText(assessment.reviewerMemo)}</p> : null}
    </div>
  )
}

function FeasibilitySection({ report, openCriterionId: controlledOpenCriterionId, onOpenCriterion, onNavigateTab, onSaveReview, onRequestReanalysis, onApplyReanalysis, onInputDirtyChange, discardRevision = 0, printMode = false }: { report: ReportView; openCriterionId?: string | null; onOpenCriterion?: (id: string | null) => void; onNavigateTab?: (id: ReportTabId) => void; onSaveReview?: CriterionReviewSave; onRequestReanalysis?: CriterionReanalysisHandler; onApplyReanalysis?: CriterionReanalysisApply; onInputDirtyChange?: (dirty: boolean) => void; discardRevision?: number; printMode?: boolean }) {
  const data = report.productFeasibility
  const assessment = data.assessment
  const [statusFilter, setStatusFilter] = useState('all')
  const [evidenceFilter, setEvidenceFilter] = useState('all')
  const [reviewStatusFilter, setReviewStatusFilter] = useState<CommercializationReviewStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<CommercializationCriterionCategory | 'all'>('all')
  const [internalOpenCriterionId, setInternalOpenCriterionId] = useState<string | null>(null)
  const [dirtyInputIds, setDirtyInputIds] = useState<Set<string>>(new Set())
  const openCriterionId = controlledOpenCriterionId ?? internalOpenCriterionId
  const setOpenCriterionId = onOpenCriterion ?? setInternalOpenCriterionId
  const evaluationListRef = useRef<HTMLDivElement | null>(null)
  const criteria = assessment?.criteria ?? []
  const aiJudgment = deriveCommercializationAiJudgment(criteria)
  const aiCounts = criteria.reduce<Record<CommercializationCriterionStatus, number>>((result, criterion) => {
    result[criterion.status] = (result[criterion.status] ?? 0) + 1
    return result
  }, { pass: 0, needs_review: 0, additional_check: 0, critical: 0 })
  const additionalMaterialCount = criteria.filter((criterion) => criterion.evidenceStatus !== 'sufficient').length
  const filteredCriteria = criteria.filter((criterion) => {
    const statusMatches = statusFilter === 'all'
      || (statusFilter === 'pass' && appliedStatusOf(criterion) === 'pass')
      || (statusFilter === 'additional_check' && appliedStatusOf(criterion) === 'additional_check')
      || (statusFilter === 'review' && ['additional_check', 'needs_review'].includes(appliedStatusOf(criterion)))
      || (statusFilter === 'improvement' && ['needs_review', 'additional_check', 'critical'].includes(appliedStatusOf(criterion)))
      || (statusFilter === 'critical' && appliedStatusOf(criterion) === 'critical')
    const evidenceMatches = evidenceFilter === 'all'
      || (evidenceFilter === 'additional' && (['external_data_required', 'internal_data_required'].includes(criterion.evidenceStatus) || reviewStatusOf(criterion) === 'additional_data_required'))
      || (evidenceFilter === 'reviewer' && (criterion.requiresReviewerInput || ['internal_data_required', 'reviewer_confirmation_required'].includes(criterion.evidenceStatus)))
      || criterion.evidenceStatus === evidenceFilter
    const reviewMatches = reviewStatusFilter === 'all' || reviewStatusOf(criterion) === reviewStatusFilter
    return statusMatches && evidenceMatches && reviewMatches && (categoryFilter === 'all' || criterion.category === categoryFilter)
  })
  const counts = criteria.reduce<Record<string, number>>((result, criterion) => {
    const status = appliedStatusOf(criterion)
    result[status] = (result[status] ?? 0) + 1
    return result
  }, {})
  const appliedInsuranceGatePassCount = criteriaInGateOrder(criteria, 'insurance_gate').filter((criterion) => appliedStatusOf(criterion) === 'pass').length
  const evidenceCounts = criteria.reduce<Record<string, number>>((result, criterion) => {
    result[criterion.evidenceStatus] = (result[criterion.evidenceStatus] ?? 0) + 1
    return result
  }, {})
  const reviewerCriteria = criteria.filter((criterion) => criterion.requiresReviewerInput || ['internal_data_required', 'reviewer_confirmation_required'].includes(criterion.evidenceStatus))
  const reviewCounts = REVIEW_STATUS_ORDER.reduce<Record<CommercializationReviewStatus, number>>((result, status) => {
    result[status] = criteria.filter((criterion) => reviewStatusOf(criterion) === status).length
    return result
  }, { completed: 0, in_progress: 0, additional_data_required: 0, not_started: 0, deferred: 0 })
  const reviewCompletedCount = reviewCounts.completed
  const improvementConditions = uniqueCriterionText([
    ...(assessment?.topRisks ?? []),
    ...criteria.filter((criterion) => ['needs_review', 'additional_check', 'critical'].includes(appliedStatusOf(criterion))).map((criterion) => criterion.title),
    ...criteria.filter((criterion) => ['needs_review', 'additional_check', 'critical'].includes(appliedStatusOf(criterion))).flatMap((criterion) => criterion.missingInformation),
  ], 4)
  const priorityTasks = uniqueCriterionText([
    ...(assessment?.priorityActions ?? []),
    ...criteria.flatMap((criterion) => criterion.nextActions.filter((action) => !action.completed).map((action) => action.text)),
  ], 4)
  const aiJudgmentLabel = AI_PRODUCT_JUDGMENT_LABELS[aiJudgment.status]
  const reviewerProductJudgment = deriveCommercializationReviewerProductJudgment(assessment)
  const lastReviewedAt = assessment?.reviewedAt
  const staleInputCriteriaCount = criteria.filter((criterion) => {
    if (!criterion.inputChangedAt) return false
    if (!lastReviewedAt) return true
    return criterion.inputChangedAt > lastReviewedAt
  }).length
  const scrollToEvaluationList = () => {
    window.requestAnimationFrame(() => {
      const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      evaluationListRef.current?.scrollIntoView({ behavior, block: 'start' })
    })
  }
  const showImprovementCriteria = () => {
    setEvidenceFilter('all')
    setReviewStatusFilter('all')
    setCategoryFilter('all')
    setStatusFilter('improvement')
    scrollToEvaluationList()
  }
  const showReviewerCriteria = () => {
    setStatusFilter('all')
    setEvidenceFilter('reviewer')
    setReviewStatusFilter('all')
    setCategoryFilter('all')
    scrollToEvaluationList()
  }
  const showAdditionalDataCriteria = () => {

    setStatusFilter('all')
    setEvidenceFilter('additional')
    setReviewStatusFilter('all')
    setCategoryFilter('all')
    scrollToEvaluationList()
  }
  const showNotStartedCriteria = () => {
    setStatusFilter('all')
    setEvidenceFilter('all')
    setReviewStatusFilter('not_started')
    setCategoryFilter('all')
    scrollToEvaluationList()
  }
  const showCompletedCriteria = () => {
    setStatusFilter('all')
    setEvidenceFilter('all')
    setReviewStatusFilter('completed')
    setCategoryFilter('all')
    scrollToEvaluationList()
  }
  const handleInputDirtyChange = useCallback((criterionId: string, dirty: boolean) => {
    setDirtyInputIds((current) => {
      const isAlreadyDirty = current.has(criterionId)
      if (isAlreadyDirty === dirty) return current
      const next = new Set(current)
      if (dirty) next.add(criterionId)
      else next.delete(criterionId)
      return next
    })
  }, [])
  const focusCriterion = (criterionId: string) => {
    setStatusFilter('all')
    setEvidenceFilter('all')
    setReviewStatusFilter('all')
    setCategoryFilter('all')
    setOpenCriterionId(criterionId)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = document.getElementById(`feasibility-toggle-${criterionId}`) as HTMLButtonElement | null
        if (!target) return
        const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
        target.scrollIntoView({ behavior, block: 'start' })
        target.focus({ preventScroll: true })
      })
    })
  }
  useEffect(() => {
    if (dirtyInputIds.size === 0) return
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeave)
    return () => window.removeEventListener('beforeunload', warnBeforeLeave)
  }, [dirtyInputIds.size])
  useEffect(() => {
    onInputDirtyChange?.(dirtyInputIds.size > 0)
  }, [dirtyInputIds.size, onInputDirtyChange])

  return (
    <>
      <section className="report-page__section report-page__feasibility-redesign" aria-labelledby="feasibility-title">
        <SectionHeading
          number="07"
          eyebrow=""
          title="상품화 검토 종합평가"
        />
        <p className="report-page__section-intro" id="feasibility-title">상품 개발 검토의 계속 여부와 후속 과제를 확인하는 화면입니다. AI는 최종 상품화 여부를 확정하지 않습니다.</p>
        <FeasibilityDecisionOverview
          report={report}
          openCriterionId={controlledOpenCriterionId}
          onOpenCriterion={onOpenCriterion}
          onNavigateTab={onNavigateTab}
          onSaveReview={onSaveReview}
          onRequestReanalysis={onRequestReanalysis}
          onApplyReanalysis={onApplyReanalysis}
          onInputDirtyChange={handleInputDirtyChange}
          discardRevision={discardRevision}
          printMode={printMode}
        />
      </section>
      <div className="report-page__feasibility-legacy" aria-hidden="true">
    <section className="report-page__section" aria-labelledby="feasibility-title">
      <SectionHeading
        number="07"
        eyebrow="PRODUCT FEASIBILITY"
        title="상품화 검토 종합평가"
        aside={<span className="report-page__gate-summary-badge">필수 기준 {aiJudgment.insuranceGatePassCount} / {COMMERCIALIZATION_GATE_GROUPS.insurance_gate.length} 충족</span>}
      />
      <p className="report-page__section-intro" id="feasibility-title">{neutralizeCommercializationText(reportLabel(report, 'feasibilityDescription', '점수나 평균이 아닌, 보험상품 개발에 필요한 판단 기준과 보완 과제를 표시합니다.'))}</p>

      <div className="report-page__commercialization-overview">
        <section className="report-page__commercialization-conclusion" aria-labelledby="commercialization-conclusion-title">
          <div className="report-page__commercialization-overview-heading">
            <div>
              <p className="report-page__eyebrow report-page__ai-judgment-label">AI 1차 상품성 판단</p>
              <h3 id="commercialization-conclusion-title">종합 결론</h3>
            </div>
          </div>
          <strong className="report-page__commercialization-conclusion-title">{aiJudgmentLabel}</strong>
          <p className="report-page__commercialization-conclusion-summary">필수 기준 {aiJudgment.insuranceGatePassCount} / {COMMERCIALIZATION_GATE_GROUPS.insurance_gate.length} 충족 · {aiCounts.critical === 0 ? '명확한 불충족 없음' : `불충족 ${aiCounts.critical}개`}</p>
          <p className="report-page__assessment-conclusion">{neutralizeCommercializationText(assessment?.aiProductJudgmentReason ?? assessment?.overallSummary ?? data.overallAssessment?.conclusion ?? data.interpretation ?? '상품성 판단을 위해 추가 확인이 필요합니다.')}</p>
          <p className="report-page__assessment-method">AI의 1차 후보 판단이며, 실무자의 최종 상품성 판단을 대신하지 않습니다.</p>
          <div className="report-page__reviewer-product-judgment"><strong>실무자 최종 상품성 판단</strong><span>{REVIEWER_PRODUCT_JUDGMENT_LABELS[reviewerProductJudgment]}</span></div>
          {lastReviewedAt ? <small className="report-page__commercialization-updated">마지막 AI 검토: {displayDate(lastReviewedAt, true)}</small> : null}
          {assessment?.inputChangedAt ? <small className="report-page__commercialization-updated">실무 입력 변경: {displayDate(assessment.inputChangedAt, true)}</small> : null}
          {staleInputCriteriaCount > 0 ? <small className="report-page__commercialization-updated">마지막 AI 검토 이후 변경된 항목: {staleInputCriteriaCount}개 · 최신 입력 미반영</small> : null}
          {assessment?.inputChangedAt && staleInputCriteriaCount === 0 ? <small className="report-page__commercialization-updated">최신 입력 반영됨</small> : null}
          {dirtyInputIds.size > 0 ? <small className="report-page__commercialization-updated">저장되지 않은 입력 변경: {dirtyInputIds.size}개 · AI 재검토 전까지 기존 결과를 유지합니다.</small> : null}
          <div className="report-page__review-progress-summary">
            <div><strong>{reviewCompletedCount} / {criteria.length}</strong><span>실무 검토 진행률</span></div>
            <div className="report-page__review-progress-statuses">{REVIEW_STATUS_ORDER.filter((status) => reviewCounts[status] > 0).map((status) => <span key={status}><strong>{reviewCounts[status]}</strong> {REVIEW_STATUS_LABELS[status]}</span>)}</div>
            <span className="report-page__review-summary-label">{reviewCompletedCount === criteria.length && criteria.length > 0 ? '실무 검토 반영 종합 판단' : 'AI 1차 종합 판단'}</span>
          </div>
          <div className="report-page__assessment-counts" aria-label="AI 평가 결과별 개수">
            <span><strong>{aiJudgment.insuranceGatePassCount} / {COMMERCIALIZATION_GATE_GROUPS.insurance_gate.length}</strong><small>필수 기준 충족</small></span>
            <span><strong>{aiCounts.pass} / {criteria.length}</strong><small>전체 기준 충족</small></span>
            <span><strong>{aiCounts.needs_review}</strong><small>보완 필요</small></span>
            <span><strong>{aiCounts.additional_check}</strong><small>추가 확인</small></span>
            <span className={aiCounts.critical === 0 ? 'is-empty' : undefined}><strong>{aiCounts.critical}</strong><small>불충족</small></span>
          </div>
          {additionalMaterialCount > 0 ? <p className="report-page__material-follow-up">확인 과제 {additionalMaterialCount}건</p> : null}
          <div className="report-page__feasibility-actions report-page__no-print" aria-label="종합평가 주요 작업">
            <button className="report-page__assessment-detail-toggle" type="button" disabled={dirtyInputIds.size === 0} title={onRequestReanalysis ? undefined : 'AI 재검토 API 연결 예정'} onClick={() => { if (dirtyInputIds.size) { const id = Array.from(dirtyInputIds)[0]; setStatusFilter('all'); setEvidenceFilter('all'); setReviewStatusFilter('all'); setCategoryFilter('all'); setOpenCriterionId(id); scrollToEvaluationList() } }}>AI 재검토</button>
            <button className="report-page__assessment-detail-toggle" type="button" onClick={showImprovementCriteria}>보완 필요 항목 보기</button>
            <button className="report-page__assessment-detail-toggle" type="button" onClick={showReviewerCriteria}>실무 입력 필요 항목 보기</button>
          </div>
        </section>

        <section className="report-page__evaluation-scope" aria-labelledby="evaluation-scope-title">
          <div className="report-page__evaluation-scope-meta">
            <strong id="evaluation-scope-title">평가 범위</strong>
            <span>총 {criteria.length}개 기준 · 3개 기준 그룹 · 실무 검토 {reviewCompletedCount} / {criteria.length}</span>
          </div>
        </section>

        <section className="report-page__condition-summary" aria-labelledby="condition-summary-title">
          <div className="report-page__condition-summary-column">
            <h3 id="condition-summary-title">핵심 보완 조건</h3>
            {improvementConditions.length ? <ul>{improvementConditions.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="report-page__muted">현재 데이터에서 별도 보완 조건이 확인되지 않았습니다.</p>}
          </div>
          <div className="report-page__condition-summary-column">
            <h3>우선 확인 과제</h3>
            {priorityTasks.length ? <ul>{priorityTasks.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="report-page__muted">등록된 미완료 확인 과제가 없습니다.</p>}
          </div>
        </section>

        <section className="report-page__screening-map" aria-labelledby="screening-map-title">
          <div className="report-page__screening-map-heading">
            <div>
              <p className="report-page__eyebrow">CRITERIA OVERVIEW</p>
              <h3 id="screening-map-title">12개 상품화 기준 한눈에 보기</h3>
              <p>AI 1차 평가 결과와 실무 검토 상태를 확인하고, 기준을 선택해 상세 검토로 이동할 수 있습니다.</p>
            </div>
            <div className="report-page__screening-map-counts" aria-label="상품화 평가 요약">
              <strong>필수 기준 {appliedInsuranceGatePassCount} / {COMMERCIALIZATION_GATE_GROUPS.insurance_gate.length} 충족</strong>
              <span>전체 기준 {counts.pass ?? 0} / {criteria.length} 충족 · 실무 검토 {reviewCompletedCount} / {criteria.length} 완료</span>
            </div>
          </div>
          <div className="report-page__screening-groups">
            {FEASIBILITY_GATE_GROUPS.map(([gateGroup, label, description]) => {
              const groupCriteria = criteriaInGateOrder(criteria, gateGroup)
              const groupCounts = RESULT_STATUS_ORDER.reduce<Record<CommercializationCriterionStatus, number>>((result, status) => {
                result[status] = groupCriteria.filter((criterion) => appliedStatusOf(criterion) === status).length
                return result
              }, { pass: 0, needs_review: 0, additional_check: 0, critical: 0 })
              const groupSummary = screeningGroupSummary(gateGroup, groupCounts, groupCriteria.length)
              return (
                <section className={`report-page__screening-group report-page__screening-group--${gateGroup}`} key={gateGroup} aria-labelledby={`screening-group-${gateGroup}`}>
                  <div className="report-page__screening-group-heading">
                    <div>
                      <h4 id={`screening-group-${gateGroup}`}>{label}</h4>
                      <p>{description}</p>
                    </div>
                    <span>{groupSummary}</span>
                  </div>
                  <div className="report-page__screening-items">
                    {groupCriteria.map((criterion) => {
                      const status = appliedStatusOf(criterion)
                      const reviewStatus = reviewStatusOf(criterion)
                      return (
                        <button
                          className={`report-page__screening-item report-page__screening-item--${status}`}
                          id={`screening-criterion-${criterion.id}`}
                          key={criterion.id}
                          type="button"
                          aria-label={`${criterion.title} 상세 평가로 이동`}
                          onClick={() => focusCriterion(criterion.id)}
                        >
                          <span className="report-page__screening-item-title"><strong>{criterion.title}</strong></span>
                          <span className="report-page__screening-item-statuses">
                            <span className="report-page__screening-ai-status"><FeasibilityStatusBadge status={status} /></span>
                            <span className={`report-page__screening-review-status report-page__screening-review-status--${reviewStatus}`}>{reviewStatus === 'completed' ? '✓ ' : ''}{REVIEW_STATUS_LABELS[reviewStatus]}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </section>
      </div>

      <p className="report-page__prototype-notice">현재 화면은 프로토타입 가상자료를 포함하며, 실제 자료 연동 후 평가 결과가 변경될 수 있습니다.</p>

      {assessment?.externalConstraints?.length ? (
        <div className="report-page__constraints" aria-label="외부 제약">
          <h3>외부 제약 및 별도 검토</h3>
          {assessment.externalConstraints.map((constraint) => (
            <article key={constraint.id} className={`report-page__constraint report-page__constraint--${constraint.severity}`}>
              <div><strong>{neutralizeCommercializationText(constraint.title)}</strong><FeasibilityStatusBadge status={constraint.severity === 'blocking' ? 'critical' : 'needs_review'} /></div>
              <p>{neutralizeCommercializationText(constraint.summary)}</p>
              <small>{constraint.confirmed ? '확인된 제약' : '확인 필요'} · {constraint.requiresLegalReview ? '전문가 검토 필요' : '일반 검토'}</small>
              {constraint.nextAction ? <p><strong>다음 조치:</strong> {neutralizeCommercializationText(constraint.nextAction)}</p> : null}
            </article>
          ))}
        </div>
      ) : null}

      <div className="report-page__review-needed-bar report-page__no-print" role="status">
        <span>내부자료 또는 실무 판단이 필요한 항목이 {reviewerCriteria.length}개 있습니다.</span>
        <button type="button" onClick={showReviewerCriteria}>해당 항목만 보기</button>
      </div>

      <div className="report-page__feasibility-toolbar report-page__no-print" aria-label="평가항목 필터">
        <label>평가 결과<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">전체 ({criteria.length})</option><option value="pass">충족 ({counts.pass ?? 0})</option><option value="needs_review">보완 필요 ({counts.needs_review ?? 0})</option><option value="additional_check">추가 확인 ({counts.additional_check ?? 0})</option><option value="critical">불충족 ({counts.critical ?? 0})</option><option value="improvement">보완·추가 확인·불충족 ({criteria.filter((criterion) => ['needs_review', 'additional_check', 'critical'].includes(appliedStatusOf(criterion))).length})</option></select></label>
        <label>자료 상태<select value={evidenceFilter} onChange={(event) => setEvidenceFilter(event.target.value)}><option value="all">전체 자료 상태</option>{Object.entries(MATERIAL_STATUS_LABELS).filter(([status]) => status !== 'reviewer_confirmation_required').map(([status, label]) => <option key={status} value={status}>{label} ({evidenceCounts[status] ?? 0})</option>)}<option value="additional">추가 자료 필요 ({criteria.filter((criterion) => ['external_data_required', 'internal_data_required'].includes(criterion.evidenceStatus) || reviewStatusOf(criterion) === 'additional_data_required').length})</option><option value="reviewer">실무 검토 필요 ({reviewerCriteria.length})</option></select></label>
        <label>실무 검토 상태<select value={reviewStatusFilter} onChange={(event) => setReviewStatusFilter(event.target.value as CommercializationReviewStatus | 'all')}><option value="all">전체 실무 검토 상태</option>{REVIEW_STATUS_ORDER.map((status) => <option key={status} value={status}>{REVIEW_STATUS_LABELS[status]} ({reviewCounts[status] ?? 0})</option>)}</select></label>
        <label>평가 영역<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as CommercializationCriterionCategory | 'all')}><option value="all">전체 평가 영역</option>{FEASIBILITY_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className="report-page__filter-reset" type="button" onClick={() => { setStatusFilter('all'); setEvidenceFilter('all'); setReviewStatusFilter('all'); setCategoryFilter('all') }}>초기화</button>
        <div className="report-page__quick-filters" aria-label="빠른 필터"><button type="button" onClick={showImprovementCriteria}>보완 필요 항목</button><button type="button" onClick={showAdditionalDataCriteria}>추가 자료 필요 항목</button><button type="button" onClick={showNotStartedCriteria}>검토 전 항목</button><button type="button" onClick={showCompletedCriteria}>검토 완료 항목</button></div>
        <span className="report-page__muted">{filteredCriteria.length}개 항목 표시</span>
      </div>

      <div className="report-page__evaluation-list" ref={evaluationListRef} aria-label={`상품화 가능성 ${criteria.length}개 평가항목`}>
        {FEASIBILITY_GATE_GROUPS.map(([gateGroup, label, description]) => {
          const groupCriteria = criteriaInGateOrder(criteria, gateGroup)
          const groupItems = criteriaInGateOrder(filteredCriteria, gateGroup)
          if (!groupItems.length) return null
          const groupCounts = RESULT_STATUS_ORDER.reduce<Record<CommercializationCriterionStatus, number>>((result, status) => {
            result[status] = groupCriteria.filter((criterion) => appliedStatusOf(criterion) === status).length
            return result
          }, { pass: 0, needs_review: 0, additional_check: 0, critical: 0 })

          const groupCountSummary = RESULT_STATUS_SUMMARY_ORDER
            .filter((status) => groupCounts[status] > 0)
            .map((status) => `${RESULT_STATUS_LABELS[status]} ${groupCounts[status]}`)
            .join(' · ')
          return (
            <section className={`report-page__evaluation-group report-page__evaluation-group--${gateGroup}`} key={gateGroup} aria-labelledby={`evaluation-group-${gateGroup}`}>
              <div className="report-page__evaluation-group-heading">
                <div>
                  <p className="report-page__eyebrow">{gateGroup === 'insurance_gate' ? '필수 기준' : gateGroup === 'productization_gate' ? '핵심 판단' : '설계·실행 보완'}</p>
                  <h3 id={`evaluation-group-${gateGroup}`}>{label}</h3>
                  <p>{description}</p>
                </div>
                <div className="report-page__evaluation-group-summary">
                  <strong>{groupCriteria.length}개 기준</strong>
                  <span>{groupCountSummary || '평가 결과 입력 필요'}</span>
                </div>
              </div>
              {gateGroup === 'insurance_gate' ? <p className="report-page__evaluation-gate-note">보험성 필수 기준에 명확한 불충족이 있으면 전체 충족 개수와 관계없이 상품화가 어려운 위험으로 우선 검토합니다.</p> : null}
              {groupItems.map((criterion) => {
                const isOpen = printMode || openCriterionId === criterion.id
                const openActions = criterion.nextActions.filter((action) => !action.completed)
                const metadata = [criterion.evidence.length ? `근거 ${criterion.evidence.length}건` : '근거자료 없음', openActions.length ? `확인 과제 ${openActions.length}건` : '확인 과제 없음', `현재 반영: ${appliedSourceOf(criterion)} · ${RESULT_STATUS_LABELS[appliedStatusOf(criterion)]}`].join(' · ')
                const reviewStatus = reviewStatusOf(criterion)
                const status = appliedStatusOf(criterion)
                return (
                  <article className={`report-page__evaluation-card report-page__evaluation-card--${status}${isOpen ? ' is-open' : ''}`} key={criterion.id}>
                    <button
                      className="report-page__evaluation-toggle"
                      type="button"
                      id={`feasibility-toggle-${criterion.id}`}
                      aria-label={`${criterion.title} 평가 항목 ${isOpen ? '접기' : '펼치기'}`}
                      aria-expanded={isOpen}
                      aria-controls={`feasibility-detail-${criterion.id}`}
                      onClick={() => setOpenCriterionId(isOpen ? null : criterion.id)}
                    >
                      <span className="report-page__evaluation-card-main">
                        <span className="report-page__evaluation-card-heading">
                          <span className="report-page__evaluation-index">{String(criterion.order).padStart(2, '0')}</span>
                          <strong>{criterion.title}</strong>
                          {criterion.gateGroup === 'insurance_gate' ? <span className="report-page__required-gate-badge">필수</span> : null}
                        </span>
                        <span className="report-page__evaluation-judgment">{compactCriterionText(criterionSummary(criterion), 220)}</span>
                        <span className="report-page__evaluation-card-footer">{metadata}</span>
                      </span>
                      <span className="report-page__evaluation-card-side">
                        <FeasibilityStatusBadge status={status} />
                        <span className={`report-page__review-status-badge report-page__review-status-badge--${reviewStatus}`}>실무 {REVIEW_STATUS_LABELS[reviewStatus]}</span>
                        <span className="report-page__evaluation-chevron" aria-hidden="true">{isOpen ? '⌃' : '⌄'}</span>
                      </span>
                      {criterion.isBlocking ? <span className="report-page__critical-marker">차단 항목</span> : null}
                    </button>
                    <div id={`feasibility-detail-${criterion.id}`} className="report-page__evaluation-detail-shell" hidden={!isOpen}>
                      <FeasibilityCriterionDetail key={`${criterion.id}-${discardRevision}`} criterion={criterion} onNavigateTab={onNavigateTab} onSaveReview={onSaveReview} onRequestReanalysis={onRequestReanalysis} onApplyReanalysis={onApplyReanalysis} onInputDirtyChange={handleInputDirtyChange} />
                    </div>
                  </article>
                )
              })}
            </section>
          )
        })}
        {!filteredCriteria.length ? <p className="report-page__muted">선택한 조건에 맞는 평가항목이 없습니다.</p> : null}
      </div>
      {assessment?.reviewerMemo ? <p className="report-page__interpretation"><strong>실무자 종합 메모</strong> · {neutralizeCommercializationText(assessment.reviewerMemo)}</p> : null}
    </section>
      </div>
    </>
  )
}

/* Legacy product-structure view retained here as a reference while the page-specific proposal view is reorganized.
const proposalFallback = '현재 자료에서 확정되지 않아 추가 검토가 필요합니다.'

const proposalFormLabel = (value?: string): string => {
  if (value && /기업|기관|단체/.test(value)) return '기업·기관 단체계약형 보완보험'
  return value || '우선 추천 구조 확인 필요'
}

const proposalTags = (data: ReportView['productProposal']): string[] => [
  data.coveredObject?.includes('명부') ? '차량 명부 기반' : '',
  /기업|기관|단체/.test(data.recommendedForm ?? '') ? '기업·기관 단체계약' : '',
  data.coveredLoss?.includes('제3자') ? '제3자 재산손해 보완' : '',
  data.existingInsuranceRelationship ? '기존 보험 우선 확인' : '',
  data.settlementDirection?.includes('구상') ? '사후 구상 검토' : '',
  data.recommendedForm?.includes('정책') ? '정책연계 가능' : '',
].filter(Boolean)

const proposalTagTone = (tag: string): string => {
  if (tag.includes('차량 명부')) return 'vehicle'
  if (tag.includes('단체계약')) return 'contract'
  if (tag.includes('제3자')) return 'coverage'
  if (tag.includes('기존 보험')) return 'existing'
  if (tag.includes('구상')) return 'recovery'
  return 'policy'
}

const PROPOSAL_REASON_TITLES = [
  '차량·시설 집적위험 통합관리',
  '차량 명부 기반 대상 관리',
  '단체계약과 위험관리 책임 연계',
  '기존 보험의 보장 공백 보완',
  '피해자 신속보상 및 사후 구상',
] as const

const PROPOSAL_REASON_DESCRIPTIONS = [
  '개별 차량 화재뿐 아니라 지하주차장에서 여러 차량과 건물로 손해가 확산될 수 있는 집적위험을 하나의 위험 집단으로 관리할 수 있습니다.',
  '대상 차량 명부를 통해 보험대상과 노출 규모를 명확히 식별하고 관리하기 쉽습니다.',
  '제조사·수입사, 협회·기관 등 단체계약 후보와 리콜·점검 등 위험관리 책임을 연결할 수 있습니다.',
  '자동차보험·자기차량손해 담보·화재보험 등 기존 보험 적용 후에도 남을 수 있는 제3자 직접 재산손해를 보완할 수 있습니다.',
  '피해자 신속 보상과 책임주체에 대한 사후 구상을 함께 검토할 수 있습니다.',
] as const

const proposalReasonTitle = (_reason: string, index: number): string => PROPOSAL_REASON_TITLES[index] ?? `우선 검토 근거 ${String(index + 1).padStart(2, '0')}`
const proposalReasonDescription = (reason: string, index: number): string => PROPOSAL_REASON_DESCRIPTIONS[index] ?? reason

const proposalRecommendationReasons = (data: ReportView['productProposal']): string[] => [
  data.recommendationReason,
  data.coveredObject?.includes('명부') ? '대상 차량 명부를 통해 보험대상과 노출 위험을 관리하기 쉽습니다.' : '',
  data.expectedPolicyholder?.length ? '제조·수입사, 협회·기관 등 단체 계약 후보와 위험관리 책임을 연결할 수 있습니다.' : '',
  data.coveredLoss?.includes('제3자') ? '기존 보험 적용 후 남을 수 있는 제3자 직접 재산손해를 보완하는 방향입니다.' : '',
  data.settlementDirection?.includes('구상') ? '피해자 신속 보상과 책임주체에 대한 사후 구상을 함께 검토할 수 있습니다.' : '',
].filter((item): item is string => Boolean(item)).slice(0, 5)

const proposalRecommendationSummary = (data: ReportView['productProposal']): string => {
  const parts = [
    /기업|기관|단체/.test(data.recommendedForm ?? '') ? '기업·기관 단체계약과 대상 차량 명부를 기반으로' : '',
    data.existingInsuranceRelationship ? '기존 보험 적용 후 남는 제3자 직접 재산손해를 보완하는 방향입니다.' : '',
  ].filter(Boolean)
  return parts.join(' ') || data.recommendationReason || '현재 자료를 기준으로 우선 검토할 계약 구조입니다.'
}

const proposalRoleRows = (data: ReportView['productProposal'], target: ReportView['targetSuitability']): ProposalRoleRow[] => {
  const findRole = (pattern: RegExp) => target.roleStructure?.find((item) => pattern.test(item.role))
  const candidate = (pattern: RegExp, fallback: string) => findRole(pattern)?.candidates?.join(' · ') || fallback
  const question = (pattern: RegExp, fallback: string) => findRole(pattern)?.question || fallback
  return [
  {
    role: '보험계약자',
    candidate: candidate(/보험계약자/, data.expectedPolicyholder?.join(' · ') || proposalFallback),
    decision: question(/보험계약자/, '실제 계약 권한과 보험료 부담 주체를 확정합니다.'),
    status: findRole(/보험계약자/)?.status,
  },
  {
    role: '피보험자',
    candidate: candidate(/피보험자/, data.expectedInsured || proposalFallback),
    decision: question(/피보험자/, '법적 책임과 피보험이익을 누구에게 연결할지 검토합니다.'),
    status: findRole(/피보험자/)?.status,
  },
  {
    role: '피해자·청구권자',
    candidate: candidate(/피해자/, data.coveredLoss?.includes('제3자') ? '제3자 자동차·건물 등 재산 피해자 후보' : proposalFallback),
    decision: question(/피해자/, '피해자의 직접청구 가능 여부와 보험금 지급 구조를 검토합니다.'),
    status: findRole(/피해자/)?.status,
  },
  {
    role: '보험료 부담자',
    candidate: candidate(/보험료 부담/, '현재 자료에서 확정되지 않음'),
    decision: question(/보험료 부담/, '제조·수입사, 관련 기관, 공공지원 또는 공동부담 조건을 검토합니다.'),
    status: findRole(/보험료 부담/)?.status,
  },
  {
    role: '위험관리 주체',
    candidate: candidate(/위험관리/, data.settlementDirection?.includes('제조사') ? '제조사·충전사업자·시설 관리자 후보' : proposalFallback),
    decision: question(/위험관리/, '역할별 안전관리·점검 의무를 구분합니다.'),
    status: findRole(/위험관리/)?.status,
  },
  ]
}

const proposalPaymentFlow = [
  '대상 차량 명부와 사고 요건 확인',
  '자동차보험·자차보험·화재보험 등 기존 보험 적용 여부 확인',
  '기존 보험으로 보상되지 않은 직접 재산손해 산정',
  '약관상 지급요건을 충족한 손해를 보완보험에서 지급',
  '책임주체 확정 후 제조사·충전사업자·시설 관리자 등에 구상 검토',
]

const proposalDesignVariables = (data: ReportView['productProposal']): ProposalDesignVariable[] => [
  { label: '보험기간', direction: data.policyPeriodDirection, owner: '상품 검토 필요' },
  { label: '사고당 보상한도', direction: data.coverageLimitDirection, owner: '계리·재보험 검토 필요' },
  { label: '연간 총보상한도', direction: data.coverageLimitDirection ? '반복 사고와 누적위험을 고려해 별도 산정' : undefined, owner: '계리·재보험 검토 필요' },
  { label: '자기부담금', direction: data.deductibleDirection, owner: '상품·계리 검토 필요' },
  { label: '재보험 구조', direction: data.unresolvedItems?.some((item) => item.includes('재보험')) ? '집적위험과 수용조건을 반영해 검토' : undefined, owner: '재보험 검토 필요' },
]

const proposalUnderwritingGroups = (items?: string[]) => [
  { title: '필수 확인', items: (items ?? []).filter((item) => /식별|명부|개조|리콜|점검 이력/.test(item)) },
  { title: '시설 조건', items: (items ?? []).filter((item) => /충전|주차장|소방|시설|안전점검/.test(item)) },
  { title: '추가 확인', items: (items ?? []).filter((item) => !/식별|명부|개조|리콜|점검 이력|충전|주차장|소방|시설|안전점검/.test(item)) },
].filter((group) => group.items.length)

const proposalCoverageGroups = (items?: string[]) => {
  const source = items ?? []
  return [
    { title: '기본계약 제외 검토', badge: '제외 검토', items: source.filter((item) => /자체|일반 도로/.test(item)) },
    { title: '선택 특약 검토', badge: '특약 검토', items: source.filter((item) => /신체|영업중단|사용손실/.test(item)) },
    { title: '분류 추가 검토', badge: '분류 추가 검토', items: source.filter((item) => !/자체|일반 도로|신체|영업중단|사용손실/.test(item)) },
  ].filter((group) => group.items.length)
}

const proposalTaskOwner = (task: string): string => {
  if (/계약자|피보험자/.test(task)) return '상품·법무'
  if (/보험료/.test(task)) return '상품·영업·정책협력'
  if (/기존 보험/.test(task)) return '상품·보상·법무'
  if (/보상한도/.test(task)) return '계리·재보험'
  if (/재보험/.test(task)) return '계리·재보험'
  return '담당 분야 확인 필요'
}

const safeProposalEvent = (value?: string): string => value?.replace(/발생시킨/g, '발생한 것으로 확인되는') || proposalFallback

function ProposalField({ label, value, tone }: { label: string; value?: string; tone: string }) {

  const text = value || proposalFallback
  const sentence = text.match(/^(.+?[.!?])\s*(.*)$/u)
  const lead = sentence?.[1] || text
  const detail = sentence?.[2]
  return (
    <div className={`report-page__proposal-core-item report-page__proposal-core-item--${tone}`}>
      <dt>{label}</dt>
      <dd><strong>{lead}</strong>{detail ? <span>{detail}</span> : null}</dd>
    </div>
  )
}

function ProductProposalSection({ report, onNavigateTab }: { report: ReportView; onNavigateTab?: (id: ReportTabId) => void }) {
  const data = report.productProposal
  const actualEvidence = report.evidence.filter((item) => !item.isMockData)
  const target = report.targetSuitability
  const roleRows = proposalRoleRows(data, target)
  const recommendationReasons = proposalRecommendationReasons(data)
  const underwritingGroups = proposalUnderwritingGroups(data.underwritingCandidates)
  const coverageGroups = proposalCoverageGroups(data.outOfScopeCandidates)
  const designVariables = proposalDesignVariables(data)
  const tags = proposalTags(data)
  const preferredForm = target.options?.find((option) => option.rank === 1)
  const corporateForm = target.options?.find((option) => option.id === 'corporate')
  const individualForm = target.options?.find((option) => option.id === 'individual')

  return (
    <section className="report-page__section report-page__proposal-section" aria-labelledby="proposal-title">
      <SectionHeading
        number="05"
        eyebrow="PRODUCT PROPOSAL"
        title={reportLabel(report, 'proposalTitle', 'AI 제안 상품 구조(검토 초안)')}
        aside={<StatusBadge>{data.status}</StatusBadge>}
      />
      <p className="report-page__notice report-page__proposal-disclaimer" id="proposal-title">
        이 페이지는 상품·법무·계리·보상 검토를 위한 AI 제안 초안입니다. 보험료·요율·보상한도·자기부담금과 최종 법적 역할은 확정하지 않습니다.
      </p>

      <section className="report-page__proposal-recommendation" aria-labelledby="proposal-recommendation-title">
        <div className="report-page__proposal-recommendation-copy">
          <div className="report-page__proposal-recommendation-label"><span className="report-page__proposal-ai-badge">AI 우선 추천</span><span className="report-page__proposal-review-badge">검토안</span></div>
          <p className="report-page__eyebrow">PRIORITY PRODUCT STRUCTURE</p>
          <h3 id="proposal-recommendation-title">{proposalFormLabel(data.recommendedForm)}</h3>
          <p>{proposalRecommendationSummary(data)}</p>
          <div className="report-page__proposal-tags" aria-label="추천 구조 핵심 특징">{tags.map((tag) => <span className={`report-page__proposal-tag--${proposalTagTone(tag)}`} key={tag}>{tag}</span>)}</div>
        </div>
        <div className="report-page__proposal-working-name"><span>가칭 상품명</span><strong>{data.workingName || '상품명 추가 확인 필요'}</strong><small>검토 과정에서 변경될 수 있습니다.</small></div>
      </section>

      <section className="report-page__proposal-reasons" aria-labelledby="proposal-reasons-title">
        <div className="report-page__proposal-section-heading"><div><h3 id="proposal-reasons-title">AI 추천 이유</h3><p>현재 리포트의 위험·보장 공백·근거자료를 바탕으로 정리한 우선 검토 이유입니다.</p></div></div>
        <ol>{recommendationReasons.map((reason, index) => <li key={`${reason}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><h4>{proposalReasonTitle(reason, index)}</h4><p>{proposalReasonDescription(reason, index)}</p></div></li>)}</ol>
      </section>

      <section className="report-page__proposal-forms" aria-labelledby="proposal-forms-title">
        <div className="report-page__proposal-section-heading"><div><h3 id="proposal-forms-title">상품 형태 검토</h3><p>{target.recommendationLabel || '우선 추천과 대안의 검토 순서를 구분한 초안입니다.'}</p></div></div>
        <div className="report-page__proposal-form-list">
          <article className="report-page__proposal-form-option report-page__proposal-form-option--recommended"><span className="report-page__proposal-form-label">우선 추천</span><h4>{proposalFormLabel(data.recommendedForm)}</h4>{preferredForm?.suitability ? <span className="report-page__proposal-form-suitability">{preferredForm.suitability}</span> : null}<p>{preferredForm?.reason || '대상 차량 명부와 단체계약 후보를 활용해 위험 집단과 피해자 보호를 연결하는 방향입니다.'}</p>{preferredForm?.limitation ? <small>{preferredForm.limitation}</small> : null}</article>
          <article className="report-page__proposal-form-option"><span className="report-page__proposal-form-label">대안 검토</span><h4>기업보험형</h4>{corporateForm?.suitability ? <span className="report-page__proposal-form-suitability">{corporateForm.suitability}</span> : null}<p>{corporateForm?.reason || (data.alternativeForms ?? []).filter((item) => /제조|수입|협회|기관/.test(item)).join(' · ') || proposalFallback}</p>{corporateForm?.limitation ? <small>{corporateForm.limitation}</small> : null}</article>
          <article className="report-page__proposal-form-option"><span className="report-page__proposal-form-label">제한적 대안</span><h4>개인가입형</h4>{individualForm?.suitability ? <span className="report-page__proposal-form-suitability">{individualForm.suitability}</span> : null}<p>{individualForm?.reason || (data.alternativeForms ?? []).find((item) => /특별약관|부가/.test(item)) || proposalFallback}</p>{individualForm?.limitation ? <small>{individualForm.limitation}</small> : null}</article>
        </div>
      </section>

      <section className="report-page__proposal-roles" aria-labelledby="proposal-roles-title">
        <div className="report-page__proposal-section-heading"><div><h3 id="proposal-roles-title">계약·보호 역할 구조</h3><p>각 역할은 최종 확정값이 아닌 AI 제안 후보이며, 법무·상품 검토 후 결정합니다.</p></div></div>
        <div className="report-page__proposal-role-table-wrap"><table className="report-page__proposal-role-table"><thead><tr><th>역할</th><th>AI 제안 후보</th><th>추가 결정사항</th></tr></thead><tbody>{roleRows.map((row) => <tr key={row.role}><th scope="row"><strong>{row.role}</strong>{row.status ? <small>{row.status}</small> : null}</th><td data-label="AI 제안 후보">{row.candidate}</td><td data-label="추가 결정사항">{row.decision}</td></tr>)}</tbody></table></div>
        {target.caution ? <p className="report-page__proposal-roles-note">{target.caution}</p> : null}
      </section>

      <section className="report-page__proposal-flow" aria-labelledby="proposal-flow-title">
        <div className="report-page__proposal-section-heading"><div><h3 id="proposal-flow-title">예상 보험금 지급 흐름</h3><p>우선 검토 방향이며 실제 지급 순서는 상품·법무·보상 검토 후 확정합니다.</p></div><span className="report-page__proposal-review-badge">우선 검토 방향</span></div>
        <ol>{proposalPaymentFlow.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol>
        <p className="report-page__proposal-flow-note">책임 확정 전 선지급은 최종 확정 구조가 아니며, 지급요건과 사후 구상 절차를 별도로 정해야 합니다.</p>
      </section>

      <section className="report-page__proposal-core" aria-labelledby="proposal-core-title">
        <div className="report-page__proposal-section-heading"><div><h3 id="proposal-core-title">핵심 보장 구조</h3><p>보험의 목적과 보장 손해, 기존 보험과의 관계를 한 묶음으로 확인합니다.</p></div></div>
        <dl className="report-page__proposal-core-grid">
           <ProposalField label="보험의 목적·보장 대상" value={data.coveredObject} tone="object" />
           <ProposalField label="보장 사고" value={safeProposalEvent(data.coveredEvent)} tone="event" />
           <ProposalField label="보장 손해" value={data.coveredLoss} tone="loss" />
           <ProposalField label="기존 보험과의 관계" value={data.existingInsuranceRelationship} tone="existing" />
           <ProposalField label="보험금 지급 및 구상 방향" value={data.settlementDirection} tone="settlement" />
         </dl>
       </section>

       <section className="report-page__proposal-variables" aria-labelledby="proposal-variables-title">
         <details className="report-page__proposal-variables-details">
           <summary><span><strong id="proposal-variables-title">추가 검토 후 확정할 설계 조건</strong><small>보험기간, 보상한도, 자기부담금 등은 사고·손해 데이터와 내부 검토 후 확정합니다.</small></span><em>5개 항목 · 계리·내부자료 확인 필요</em></summary>
           <div className="report-page__proposal-variable-grid">{designVariables.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.direction || proposalFallback}</strong><small>{item.owner}</small></article>)}</div>
         </details>
       </section>

      <section className="report-page__proposal-underwriting" aria-labelledby="proposal-underwriting-title">
        <div className="report-page__proposal-section-heading"><div><h3 id="proposal-underwriting-title">인수조건 검토</h3><p>현재 인수조건 후보를 확인 우선순위별로 묶었습니다. 확인 주체는 운영자료 검토 후 정합니다.</p></div></div>
        <div className="report-page__proposal-underwriting-grid">{underwritingGroups.map((group) => <article key={group.title}><h4>{group.title}</h4><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div>
      </section>

      <section className="report-page__proposal-coverage" aria-labelledby="proposal-coverage-title">
        <div className="report-page__proposal-section-heading"><div><h3 id="proposal-coverage-title">담보 범위 검토</h3><p>최종 제외나 특약 확정이 아닌 분류 검토안입니다.</p></div></div>
        <div className="report-page__proposal-coverage-grid">{coverageGroups.map((group) => <article key={group.title}><div><h4>{group.title}</h4><span>{group.badge}</span></div><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div>
      </section>

      {data.unresolvedItems?.length ? (
        <section className="report-page__proposal-tasks" aria-labelledby="proposal-tasks-title">
          <div className="report-page__proposal-section-heading"><div><h3 id="proposal-tasks-title">구조 확정을 위한 다음 검토 과제</h3><p>현재 구조를 확정하기 전에 담당 분야가 확인할 항목입니다.</p></div><span>{data.unresolvedItems.length}건</span></div>
          <ol>{data.unresolvedItems.map((task, index) => <li key={task}><span>{String(index + 1).padStart(2, '0')}</span><div><h4>{task}</h4><p>담당 분야(검토안) · {proposalTaskOwner(task)}</p></div></li>)}</ol>
        </section>
      ) : null}

      <section className="report-page__proposal-evidence" aria-labelledby="proposal-evidence-title">
        <div className="report-page__proposal-section-heading"><div><h3 id="proposal-evidence-title">AI 추천 근거 연결</h3><p>상품 구조 전용 근거 ID는 현재 데이터에 별도로 연결되어 있지 않습니다. 보고서에 등록된 실제 참고자료를 근거자료 탭에서 확인하세요.</p></div><span>{actualEvidence.length}건</span></div>
        <ul>{actualEvidence.slice(0, 3).map((item) => <li key={item.id}><strong>{item.title}</strong><small>{item.id}</small></li>)}</ul>
        {onNavigateTab ? <button className="report-page__text-button report-page__no-print" type="button" onClick={() => onNavigateTab('evidence')}>근거자료 탭에서 전체 확인 →</button> : null}
      </section>
    </section>
  )
}
*/

const PRICING_EFFECT_KEYWORDS = ['사고당 보상한도', '재보험 필요성', '불확실성 가산', '자기부담금', '손해 규모', '보험료', 'PML'] as const
const PRICING_EFFECT_PATTERN = new RegExp(`(${PRICING_EFFECT_KEYWORDS.join('|')})`, 'g')

const renderPricingEffect = (text: string) => text.split(PRICING_EFFECT_PATTERN).map((part, index) => (
  PRICING_EFFECT_KEYWORDS.includes(part as typeof PRICING_EFFECT_KEYWORDS[number])
    ? <strong key={`${text}-${index}`}>{part}</strong>
    : <span key={`${text}-${index}`}>{part}</span>
))

function ProductProposalSection({ report, onNavigateTab, printMode = false }: { report: ReportView; onNavigateTab?: (id: ReportTabId) => void; printMode?: boolean }) {
  const actualEvidence = report.evidence.filter((item) => !item.isMockData)
  void onNavigateTab

  const basePricing = PROPOSAL_PRICING_SCENARIO_OUTPUTS.find((scenario) => scenario.id === 'base') ?? PROPOSAL_PRICING_SCENARIO_OUTPUTS[0]
  const lowPricing = PROPOSAL_PRICING_SCENARIO_OUTPUTS.find((scenario) => scenario.id === 'low') ?? PROPOSAL_PRICING_SCENARIO_OUTPUTS[0]
  const highPricing = PROPOSAL_PRICING_SCENARIO_OUTPUTS.find((scenario) => scenario.id === 'high') ?? PROPOSAL_PRICING_SCENARIO_OUTPUTS[PROPOSAL_PRICING_SCENARIO_OUTPUTS.length - 1]

  type PricingCard = {
    id: string
    title: string
    value: string
    subvalue: string
    values: (scenario: ProposalPricingScenarioOutput) => string
    evidence: {
      formula: string
      assumptions: readonly string[]
      factors: readonly string[]
      references: readonly string[]
    }
  }

  const basePmlScenario = FEASIBILITY_PML_DATA.scenarios.find((scenario) => scenario.id === FEASIBILITY_PML_DATA.baseScenario) ?? FEASIBILITY_PML_DATA.scenarios[0]
  const pmlScenarioValue = (scenarioId: FeasibilityPmlScenarioId) => FEASIBILITY_PML_DATA.scenarios.find((scenario) => scenario.id === scenarioId)?.result ?? 0

  const pricingCards: PricingCard[] = [
    {
      id: 'pml',
      title: '최대가능손해(PML)',
      value: formatKrwCompact(basePmlScenario.result),
      subvalue: `추정 범위: ${formatKrwCompact(FEASIBILITY_PML_DATA.range.low)} ~ ${formatKrwCompact(FEASIBILITY_PML_DATA.range.high)}`,
      values: (scenario) => formatKrwCompact(pmlScenarioValue(scenario.id as FeasibilityPmlScenarioId)),
      evidence: {
        formula: 'PML = 전소 차량 손해 + 부분 피해 차량 손해 + 시설·긴급대응 비용',
        assumptions: FEASIBILITY_PML_DATA.assumptions,
        factors: FEASIBILITY_PML_DATA.damageBasis.categories,
        references: FEASIBILITY_PML_DATA.references,
      },
    },
    {
      id: 'annual-loss',
      title: '예상 연간 손해액',
      value: formatKrwCompact(basePricing.expectedAnnualLoss),
      subvalue: `통상손해 ${formatKrwCompact(basePricing.ordinaryExpectedLoss)} + 꼬리위험 ${formatKrwCompact(basePricing.tailRiskAmount)}`,
      values: (scenario) => formatKrwCompact(scenario.expectedAnnualLoss),
      evidence: {
        formula: '예상 연간 손해액 = PML × 연간 사고확률 × 평균 손해심도 + 대형사고 위험가산',
        assumptions: ['사고확률은 공개 전기차 화재 통계를 기준으로 Low / Base / High 설정', '평균 손해심도는 PML 대비 비율로 추정', '대형사고 위험은 별도 가산율 반영'],
        factors: ['연간 사고확률', '평균 손해심도', '꼬리위험 가산율'],
        references: ['상품화 종합평가 PML', '공개 전기차 화재 통계', '프로토타입 산식'],
      },
    },
    {
      id: 'premium',
      title: '제안 보험료 범위',
      value: formatKrwCompact(basePricing.proposedPremium),
      subvalue: `${formatKrwCompact(lowPricing.proposedPremium)}~${formatKrwCompact(highPricing.proposedPremium)} · 시설당 연간`,
      values: (scenario) => formatKrwCompact(scenario.proposedPremium),
      evidence: {
        formula: '보험료 = 예상 연간 손해액 ÷ 목표 손해율 + 사업비 + 불확실성 가산',
        assumptions: ['목표 손해율은 프로토타입 기준 적용', '사업비와 불확실성 가산을 포함', '실제 계약 데이터 연동 전 1차 추정값'],
        factors: ['목표 손해율', '사업비', '불확실성 가산'],
        references: ['예상 연간 손해액 산출 결과', '상품화 종합평가 PML', '프로토타입 요율 가정'],
      },
    },
    {
      id: 'loss-ratio',
      title: '예상 손해율',
      value: `${basePricing.lossRatio.toFixed(1)}%`,
      subvalue: '예상 연간 손해액 ÷ 제안 보험료',
      values: (scenario) => `${scenario.lossRatio.toFixed(1)}%`,
      evidence: {
        formula: '손해율 = 예상 연간 손해액 ÷ 보험료',
        assumptions: ['보험료는 1차 제안 보험료 범위 기준', '사고확률과 손해심도 시나리오 반영'],
        factors: ['예상 연간 손해액', '제안 보험료'],
        references: ['예상 연간 손해액', '제안 보험료 범위', '프로토타입 손해율 산식'],
      },
    },
    {
      id: 'limits',
      title: '보상한도·자기부담금·재보험',
      value: `사고당 ${formatKrwCompact(basePricing.proposedLimit)}`,
      subvalue: `총한도 ${formatKrwCompact(basePricing.aggregateLimit)} · 자기부담금 ${formatKrwCompact(basePricing.deductible)} · 재보험 ${basePricing.reinsuranceDecision}`,
      values: (scenario) => `${formatKrwCompact(scenario.proposedLimit)} / ${formatKrwCompact(scenario.aggregateLimit)} / ${formatKrwCompact(scenario.deductible)} · ${scenario.reinsuranceDecision}`,
      evidence: {
        formula: '사고당 한도 = PML × 일정 비율 · 총한도 = 사고당 한도 × 누적위험 가산',
        assumptions: ['다수 차량 손해와 시설 손해 동시 발생 가정', '사고당 한도와 총한도는 별도 설정', '대형 누적손해 가능 시 재보험 검토'],
        factors: ['PML', '누적손해 가능성', '보상한도 구조', '자기부담금 수준'],
        references: ['상품화 종합평가 PML', '보유한도와 누적위험 검토', '재보험 검토 기준'],
      },
    },
  ]

  const proposalHeroFacts = [
    ['계약자', PROPOSAL_HERO_FACTS.find(([label]) => label === '주요 계약자 후보')?.[1] ?? '주차시설 운영자·건물 소유자'],
    ['개발 형태', '기존 상품 특약'],
    ['보장 범위', '제3자 차량·시설 직접손해'],
  ] as const
  const proposalRelatedInsurance = PROPOSAL_HERO_FACTS.find(([label]) => label === '연계 보험')?.[1] ?? ''

  return (
    <section className="report-page__section report-page__proposal-section" aria-label="상품 개발 제안">
      <SectionHeading number="05" eyebrow="PRODUCT DEVELOPMENT PROPOSAL" title="상품 개발 제안" />

      <section className="report-page__proposal-hero" aria-labelledby="proposal-hero-title">
        <div className="report-page__proposal-hero-copy">
          <div className="report-page__proposal-hero-labels">
            <p className="report-page__eyebrow">AI PRODUCT DEVELOPMENT PROPOSAL</p>
            <span>AI 1차 상품개발안</span>
          </div>
          <h3 id="proposal-hero-title">기업성 일반보험 특약</h3>
          <p className="report-page__proposal-hero-description">주차시설 운영자가 가입하여, 기존 보험 적용 후 남는 <em>제3자 차량·시설의 직접손해를 보완</em>하는 단체계약형 특약</p>
          <dl className="report-page__proposal-facts">{proposalHeroFacts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {proposalRelatedInsurance ? <p className="report-page__proposal-related-insurance"><span>연계 보험</span> · {proposalRelatedInsurance}</p> : null}
        </div>
      </section>

      <section className="report-page__proposal-reasons" aria-labelledby="proposal-reasons-title">
        <div className="report-page__proposal-section-heading"><div><p className="report-page__eyebrow">WHY THIS FORM</p><h3 id="proposal-reasons-title">우선 추천 이유</h3><p>이 상품 형태를 1차 개발안으로 제안한 핵심 근거입니다.</p></div></div>
        <div className="report-page__proposal-recommendation-grid">
          <ol>{PROPOSAL_RECOMMENDATION_DISPLAY.map((reason, index) => <li key={reason.id}><div><small>{String(index + 1).padStart(2, '0')}</small><h4>{reason.title}</h4><ul>{reason.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></div></li>)}</ol>
          <details className="report-page__proposal-recommendation-detail" open={printMode}><summary>추가 근거 상세 보기 <span>4개 영역</span></summary><div className="report-page__proposal-detail-block-grid">{PROPOSAL_RECOMMENDATION_DETAIL_BLOCKS.map((block) => <article key={block.title}><h4>{block.title}</h4><ul>{block.items.slice(0, 2).map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div></details>
        </div>
      </section>

      <section className="report-page__proposal-metrics" aria-labelledby="proposal-metrics-title">
        <div className="report-page__proposal-section-heading"><div><p className="report-page__eyebrow">FIRST PRICING VIEW</p><h3 id="proposal-metrics-title">1차 가격·손해지표</h3><p>상품화 종합평가 PML과 명시된 프로토타입 가정을 연결한 1차 산출값입니다.</p></div></div>
        <p className="report-page__proposal-metric-note">공개자료와 mock 산식을 적용한 1차 추정 결과입니다.</p>
        <div className="report-page__proposal-metric-grid">
          {pricingCards.map((card) => (
            <article className={'report-page__proposal-metric report-page__proposal-metric--' + card.id} key={card.id}>
              <h4>{card.title}</h4>
              <strong className="report-page__proposal-metric-value">{card.value}</strong>
              <p className="report-page__proposal-metric-subvalue">{card.subvalue}</p>
              <div className="report-page__proposal-scenario-values" aria-label={card.title + ' 시나리오 값'}>
                {PROPOSAL_PRICING_SCENARIO_OUTPUTS.map((scenario) => <div className={scenario.id === 'base' ? 'is-base' : undefined} key={scenario.id}><span>{scenario.label}</span><strong>{card.values(scenario)}</strong></div>)}
              </div>
              {card.id === 'pml' ? <p className="report-page__proposal-metric-source">산출 기준 · 상품화 종합평가 PML</p> : null}
              <details className="report-page__proposal-metric-details" open={printMode}>
                <summary>산출식·적용 가정 보기</summary>
                {card.id === 'pml' ? (
                  <div className="report-page__proposal-pml-table-wrap">
                    <table className="report-page__proposal-pml-table">
                      <caption>상품화 종합평가 PML 산정표</caption>
                      <thead><tr><th>시나리오</th><th>전소 차량 손해</th><th>부분 피해 차량 손해</th><th>시설·긴급대응 비용</th><th>최종 PML</th></tr></thead>
                      <tbody>{FEASIBILITY_PML_DATA.scenarios.map((scenario) => <tr key={scenario.id} className={scenario.id === FEASIBILITY_PML_DATA.baseScenario ? 'is-base' : undefined}><th scope="row">{scenario.label}</th><td>{formatKrwCompact(scenario.breakdown.totalLossVehicleDamage)}</td><td>{formatKrwCompact(scenario.breakdown.partialDamageVehicleDamage)}</td><td>{formatKrwCompact(scenario.breakdown.facilityEmergencyCost)}</td><td><strong>{formatKrwCompact(scenario.result)}</strong></td></tr>)}</tbody>
                    </table>
                  </div>
                ) : null}
                <dl className="report-page__proposal-metric-evidence">
                  <div><dt>산출식</dt><dd>{card.evidence.formula}</dd></div>
                  <div><dt>적용 가정</dt><dd><ul>{card.evidence.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul></dd></div>
                  <div><dt>반영 요소</dt><dd><ul>{card.evidence.factors.map((factor) => <li key={factor}>{factor}</li>)}</ul></dd></div>
                  <div><dt>참고 기준</dt><dd><ul>{card.evidence.references.map((reference) => <li key={reference}>{reference}</li>)}</ul></dd></div>
                </dl>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className="report-page__proposal-roles" aria-labelledby="proposal-roles-title">
        <div className="report-page__proposal-section-heading"><div><p className="report-page__eyebrow">CONTRACT & PROTECTION RELATIONSHIP</p><h3 id="proposal-roles-title">계약 및 보호 관계</h3><p>가입·보호·청구 관계를 상품개발 초안 기준으로 구분합니다.</p></div></div>
        <div className="report-page__proposal-role-grid">{PROPOSAL_CONTRACT_ROLE_SUMMARY.map((role) => <article className="report-page__proposal-role-card" key={role.id}><h4>{role.title}</h4><p className="report-page__proposal-role-proposal">{role.proposal}</p><ul>{role.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>{'note' in role ? <p className="report-page__proposal-condition-note">{role.note}</p> : null}</article>)}</div>
      </section>

      <section className="report-page__proposal-flow" aria-labelledby="proposal-flow-title">
        <div className="report-page__proposal-section-heading"><div><p className="report-page__eyebrow">CLAIM FLOW</p><h3 id="proposal-flow-title">보험금 지급 흐름</h3><p>사고 확인부터 지급·구상 검토까지의 기본 절차입니다.</p></div></div>
        <ol>{PROPOSAL_CLAIM_FLOW_DISPLAY.map((step, index) => <li key={step.id}><div className="report-page__proposal-flow-step-head"><span>{String(index + 1).padStart(2, '0')}</span><h4>{step.label}</h4></div><span className={`report-page__proposal-flow-arrow${index === PROPOSAL_CLAIM_FLOW_DISPLAY.length - 1 ? ' is-empty' : ''}`} aria-hidden="true">→</span><ul>{step.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></li>)}</ol>
        <p className="report-page__proposal-flow-note">기존 보험의 지급액 차감 방식과 책임 확정 전 지급 여부는 약관 초안에서 구체화합니다.</p>
      </section>

      <section className="report-page__proposal-coverage" aria-labelledby="proposal-coverage-title">
        <div className="report-page__proposal-section-heading"><div><p className="report-page__eyebrow">COVERAGE STRUCTURE</p><h3 id="proposal-coverage-title">보장 구조 요약</h3><p>기본·선택·제외 범위를 짧게 구분한 1차 보장 구조입니다.</p></div></div>
        <div className="report-page__proposal-coverage-summary-grid"><article className="is-basic"><div className="report-page__proposal-coverage-category"><span aria-hidden="true">✓</span><small>기본</small></div><h4>기본 담보</h4><ul>{PROPOSAL_COVERAGE_SUMMARY.basic.map((item) => <li key={item.title}><div><strong>{item.title}</strong><p>{item.description}</p></div></li>)}</ul></article><article className="is-optional"><div className="report-page__proposal-coverage-category"><span aria-hidden="true">＋</span><small>선택</small></div><h4>선택 담보</h4><ul><li><div><strong>{PROPOSAL_COVERAGE_SUMMARY.optional.title}</strong><p>{PROPOSAL_COVERAGE_SUMMARY.optional.description}</p></div></li></ul></article><article className="is-excluded"><div className="report-page__proposal-coverage-category"><span aria-hidden="true">−</span><small>제외</small></div><h4>보장 제외</h4><ul>{PROPOSAL_COVERAGE_SUMMARY.excluded.map((item) => <li key={item}><div><strong>{item}</strong></div></li>)}</ul></article></div>
      </section>

      <section className="report-page__proposal-underwriting" aria-labelledby="proposal-underwriting-title">
        <div className="report-page__proposal-section-heading"><div><p className="report-page__eyebrow">PRICING & LIMIT FACTORS</p><h3 id="proposal-underwriting-title">가격·한도에 반영할 위험요인</h3><p>시설별 위험 차이를 보험료, 보상한도와 자기부담금에 반영하기 위한 핵심 기준입니다.</p></div></div>
        <div className="report-page__proposal-underwriting-judgment"><strong>{PROPOSAL_UNDERWRITING_AI_SUMMARY.label}</strong><p>{PROPOSAL_UNDERWRITING_AI_SUMMARY.prefix}<em className="is-risk">{PROPOSAL_UNDERWRITING_AI_SUMMARY.exposure}</em>{PROPOSAL_UNDERWRITING_AI_SUMMARY.middle}<em className="is-positive">{PROPOSAL_UNDERWRITING_AI_SUMMARY.mitigation}</em>{PROPOSAL_UNDERWRITING_AI_SUMMARY.suffix}</p></div>
        <div className="report-page__proposal-underwriting-grid">{PROPOSAL_UNDERWRITING_DISPLAY.map((factor, index) => <article className="report-page__proposal-underwriting-card" key={factor.id}><div className="report-page__proposal-underwriting-card-heading"><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h4>{factor.title}</h4></div><p className="report-page__proposal-underwriting-assessment">{factor.aiAssessment}</p><div className="report-page__proposal-underwriting-block"><h5>확인 요소</h5><ul>{factor.criteria.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="report-page__proposal-underwriting-block report-page__proposal-underwriting-block--pricing"><h5>가격·한도 반영</h5><ul>{factor.pricingEffects.map((item) => <li key={item}>{renderPricingEffect(item)}</li>)}</ul></div>{factor.scenarioReference ? <div className="report-page__proposal-underwriting-scenario"><h5>현재 시나리오 연결</h5><p>상품화 종합평가 PML · Low {formatKrwCompact(factor.scenarioReference.low)} / Base {formatKrwCompact(factor.scenarioReference.base)} / High {formatKrwCompact(factor.scenarioReference.high)}</p></div> : null}</article>)}</div>
        <div className="report-page__proposal-underwriting-condition-map"><h4>상품 조건 반영 방식</h4><ul>{PROPOSAL_UNDERWRITING_DISPLAY.map((factor) => <li key={factor.id}><strong>{factor.title}</strong><span aria-hidden="true">→</span><em>{factor.conditionImpact}</em></li>)}</ul></div>
        <p className="report-page__proposal-underwriting-note">프로토타입 시나리오 기준 · 실제 시설정보 연결 시 자동 보정</p>
      </section>

      <section className="report-page__proposal-decisions" aria-labelledby="proposal-decisions-title">
        <div className="report-page__proposal-section-heading"><div><p className="report-page__eyebrow">PRODUCT DEVELOPMENT DECISIONS</p><h3 id="proposal-decisions-title">상품개발 확정사항</h3><p>실제 상품개발 전 우선 확정하거나 약관 기준으로 설정할 항목입니다.</p></div></div>
        <ul>{PROPOSAL_DECISIONS.map((decision) => <li key={decision.id}><span className="report-page__proposal-decision-check" aria-hidden="true">□</span><span>{decision.text}</span></li>)}</ul>
      </section>

      <section className="report-page__proposal-evidence" aria-labelledby="proposal-evidence-title">
        <div className="report-page__proposal-section-heading"><div><p className="report-page__proposal-evidence-eyebrow report-page__eyebrow">CALCULATION EVIDENCE & CONFIDENCE</p><h3 id="proposal-evidence-title">산출 근거와 신뢰도</h3><p>가격·손해지표에 사용한 근거, 계산 방식과 결과를 바꾸는 핵심 변수를 확인합니다.</p></div><span className="report-page__proposal-evidence-confidence">산출 신뢰도 · {PROPOSAL_CALCULATION_EVIDENCE.confidence}</span></div>
        <div className="report-page__proposal-evidence-grid">
          <article>
            <h4>사용한 근거</h4>
            <ul>{PROPOSAL_CALCULATION_EVIDENCE.used.map((item) => <li key={item.label}><strong>{item.label}</strong><span>{item.detail}</span></li>)}</ul>
            {actualEvidence.length ? <details className="report-page__proposal-evidence-reference" open={printMode}><summary>사용된 근거자료 {actualEvidence.length}건 보기</summary><div className="report-page__proposal-evidence-reference-list">{actualEvidence.map((item) => <span key={item.id}><code>{item.id}</code><span>{item.title}</span></span>)}</div></details> : null}
          </article>
          <article>
            <h4>적용한 산출 방식</h4>
            <ul>{PROPOSAL_CALCULATION_EVIDENCE.methods.map((item) => <li key={item.label}><strong>{item.label}</strong><span>{item.detail}</span></li>)}</ul>
          </article>
          <article>
            <h4>결과를 바꾸는 핵심 변수</h4>
            <ul>{PROPOSAL_CALCULATION_EVIDENCE.variables.map((item) => <li key={item.label}><strong>{item.label}</strong><span className="report-page__proposal-evidence-impact"><span aria-hidden="true">→</span><em>{item.impact}</em></span></li>)}</ul>
          </article>
        </div>
        <p className="report-page__proposal-evidence-note">{PROPOSAL_CALCULATION_EVIDENCE.explanation}</p>
      </section>
    </section>
  )
}

/* Legacy wording layout retained as a reference while the page-specific flow is rebuilt.
function WordingPrintLayout({ report, data }: { report: ReportView; data: ReportView['wordingFeasibility'] }) {
  const definitions = data.definitions ?? []
  const primaryDefinitions = definitions.filter((item) => /기존 약관 참고/.test(String(item.status ?? '')))
  const additionalDefinitions = definitions.filter((item) => !/기존 약관 참고/.test(String(item.status ?? '')))
  const criteria = data.assessmentCriteria ?? []
  const referenceDocuments = data.referenceDocuments ?? []

  return (
    <div className="report-page__wording-print-layout">
      <p className="report-page__wording-print-note">이 PDF는 세 가지 보장 항목의 약관 검토용 mock 결과를 모두 포함합니다. 실제 약관 확정 전 상품·법무·보상 부서의 검토가 필요합니다.</p>
      <div className="report-page__wording-print-bundles">
        {WORDING_COVERAGE_OPTIONS.map((option, index) => (
          <article key={option.id} className="report-page__wording-print-bundle">
            <header><p className="report-page__eyebrow">보장 항목 {String(index + 1).padStart(2, '0')}</p><h3>{option.label}</h3><p>{option.shortDescription}</p></header>
            <div className="report-page__wording-print-conditions">
              <section><h4>보험금 지급요건</h4><ul>{option.paymentConditions.map((condition) => <li key={condition}>{condition}</li>)}</ul></section>
              <section><h4>약관 확정 전 결정 필요</h4><ul>{option.decisions.map((decision) => <li key={decision}>{decision}</li>)}</ul></section>
            </div>
            <section className="report-page__wording-print-draft"><h4>추천 약관 문구 초안</h4><p className="report-page__wording-print-badge">AI 추천 초안 · 실무 검토 전</p><blockquote>{option.draft}</blockquote></section>
            <div className="report-page__wording-print-losses">
              <section className="report-page__wording-loss-card--covered"><h4>보장하는 손해</h4><ul>{option.coveredLosses.map((loss) => <li key={loss}>{loss}</li>)}</ul></section>
              <section className="report-page__wording-loss-card--excluded"><h4>보장하지 않는 손해</h4><p>면책 검토 후보 · 실무 확정 필요</p><ul>{option.excludedLosses.map((loss) => <li key={loss}>{loss}</li>)}</ul></section>
            </div>
          </article>
        ))}
      </div>

      <section className="report-page__wording-print-support"><header><p className="report-page__eyebrow">DETAILED REVIEW</p><h3>약관 초안 작성 가능성 상세 검토</h3><p>AI가 약관 초안을 작성할 수 있다고 판단한 세부 기준과 근거입니다.</p></header><div className="report-page__wording-print-criteria">{criteria.map((item, index) => <article key={String(item.id ?? index)}><div><strong>{String(index + 1).padStart(2, '0')} · {String(item.question ?? '')}</strong><WordingStatusBadge status={String(item.status ?? '')} /></div><p>{String(item.note ?? '')}</p></article>)}</div></section>
      <section className="report-page__wording-print-support"><header><p className="report-page__eyebrow">TERMS & DEFINITIONS</p><h3>약관에서 정의해야 할 핵심 용어</h3></header><div className="report-page__wording-print-terms"><section><h4>기존 약관 참고 가능</h4>{primaryDefinitions.map((item) => <p key={String(item.term)}><strong>{String(item.term ?? '')}</strong> · {String(item.draftDefinition ?? '')}</p>)}</section><section><h4>새롭게 정의가 필요한 용어</h4>{additionalDefinitions.map((item) => <p key={String(item.term)}><strong>{String(item.term ?? '')}</strong> · {String(item.draftDefinition ?? '')}</p>)}</section></div></section>
      <section className="report-page__wording-print-support"><header><p className="report-page__eyebrow">SOURCES & LIMITATIONS</p><h3>참고 약관과 판단 근거</h3></header><div className="report-page__wording-print-references">{referenceDocuments.map((document) => <article key={String(document.id)}><strong>{String(document.name ?? '')}</strong><span>{String(document.id ?? '')} · {String(document.usedFor ?? '')}</span><small>자료 기준일 · {displayDate(report.meta.analysisBaseDate)}</small></article>)}</div><p className="report-page__wording-print-limitation">분석 한계 · 공개자료와 mock 데이터를 바탕으로 한 검토용 초안이며, 실제 약관·상품자료·손해자료의 최신성·적용 범위·법률적 효력은 확정하지 않습니다.</p></section>
    </div>
  )
}

function WordingSection({
  report,
  onOpenDocument,
  onOpenPolicyDraft,
  onNavigateTab,
  printMode = false,
}: {
  report: ReportView
  onOpenDocument: (document: NonNullable<ReportView['wordingFeasibility']['referenceDocuments']>[number]) => void
  onOpenPolicyDraft: () => void
  onNavigateTab?: (id: ReportTabId) => void
  printMode?: boolean
}) {
  const data = report.wordingFeasibility
  const [copyMessage, setCopyMessage] = useState('')
  const [showAlternativeDraft, setShowAlternativeDraft] = useState(false)
  const [showAllDefinitions, setShowAllDefinitions] = useState(false)
  const [selectedCoverageId, setSelectedCoverageId] = useState<WordingCoverageOptionId>('adjacent-vehicle')
  const selectedCoverage = WORDING_COVERAGE_OPTIONS.find((option) => option.id === selectedCoverageId) ?? WORDING_COVERAGE_OPTIONS[0]
  const assessmentCriteria = data.assessmentCriteria ?? []
  const definitions = data.definitions ?? []
  const primaryDefinitions = definitions.filter((item) => /기존 약관 참고/.test(String(item.status ?? '')))
  const additionalDefinitions = definitions.filter((item) => !/기존 약관 참고/.test(String(item.status ?? '')))
  const selectedStructure = (data.structureOptions ?? []).find((option) => option.selected === true)
  const priorityTerms = ['발화 차량', '원인 미상 화재', '하나의 사고']
  const orderedAdditionalDefinitions = [...additionalDefinitions].sort((left, right) => {
    const leftIndex = priorityTerms.indexOf(String(left.term ?? ''))
    const rightIndex = priorityTerms.indexOf(String(right.term ?? ''))
    return (leftIndex < 0 ? priorityTerms.length : leftIndex) - (rightIndex < 0 ? priorityTerms.length : rightIndex)
  })
  const statusCounts = assessmentCriteria.reduce((counts, item) => {
    const tone = wordingStatusTone(String(item.status ?? ''))
    counts[tone] += 1
    return counts
  }, { ready: 0, conditional: 0, decision: 0 } as Record<'ready' | 'conditional' | 'decision', number>)
  const referenceDocuments = data.referenceDocuments ?? []
  const referenceGroups = [
    {
      id: 'direct',
      title: '현재 초안에 직접 활용한 자료',
      items: referenceDocuments.filter((item) => item.includedInAiInput && /보장|보상|보험금|배상/.test(String(item.usedFor ?? ''))),
    },
    {
      id: 'structure',
      title: '약관 구조 참고자료',
      items: referenceDocuments.filter((item) => item.includedInAiInput && !/보장|보상|보험금|배상/.test(String(item.usedFor ?? ''))),
    },
    {
      id: 'validation',
      title: '사후 검증이 필요한 자료',
      items: referenceDocuments.filter((item) => !item.includedInAiInput),
    },
  ].filter((group) => group.items.length > 0)
  const detailedReviewRef = useRef<HTMLElement | null>(null)
  const wordingComponentsRef = useRef<HTMLElement | null>(null)

  const openDetailedReview = () => {
    const section = detailedReviewRef.current
    if (!section) return
    const behavior = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    window.requestAnimationFrame(() => {
      section.scrollIntoView({ behavior, block: 'start' })
      const firstDetails = section.querySelector<HTMLDetailsElement>('details')
      if (firstDetails) firstDetails.open = true
      firstDetails?.querySelector<HTMLElement>('summary')?.focus()
    })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    let previousOpenStates: boolean[] = []
    const getDetails = () => Array.from(wordingComponentsRef.current?.querySelectorAll('details') ?? [])
    const openDetailsForPrint = () => {
      const details = getDetails()
      previousOpenStates = details.map((detail) => detail.open)
      details.forEach((detail) => { detail.open = true })
    }
    const restoreDetailsAfterPrint = () => {
      getDetails().forEach((detail, index) => {
        detail.open = previousOpenStates[index] ?? detail.open
      })
    }
    window.addEventListener('beforeprint', openDetailsForPrint)
    window.addEventListener('afterprint', restoreDetailsAfterPrint)
    return () => {
      window.removeEventListener('beforeprint', openDetailsForPrint)
      window.removeEventListener('afterprint', restoreDetailsAfterPrint)
    }
  }, [])

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(selectedCoverage.draft)
      setCopyMessage('초안 문구를 복사했습니다.')
    } catch {
      setCopyMessage('브라우저에서 복사 권한을 허용해 주세요.')
    }
  }

  return (
    <section ref={wordingComponentsRef} className="report-page__section report-page__wording-section" aria-labelledby="wording-title">
      <SectionHeading number="06" eyebrow="WORDING FEASIBILITY" title="약관화 검토" aside={<span className="report-page__wording-draft-badge">AI 검토용 초안</span>} />
      <p className="report-page__wording-lead" id="wording-title">상품 개발 제안의 보장 대상과 보험금 지급 조건을 구체화하고, 이를 실제 약관 문장으로 표현할 수 있는지 검토합니다.</p>
      <p className="report-page__wording-disclaimer">현재 문구는 공개자료와 mock 데이터를 바탕으로 생성한 검토용 초안이며, 실제 약관 확정 전 상품·법무·보상 부서의 검토가 필요합니다.</p>

      <div className={'report-page__wording-web-flow' + (printMode ? ' report-page__wording-web-flow--print-hidden' : '')}>
      <section className="report-page__wording-flow-section report-page__wording-selection" aria-labelledby="wording-selection-title">
        <div className="report-page__wording-flow-heading"><div><p className="report-page__eyebrow">STEP 01 · COVERAGE SCOPE</p><h3 id="wording-selection-title">보장 내용 선택</h3><p>검토할 보장 항목을 선택하면 해당 항목의 지급요건, 약관 문구와 보장 범위를 확인할 수 있습니다.</p></div><div className="report-page__wording-flow-heading-side"><span className="report-page__wording-flow-context">{selectedCoverage.label}</span><span className="report-page__wording-flow-step">선택형 mock 데이터</span></div></div>
        <div className="report-page__wording-option-grid" role="tablist" aria-label="보장 내용 선택">
          {WORDING_COVERAGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={'report-page__wording-option' + (selectedCoverage.id === option.id ? ' is-selected' : '')}
              type="button"
              role="tab"
              aria-selected={selectedCoverage.id === option.id}
              onClick={() => setSelectedCoverageId(option.id)}
            >
              <span className="report-page__wording-option-number">{String(WORDING_COVERAGE_OPTIONS.indexOf(option) + 1).padStart(2, '0')}</span>
              <strong>{option.label}</strong>
              <small>{option.shortDescription}</small>
            </button>
          ))}
        </div>
      </section>
      <div className="report-page__wording-selection-summary"><strong>현재 검토 항목 · {selectedCoverage.label}</strong><span>지급요건 {selectedCoverage.paymentConditions.length}건 · 실무 결정 {selectedCoverage.decisions.length}건 · 보장 {selectedCoverage.coveredLosses.length}건 · 제외 검토 {selectedCoverage.excludedLosses.length}건</span></div>

      <section className="report-page__wording-flow-section report-page__wording-result" aria-labelledby="wording-result-title">
        <div className="report-page__wording-flow-heading"><div><p className="report-page__eyebrow">STEP 02 · CURRENT REVIEW</p><h3 id="wording-result-title">현재 약관 검토 결과</h3></div><div className="report-page__wording-flow-heading-side"><span className="report-page__wording-flow-context">{selectedCoverage.label}</span><span className="report-page__wording-flow-status">보완 후 약관 초안 작성 가능</span></div></div>
        <p className="report-page__wording-result-copy">보장 대상과 지급요건은 문장화할 수 있으나, 발화 차량 인정 기준, 기존 보험 적용 순서, 보상한도는 실무 결정이 필요합니다.</p>
        <div className="report-page__wording-result-meta"><span>선택 항목 · {selectedCoverage.label}</span><span>검토 구조 · {String(selectedStructure?.name ?? data.selectedDraftType ?? '피해보완형 검토안')}</span></div>
        <div className="report-page__wording-result-actions"><span>작성 가능 근거 {data.possibleReasons?.length ?? 0}건</span><span>실무 결정 필요 {data.improvementReasons?.length ?? 0}건</span><button className="report-page__text-button report-page__no-print" type="button" onClick={openDetailedReview}>상세 판단 근거 보기 →</button></div>
        <details className="report-page__wording-source-details"><summary>기존 AI 판단 근거 보기 <span>{(data.possibleReasons?.length ?? 0) + (data.improvementReasons?.length ?? 0)}건</span></summary><div className="report-page__wording-source-grid"><div><h4>작성 가능한 근거</h4><ul>{(data.possibleReasons ?? []).map((item) => <li key={item}>{item}</li>)}</ul></div><div><h4>먼저 결정할 사항</h4><ul>{(data.improvementReasons ?? []).map((item) => <li key={item}>{item}</li>)}</ul></div></div></details>
      </section>

      <section className="report-page__wording-flow-section report-page__wording-payment" aria-labelledby="wording-payment-title">
        <div className="report-page__wording-flow-heading"><div><p className="report-page__eyebrow">STEP 03 · PAYMENT CONDITIONS</p><h3 id="wording-payment-title">보험금 지급요건</h3><p>아래 조건을 모두 충족하는 경우 보험금 지급 대상으로 검토합니다.</p></div><span className="report-page__wording-flow-context">{selectedCoverage.label}</span></div>
        <div className="report-page__wording-payment-grid">
          <div className="report-page__wording-condition-panel"><h4>초안에 반영 가능한 지급요건</h4><ul>{selectedCoverage.paymentConditions.map((condition) => <li key={condition}><span aria-hidden="true">✓</span>{condition}</li>)}</ul></div>
          <aside className="report-page__wording-decision-note"><h4><span aria-hidden="true">?</span>약관 확정 전 결정 필요</h4><ul>{selectedCoverage.decisions.map((decision, index) => <li key={decision}><span aria-hidden="true">{index + 1}</span>{decision}</li>)}</ul></aside>
        </div>
        <details className="report-page__wording-source-details"><summary>지급요건별 확인자료 보기 · {data.paymentConditions?.length ?? 0}건</summary><div className="report-page__wording-source-list">{(data.paymentConditions ?? []).map((item) => <p key={String(item.id)}><strong>{String(item.text ?? '')}</strong><span>확인 방법 · {String(item.verification ?? '')}</span></p>)}</div></details>
      </section>

      <section className="report-page__wording-flow-section report-page__wording-draft-flow" aria-labelledby="wording-draft-title">
        <div className="report-page__wording-flow-heading"><div><p className="report-page__eyebrow">STEP 04 · DRAFT WORDING</p><h3 id="wording-draft-title">추천 약관 문구 초안</h3><p><strong>AI 추천 초안</strong> · 현재 선택한 보장 항목에 우선 적용할 수 있는 검토용 문구입니다.</p></div><div className="report-page__wording-flow-heading-side"><span className="report-page__wording-flow-context">{selectedCoverage.label}</span><div className="report-page__wording-draft-badges"><span>AI 생성 초안</span><span>실무 검토 전</span></div></div></div>
        <div className="report-page__wording-draft-toolbar report-page__no-print"><button className="report-page__button" type="button" onClick={copyDraft}>초안 복사</button><button className="report-page__button" type="button" onClick={openDetailedReview}>판단 근거 보기</button><button className="report-page__button" type="button" onClick={() => setShowAlternativeDraft((current) => !current)} aria-expanded={showAlternativeDraft}>다른 문구와 비교</button><button className="report-page__button report-page__button--primary" type="button" onClick={onOpenPolicyDraft}>약관 초안 검토</button></div>
        <blockquote className="report-page__wording-draft-quote">“{selectedCoverage.draft}”</blockquote>
        <p className="report-page__wording-draft-note">선택 항목에 따른 mock 약관 문구입니다. 실제 약관 확정 문구가 아니며 상품·법무·보상 검토 후 수정될 수 있습니다.</p>
        {copyMessage ? <p className="report-page__copy-message" role="status">{copyMessage}</p> : null}
        {data.alternativeLiabilityDraft && showAlternativeDraft ? <details className="report-page__wording-alternative" open><summary>대안 구조의 기존 AI 초안</summary><blockquote>“{data.alternativeLiabilityDraft}”</blockquote></details> : null}
      </section>

      <section className="report-page__wording-flow-section report-page__wording-loss-comparison" aria-labelledby="wording-loss-title">
        <div className="report-page__wording-flow-heading"><div><p className="report-page__eyebrow">STEP 05 · COVERAGE BOUNDARY</p><h3 id="wording-loss-title">보장하는 손해 / 보장하지 않는 손해</h3><p>선택한 보장 항목의 보장 범위와 제외 검토 후보를 비교합니다.</p></div><div className="report-page__wording-flow-heading-side"><span className="report-page__wording-flow-context">{selectedCoverage.label}</span><span className="report-page__wording-loss-count">보장 {selectedCoverage.coveredLosses.length}건 · 제외 검토 {selectedCoverage.excludedLosses.length}건</span></div></div>
        <div className="report-page__wording-loss-grid">
          <article className="report-page__wording-loss-card report-page__wording-loss-card--covered"><small>이 초안 기준</small><h4>보장하는 손해</h4><ul>{selectedCoverage.coveredLosses.map((loss) => <li key={loss}>{loss}</li>)}</ul></article>
          <article className="report-page__wording-loss-card report-page__wording-loss-card--excluded"><small>이 초안 기준</small><h4>보장하지 않는 손해</h4><span className="report-page__wording-loss-badge">면책 검토 후보 · 실무 확정 필요</span><ul>{selectedCoverage.excludedLosses.map((loss) => <li key={loss}>{loss}</li>)}</ul></article>
        </div>
        <details className="report-page__wording-source-details"><summary>기존 면책 검토 후보 상세 보기 <span>{data.exclusionCandidates?.length ?? 0}건</span></summary><div className="report-page__wording-source-list">{(data.exclusionCandidates ?? []).map((item) => <p key={String(item.id)}><strong>{String(item.text ?? '')}</strong><span>{String(item.reason ?? '')} · {String(item.status ?? '')}</span></p>)}</div></details>
      </section>

      <section className="report-page__wording-flow-section report-page__wording-decisions" aria-labelledby="wording-decisions-title">
        <div className="report-page__wording-flow-heading"><div><p className="report-page__eyebrow">STEP 06 · DECISION ITEMS</p><h3 id="wording-decisions-title">약관 확정 전 결정해야 할 사항</h3><p>AI가 임의로 확정하지 않고 상품·보상·법무·계리·인수 담당자가 결정해야 하는 영역입니다.</p></div><span className="report-page__wording-flow-context">{selectedCoverage.label}</span></div>
        <div className="report-page__wording-decision-grid">{WORDING_DECISION_AREAS.map((area) => <article key={area.title}><h4>{area.title}</h4><ul>{area.items.map((item) => <li key={item}>{item}</li>)}</ul><div className="report-page__wording-decision-output"><strong>다음 행동</strong><span>{area.nextAction}</span><strong>예상 산출물</strong><span>{area.output}</span></div></article>)}</div>
        <details className="report-page__wording-source-details"><summary>기존 판단 대기 데이터 보기 <span>{data.ambiguities?.length ?? 0}건</span></summary><div className="report-page__wording-source-list">{(data.ambiguities ?? []).map((item) => <p key={String(item.id)}><strong>{String(item.issue ?? '')}</strong><span>{String(item.question ?? '')} · 담당: {String(item.owner ?? '')}</span></p>)}</div></details>
      </section>

      <section ref={detailedReviewRef} id="wording-detailed-review" className="report-page__wording-flow-section report-page__wording-detailed-review" aria-labelledby="wording-detailed-title">
        <div className="report-page__wording-flow-heading"><div><p className="report-page__eyebrow">STEP 07 · DETAILED REVIEW</p><h3 id="wording-detailed-title">약관 초안 작성 가능성 상세 검토</h3><p>AI가 약관 초안을 작성할 수 있다고 판단한 세부 기준과 근거입니다.</p></div><div className="report-page__wording-flow-heading-side"><span className="report-page__wording-flow-context">{selectedCoverage.label}</span><span className="report-page__wording-flow-context">{assessmentCriteria.length}개 기준</span></div></div>
        <div className="report-page__wording-criteria-summary"><span>작성 가능 {statusCounts.ready}</span><span>보완 후 가능 {statusCounts.conditional}</span><span>실무 결정 필요 {statusCounts.decision}</span></div>
        <div className="report-page__wording-criteria-list">
          {assessmentCriteria.map((item, index) => (
            <details key={String(item.id ?? index)} className="report-page__wording-criteria-item">
              <summary><span className="report-page__wording-criteria-number">{String(index + 1).padStart(2, '0')}</span><span className="report-page__wording-criteria-copy"><strong>{String(item.question ?? '')}</strong><small>핵심 판단 근거 펼쳐보기</small></span><WordingStatusBadge status={String(item.status ?? '')} /></summary>
              <div><p>{String(item.note ?? '상세 판단 근거가 준비되지 않았습니다.')}</p></div>
            </details>
          ))}
        </div>
      </section>

      <section className="report-page__wording-flow-section report-page__wording-terms" aria-labelledby="wording-terms-title">
        <div className="report-page__wording-flow-heading"><div><p className="report-page__eyebrow">TERMS & DEFINITIONS</p><h3 id="wording-terms-title">약관에서 정의해야 할 핵심 용어</h3><p>기존 약관에서 참고 가능한 용어와 새롭게 정의가 필요한 용어를 구분해 확인합니다.</p></div><span className="report-page__wording-flow-context">{definitions.length}개 용어</span></div>
        <div className="report-page__wording-priority-terms"><strong>우선 정의 필요 3건</strong><span>{priorityTerms.join(' · ')}</span></div>
        <div className="report-page__wording-terms-grid">
          <article><h4>기존 약관 참고 가능</h4><div className={'report-page__wording-definition-list' + (showAllDefinitions ? ' is-expanded' : '')}>{primaryDefinitions.map((item, index) => <div className={index >= 3 ? 'is-definition-extra' : ''} key={String(item.term)}><div><strong>{String(item.term ?? '')}</strong><StatusBadge>{String(item.status ?? '')}</StatusBadge></div><p>{String(item.draftDefinition ?? '')}</p></div>)}</div></article>
          <article><h4>새롭게 정의가 필요한 용어</h4><div className={'report-page__wording-definition-list' + (showAllDefinitions ? ' is-expanded' : '')}>{orderedAdditionalDefinitions.map((item, index) => <div className={index >= 4 ? 'is-definition-extra' : ''} key={String(item.term)}><div><strong>{String(item.term ?? '')}</strong><StatusBadge>{String(item.status ?? '')}</StatusBadge></div><p>{String(item.draftDefinition ?? '')}</p></div>)}</div></article>
        </div>
        <button className="report-page__text-button report-page__no-print report-page__wording-terms-toggle" type="button" onClick={() => setShowAllDefinitions((current) => !current)} aria-expanded={showAllDefinitions}>{showAllDefinitions ? '핵심 용어 일부만 보기 ↑' : '전체 용어 보기 ↓'}</button>
      </section>

      <section className="report-page__wording-flow-section report-page__wording-references-flow" aria-labelledby="wording-references-title">
        <div className="report-page__wording-flow-heading"><div><p className="report-page__eyebrow">SOURCES & LIMITATIONS</p><h3 id="wording-references-title">참고 약관과 판단 근거</h3><p>참고자료의 활용 범위와 분석 한계를 함께 확인합니다.</p></div><span className="report-page__wording-flow-context">{data.referenceDocuments?.length ?? 0}건</span></div>
        <div className="report-page__wording-reference-groups">{referenceGroups.map((group) => <section key={group.id}><h4>{group.title}</h4><div className="report-page__wording-reference-list">{group.items.map((document) => <article key={String(document.id)}><div className="report-page__wording-reference-meta"><code>{String(document.id ?? '')}</code><span className={'report-page__badge ' + (document.includedInAiInput ? 'report-page__badge--neutral' : 'report-page__badge--warning')}>{document.includedInAiInput ? 'AI 분석 참고자료' : 'AI 입력 제외 · 사후 검증'}</span></div><h5>{String(document.name ?? '')}</h5><p>{String(document.usedFor ?? '')}</p><small>활용 영역 · {wordingReferenceUsage(String(document.usedFor ?? ''))}</small><small>자료 기준일 · {displayDate(report.meta.analysisBaseDate)}</small><button className="report-page__text-button report-page__no-print" type="button" onClick={() => onOpenDocument(document)}>자료 정보 보기 →</button></article>)}</div></section>)}</div>
        <div className="report-page__wording-reference-notes"><article><h4>분석 한계</h4><p>현재 문구는 공개자료와 mock 데이터를 바탕으로 한 AI 검토용 초안입니다. 실제 약관·상품자료·손해자료의 최신성, 적용 범위와 법률적 효력은 확정하지 않습니다.</p></article><article><h4>추가 확인이 필요한 내부자료</h4><ul><li>승인된 상품 약관·상품설명서와 최신 개정 이력</li><li>기존 자동차보험·화재보험·배상책임보험의 실제 보상 사례</li><li>사고 빈도·동시 피해 규모·최대가능손해 및 인수 기준</li></ul></article></div>
        <button className="report-page__text-button report-page__no-print" type="button" onClick={() => onNavigateTab?.('evidence')} disabled={!onNavigateTab}>근거자료 및 추가 확인사항에서 전체 보기 →</button>
      </section>
      </div>
      {printMode ? <WordingPrintLayout report={report} data={data} /> : null}
    </section>
  )
}

}
*/

/* Legacy wording layout retained while the full clause-draft flow is rebuilt.
function WordingSection({
  report,
  onOpenDocument,
  onOpenPolicyDraft,
  onNavigateTab,
  printMode = false,
}: {
  report: ReportView
  onOpenDocument: (document: NonNullable<ReportView['wordingFeasibility']['referenceDocuments']>[number]) => void
  onOpenPolicyDraft: () => void
  onNavigateTab?: (id: ReportTabId) => void
  printMode?: boolean
}) {
  const data = report.wordingFeasibility
  const [copyMessage, setCopyMessage] = useState('')
  const [selectedCoverageId, setSelectedCoverageId] = useState<WordingCoverageOptionId>('adjacent-vehicle')
  const selectedCoverage = WORDING_COVERAGE_OPTIONS.find((option) => option.id === selectedCoverageId) ?? WORDING_COVERAGE_OPTIONS[0]
  const selectedMeta = WORDING_PROPOSAL_ITEMS[selectedCoverage.id]
  const assessmentCriteria = data.assessmentCriteria ?? []
  const definitions = data.definitions ?? []
  const referenceDocuments = data.referenceDocuments ?? []
  const priorityDefinitions = selectedMeta.keyTerms.map((term) => definitions.find((item) => String(item.term ?? '') === term)).filter(Boolean)
  const priorityTermSet = new Set(selectedMeta.keyTerms)
  const additionalDefinitions = definitions.filter((item) => !priorityTermSet.has(String(item.term ?? '')))
  const statusCounts = assessmentCriteria.reduce((counts, item) => {
    const tone = wordingStatusTone(String(item.status ?? ''))
    counts[tone] += 1
    return counts
  }, { ready: 0, conditional: 0, decision: 0 } as Record<'ready' | 'conditional' | 'decision', number>)
  const detailedReviewRef = useRef<HTMLElement | null>(null)
  const wordingComponentsRef = useRef<HTMLElement | null>(null)

  // The policy-draft action remains available to the parent workflow, but this page now
  // keeps the draft review as a self-contained mock review surface.
  void onOpenPolicyDraft

  const openDetailedReview = () => {
    const section = detailedReviewRef.current
    if (!section) return
    const behavior = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    window.requestAnimationFrame(() => {
      section.scrollIntoView({ behavior, block: 'start' })
      const firstDetails = section.querySelector<HTMLDetailsElement>('details')
      if (firstDetails) firstDetails.open = true
      firstDetails?.querySelector<HTMLElement>('summary')?.focus()
    })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    let previousOpenStates: boolean[] = []
    const getDetails = () => Array.from(wordingComponentsRef.current?.querySelectorAll('details') ?? [])
    const openDetailsForPrint = () => {
      const details = getDetails()
      previousOpenStates = details.map((detail) => detail.open)
      details.forEach((detail) => { detail.open = true })
    }
    const restoreDetailsAfterPrint = () => {
      getDetails().forEach((detail, index) => {
        detail.open = previousOpenStates[index] ?? detail.open
      })
    }
    window.addEventListener('beforeprint', openDetailsForPrint)
    window.addEventListener('afterprint', restoreDetailsAfterPrint)
    return () => {
      window.removeEventListener('beforeprint', openDetailsForPrint)
      window.removeEventListener('afterprint', restoreDetailsAfterPrint)
    }
  }, [])

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(selectedCoverage.draft)
      setCopyMessage('초안 문구를 복사했습니다.')
    } catch {
      setCopyMessage('브라우저에서 복사 권한을 허용해 주세요.')
    }
  }

  return (
    <section ref={wordingComponentsRef} className="report-page__section report-page__wording-section" aria-labelledby="wording-title">
      <SectionHeading number="06" eyebrow="WORDING FEASIBILITY" title="약관화 검토" />
      <p className="report-page__wording-lead" id="wording-title">현재 분석 중인 위험의 보장 공백을 바탕으로 AI가 보장 항목을 제안하고, 항목별 보험금 지급요건과 약관 문구 초안을 제공합니다.</p>
      <p className="report-page__wording-disclaimer">공개자료와 mock 데이터를 바탕으로 한 검토용 초안이며, 최종 약관 문구는 일반상품 개발 담당자가 확정합니다.</p>

      <div className="report-page__wording-redesign-flow">
        <section className="report-page__wording-zone report-page__wording-context-zone" aria-labelledby="wording-context-title">
          <div className="report-page__wording-zone-heading">
            <div><p className="report-page__eyebrow">RISK CONTEXT</p><h3 id="wording-context-title">분석 대상 위험</h3><p>현재 선택된 위험을 기준으로 아래 보장 항목을 검토합니다.</p></div>
          </div>
          <div className="report-page__wording-risk-context">
            <strong>{WORDING_ANALYSIS_RISK.description}</strong>
            <dl>
              <div><dt>Risk ID</dt><dd>{WORDING_ANALYSIS_RISK.riskId}</dd></div>
              <div><dt>주요 피해 대상</dt><dd>{WORDING_ANALYSIS_RISK.affected}</dd></div>
              <div><dt>판단 근거</dt><dd>{WORDING_ANALYSIS_RISK.basis}</dd></div>
            </dl>
          </div>

          <div className="report-page__wording-zone-heading report-page__wording-proposal-heading">
            <div><p className="report-page__eyebrow">AI PROPOSAL</p><h3>AI 제안 보장 항목</h3><p>보장 항목을 선택하면 해당 항목의 지급요건, 실무 결정사항, 약관 문구와 보장 범위를 함께 확인할 수 있습니다.</p></div>
          </div>
          <div className="report-page__wording-proposal-grid" role="tablist" aria-label="AI 제안 보장 항목">
            {WORDING_COVERAGE_OPTIONS.map((option, index) => {
              const meta = WORDING_PROPOSAL_ITEMS[option.id]
              const isSelected = selectedCoverage.id === option.id
              return (
                <button
                  key={option.id}
                  className={`report-page__wording-proposal-card${isSelected ? ' is-selected' : ''}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCoverageId(option.id)}
                >
                  <span className="report-page__wording-proposal-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="report-page__wording-proposal-card-title"><strong>{option.label}</strong>{meta.badge ? <em>{meta.badge}</em> : null}</span>
                  <small>{option.shortDescription}</small>
                  <span className="report-page__wording-proposal-reason"><b>제안 이유</b>{meta.reason}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="report-page__wording-zone report-page__wording-review-zone" aria-labelledby="wording-review-title">
          <div className="report-page__wording-review-summary">
            <div><p className="report-page__eyebrow">CURRENT REVIEW</p><h3 id="wording-review-title">현재 약관 검토 결과</h3><p><strong>{selectedCoverage.label}</strong> · 보완 후 약관 초안 작성 가능</p></div>
            <span className="report-page__wording-review-status">보완 후 약관 초안 작성 가능</span>
            <dl>
              <div><dt>지급요건</dt><dd>{selectedCoverage.paymentConditions.length}건</dd></div>
              <div><dt>AI 추천</dt><dd>{selectedMeta.decisions.length}건</dd></div>
              <div><dt>실무 결정</dt><dd>{selectedMeta.decisions.length}건</dd></div>
            </dl>
          </div>

          <div className="report-page__wording-zone-heading report-page__wording-review-heading">
            <div><p className="report-page__eyebrow">PAYMENT & DECISIONS</p><h3>보험금 지급요건과 확정 전 결정사항</h3><p>AI가 제안한 지급요건은 초안에 반영하고, 결정사항은 추천·근거·전제를 확인한 뒤 확정합니다.</p></div>
          </div>
          <div className="report-page__wording-payment-decision-grid">
            <article className="report-page__wording-condition-card">
              <header><span className="report-page__wording-zone-kicker">조건 4건</span><h4>보험금 지급요건</h4><p>아래 조건을 모두 충족하는 경우 보험금 지급 대상으로 검토합니다.</p></header>
              <ol>{selectedCoverage.paymentConditions.map((condition) => <li key={condition}><span aria-hidden="true">✓</span><span>{condition}</span></li>)}</ol>
            </article>
            <article className="report-page__wording-decision-card">
              <header><span className="report-page__wording-zone-kicker report-page__wording-zone-kicker--orange">결정 필요 {selectedMeta.decisions.length}건</span><h4>확정 전 결정사항</h4><p>행을 펼치면 AI 추천, 판단 근거, 전제·가정과 신뢰도를 확인할 수 있습니다.</p></header>
              <div className="report-page__wording-decision-list">
                {selectedMeta.decisions.map((decision, index) => (
                  <details key={decision.id} className="report-page__wording-decision-row" open={printMode || undefined}>
                    <summary><span className="report-page__wording-decision-number">{String(index + 1).padStart(2, '0')}</span><span className="report-page__wording-decision-question"><strong>{decision.question}</strong><small>AI 추천 · {decision.recommendation}</small></span><span className="report-page__wording-detail-hint">상세 보기</span></summary>
                    <div className="report-page__wording-decision-detail">
                      <div><h5>AI 추천</h5><p>{decision.recommendation}</p></div>
                      <div><h5>판단 근거</h5><p>{decision.rationale}</p><small>{decision.basis}</small></div>
                      <div><h5>전제·가정</h5><ul>{decision.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul></div>
                      <div className="report-page__wording-decision-confidence"><span>신뢰도</span><strong>{decision.confidence}</strong><span>최종 선택</span><strong>{decision.finalChoice}</strong></div>
                    </div>
                  </details>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="report-page__wording-zone report-page__wording-draft-zone" aria-labelledby="wording-draft-title">
          <div className="report-page__wording-zone-heading">
            <div><p className="report-page__eyebrow">DRAFT WORDING</p><h3 id="wording-draft-title">추천 약관 문구 초안</h3><p>현재 선택한 보장 항목에 우선 적용할 수 있는 AI 생성 초안입니다.</p></div>
            <div className="report-page__wording-draft-badges"><span>AI 생성 초안</span><span>검토 전</span></div>
          </div>
          <div className="report-page__wording-draft-actions report-page__no-print"><button className="report-page__button" type="button" onClick={copyDraft}>초안 복사</button><button className="report-page__button" type="button" onClick={openDetailedReview}>근거 보기</button></div>
          <blockquote className="report-page__wording-draft-quote">“{selectedCoverage.draft}”</blockquote>
          <p className="report-page__wording-draft-note">선택 항목에 따른 mock 약관 문구이며, 실제 약관 확정 문구가 아닙니다.</p>
          {copyMessage ? <p className="report-page__copy-message report-page__no-print" role="status">{copyMessage}</p> : null}

          <div className="report-page__wording-loss-heading"><div><p className="report-page__eyebrow">COVERAGE BOUNDARY</p><h4>보장하는 손해와 보장하지 않는 손해</h4><p>선택한 보장 항목의 보장 범위와 제외 검토 후보입니다.</p></div></div>
          <div className="report-page__wording-loss-grid">
            <article className="report-page__wording-loss-card report-page__wording-loss-card--covered"><h4>보장하는 손해</h4><ul>{selectedCoverage.coveredLosses.map((loss) => <li key={loss}>{loss}</li>)}</ul></article>
            <article className="report-page__wording-loss-card report-page__wording-loss-card--excluded"><h4>보장하지 않는 손해</h4><p className="report-page__wording-loss-candidate">면책 검토 후보 · 실무 확정 필요</p><ul>{selectedCoverage.excludedLosses.map((loss) => <li key={loss}>{loss}</li>)}</ul></article>
          </div>
        </section>

        <section ref={detailedReviewRef} className="report-page__wording-zone report-page__wording-details-zone" aria-labelledby="wording-details-title">
          <div className="report-page__wording-zone-heading"><div><p className="report-page__eyebrow">DETAILED GROUNDS</p><h3 id="wording-details-title">상세 판단 근거</h3><p>현재 선택 항목의 AI 판단에 사용한 기준·용어·참고자료를 확인합니다.</p></div></div>

          <details className="report-page__wording-detail-toggle" open={printMode || undefined}>
            <summary><span><strong>약관 초안 작성 가능성 상세 근거</strong><small>작성 가능성 판단 기준과 항목별 근거</small></span><em>{assessmentCriteria.length}개 기준</em></summary>
            <div className="report-page__wording-detail-content">
              <div className="report-page__wording-criteria-summary"><span>작성 가능 {statusCounts.ready}</span><span>보완 후 가능 {statusCounts.conditional}</span><span>실무 결정 필요 {statusCounts.decision}</span></div>
              <div className="report-page__wording-criteria-list">{assessmentCriteria.map((item, index) => <article key={String(item.id ?? index)}><header><strong>{String(index + 1).padStart(2, '0')} · {String(item.question ?? '')}</strong><WordingStatusBadge status={String(item.status ?? '')} /></header><p>{String(item.note ?? '')}</p></article>)}</div>
              <div className="report-page__wording-grounds-grid"><div><h4>작성 가능한 근거</h4><ul>{(data.possibleReasons ?? []).map((reason) => <li key={reason}>{reason}</li>)}</ul></div><div><h4>보완이 필요한 근거</h4><ul>{(data.improvementReasons ?? []).map((reason) => <li key={reason}>{reason}</li>)}</ul></div></div>
            </div>
          </details>

          <details className="report-page__wording-detail-toggle" open={printMode || undefined}>
            <summary><span><strong>약관에서 정의해야 할 핵심 용어</strong><small>현재 보장 항목에서 우선 확인할 용어</small></span><em>{definitions.length}개 용어</em></summary>
            <div className="report-page__wording-detail-content">
              <div className="report-page__wording-priority-terms"><strong>우선 검토 용어</strong>{selectedMeta.keyTerms.map((term) => <span key={term}>{term}</span>)}</div>
              <div className="report-page__wording-term-columns"><section><h4>우선 검토</h4>{priorityDefinitions.map((item) => <p key={String(item?.term)}><strong>{String(item?.term ?? '')}</strong><span>{String(item?.draftDefinition ?? '')}</span></p>)}</section><section><h4>추가 정의 후보</h4>{additionalDefinitions.map((item) => <p key={String(item.term)}><strong>{String(item.term ?? '')}</strong><span>{String(item.draftDefinition ?? '')}</span></p>)}</section></div>
            </div>
          </details>

          <details className="report-page__wording-detail-toggle" open={printMode || undefined}>
            <summary><span><strong>참고 약관과 판단 근거</strong><small>AI 제안의 출처·전제·한계와 선택 항목별 근거</small></span><em>{referenceDocuments.length}개 자료</em></summary>
            <div className="report-page__wording-detail-content">
              <div className="report-page__wording-selected-grounds"><h4>현재 선택 항목의 판단 근거</h4><ul>{selectedMeta.grounds.map((ground) => <li key={ground}>{ground}</li>)}</ul></div>
              <div className="report-page__wording-reference-list">{referenceDocuments.map((document) => <article key={String(document.id)}><div><strong>{String(document.name ?? '')}</strong><span>{String(document.id ?? '')} · {wordingReferenceUsage(String(document.usedFor ?? ''))}</span><small>자료 기준일 · {displayDate(report.meta.analysisBaseDate)}</small></div><button className="report-page__text-button report-page__no-print" type="button" onClick={() => onOpenDocument(document)}>자료 정보 보기 →</button></article>)}</div>
              <div className="report-page__wording-reference-notes"><div><h4>전제·가정</h4><ul><li>현재 위험 설명과 보장 공백은 분석 단계의 mock 입력을 기준으로 합니다.</li><li>기존 보험의 실제 지급 범위와 내부 손해자료는 별도 확인이 필요합니다.</li></ul></div><div><h4>분석 한계·신뢰도</h4><ul><li>공개자료와 mock 데이터를 바탕으로 한 검토용 초안입니다.</li><li>약관 적용 범위와 최종 보상 여부를 확정하지 않으며, 현재 추천의 신뢰도는 보통입니다.</li></ul></div></div>
              {onNavigateTab ? <button className="report-page__text-button report-page__no-print" type="button" onClick={() => onNavigateTab('evidence')}>근거자료 및 추가 확인사항에서 전체 보기 →</button> : null}
            </div>
          </details>
        </section>
      </div>
    </section>
  )
}
*/

const WORDING_CORE_HIGHLIGHT_TERMS = [
  '법률상 배상책임',
  '대물배상 한도 초과',
  '보장 공백',
  '기존 보험에서 보상받지 못한 손해',
  '인접 차량 직접재산손해',
  '기존 보험과 중복되는 금액',
  '약정된 한도 내에서 보상',
  '직접 화재손해',
  '긴급 이동·견인비',
  '발화 차량 자체 손해',
  '간접손해',
] as const

function WordingHighlightedText({ text }: { text: string }) {
  const pattern = new RegExp(`(${WORDING_CORE_HIGHLIGHT_TERMS.join('|')})`, 'g')
  return <>{text.split(pattern).map((part, index) => WORDING_CORE_HIGHLIGHT_TERMS.includes(part as (typeof WORDING_CORE_HIGHLIGHT_TERMS)[number]) ? <strong className="report-page__wording-key-highlight" key={`${part}-${index}`}>{part}</strong> : <Fragment key={`${part}-${index}`}>{part}</Fragment>)}</>
}

const WORDING_PAYMENT_HIGHLIGHT_TERMS = [
  '보험증권',
  '지하주차장',
  '인접한 제3자의 차량',
  '건물·주차장 구조물',
  '충전설비',
  '보장 대상에 포함',
  '보장 대상',
  '복구비용',
  '직접적인 물리적 손해',
  '사고 사실',
  '손해 범위',
  '화재의 확산',
  '추가 손해를 줄이기 위해',
  '필요하고 합리적으로 지출',
  '객관적인 자료',
  '중복되지 않을 것',
  '중복되지 않는',
] as const

function WordingPaymentRequirementText({ text }: { text: string }) {
  const pattern = new RegExp(`(${WORDING_PAYMENT_HIGHLIGHT_TERMS.join('|')})`, 'g')
  return <>{text.split(pattern).map((part, index) => WORDING_PAYMENT_HIGHLIGHT_TERMS.includes(part as (typeof WORDING_PAYMENT_HIGHLIGHT_TERMS)[number]) ? <strong className="report-page__wording-payment-highlight" key={`${part}-${index}`}>{part}</strong> : <Fragment key={`${part}-${index}`}>{part}</Fragment>)}</>
}

const WORDING_RISK_SUMMARY_COPY = {
  title: '지하주차장 전기차 화재 확산 위험',
  description: '주차 또는 충전 중인 전기자동차에서 시작된 화재가 인접 차량, 건물·주차장 시설 및 충전설비로 확산되어 다수의 재산손해를 발생시키는 위험입니다.',
  insuranceType: '기업성 일반보험',
  affected: '인접 차량 · 건물·주차장 시설 · 충전설비',
  basis: '발생 가능한 손해와 기존 보험의 보장 공백 분석',
} as const

/*
function LegacyWordingSection({
  report,
  onOpenDocument,
  onOpenPolicyDraft,
  onNavigateTab,
  printMode = false,
}: {
  report: ReportView
  onOpenDocument: (document: NonNullable<ReportView['wordingFeasibility']['referenceDocuments']>[number]) => void
  onOpenPolicyDraft: () => void
  onNavigateTab?: (id: ReportTabId) => void
  printMode?: boolean
}) {
  const data = report.wordingFeasibility
  const [copyMessage, setCopyMessage] = useState('')
  const [selectedCoverageId, setSelectedCoverageId] = useState<WordingCoverageOptionId>('adjacent-vehicle')
  const [showAllDefinitions, setShowAllDefinitions] = useState(false)
  const [activeArticleNumber, setActiveArticleNumber] = useState<number | null>(null)
  const selectedCoverage = coverageClauseDrafts.find((draft) => draft.id === selectedCoverageId) ?? coverageClauseDrafts[0]
  const assessmentCriteria = data.assessmentCriteria ?? []
  const definitions = data.definitions ?? []
  const statusCounts = assessmentCriteria.reduce((counts, item) => {
    const tone = wordingStatusTone(String(item.status ?? ''))
    counts[tone] += 1
    return counts
  }, { ready: 0, conditional: 0, decision: 0 } as Record<'ready' | 'conditional' | 'decision', number>)
  const detailedReviewRef = useRef<HTMLDivElement | null>(null)
  const fullDraftRef = useRef<HTMLElement | null>(null)
  const wordingComponentsRef = useRef<HTMLElement | null>(null)
  const articleRefs = useRef<Record<number, HTMLElement | null>>({})

  void onOpenDocument
  void onOpenPolicyDraft
  void onNavigateTab

  const scrollToArticle = (articleNumber: number) => {
    setActiveArticleNumber(articleNumber)
    window.requestAnimationFrame(() => articleRefs.current[articleNumber]?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const getDetails = () => Array.from(wordingComponentsRef.current?.querySelectorAll('details') ?? [])
    const openDetailsForPrint = () => getDetails().forEach((detail) => { detail.open = true })
    window.addEventListener('beforeprint', openDetailsForPrint)
    return () => window.removeEventListener('beforeprint', openDetailsForPrint)
  }, [])

  useEffect(() => {
    wordingComponentsRef.current?.querySelectorAll<HTMLDetailsElement>('.report-page__wording-detail-toggles > details').forEach((detail) => { detail.open = true })
  }, [selectedCoverage.id, printMode])

  useEffect(() => {
    if (typeof window === 'undefined' || !fullDraftRef.current || printMode) return
    const articles = Object.values(articleRefs.current).filter((article): article is HTMLElement => Boolean(article))
    if (!articles.length || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) setActiveArticleNumber(Number((visible.target as HTMLElement).dataset.articleNumber))
    }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 })
    articles.forEach((article) => observer.observe(article))
    return () => observer.disconnect()
  }, [selectedCoverage.id, printMode])

  const copyFullDraft = async () => {
    const text = selectedCoverage.fullDraftArticles.map((article) => `제${article.articleNumber}조(${article.title})\n${article.content}`).join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopyMessage('특별약관 전체 초안을 복사했습니다.')
    } catch {
      setCopyMessage('브라우저에서 복사 권한을 허용해 주세요.')
    }
  }

  const definitionsByTerm = new Map(definitions.map((item) => [String(item.term ?? ''), String(item.draftDefinition ?? '')]))
  const extraDefinitions = definitions.filter((item) => !selectedCoverage.keyTerms.includes(String(item.term ?? '')))
  const definitionRows = selectedCoverage.keyTerms.map((term) => {
    const item = definitions.find((candidate) => String(candidate.term ?? '') === term)
    return { term, definition: definitionsByTerm.get(term) || '선택 항목의 보장 범위와 적용 기준을 약관에서 별도로 정의해야 합니다.', category: item ? '기존 약관 참고 가능' : '새 정의 필요', status: String(item?.status ?? '보완 필요') }
  }).concat(showAllDefinitions ? extraDefinitions.map((item) => ({ term: String(item.term ?? ''), definition: String(item.draftDefinition ?? ''), category: '새 정의 필요', status: String(item.status ?? '실무 결정 필요') })) : [])

  return (
    <section ref={wordingComponentsRef} className="report-page__section report-page__wording-section" aria-labelledby="wording-title">
      <SectionHeading number="06" eyebrow="" title="약관화 검토" />
      <p className="report-page__wording-lead" id="wording-title">현재 분석 중인 위험의 보장 공백을 바탕으로 AI가 약관화가 필요한 보장 항목을 제안하고, 항목별 보험금 지급요건과 특별약관 초안을 제공합니다.</p>
      <p className="report-page__wording-disclaimer">현재 결과는 공개된 현대해상 약관 구조와 mock 데이터를 바탕으로 작성한 검토용 초안입니다. 실제 약관 확정 전 상품개발 담당자의 검토와 내부 승인 절차가 필요합니다.</p>

      <div className="report-page__wording-main-flow">
        <section className="report-page__wording-main-zone report-page__wording-zone-a" aria-labelledby="wording-risk-title">
          <div className="report-page__wording-zone-heading"><div><h3 id="wording-risk-title">분석 대상 위험</h3></div></div>
          <div className="report-page__wording-risk-context">
            <strong>{WORDING_ANALYSIS_RISK.description}</strong>
            <dl>
              <div><dt>위험 ID</dt><dd>{WORDING_ANALYSIS_RISK.riskId}</dd></div>
              <div><dt>위험 유형</dt><dd>{WORDING_ANALYSIS_RISK.riskType}</dd></div>
              <div><dt>주요 피해 대상</dt><dd>{WORDING_ANALYSIS_RISK.affected}</dd></div>
              <div><dt>분석 근거</dt><dd>{WORDING_ANALYSIS_RISK.basis}</dd></div>
            </dl>
          </div>

          <div className="report-page__wording-zone-heading report-page__wording-proposal-heading"><div><h3>AI 제안 보장 항목</h3><p>앞 단계에서 확인된 보장 공백과 기존 보험의 보장 범위를 바탕으로 AI가 약관화가 필요한 보장 항목을 제안했습니다. 항목을 선택하면 해당 보장의 지급요건과 특별약관 전체 초안을 확인할 수 있습니다.</p></div></div>
          <div className="report-page__wording-proposal-grid" role="tablist" aria-label="AI 제안 보장 항목">
            {coverageClauseDrafts.map((draft, index) => (
              <button key={draft.id} className={`report-page__wording-proposal-card${selectedCoverage.id === draft.id ? ' is-selected' : ''}`} type="button" role="tab" aria-selected={selectedCoverage.id === draft.id} onClick={() => setSelectedCoverageId(draft.id)}>
                <span className="report-page__wording-proposal-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="report-page__wording-proposal-card-title"><strong>{draft.title}</strong></span>
                <small>{draft.summary}</small>
                <span className="report-page__wording-proposal-reason"><b>제안 이유</b>{WORDING_PROPOSAL_REASON_COPY[draft.id] ?? compactCriterionText(draft.proposalReason, 100)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="report-page__wording-main-zone report-page__wording-zone-b" aria-labelledby="wording-payment-title">
          <div className="report-page__wording-zone-heading"><div><h3 id="wording-payment-title">보험금 지급요건</h3><p>선택한 보장 항목에 대해 아래 요건을 모두 충족하는 경우 보험금 지급 대상으로 검토합니다.</p></div></div>
          <div className="report-page__wording-payment-decision-grid">
            <article className="report-page__wording-condition-card"><header><h4>보험금 지급요건</h4><p>선택한 보장 항목에 대해 아래 요건을 모두 충족하는 경우 보험금 지급 대상으로 검토합니다.</p></header><ol>{selectedCoverage.paymentRequirements.map((condition, index) => <li key={condition}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span><WordingPaymentRequirementText text={condition} /></span></li>)}</ol></article>
            <article className="report-page__wording-decision-card"><header><h4>약관 확정 전 결정사항</h4><p>각 항목은 AI 권고안과 판단 근거를 확인한 뒤 실무 검토가 필요한 사항입니다.</p></header><div className="report-page__wording-decision-list">{selectedCoverage.decisionItems.map((decision, index) => <details key={decision.id} className="report-page__wording-decision-row" open={printMode || undefined}><summary><span className="report-page__wording-decision-number">{String(index + 1).padStart(2, '0')}</span><span className="report-page__wording-decision-question"><strong>{decision.question}</strong><small>AI 권고 요약: <WordingHighlightedText text={compactCriterionText(decision.recommendation, 150)} /></small></span></summary><div className="report-page__wording-decision-detail"><div className="report-page__wording-decision-column wording-decision-column--recommendation"><h5>AI 권고안</h5><p><WordingHighlightedText text={decision.recommendation} /></p></div><div className="report-page__wording-decision-column wording-decision-column--basis"><h5>판단 근거</h5><p>{decision.rationale}</p><small>{decision.basis}</small></div><div className="report-page__wording-decision-column wording-decision-column--assumptions"><h5>적용한 가정</h5><ul>{decision.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul></div><div className="report-page__wording-decision-confidence"><span className="report-page__wording-confidence-dot" aria-hidden="true" />신뢰도 <WordingConfidenceText confidence={decision.confidence} /></div></div></details>)}</div></article>
          </div>
        </section>

        <section className="report-page__wording-main-zone report-page__wording-zone-c" aria-labelledby="wording-preview-title">
          <div className="report-page__wording-zone-heading"><div><h3 id="wording-preview-title">핵심 보상 조항</h3><p>선택한 보장 항목의 핵심 보상 내용을 확인합니다.</p></div><div className="report-page__wording-draft-actions report-page__no-print"><button className="report-page__button" type="button" onClick={copyFullDraft}>조항 복사</button></div></div>
          <blockquote className="report-page__wording-draft-quote"><WordingHighlightedText text={selectedCoverage.previewClause} /></blockquote>
          {copyMessage ? <p className="report-page__copy-message report-page__no-print" role="status">{copyMessage}</p> : null}
          <div className="report-page__wording-loss-heading"><div><h4>보장 범위와 보장 제외 범위</h4><p>선택한 보장 항목이 보장하는 손해와 제외되는 손해를 구분해 확인합니다.</p></div></div>
          <div className="report-page__wording-loss-grid">
            <article className="report-page__wording-loss-card">
              <small>이 특별약관이 보장하는 손해</small>
              <h4>보장 범위</h4>
              <dl>{selectedCoverage.coveredLosses.map((loss) => { const [term, description] = wordingLossParts(loss); return <div key={loss}><span className="report-page__wording-loss-icon" aria-hidden="true">✓</span><div className="report-page__wording-loss-copy"><dt className="report-page__wording-loss-term">{term}</dt><dd>{description}</dd></div></div> })}</dl>
            </article>
            <article className="report-page__wording-loss-card">
              <small>이 특별약관이 보장하지 않는 손해</small>
              <h4>보장 제외 범위</h4>
              <dl>{selectedCoverage.excludedLosses.map((loss) => { const [term, description] = wordingLossParts(loss); return <div key={loss}><span className="report-page__wording-loss-icon" aria-hidden="true">–</span><div className="report-page__wording-loss-copy"><dt className="report-page__wording-loss-term">{term}</dt><dd>{description}</dd></div></div> })}</dl>
            </article>
          </div>
        </section>

        <section ref={fullDraftRef} className="report-page__wording-main-zone report-page__wording-zone-d" aria-labelledby="wording-full-draft-title">
          <div className="report-page__wording-zone-heading"><div><h3 id="wording-full-draft-title">보장 특별약관 전체 초안</h3><p>선택한 보장 항목에 대해 AI가 작성한 전체 특별약관 조문을 검토합니다.</p></div></div>
          <p className="report-page__wording-full-draft-notice">이 초안은 현대해상 기존 약관의 일반적인 조문 구조를 참고하여 작성한 프로토타입용 mock 데이터입니다. 실제 상품 약관이 아니며 법무·준법·계리 검토가 완료되지 않았습니다.</p>
          <div className="report-page__wording-article-layout"><nav className="report-page__wording-article-toc report-page__no-print" aria-label="조문 목차"><strong>조문 목차</strong><div className="report-page__wording-article-toc-list">{selectedCoverage.fullDraftArticles.map((article) => <button key={article.articleNumber} className={activeArticleNumber === article.articleNumber ? 'is-active' : ''} type="button" onClick={() => scrollToArticle(article.articleNumber)}>제{article.articleNumber}조 {article.title}</button>)}</div><select aria-label="조문 선택" value={activeArticleNumber ?? ''} onChange={(event) => { if (event.target.value) scrollToArticle(Number(event.target.value)) }}><option value="">조문 선택</option>{selectedCoverage.fullDraftArticles.map((article) => <option key={article.articleNumber} value={article.articleNumber}>제{article.articleNumber}조 {article.title}</option>)}</select></nav><div className="report-page__wording-article-list">{selectedCoverage.fullDraftArticles.map((article) => <article className={activeArticleNumber === article.articleNumber ? 'is-active' : ''} key={article.articleNumber} ref={(node) => { articleRefs.current[article.articleNumber] = node }} data-article-number={article.articleNumber}><span className="report-page__wording-article-number">제{article.articleNumber}조</span><h4>{article.title}</h4><p><WordingHighlightedText text={article.content} /></p></article>)}</div></div>

          <div ref={detailedReviewRef} className="report-page__wording-detail-toggles">
            <details className="report-page__wording-detail-toggle" open={printMode || undefined}><summary><span><strong>약관 초안 작성 가능성 상세 근거</strong><small>평가 기준별 핵심 판단과 근거</small></span></summary><div className="report-page__wording-detail-content"><p className="report-page__wording-criteria-summary"><span className="is-ready">작성 가능 {statusCounts.ready}건</span><span aria-hidden="true"> · </span><span className="is-conditional">보완 필요 {statusCounts.conditional}건</span><span aria-hidden="true"> · </span><span className="is-decision">실무 판단 필요 {statusCounts.decision}건</span></p><div className="report-page__wording-criteria-list">{assessmentCriteria.map((item, index) => <details key={String(item.id ?? index)} className="report-page__wording-criteria-item" open={printMode || undefined}><summary><span className="report-page__wording-criteria-number">{String(index + 1).padStart(2, '0')}</span><span className="report-page__wording-criteria-copy"><strong>{String(item.question ?? '')}</strong><small>핵심 판단: {compactCriterionText(String(item.note ?? '상세 판단 근거가 준비되지 않았습니다.'), 120)}</small></span><WordingStatusBadge status={String(item.status ?? '')} /></summary><div className="report-page__wording-criteria-detail"><dl><div><dt>판단 근거</dt><dd>{String(item.note ?? '상세 판단 근거가 준비되지 않았습니다.')}</dd></div><div><dt>참고 약관</dt><dd>{String(item.reference ?? item.sourceName ?? '선택한 보장 항목의 참고 약관과 공개자료')}</dd></div><div><dt>적용한 가정</dt><dd>{String(item.assumption ?? '보장 대상과 사고 확인 자료가 객관적으로 확보된다는 가정')}</dd></div></dl></div></details>)}</div></div></details>
            <details className="report-page__wording-detail-toggle" open={printMode || undefined}><summary><span><strong>약관에서 정의해야 할 핵심 용어</strong><small>우선 정의가 필요한 용어 3개와 추가 후보</small></span></summary><div className="report-page__wording-detail-content"><div className="report-page__wording-term-table-wrap"><table className="report-page__wording-term-table"><thead><tr><th>용어</th><th>정의</th><th>구분</th><th>상태</th></tr></thead><tbody>{definitionRows.map((row) => <tr key={row.term}><th scope="row">{row.term}</th><td>{row.definition}</td><td>{row.category}</td><td><span className={`report-page__wording-term-status ${wordingTermStatusTone(row.status)}`}>{row.status}</span></td></tr>)}</tbody></table></div><button className="report-page__text-button report-page__no-print report-page__wording-terms-toggle" type="button" onClick={() => setShowAllDefinitions((current) => !current)} aria-expanded={showAllDefinitions}>{showAllDefinitions ? '우선 용어만 보기 ↑' : '전체 용어 보기 ↓'}</button></div></details>
            <details className="report-page__wording-detail-toggle" open={printMode || undefined}><summary><span><strong>참고 약관과 판단 근거</strong><small>참고 조항·반영 내용·가정·시뮬레이션·한계</small></span><em>{selectedCoverage.evidence.length}개 자료</em></summary><div className="report-page__wording-detail-content"><div className="report-page__wording-evidence-list">{selectedCoverage.evidence.map((evidence) => <article key={evidence.sourceType}><h4>{evidence.sourceType}</h4><dl><div><dt>참고한 조항</dt><dd>{evidence.clauses.join(' · ')}</dd></div><div><dt>초안에 반영한 내용</dt><dd>{evidence.reflected}</dd></div><div><dt>AI가 적용한 가정</dt><dd>{evidence.assumption}</dd></div><div><dt>프로토타입 시뮬레이션 값</dt><dd>{evidence.simulation}</dd></div><div><dt>분석 한계</dt><dd>{evidence.limitation}</dd></div><div><dt>신뢰도</dt><dd>{evidence.confidence}</dd></div></dl></article>)}</div><p className="report-page__wording-reference-date">자료 기준일 · {displayDate(report.meta.analysisBaseDate)} · 공개자료와 mock 데이터 기반</p></div></details>
          </div>
        </section>
      </div>
    </section>
  )
}
*/

function wordingPolicyItems(article: PolicyArticle | undefined): PolicyArticleItem[] {
  if (!article) return []
  return article.items?.length ? article.items : article.paragraphs
}

function wordingPolicyTermItems(article: PolicyArticle | undefined): Array<{ term: string; definition: string }> {
  return (article?.items ?? []).filter((item): item is { term: string; definition: string } => typeof item !== 'string')
}

function wordingPolicyArticle(
  article: PolicyArticle,
  key: string,
  activeArticleKey: string | null,
  onVisible: (key: string) => void,
) {
  return (
    <article
      key={key}
      id={key}
      className={'report-page__wording-policy-article' + (activeArticleKey === key ? ' is-active' : '')}
      data-policy-article-key={key}
      onFocus={() => onVisible(key)}
    >
      <span className="report-page__wording-policy-article-number">제{article.number}조</span>
      <h5>{article.title}</h5>
      {article.paragraphs.map((paragraph, index) => <p key={key + '-paragraph-' + index}>{paragraph}</p>)}
      {article.items?.length ? (
        <ol className="report-page__wording-policy-items">
          {article.items.map((item, index) => (
            <li key={key + '-item-' + index}>
              {typeof item === 'string' ? <span>{item}</span> : <><strong>{item.term}</strong><span>{item.definition}</span></>}
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  )
}

function WordingPolicyPrintLayout({
  report,
  selectedCoverage,
  createdAt,
}: {
  report: ReportView
  selectedCoverage: SpecialClause
  createdAt: string
}) {
  const reportDate = report.meta.analysisBaseDate ?? createdAt

  const policyArticle = (article: PolicyArticle, key: string) => (
    <article className="report-page__wording-print-policy-article" key={key}>
      <div className="report-page__wording-print-policy-article-heading"><span>제{article.number}조</span><h5>{article.title}</h5></div>
      {article.paragraphs.map((paragraph, index) => <p key={`${key}-paragraph-${index}`}>{paragraph}</p>)}
      {article.items?.length ? <ol>{article.items.map((item, index) => <li key={`${key}-item-${index}`}>{typeof item === 'string' ? item : <><strong>{item.term}</strong><span>{item.definition}</span></>}</li>)}</ol> : null}
    </article>
  )

  return (
    <div className="report-page__wording-print-portal">
      <article className="report-page__wording-print-layout report-page__wording-policy-print-layout" aria-label="AI 전체 약관 초안 출력본">
      <header className="report-page__wording-print-header">
        <p className="report-page__wording-print-eyebrow">INSURANCE WORDING REVIEW</p>
        <h1>AI 전체 약관 초안</h1>
        <p className="report-page__wording-print-product">{aiFullPolicyDraftMock.productName}</p>
        <dl className="report-page__wording-print-meta">
          <div><dt>문서 구분</dt><dd>AI 약관 검토 초안</dd></div>
          <div><dt>집중 검토 담보</dt><dd>{selectedCoverage.shortTitle}</dd></div>
          <div><dt>작성 기준일</dt><dd>{displayDate(reportDate)}</dd></div>
          <div><dt>문서 버전</dt><dd>{aiFullPolicyDraftMock.draftVersion}</dd></div>
          <div><dt>상품 구조</dt><dd>{aiFullPolicyDraftMock.policyForm}</dd></div>
        </dl>
      </header>

      <main className="report-page__wording-policy-print-content">
        <section className="report-page__wording-policy-print-group" aria-labelledby="wording-print-common-heading">
          <h2 id="wording-print-common-heading">{aiFullPolicyDraftMock.commonPolicy.title}</h2>
          {aiFullPolicyDraftMock.commonPolicy.sections.map((section) => <section className="report-page__wording-policy-print-section" key={section.id}><h3>{section.title}</h3>{section.articles.map((article) => policyArticle(article, `common-${section.id}-${article.number}`))}</section>)}
        </section>
        {aiFullPolicyDraftMock.specialClauses.map((clause) => <section className="report-page__wording-policy-print-group" key={clause.id} aria-labelledby={`wording-print-${clause.id}-heading`}><h2 id={`wording-print-${clause.id}-heading`}>{clause.title}</h2><p className="report-page__wording-policy-print-recommended"><strong>추천 보장 문구</strong> · {clause.recommendedCoverageCopy}</p>{clause.articles.map((article) => policyArticle(article, `special-${clause.id}-${article.number}`))}</section>)}
        <section className="report-page__wording-policy-print-group" aria-labelledby="wording-print-attachments-heading"><h2 id="wording-print-attachments-heading">부속 명세</h2><ul className="report-page__wording-print-attachments">{aiFullPolicyDraftMock.attachments.map((item, index) => <li key={item.title}><strong>{index + 1}. {item.title}</strong><span>{item.description}</span></li>)}</ul></section>
      </main>
      <footer className="report-page__wording-print-footer">AI 전체 약관 초안 · {aiFullPolicyDraftMock.draftVersion} · 작성 기준일 {displayDate(reportDate)}</footer>
      </article>
    </div>
  )
}

function FullWordingSection({
  report,
  onOpenDocument,
  onOpenPolicyDraft,
  onNavigateTab,
  printMode = false,
}: {
  report: ReportView
  onOpenDocument: (document: NonNullable<ReportView['wordingFeasibility']['referenceDocuments']>[number]) => void
  onOpenPolicyDraft: () => void
  onNavigateTab?: (id: ReportTabId) => void
  printMode?: boolean
}) {
  const data = report.wordingFeasibility
  const [copyMessage, setCopyMessage] = useState('')
  const [selectedCoverageId, setSelectedCoverageId] = useState<SpecialClause['id']>('adjacent-vehicle')
  const [activeArticleKey, setActiveArticleKey] = useState<string | null>('common-section-1-1')
  const [dedicatedPrintRequested, setDedicatedPrintRequested] = useState(false)
  const [dedicatedPrintCreatedAt, setDedicatedPrintCreatedAt] = useState<string | null>(null)
  const wordingComponentsRef = useRef<HTMLElement | null>(null)
  const fullDraftRef = useRef<HTMLElement | null>(null)
  const previousPrintTitle = useRef<string | null>(null)
  const dedicatedPrintStarted = useRef(false)
  const selectedCoverage = aiFullPolicyDraftMock.specialClauses.find((clause) => clause.id === selectedCoverageId) ?? aiFullPolicyDraftMock.specialClauses[0]

  const findSpecialArticle = (title: string) => selectedCoverage.articles.find((article) => article.title === title)
  const paymentArticle = findSpecialArticle('보험금 지급요건')
  const coveredArticle = selectedCoverage.articles.find((article) => article.title === '보상하는 손해' || article.title === '보상하는 비용')
  const excludedArticle = selectedCoverage.articles.find((article) => article.title === '보상하지 않는 손해' || article.title === '보상하지 않는 비용')
  const paymentRequirements = paymentArticle?.items?.filter((item): item is string => typeof item === 'string') ?? paymentArticle?.paragraphs ?? []
  const coveredItems = wordingPolicyItems(coveredArticle)
  const excludedItems = wordingPolicyItems(excludedArticle)
  const commonTermArticle = aiFullPolicyDraftMock.commonPolicy.sections.flatMap((section) => section.articles).find((article) => article.number === 2)
  const selectedTermArticle = selectedCoverage.articles.find((article) => article.number === 2)
  const policyTerms = Array.from(new Map(
    [...wordingPolicyTermItems(commonTermArticle), ...wordingPolicyTermItems(selectedTermArticle)].map((item) => [item.term, item]),
  ).values())
  const referenceDocuments = data.referenceDocuments ?? []
  const referenceReasons = [...(data.possibleReasons ?? []), ...(data.improvementReasons ?? [])].filter(Boolean)

  void onOpenPolicyDraft
  void onNavigateTab

  const copyText = async (text: string, successMessage: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable')
      await navigator.clipboard.writeText(text)
      setCopyMessage(successMessage)
    } catch {
      setCopyMessage('브라우저에서 복사 권한을 허용해 주세요.')
    }
  }

  const copyRecommendedCoverage = () => copyText(selectedCoverage.recommendedCoverageCopy, '보장 문구를 복사했습니다.')
  const copyFullPolicy = () => copyText(buildFullPolicyCopyText(aiFullPolicyDraftMock), '전체 약관 초안을 복사했습니다.')

  const scrollToArticle = (key: string) => {
    setActiveArticleKey(key)
    window.requestAnimationFrame(() => document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const commonTocEntries = aiFullPolicyDraftMock.commonPolicy.sections.flatMap((section) => section.articles.map((article) => ({
    key: 'common-' + section.id + '-' + article.number,
    label: '제' + article.number + '조 ' + article.title,
  })))
  const specialTocEntries = aiFullPolicyDraftMock.specialClauses.map((clause) => ({
    key: 'special-' + clause.id,
    label: clause.shortTitle,
  }))

  useEffect(() => {
    if (typeof window === 'undefined' || !fullDraftRef.current || printMode) return
    const articles = Array.from(fullDraftRef.current.querySelectorAll<HTMLElement>('[data-policy-article-key]'))
    if (!articles.length || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) setActiveArticleKey((visible.target as HTMLElement).dataset.policyArticleKey ?? null)
    }, { rootMargin: '-16% 0px -70% 0px', threshold: 0 })
    articles.forEach((article) => observer.observe(article))
    return () => observer.disconnect()
  }, [selectedCoverageId, printMode])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let previousOpenStates: boolean[] = []
    const getDetails = () => Array.from(wordingComponentsRef.current?.querySelectorAll('details') ?? [])
    const openDetailsForPrint = () => {
      const details = getDetails()
      previousOpenStates = details.map((detail) => detail.open)
      details.forEach((detail) => { detail.open = true })
    }
    const restoreDetailsAfterPrint = () => {
      getDetails().forEach((detail, index) => { detail.open = previousOpenStates[index] ?? detail.open })
    }
    window.addEventListener('beforeprint', openDetailsForPrint)
    window.addEventListener('afterprint', restoreDetailsAfterPrint)
    return () => {
      window.removeEventListener('beforeprint', openDetailsForPrint)
      window.removeEventListener('afterprint', restoreDetailsAfterPrint)
    }
    }, [])

  useEffect(() => {
    if (!dedicatedPrintRequested || typeof document === 'undefined') return
    const bodyClass = 'report-page__dedicated-wording-print'
    document.body.classList.add(bodyClass)
    if (!dedicatedPrintStarted.current) {
      dedicatedPrintStarted.current = true
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()))
    }
    const restoreAfterDedicatedPrint = () => {
      document.body.classList.remove(bodyClass)
      setDedicatedPrintRequested(false)
      setDedicatedPrintCreatedAt(null)
      dedicatedPrintStarted.current = false
      if (previousPrintTitle.current !== null) {
        document.title = previousPrintTitle.current
        previousPrintTitle.current = null
      }
    }
    window.addEventListener('afterprint', restoreAfterDedicatedPrint)
    return () => {
      document.body.classList.remove(bodyClass)
      window.removeEventListener('afterprint', restoreAfterDedicatedPrint)
    }
  }, [dedicatedPrintRequested])

  const printWordingDocument = () => {
    if (typeof window === 'undefined') return
    if (previousPrintTitle.current === null) previousPrintTitle.current = document.title
    document.title = `약관 검토 문서 - ${selectedCoverage.shortTitle}`
    setDedicatedPrintCreatedAt(new Date().toISOString())
    setDedicatedPrintRequested(true)
  }

  return (
    <>
      <section ref={wordingComponentsRef} className={'report-page__section report-page__wording-section' + (dedicatedPrintRequested ? ' report-page__wording-section--dedicated-print' : '')} aria-label="약관화 검토">
      <SectionHeading number="06" eyebrow="" title="약관화 검토" />

      <div className="report-page__wording-main-flow">
        <section className="report-page__wording-risk-summary" aria-labelledby="wording-risk-title">
          <div className="report-page__wording-risk-summary-card">
            <p className="report-page__wording-risk-summary-label">분석 대상 위험</p>
            <h3 id="wording-risk-title">{WORDING_RISK_SUMMARY_COPY.title}</h3>
            <p className="report-page__wording-risk-summary-description">{WORDING_RISK_SUMMARY_COPY.description}</p>
            <dl className="report-page__wording-risk-summary-meta">
              <div><dt>위험 ID</dt><dd>{WORDING_ANALYSIS_RISK.riskId}</dd></div>
              <div><dt>보험종목</dt><dd>{WORDING_RISK_SUMMARY_COPY.insuranceType}</dd></div>
              <div><dt>주요 피해 대상</dt><dd>{WORDING_RISK_SUMMARY_COPY.affected}</dd></div>
              <div><dt>도출 근거</dt><dd>{WORDING_RISK_SUMMARY_COPY.basis}</dd></div>
            </dl>
          </div>
        </section>

        <section className="report-page__wording-main-zone report-page__wording-zone-a" aria-labelledby="wording-proposal-title">
          <div className="report-page__wording-zone-heading report-page__wording-proposal-heading">
            <div><h3 id="wording-proposal-title">AI 제안 보장 항목</h3><p>보장 항목을 선택하면 선택한 항목의 추천 보장 문구, 지급요건과 약관 초안 전체를 함께 확인할 수 있습니다.</p></div>
          </div>
          <div className="report-page__wording-proposal-grid" role="tablist" aria-label="AI 제안 보장 항목">
            {aiFullPolicyDraftMock.specialClauses.map((clause, index) => {
              const isSelected = selectedCoverage.id === clause.id
              return (
                <button key={clause.id} className={'report-page__wording-proposal-card' + (isSelected ? ' is-selected' : '')} type="button" role="tab" aria-selected={isSelected} onClick={() => setSelectedCoverageId(clause.id)}>
                  <span className="report-page__wording-proposal-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="report-page__wording-proposal-card-title"><strong>{clause.shortTitle}</strong>{isSelected ? <em>선택됨</em> : null}</span>
                  <small>{clause.summary}</small>
                  <span className="report-page__wording-proposal-reason"><b>제안 이유</b>{clause.proposalReason}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="report-page__wording-main-zone report-page__wording-recommended-copy" aria-labelledby="wording-recommended-title">
          <div className="report-page__wording-zone-heading">
            <div><h3 id="wording-recommended-title">추천 보장 문구</h3><p>선택한 보장 항목에 적용할 핵심 문구를 확인합니다.</p></div>
            <div className="report-page__wording-draft-actions report-page__no-print"><button className="report-page__button" type="button" onClick={copyRecommendedCoverage}>보장 문구 복사</button></div>
          </div>
          <blockquote className="report-page__wording-draft-quote"><WordingHighlightedText text={selectedCoverage.recommendedCoverageCopy} /></blockquote>
          {copyMessage ? <p className="report-page__copy-message report-page__no-print" role="status">{copyMessage}</p> : null}
        </section>

        <section className="report-page__wording-main-zone report-page__wording-zone-b" aria-labelledby="wording-payment-title">
          <div className="report-page__wording-zone-heading">
            <div><h3 id="wording-payment-title">보험금 지급요건</h3><p>선택한 특별약관의 지급요건과 약관 확정 전 실무 판단사항을 함께 확인합니다.</p></div>
          </div>
          <div className="report-page__wording-payment-decision-grid">
            <article className="report-page__wording-condition-card">
              <header><h4>보험금 지급요건</h4><p>아래 요건을 모두 충족하는 경우 보험금 지급 대상으로 검토합니다.</p></header>
              <ol>{paymentRequirements.map((condition, index) => <li key={condition}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span><WordingPaymentRequirementText text={condition} /></span></li>)}</ol>
            </article>
            <article className="report-page__wording-decision-card">
              <header><h4>약관 확정 전 결정사항</h4><p>AI 권고안과 판단 근거를 확인한 뒤 실무 검토가 필요한 항목입니다.</p></header>
              <div className="report-page__wording-decision-list">
                {selectedCoverage.decisionItems.map((decision, index) => (
                  <details key={decision.id} className="report-page__wording-decision-row" open={printMode || undefined}>
                    <summary><span className="report-page__wording-decision-number">{String(index + 1).padStart(2, '0')}</span><span className="report-page__wording-decision-question"><strong>{decision.question}</strong><small>AI 권고 요약: {compactCriterionText(decision.recommendation, 150)}</small></span></summary>
                    <div className="report-page__wording-decision-detail">
                      <div><h5>AI 권고안</h5><p>{decision.recommendation}</p></div>
                      <div><h5>판단 근거</h5><p>{decision.rationale}</p><small>{decision.basis}</small></div>
                      <div><h5>적용한 가정</h5><ul>{decision.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul></div>
                      <div className="report-page__wording-decision-confidence"><span>프로토타입 가정치</span><strong>{decision.confidence}</strong></div>
                    </div>
                  </details>
                ))}
              </div>
              <div className="report-page__wording-prototype-assumption">
                <span>{selectedCoverage.prototypeAssumptions.displayLabel}</span>
                <dl>
                  <div><dt>사고당 한도</dt><dd>{selectedCoverage.prototypeAssumptions.perAccidentLimit}</dd></div>
                  <div><dt>총 보상한도</dt><dd>{selectedCoverage.prototypeAssumptions.aggregateLimit}</dd></div>
                  <div><dt>자기부담금</dt><dd>{selectedCoverage.prototypeAssumptions.deductible}</dd></div>
                </dl>
              </div>
            </article>
          </div>
        </section>

        <section className="report-page__wording-main-zone report-page__wording-zone-c" aria-labelledby="wording-scope-title">
          <div className="report-page__wording-zone-heading">
            <div><h3 id="wording-scope-title">보장 범위와 보장 제외 범위</h3><p>선택한 특별약관이 보장하는 손해와 보상하지 않는 손해를 구분해 확인합니다.</p></div>
          </div>
          <div className="report-page__wording-loss-grid">
            <article className="report-page__wording-loss-card report-page__wording-loss-card--covered">
              <small>선택한 특별약관이 보장하는 손해</small><h4>보장 범위</h4>
              <ul>{coveredItems.map((item, index) => <li key={'covered-' + index}><span className="report-page__wording-loss-icon" aria-hidden="true">✓</span><span className="report-page__wording-loss-copy">{typeof item === 'string' ? <WordingHighlightedText text={item} /> : <><strong className="report-page__wording-loss-term">{item.term}</strong><span>{item.definition}</span></>}</span></li>)}</ul>
            </article>
            <article className="report-page__wording-loss-card report-page__wording-loss-card--excluded">
              <small>선택한 특별약관이 보장하지 않는 손해</small><h4>보장 제외 범위</h4>
              <ul>{excludedItems.map((item, index) => <li key={'excluded-' + index}><span className="report-page__wording-loss-icon" aria-hidden="true">–</span><span className="report-page__wording-loss-copy">{typeof item === 'string' ? <WordingHighlightedText text={item} /> : <><strong className="report-page__wording-loss-term">{item.term}</strong><span>{item.definition}</span></>}</span></li>)}</ul>
            </article>
          </div>
        </section>

        <section ref={fullDraftRef} className="report-page__wording-main-zone report-page__wording-full-policy" aria-labelledby="wording-full-policy-title">
          <div className="report-page__wording-zone-heading">
            <div><h3 id="wording-full-policy-title">AI 전체 약관 초안</h3><p>보통약관, 세 가지 특별약관과 부속 명세를 한 문서 흐름으로 검토합니다.</p></div>
            <div className="report-page__wording-draft-actions report-page__no-print"><button className="report-page__button report-page__wording-print-action" type="button" onClick={printWordingDocument}><AppIcon name="report" size={15} />약관 검토 PDF 출력</button><button className="report-page__button" type="button" onClick={copyFullPolicy}>전체 약관 복사</button></div>
          </div>
          <div className="report-page__wording-policy-layout">
            <nav className="report-page__wording-policy-toc report-page__no-print" aria-label="전체 약관 목차">
              <strong>약관 목차</strong>
              <div className="report-page__wording-policy-toc-group"><span>보통약관</span>{commonTocEntries.map((entry) => <button key={entry.key} className={activeArticleKey === entry.key ? 'is-active' : ''} type="button" onClick={() => scrollToArticle(entry.key)}>{entry.label}</button>)}</div>
              <div className="report-page__wording-policy-toc-group"><span>특별약관</span>{specialTocEntries.map((entry) => <button key={entry.key} className={activeArticleKey === entry.key ? 'is-active' : ''} type="button" onClick={() => { setActiveArticleKey(entry.key); document.getElementById(entry.key)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{entry.label}</button>)}</div>
              <select aria-label="보통약관 조문 선택" value={commonTocEntries.some((entry) => entry.key === activeArticleKey) ? (activeArticleKey ?? '') : ''} onChange={(event) => { if (event.target.value) scrollToArticle(event.target.value) }}><option value="">조문 선택</option>{commonTocEntries.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select>
            </nav>
            <div className="report-page__wording-policy-document">
              <header className="report-page__wording-policy-cover"><span>FULL POLICY DRAFT</span><h4>{aiFullPolicyDraftMock.documentTitle}</h4><p>상품 구조와 세 가지 추천 보장 항목을 함께 반영한 검토용 약관 초안입니다.</p></header>
              <section className="report-page__wording-policy-common" aria-labelledby="wording-common-policy-title">
                <h4 id="wording-common-policy-title">{aiFullPolicyDraftMock.commonPolicy.title}</h4>
                {aiFullPolicyDraftMock.commonPolicy.sections.map((section) => <section className="report-page__wording-policy-section" key={section.id}><h5>{section.title}</h5>{section.articles.map((article) => wordingPolicyArticle(article, 'common-' + section.id + '-' + article.number, activeArticleKey, setActiveArticleKey))}</section>)}
              </section>
              {aiFullPolicyDraftMock.specialClauses.map((clause) => {
                const clauseKey = 'special-' + clause.id
                const isSelected = selectedCoverage.id === clause.id
                return (
                  <section id={clauseKey} className={'report-page__wording-policy-clause' + (isSelected ? ' is-selected' : '')} key={clause.id} aria-labelledby={clauseKey + '-title'}>
                    <div className="report-page__wording-policy-clause-heading"><span>특별약관</span><h4 id={clauseKey + '-title'}>{clause.title}</h4>{isSelected ? <em>현재 검토 중</em> : null}</div>
                    <div className="report-page__wording-policy-recommended"><span>추천 보장 문구</span><p>{clause.recommendedCoverageCopy}</p></div>
                    {clause.articles.map((article) => wordingPolicyArticle(article, clauseKey + '-' + article.number, activeArticleKey, setActiveArticleKey))}
                  </section>
                )
              })}
              <section className="report-page__wording-policy-attachments" aria-labelledby="wording-attachments-title"><h4 id="wording-attachments-title">부속 명세</h4><ul>{aiFullPolicyDraftMock.attachments.map((item, index) => <li key={item.title}><strong>{index + 1}. {item.title}</strong><span>{item.description}</span></li>)}</ul></section>
            </div>
          </div>
          {copyMessage ? <p className="report-page__copy-message report-page__no-print" role="status">{copyMessage}</p> : null}
        </section>

        <section className="report-page__wording-main-zone report-page__wording-grounds" aria-labelledby="wording-grounds-title">
          <div className="report-page__wording-zone-heading"><div><h3 id="wording-grounds-title">약관 작성 근거와 핵심 용어</h3><p>전체 약관 초안에 반영한 작성 근거와 선택 보장 항목의 핵심 정의를 확인합니다.</p></div></div>
          <div className="report-page__wording-grounds-grid">
            <article><h4>약관 작성 근거</h4><ul>{referenceReasons.slice(0, 6).map((reason) => <li key={reason}>{reason}</li>)}</ul>{referenceDocuments.length ? <div className="report-page__wording-reference-list">{referenceDocuments.slice(0, 4).map((document) => <div key={String(document.id)}><strong>{String(document.name ?? '')}</strong><small>{String(document.id ?? '')} · {String(document.usedFor ?? '')}</small><button className="report-page__text-button report-page__no-print" type="button" onClick={() => onOpenDocument(document)}>자료 정보 보기 →</button></div>)}</div> : null}</article>
            <article><h4>핵심 용어</h4><div className="report-page__wording-term-columns">{policyTerms.map((item) => <p key={item.term}><strong>{item.term}</strong><span>{item.definition}</span></p>)}</div></article>
          </div>
        </section>
      </div>
      </section>
      {dedicatedPrintRequested && dedicatedPrintCreatedAt && typeof document !== 'undefined' ? createPortal(<WordingPolicyPrintLayout report={report} selectedCoverage={selectedCoverage} createdAt={dedicatedPrintCreatedAt} />, document.body) : null}
    </>
  )
}

const evidenceDocumentType = (item: EvidenceItem): string => {
  if (/상품요약서/.test(item.title)) return '상품요약서'
  if (/사업방법서/.test(`${item.type} ${item.title}`)) return '사업방법서'
  if (/약관/.test(`${item.type} ${item.title}`)) return '약관'
  if (/뉴스/.test(item.type)) return '뉴스'
  if (/통계/.test(item.type)) return '통계'
  if (/산업동향/.test(item.type)) return '산업동향'
  if (/법령|규제/.test(item.type)) return '법령·안전기준'
  if (/분쟁|사례/.test(item.type)) return '사고 사례'
  if (/손해/.test(item.type)) return '손해 사례'
  return item.type || '기타 자료'
}

const displayEvidenceTitle = (item: EvidenceItem): string => item.title.replace(/프로토타입용\s*|프로토타입\s*|가상\s*/g, '').trim()

const evidenceTypeTone = (type: string): string => {
  if (/뉴스|산업동향/.test(type)) return 'news'
  if (/사고|손해/.test(type)) return 'incident'
  if (/법령|안전기준/.test(type)) return 'legal'
  if (/상품요약서|사업방법서|약관/.test(type)) return 'insurance'
  if (/통계/.test(type)) return 'statistics'
  return 'default'
}

const evidenceTypeIcon = (type: string): string => {
  if (/뉴스/.test(type)) return '▤'
  if (/산업동향/.test(type)) return '↗'
  if (/사고|손해/.test(type)) return '!'
  if (/법령|안전기준/.test(type)) return '§'
  if (/상품요약서|사업방법서|약관/.test(type)) return '▱'
  if (/통계/.test(type)) return '▥'
  return '•'
}

const displayEvidenceSource = (item: EvidenceItem): string => {
  const source = (item.source ?? '').trim()
  if (/사용자 제공 실제 자료/.test(source)) return '사용자 제공 자료'
  if (!source || /프로토타입|가상자료|가상 자료|화면 시연|mock/i.test(source)) return item.originalAvailable ? '원문 연결' : '원문 미연결'
  return source.replace(/사용자 제공 실제 자료/g, '사용자 제공 자료')
}

const evidencePurpose = (item: EvidenceItem): string => {
  const searchable = `${item.type} ${item.title}`
  if (/뉴스/.test(searchable)) return '위험 증가성과 사고 확산 가능성 확인'
  if (/산업동향/.test(searchable)) return '잠재 시장과 위험 노출 대상 확인'
  if (/분쟁|사례/.test(searchable)) return '책임관계와 보상 지연 가능성 확인'
  if (/손해/.test(searchable)) return '피해 심각성과 최대 손해 가능성 검토'
  if (/법령|규제/.test(searchable)) return '규제 변화와 상품 운영조건 검토'
  const usedFor = item.usedFor?.slice(0, 3).join('·')
  return usedFor ? `${usedFor} 관련 상품 구조와 보장 범위 참고` : '위험 분석과 상품화 검토에 참고'
}

const formatEvidenceDate = (value?: string | null): string => value ? value.replace(/-/g, '.') : '기준일 확인 필요'

const REPORT_SECTION_LABELS = {
  'ai-judgment': '상품화 검토 요약',
  'coverage-gap': '보장 범위와 공백',
  wording: '약관화 가능성',
  feasibility: '상품화 종합평가',
  proposal: '상품 구조 추천',
  briefing: '종합 브리핑',
} as const

type EvidenceSectionKey = keyof typeof REPORT_SECTION_LABELS

const evidenceSectionKeysOf = (item: EvidenceItem): EvidenceSectionKey[] => {
  const explicit = (item.usedInSections ?? []).filter((key): key is EvidenceSectionKey => key in REPORT_SECTION_LABELS)
  if (explicit.length) return [...new Set(explicit)]

  // Older reports only contain usedFor. Keep the section mapping in one place
  // until the report repository starts returning explicit usedInSections.
  const searchable = `${item.type} ${item.title} ${(item.usedFor ?? []).join(' ')}`
  const sections: EvidenceSectionKey[] = []
  if (/위험|시장|수요|사고|손해|집적/.test(searchable)) sections.push('ai-judgment')
  if (/보장|중복|보상|책임/.test(searchable)) sections.push('coverage-gap')
  if (/약관|특별약관|보험기간|지급|면책|사업방법서|상품요약서/.test(searchable)) sections.push('wording')
  if (/상품 구조|가입 대상|시설|보험기간|특별약관/.test(searchable)) sections.push('proposal')
  if (/상품화|요율|규제|위험관리|재보험|손해율/.test(searchable)) sections.push('feasibility')
  if (!sections.length) sections.push('briefing')
  return [...new Set(sections)]
}

const reviewStatusLabel = (item: ReportView['missingResearch'][number]): string => {
  const raw = item.status ?? ''
  if (/확보 완료|확인 완료/.test(raw)) return '공개자료 확인 완료'
  if (/일부/.test(raw)) return '공개자료 일부 확인'
  if (/기존.*보상|보상.*사례|구상|사고당.*손해|평균.*손해|손해액/.test(item.topic)) return '내부자료 확인 필요'
  if (/재보험|요율|위험률|손해율|최대예상손실/.test(item.topic)) return '전문가 검토 필요'
  if (/법령|안전기준/.test(item.topic)) return '공개자료 일부 확인'
  if (/미확보|공개자료 미확인/.test(raw)) return '현재 자료로 판단 불가'
  return raw || '판단 보류'
}

const reviewStatusTone = (status: string): string => {
  if (status === '공개자료 확인 완료') return 'confirmed'
  if (status === '공개자료 일부 확인') return 'partial'
  if (status === '공개자료 미확인') return 'public-missing'
  if (status === '내부자료 확인 필요') return 'internal'
  if (status === '전문가 검토 필요') return 'expert'
  if (status === '현재 자료로 판단 불가') return 'unable'
  return 'hold'
}

const reviewCurrentFinding = (item: ReportView['missingResearch'][number], status: string): string => {
  if (status === '공개자료 확인 완료') return '관련 공개자료에서 주요 내용을 확인했습니다.'
  if (status === '공개자료 일부 확인') return '관련 공개자료와 일부 사례를 확인했으나 세부 자료가 제한적입니다.'
  if (status === '내부자료 확인 필요') return '공개자료와 약관은 확인했으나 실제 내부 처리자료는 확인하지 못했습니다.'
  if (status === '전문가 검토 필요') return '공개자료만으로 정량 또는 수용 기준을 확정할 수 없습니다.'
  if (status === '현재 자료로 판단 불가') return '공개자료만으로는 해당 판단을 확정하기 어렵습니다.'
  return item.reason || '현재 자료의 확인 범위를 검토 중입니다.'
}

const reviewLimitationReason = (item: ReportView['missingResearch'][number], status: string): string => {
  if (/재보험/.test(item.topic)) return '재보험 조건과 인수 기준은 공개자료만으로 확인하기 어렵습니다.'
  if (/요율|위험률|손해율/.test(item.topic)) return '요율 산출에 필요한 사고 빈도와 손해액 원자료가 제한적입니다.'
  if (/손해액|보상사례|구상/.test(item.topic)) return '실제 보상·구상 자료는 공개 범위가 제한적입니다.'
  if (status === '공개자료 일부 확인') return '공개자료에 세부 기준이나 대상별 수치가 충분히 제시되지 않았습니다.'
  return '공개자료 검색만으로 확정하기 어려운 내부 판단 영역입니다.'
}

const reviewNextAction = (item: ReportView['missingResearch'][number]): string => {

  if (/재보험/.test(item.topic)) return '재보험 검토'
  if (/보상|구상|사례|손해액/.test(`${item.topic} ${item.responsibleTeam ?? ''}`)) return '보상 검토'
  if (/요율|위험률|손해율|사고 빈도|최대예상손실/.test(item.topic)) return '상품·계리 검토'
  if (/법령|안전기준|책임|판례/.test(item.topic)) return '법무 검토'
  if (/내부|보험/.test(item.responsibleTeam ?? '')) return '내부자료 확인'
  return '담당자 검토'
}

function EvidenceResearchSection({
  report,
  onOpenEvidence,
}: {
  report: ReportView
  onOpenEvidence: (evidence: EvidenceItem) => void
}) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const typeOptions = useMemo(
    () => [...new Set(report.evidence.map(evidenceDocumentType))].sort((a, b) => a.localeCompare(b, 'ko')),
    [report.evidence],
  )
  const filteredEvidence = useMemo(() => {
    const query = search.trim().toLowerCase()
    return report.evidence
      .filter((item) => {
        if (typeFilter !== 'all' && evidenceDocumentType(item) !== typeFilter) return false
        if (sectionFilter !== 'all' && !evidenceSectionKeysOf(item).includes(sectionFilter as EvidenceSectionKey)) return false
        if (!query) return true
        return `${displayEvidenceTitle(item)} ${item.id} ${evidencePurpose(item)}`.toLowerCase().includes(query)
      })
      .sort((a, b) => {
        const aTime = a.referenceDate ? Date.parse(a.referenceDate) : Number.NaN
        const bTime = b.referenceDate ? Date.parse(b.referenceDate) : Number.NaN
        if (Number.isNaN(aTime) && Number.isNaN(bTime)) return a.id.localeCompare(b.id)
        if (Number.isNaN(aTime)) return 1
        if (Number.isNaN(bTime)) return -1
        return sortOrder === 'newest' ? bTime - aTime : aTime - bTime
      })
  }, [report.evidence, search, sectionFilter, sortOrder, typeFilter])

  const resetEvidenceFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setSectionFilter('all')
    setSortOrder('newest')
  }

  return (
    <section className="report-page__section report-page__evidence-section" aria-labelledby="evidence-title">
      <SectionHeading
        number="08"
        eyebrow="EVIDENCE & REVIEW"
        title="근거자료 및 추가 확인사항"
      />
      <p className="report-page__evidence-intro" id="evidence-title">AI 상품화 판단에 활용한 주요 근거와 추가 검토가 필요한 항목을 확인합니다.</p>

      <div className="report-page__evidence-summary" aria-label="자료 현황">
        <span className="report-page__evidence-summary-item report-page__evidence-summary-item--actual"><strong>{report.evidence.length}</strong>참고 근거자료</span>
        <span className="report-page__evidence-summary-item report-page__evidence-summary-item--required"><strong>{report.missingResearch.length}</strong>추가 확인 필요</span>
      </div>
      <p className="report-page__evidence-notice"><span aria-hidden="true">ⓘ</span> 공개자료와 보험 문서를 함께 검토했으며, 공개자료만으로 확정하기 어려운 판단은 아래 추가 확인사항으로 구분했습니다.</p>

      <section className="report-page__evidence-list-section" aria-labelledby="evidence-list-title">
        <div className="report-page__evidence-section-heading"><div><h3 id="evidence-list-title">판단에 활용한 근거자료</h3><p>AI가 위험 분석과 상품화 검토에 참고한 주요 출처입니다.</p></div><span>{filteredEvidence.length} / {report.evidence.length}건</span></div>
        <div className="report-page__evidence-filter-bar report-page__no-print" role="search" aria-label="근거자료 검색 및 필터">
          <label className="report-page__evidence-filter-search"><span>자료 검색</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="자료명 또는 근거 ID 검색" /></label>
          <label><span>자료 유형</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">전체 자료 유형</option>{typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <label><span>활용 섹션</span><select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}><option value="all">전체 섹션</option>{Object.entries(REPORT_SECTION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label><span>정렬</span><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}><option value="newest">최신순</option><option value="oldest">오래된순</option></select></label>
          <button className="report-page__button report-page__button--secondary" type="button" onClick={resetEvidenceFilters} disabled={!search && typeFilter === 'all' && sectionFilter === 'all' && sortOrder === 'newest'}>필터 초기화</button>
        </div>
        {filteredEvidence.length ? (
          <div className="report-page__evidence-list" role="list" aria-label="근거자료 목록">
            {filteredEvidence.map((item) => {
              const sections = evidenceSectionKeysOf(item)
              const type = evidenceDocumentType(item)
              const tone = evidenceTypeTone(type)
              const sourceStatus = displayEvidenceSource(item)
              return (
                <article key={item.id} className={`report-page__evidence-card report-page__evidence-card--${tone}`} role="listitem">
                  <div className="report-page__evidence-card-head"><span className={`report-page__evidence-type report-page__evidence-type--${tone}`}><span className="report-page__evidence-type-icon" aria-hidden="true">{evidenceTypeIcon(type)}</span>{type}</span><span className="report-page__evidence-card-meta"><code>{item.id}</code><span className="report-page__evidence-meta-divider" aria-hidden="true">·</span><time className={!item.referenceDate ? 'report-page__evidence-date--missing' : undefined} dateTime={item.referenceDate ?? undefined}>{formatEvidenceDate(item.referenceDate)}</time></span></div>
                  <h4>{displayEvidenceTitle(item)}</h4>
                  <p className="report-page__evidence-card-purpose">{evidencePurpose(item)}</p>
                  <div className="report-page__evidence-card-sections"><span>활용 섹션</span>{sections.slice(0, 2).map((key) => <span className="report-page__evidence-section-chip" key={key}>{REPORT_SECTION_LABELS[key]}</span>)}{sections.length > 2 ? <span className="report-page__evidence-section-more">+{sections.length - 2}</span> : null}</div>
                  <div className="report-page__evidence-card-footer"><span className="report-page__evidence-source-hint">{sourceStatus}</span><button className="report-page__text-button report-page__no-print" type="button" onClick={() => onOpenEvidence(item)}>자료 정보 보기 <span aria-hidden="true">→</span></button></div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="report-page__evidence-empty" role="status"><strong>조건에 맞는 근거자료가 없습니다.</strong><p>검색어나 필터 조건을 변경해보세요.</p><button className="report-page__button report-page__button--secondary report-page__no-print" type="button" onClick={resetEvidenceFilters}>필터 초기화</button></div>
        )}
      </section>

      <section className="report-page__required-evidence" aria-labelledby="required-evidence-title">
        <div className="report-page__evidence-section-heading"><div><h3 id="required-evidence-title">추가 확인이 필요한 항목</h3><p>공개자료 검색만으로 확정하기 어렵거나 내부자료 및 전문가 검토가 필요한 항목입니다.</p></div><span>{report.missingResearch.length}건</span></div>
        <div className="report-page__required-evidence-table-wrap">
          <table className="report-page__required-evidence-table"><thead><tr><th>확인이 필요한 항목</th><th>현재 확인 결과</th><th>확인이 어려운 이유</th><th>다음 확인 방식</th><th>상태</th></tr></thead><tbody>
            {report.missingResearch.map((item) => { const status = reviewStatusLabel(item); return <tr key={item.id}><td data-label="확인이 필요한 항목"><strong>{item.topic}</strong><small>{item.id}</small></td><td data-label="현재 확인 결과">{reviewCurrentFinding(item, status)}</td><td data-label="확인이 어려운 이유">{reviewLimitationReason(item, status)}</td><td data-label="다음 확인 방식"><span className="report-page__research-team-chip">{reviewNextAction(item)}</span></td><td data-label="상태"><span className={`report-page__research-badge report-page__research-badge--${reviewStatusTone(status)}`}>{status}</span></td></tr> })}
          </tbody></table>
        </div>
      </section>
    </section>
  )
}

type ExecutiveBriefingStateTone = 'confirmed' | 'attention' | 'pending' | 'neutral'

type ExecutiveBriefingState = {
  label: string
  value: string
  tone: ExecutiveBriefingStateTone
}

type ExecutiveBriefingCoreCard = {
  id: string
  title: string
  status: string
  lines: string[]
  tab: ReportTabId
  tone: ExecutiveBriefingStateTone
}

type ExecutiveBriefingMetric = {
  id: string
  label: string
  value: string
  supporting: string
  basis: string
  confidence: string
  tone: ExecutiveBriefingStateTone
}

type ExecutiveBriefingPmlScenario = {
  label: string
  vehicleDamage: string
  partialDamage: string
  facilityCost: string
  result: string
}

type ExecutiveBriefingModel = {
  eyebrow: string
  description: string
  conclusion: string
  status: string
  conclusionBody: string
  conclusionPoints: string[]
  states: ExecutiveBriefingState[]
  coreCards: ExecutiveBriefingCoreCard[]
  metrics: ExecutiveBriefingMetric[]
  coverage: {
    existing: string[]
    gaps: string[]
    note: string
  }
  product: {
    name: string
    structure: string
    policyholder: string
    insured: string
    event: string
    loss: string
    settlement: string
    wordingPreview: string
    coverages: Array<{ title: string; description: string }>
  }
  financial: {
    estimate: FinancialEstimate
    pmlScenarios: ExecutiveBriefingPmlScenario[]
    pricingBase: ProposalPricingScenarioOutput
    assumptions: string[]
    evidenceIds: string[]
  }
  decisions: Array<{ id: string; title: string; recommendation: string; decision: string; basis: string }>
  tasks: Array<{ id: string; title: string; owner: string; action: string; output: string }>
  uncertainties: Array<{ title: string; current: string; impact: string; action: string; confidence: string }>
  evidence: Array<{ id: string; title: string; source: string }>
  reviewerStatus: BriefingReviewStatus
  reviewerOpinion: string
}

const firstBriefingValue = (values: Array<string | undefined> | undefined, fallback: string) => values?.find((value) => typeof value === 'string' && value.trim())?.trim() ?? fallback
const briefingConfidenceLabel = (confidence: EstimateConfidence) => ({ high: '높음', medium: '중간', low: '낮음' })[confidence]
const briefingEokNumber = (value: number) => Number.isInteger(value) ? value.toLocaleString('ko-KR') : value.toFixed(1).replace(/\.0$/u, '')
const briefingEokValue = (value: number) => `${briefingEokNumber(value)}억 원`
const briefingEokRange = (range: { min: number; max: number }) => `${briefingEokNumber(range.min)}억~${briefingEokNumber(range.max)}억 원`
const briefingPremiumNumber = (value: number) => Math.round(value / 10_000).toLocaleString('ko-KR')
const briefingPremium = (value: number) => `${briefingPremiumNumber(value)}만 원`
const briefingPremiumRange = (range: { min: number; max: number }) => `${briefingPremiumNumber(range.min)}만~${briefingPremiumNumber(range.max)}만 원`

function createExecutiveBriefing(report: ReportView): ExecutiveBriefingModel {
  const storedBriefing = createBriefingContent(report as unknown as ReportResult)
  const conclusion = ['검토 진행 권고', '검토 가치 있음'].includes(storedBriefing.conclusion) ? '상품 개발 검토 가치 있음' : storedBriefing.conclusion
  const feasibility = report.productFeasibility
  const proposal = report.productProposal
  const wording = report.wordingFeasibility
  const coverage = report.riskGapSummary
  const coreCardTabs: Record<string, ReportTabId> = { coverage: 'coverage-gap', feasibility: 'feasibility', proposal: 'proposal', wording: 'wording' }
  const coreCards = storedBriefing.coreCards.map((card) => ({
    ...card,
    tab: coreCardTabs[card.id] ?? 'feasibility',
    tone: card.id === 'coverage' || /추가|보완|확인 필요/u.test(card.status) ? 'attention' as ExecutiveBriefingStateTone : 'confirmed' as ExecutiveBriefingStateTone,
  }))
  const states = storedBriefing.counts.map((item) => ({
    label: item.label,
    value: item.value,
    tone: (item.label === '필수 기준' ? 'confirmed' : item.label === '보완 필요' ? 'attention' : item.label === '추가 확인' ? 'pending' : 'neutral') as ExecutiveBriefingStateTone,
  }))
  const financialEstimate = createFinancialEstimate({
    analyzedAt: report.meta.analysisBaseDate ?? report.meta.sourceAsOf ?? report.meta.generatedAt,
    evidenceIds: report.evidence.slice(0, 6).map((item) => item.id),
  })
  const pricingBase = PROPOSAL_PRICING_SCENARIO_OUTPUTS.find((scenario) => scenario.id === 'base') ?? PROPOSAL_PRICING_SCENARIO_OUTPUTS[0]
  const existingCoverage = (coverage.existingCoverageMap ?? []).slice(0, 4).map((item) => `${item.coverageName}: ${item.possibleCoverage ?? item.damage ?? '확인 필요'}`)
  const coverageGaps = (coverage.keyCoverageGaps ?? []).slice(0, 4).map((item) => `${item.title}${item.description ? ` · ${item.description}` : ''}`)
  const fallbackGaps = (coverage.existingCoverageMap ?? []).map((item) => item.remainingGap).filter((item): item is string => Boolean(item?.trim())).slice(0, 4)
  const gapItems = coverageGaps.length ? coverageGaps : fallbackGaps.length ? fallbackGaps : ['확인 필요']
  const productName = firstBriefingValue([proposal.workingName], '확인 필요')
  const productStructure = firstBriefingValue([proposal.recommendedForm], '확인 필요')
  const settlementDirection = firstBriefingValue([proposal.settlementDirection], '확인 필요')
  const productCoverages = PROPOSAL_COVERAGE_SUMMARY.basic.map((item) => ({ title: item.title, description: item.description }))
  const pmlScenarios = FEASIBILITY_PML_DATA.scenarios.map((scenario) => ({
    label: scenario.label,
    vehicleDamage: formatKrwCompact(scenario.breakdown.totalLossVehicleDamage),
    partialDamage: formatKrwCompact(scenario.breakdown.partialDamageVehicleDamage),
    facilityCost: formatKrwCompact(scenario.breakdown.facilityEmergencyCost),
    result: formatKrwCompact(scenario.result),
  }))
  const confidence = briefingConfidenceLabel(financialEstimate.confidence)
  const missingResearch = report.missingResearch.slice(0, 5)
  const taskSources = missingResearch.length
    ? missingResearch
    : report.aiSummary.nextActions?.map((item) => ({ id: item.id, topic: item.action, reason: item.reason, responsibleTeam: item.responsibleTeams?.[0], requiredMaterials: [] })) ?? []
  const tasks = taskSources.map((item) => ({
      id: item.id,
      title: item.topic,
      owner: item.responsibleTeam ?? '상품개발',
      action: item.reason ?? '확인 필요',
      output: item.requiredMaterials?.[0] ?? '검토 결과 및 결정 근거',
    }))
  const uncertaintyItems = [
    ...(wording.ambiguities ?? []).slice(0, 2).map((item) => ({ title: item.issue, current: item.question ?? '약관 문구와 지급 기준을 추가 확인해야 합니다.', impact: '지급 시점과 보상 범위에 영향을 줍니다.', action: item.owner ? `${item.owner} 검토 후 기준 확정` : '보상·법무 검토 후 기준 확정', confidence })),
    ...report.missingResearch.slice(0, 3).map((item) => ({ title: item.topic, current: item.reason ?? '내부 확인자료가 필요합니다.', impact: '상품 조건과 추정치의 확정 수준에 영향을 줍니다.', action: item.responsibleTeam ? `${item.responsibleTeam} 자료 확보` : '내부 자료 확보', confidence })),
  ]
  const decisionTopics = Array.from(new Set([
    ...(proposal.unresolvedItems ?? []),
    ...(wording.ambiguities ?? []).map((item) => item.issue),
    ...(feasibility.assessment?.priorityActions ?? []),
  ].filter(Boolean))).slice(0, 4)
  const decisions = (decisionTopics.length ? decisionTopics : ['확인 필요']).map((topic, index) => ({
    id: `decision-${index + 1}`,
    title: topic,
    recommendation: '기준 확정 필요',
    decision: '회의에서 담당자·기준·확정 시점을 결정',
    basis: '앞 탭의 미확정 사항 및 후속 검토 과제',
  }))
  return {
    eyebrow: storedBriefing.eyebrow,
    description: storedBriefing.disclaimer,
    conclusion,
    status: storedBriefing.decisionStatus,
    conclusionBody: storedBriefing.checks.join(' '),
    conclusionPoints: storedBriefing.checks.slice(0, 4),
    states,
    coreCards,
    metrics: [
      { id: 'tam', label: '총도달가능시장', value: `${financialEstimate.tamRange.base}억 원/년`, supporting: `${financialEstimate.tamRange.min}억~${financialEstimate.tamRange.max}억 원 · ${financialEstimate.marketGrade}등급`, basis: `시장성 ${financialEstimate.marketScore}점 · ${confidence}`, confidence, tone: 'confirmed' },
      { id: 'pml', label: '사고당 PML', value: briefingEokValue(financialEstimate.pmlRange.base), supporting: `추정 범위 ${briefingEokRange(financialEstimate.pmlRange)} · 기준 시나리오`, basis: '상품화 종합평가 PML 산정 결과', confidence, tone: 'attention' },
      { id: 'premium', label: '제안 보험료', value: `연 ${briefingPremium(financialEstimate.premiumRange.base)}`, supporting: `연 ${briefingPremiumRange(financialEstimate.premiumRange)} · 계약당`, basis: '사고 빈도·손해액·사업비·불확실성 가정', confidence, tone: 'attention' },
      { id: 'loss-ratio', label: '예상 손해율', value: `${financialEstimate.expectedLossRatioRange.base.toFixed(1)}%`, supporting: `${financialEstimate.expectedLossRatioRange.min.toFixed(1)}~${financialEstimate.expectedLossRatioRange.max.toFixed(1)}% · 기준 시나리오`, basis: '예상 손해액과 제안 보험료 산식', confidence, tone: 'attention' },
    ],
    coverage: {
      existing: existingCoverage.length ? existingCoverage : ['확인 필요'],
      gaps: gapItems,
      note: '기존 보험의 지급액과 책임 확정 여부를 먼저 확인한 뒤 신규 보장에서 중복 금액을 조정합니다.',
    },
    product: {
      name: productName,
      structure: productStructure,
      policyholder: firstBriefingValue(proposal.expectedPolicyholder, '확인 필요'),
      insured: firstBriefingValue([proposal.expectedInsured, proposal.coveredObject], '확인 필요'),
      event: firstBriefingValue([proposal.coveredEvent], '확인 필요'),
      loss: firstBriefingValue([proposal.coveredLoss], '확인 필요'),
      settlement: settlementDirection,
      wordingPreview: firstBriefingValue([storedBriefing.coverageDraft], '확인 필요'),
      coverages: productCoverages,
    },
    financial: { estimate: financialEstimate, pmlScenarios, pricingBase, assumptions: financialEstimate.assumptions, evidenceIds: financialEstimate.evidenceIds },
    decisions,
    tasks,
    uncertainties: uncertaintyItems,
    evidence: report.evidence.slice(0, 6).map((item) => ({ id: item.id, title: item.title, source: item.source })),
    reviewerStatus: storedBriefing.reviewerStatus,
    reviewerOpinion: storedBriefing.reviewerOpinion,
  }
}

function ExecutiveBriefingSection({
  report,
  onNavigateTab,
  onSaveReviewerReview,
  onReviewerDirtyChange,
  discardRevision = 0,
}: {
  report: ReportView
  onNavigateTab?: (id: ReportTabId) => void
  onSaveReviewerReview?: (status: BriefingReviewStatus, opinion: string) => Promise<void>
  onReviewerDirtyChange?: (dirty: boolean) => void
  discardRevision?: number
}) {
  const briefing = createExecutiveBriefing(report)
  const canEditReviewer = Boolean(onSaveReviewerReview)
  const [reviewerStatus, setReviewerStatus] = useState<BriefingReviewStatus>(briefing.reviewerStatus)
  const [reviewerOpinion, setReviewerOpinion] = useState(briefing.reviewerOpinion)
  const [reviewerSaveState, setReviewerSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [reviewerSaveMessage, setReviewerSaveMessage] = useState('')
  const reviewerDirty = canEditReviewer && (reviewerStatus !== briefing.reviewerStatus || reviewerOpinion !== briefing.reviewerOpinion)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setReviewerStatus(briefing.reviewerStatus)
    setReviewerOpinion(briefing.reviewerOpinion)
    setReviewerSaveState('idle')
    setReviewerSaveMessage('')
  }, [briefing.reviewerStatus, briefing.reviewerOpinion])

  useEffect(() => {
    if (!discardRevision) return
    setReviewerStatus(briefing.reviewerStatus)
    setReviewerOpinion(briefing.reviewerOpinion)
    setReviewerSaveState('idle')
    setReviewerSaveMessage('')
  }, [briefing.reviewerStatus, briefing.reviewerOpinion, discardRevision])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    onReviewerDirtyChange?.(reviewerDirty)
  }, [onReviewerDirtyChange, reviewerDirty])

  const saveReviewerMemo = async () => {
    if (!onSaveReviewerReview || !reviewerDirty) return
    setReviewerSaveState('saving')
    setReviewerSaveMessage('')
    try {
      await onSaveReviewerReview(reviewerStatus, reviewerOpinion)
      setReviewerSaveState('saved')
      setReviewerSaveMessage('저장 완료')
    } catch (error) {
      setReviewerSaveState('error')
      setReviewerSaveMessage(error instanceof Error ? error.message : '메모 저장에 실패했습니다.')
    }
  }

  return (
    <section className="report-page__section report-page__briefing report-page__briefing--decision" aria-label="종합 브리핑">
      <SectionHeading number="07" eyebrow={briefing.eyebrow} title={reportLabel(report, 'briefingTitle', '종합 브리핑')} />

      <section className="report-page__decision-briefing-conclusion" aria-labelledby="decision-briefing-conclusion-title">
        <div className="report-page__decision-briefing-conclusion-head">
          <div><p className="report-page__decision-briefing-kicker">최종 검토 결론</p><h3 id="decision-briefing-conclusion-title">{briefing.conclusion}</h3></div><span className="report-page__decision-briefing-status">{briefing.status}</span>
        </div>
        <ul className="report-page__decision-briefing-conclusion-points">
          {briefing.conclusionPoints.slice(0, 4).map((point, index) => <li key={point}><span aria-hidden="true">{index === 3 ? '!' : '✓'}</span>{point}</li>)}
        </ul>
        <div className="report-page__decision-briefing-state-grid" aria-label="최종 검토 상태 요약">
          {briefing.states.map((state) => <div className={`report-page__decision-briefing-state report-page__decision-briefing-state--${state.tone}`} key={state.label}><span>{state.label}</span><strong>{state.value}</strong></div>)}
        </div>
      </section>

      <section className="report-page__decision-briefing-section" aria-labelledby="decision-briefing-core-title">
        <div className="report-page__decision-briefing-section-head"><div><p className="report-page__decision-briefing-kicker">CORE REVIEW RESULTS</p><h3 id="decision-briefing-core-title">핵심 검토 결과</h3></div></div>
        <div className="report-page__decision-briefing-core-grid">
          {briefing.coreCards.map((card) => <article className={`report-page__decision-briefing-core-card report-page__decision-briefing-core-card--${card.tone}`} key={card.id}>
            <div className="report-page__decision-briefing-core-card-head"><h4>{card.title}</h4><span>{card.status}</span></div>
            <ul>{card.lines.slice(0, 2).map((line) => <li key={line}><span aria-hidden="true">✓</span>{line}</li>)}</ul>
            {onNavigateTab ? <button className="report-page__text-button report-page__no-print" type="button" onClick={() => onNavigateTab(card.tab)}>상세 보기 →</button> : null}
          </article>)}
        </div>
      </section>

      <section className="report-page__decision-briefing-section report-page__decision-briefing-finance" aria-labelledby="decision-briefing-finance-title">
        <div className="report-page__decision-briefing-section-head"><div><p className="report-page__decision-briefing-kicker">KEY FINANCIAL INDICATORS</p><h3 id="decision-briefing-finance-title">핵심 정량 지표</h3></div>{onNavigateTab ? <button className="report-page__text-button report-page__no-print" type="button" onClick={() => onNavigateTab('feasibility')}>상세 보기 →</button> : null}</div>
        <div className="report-page__decision-briefing-finance-summary">
          {briefing.metrics.map((metric) => <article className={`report-page__decision-briefing-finance-card report-page__decision-briefing-finance-card--${metric.tone}`} key={metric.id}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.supporting}</small><em>{metric.confidence} · 1차 추정</em></article>)}
        </div>
        <p className="report-page__decision-briefing-finance-note">프로토타입 추정치 · 신뢰도 {briefingConfidenceLabel(briefing.financial.estimate.confidence)} · 상세 산출 근거는 상품화 종합평가에서 확인</p>
      </section>

      <section className="report-page__decision-briefing-section" aria-labelledby="decision-briefing-product-title">
        <div className="report-page__decision-briefing-section-head"><div><p className="report-page__decision-briefing-kicker">RECOMMENDED PRODUCT</p><h3 id="decision-briefing-product-title">추천 상품 구조</h3></div>{onNavigateTab ? <button className="report-page__text-button report-page__no-print" type="button" onClick={() => onNavigateTab('proposal')}>상세 보기 →</button> : null}</div>
        <div className="report-page__decision-briefing-product-head"><div><span>상품명</span><strong>{briefing.product.name}</strong></div><div><span>계약 형태</span><strong>{briefing.product.structure}</strong></div></div>
        <dl className="report-page__decision-briefing-product-facts"><div><dt>계약자</dt><dd>{briefing.product.policyholder}</dd></div><div><dt>보장 대상</dt><dd>{briefing.product.insured}</dd></div><div><dt>보장 사고</dt><dd>{briefing.product.event}</dd></div><div><dt>보장 손해</dt><dd>{briefing.product.loss}</dd></div><div><dt>보상 방식</dt><dd>{briefing.product.settlement}</dd></div></dl>
        <div className="report-page__decision-briefing-wording-preview"><div><h4>추천 보장 문구 미리보기</h4><p>{briefing.product.wordingPreview}</p></div>{onNavigateTab ? <button className="report-page__text-button report-page__no-print" type="button" onClick={() => onNavigateTab('wording')}>약관 검토에서 전체 문구 보기 →</button> : null}</div>
      </section>

      <section className="report-page__decision-briefing-section" aria-labelledby="decision-briefing-decisions-title">
        <div className="report-page__decision-briefing-section-head"><div><p className="report-page__decision-briefing-kicker">DECISION & ACTIONS</p><h3 id="decision-briefing-decisions-title">실무 결정사항 및 우선 실행 과제</h3></div></div>
        <div className="report-page__decision-briefing-work-grid">
          <article className="report-page__decision-briefing-work-column"><h4>회의에서 결정할 사항</h4><ul className="report-page__decision-briefing-decision-checklist">{briefing.decisions.slice(0, 4).map((item) => <li key={item.id}><span aria-hidden="true">□</span><div><strong>{item.title}</strong><p>{item.decision}</p></div></li>)}</ul></article>
          <article className="report-page__decision-briefing-work-column"><div className="report-page__decision-briefing-work-column-head"><h4>우선 실행 과제</h4>{onNavigateTab ? <button className="report-page__text-button report-page__no-print" type="button" onClick={() => onNavigateTab('evidence')}>전체 과제 보기 →</button> : null}</div><ol className="report-page__decision-briefing-task-list">{briefing.tasks.slice(0, 3).map((task, index) => <li key={task.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{task.title}</strong><p>{task.action}</p></div></li>)}</ol></article>
        </div>
      </section>

      <section className="report-page__decision-briefing-section" aria-labelledby="decision-briefing-evidence-title">
        <div className="report-page__decision-briefing-section-head"><div><p className="report-page__decision-briefing-kicker">EVIDENCE & FOLLOW-UP</p><h3 id="decision-briefing-evidence-title">검토 근거 및 추가 확인사항</h3></div>{onNavigateTab ? <button className="report-page__text-button report-page__no-print" type="button" onClick={() => onNavigateTab('evidence')}>전체 근거자료 보기 →</button> : null}</div>
        <dl className="report-page__decision-briefing-evidence-meta"><div><dt>활용 근거자료</dt><dd>{report.meta.evidenceCount ?? report.evidence.length}건</dd></div><div><dt>분석 기준일</dt><dd>{displayDate(report.meta.analysisBaseDate)}</dd></div><div><dt>분석 신뢰도</dt><dd>{briefingConfidenceLabel(briefing.financial.estimate.confidence)}</dd></div></dl>
        <div className="report-page__decision-briefing-missing"><h4>추가 확보 필요 자료</h4><ul>{report.missingResearch.length ? report.missingResearch.slice(0, 3).map((item) => <li key={item.id}>{item.topic}</li>) : <li>확인 필요</li>}</ul></div>
        <div className="report-page__decision-briefing-variables"><h4>결과에 영향을 주는 주요 변수</h4><ul>{briefing.uncertainties.length ? briefing.uncertainties.slice(0, 3).map((item) => <li key={item.title}>{item.title}</li>) : <li>확인 필요</li>}</ul></div>
      </section>

      <section className="report-page__decision-briefing-reviewer" aria-labelledby="decision-briefing-reviewer-title">
        <div className="report-page__decision-briefing-section-head"><div><p className="report-page__decision-briefing-kicker">PRACTITIONER REVIEW</p><h3 id="decision-briefing-reviewer-title">실무자 검토</h3></div><StatusBadge>{canEditReviewer ? reviewerStatus : briefing.reviewerStatus}</StatusBadge></div>
        {canEditReviewer ? (
          <div className="report-page__briefing-reviewer-editor">
            <label className="report-page__briefing-reviewer-field"><span>검토 상태</span><select value={reviewerStatus} onChange={(event) => { setReviewerStatus(event.target.value as BriefingReviewStatus); setReviewerSaveState('idle'); setReviewerSaveMessage('') }}><option value="미검토">미검토</option><option value="검토 중">검토 중</option><option value="검토 완료">검토 완료</option></select></label>
            <label className="report-page__briefing-reviewer-field"><span>실무자 검토 메모</span><textarea value={reviewerOpinion} rows={5} placeholder="종합 검토 결과에 대한 실무자 의견을 작성해 주세요." onChange={(event) => { setReviewerOpinion(event.target.value); setReviewerSaveState('idle'); setReviewerSaveMessage('') }} /></label>
            <div className="report-page__briefing-reviewer-actions"><button className="report-page__button report-page__button--secondary" type="button" disabled={!reviewerDirty || reviewerSaveState === 'saving'} onClick={() => void saveReviewerMemo()}>{reviewerSaveState === 'saving' ? '저장 중…' : '메모 저장'}</button>{reviewerSaveMessage ? <span className={`report-page__briefing-reviewer-save-message report-page__briefing-reviewer-save-message--${reviewerSaveState}`} role="status">{reviewerSaveMessage}</span> : null}</div>
          </div>
        ) : reviewerStatus === '미검토' && !reviewerOpinion.trim() ? <p className="report-page__briefing-reviewer-empty">실무자 검토 전</p> : <div className="report-page__briefing-reviewer-saved"><p><strong>검토 상태</strong>{reviewerStatus}</p>{reviewerOpinion.trim() ? <p><strong>실무자 메모</strong>{reviewerOpinion}</p> : null}</div>}
      </section>
    </section>
  )
}

const REPORT_TABS = [
  { id: 'ai-judgment', label: '상품화 검토 요약', panelId: 'report-panel-ai-judgment' },
  { id: 'coverage-gap', label: '보장 공백', panelId: 'report-panel-coverage-gap' },
  { id: 'wording', label: '약관 검토', panelId: 'report-panel-wording' },
  { id: 'feasibility', label: '상품화 종합평가', panelId: 'report-panel-feasibility' },
  { id: 'proposal', label: '상품 개발 제안', panelId: 'report-panel-proposal' },
  { id: 'briefing', label: '종합 브리핑', panelId: 'report-panel-briefing' },
  { id: 'evidence', label: '근거자료 및 추가 확인사항', panelId: 'report-panel-evidence' },
] as const

type ReportTabId = (typeof REPORT_TABS)[number]['id']

type PdfPrintOptions = {
  includeCover: boolean
  includePageNumbers: boolean
  includeGeneratedAt: boolean
  includeAiOriginal: boolean
}

type PdfPrintRequest = {
  sections: ReportTabId[]
  options: PdfPrintOptions
  filename: string
  createdAt: string
}

const DEFAULT_PDF_OPTIONS: PdfPrintOptions = {
  includeCover: true,
  includePageNumbers: true,
  includeGeneratedAt: true,
  includeAiOriginal: true,
}

function ReportPdfMenu({
  activeTab,
  open,
  onToggle,

  onPrintAll,
  onPrintCurrent,
  onOpenSelection,
}: {
  activeTab: ReportTabId
  open: boolean
  onToggle: () => void
  onPrintAll: () => void
  onPrintCurrent: () => void
  onOpenSelection: () => void
}) {
  const currentLabel = REPORT_TABS.find((tab) => tab.id === activeTab)?.label ?? '현재 탭'
  return (
    <div className="report-page__pdf-menu">
      <button
        className="report-page__button report-page__button--primary report-page__pdf-menu-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>PDF 저장</span>
        <span className="report-page__pdf-menu-chevron" aria-hidden="true">▼</span>
      </button>
      {open ? (
        <div className="report-page__pdf-menu-list" role="menu" aria-label="PDF 출력 방식">
          <button type="button" role="menuitem" onClick={onPrintAll}>
            전체 리포트 출력
          </button>
          <button type="button" role="menuitem" onClick={onPrintCurrent}>
            현재 탭 출력 <span>({currentLabel})</span>
          </button>
          <button type="button" role="menuitem" onClick={onOpenSelection}>
            선택 항목 출력
          </button>
        </div>
      ) : null}
    </div>
  )
}

const getTabFromHash = (): ReportTabId => {
  if (typeof window === 'undefined') return REPORT_TABS[0].id
  const value = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('report-tab')
  return REPORT_TABS.some((tab) => tab.id === value) ? (value as ReportTabId) : REPORT_TABS[0].id
}

function ReportTabs({ activeTab, onChange }: { activeTab: ReportTabId; onChange: (id: ReportTabId) => void }) {
  useEffect(() => {
    // Keep the selected tab visible when a hash is restored or a panel is changed
    // through the keyboard/previous-next controls.
    window.requestAnimationFrame(() => {
      document.getElementById(`report-tab-${activeTab}`)?.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'center',
      })
    })
  }, [activeTab])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const target = event.key === 'Home' ? REPORT_TABS[0] : REPORT_TABS[REPORT_TABS.length - 1]
      onChange(target.id)
      document.getElementById(`report-tab-${target.id}`)?.focus()
      return
    }
    if (!direction) return
    event.preventDefault()
    const nextIndex = (index + direction + REPORT_TABS.length) % REPORT_TABS.length
    const target = REPORT_TABS[nextIndex]
    onChange(target.id)
    document.getElementById(`report-tab-${target.id}`)?.focus()
  }

  return (
    <nav className="report-page__tabs report-page__no-print" id="report-tabs" aria-label="리포트 섹션">
      <div className="report-page__tabs-list" role="tablist" aria-orientation="horizontal">
        {REPORT_TABS.map((tab, index) => (
          <button
            key={tab.id}
            id={`report-tab-${tab.id}`}
            className={`report-page__tab${activeTab === tab.id ? ' is-active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={tab.panelId}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

function ReportTabNavigation({
  index,
  onChange,
}: {
  index: number
  onChange: (id: ReportTabId) => void
}) {
  const current = REPORT_TABS[index]
  const previous = REPORT_TABS[index - 1]
  const next = REPORT_TABS[index + 1]

  return (
    <nav className="report-page__tab-navigation report-page__no-print" aria-label={`${current.label} 탭 이동`}>
      <p className="report-page__tab-progress" aria-label={`전체 ${REPORT_TABS.length}개 중 ${index + 1}번째 탭: ${current.label}`}>
        {index + 1} / {REPORT_TABS.length} · {current.label}
      </p>
      <div className="report-page__tab-navigation-actions">
        {previous ? (
          <button
            className="report-page__button report-page__button--secondary"
            type="button"
            aria-label={`${previous.label} 탭으로 이동`}
            onClick={() => onChange(previous.id)}
          >
            ← 이전: {previous.label}
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        {next ? (
          <button
            className="report-page__button report-page__button--primary"
            type="button"
            aria-label={`${next.label} 탭으로 이동`}
            onClick={() => onChange(next.id)}
          >
            다음: {next.label} →
          </button>
        ) : (
          <button
            className="report-page__button report-page__button--primary"
            type="button"
            aria-label="리포트 처음 탭으로 이동"
            onClick={() => onChange(REPORT_TABS[0].id)}
          >
            리포트 처음으로 ↑
          </button>
        )}
      </div>
    </nav>
  )
}

function ReportTabPanel({
  id,
  tabId,
  index,
  active,
  onChange,
  children,
}: {
  id: string
  tabId: ReportTabId
  index: number
  active: boolean
  onChange: (id: ReportTabId) => void
  children: ReactNode
}) {
  return (
    <div
      id={id}
      className="report-page__tab-panel"
      role="tabpanel"
      aria-labelledby={`report-tab-${tabId}`}
      hidden={!active}
      tabIndex={0}
    >
      {children}
      <ReportTabNavigation index={index} onChange={onChange} />
    </div>
  )
}

function ReportPdfCover({
  report,
  includeGeneratedAt,
  createdAt,
}: {
  report: ReportView
  includeGeneratedAt: boolean
  createdAt: string
}) {
  return (
    <section className="report-page__pdf-cover" aria-label="PDF 표지">
      <p className="report-page__eyebrow">INSURANCE PRODUCT REVIEW</p>
      <h1>{report.meta.title}</h1>
      <p className="report-page__pdf-cover-label">상품화 검토 리포트</p>
      <dl className="report-page__pdf-cover-meta">
        <div><dt>위험 ID</dt><dd>{report.meta.sourceRiskId}</dd></div>
        <div><dt>분석 기준일</dt><dd>{displayDate(report.meta.analysisBaseDate)}</dd></div>
        <div><dt>근거자료</dt><dd>{report.meta.evidenceCount ?? report.evidence.length}건</dd></div>
        {includeGeneratedAt ? <div><dt>PDF 생성일시</dt><dd>{displayDate(createdAt, true)}</dd></div> : null}
      </dl>
      {report.meta.disclaimer ? <p className="report-page__disclaimer">{report.meta.disclaimer}</p> : null}
    </section>
  )
}

function ReportPdfDocument({
  report,
  request,
}: {
  report: ReportView
  request: PdfPrintRequest
}) {
  const { options, sections } = request
  const renderableSections = sections.filter((id) =>
    id !== 'ai-judgment' || options.includeAiOriginal,
  )

  const includes = (id: ReportTabId) => renderableSections.includes(id)
  return (
    <div className="report-page__pdf-document" aria-hidden="true">
      {options.includeCover && renderableSections.length ? (
        <ReportPdfCover
          report={report}
          includeGeneratedAt={options.includeGeneratedAt}
          createdAt={request.createdAt}
        />
      ) : null}
      <div className="report-page__pdf-sections">
        {includes('ai-judgment') && options.includeAiOriginal ? (
          <div className="report-page__pdf-section" data-pdf-section="ai-judgment"><AiSummarySection report={report} /></div>
        ) : null}
        {includes('coverage-gap') ? (
          <div className="report-page__pdf-section" data-pdf-section="coverage-gap"><RiskGapSection report={report} printMode /></div>
        ) : null}
        {includes('wording') ? (
          <div className="report-page__pdf-section" data-pdf-section="wording">
            <FullWordingSection report={report} onOpenDocument={() => undefined} onOpenPolicyDraft={() => undefined} printMode />
          </div>
        ) : null}
        {includes('feasibility') ? (
          <div className="report-page__pdf-section" data-pdf-section="feasibility"><FeasibilitySection report={report} printMode /></div>
        ) : null}
        {includes('proposal') ? (
          <div className="report-page__pdf-section" data-pdf-section="proposal"><ProductProposalSection report={report} printMode /></div>
        ) : null}
        {includes('briefing') ? (
          <div className="report-page__pdf-section" data-pdf-section="briefing">
            <ExecutiveBriefingSection report={report} />
          </div>
        ) : null}
        {includes('evidence') ? (
          <div className="report-page__pdf-section" data-pdf-section="evidence">
            <EvidenceResearchSection report={report} onOpenEvidence={() => undefined} />
          </div>
        ) : null}
        {!renderableSections.length ? (
          <section className="report-page__pdf-empty">
            <h1>선택된 출력 항목이 없습니다.</h1>
            <p>PDF 선택 출력에서 최소 한 개의 항목과 출력 옵션을 선택하세요.</p>
          </section>
        ) : null}
      </div>
      {options.includePageNumbers ? <div className="report-page__pdf-page-number" aria-hidden="true" /> : null}
    </div>
  )
}

function PdfSelectionModal({
  selectedSections,
  options,
  onToggleSection,
  onToggleOption,
  onGenerate,
  onClose,
}: {
  selectedSections: ReportTabId[]
  options: PdfPrintOptions
  onToggleSection: (id: ReportTabId) => void
  onToggleOption: (key: keyof PdfPrintOptions) => void
  onGenerate: () => void
  onClose: () => void
}) {
  const optionLabels: Array<[keyof PdfPrintOptions, string]> = [
    ['includeCover', '표지 포함'],
    ['includePageNumbers', '페이지 번호'],
    ['includeGeneratedAt', '생성일시'],
    ['includeAiOriginal', 'AI 원본 포함'],
  ]
  return (
    <ReportModal eyebrow="PDF EXPORT" title="선택 항목 출력" onClose={onClose}>
      <p className="report-page__modal-intro">출력할 리포트 영역과 PDF 옵션을 선택하세요. 출력 순서는 리포트 원래 순서를 유지합니다.</p>
      <fieldset className="report-page__pdf-selection-group">
        <legend>출력할 항목</legend>
        {REPORT_TABS.map((tab) => (
          <label key={tab.id}>
            <input
              type="checkbox"
              checked={selectedSections.includes(tab.id)}
              onChange={() => onToggleSection(tab.id)}
            />
            <span>{tab.label}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="report-page__pdf-selection-group">
        <legend>출력 옵션</legend>
        {optionLabels.map(([key, label]) => (
          <label key={key}>
            <input type="checkbox" checked={options[key]} onChange={() => onToggleOption(key)} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      {!selectedSections.length ? <p className="report-page__pdf-selection-warning">최소 한 개의 항목을 선택해야 합니다.</p> : null}
      <div className="report-page__modal-actions">
        <button className="report-page__button" type="button" onClick={onClose}>취소</button>
        <button className="report-page__button report-page__button--primary" type="button" onClick={onGenerate} disabled={!selectedSections.length}>
          PDF 생성
        </button>
      </div>
    </ReportModal>
  )
}

function pdfLabel(value: string) {
  return value.replace(/\s+/g, '')
}

function createPdfFilename(mode: 'all' | 'current' | 'selected', tabId?: ReportTabId) {
  const base = '상품화검토리포트'
  if (mode === 'current') {
    const label = REPORT_TABS.find((tab) => tab.id === tabId)?.label ?? '현재탭'
    return `${base}_${pdfLabel(label)}.pdf`
  }
  if (mode === 'selected') return `${base}_선택출력.pdf`
  return `${base}.pdf`
}

function createDefaultPdfRequest(): PdfPrintRequest {
  return {
    sections: REPORT_TABS.map((tab) => tab.id),
    options: { ...DEFAULT_PDF_OPTIONS },
    filename: createPdfFilename('all'),
    createdAt: new Date().toISOString(),
  }
}

export function ReportSections({
  report: sourceReport,
  riskData,
  reportProxy,
  navigation,
}: {
  report: ReportResult
  riskData: RiskSourceData
  reportProxy: ReportProxy
  navigation?: ReportNavigation
}) {
  const normalizedSourceReport = useMemo(() => ensureCommercializationAssessment(sourceReport), [sourceReport])
  const [savedReport, setSavedReport] = useState<ReportResult>(() => cloneReport(normalizedSourceReport))
  const [draftReport, setDraftReport] = useState<ReportResult>(() => cloneReport(normalizedSourceReport))
  const [editorMode, setEditorMode] = useState(false)
  const [editorPreview, setEditorPreview] = useState(false)
  const [editorDirty, setEditorDirty] = useState(false)
  const [editorMessage, setEditorMessage] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'loading' | 'error'>('idle')
  const report = useMemo(() => asReportView(editorMode || editorPreview ? draftReport : savedReport), [draftReport, editorMode, editorPreview, savedReport])
  const [modal, setModal] = useState<ModalState>(null)
  const [policyDraftOpen, setPolicyDraftOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ReportTabId>(getTabFromHash)
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false)
  const [pdfSelectionOpen, setPdfSelectionOpen] = useState(false)
  const [pdfSelectionSections, setPdfSelectionSections] = useState<ReportTabId[]>(() => REPORT_TABS.map((tab) => tab.id))
  const [pdfOptions, setPdfOptions] = useState<PdfPrintOptions>(() => ({ ...DEFAULT_PDF_OPTIONS }))
  const [pdfRequest, setPdfRequest] = useState<PdfPrintRequest>(createDefaultPdfRequest)
  const [feasibilityOpenId, setFeasibilityOpenId] = useState<string | null>(null)
  const [reviewInputDirty, setReviewInputDirty] = useState(false)
  const [reviewDiscardRevision, setReviewDiscardRevision] = useState(0)
  const previousDocumentTitle = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadStoredContent = async () => {
      if (!reportProxy.getReportContent) return
      try {
        const response = await reportProxy.getReportContent(sourceReport.meta.sourceRiskId)
        const stored = parseStoredReportContent(response, sourceReport.meta.sourceRiskId)
        if (!cancelled && stored) {
          const normalizedStored = ensureCommercializationAssessment(stored)
          setSavedReport(normalizedStored)
          setDraftReport(cloneReport(normalizedStored))
        }
      } catch {
        // A viewer should still be able to read the source report when no saved version exists.
      }
    }
    void loadStoredContent()
    return () => { cancelled = true }
  }, [reportProxy, sourceReport])

  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (!editorDirty && !reviewInputDirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeave)
    return () => window.removeEventListener('beforeunload', warnBeforeLeave)
  }, [editorDirty, reviewInputDirty])

  const scrollToTabContent = (id: ReportTabId, behavior: ScrollBehavior) => {
    window.requestAnimationFrame(() => {
      document
        .getElementById(`report-panel-${id}`)
        ?.querySelector<HTMLElement>('.report-page__section-heading')
        ?.scrollIntoView({ behavior, block: 'start' })
    })
  }

  const commitTabChange = (id: ReportTabId) => {
    setActiveTab(id)
    const nextHash = `#report-tab=${id}`
    if (window.location.hash !== nextHash) {
      if (navigation) {
        navigation(`${window.location.pathname}${window.location.search}${nextHash}`)
      } else {
        pushPreservingHistoryState(nextHash, { reportTab: id })
      }
    }
    window.requestAnimationFrame(() => {
      const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      document.getElementById(`report-tab-${id}`)?.scrollIntoView({ behavior, block: 'nearest', inline: 'center' })
      scrollToTabContent(id, behavior)
    })
  }

  useEffect(() => {
    const syncTabFromHash = () => {
      const nextTab = getTabFromHash()
      if (nextTab !== activeTab && (editorMode || editorPreview || reviewInputDirty)) {
        if (reviewInputDirty) {
          setReviewDiscardRevision((value) => value + 1)
          setReviewInputDirty(false)
        }
        setEditorMode(false)
        setEditorPreview(false)
        setEditorDirty(false)
        setDraftReport(cloneReport(savedReport))
        setEditorMessage('')
      }
      setActiveTab(nextTab)
      scrollToTabContent(nextTab, 'auto')

    }
    window.addEventListener('hashchange', syncTabFromHash)
    window.addEventListener('popstate', syncTabFromHash)
    return () => {
      window.removeEventListener('hashchange', syncTabFromHash)
      window.removeEventListener('popstate', syncTabFromHash)
    }
  }, [activeTab, editorDirty, editorMode, editorPreview, reviewInputDirty, savedReport])

  useEffect(() => {
    const restoreAfterPrint = () => {
      setPdfRequest(createDefaultPdfRequest())
      if (previousDocumentTitle.current !== null) {
        document.title = previousDocumentTitle.current
        previousDocumentTitle.current = null
      }
    }
    window.addEventListener('afterprint', restoreAfterPrint)
    return () => window.removeEventListener('afterprint', restoreAfterPrint)
  }, [])

  const requestPdfPrint = (sections: ReportTabId[], options: PdfPrintOptions, filename: string) => {
    if (previousDocumentTitle.current === null) previousDocumentTitle.current = document.title
    document.title = filename
    setPdfRequest({
      sections,
      options: { ...options },
      filename,
      createdAt: new Date().toISOString(),
    })
    setPdfMenuOpen(false)
    setPdfSelectionOpen(false)
    window.requestAnimationFrame(() => window.print())
  }

  const printAll = () => requestPdfPrint(REPORT_TABS.map((tab) => tab.id), DEFAULT_PDF_OPTIONS, createPdfFilename('all'))
  const printCurrent = () => requestPdfPrint([activeTab], pdfOptions, createPdfFilename('current', activeTab))
  const openPdfSelection = () => {
    setPdfMenuOpen(false)
    setPdfSelectionOpen(true)
  }

  const handleTabChange = (id: ReportTabId) => {
    if (id !== activeTab && (editorMode || editorPreview || reviewInputDirty)) {
      if (reviewInputDirty) {
        setReviewDiscardRevision((value) => value + 1)
        setReviewInputDirty(false)
      }
      setEditorMode(false)
      setEditorPreview(false)
      setEditorDirty(false)
      setDraftReport(cloneReport(savedReport))
      setEditorMessage('')
    }
    if (id === activeTab) return
    commitTabChange(id)
  }

  const openEditor = () => {
    if (reviewInputDirty && !window.confirm('저장하지 않은 실무자 메모가 있습니다. 편집 모드로 이동할까요?')) return
    if (reviewInputDirty) {
      setReviewDiscardRevision((value) => value + 1)
      setReviewInputDirty(false)
    }
    setDraftReport(cloneReport(savedReport))
    setEditorMode(true)
    setEditorPreview(false)
    setEditorDirty(false)
    setEditorMessage('')
  }

  const handleDraftChange = (nextReport: ReportResult) => {
    setDraftReport(activeTab === 'feasibility' ? ensureCommercializationAssessment(nextReport) : nextReport)
    setEditorDirty(true)
    setSaveState('idle')
    setEditorMessage('')
  }

  const saveCriterionReview: CriterionReviewSave = async (criterionId, reviewerReview, rateData, inputData) => {
    const currentAssessment = savedReport.productFeasibility.assessment
    if (!currentAssessment) throw new Error('상품화 종합평가 데이터가 없습니다.')
    const currentCriterion = currentAssessment.criteria.find((criterion) => criterion.id === criterionId)
    const nextAiDecision: CommercializationAiDecision = reviewerReview.confirmed
      ? reviewerReview.resultAiDecision ?? currentCriterion?.aiDecision ?? (currentCriterion?.status === 'critical' ? 'unfulfilled' : 'fulfilled')
      : currentCriterion?.aiDecision ?? (currentCriterion?.status === 'critical' ? 'unfulfilled' : 'fulfilled')
    const nextReviewStatus: CommercializationCriterionReviewStatus = reviewerReview.confirmed ? 'completed' : 'pending'
    const nextReviewAction = reviewerReview.action
    const inputChanged = JSON.stringify(currentCriterion?.inputData ?? []) !== JSON.stringify(inputData)
      || JSON.stringify(currentCriterion?.rateData ?? []) !== JSON.stringify(rateData)
    const inputChangedAt = inputChanged ? new Date().toISOString() : (currentCriterion?.inputChangedAt ?? currentAssessment.inputChangedAt ?? null)
    const nextReport = ensureCommercializationAssessment({
      ...savedReport,
      productFeasibility: {
        ...savedReport.productFeasibility,
        assessment: {
          ...currentAssessment,
          criteria: currentAssessment.criteria.map((criterion) => criterion.id === criterionId
            ? { ...criterion, reviewerReview, aiDecision: nextAiDecision, status: nextAiDecision === 'fulfilled' ? 'pass' : 'critical', reviewStatus: nextReviewStatus, reviewAction: nextReviewAction, reviewerMemo: reviewerReview.memo ?? criterion.reviewerMemo, rateData, inputData, inputChangedAt }
            : criterion),
          inputChangedAt,
        },
      },
    })
    const previousReport = savedReport
    // Apply the normalized review locally before waiting for the persistence
    // request so the progress count and screening row update immediately.
    setSavedReport(cloneReport(nextReport))
    setDraftReport(cloneReport(nextReport))
    if (!reportProxy.saveReportContent) {
      return { persisted: false }
    }
    try {
      await reportProxy.saveReportContent({
        reportId: sourceReport.meta.sourceRiskId,
        content: nextReport,
      })
      return { persisted: true }
    } catch (error) {
      // Roll back an optimistic review update when the save endpoint rejects it.
      setSavedReport(cloneReport(previousReport))
      setDraftReport(cloneReport(previousReport))
      throw error
    }
  }

  const saveBriefingReview = async (status: BriefingReviewStatus, opinion: string) => {
    if (!reportProxy.saveReportContent) {
      throw new Error('저장 기능이 설정되지 않았습니다.')
    }
    const withStatus = updateReportContent(savedReport, ['ui', 'briefing', 'reviewerStatus'], status)
    const nextReport = updateReportContent(withStatus, ['ui', 'briefing', 'reviewerOpinion'], opinion)
    const previousReport = savedReport
    setSavedReport(cloneReport(nextReport))
    setDraftReport(cloneReport(nextReport))
    try {
      await reportProxy.saveReportContent({
        reportId: sourceReport.meta.sourceRiskId,
        content: nextReport,
      })
      setReviewInputDirty(false)
    } catch (error) {
      setSavedReport(cloneReport(previousReport))
      setDraftReport(cloneReport(previousReport))
      throw error
    }
  }

  const saveEditorContent = async (): Promise<boolean> => {
    if (!reportProxy.saveReportContent) {
      setSaveState('error')
      setEditorMessage('저장 API가 설정되지 않았습니다.')
      return false
    }
    const normalizedDraft = ensureCommercializationAssessment(draftReport)
    if (activeTab === 'feasibility') {
      const validation = validateCommercializationAssessment(normalizedDraft.productFeasibility.assessment)
      if (validation.errors.length) {
        setSaveState('error')
        setEditorMessage(validation.errors[0])
        return false
      }
      if (validation.warnings.length) setEditorMessage(`저장 전 확인: ${validation.warnings[0]}`)
    }
    setSaveState('loading')
    setEditorMessage('')
    try {
      const contentToSave = activeTab === 'feasibility'
        ? { ...savedReport, productFeasibility: normalizedDraft.productFeasibility }
        : normalizedDraft
      await reportProxy.saveReportContent({
        reportId: sourceReport.meta.sourceRiskId,
        content: contentToSave,
      })
      setSavedReport(cloneReport(contentToSave))
      setDraftReport(cloneReport(contentToSave))
      setEditorMode(false)
      setEditorPreview(false)
      setEditorDirty(false)
      setSaveState('idle')
      return true
    } catch (error) {
      setSaveState('error')
      setEditorMessage(error instanceof Error ? error.message : '보고서 저장에 실패했습니다.')
      return false
    }
  }

  const cancelEditorContent = () => {
    setDraftReport(cloneReport(savedReport))
    setEditorMode(false)
    setEditorPreview(false)
    setEditorDirty(false)
    setSaveState('idle')
    setEditorMessage('')
  }

  const previewEditorContent = () => {
    setEditorPreview(true)
    setEditorMode(false)
  }

  const continueEditorContent = () => {
    setEditorPreview(false)
    setEditorMode(true)
  }

  const discardUnsavedAndContinue = (target: ReportTabId | null) => {
    if (reviewInputDirty) {
      setReviewDiscardRevision((value) => value + 1)
      setReviewInputDirty(false)
    }
    setEditorMode(false)
    setEditorPreview(false)
    setEditorDirty(false)
    setDraftReport(cloneReport(savedReport))
    setEditorMessage('')
    setModal(null)
    if (target) commitTabChange(target)
    else {
      setDraftReport(cloneReport(savedReport))
      setEditorMode(true)
    }
  }

  const saveUnsavedAndContinue = async () => {
    if (modal?.type !== 'unsaved') return
    if (modal.reason !== 'editor') {
      setModal(null)
      setEditorMessage('현재 탭의 실무자 입력을 먼저 저장한 뒤 다시 이동을 선택하세요.')
      return
    }
    const didSave = await saveEditorContent()
    if (!didSave) return
    const target = modal.target
    setModal(null)
    if (target) commitTabChange(target)
  }
  return (
    <>
      <div className="report-page__screen-content">
      <ReportHeader
        report={report}
        activeTab={activeTab}
        pdfMenuOpen={pdfMenuOpen}
        onTogglePdfMenu={() => setPdfMenuOpen((open) => !open)}
        onPrintAll={printAll}
        onPrintCurrent={printCurrent}

        onOpenPdfSelection={openPdfSelection}
        editorMode={editorMode}
        editorPreview={editorPreview}
        saveState={saveState}
        onEdit={openEditor}
        onSave={saveEditorContent}
        onCancel={cancelEditorContent}
        onPreview={previewEditorContent}
        onContinueEdit={continueEditorContent}
      />
      {editorMessage ? <p className="report-page__form-error report-page__no-print" role="alert">{editorMessage}</p> : null}
      {editorPreview ? <p className="report-page__editor-preview-banner report-page__no-print">저장 전 미리보기입니다. 내용은 아직 저장되지 않았습니다.</p> : null}
      <ReportTabs activeTab={activeTab} onChange={handleTabChange} />
      <div className="report-page__tab-panels">
        <ReportTabPanel id="report-panel-ai-judgment" tabId="ai-judgment" index={0} active={activeTab === 'ai-judgment'} onChange={handleTabChange}>
          {editorMode && activeTab === 'ai-judgment' ? <ReportEditorPanel activeTab="ai-judgment" report={draftReport} onChange={handleDraftChange} /> : <AiSummarySection report={report} onNavigateTab={handleTabChange} />}
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-coverage-gap" tabId="coverage-gap" index={1} active={activeTab === 'coverage-gap'} onChange={handleTabChange}>
          {editorMode && activeTab === 'coverage-gap' ? <ReportEditorPanel activeTab="coverage-gap" report={draftReport} onChange={handleDraftChange} /> : <RiskGapSection report={report} onNavigateTab={handleTabChange} />}
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-wording" tabId="wording" index={2} active={activeTab === 'wording'} onChange={handleTabChange}>
          {editorMode && activeTab === 'wording' ? <ReportEditorPanel activeTab="wording" report={draftReport} onChange={handleDraftChange} /> : (
            <FullWordingSection
              report={report}
              onOpenDocument={(document) => setModal({ type: 'document', document })}
              onOpenPolicyDraft={() => setPolicyDraftOpen(true)}
              onNavigateTab={handleTabChange}
            />
          )}
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-feasibility" tabId="feasibility" index={3} active={activeTab === 'feasibility'} onChange={handleTabChange}>
          {editorMode && activeTab === 'feasibility' ? <ReportEditorPanel activeTab="feasibility" report={draftReport} onChange={handleDraftChange} openCriterionId={feasibilityOpenId} onOpenCriterion={setFeasibilityOpenId} /> : <FeasibilitySection report={report} openCriterionId={feasibilityOpenId} onOpenCriterion={setFeasibilityOpenId} onNavigateTab={handleTabChange} onSaveReview={saveCriterionReview} onInputDirtyChange={setReviewInputDirty} discardRevision={reviewDiscardRevision} />}
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-proposal" tabId="proposal" index={4} active={activeTab === 'proposal'} onChange={handleTabChange}>
          {editorMode && activeTab === 'proposal' ? <ReportEditorPanel activeTab="proposal" report={draftReport} onChange={handleDraftChange} /> : <ProductProposalSection report={report} onNavigateTab={handleTabChange} />}
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-briefing" tabId="briefing" index={5} active={activeTab === 'briefing'} onChange={handleTabChange}>
          {editorMode && activeTab === 'briefing' ? <ReportEditorPanel activeTab="briefing" report={draftReport} onChange={handleDraftChange} /> : <ExecutiveBriefingSection report={report} onNavigateTab={handleTabChange} onSaveReviewerReview={editorPreview ? undefined : saveBriefingReview} onReviewerDirtyChange={editorPreview ? undefined : setReviewInputDirty} discardRevision={reviewDiscardRevision} />}
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-evidence" tabId="evidence" index={6} active={activeTab === 'evidence'} onChange={handleTabChange}>
          {editorMode && activeTab === 'evidence' ? <ReportEditorPanel activeTab="evidence" report={draftReport} onChange={handleDraftChange} /> : (
            <EvidenceResearchSection
              report={report}
              onOpenEvidence={(evidence) => setModal({ type: 'evidence', evidence })}
            />
          )}
        </ReportTabPanel>
      </div>
      </div>

      <ReportPdfDocument report={asReportView(savedReport)} request={pdfRequest} />

      {policyDraftOpen ? (
        <PolicyDraftModal
          report={sourceReport}
          riskData={riskData}
          reportProxy={reportProxy}
          onClose={() => setPolicyDraftOpen(false)}
        />
      ) : null}

      {pdfSelectionOpen ? (
        <PdfSelectionModal
          selectedSections={pdfSelectionSections}
          options={pdfOptions}
          onToggleSection={(id) => {
            setPdfSelectionSections((current) =>
              current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
            )
          }}
          onToggleOption={(key) => setPdfOptions((current) => ({ ...current, [key]: !current[key] }))}
          onGenerate={() => requestPdfPrint(pdfSelectionSections, pdfOptions, createPdfFilename('selected'))}
          onClose={() => setPdfSelectionOpen(false)}
        />
      ) : null}

      {modal?.type === 'unsaved' ? (
        <ReportModal
          eyebrow="UNSAVED CHANGES"
          title="저장하지 않은 변경이 있습니다"
          onClose={() => setModal(null)}
        >
          <p className="report-page__modal-intro">
            {modal.reason === 'editor'
              ? '현재 리포트 draft를 저장한 뒤 이동할지, 변경을 폐기할지 선택하세요.'
              : '실무자 입력은 현재 탭의 저장 버튼으로 먼저 저장해야 합니다. 저장하지 않고 이동하면 입력을 폐기할 수 있습니다.'}
          </p>
          <div className="report-page__modal-actions">
            <button className="report-page__button report-page__button--primary" type="button" onClick={() => void saveUnsavedAndContinue()}>
              {modal.reason === 'editor' ? '저장 후 이동' : '현재 탭에서 저장하기'}
            </button>
            {modal.target ? <button className="report-page__button report-page__button--secondary" type="button" onClick={() => discardUnsavedAndContinue(modal.target)}>변경 폐기 후 이동</button> : null}
            <button className="report-page__button" type="button" onClick={() => setModal(null)}>취소</button>
          </div>
        </ReportModal>
      ) : null}
      {modal?.type === 'evidence' ? (
        <ReportModal
          eyebrow={modal.evidence.type}
          title={displayEvidenceTitle(modal.evidence)}
          onClose={() => setModal(null)}
        >
          <dl className="report-page__modal-data">
            <div><dt>근거 ID</dt><dd>{modal.evidence.id}</dd></div>
        <div><dt>출처</dt><dd>{displayEvidenceSource(modal.evidence)}</dd></div>
            <div><dt>기준일</dt><dd>{displayDate(modal.evidence.referenceDate)}</dd></div>
            <div><dt>신뢰도</dt><dd>{modal.evidence.reliability ?? '추가 확인 필요'}</dd></div>
            <div><dt>활용 판단</dt><dd>{modal.evidence.usedFor?.join(', ') || '추가 확인 필요'}</dd></div>
          </dl>
          <p className="report-page__notice">
            {modal.evidence.isMockData
              ? '현재 연결된 원문 파일이 없어 자료 정보만 표시합니다.'
              : modal.evidence.originalAvailable
                ? '원문 파일 연결은 팀 통합 단계에서 제공될 예정입니다.'
                : '현재 연결된 원문 파일이 없습니다.'}
          </p>
        </ReportModal>
      ) : null}

      {modal?.type === 'document' ? (
        <ReportModal
          eyebrow={modal.document.role ?? 'REFERENCE DOCUMENT'}
          title={modal.document.name}
          onClose={() => setModal(null)}
        >
          <dl className="report-page__modal-data">
            <div><dt>문서 ID</dt><dd>{modal.document.id}</dd></div>
            <div><dt>분석 활용</dt><dd>{modal.document.usedFor ?? '추가 확인 필요'}</dd></div>
            <div>
              <dt>AI 최초 입력</dt>
              <dd>{modal.document.includedInAiInput ? '포함' : '제외 · 사후 검증에만 사용'}</dd>
            </div>
          </dl>
          <p className="report-page__notice">
            {modal.document.badge ?? '현재 연결된 원문 URL이 없습니다.'}
          </p>
        </ReportModal>
      ) : null}
    </>
  )
}
