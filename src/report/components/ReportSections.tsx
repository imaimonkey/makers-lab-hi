import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type {
  CommercializationCriterion,
  CommercializationCriterionStatus,
  CommercializationAiDecision,
  CommercializationCriterionDetail,
  ReportResult,
  RiskSourceData,
} from '../types'
import type { ReportProxy } from '../api/report-proxy'
import { cloneReport, parseStoredReportContent } from '../services/report-content'
import { ensureCommercializationAssessment, COMMERCIALIZATION_GATE_GROUPS, validateCommercializationAssessment } from '../services/commercialization-assessment'
import { ReportModal } from './ReportModal'
import { PolicyDraftModal } from './ReportAssistPanels'
import { ReportEditorPanel } from './ReportEditorPanel'
import { AppIcon, type IconName } from '../../shared/components/AppIcon'
import { createPortal } from 'react-dom'
import { ArrowUpRight, BarChart3, Check, ChevronDown, CircleChevronDown, CircleChevronUp, ClipboardCheck, Clock3, Crosshair, FileSearch, FileText, GitBranch, PieChart, Search, Shield, ShieldAlert, ShieldCheck, Star, TriangleAlert, Umbrella, UsersRound, Zap } from 'lucide-react'
import { createBriefingContent } from '../services/briefing-content'
import { pushPreservingHistoryState, type ReportNavigation } from '../services/browser-history'
import { WORDING_ANALYSIS_RISK } from '../data/wording-review-mock'
import { aiFullPolicyDraftMock, buildFullPolicyCopyText, type PolicyArticle, type PolicyArticleItem, type SpecialClause } from '../data/aiFullPolicyDraftMock'
import { FEASIBILITY_PML_DATA, type FeasibilityPmlScenarioId } from '../data/product-feasibility-mock'
import { PROPOSAL_CALCULATION_EVIDENCE, PROPOSAL_CLAIM_FLOW_DISPLAY, PROPOSAL_CONTRACT_ROLE_SUMMARY, PROPOSAL_COVERAGE_SUMMARY, PROPOSAL_DECISIONS, PROPOSAL_HERO_FACTS, PROPOSAL_PRICING_SCENARIO_OUTPUTS, PROPOSAL_RECOMMENDATION_DETAIL_BLOCKS, PROPOSAL_RECOMMENDATION_DISPLAY, PROPOSAL_UNDERWRITING_AI_SUMMARY, PROPOSAL_UNDERWRITING_DISPLAY, type ProposalPricingScenarioOutput } from '../data/product-proposal-mock'
import { createFinancialEstimate, PRODUCT_FINANCIAL_ESTIMATE, type EstimateConfidence, type FinancialEstimate } from '../data/financial-estimate-mock'
import { COVERAGE_GAP_ANALYSIS_PREMISE, COVERAGE_GAP_ASSUMPTIONS, COVERAGE_GAP_CATEGORY_SUMMARY, COVERAGE_GAP_LIMITATION, COVERAGE_GAP_PRODUCT_INPUTS } from '../data/coverage-gap-mock'
import { PRODUCT_REVIEW_SUMMARY_COPY } from '../data/product-review-summary-mock'
import type { NoveltyAnalysis } from '../../domain/product/similarProduct'
import { normalizeNoveltyAnalysis, noveltyAnalysisStatusLabels, noveltyAnalysisTypeLabels, noveltySourceTypeLabels, similarProductTypeLabels, similarityTypeLabels, NOVELTY_OFFICIAL_SOURCES } from '../services/similar-product-research'

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

const isExcludedEvidenceItem = (item: Pick<EvidenceItem, 'title'>): boolean => /상품요약서/.test(item.title)

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
      inputChangedAt?: string | null
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
    /** 요약 카드와 상품화 종합평가가 공유하는 국내 출시 현황·신규성 분석입니다. */
    noveltyAnalysis?: NoveltyAnalysis
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
  | null

function asReportView(report: ReportResult): ReportView {
  return report as unknown as ReportView
}

function reportLabel(report: ReportView, key: string, fallback: string) {
  const value = report.ui?.labels?.[key]
  return typeof value === 'string' && value.trim() ? value : fallback
}

function displayReportTitle(title: string) {
  const riskTitle = title.replace(/\s*상품화 검토 리포트\s*$/, '').trim()
  return riskTitle || title
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
  onBackToList,
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
  onBackToList: () => void
}) {
  const meta = report.meta
  return (
    <section className="report-page__report-header" aria-labelledby="report-title">
      <div className="report-page__report-header-top">
        <div>
          <h1 id="report-title">{displayReportTitle(meta.title)}</h1>
        </div>
        <div className="report-page__header-actions report-page__no-print">
          <button className="report-page__report-back-link" type="button" onClick={onBackToList} aria-label="생성된 리포트 목록으로 돌아가기" title="생성된 리포트 목록으로 돌아가기">
            <span aria-hidden="true">←</span>
          </button>
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

      <dl className="report-page__meta-grid report-page__meta-grid--report-summary">
        <div><dt>분석 기준일</dt><dd>{displayDate(meta.analysisBaseDate)}</dd></div>
        <div><dt>생성일시</dt><dd>{displayDate(meta.generatedAt, true)}</dd></div>
        <div><dt>근거자료</dt><dd>{report.evidence.filter((item) => !isExcludedEvidenceItem(item)).length}건</dd></div>
      </dl>
    </section>
  )
}

function createProductReviewSummaryInsights(report: ReportView) {
  const copy = PRODUCT_REVIEW_SUMMARY_COPY
  const criteria = report.productFeasibility.assessment?.criteria ?? []
  const mandatoryCriteria = criteria.filter((criterion) => criterion.gateGroup === 'insurance_gate')
  const insuranceTotal = mandatoryCriteria.length || copy.criteria.groups[0].criterionIds.length
  const insuranceSatisfied = mandatoryCriteria.length
    ? mandatoryCriteria.filter((criterion) => aiDecisionOf(criterion) === 'fulfilled').length
    : insuranceTotal
  const noveltyAnalysis = normalizeNoveltyAnalysis(report.productProposal.noveltyAnalysis)
  const financialEstimate = createFinancialEstimate({
    analyzedAt: report.meta.analysisBaseDate ?? report.meta.sourceAsOf ?? report.meta.generatedAt,
    evidenceIds: report.evidence.slice(0, 6).map((item) => item.id),
  })
  const marketGrade = financialEstimate.marketGrade
  const marketScore = financialEstimate.marketScore
  const marketBullets = copy.coreJudgments.marketability.summaryBullets
  const insuranceBullets = copy.coreJudgments.insurability.summaryBullets
  const noveltyCardBullets = noveltyAnalysis.summaryBullets?.length ? noveltyAnalysis.summaryBullets.slice(0, 2) : noveltyAnalysis.judgmentReasons.slice(0, 2)
  const noveltyMetric = noveltyAnalysis.analysisStatus === 'completed'
    ? `${noveltyAnalysis.noveltyType ? noveltyAnalysisTypeLabels[noveltyAnalysis.noveltyType] : '검토'} · 통합보장 차별화 필요`
    : noveltyAnalysis.analysisStatus === 'pending'
      ? '최종 위험 후보 확정 후 분석 예정'
      : noveltyAnalysisStatusLabels[noveltyAnalysis.analysisStatus]
  const evaluationCriteriaNames = criteria.length
    ? criteria.map((criterion) => criterion.title)
    : copy.criteria.groups.flatMap((group) => group.itemLabels)
  const evaluationTotal = evaluationCriteriaNames.length
  const coreJudgmentCards = [
    { id: 'marketability', label: '보장 공백·시장성', title: copy.coreJudgments.marketability.result, metric: `시장성 ${marketScore}점 · ${marketGrade}등급`, bullets: marketBullets },
    { id: 'insurability', label: '보험성', title: copy.coreJudgments.insurability.result, metric: `필수 기준 ${insuranceSatisfied}/${insuranceTotal} 충족`, bullets: insuranceBullets },
    { id: 'similar-product', label: '국내 출시 현황·신규성', title: noveltyAnalysis.summaryCardHeadline ?? noveltyAnalysis.noveltyHeadline, metric: noveltyMetric, bullets: noveltyCardBullets },
  ] as const
  const evaluationStatuses = [
    { id: 'pass', label: '충족', count: evaluationTotal, tone: 'pass', names: evaluationCriteriaNames },
    { id: 'critical', label: '불충족', count: 0, tone: 'critical', names: [] as string[] },
  ] as const
  return { coreJudgmentCards, evaluationStatuses, evaluationTotal }
}

function SummaryCoreJudgmentsSection({ report, printMode = false }: { report: ReportView; printMode?: boolean }) {
  const { coreJudgmentCards } = createProductReviewSummaryInsights(report)
  const coreJudgmentIcons = [UsersRound, Shield, Star] as const

  return (
    <section className="report-page__ai-summary-section report-page__ai-summary-section--compact report-page__ai-summary-section--integrated report-page__ai-summary-section--core-judgments">
      <section className="report-page__ai-summary-block report-page__ai-summary-judgment-cards" aria-labelledby="ai-summary-judgment-title">
        <div className="report-page__ai-summary-block-heading"><div><p className="report-page__eyebrow">CORE JUDGMENTS</p><h3 id="ai-summary-judgment-title">핵심 판단 근거</h3><p className="report-page__ai-summary-block-subtitle">위 검토 결론을 도출한 세 가지 핵심 결과입니다.</p></div></div>
        {printMode ? (
          <table className="report-page__ai-summary-core-table">
            <caption>핵심 판단 근거</caption>
            <thead><tr><th scope="col">검토 영역</th><th scope="col">주요 판단</th><th scope="col">핵심 수치</th><th scope="col">핵심 근거</th></tr></thead>
            <tbody>{coreJudgmentCards.map((card, index) => <tr key={card.id}>
              <th scope="row"><span className="report-page__ai-summary-card-index">{String(index + 1).padStart(2, '0')}</span>{card.label}</th>
              <td>{card.title}</td>
              <td>{card.metric}</td>
              <td><ul className="report-page__ai-summary-core-table-bullets">{card.bullets.map((bullet) => <li key={bullet}><span aria-hidden="true">•</span>{bullet}</li>)}</ul></td>
            </tr>)}</tbody>
          </table>
        ) : (
          <div className="report-page__ai-summary-core-grid report-page__ai-summary-core-grid--three">
            {coreJudgmentCards.map((card, index) => { const Icon = coreJudgmentIcons[index % coreJudgmentIcons.length]; return <article className={`report-page__ai-summary-core-card report-page__ai-summary-core-card--${card.id}`} key={card.id}>
              <div className="report-page__ai-summary-card-topline"><span className="report-page__ai-summary-card-label"><span className="report-page__ai-summary-card-index">{String(index + 1).padStart(2, '0')}</span>{card.label}</span><span className="report-page__ai-summary-card-icon" aria-hidden="true"><Icon size={23} strokeWidth={1.8} /></span></div>
              <h4 className="report-page__ai-summary-decision-title">{card.title}</h4>
              <strong className="report-page__ai-summary-metric-value">{card.metric}</strong>
              <details className="report-page__ai-summary-card-evidence" open={printMode || undefined}>
                <summary><span>판단 근거</span><ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} /></summary>
                <ul className="report-page__ai-summary-card-bullets">
                  {card.bullets.map((bullet) => <li key={bullet}><span className="report-page__ai-summary-card-bullet-icon" aria-hidden="true">•</span><span className="report-page__ai-summary-card-bullet-text">{bullet}</span></li>)}
                </ul>
              </details>
            </article> })}
          </div>
        )}
      </section>
    </section>
  )
}

