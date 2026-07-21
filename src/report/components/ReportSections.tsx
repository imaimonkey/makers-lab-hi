import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { ReportResult, RiskSourceData } from '../types'
import type { ReportProxy } from '../api/report-proxy'
import type { ReviewerStorage } from '../services/reviewer-storage'
import { ReportModal } from './ReportModal'
import { ReviewerPanel, type AiReviewRecommendation } from './ReviewerPanel'
import { PolicyDraftModal, ReportQuestionPanel } from './ReportAssistPanels'

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
}

type ReportView = {
  meta: {
    reportId?: string
    sourceRiskId: string
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
  validationComparison?: {
    title?: string
    notice?: string
    similarities?: Array<{
      topic: string
      aiResult?: string
      validationPoint?: string
    }>
    differences?: Array<{
      topic: string
      aiResult?: string
      actualProductReview?: string
    }>
    interpretation?: string
  }
  reviewer?: ReportResult['reviewer']
}

type ModalState =
  | { type: 'evidence'; evidence: EvidenceItem }
  | { type: 'comparison' }
  | { type: 'document'; document: NonNullable<ReportView['wordingFeasibility']['referenceDocuments']>[number] }
  | null

function asReportView(report: ReportResult): ReportView {
  return report as unknown as ReportView
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
  if (/부족|보완|주의|미확보|needs/i.test(status)) {
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
    conditional: '조건부 검토',
    'needs-data': '보완 필요',
    pending: '검토 대기',
    review: '검토 필요',
    draft: '검토 초안',
    available: '확보 가능',
    unavailable: '확보 필요',
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

function EvidenceReferences({
  ids,
  evidence = [],
}: {
  ids?: string[]
  evidence?: EvidenceItem[]
}) {
  if (!ids?.length) return null
  const evidenceById = new Map(evidence.map((item) => [item.id, item.title]))
  return (
    <span className="report-page__evidence-refs">
      근거자료 {ids.map((id) => `${id} · ${evidenceById.get(id) ?? '자료 제목 확인 필요'}`).join(' / ')}
    </span>
  )
}

function ReportHeader({
  report,
  onCompare,
  activeTab,
  pdfMenuOpen,
  onTogglePdfMenu,
  onPrintAll,
  onPrintCurrent,
  onOpenPdfSelection,
}: {
  report: ReportView
  onCompare: () => void
  activeTab: ReportTabId
  pdfMenuOpen: boolean
  onTogglePdfMenu: () => void
  onPrintAll: () => void
  onPrintCurrent: () => void
  onOpenPdfSelection: () => void
}) {
  const meta = report.meta
  return (
    <section className="report-page__report-header" aria-labelledby="report-title">
      <div className="report-page__report-header-top">
        <div>
          <div className="report-page__badge-row">
            <StatusBadge>{meta.aiStatus ?? 'AI 생성 초안'}</StatusBadge>
            {(meta.badges ?? []).filter((badge) => badge !== meta.aiStatus).map((badge) => (
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
          {report.validationComparison ? (
            <button className="report-page__button" type="button" onClick={onCompare}>
              실제 상품과 비교
            </button>
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
      {meta.disclaimer ? <p className="report-page__disclaimer">{meta.disclaimer}</p> : null}
    </section>
  )
}

type NextReviewTask = {
  id: string
  priority: '높음' | '중간'
  action: string
  reason: string
  responsibleTeams: string[]
  evaluationIds: string[]
  evidenceIds: string[]
  requiredMaterials: string[]
  detail: string
}

function createNextReviewTasks(summary: ReportView['aiSummary']): NextReviewTask[] {
  const tasks: NextReviewTask[] = []
  ;(summary.nextActions ?? []).forEach((item, index) => {
    tasks.push({
      id: item.id,
      priority: index === 0 ? '높음' : '중간',
      action: item.action,
      reason: item.reason,
      responsibleTeams: item.responsibleTeams ?? [],
      evaluationIds: item.evaluationIds ?? [],
      evidenceIds: item.evidenceIds ?? [],
      requiredMaterials: [],
      detail: item.reason,
    })
  })
  ;(summary.additionalConfirmations ?? []).forEach((item, index) => {
    tasks.push({
      id: item.id,
      priority: index < 2 ? '높음' : '중간',
      action: item.whatToConfirm,
      reason: item.whyNeeded,
      responsibleTeams: item.responsibleTeams ?? [],
      evaluationIds: [],
      evidenceIds: item.evidenceIds ?? [],
      requiredMaterials: item.requiredMaterials ?? [],
      detail: item.title,
    })
  })

  const seen = new Set<string>()
  return tasks
    .filter((item) => {
      const key = item.action.replace(/\s+/g, '').slice(0, 32)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((left, right) => Number(right.priority === '높음') - Number(left.priority === '높음'))
    .slice(0, 3)
}

function AiSummarySection({ report }: { report: ReportView }) {
  const summary = report.aiSummary
  const nextReviewTasks = createNextReviewTasks(summary)
  return (
    <section className="report-page__section" aria-labelledby="ai-summary-title">
      <SectionHeading
        number="01"
        eyebrow="AI PRODUCT JUDGMENT"
        title="AI 1차 상품화 판단"
        aside={<StatusBadge>{summary.decisionLabel}</StatusBadge>}
      />
      <div className="report-page__primary-conclusion" id="ai-summary-title">
        <p className="report-page__eyebrow">AI PRIMARY CONCLUSION</p>
        <strong>{summary.decisionLabel ?? '판단 보류'}</strong>
        <p>{summary.primaryConclusionReason ?? '핵심 판단 근거를 추가 확인해야 합니다.'}</p>
      </div>
      <div className="report-page__summary-grid">
        {(summary.cards ?? []).map((card) => (
          <details className="report-page__summary-card" key={card.id}>
            <summary>
              <span className="report-page__summary-card-label">{card.label}</span>
              <StatusBadge>{card.status}</StatusBadge>
              <strong>{card.result}</strong>
              <p>{card.shortReason}</p>
              <span className="report-page__details-label">판단 근거 보기</span>
            </summary>
            <div className="report-page__details-body">
              <p>{card.detail}</p>
              <EvidenceReferences ids={card.evidenceIds} evidence={report.evidence} />
              {card.caveat ? <p className="report-page__caveat">추가 확인사항 · {card.caveat}</p> : null}
            </div>
          </details>
        ))}
      </div>
      <div className="report-page__opinion">
        <p className="report-page__eyebrow">AI 종합 판단</p>
        <h3>AI 종합 의견</h3>
        <blockquote>{summary.overallOpinion ?? '종합 의견을 추가 확인해야 합니다.'}</blockquote>
      </div>

      <div className="report-page__next-review-tasks">
        <h3>다음 검토 과제</h3>
        {nextReviewTasks.map((item) => (
          <details key={item.id} className="report-page__next-task">
            <summary>
              <StatusBadge>{item.priority}</StatusBadge>
              <strong>{item.action}</strong>
              <span>{item.reason}</span>
              <small>담당 분야 · {item.responsibleTeams.join(', ') || '추가 확인'}</small>
            </summary>
            <div>
              <p><strong>세부 판단 근거</strong>{item.detail}</p>
              <p><strong>관련 평가항목</strong>{item.evaluationIds.join(', ') || '추가 확인 필요'}</p>
              <p><strong>필요한 상세 데이터</strong>{item.requiredMaterials.join(', ') || '추가 확인 필요'}</p>
              <EvidenceReferences ids={item.evidenceIds} evidence={report.evidence} />
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

function RiskGapSection({ report }: { report: ReportView }) {
  const data = report.riskGapSummary
  const gapType = (item: NonNullable<ReportView['riskGapSummary']['existingCoverageMap']>[number]) => {
    const text = `${item.coverageName} ${item.remainingGap ?? ''}`
    if (/자기부담|한도|보험가액/.test(text)) return '한도·자기부담'
    if (/중복|우선 보상|구상/.test(text)) return '중복보험'
    if (/결함|원인 미상|발화 원인/.test(text)) return '결함·원인'
    if (/인과관계|과실|관리상/.test(text)) return '인과관계'
    return '책임 범위'
  }
  return (
    <section className="report-page__section" aria-labelledby="risk-gap-title">
      <SectionHeading number="04" eyebrow="RISK & COVERAGE GAP" title="현재 보험으로 남는 보장 공백" />
      <p className="report-page__section-intro">AI가 식별한 검토용 보장 공백입니다.</p>
      <div className="report-page__table-wrap" id="risk-gap-title">
        <table className="report-page__gap-table">
          <thead>
            <tr><th>발생 손해</th><th>기존 보험 가능 범위</th><th>남는 보장 공백</th></tr>
          </thead>
          <tbody>
            {(data.existingCoverageMap ?? []).map((item, index) => (
              <tr key={item.id}>
                <td><strong>{item.damage ?? data.damageTypes?.[index]?.name ?? item.coverageName}</strong></td>
                <td><strong>{item.coverageName}</strong><p>{item.possibleCoverage}</p></td>
                <td><span className="report-page__gap-type">{gapType(item)}</span><p>{item.remainingGap}</p></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="report-page__long-details report-page__risk-details">
        <summary>상세 위험 설명 <span>필요 시 펼쳐 보기</span></summary>
        <div className="report-page__risk-details-body">
          <p className="report-page__definition">{data.definition}</p>
          <div className="report-page__two-column">
            <div className="report-page__subsection">
              <h3>왜 지금 검토해야 하는가</h3>
              <ul className="report-page__number-list">
                {(data.whyNow ?? []).map((item, index) => (
                  <li key={item}><span>{String(index + 1).padStart(2, '0')}</span>{item}</li>
                ))}
              </ul>
            </div>
            <div className="report-page__subsection">
              <h3>영향을 받는 대상</h3>
              <ChipList items={data.affectedParties} />
            </div>
          </div>
          <div className="report-page__card-grid">
            {(data.damageTypes ?? []).map((item) => (
              <article className="report-page__info-card" key={item.id}>
                <div className="report-page__card-top"><code>{item.id}</code><StatusBadge>{item.initialScope}</StatusBadge></div>
                <h3>{item.name}</h3>
                <ChipList items={item.examples} />
              </article>
            ))}
          </div>
          <div className="report-page__gap-list">
            {(data.keyCoverageGaps ?? []).map((gap) => (
              <article key={gap.id}>
                <span>{gap.id}</span>
                <div><h3>{gap.title}</h3><p>{gap.description}</p></div>
                <StatusBadge>{gap.importance}</StatusBadge>
              </article>
            ))}
          </div>
        </div>
      </details>
    </section>
  )
}

function TargetSuitabilityContent({ report }: { report: ReportView }) {
  const data = report.targetSuitability
  return (
    <div className="report-page__subsection report-page__target-suitability" id="target-title">
      <div className="report-page__card-top">
        <h3>보험 대상과 계약 구조 검토</h3>
        <StatusBadge>{data.recommendation}</StatusBadge>
      </div>
      <p className="report-page__section-intro">{data.recommendationLabel}</p>
      <div className="report-page__target-grid">
        {(data.options ?? []).slice().sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).map((option) => (
          <article className={option.rank === 1 ? 'is-recommended' : ''} key={option.id}>
            <div><span className="report-page__rank">{option.rank ?? '–'}</span><StatusBadge>{option.suitability}</StatusBadge></div>
            <h3>{option.target}</h3>
            <p>{option.reason}</p>
            {option.limitation ? <p className="report-page__caveat">{option.limitation}</p> : null}
          </article>
        ))}
      </div>
      <div className="report-page__role-grid">
        {(data.roleStructure ?? []).map((item) => (
          <article key={item.role}>
            <div><h4>{item.role}</h4><StatusBadge>{item.status}</StatusBadge></div>
            <ChipList items={item.candidates} />
            <p>{item.question}</p>
          </article>
        ))}
      </div>
      {data.caution ? <p className="report-page__notice">{data.caution}</p> : null}
    </div>
  )
}

function FeasibilitySection({ report }: { report: ReportView }) {
  const data = report.productFeasibility
  return (
    <section className="report-page__section" aria-labelledby="feasibility-title">
      <SectionHeading
        number="05"
        eyebrow="PRODUCT FEASIBILITY"
        title="상품화 가능성 평가"
        aside={<StatusBadge>{data.overallStatus}</StatusBadge>}
      />
      <p className="report-page__section-intro" id="feasibility-title">점수 대신 판단 상태와 보완 과제를 중심으로 표시합니다.</p>
      <div className="report-page__overall-assessment">
        <div>
          <p className="report-page__eyebrow">AI OVERALL ASSESSMENT</p>
          <h3>AI 종합평가</h3>
          <p>{data.overallAssessment?.conclusion ?? data.interpretation}</p>
        </div>
        <dl>
          <div><dt>전체 결론</dt><dd>{data.overallStatus ?? '판단 보류'}</dd></div>
          <div><dt>강점</dt><dd>{data.overallAssessment?.strengths?.join(', ') || '추가 확인 필요'}</dd></div>
          <div><dt>보완점</dt><dd>{data.overallAssessment?.improvements?.join(', ') || '추가 확인 필요'}</dd></div>
          <div><dt>다음 단계 진입 조건</dt><dd>{data.overallAssessment?.entryConditions?.join(', ') || '추가 확인 필요'}</dd></div>
        </dl>
      </div>
      <div className="report-page__evaluation-list">
        {(data.items ?? []).map((item, index) => (
          <details key={item.id}>
            <summary>
              <span className="report-page__evaluation-index">{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.criterion}</strong>
              <StatusBadge>{item.displayStatus ?? item.status}</StatusBadge>
              <span className="report-page__evaluation-judgment">{item.judgment}</span>
              <span className="report-page__details-label">상세 보기</span>
            </summary>
            <div className="report-page__evaluation-detail">
              <div><h4>판단 근거</h4><p>{item.judgment}</p></div>
              <div><h4>사용 자료</h4><EvidenceReferences ids={item.evidenceIds} evidence={report.evidence} /></div>
              <div><h4>추가 확인사항</h4><ChipList items={item.additionalChecks} /></div>
            </div>
          </details>
        ))}
      </div>
      {data.interpretation ? <p className="report-page__interpretation">{data.interpretation}</p> : null}
    </section>
  )
}

function ProposalField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || '추가 확인 필요'}</dd>
    </div>
  )
}

function ProductProposalSection({ report }: { report: ReportView }) {
  const data = report.productProposal
  return (
    <section className="report-page__section" aria-labelledby="proposal-title">
      <SectionHeading
        number="06"
        eyebrow="PRODUCT PROPOSAL"
        title="AI 제안 상품 구조(검토 초안)"
        aside={<StatusBadge>{data.status}</StatusBadge>}
      />
      <p className="report-page__notice" id="proposal-title">
        이 영역은 최종 상품이 아니라 약관·법무·계리 검토 전의 상품 뼈대입니다. 보험료·요율·보상한도·자기부담금은 확정하지 않습니다.
      </p>
      <div className="report-page__proposal-hero">
        <div>
          <p className="report-page__eyebrow">WORKING TITLE</p>
          <h3>{data.workingName ?? '가칭 상품명 추가 확인 필요'}</h3>
        </div>
        <p>{data.recommendedForm}</p>
      </div>

      <TargetSuitabilityContent report={report} />

      <dl className="report-page__proposal-grid">
        <ProposalField label="예상 피보험자" value={data.expectedInsured} />
        <ProposalField label="보험의 목적·보장 대상" value={data.coveredObject} />
        <ProposalField label="보장 사고" value={data.coveredEvent} />
        <ProposalField label="보장 손해" value={data.coveredLoss} />
        <ProposalField label="기존 보험과의 관계" value={data.existingInsuranceRelationship} />
        <ProposalField label="보상·정산 방향" value={data.settlementDirection} />
        <ProposalField label="보험기간 방향" value={data.policyPeriodDirection} />
        <ProposalField label="보상한도 검토 방향" value={data.coverageLimitDirection} />
        <ProposalField label="자기부담금 검토 방향" value={data.deductibleDirection} />
        <ProposalField label="추천 이유" value={data.recommendationReason} />
      </dl>

      <div className="report-page__three-column">
        <div className="report-page__subsection">
          <h3>예상 보험계약자</h3>
          <ChipList items={data.expectedPolicyholder} />
        </div>
        <div className="report-page__subsection">
          <h3>인수조건 후보</h3>
          <ChipList items={data.underwritingCandidates} />
        </div>
        <div className="report-page__subsection">
          <h3>초기 제외·별도 담보 후보</h3>
          <ChipList items={data.outOfScopeCandidates} />
        </div>
      </div>
      {data.unresolvedItems?.length ? (
        <div className="report-page__notice">
          <strong>구조 확정 전 추가 검토</strong>
          <ChipList items={data.unresolvedItems} />
        </div>
      ) : null}
    </section>
  )
}

function WordingSection({
  report,
  onOpenDocument,
  onOpenPolicyDraft,
}: {
  report: ReportView
  onOpenDocument: (document: NonNullable<ReportView['wordingFeasibility']['referenceDocuments']>[number]) => void
  onOpenPolicyDraft: () => void
}) {
  const data = report.wordingFeasibility
  const [copyMessage, setCopyMessage] = useState('')
  const primaryDefinitions = (data.definitions ?? []).slice(0, 4)
  const additionalDefinitions = (data.definitions ?? []).slice(4)

  const copyDraft = async () => {
    if (!data.coverageDraft) return
    try {
      await navigator.clipboard.writeText(data.coverageDraft)
      setCopyMessage('검토용 문구를 복사했습니다.')
    } catch {
      setCopyMessage('브라우저에서 복사 권한을 허용해 주세요.')
    }
  }

  return (
    <section className="report-page__section" aria-labelledby="wording-title">
      <SectionHeading
        number="07"
        eyebrow="WORDING FEASIBILITY"
        title={data.label ?? '약관화 가능성 및 검토용 문구 제안'}
        aside={<StatusBadge>{data.status}</StatusBadge>}
      />
      <p className="report-page__notice" id="wording-title">
        {data.disclaimer ?? 'AI가 생성한 검토용 초안이며 전문가 검토가 필요합니다.'}
      </p>

      <div className="report-page__two-column">
        <div className="report-page__subsection report-page__subsection--success">
          <h3>약관화 가능 사유</h3>
          <ul className="report-page__compact-list">
            {(data.possibleReasons ?? []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="report-page__subsection report-page__subsection--warning">
          <h3>보완 필요 사유</h3>
          <ul className="report-page__compact-list">
            {(data.improvementReasons ?? []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>

      <div className="report-page__subsection">
        <h3>약관화 판단 기준</h3>
        <div className="report-page__criteria-grid">
          {(data.assessmentCriteria ?? []).map((item) => (
            <article key={item.id}>
              <div><code>{item.id}</code><StatusBadge>{item.status}</StatusBadge></div>
              <h4>{item.question}</h4>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="report-page__subsection">
        <h3>추천 구조 검토안</h3>
        <div className="report-page__structure-grid">
          {(data.structureOptions ?? []).map((item) => (
            <article className={item.selected ? 'is-selected' : ''} key={item.id}>
              <div>
                <h4>{item.name}</h4>
                {item.selected ? <span className="report-page__badge report-page__badge--success">우선 제안</span> : null}
              </div>
              <p>{item.description}</p>
              <dl>
                <div><dt>강점</dt><dd>{item.strength}</dd></div>
                <div><dt>한계</dt><dd>{item.limitation}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </div>

      <div className="report-page__wording-draft">
        <div className="report-page__wording-draft-heading">
          <div>
            <p className="report-page__eyebrow">AI GENERATED DRAFT</p>
            <h3>추천 보장 문구 초안</h3>
            <StatusBadge>{data.selectedDraftType}</StatusBadge>
          </div>
          <div className="report-page__draft-actions report-page__no-print">
            <button className="report-page__button" type="button" onClick={copyDraft}>문구 복사</button>
            <button className="report-page__button report-page__button--primary" type="button" onClick={onOpenPolicyDraft}>약관 초안 작성</button>
          </div>
        </div>
        <blockquote>{data.coverageDraft ?? '검토용 문구를 추가 확인해야 합니다.'}</blockquote>
        {copyMessage ? <p className="report-page__copy-message" role="status">{copyMessage}</p> : null}
      </div>

      <div className="report-page__subsection report-page__definitions">
        <h3>약관에서 명확히 정의해야 할 핵심 용어</h3>
        <div className="report-page__definition-grid">
          {primaryDefinitions.map((item) => (
            <article key={item.term}>
              <div><h4>{item.term}</h4><StatusBadge>{item.status}</StatusBadge></div>
              <p>{item.draftDefinition}</p>
            </article>
          ))}
        </div>
        {additionalDefinitions.length ? (
          <details className="report-page__long-details">
            <summary>추가 정의 후보 <span>{additionalDefinitions.length}개</span></summary>
            <div className="report-page__definition-grid">
              {additionalDefinitions.map((item) => (
                <article key={item.term}>
                  <div><h4>{item.term}</h4><StatusBadge>{item.status}</StatusBadge></div>
                  <p>{item.draftDefinition}</p>
                </article>
              ))}
            </div>
          </details>
        ) : null}
      </div>

      <details className="report-page__long-details">
        <summary>보험금 지급조건 초안 <span>{data.paymentConditions?.length ?? 0}개</span></summary>
        <div className="report-page__condition-list">
          {(data.paymentConditions ?? []).map((item) => (
            <article key={item.id}>
              <code>{item.id}</code><div><h4>{item.text}</h4><p>확인 방법 · {item.verification}</p></div>
            </article>
          ))}
        </div>
      </details>

      <details className="report-page__long-details">
        <summary>면책사항 검토 후보 <span>{data.exclusionCandidates?.length ?? 0}개</span></summary>
        <div className="report-page__condition-list">
          {(data.exclusionCandidates ?? []).map((item) => (
            <article key={item.id}>
              <code>{item.id}</code><div><h4>{item.text}</h4><p>{item.reason}</p><StatusBadge>{item.status}</StatusBadge></div>
            </article>
          ))}
        </div>
      </details>

      <details className="report-page__long-details" open>
        <summary>모호성 및 추가 검토 <span>{data.ambiguities?.length ?? 0}개</span></summary>
        <div className="report-page__ambiguity-list">
          {(data.ambiguities ?? []).map((item) => (
            <article key={item.id}>
              <span>{item.id}</span><div><h4>{item.issue}</h4><p>{item.question}</p></div><small>{item.owner}</small>
            </article>
          ))}
        </div>
      </details>

      <div className="report-page__subsection">
        <h3>참고 약관 및 사후 검증자료</h3>
        <div className="report-page__document-list">
          {(data.referenceDocuments ?? []).map((document) => (
            <article key={document.id}>
              <div>
                <code>{document.id}</code>
                <span className={`report-page__badge ${document.includedInAiInput ? 'report-page__badge--neutral' : 'report-page__badge--warning'}`}>
                  {document.includedInAiInput ? 'AI 분석 참고자료' : 'AI 입력 제외 · 사후 검증'}
                </span>
              </div>
              <h4>{document.name}</h4>
              <p>{document.usedFor}</p>
              <button className="report-page__text-button report-page__no-print" type="button" onClick={() => onOpenDocument(document)}>
                자료 정보 보기 →
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function EvidenceResearchSection({
  report,
  onOpenEvidence,
}: {
  report: ReportView
  onOpenEvidence: (evidence: EvidenceItem) => void
}) {
  const acquisitionGroups = [
    'AI·공공 API로 확보 가능',
    '사내자료 필요',
    '전문가 판단 필요',
  ] as const
  return (
    <section className="report-page__section" aria-labelledby="evidence-title">
      <SectionHeading
        number="08"
        eyebrow="EVIDENCE & RESEARCH"
        title="근거자료와 추가 확보 자료"
        aside={<span className="report-page__count">근거 {report.evidence.length}건</span>}
      />
      <div className="report-page__evidence-grid" id="evidence-title">
        {report.evidence.map((item) => (
          <article key={item.id}>
            <div className="report-page__card-top">
              <code>{item.id}</code>
              <span className={`report-page__badge ${item.isMockData ? 'report-page__badge--warning' : 'report-page__badge--success'}`}>
                {item.isMockData ? '프로토타입용 가상자료' : '실제 참고자료'}
              </span>
            </div>
            <small>{item.type}</small>
            <h3>{item.title}</h3>
            <p>{item.source}</p>
            <ChipList items={item.usedFor} />
            <button className="report-page__text-button report-page__no-print" type="button" onClick={() => onOpenEvidence(item)}>
              출처 상세 보기 →
            </button>
          </article>
        ))}
      </div>

      <div className="report-page__subsection report-page__research">
        <h3>추가 확보가 필요한 자료와 검토 담당</h3>
        <div className="report-page__research-groups">
          {acquisitionGroups.map((group) => {
            const items = report.missingResearch.filter((item) => item.acquisitionType === group)
            if (!items.length) return null
            return (
              <section key={group} className="report-page__research-group">
                <h4>{group}</h4>
                <div className="report-page__research-list">
                  {items.map((item) => (
                    <article key={item.id}>
                      <div><code>{item.id}</code><StatusBadge>{item.priority}</StatusBadge></div>
                      <h4>{item.topic}</h4>
                      <p>{item.reason}</p>
                      {item.requiredMaterials?.length ? (
                        <p className="report-page__research-materials"><strong>필요 자료</strong>{item.requiredMaterials.join(', ')}</p>
                      ) : null}
                      <footer><span>담당 분야 · {item.responsibleTeam}</span><StatusBadge>{item.status}</StatusBadge></footer>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ComparisonModal({ report }: { report: ReportView }) {
  const comparison = report.validationComparison
  if (!comparison) return null
  return (
    <>
      <p className="report-page__notice">{comparison.notice}</p>
      <div className="report-page__comparison-grid">
        <section>
          <h3>공통 방향</h3>
          {(comparison.similarities ?? []).map((item) => (
            <article key={item.topic}>
              <h4>{item.topic}</h4>
              <p><strong>AI 검토</strong>{item.aiResult}</p>
              <p><strong>검증 포인트</strong>{item.validationPoint}</p>
            </article>
          ))}
        </section>
        <section>
          <h3>차이·추가 확인</h3>
          {(comparison.differences ?? []).map((item) => (
            <article key={item.topic}>
              <h4>{item.topic}</h4>
              <p><strong>AI 검토</strong>{item.aiResult}</p>
              <p><strong>실제 상품 검토</strong>{item.actualProductReview}</p>
            </article>
          ))}
        </section>
      </div>
      {comparison.interpretation ? (
        <p className="report-page__interpretation">{comparison.interpretation}</p>
      ) : null}
    </>
  )
}

function createAiReviewRecommendations(report: ReportView): AiReviewRecommendation[] {
  return (report.productFeasibility.items ?? [])
    .filter((item) => /조건부|보완 필요|근거 부족/.test(item.displayStatus ?? item.status))
    .flatMap((item) => {
      const checks = item.additionalChecks?.length
        ? item.additionalChecks
        : [item.judgment ?? '추가 확인 필요']
      return checks.map((check, index) => ({
        id: `${item.id}-${index + 1}`,
        criterion: item.criterion,
        check,
        evidenceIds: item.evidenceIds ?? [],
      }))
    })
}

type ExecutiveBriefingAction = {
  id: string
  task: string
  owner: string
  status: string
}

type ExecutiveBriefing = {
  conclusion: string
  conditions: string[]
  findings: string[]
  risks: string[]
  decisions: string[]
  actions: ExecutiveBriefingAction[]
  finalOpinion: string
}

function uniqueBriefingItems(items: Array<string | undefined>, limit = 5) {
  const seen = new Set<string>()
  return items
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item))
    .filter((item) => {
      const key = item.replace(/\s+/g, '').slice(0, 80)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
}

function createExecutiveBriefing(report: ReportView): ExecutiveBriefing {
  const feasibility = report.productFeasibility
  const proposal = report.productProposal
  const wording = report.wordingFeasibility
  const coverage = report.riskGapSummary
  const gapCount = Math.max(coverage.existingCoverageMap?.length ?? 0, coverage.keyCoverageGaps?.length ?? 0)
  const statusText = `${feasibility.overallStatus ?? ''} ${report.aiSummary.decisionLabel ?? ''}`
  const conclusion = /불가|보류|중단|어려움|부정|제외/i.test(statusText)
    ? '상품화 검토 보류 필요'
    : /조건|확인|보완|needs|review/i.test(statusText)
      ? '조건부 상품화 검토'
      : '상품화 검토 진행 가능'

  const conditions = uniqueBriefingItems([
    ...(feasibility.overallAssessment?.entryConditions ?? []),
    ...(proposal.unresolvedItems ?? []),
    ...report.missingResearch.slice(0, 2).map((item) => `${item.topic} 자료 확보`),
  ], 4)

  const findings = uniqueBriefingItems([
    gapCount
      ? `현재 보험으로 남는 보장 공백 ${gapCount}건 확인`
      : '현재 보험과의 보장 관계를 검토할 자료가 정리됨',
    report.targetSuitability.options?.length
      ? '보험 대상과 계약 구조 후보가 정리됨'
      : report.targetSuitability.recommendationLabel,
    feasibility.items?.length ? `상품화 가능성 평가항목 ${feasibility.items.length}건 검토` : feasibility.interpretation,
    proposal.recommendedForm ? `검토용 상품 구조 방향이 제안됨: ${proposal.recommendedForm}` : proposal.workingName,
    report.evidence.length ? `근거자료 ${report.evidence.length}건이 리포트 판단에 연결됨` : undefined,
  ], 4)

  const risks = uniqueBriefingItems([
    ...(coverage.keyCoverageGaps ?? []).map((item) => item.title || item.description),
    ...(coverage.existingCoverageMap ?? []).map((item) => item.remainingGap),
    ...(feasibility.overallAssessment?.improvements ?? []),
    ...(wording.ambiguities ?? []).map((item) => item.issue),
    ...report.missingResearch.slice(0, 3).map((item) => `${item.topic} 데이터 부족`),
  ], 5)

  const decisions = uniqueBriefingItems([
    ...conditions,
    ...(wording.ambiguities ?? []).slice(0, 2).map((item) => `약관 표현 결정: ${item.issue}`),
    ...report.missingResearch.slice(0, 2).map((item) => `자료 확보 담당 지정: ${item.topic}`),
  ], 4)

  const aiTasks = createNextReviewTasks(report.aiSummary)
  const actionCandidates: ExecutiveBriefingAction[] = [
    ...report.missingResearch.map((item) => ({
      id: `research-${item.id}`,
      task: item.topic,
      owner: item.responsibleTeam || '담당자 결정 필요',
      status: item.status || '진행 필요',
    })),
    ...aiTasks.map((item) => ({
      id: `review-${item.id}`,
      task: item.action,
      owner: item.responsibleTeams.join(', ') || '담당자 결정 필요',
      status: item.priority === '높음' ? '우선 진행' : '진행 필요',
    })),
  ]
  const seenActions = new Set<string>()
  const actions = actionCandidates
    .filter((item) => {
      const key = item.task.replace(/\s+/g, '').slice(0, 60)
      if (!key || seenActions.has(key)) return false
      seenActions.add(key)
      return true
    })
    .slice(0, 4)

  const finalOpinion = conditions.length
    ? `현재 단계에서는 ${conclusion}을 권고합니다. ${conditions.slice(0, 2).join(' · ')}를 확인한 뒤 다음 회의에서 진입 여부를 결정해야 합니다.`
    : `현재 단계에서는 ${conclusion}을 권고합니다. 주요 리스크와 후속 과제를 확인한 뒤 다음 의사결정으로 연결합니다.`

  return {
    conclusion,
    conditions,
    findings: findings.length ? findings : ['리포트 전체 영역의 추가 종합 확인이 필요함'],
    risks: risks.length ? risks : ['현재 단계에서 확인된 주요 리스크가 없어 추가 검토가 필요함'],
    decisions: decisions.length ? decisions : ['다음 검토 단계와 담당 분야를 회의에서 확정'],
    actions: actions.length
      ? actions
      : [{ id: 'briefing-next-step', task: '다음 검토 과제와 담당자 확정', owner: '상품화 협의체', status: '진행 필요' }],
    finalOpinion,
  }
}

function ExecutiveBriefingSection({
  report,
  includeFinalOpinion = true,
}: {
  report: ReportView
  includeFinalOpinion?: boolean
}) {
  const briefing = createExecutiveBriefing(report)
  return (
    <section className="report-page__section report-page__briefing" aria-label="종합 브리핑">
      <SectionHeading number="BR" eyebrow="EXECUTIVE BRIEFING" title="종합 브리핑" aside={<StatusBadge>{briefing.conclusion}</StatusBadge>} />

      <div className="report-page__briefing-hero">
        <div>
          <p className="report-page__eyebrow">MEETING CONCLUSION</p>
          <h3>{briefing.conclusion}</h3>
          <p>AI 판단을 반복하지 않고, 회의에서 확인하고 결정해야 할 사항을 중심으로 정리한 종합 브리핑입니다.</p>
        </div>
        {briefing.conditions.length ? (
          <div className="report-page__briefing-conditions">
            <strong>진입 전 조건</strong>
            <ul>
              {briefing.conditions.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="report-page__briefing-grid">
        <div className="report-page__briefing-block">
          <h3>이번 검토에서 확인된 사항</h3>
          <ul className="report-page__briefing-list report-page__briefing-list--confirmed">
            {briefing.findings.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="report-page__briefing-block report-page__briefing-block--risk">
          <h3>주요 리스크</h3>
          <ul className="report-page__briefing-list report-page__briefing-list--risk">
            {briefing.risks.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>

      <div className="report-page__briefing-block report-page__briefing-block--decision">
        <div className="report-page__card-top">
          <h3>회의 결정 필요 사항</h3>
          <StatusBadge>결정 필요</StatusBadge>
        </div>
        <ul className="report-page__briefing-list">
          {briefing.decisions.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>

      <div className="report-page__briefing-actions">
        <h3>다음 액션</h3>
        <div className="report-page__table-wrap">
          <table>
            <thead><tr><th>과제</th><th>담당</th><th>상태</th></tr></thead>
            <tbody>
              {briefing.actions.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.task}</strong></td>
                  <td>{item.owner}</td>
                  <td><StatusBadge>{item.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {includeFinalOpinion ? (
        <div className="report-page__briefing-final">
          <p className="report-page__eyebrow">FINAL VIEW</p>
          <h3>최종 의견</h3>
          <p>{briefing.finalOpinion}</p>
        </div>
      ) : null}
    </section>
  )
}

const REPORT_TABS = [
  { id: 'ai-judgment', label: 'AI 판단', panelId: 'report-panel-ai-judgment' },
  { id: 'coverage-gap', label: '보장 공백', panelId: 'report-panel-coverage-gap' },
  { id: 'feasibility', label: '상품화 평가', panelId: 'report-panel-feasibility' },
  { id: 'proposal', label: '상품 구조', panelId: 'report-panel-proposal' },
  { id: 'wording', label: '약관 검토', panelId: 'report-panel-wording' },
  { id: 'evidence', label: '근거자료', panelId: 'report-panel-evidence' },
  { id: 'briefing', label: '종합 브리핑', panelId: 'report-panel-briefing' },
  { id: 'reviewer', label: '실무자 메모', panelId: 'report-panel-reviewer' },
] as const

type ReportTabId = (typeof REPORT_TABS)[number]['id']

type PdfPrintOptions = {
  includeCover: boolean
  includePageNumbers: boolean
  includeGeneratedAt: boolean
  includeMeetingMemo: boolean
  includeFinalOpinion: boolean
  includeAiOriginal: boolean
  includeUserRevisions: boolean
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
  includeMeetingMemo: true,
  includeFinalOpinion: true,
  includeAiOriginal: true,
  includeUserRevisions: true,
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

function ReportPdfReviewerSection({
  report,
  includeMeetingMemo,
  includeUserRevisions,
}: {
  report: ReportView
  includeMeetingMemo: boolean
  includeUserRevisions: boolean
}) {
  const reviewer = report.reviewer
  return (
    <section className="report-page__section report-page__reviewer report-page__pdf-reviewer" aria-label="실무자 메모">
      <SectionHeading number="09" eyebrow="HUMAN REVIEW" title="실무자 메모" />
      {includeUserRevisions ? (
        <div className="report-page__pdf-reviewer-data">
          <div><strong>검토 상태</strong><span>{reviewer?.status ?? '미검토'}</span></div>
          <div><strong>완료한 체크리스트</strong><span>{reviewer?.checklist?.filter((item) => item.checked).map((item) => item.label).join(', ') || '없음'}</span></div>
        </div>
      ) : null}
      {includeMeetingMemo ? (
        <div className="report-page__pdf-meeting-memo">
          <h3>회의 메모</h3>
          <p>{reviewer?.memo || '기록된 회의 메모가 없습니다.'}</p>
        </div>
      ) : null}
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
  ).filter((id) =>
    id !== 'reviewer' || options.includeMeetingMemo || options.includeUserRevisions,
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
          <div className="report-page__pdf-section" data-pdf-section="coverage-gap"><RiskGapSection report={report} /></div>
        ) : null}
        {includes('feasibility') ? (
          <div className="report-page__pdf-section" data-pdf-section="feasibility"><FeasibilitySection report={report} /></div>
        ) : null}
        {includes('proposal') ? (
          <div className="report-page__pdf-section" data-pdf-section="proposal"><ProductProposalSection report={report} /></div>
        ) : null}
        {includes('wording') ? (
          <div className="report-page__pdf-section" data-pdf-section="wording">
            <WordingSection report={report} onOpenDocument={() => undefined} onOpenPolicyDraft={() => undefined} />
          </div>
        ) : null}
        {includes('evidence') ? (
          <div className="report-page__pdf-section" data-pdf-section="evidence">
            <EvidenceResearchSection report={report} onOpenEvidence={() => undefined} />
          </div>
        ) : null}
        {includes('briefing') ? (
          <div className="report-page__pdf-section" data-pdf-section="briefing">
            <ExecutiveBriefingSection report={report} includeFinalOpinion={options.includeFinalOpinion} />
          </div>
        ) : null}
        {includes('reviewer') && (options.includeMeetingMemo || options.includeUserRevisions) ? (
          <div className="report-page__pdf-section" data-pdf-section="reviewer">
            <ReportPdfReviewerSection
              report={report}
              includeMeetingMemo={options.includeMeetingMemo}
              includeUserRevisions={options.includeUserRevisions}
            />
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
    ['includeMeetingMemo', '회의 메모 포함'],
    ['includeFinalOpinion', '최종 의견 포함'],
    ['includeAiOriginal', 'AI 원본 포함'],
    ['includeUserRevisions', '사용자 수정본 포함'],
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
  reviewerStorage,
  now,
  riskData,
  reportProxy,
}: {
  report: ReportResult
  reviewerStorage: ReviewerStorage
  now: () => Date
  riskData: RiskSourceData
  reportProxy: ReportProxy
}) {
  const report = useMemo(() => asReportView(sourceReport), [sourceReport])
  const aiReviewRecommendations = useMemo(() => createAiReviewRecommendations(report), [report])
  const [modal, setModal] = useState<ModalState>(null)
  const [policyDraftOpen, setPolicyDraftOpen] = useState(false)
  const [questionPanelOpen, setQuestionPanelOpen] = useState(false)
  const [memoAppend, setMemoAppend] = useState<{ id: number; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<ReportTabId>(getTabFromHash)
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false)
  const [pdfSelectionOpen, setPdfSelectionOpen] = useState(false)
  const [pdfSelectionSections, setPdfSelectionSections] = useState<ReportTabId[]>(() => REPORT_TABS.map((tab) => tab.id))
  const [pdfOptions, setPdfOptions] = useState<PdfPrintOptions>(() => ({ ...DEFAULT_PDF_OPTIONS }))
  const [pdfRequest, setPdfRequest] = useState<PdfPrintRequest>(createDefaultPdfRequest)
  const previousDocumentTitle = useRef<string | null>(null)

  const scrollToTabContent = (id: ReportTabId, behavior: ScrollBehavior) => {
    window.requestAnimationFrame(() => {
      document
        .getElementById(`report-panel-${id}`)
        ?.querySelector<HTMLElement>('.report-page__section-heading')
        ?.scrollIntoView({ behavior, block: 'start' })
    })
  }

  useEffect(() => {
    const syncTabFromHash = () => {
      const nextTab = getTabFromHash()
      setActiveTab(nextTab)
      scrollToTabContent(nextTab, 'auto')
    }
    window.addEventListener('hashchange', syncTabFromHash)
    window.addEventListener('popstate', syncTabFromHash)
    return () => {
      window.removeEventListener('hashchange', syncTabFromHash)
      window.removeEventListener('popstate', syncTabFromHash)
    }
  }, [])

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
    setActiveTab(id)
    const nextHash = `#report-tab=${id}`
    if (window.location.hash !== nextHash) {
      window.history.pushState({ reportTab: id }, '', nextHash)
    }
    window.requestAnimationFrame(() => {
      const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      document.getElementById(`report-tab-${id}`)?.scrollIntoView({ behavior, block: 'nearest', inline: 'center' })
      scrollToTabContent(id, behavior)
    })
  }

  return (
    <>
      <div className="report-page__screen-content">
      <ReportHeader
        report={report}
        onCompare={() => setModal({ type: 'comparison' })}
        activeTab={activeTab}
        pdfMenuOpen={pdfMenuOpen}
        onTogglePdfMenu={() => setPdfMenuOpen((open) => !open)}
        onPrintAll={printAll}
        onPrintCurrent={printCurrent}
        onOpenPdfSelection={openPdfSelection}
      />
      <ReportTabs activeTab={activeTab} onChange={handleTabChange} />
      <div className="report-page__tab-panels">
        <ReportTabPanel id="report-panel-ai-judgment" tabId="ai-judgment" index={0} active={activeTab === 'ai-judgment'} onChange={handleTabChange}>
          <AiSummarySection report={report} />
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-coverage-gap" tabId="coverage-gap" index={1} active={activeTab === 'coverage-gap'} onChange={handleTabChange}>
          <RiskGapSection report={report} />
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-feasibility" tabId="feasibility" index={2} active={activeTab === 'feasibility'} onChange={handleTabChange}>
          <FeasibilitySection report={report} />
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-proposal" tabId="proposal" index={3} active={activeTab === 'proposal'} onChange={handleTabChange}>
          <ProductProposalSection report={report} />
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-wording" tabId="wording" index={4} active={activeTab === 'wording'} onChange={handleTabChange}>
          <WordingSection
            report={report}
            onOpenDocument={(document) => setModal({ type: 'document', document })}
            onOpenPolicyDraft={() => setPolicyDraftOpen(true)}
          />
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-evidence" tabId="evidence" index={5} active={activeTab === 'evidence'} onChange={handleTabChange}>
          <EvidenceResearchSection
            report={report}
            onOpenEvidence={(evidence) => setModal({ type: 'evidence', evidence })}
          />
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-briefing" tabId="briefing" index={6} active={activeTab === 'briefing'} onChange={handleTabChange}>
          <ExecutiveBriefingSection report={report} />
        </ReportTabPanel>
        <ReportTabPanel id="report-panel-reviewer" tabId="reviewer" index={7} active={activeTab === 'reviewer'} onChange={handleTabChange}>
          <ReviewerPanel
            reviewer={report.reviewer}
            reportId={report.meta.reportId ?? report.meta.sourceRiskId}
            storage={reviewerStorage}
            now={now}
            aiRecommendations={aiReviewRecommendations}
            onAskQuestion={() => setQuestionPanelOpen(true)}
            memoAppend={memoAppend}
          />
        </ReportTabPanel>
      </div>
      </div>

      <ReportPdfDocument report={report} request={pdfRequest} />

      {policyDraftOpen ? (
        <PolicyDraftModal
          report={sourceReport}
          riskData={riskData}
          reportProxy={reportProxy}
          onClose={() => setPolicyDraftOpen(false)}
        />
      ) : null}

      {questionPanelOpen ? (
        <ReportQuestionPanel
          report={sourceReport}
          riskData={riskData}
          reportProxy={reportProxy}
          onClose={() => setQuestionPanelOpen(false)}
          onAddToMemo={(text) => {
            setMemoAppend({ id: Date.now(), text })
            setQuestionPanelOpen(false)
          }}
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

      {modal?.type === 'comparison' ? (
        <ReportModal
          eyebrow="POST ANALYSIS VALIDATION"
          title={report.validationComparison?.title ?? '실제 상품과 비교'}
          onClose={() => setModal(null)}
        >
          <ComparisonModal report={report} />
        </ReportModal>
      ) : null}

      {modal?.type === 'evidence' ? (
        <ReportModal
          eyebrow={modal.evidence.type}
          title={modal.evidence.title}
          onClose={() => setModal(null)}
        >
          <dl className="report-page__modal-data">
            <div><dt>근거 ID</dt><dd>{modal.evidence.id}</dd></div>
            <div><dt>출처</dt><dd>{modal.evidence.source}</dd></div>
            <div><dt>기준일</dt><dd>{displayDate(modal.evidence.referenceDate)}</dd></div>
            <div><dt>신뢰도</dt><dd>{modal.evidence.reliability ?? '추가 확인 필요'}</dd></div>
            <div><dt>활용 판단</dt><dd>{modal.evidence.usedFor?.join(', ') || '추가 확인 필요'}</dd></div>
          </dl>
          <p className="report-page__notice">
            {modal.evidence.isMockData
              ? '이 자료는 프로토타입용 가상자료이며 실제 출처 링크를 제공하지 않습니다.'
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
            {modal.document.badge ?? '현재 프로토타입에는 원문 URL을 임의로 연결하지 않습니다.'}
          </p>
        </ReportModal>
      ) : null}
    </>
  )
}