function SummaryEvaluationStatusSection({ report, printMode = false }: { report: ReportView; printMode?: boolean }) {
  const { evaluationTotal } = createProductReviewSummaryInsights(report)
  const criteria = report.productFeasibility.assessment?.criteria ?? []
  const evaluationCriteria = criteria.length
    ? criteria.map((criterion) => {
      const state = criterion.status
      const status = state === 'needs_review'
        ? { label: '보완 필요', tone: 'needs-review' }
        : state === 'additional_check'
          ? { label: '추가 확인', tone: 'additional-check' }
          : state === 'critical'
            ? { label: '불충족', tone: 'critical' }
            : { label: '충족', tone: 'pass' }
      return { id: criterion.id, title: criterion.title, ...status }
    })
    : PRODUCT_REVIEW_SUMMARY_COPY.criteria.groups.flatMap((group) => group.itemLabels).map((title, index) => ({
      id: `criterion-${index + 1}`,
      title,
      label: '충족',
      tone: 'pass',
    }))
  return (
    <section className="report-page__ai-summary-section report-page__ai-summary-section--compact report-page__ai-summary-section--integrated">
      <section className="report-page__ai-summary-block report-page__ai-summary-evaluation-status" aria-labelledby="ai-summary-evaluation-title">
        <div className="report-page__ai-summary-block-heading">
          <div><h3 id="ai-summary-evaluation-title">상품화 평가 현황</h3></div>
          <div className="report-page__ai-summary-evaluation-heading-actions"><span>현재 평가 데이터 기준</span></div>
        </div>
        <div className="report-page__ai-summary-evaluation-summary"><strong>상품화 평가 기준</strong><span>{evaluationTotal}/{evaluationTotal} 충족</span></div>
        <div className={`report-page__ai-summary-criteria-grid${printMode ? ' report-page__ai-summary-criteria-grid--print' : ''}`} aria-label="상품화 평가 기준 목록">
          {evaluationCriteria.map((criterion) => <article className={`report-page__ai-summary-criterion-card report-page__ai-summary-criterion-card--${criterion.tone}`} key={criterion.id}>
            <strong className="report-page__ai-summary-criterion-title">{criterion.title}</strong>
            <span className="report-page__ai-summary-criterion-status">{criterion.label}</span>
          </article>)}
        </div>
      </section>
    </section>
  )
}

type NoveltyAccordionKey = 'comparison' | 'reasons' | 'sources'

function NoveltyAccordion({
  id,
  title,
  summary,
  isOpen,
  onToggle,
  children,
}: {
  id: NoveltyAccordionKey
  title: string
  summary: string
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const bodyId = `novelty-accordion-${id}-body`
  return (
    <section className={`report-page__novelty-accordion${isOpen ? ' is-open' : ''}`}>
      <h4 className="report-page__novelty-accordion-heading">
        <button type="button" aria-expanded={isOpen} aria-controls={bodyId} onClick={onToggle}>
          <span><strong>{title}</strong><small>{summary}</small></span>
          <span className="report-page__novelty-accordion-toggle">{isOpen ? '접기' : '펼치기'} <span aria-hidden="true">{isOpen ? '⌃' : '⌄'}</span></span>
        </button>
      </h4>
      <div id={bodyId} className="report-page__novelty-accordion-body" hidden={!isOpen}>{children}</div>
    </section>
  )
}

function NoveltyAnalysisSection({
  analysis,
  initialOpenAccordion,
  onInitialOpenHandled,
  printMode = false,
}: {
  analysis: NoveltyAnalysis
  initialOpenAccordion?: NoveltyAccordionKey | null
  onInitialOpenHandled?: () => void
  printMode?: boolean
}) {
  const isPending = analysis.analysisStatus === 'pending'
  const [openAccordion, setOpenAccordion] = useState<NoveltyAccordionKey | null>(null)

  const countItems = [
    { label: '조사 보험사', value: analysis.reviewedCompanyCount === null ? '확인 전' : `${analysis.reviewedCompanyCount}개사` },
    { label: '관련 상품·특약', value: analysis.relatedCoverageCount !== null ? `${analysis.relatedCoverageCount}개사 확인` : analysis.partialSimilarCount !== null ? `${analysis.partialSimilarCount}개사 확인` : '확인 전' },
    { label: '직접 대응 통합상품', value: analysis.sameProductCount === null ? (isPending ? '확인 전' : '확인 범위에서 미확인') : `${analysis.sameProductCount}건` },
    { label: '판정 유형', value: analysis.noveltyType ? noveltyAnalysisTypeLabels[analysis.noveltyType] : '분석 예정' },
  ]
  const sourceRows = [
    ...NOVELTY_OFFICIAL_SOURCES.filter((source) => source.url).map((source) => ({ id: source.id, url: source.url, sourceType: source.sourceType, sourceTitle: source.title, insurerName: '공통 조사 경로', description: '국내 보험상품 공시·비교 경로', checkedAt: analysis.checkedAt })),
    ...analysis.comparisonItems.flatMap((item) => [
      item.sourceUrl ? { id: item.id, url: item.sourceUrl, sourceType: item.sourceType, sourceTitle: item.sourceTitle, insurerName: item.insurerName, description: item.overlappingCoverage.join(' · '), checkedAt: item.checkedAt ?? item.sourceDate ?? analysis.checkedAt } : null,
      ...(item.additionalSources ?? []).map((source, index) => ({ id: `${item.id}-additional-${index}`, url: source.url, sourceType: item.sourceType, sourceTitle: source.title, insurerName: item.insurerName, description: item.overlappingCoverage.join(' · '), checkedAt: item.checkedAt ?? item.sourceDate ?? analysis.checkedAt })),
    ].filter((source): source is NonNullable<typeof source> => source !== null)),
  ].filter((source, index, rows) => !source.url || rows.findIndex((candidate) => candidate.url === source.url) === index)
  const comparisonSummary = isPending
    ? '최종 위험 후보 선정 후 비교 예정'
    : analysis.comparisonItems.length
      ? `${analysis.reviewedCompanyCount ?? analysis.comparisonItems.length}개 보험사 비교 데이터 확인됨`
      : '아직 비교 데이터 없음'
  const reasonsSummary = isPending ? '분석 완료 후 판단 근거 표시' : `판단 근거 ${analysis.judgmentReasons.length}건 확인됨`
  const sourcesSummary = isPending ? '분석 완료 후 확인 경로 표시' : `공식 출처 ${sourceRows.length}건 확인 경로`
  const isAccordionOpen = (key: NoveltyAccordionKey) => printMode || initialOpenAccordion === key || openAccordion === key
  const toggleAccordion = (key: NoveltyAccordionKey) => {
    if (initialOpenAccordion) onInitialOpenHandled?.()
    setOpenAccordion((current) => current === key ? null : key)
  }

  return (
    <section className="report-page__novelty-analysis report-page__feasibility-subsection" id="novelty-analysis" aria-labelledby="novelty-analysis-title">
      <div className="report-page__feasibility-subsection-heading report-page__novelty-analysis-heading">
        <div><p className="report-page__eyebrow">MARKET LAUNCH &amp; NOVELTY</p><h3 id="novelty-analysis-title">국내 출시 현황·신규성 검토</h3><p>국내 보험사의 공개 상품공시·약관·특약을 기준으로 동일·유사상품 여부와 차별화 가능한 보장 공백을 확인합니다.</p></div>
        <span>{noveltyAnalysisStatusLabels[analysis.analysisStatus]} · 확인일 {analysis.checkedAt ?? '확인 필요'}</span>
      </div>

      <div className={`report-page__novelty-summary-panel${isPending ? ' is-pending' : ''}`}>
        <div className="report-page__novelty-summary-judgment">
          <span className="report-page__novelty-summary-label">신규성 종합판정</span>
          <strong>{isPending ? '최종 위험 후보 확정 후 분석 예정' : analysis.noveltyType ? noveltyAnalysisTypeLabels[analysis.noveltyType] : '검증 필요'}</strong>
          <h4>{analysis.noveltyHeadline}</h4>
          <p>{analysis.noveltyShortSummary ?? analysis.noveltySummary}</p>
        </div>
        <div className="report-page__novelty-counts" aria-label="국내 출시 현황 핵심 수치">
          {countItems.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
        </div>
      </div>

      <div className="report-page__novelty-accordions">
        <NoveltyAccordion id="comparison" title="유사상품 비교표 보기" summary={comparisonSummary} isOpen={isAccordionOpen('comparison')} onToggle={() => toggleAccordion('comparison')}>
          <section className="report-page__novelty-comparison" aria-labelledby="novelty-comparison-title">
            <div className="report-page__novelty-subheading"><div><h4 id="novelty-comparison-title">보험사·상품 비교</h4><p>확인된 자료가 있을 때만 보험사와 상품·특약 행을 표시합니다.</p></div></div>
            {analysis.comparisonItems.length ? (
              <div className="report-page__novelty-table-wrap">
                <table className="report-page__novelty-table">
                  <caption className="sr-only">국내 유사상품 비교</caption>
                  <thead><tr><th scope="col">보험사</th><th scope="col">상품·특약명</th><th scope="col">확인된 주요 보장</th><th scope="col">남는 보장 공백</th><th scope="col">판정</th><th scope="col">공식 출처</th></tr></thead>
                  <tbody>{analysis.comparisonItems.map((item) => <tr key={item.id}>
                    <td data-label="보험사">{item.insurerName}</td>
                    <td data-label="상품·특약명">{item.productName}<small>{similarProductTypeLabels[item.productType]}</small></td>
                    <td data-label="확인된 주요 보장">{item.overlappingCoverage.length ? item.overlappingCoverage.join(' · ') : '확인된 주요 보장 없음'}</td>
                    <td data-label="남는 보장 공백">{item.remainingGaps.length ? item.remainingGaps.join(' · ') : '추가 공백 확인 필요'}</td>
                    <td data-label="판정"><span className="report-page__novelty-judgment">{similarityTypeLabels[item.similarityType]}</span></td>
                    <td data-label="공식 출처">{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={`${item.sourceTitle} 원문 보기`}>원문 보기</a> : <span>출처 확인 필요</span>}<small>{item.checkedAt ?? item.sourceDate ?? analysis.checkedAt ?? '확인 필요'}</small></td>
                  </tr>)}</tbody>
                </table>
              </div>
            ) : <div className="report-page__novelty-empty-state"><h5>{isPending ? '최종 위험 후보 선정 후 유사상품 분석 예정' : '아직 비교 데이터 없음'}</h5><p>{isPending ? '최종 위험 후보가 확정되면 국내 보험사 상품공시·약관·특약을 비교합니다.' : '확인된 공식 비교자료가 없어 상품·특약 행을 표시할 수 없습니다.'}</p></div>}
          </section>
        </NoveltyAccordion>

        <NoveltyAccordion id="reasons" title="신규성 판단 근거 보기" summary={reasonsSummary} isOpen={isAccordionOpen('reasons')} onToggle={() => toggleAccordion('reasons')}>
          <section className="report-page__novelty-reasons" aria-labelledby="novelty-reasons-title">
            <div className="report-page__novelty-subheading"><div><h4 id="novelty-reasons-title">신규성 판단 근거</h4><p>{analysis.noveltySummary}</p></div></div>
            <ul>{analysis.judgmentReasons.map((reason) => <li key={reason}><span aria-hidden="true">✓</span>{reason}</li>)}</ul>
            {analysis.limitations.length ? <div className="report-page__novelty-limitations"><strong>분석 한계</strong><ul>{analysis.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></div> : null}
          </section>
        </NoveltyAccordion>

        <NoveltyAccordion id="sources" title="조사 출처 보기" summary={sourcesSummary} isOpen={isAccordionOpen('sources')} onToggle={() => toggleAccordion('sources')}>
          <section className="report-page__novelty-sources" aria-labelledby="novelty-sources-title">
            <div className="report-page__novelty-subheading"><div><h4 id="novelty-sources-title">공식 출처·확인일</h4><p>출처 우선순위: 보험사 공식 공시·약관 → 협회 공시 → 보험다모아·공식 보도자료</p></div></div>
            <div className="report-page__novelty-source-table-wrap">
              <table className="report-page__novelty-source-table">
                <caption className="sr-only">신규성 조사 출처</caption>
                <thead><tr><th scope="col">보험사</th><th scope="col">자료명</th><th scope="col">확인한 보장</th><th scope="col">기준일·링크</th></tr></thead>
                <tbody>{sourceRows.map((source) => <tr key={source.id}><td>{source.insurerName}</td><td>{source.sourceTitle}<small>{source.sourceType ? noveltySourceTypeLabels[source.sourceType] : '공식 자료'}</small></td><td>{source.description}</td><td><small>확인일 {source.checkedAt ?? '확인 필요'}</small>{source.url ? <a href={source.url} target="_blank" rel="noreferrer" aria-label={`${source.sourceTitle} 원문 보기`}>원문 보기</a> : <span>출처 확인 필요</span>}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="report-page__novelty-source-note">주요 보험사의 공개 상품·약관 자료 기준 · 2026.08.01 조회</p>
            <p className="report-page__novelty-source-disclaimer">본 결과는 공개자료를 기준으로 한 1차 검토이며, 국내 전체 판매 상품을 전수조사한 결과는 아닙니다.</p>
          </section>
        </NoveltyAccordion>
      </div>
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
  const coreCoverageGaps = sourceGaps.length
    ? sourceGaps.slice(0, 4).map((gap) => ({ id: gap.id, title: gap.title, description: gap.description }))
    : coverageRows
      .filter((item) => Boolean(item.remainingGap?.trim()))
      .slice(0, 4)
      .map((item) => ({ id: item.id, title: item.damage ?? item.coverageName, description: item.remainingGap }))
  const coreCoverageGapIcons = [Clock3, ShieldAlert, GitBranch, FileSearch] as const
  void onNavigateTab
  void printMode

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
      <SectionHeading number="03" eyebrow="RISK & COVERAGE GAP" title="기존 보험의 보장 범위와 공백" />

      <section className="report-page__coverage-gap-results" aria-labelledby="coverage-gap-results-title">
        <div className="report-page__coverage-gap-section-heading"><div><p className="report-page__eyebrow">COVERAGE GAP SUMMARY</p><h3 id="coverage-gap-results-title">보장 공백 분석 요약</h3></div></div>
        <div className="report-page__coverage-gap-judgment-copy report-page__coverage-gap-alert"><ShieldAlert aria-hidden="true" size={27} strokeWidth={1.9} /><p>기존 보험 적용 후에도 <strong>직접손해 보장 공백이 확인되었습니다.</strong></p></div>
        <div className="report-page__coverage-gap-key-findings" aria-labelledby="coverage-gap-key-findings-title">
          <h4 id="coverage-gap-key-findings-title">핵심 보장 공백</h4>
          <ul>{coreCoverageGaps.map((gap, index) => { const Icon = coreCoverageGapIcons[index % coreCoverageGapIcons.length]; return <li key={gap.id}><span className="report-page__coverage-gap-key-icon" aria-hidden="true"><Icon size={33} strokeWidth={1.7} /></span><div><div className="report-page__coverage-gap-key-heading"><span aria-hidden="true">{index + 1}</span><strong>{gap.title}</strong></div>{gap.description ? <p>{gap.description}</p> : null}</div></li> })}</ul>
        </div>
        <p className="report-page__coverage-gap-analysis-note"><span className="report-page__coverage-gap-analysis-icon" aria-hidden="true"><Crosshair size={21} strokeWidth={1.8} /></span><strong>분석 범위</strong><span className="report-page__coverage-gap-analysis-text">{COVERAGE_GAP_ANALYSIS_PREMISE}</span></p>
      </section>

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

type FeasibilityGroupFilter = 'all' | FeasibilityDisplayGroup['id']
type FeasibilityAiFilter = 'all' | CommercializationAiDecision

type FeasibilityCriterionDisplay = (typeof FEASIBILITY_CRITERION_DISPLAY)[string]

const feasibilityQuestionTitle = (criterion: CommercializationCriterion): string => FEASIBILITY_QUESTION_TITLES[criterion.id] ?? criterion.question
const NOVELTY_CRITERION_TITLE = '국내 출시 현황 및 차별화 가능성'
const NOVELTY_CRITERION_DESCRIPTION = '국내 출시 현황을 확인하고, 기존 상품과 구분되는 보장 공백·차별화 요소가 있는지 검토합니다.'
const isNoveltyCriterion = (criterion: CommercializationCriterion): boolean => criterion.id === 'actual_market_demand' || /실제 상품화|국내 출시|신규성/.test(criterion.title)
const feasibilityCriterionDisplay = (criterion: CommercializationCriterion, noveltyAnalysis?: NoveltyAnalysis): FeasibilityCriterionDisplay => {
  if (isNoveltyCriterion(criterion)) {
    return { title: NOVELTY_CRITERION_TITLE, description: noveltyAnalysis?.noveltySummary || NOVELTY_CRITERION_DESCRIPTION }
  }
  return FEASIBILITY_CRITERION_DISPLAY[criterion.id] ?? {
  title: feasibilityQuestionTitle(criterion),
  description: compactCriterionText(criterionSummary(criterion), 140),
  }
}

const noveltyCriterionDecision = (criterion: CommercializationCriterion, noveltyAnalysis: NoveltyAnalysis): CommercializationAiDecision => {
  if (!isNoveltyCriterion(criterion) || noveltyAnalysis.analysisStatus === 'pending' || noveltyAnalysis.analysisStatus === 'needs-review') return aiDecisionOf(criterion)
  const hasSameProduct = (noveltyAnalysis.sameProductCount ?? 0) > 0 || noveltyAnalysis.noveltyType === 'existing' || noveltyAnalysis.comparisonItems.some((item) => item.similarityType === 'same' || item.similarityType === 'highly-similar')
  const hasDifferentiation = (noveltyAnalysis.differentiatedGapCount ?? 0) > 0 || noveltyAnalysis.comparisonItems.some((item) => item.remainingGaps.length > 0 || item.differentiation.length > 0)
  return hasSameProduct && !hasDifferentiation ? 'unfulfilled' : 'fulfilled'
}

const noveltyCriterionForDisplay = (criterion: CommercializationCriterion, noveltyAnalysis: NoveltyAnalysis): CommercializationCriterion => {
  if (!isNoveltyCriterion(criterion)) return criterion
  const display = feasibilityCriterionDisplay(criterion, noveltyAnalysis)
  const decision = noveltyCriterionDecision(criterion, noveltyAnalysis)
  return {
    ...criterion,
    title: display.title,
    description: display.description,
    question: '국내 출시 현황과 차별화 가능한 보장 공백을 확인할 수 있는가?',
    aiDecision: decision,
    status: decision === 'fulfilled' ? 'pass' : 'critical',
    summary: noveltyAnalysis.noveltySummary,
    rationale: noveltyAnalysis.judgmentReasons.join(' '),
    analysisDetail: criterion.analysisDetail ? { ...criterion.analysisDetail, aiSummary: noveltyAnalysis.noveltySummary, rationale: noveltyAnalysis.judgmentReasons } : criterion.analysisDetail,
  }
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
      { tone: 'confirmed', text: '국내 유사상품 비교 및 차별화 가능성 확인' },
      { tone: 'follow-up', text: '실제 가입 의향과 계약 규모 확인 필요' },
    ],
    details: [
      { label: '배점 구성', items: ['시장 성장성 23/25', '보험 수요·제도 변화 24/25', '국내 출시·신규성 검토 22/25', '구매 접근성·실수요 확인 15/25'] },
      { label: '합계', items: ['84/100', 'S 90~100', 'A 75~89', 'B 60~74', 'C 60 미만'] },
      { label: '점수 산정 이유', value: '시장 확대와 국내 공개자료 비교를 반영했으나, 실제 가입 의향과 계약 규모는 내부 수요조사 전 단계입니다.' },
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

const FEASIBILITY_METRIC_STATUS: Record<FeasibilityMetricDisplay['id'], 'positive' | 'caution'> = {
  market: 'positive',
  tam: 'positive',
  frequency: 'positive',
  pml: 'caution',
}

const FEASIBILITY_METRIC_STATUS_LABEL: Record<FeasibilityMetricDisplay['id'], '양호' | '유의'> = {
  market: '양호',
  tam: '양호',
  frequency: '양호',
  pml: '유의',
}

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
  return criterion.aiDecision ?? (criterion.status === 'critical' ? 'unfulfilled' : 'fulfilled')
}

const aiDecisionLabel = (decision: CommercializationAiDecision) => decision === 'fulfilled' ? '충족' : '불충족'

const criterionDetailOf = (criterion: CommercializationCriterion): CommercializationCriterionDetail => criterion.analysisDetail ?? {
  aiSummary: criterionSummary(criterion),
  rationale: [criterion.rationale || criterionSummary(criterion)],
  materials: criterion.evidence.map((item) => item.title),
  assumptions: [],
  limitations: criterion.missingInformation,
  reviewerChecks: criterion.nextActions.filter((action) => !action.completed).map((action) => action.text),
}

function FeasibilityCriterionDetail({ criterion, onNavigateTab }: { criterion: CommercializationCriterion; onNavigateTab?: (id: ReportTabId) => void }) {
  const detail = criterionDetailOf(criterion)
  const openActions = criterion.nextActions.filter((action) => !action.completed)
  void onNavigateTab

  return (
    <div className="report-page__evaluation-detail report-page__evaluation-detail--binary">
      <dl className="report-page__evaluation-detail-list">
        <div><dt>AI 판단 요약</dt><dd><p>{neutralizeCommercializationText(detail.aiSummary)}</p></dd></div>
        <div><dt>판단 근거</dt><dd><ul>{detail.rationale.map((item) => <li key={item}>{neutralizeCommercializationText(item)}</li>)}</ul></dd></div>
        <div><dt>사용 자료·출처</dt><dd><ul>{detail.materials.map((item) => <li key={item}>{neutralizeCommercializationText(item)}</li>)}</ul>{criterion.evidence.length ? <ul className="report-page__evaluation-evidence-inline">{criterion.evidence.map((item) => <li key={item.id}><code>{item.id}</code> {neutralizeCommercializationText(item.title)}{item.sourceName ? ` · ${neutralizeCommercializationText(item.sourceName)}` : ''}</li>)}</ul> : null}</dd></div>
        <div><dt>가정 및 한계</dt><dd><div className="report-page__evaluation-detail-subgroup"><strong>적용 가정</strong><ul>{detail.assumptions.map((item) => <li key={item}>{neutralizeCommercializationText(item)}</li>)}</ul></div><div className="report-page__evaluation-detail-subgroup"><strong>분석 한계</strong><ul>{detail.limitations.map((item) => <li key={item}>{neutralizeCommercializationText(item)}</li>)}</ul></div></dd></div>
        <div><dt>추가 확인사항</dt><dd>{detail.reviewerChecks.length || openActions.length ? <ul>{[...detail.reviewerChecks, ...openActions.map((action) => action.text)].filter((item, index, values) => item && values.indexOf(item) === index).map((item) => <li key={item}>{neutralizeCommercializationText(item)}</li>)}</ul> : <p>추가 확인사항 없음</p>}</dd></div>
      </dl>
    </div>
  )
}

function FeasibilityDecisionOverview({ report, openCriterionId: controlledOpenCriterionId, onOpenCriterion, onNavigateTab, printMode = false, noveltyAccordionRequest, onNoveltyAccordionRequestHandled }: { report: ReportView; openCriterionId?: string | null; onOpenCriterion?: (id: string | null) => void; onNavigateTab?: (id: ReportTabId) => void; printMode?: boolean; noveltyAccordionRequest?: NoveltyAccordionKey | null; onNoveltyAccordionRequestHandled?: () => void }) {
  const assessment = report.productFeasibility.assessment
  const criteria = assessment?.criteria ?? []
  const noveltyAnalysis = normalizeNoveltyAnalysis(report.productProposal.noveltyAnalysis)
  const [internalOpenCriterionId, setInternalOpenCriterionId] = useState<string | null>(null)
  const [groupFilter, setGroupFilter] = useState<FeasibilityGroupFilter>('all')
  const [aiFilter, setAiFilter] = useState<FeasibilityAiFilter>('all')
  const openCriterionId = controlledOpenCriterionId ?? internalOpenCriterionId
  const setOpenCriterionId = onOpenCriterion ?? setInternalOpenCriterionId
  const findCriterion = (id: string) => criteria.find((criterion) => criterion.id === id)
  const mandatory = FEASIBILITY_DISPLAY_GROUPS[0].criterionIds.map(findCriterion).filter((criterion): criterion is CommercializationCriterion => Boolean(criterion))
  const mandatoryPass = mandatory.filter((criterion) => noveltyCriterionDecision(criterion, noveltyAnalysis) === 'fulfilled').length
  const mandatoryCritical = mandatory.filter((criterion) => noveltyCriterionDecision(criterion, noveltyAnalysis) === 'unfulfilled').length
  const noveltyCriterion = criteria.find(isNoveltyCriterion)
  const noveltyDecision = noveltyCriterion ? noveltyCriterionDecision(noveltyCriterion, noveltyAnalysis) : 'fulfilled'
  const productDecision = mandatoryCritical
    ? { title: '상품화 가능성 재검토 필요', action: '추가 검토 필요' }
    : { title: '상품화 가능성 높음', action: '상품 개발 검토 권고' }
  const feasibilityMetricIcons = [BarChart3, UsersRound, Zap, TriangleAlert] as const
  const groupCounts = (group: FeasibilityDisplayGroup) => group.criterionIds.reduce<Record<CommercializationCriterionStatus, number>>((result, id) => {
    const criterion = findCriterion(id)
    if (criterion) {
      const status = noveltyCriterionDecision(criterion, noveltyAnalysis) === 'fulfilled' ? 'pass' : 'critical'
      result[status] = (result[status] ?? 0) + 1
    }
    return result
  }, { pass: 0, needs_review: 0, additional_check: 0, critical: 0 })
  const matchesFilters = (criterion: CommercializationCriterion) => {
    const selectedGroup = FEASIBILITY_DISPLAY_GROUPS.find((group) => group.id === groupFilter)
    const groupMatches = groupFilter === 'all' || Boolean(selectedGroup?.criterionIds.includes(criterion.id))
    const aiMatches = aiFilter === 'all' || noveltyCriterionDecision(criterion, noveltyAnalysis) === aiFilter
    return groupMatches && aiMatches
  }
  const hasActiveFilters = groupFilter !== 'all' || aiFilter !== 'all'
  const resetFilters = () => {
    setGroupFilter('all')
    setAiFilter('all')
  }
  const filteredCriteria = printMode ? criteria : criteria.filter(matchesFilters)
  const sortedCriteriaForGroup = (group: FeasibilityDisplayGroup) => {
    const groupCriteria = group.criterionIds.map(findCriterion).filter((criterion): criterion is CommercializationCriterion => Boolean(criterion))
    const visible = printMode ? groupCriteria : groupCriteria.filter(matchesFilters)
    return visible
  }
  return (
    <div className="report-page__feasibility-redesign-content">
      <section className="report-page__product-decision-hero" aria-labelledby="product-decision-title">
        <div className="report-page__product-decision-copy">
          <h2 id="product-decision-title">상품화 종합판정</h2>
          <div className="report-page__product-decision-title-row"><strong className="report-page__product-decision-title">{productDecision.title}</strong><span className="report-page__product-decision-action">{productDecision.action}</span></div>
          <ul className="report-page__product-decision-bullets">
            <li className="is-satisfied"><Check aria-hidden="true" size={18} strokeWidth={2.4} /><span>보험성 필수 기준 {mandatoryPass}/{FEASIBILITY_DISPLAY_GROUPS[0].criterionIds.length} 충족</span></li>
            <li className={noveltyDecision === 'fulfilled' ? 'is-satisfied' : 'is-follow-up'}>{noveltyDecision === 'fulfilled' ? <Check aria-hidden="true" size={18} strokeWidth={2.4} /> : <span aria-hidden="true">–</span>}<span>국내 유사상품 비교 및 차별화 가능성 확인</span></li>
            {mandatoryCritical === 0 ? <li className="is-satisfied"><Check aria-hidden="true" size={18} strokeWidth={2.4} /><span>확인된 검토 중단 사유 없음</span></li> : null}
          </ul>
        </div>
        <div className="report-page__product-decision-visual" aria-hidden="true"><div className="report-page__product-decision-chart"><span /><span /><span /><span /></div><ShieldCheck size={82} strokeWidth={1.55} /></div>
      </section>

      <section className="report-page__quantitative-metrics report-page__feasibility-subsection" aria-labelledby="quantitative-metrics-title">
        <div className="report-page__feasibility-subsection-heading">
          <div><p className="report-page__quantitative-metric-eyebrow">상품화 판단 핵심 지표</p><h3 id="quantitative-metrics-title">핵심 정량지표</h3></div>
        </div>
        <div className="report-page__quantitative-metric-grid">{FEASIBILITY_METRIC_DISPLAY.map((metric, index) => { const Icon = feasibilityMetricIcons[index % feasibilityMetricIcons.length]; return <article className={`report-page__quantitative-metric-card report-page__quantitative-metric-card--${metric.id}`} key={metric.id}>
          <header><span className="report-page__quantitative-metric-icon" aria-hidden="true"><Icon size={28} strokeWidth={1.75} /></span><h4>{metric.title}</h4><span className={`report-page__quantitative-metric-status report-page__quantitative-metric-status--${FEASIBILITY_METRIC_STATUS[metric.id]}`}>{FEASIBILITY_METRIC_STATUS_LABEL[metric.id]}</span></header>
          <strong className="report-page__quantitative-metric-value">{metric.value}</strong>
          <p className="report-page__quantitative-metric-subvalue">{metric.subvalue}</p>
          <ul>{metric.items.map((item, index) => <li className={`is-${item.tone}`} key={`${metric.id}-${index}`}>{item.text}</li>)}</ul>
          <details className="report-page__quantitative-metric-details">
            <summary><span className="report-page__quantitative-detail-label"><span className="is-closed">산정 근거 보기</span><span className="is-open">산정 근거 닫기</span></span></summary>
            <div className="report-page__quantitative-metric-detail-body">
              <dl>{metric.details.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.items ? <ul>{detail.items.map((item) => <li key={item}>{item}</li>)}</ul> : detail.value}</dd></div>)}</dl>
              {metric.scenarios ? <div className="report-page__quantitative-scenario-table-wrap"><table className="report-page__quantitative-scenario-table"><thead><tr><th scope="col">시나리오</th><th scope="col">산정 과정</th><th scope="col">결과</th></tr></thead><tbody>{metric.scenarios.map((scenario) => <tr className={scenario.label === '기준' ? 'is-base' : undefined} key={scenario.label}><th scope="row">{scenario.label}</th><td>{scenario.calculation}</td><td>{scenario.result}</td></tr>)}</tbody></table></div> : null}
            </div>
          </details>
          <p className="report-page__quantitative-metric-print-note">{metric.printNote}</p>
        </article> })}</div>
      </section>

      <NoveltyAnalysisSection analysis={noveltyAnalysis} initialOpenAccordion={noveltyAccordionRequest} onInitialOpenHandled={onNoveltyAccordionRequestHandled} printMode={printMode} />

      <div className="report-page__feasibility-visible-groups">
        <div className="report-page__feasibility-criteria-heading"><div><p className="report-page__eyebrow">12 CRITERIA</p><h2>12개 상품화 기준 한눈에 보기</h2><p>각 기준의 AI 판단과 근거를 확인합니다.</p></div></div>
        {!printMode ? <div className="report-page__feasibility-filter-toolbar" aria-label="상품화 기준 필터">
          <div className="report-page__feasibility-filter-meta">
            <span className="report-page__feasibility-filter-result">필터 결과 · {filteredCriteria.length}개</span>
            <div className="report-page__feasibility-filter-selects">
              <label><span>기준 그룹</span><select aria-label="기준 그룹 필터" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value as FeasibilityGroupFilter)}><option value="all">전체 기준</option>{FEASIBILITY_DISPLAY_GROUPS.map((group) => <option value={group.id} key={group.id}>{group.title}</option>)}</select></label>
              <label><span>AI 판단</span><select aria-label="AI 판단 필터" value={aiFilter} onChange={(event) => setAiFilter(event.target.value as FeasibilityAiFilter)}><option value="all">전체</option><option value="fulfilled">충족</option><option value="unfulfilled">불충족</option></select></label>
              {hasActiveFilters ? <button type="button" className="report-page__feasibility-filter-reset" onClick={resetFilters}>필터 초기화</button> : null}
            </div>
          </div>
        </div> : null}
        {!printMode && filteredCriteria.length === 0 ? <div className="report-page__feasibility-filter-empty" role="status"><p>선택한 조건에 해당하는 평가 기준이 없습니다.</p><button type="button" onClick={resetFilters}>필터 초기화</button></div> : null}
        {FEASIBILITY_DISPLAY_GROUPS.map((group) => {
          const allGroupCriteria = group.criterionIds.map(findCriterion).filter((criterion): criterion is CommercializationCriterion => Boolean(criterion))
          const groupCriteria = sortedCriteriaForGroup(group)
          const counts = groupCounts(group)
          if (!groupCriteria.length) return null
          return <section className={'report-page__feasibility-visible-group report-page__feasibility-visible-group--' + group.id} key={group.id} aria-labelledby={'visible-group-' + group.id}>
            <div className="report-page__feasibility-visible-group-heading"><div><p className="report-page__eyebrow">{group.eyebrow}</p><h3 id={'visible-group-' + group.id}>{group.title}</h3><p>{group.description}</p>{group.scope ? <small>{group.scope}</small> : null}</div><div className="report-page__evaluation-group-status-summary" aria-label={`${group.title} 상태 집계`}><div><span>AI 판단</span><strong><b className="is-teal">충족 {counts.pass}</b><span aria-hidden="true"> · </span><b>불충족 {counts.critical}</b></strong></div>{!printMode && groupCriteria.length !== allGroupCriteria.length ? <small className="report-page__feasibility-visible-count">현재 표시 {groupCriteria.length}/{allGroupCriteria.length}</small> : null}</div></div>
            {group.id === 'insurance-gate' ? <p className="report-page__evaluation-gate-note">필수 기준 중 하나라도 불충족이면 상품화 검토 중단 또는 재정의가 필요합니다.</p> : null}
            <div className="report-page__evaluation-cards">{groupCriteria.map((criterion) => {
              const aiDecision = noveltyCriterionDecision(criterion, noveltyAnalysis)
              const isOpen = printMode || openCriterionId === criterion.id
              const display = feasibilityCriterionDisplay(criterion, noveltyAnalysis)
              const criterionForDetail = noveltyCriterionForDisplay(criterion, noveltyAnalysis)
              return <article className={'report-page__evaluation-card report-page__evaluation-card--' + (aiDecision === 'fulfilled' ? 'fulfilled' : 'unfulfilled') + (isOpen ? ' is-open' : '')} key={criterion.id}>
                <button className="report-page__evaluation-toggle" type="button" id={'redesign-feasibility-toggle-' + criterion.id} aria-label={display.title + ' 상세 내용 ' + (isOpen ? '접기' : '펼치기')} aria-expanded={isOpen} aria-controls={'redesign-feasibility-detail-' + criterion.id} onClick={() => { if (!printMode) setOpenCriterionId(isOpen ? null : criterion.id) }}>
                  <span className="report-page__evaluation-card-main"><span className="report-page__evaluation-card-heading"><strong>{display.title}</strong></span><span className="report-page__evaluation-judgment">{display.description}</span></span>
                  <span className="report-page__evaluation-card-side"><span className={`report-page__evaluation-ai-status report-page__evaluation-ai-status--${aiDecision}`}>{aiDecisionLabel(aiDecision)}</span><span className={`report-page__evaluation-chevron${isOpen ? ' is-open' : ''}`} aria-hidden="true"><CircleChevronDown className="report-page__evaluation-toggle-icon report-page__evaluation-toggle-icon--down" size={25} strokeWidth={1.8} /><CircleChevronUp className="report-page__evaluation-toggle-icon report-page__evaluation-toggle-icon--up" size={25} strokeWidth={1.8} /></span></span>
                </button>
                <div id={'redesign-feasibility-detail-' + criterion.id} className={`report-page__evaluation-detail-shell${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen} hidden={!isOpen}><div className="report-page__evaluation-detail-shell-inner"><FeasibilityCriterionDetail key={criterion.id} criterion={criterionForDetail} onNavigateTab={onNavigateTab} /></div></div>
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
    </div>
  )
}

function FeasibilitySection({ report, openCriterionId, onOpenCriterion, onNavigateTab, printMode = false, noveltyAccordionRequest, onNoveltyAccordionRequestHandled }: { report: ReportView; openCriterionId?: string | null; onOpenCriterion?: (id: string | null) => void; onNavigateTab?: (id: ReportTabId) => void; printMode?: boolean; noveltyAccordionRequest?: NoveltyAccordionKey | null; onNoveltyAccordionRequestHandled?: () => void }) {
  return (
    <section className="report-page__section report-page__feasibility-redesign" aria-labelledby="feasibility-title">
      <SectionHeading number="02" eyebrow="" title="상품화 검토 종합평가" />
      <p className="report-page__section-intro" id="feasibility-title">상품 개발 검토의 계속 여부와 후속 과제를 확인하는 화면입니다. AI 판단 결과와 근거를 기준별로 확인합니다.</p>
      <FeasibilityDecisionOverview
        report={report}
        openCriterionId={openCriterionId}
        onOpenCriterion={onOpenCriterion}
        onNavigateTab={onNavigateTab}
        printMode={printMode}
        noveltyAccordionRequest={noveltyAccordionRequest}
        onNoveltyAccordionRequestHandled={onNoveltyAccordionRequestHandled}
      />
    </section>
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
  void report
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
        <ul>{PROPOSAL_DECISIONS.map((decision) => <li key={decision.id}><span className="report-page__proposal-decision-check" aria-hidden="true">•</span><span>{decision.text}</span></li>)}</ul>
      </section>

      <section className="report-page__proposal-evidence" aria-labelledby="proposal-evidence-title">
        <div className="report-page__proposal-section-heading"><div><p className="report-page__proposal-evidence-eyebrow report-page__eyebrow">CALCULATION EVIDENCE & CONFIDENCE</p><h3 id="proposal-evidence-title">산출 근거와 신뢰도</h3><p>가격·손해지표에 사용한 근거, 계산 방식과 결과를 바꾸는 핵심 변수를 확인합니다.</p></div><span className="report-page__proposal-evidence-confidence">산출 신뢰도 · {PROPOSAL_CALCULATION_EVIDENCE.confidence}</span></div>
        <div className="report-page__proposal-evidence-grid">
          <article>
            <h4>사용한 근거</h4>
            <ul>{PROPOSAL_CALCULATION_EVIDENCE.used.map((item) => <li key={item.label}><strong>{item.label}</strong><span>{item.detail}</span></li>)}</ul>
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
      <SectionHeading number="04" eyebrow="WORDING FEASIBILITY" title="약관화 검토" aside={<span className="report-page__wording-draft-badge">AI 검토용 초안</span>} />
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
      <SectionHeading number="04" eyebrow="WORDING FEASIBILITY" title="약관화 검토" />
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
      <SectionHeading number="04" eyebrow="" title="약관화 검토" />
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
  onOpenPolicyDraft,
  onNavigateTab,
  printMode = false,
}: {
  report: ReportView
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
  const policyDocumentRef = useRef<HTMLDivElement | null>(null)
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
    window.requestAnimationFrame(() => {
      const policyDocument = policyDocumentRef.current
      const target = document.getElementById(key)
      if (!policyDocument || !target) return
      const documentRect = policyDocument.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const targetTop = policyDocument.scrollTop + targetRect.top - documentRect.top - 18
      policyDocument.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
    })
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
    if (typeof window === 'undefined' || !fullDraftRef.current || !policyDocumentRef.current || printMode) return
    const policyDocument = policyDocumentRef.current
    const articles = Array.from(fullDraftRef.current.querySelectorAll<HTMLElement>('[data-policy-article-key]'))
    if (!articles.length || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) setActiveArticleKey((visible.target as HTMLElement).dataset.policyArticleKey ?? null)
    }, { root: policyDocument, rootMargin: '-16% 0px -70% 0px', threshold: 0 })
    articles.forEach((article) => observer.observe(article))
    return () => observer.disconnect()
  }, [selectedCoverageId, printMode])

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
      <SectionHeading number="04" eyebrow="" title="약관화 검토" />

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
              <select className="report-page__wording-policy-toc-select" aria-label="보통약관 조문 선택" value={commonTocEntries.some((entry) => entry.key === activeArticleKey) ? (activeArticleKey ?? '') : ''} onChange={(event) => { if (event.target.value) scrollToArticle(event.target.value) }}><option value="">조문 선택</option>{commonTocEntries.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select>
              <div className="report-page__wording-policy-toc-scroll">
                <div className="report-page__wording-policy-toc-group"><span>보통약관</span>{commonTocEntries.map((entry) => <button key={entry.key} className={activeArticleKey === entry.key ? 'is-active' : ''} type="button" onClick={() => scrollToArticle(entry.key)}>{entry.label}</button>)}</div>
                <div className="report-page__wording-policy-toc-group"><span>특별약관</span>{specialTocEntries.map((entry) => <button key={entry.key} className={activeArticleKey === entry.key || activeArticleKey?.startsWith(entry.key + '-') ? 'is-active' : ''} type="button" onClick={() => scrollToArticle(entry.key)}>{entry.label}</button>)}</div>
              </div>
            </nav>
            <div ref={policyDocumentRef} className="report-page__wording-policy-document">
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
            <article><h4>약관 작성 근거</h4><ul>{referenceReasons.slice(0, 6).map((reason) => <li key={reason}>{reason}</li>)}</ul></article>
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

const evidenceTypeIcon = (type: string): IconName => {
  if (/뉴스/.test(type)) return 'inbox'
  if (/산업동향/.test(type)) return 'trend'
  if (/사고|손해/.test(type)) return 'shield'
  if (/법령|안전기준/.test(type)) return 'report'
  if (/상품요약서|사업방법서|약관/.test(type)) return 'report'
  if (/통계/.test(type)) return 'trend'
  return 'report'
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
  'ai-judgment': '종합 브리핑',
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
  const visibleEvidence = useMemo(
    () => report.evidence.filter((item) => !isExcludedEvidenceItem(item)),
    [report.evidence],
  )
  const typeOptions = useMemo(
    () => [...new Set(visibleEvidence.map(evidenceDocumentType))].sort((a, b) => a.localeCompare(b, 'ko')),
    [visibleEvidence],
  )
  const filteredEvidence = useMemo(() => {
    const query = search.trim().toLowerCase()
    return visibleEvidence
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
  }, [search, sectionFilter, sortOrder, typeFilter, visibleEvidence])

  const resetEvidenceFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setSectionFilter('all')
    setSortOrder('newest')
  }

  return (
    <section className="report-page__section report-page__evidence-section" aria-labelledby="evidence-title">
      <SectionHeading
        number="06"
        eyebrow="EVIDENCE & REVIEW"
        title="근거자료 및 추가 확인사항"
      />
      <p className="report-page__evidence-intro" id="evidence-title">AI 상품화 판단에 활용한 주요 근거와 추가 검토가 필요한 항목을 확인합니다.</p>

      <div className="report-page__evidence-summary" aria-label="자료 현황">
        <span className="report-page__evidence-summary-item report-page__evidence-summary-item--actual"><strong>{visibleEvidence.length}</strong>참고 근거자료</span>
        <span className="report-page__evidence-summary-item report-page__evidence-summary-item--required"><strong>{report.missingResearch.length}</strong>추가 확인 필요</span>
      </div>
      <p className="report-page__evidence-notice"><span aria-hidden="true">ⓘ</span> 공개자료와 보험 문서를 함께 검토했으며, 공개자료만으로 확정하기 어려운 판단은 아래 추가 확인사항으로 구분했습니다.</p>

      <section className="report-page__evidence-list-section" aria-labelledby="evidence-list-title">
        <div className="report-page__evidence-section-heading"><div><h3 id="evidence-list-title">판단에 활용한 근거자료</h3><p>AI가 위험 분석과 상품화 검토에 참고한 주요 출처입니다.</p></div><span>{filteredEvidence.length} / {visibleEvidence.length}건</span></div>
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
                  <div className="report-page__evidence-card-head"><span className={`report-page__evidence-type report-page__evidence-type--${tone}`}><span className="report-page__evidence-type-icon"><AppIcon name={evidenceTypeIcon(type)} size={14} strokeWidth={2} /></span>{type}</span><span className="report-page__evidence-card-meta"><code>{item.id}</code><span className="report-page__evidence-meta-divider" aria-hidden="true">·</span><time className={!item.referenceDate ? 'report-page__evidence-date--missing' : undefined} dateTime={item.referenceDate ?? undefined}>{formatEvidenceDate(item.referenceDate)}</time></span></div>
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

type ExecutiveBriefingRiskContext = {
  target: string
  affected: string
  background: string
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
  riskContext: ExecutiveBriefingRiskContext
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
}

const firstBriefingValue = (values: Array<string | undefined> | undefined, fallback: string) => values?.find((value) => typeof value === 'string' && value.trim())?.trim() ?? fallback
const trimBriefingSentence = (value: string) => value.trim().replace(/[.!?。！？]+$/u, '')
const compactBriefingText = (value: string, maxLength: number) => {
  const normalized = value.replace(/\s+/gu, ' ').trim()
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).replace(/[ ,·]+$/u, '')}…` : normalized
}
const compactRiskDamageLabel = (value: string) => value.replace(/(直接)? ?재산손해| 손해$/u, '').replace(/·주변 시설$/u, '').trim()
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
  const coreCardResultLabels: Record<string, string> = {
    coverage: '보장 공백 확인',
    feasibility: '상품 개발 가능',
    proposal: '단체계약형 적합',
    wording: '약관 반영 가능',
  }
  const coreCards = storedBriefing.coreCards.map((card) => ({
    ...card,
    status: coreCardResultLabels[card.id] ?? card.status,
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
  const riskDamageLabels = (coverage.damageTypes ?? [])
    .map((item) => compactRiskDamageLabel(item.name))
    .filter(Boolean)
    .slice(0, 3)
  const riskAffected = riskDamageLabels.length
    ? riskDamageLabels.join(' · ')
    : (coverage.affectedParties ?? []).slice(0, 3).map((item) => item.replace(/ 소유자$| 또는 관리주체$/u, '')).join(' · ')
  const riskExpansionReason = (coverage.whyNow ?? []).find((item) => /다수|확산/u.test(item))
  const riskCoverageReason = coverage.existingCoverageMap?.find((item) => item.remainingGap?.trim())?.remainingGap
  const riskContext: ExecutiveBriefingRiskContext = {
    target: compactBriefingText(firstBriefingValue([coverage.definition, report.meta.riskTitle], '분석 대상 위험 확인 필요'), 72),
    affected: riskAffected || '주요 피해 대상 확인 필요',
    background: compactBriefingText([riskExpansionReason, riskCoverageReason].filter((item): item is string => Boolean(item?.trim())).slice(0, 2).map(trimBriefingSentence).join(' · ') || '상품개발 검토 배경 확인 필요', 112),
  }
  const summaryTaskSources = PRODUCT_REVIEW_SUMMARY_COPY.nextTasks.map((task) => ({
    id: task.id,
    topic: task.title,
    reason: task.action,
    responsibleTeam: '상품개발',
    requiredMaterials: [task.output],
  }))
  const taskSources = report.meta.dataStatus?.startsWith('ACTUAL ARTICLE') === true
    ? (missingResearch.length
      ? missingResearch
      : report.aiSummary.nextActions?.map((item) => ({ id: item.id, topic: item.action, reason: item.reason, responsibleTeam: item.responsibleTeams?.[0], requiredMaterials: [] })) ?? [])
    : summaryTaskSources
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
    conclusionBody: report.meta.dataStatus?.startsWith('ACTUAL ARTICLE') === true
      ? storedBriefing.checks.join(' ')
      : PRODUCT_REVIEW_SUMMARY_COPY.recommendation.description,
    conclusionPoints: storedBriefing.checks.slice(0, 4),
    states,
    coreCards,
    riskContext,
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
  }
}

function DecisionBriefingFinancialIndicators({ metrics, printMode }: { metrics: ExecutiveBriefingModel['metrics']; printMode: boolean }) {
  const financialIcons = [BarChart3, Umbrella, FileText, PieChart] as const
  return (
    <section className="report-page__decision-briefing-section report-page__decision-briefing-finance" aria-labelledby="decision-briefing-finance-title">
      <div className="report-page__decision-briefing-section-head"><div><p className="report-page__decision-briefing-kicker">KEY FINANCIAL INDICATORS</p><h3 id="decision-briefing-finance-title">핵심 정량 지표</h3></div></div>
      {printMode ? (
        <table className="report-page__decision-briefing-finance-table">
          <caption>핵심 정량 지표</caption>
          <thead><tr><th scope="col">지표</th><th scope="col">기준 값</th><th scope="col">범위·보조 설명</th><th scope="col">신뢰도</th></tr></thead>
          <tbody>{metrics.map((metric) => <tr key={metric.id}><th scope="row">{metric.label}</th><td>{metric.value}</td><td>{metric.supporting}</td><td>{metric.confidence} · 1차 추정</td></tr>)}</tbody>
        </table>
      ) : (
        <div className="report-page__decision-briefing-finance-summary">
          {metrics.map((metric, index) => { const Icon = financialIcons[index % financialIcons.length]; return <article className={`report-page__decision-briefing-finance-card report-page__decision-briefing-finance-card--${metric.tone} report-page__decision-briefing-finance-card--${metric.id}`} key={metric.id}><span className="report-page__decision-briefing-finance-icon" aria-hidden="true"><Icon size={25} strokeWidth={1.75} /></span><div><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.supporting}</small><em>{metric.confidence} · 1차 추정</em></div></article> })}
        </div>
      )}
    </section>
  )
}

function ExecutiveBriefingSection({
  report,
  onNavigateTab,
  printMode = false,
}: {
  report: ReportView
  onNavigateTab?: (id: ReportTabId) => void
  printMode?: boolean
}) {
  const briefing = createExecutiveBriefing(report)
  const conclusionGroups = [
    { title: '확인된 판단', icon: ClipboardCheck, points: briefing.conclusionPoints.slice(0, 2) },
    { title: '후속 확인', icon: Search, points: briefing.conclusionPoints.slice(2, 4) },
  ] as const

  return (
    <section className="report-page__section report-page__briefing report-page__briefing--decision" aria-label="종합 브리핑">
      <SectionHeading number="01" eyebrow={briefing.eyebrow} title={reportLabel(report, 'briefingTitle', '종합 브리핑')} />

      <section className="report-page__decision-briefing-summary" aria-labelledby="decision-briefing-summary-title">
        <div className="report-page__decision-briefing-summary-head">
          <div><p className="report-page__decision-briefing-kicker">SUMMARY</p><h3 id="decision-briefing-summary-title">검토 결론 요약</h3></div>
        </div>

        <section className="report-page__decision-briefing-conclusion" aria-labelledby="decision-briefing-conclusion-title">
          <div className="report-page__decision-briefing-conclusion-lead">
            <span className="report-page__decision-briefing-conclusion-icon" aria-hidden="true"><ShieldCheck size={58} strokeWidth={1.65} /></span>
            <div className="report-page__decision-briefing-conclusion-head">
            <div><p className="report-page__decision-briefing-kicker">최종 검토 결론</p><h3 id="decision-briefing-conclusion-title">{briefing.conclusion}</h3></div>
            </div>
          </div>
          <div className="report-page__decision-briefing-conclusion-points">
            {conclusionGroups.map((group) => { const Icon = group.icon; return <div className="report-page__decision-briefing-conclusion-group" key={group.title}>
              <div className="report-page__decision-briefing-conclusion-group-head"><span aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></span><h4>{group.title}</h4></div>
              <ul>{group.points.map((point) => <li key={point}><Check aria-hidden="true" size={15} strokeWidth={2.1} />{point}</li>)}</ul>
            </div> })}
          </div>
        </section>

        <SummaryCoreJudgmentsSection report={report} printMode={printMode} />
        <DecisionBriefingFinancialIndicators metrics={briefing.metrics} printMode={printMode} />
      </section>

      <section id="decision-briefing-core-results" className="report-page__decision-briefing-section report-page__decision-briefing-core-results" aria-labelledby="decision-briefing-core-title">
        <div className="report-page__decision-briefing-section-head"><div><p className="report-page__decision-briefing-kicker">CORE REVIEW RESULTS</p><h3 id="decision-briefing-core-title">핵심 검토 결과</h3></div></div>
        {printMode ? (
          <table className="report-page__decision-briefing-core-table">
            <caption>핵심 검토 결과</caption>
            <thead><tr><th scope="col">검토 영역</th><th scope="col">핵심 결과</th><th scope="col">핵심 근거</th></tr></thead>
            <tbody>{briefing.coreCards.map((card) => <tr key={card.id}>
              <th scope="row">{card.title}</th>
              <td>{card.status}</td>
              <td><ul>{card.lines.slice(0, 2).map((line) => <li key={line}><span aria-hidden="true">✓</span>{line}</li>)}</ul></td>
            </tr>)}</tbody>
          </table>
        ) : (
          <div className="report-page__decision-briefing-core-grid">
            {briefing.coreCards.map((card) => <article className={`report-page__decision-briefing-core-card report-page__decision-briefing-core-card--${card.tone} report-page__decision-briefing-core-card--${card.id}`} key={card.id}>
              <div className="report-page__decision-briefing-core-card-head">
                <h4>{card.title}</h4>
                {onNavigateTab ? <button className="report-page__text-button report-page__briefing-icon-link report-page__no-print" type="button" onClick={() => {
                  if (card.id === 'proposal') {
                    onNavigateTab('proposal')
                    return
                  }
                  if (card.id === 'feasibility') {
                    onNavigateTab('feasibility')
                    window.requestAnimationFrame(() => {
                      window.requestAnimationFrame(() => document.getElementById('insurance-criteria')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
                    })
                    return
                  }
                  onNavigateTab(card.tab)
                }} aria-label="상세 탭으로 이동" title="상세 탭으로 이동"><ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.9} /></button> : null}
              </div>
              <strong className="report-page__decision-briefing-core-card-result">{card.status}</strong>
              <ul>{card.lines.slice(0, 2).map((line) => <li key={line}><span aria-hidden="true">✓</span>{line}</li>)}</ul>
            </article>)}
          </div>
        )}
      </section>

      <section className="report-page__decision-briefing-section report-page__decision-briefing-risk-context" aria-labelledby="decision-briefing-risk-context-title">
        <div className="report-page__decision-briefing-section-head"><div><p className="report-page__decision-briefing-kicker">RISK OVERVIEW</p><h3 id="decision-briefing-risk-context-title">검토 대상 위험</h3></div></div>
        <dl className="report-page__decision-briefing-risk-context-list">
          <div><dt>분석 대상 위험</dt><dd>{briefing.riskContext.target}</dd></div>
          <div><dt>주요 피해 대상</dt><dd>{briefing.riskContext.affected}</dd></div>
          <div><dt>상품개발 검토 배경</dt><dd>{briefing.riskContext.background}</dd></div>
        </dl>
      </section>

      <SummaryEvaluationStatusSection report={report} printMode={printMode} />

      <section className="report-page__decision-briefing-section" aria-labelledby="decision-briefing-product-title">
        <div className="report-page__decision-briefing-section-head"><div><p className="report-page__decision-briefing-kicker">RECOMMENDED PRODUCT</p><h3 id="decision-briefing-product-title">추천 상품 구조</h3></div></div>
        {printMode ? (
          <table className="report-page__decision-briefing-product-table">
            <caption>추천 상품 구조 요약</caption>
            <tbody>
              <tr className="report-page__decision-briefing-product-table-primary"><th scope="row">상품명</th><td colSpan={3}>{briefing.product.name}</td></tr>
              <tr className="report-page__decision-briefing-product-table-primary"><th scope="row">계약 형태</th><td colSpan={3}>{briefing.product.structure}</td></tr>
              <tr><th scope="row">계약자</th><td colSpan={3}>{briefing.product.policyholder}</td></tr>
              <tr><th scope="row">보장 대상</th><td colSpan={3}>{briefing.product.insured}</td></tr>
              <tr><th scope="row">보장 사고</th><td colSpan={3}>{briefing.product.event}</td></tr>
              <tr><th scope="row">보장 손해</th><td colSpan={3}>{briefing.product.loss}</td></tr>
              <tr><th scope="row">보상 방식</th><td colSpan={3}>{briefing.product.settlement}</td></tr>
            </tbody>
          </table>
        ) : (
          <>
            <div className="report-page__decision-briefing-product-head"><div><span>상품명</span><strong>{briefing.product.name}</strong></div><div><span>계약 형태</span><strong>{briefing.product.structure}</strong></div></div>
             <table className="report-page__decision-briefing-product-facts-table">
               <tbody>
                 <tr><th scope="row">계약자</th><td>{briefing.product.policyholder}</td></tr>
                 <tr><th scope="row">보장 대상</th><td>{briefing.product.insured}</td></tr>
                 <tr><th scope="row">보장 사고</th><td>{briefing.product.event}</td></tr>
                 <tr><th scope="row">보장 손해</th><td>{briefing.product.loss}</td></tr>
                 <tr><th scope="row">보상 방식</th><td>{briefing.product.settlement}</td></tr>
               </tbody>
             </table>
          </>
        )}
        <div className="report-page__decision-briefing-wording-preview"><div className="report-page__decision-briefing-wording-preview-head"><h4>추천 보장 문구 미리보기</h4></div><p>{briefing.product.wordingPreview}</p></div>
      </section>

      <section className="report-page__decision-briefing-section report-page__decision-briefing-actions" aria-labelledby="decision-briefing-decisions-title">
        <div className="report-page__decision-briefing-section-head"><div><p className="report-page__decision-briefing-kicker">DECISION & ACTIONS</p><h3 id="decision-briefing-decisions-title">실무 결정사항 및 우선 실행 과제</h3></div></div>
        {printMode ? (
          <div className="report-page__decision-briefing-print-action-tables">
            <table>
              <caption>회의에서 결정할 사항</caption>
              <thead><tr><th scope="col">항목</th><th scope="col">결정 내용</th></tr></thead>
              <tbody>{briefing.decisions.slice(0, 4).map((item) => <tr key={item.id}><th scope="row">{item.title}</th><td>{item.decision}</td></tr>)}</tbody>
            </table>
            <table>
              <caption>우선 실행 과제</caption>
              <thead><tr><th scope="col">순번</th><th scope="col">과제</th><th scope="col">실행 내용</th></tr></thead>
              <tbody>{briefing.tasks.slice(0, 3).map((task, index) => <tr key={task.id}><th scope="row">{String(index + 1).padStart(2, '0')}</th><td>{task.title}</td><td>{task.action}</td></tr>)}</tbody>
            </table>
          </div>
        ) : (
          <div className="report-page__decision-briefing-work-grid">
              <article className="report-page__decision-briefing-work-column"><h4>회의에서 결정할 사항</h4><p className="report-page__decision-briefing-work-role">상품·약관 조건 중 실무 회의에서 선택하거나 확정할 항목</p><ul className="report-page__decision-briefing-decision-checklist">{briefing.decisions.slice(0, 4).map((item) => <li key={item.id}><span aria-hidden="true">•</span><div><strong>{item.title}</strong><p>{item.decision}</p></div></li>)}</ul></article>
        <article className="report-page__decision-briefing-work-column"><div className="report-page__decision-briefing-work-column-head"><div><h4>우선 실행 과제</h4><p className="report-page__decision-briefing-work-role">결정을 위해 실제 자료를 확보하거나 검토할 작업</p></div></div><ol className="report-page__decision-briefing-task-list">{briefing.tasks.slice(0, 3).map((task, index) => <li key={task.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{task.title}</strong><p>{task.action}</p></div></li>)}</ol></article>
          </div>
        )}
      </section>

    </section>
  )
}

const REPORT_TABS = [
  { id: 'ai-judgment', label: '종합 브리핑', panelId: 'report-panel-ai-judgment' },
  { id: 'feasibility', label: '상품화 종합평가', panelId: 'report-panel-feasibility' },
  { id: 'coverage-gap', label: '보장 공백', panelId: 'report-panel-coverage-gap' },
  { id: 'wording', label: '약관 검토', panelId: 'report-panel-wording' },
  { id: 'proposal', label: '상품 개발 제안', panelId: 'report-panel-proposal' },
  { id: 'evidence', label: '근거자료 및 추가 확인사항', panelId: 'report-panel-evidence' },
] as const

type ReportTabId = (typeof REPORT_TABS)[number]['id']

type PdfPrintOptions = {
  includeCover: boolean
  includePageNumbers: boolean
  includeGeneratedAt: boolean
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

const REPORT_TABS_COLLAPSE_DISTANCE = 72
const REPORT_TABS_REVEAL_DISTANCE = 4

function useReportTabsVisibility() {
  const [isVisible, setIsVisible] = useState(true)
  const visibilityRef = useRef(true)
  const previousScrollYRef = useRef(0)
  const downwardScrollDistanceRef = useRef(0)

  useEffect(() => {
    const setVisibility = (nextVisibility: boolean) => {
      if (visibilityRef.current === nextVisibility) return
      visibilityRef.current = nextVisibility
      setIsVisible(nextVisibility)
    }

    previousScrollYRef.current = window.scrollY

    const handleScroll = () => {
      const currentScrollY = Math.max(window.scrollY, 0)
      const scrollDelta = currentScrollY - previousScrollYRef.current
      previousScrollYRef.current = currentScrollY

      if (currentScrollY <= 16) {
        downwardScrollDistanceRef.current = 0
        setVisibility(true)
        return
      }

      if (scrollDelta > 0) {
        downwardScrollDistanceRef.current += scrollDelta
        if (downwardScrollDistanceRef.current >= REPORT_TABS_COLLAPSE_DISTANCE) {
          setVisibility(false)
        }
        return
      }

      if (scrollDelta <= -REPORT_TABS_REVEAL_DISTANCE) {
        downwardScrollDistanceRef.current = 0
        setVisibility(true)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return isVisible
}

function ReportTabs({ activeTab, onChange }: { activeTab: ReportTabId; onChange: (id: ReportTabId) => void }) {
  const isVisible = useReportTabsVisibility()

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
      <div className={`report-page__tabs-list${isVisible ? '' : ' is-collapsed'}`} role="tablist" aria-orientation="horizontal">
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
      <h1>{displayReportTitle(report.meta.title)}</h1>
      <dl className="report-page__pdf-cover-meta">
        <div><dt>위험 ID</dt><dd>{report.meta.sourceRiskId}</dd></div>
        <div><dt>분석 기준일</dt><dd>{displayDate(report.meta.analysisBaseDate)}</dd></div>
        <div><dt>근거자료</dt><dd>{report.evidence.filter((item) => !isExcludedEvidenceItem(item)).length}건</dd></div>
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
  const renderableSections = sections

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
        {includes('ai-judgment') ? (
          <div className="report-page__pdf-section" data-pdf-section="ai-judgment"><ExecutiveBriefingSection report={report} printMode /></div>
        ) : null}
        {includes('feasibility') ? (
          <div className="report-page__pdf-section" data-pdf-section="feasibility"><FeasibilitySection report={report} printMode /></div>
        ) : null}
        {includes('coverage-gap') ? (
          <div className="report-page__pdf-section" data-pdf-section="coverage-gap"><RiskGapSection report={report} printMode /></div>
        ) : null}
        {includes('wording') ? (
          <div className="report-page__pdf-section" data-pdf-section="wording">
            <FullWordingSection report={report} onOpenPolicyDraft={() => undefined} printMode />
          </div>
        ) : null}
        {includes('proposal') ? (
          <div className="report-page__pdf-section" data-pdf-section="proposal"><ProductProposalSection report={report} printMode /></div>
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
  onBackToList,
}: {
  report: ReportResult
  riskData: RiskSourceData
  reportProxy: ReportProxy
  navigation?: ReportNavigation
  onBackToList: () => void
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
  const [noveltyAccordionRequest, setNoveltyAccordionRequest] = useState<NoveltyAccordionKey | null>(null)
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
          const sourceNoveltyAnalysis = normalizedSourceReport.productProposal.noveltyAnalysis
          const storedNoveltyAnalysis = normalizedStored.productProposal.noveltyAnalysis
          const noveltyAnalysis = sourceNoveltyAnalysis?.analysisStatus === 'completed'
            && (!storedNoveltyAnalysis || storedNoveltyAnalysis.analysisStatus === 'pending')
            ? sourceNoveltyAnalysis
            : storedNoveltyAnalysis ?? sourceNoveltyAnalysis
          const mergedStoredReport = {
            ...normalizedStored,
            productProposal: {
              ...normalizedStored.productProposal,
              noveltyAnalysis,
            },
          }
          setSavedReport(mergedStoredReport)
          setDraftReport(cloneReport(mergedStoredReport))
        }
      } catch {
        // A viewer should still be able to read the source report when no saved version exists.
      }
    }
    void loadStoredContent()
    return () => { cancelled = true }
  }, [normalizedSourceReport, reportProxy, sourceReport])

  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (!editorDirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeave)
    return () => window.removeEventListener('beforeunload', warnBeforeLeave)
  }, [editorDirty])

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
      if (nextTab !== activeTab && (editorMode || editorPreview)) {
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
  }, [activeTab, editorDirty, editorMode, editorPreview, savedReport])

  useEffect(() => {
    let previousOpenStates: Array<{ detail: HTMLDetailsElement; open: boolean }> = []
    const openDetailsForPrint = () => {
      const details = Array.from(document.querySelectorAll<HTMLDetailsElement>('.report-page details'))
      previousOpenStates = details.map((detail) => ({ detail, open: detail.open }))
      details.forEach((detail) => { detail.open = true })
    }
    const restoreAfterPrint = () => {
      previousOpenStates.forEach(({ detail, open }) => {
        if (detail.isConnected) detail.open = open
      })
      previousOpenStates = []
      setPdfRequest(createDefaultPdfRequest())
      if (previousDocumentTitle.current !== null) {
        document.title = previousDocumentTitle.current
        previousDocumentTitle.current = null
      }
    }
    window.addEventListener('beforeprint', openDetailsForPrint)
    window.addEventListener('afterprint', restoreAfterPrint)
    return () => {
      window.removeEventListener('beforeprint', openDetailsForPrint)
      window.removeEventListener('afterprint', restoreAfterPrint)
    }
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
    if (id !== activeTab && (editorMode || editorPreview)) {
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
        onBackToList={onBackToList}
      />
      {editorMessage ? <p className="report-page__form-error report-page__no-print" role="alert">{editorMessage}</p> : null}
      {editorPreview ? <p className="report-page__editor-preview-banner report-page__no-print">저장 전 미리보기입니다. 내용은 아직 저장되지 않았습니다.</p> : null}
      <ReportTabs activeTab={activeTab} onChange={handleTabChange} />
      <div className="report-page__tab-panels">
        <ReportTabPanel id="report-panel-ai-judgment" tabId="ai-judgment" index={0} active={activeTab === 'ai-judgment'} onChange={handleTabChange}>
          {editorMode && activeTab === 'ai-judgment' ? <ReportEditorPanel activeTab="briefing" report={draftReport} onChange={handleDraftChange} /> : <ExecutiveBriefingSection report={report} onNavigateTab={handleTabChange} />}
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-feasibility" tabId="feasibility" index={1} active={activeTab === 'feasibility'} onChange={handleTabChange}>
          {editorMode && activeTab === 'feasibility' ? <ReportEditorPanel activeTab="feasibility" report={draftReport} onChange={handleDraftChange} openCriterionId={feasibilityOpenId} onOpenCriterion={setFeasibilityOpenId} /> : <FeasibilitySection report={report} openCriterionId={feasibilityOpenId} onOpenCriterion={setFeasibilityOpenId} onNavigateTab={handleTabChange} noveltyAccordionRequest={noveltyAccordionRequest} onNoveltyAccordionRequestHandled={() => setNoveltyAccordionRequest(null)} />}
        </ReportTabPanel>

        <ReportTabPanel id="report-panel-coverage-gap" tabId="coverage-gap" index={2} active={activeTab === 'coverage-gap'} onChange={handleTabChange}>
          {editorMode && activeTab === 'coverage-gap' ? <ReportEditorPanel activeTab="coverage-gap" report={draftReport} onChange={handleDraftChange} /> : <RiskGapSection report={report} onNavigateTab={handleTabChange} />}
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-wording" tabId="wording" index={3} active={activeTab === 'wording'} onChange={handleTabChange}>
          {editorMode && activeTab === 'wording' ? <ReportEditorPanel activeTab="wording" report={draftReport} onChange={handleDraftChange} /> : (
            <FullWordingSection
              report={report}
              onOpenPolicyDraft={() => setPolicyDraftOpen(true)}
              onNavigateTab={handleTabChange}
            />
          )}
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-proposal" tabId="proposal" index={4} active={activeTab === 'proposal'} onChange={handleTabChange}>
          {editorMode && activeTab === 'proposal' ? <ReportEditorPanel activeTab="proposal" report={draftReport} onChange={handleDraftChange} /> : <ProductProposalSection report={report} onNavigateTab={handleTabChange} />}
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-evidence" tabId="evidence" index={5} active={activeTab === 'evidence'} onChange={handleTabChange}>
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

    </>
  )
}
