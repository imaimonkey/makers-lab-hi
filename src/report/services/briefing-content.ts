import type {
  BriefingContent,
  BriefingCoreCard,
  BriefingRiskItem,
  CommercializationCriterion,
  ReportResult,
} from '../types'

const asText = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const firstValue = (values: Array<string | undefined>, fallback: string) =>
  values.find((value) => typeof value === 'string' && value.trim())?.trim() ?? fallback

const formatDate = (value?: string | null) => {
  if (!value) return '확인 필요'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.replaceAll('-', '.')
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

const countStatus = (criteria: CommercializationCriterion[], status: CommercializationCriterion['status']) =>
  criteria.filter((criterion) => criterion.status === status).length

const createDefaults = (report: ReportResult): BriefingContent => {
  const actualArticle = report.meta.dataStatus?.startsWith('ACTUAL ARTICLE') === true
  const unknown = actualArticle ? '확인 필요' : ''
  const feasibility = report.productFeasibility
  const assessment = feasibility.assessment
  const criteria = assessment?.criteria ?? []
  const mandatory = criteria.filter((criterion) => criterion.gateGroup === 'insurance_gate')
  const mandatoryPass = countStatus(mandatory, 'pass')
  const passCount = countStatus(criteria, 'pass')
  const needsReviewCount = countStatus(criteria, 'needs_review')
  const additionalCheckCount = countStatus(criteria, 'additional_check')
  const criticalCount = countStatus(criteria, 'critical')
  const totalCriteria = criteria.length || 12
  const coverage = report.riskGapSummary as Record<string, unknown>
  const coverageRows = Array.isArray(coverage.existingCoverageMap)
    ? coverage.existingCoverageMap.filter((item) => typeof item === 'object' && item !== null) as Array<Record<string, unknown>>
    : []
  const keyGaps = Array.isArray(coverage.keyCoverageGaps)
    ? coverage.keyCoverageGaps.filter((item) => typeof item === 'object' && item !== null) as Array<Record<string, unknown>>
    : []
  const gapCount = Math.max(coverageRows.length, keyGaps.length)
  const wording = report.wordingFeasibility
  const ambiguities = (wording.ambiguities ?? []).filter((item) => typeof item === 'object' && item !== null) as Array<Record<string, unknown>>
  const pmlCriterion = criteria.find((criterion) => /PML|최대 가능 손해|누적 위험/.test(`${criterion.title} ${criterion.question}`))
  const pmlMissing = firstValue(pmlCriterion?.missingInformation ?? [], actualArticle ? unknown : '차량 집적도와 평균·최대 손해액 자료 확인 필요')
  const proposalForm = firstValue([report.productProposal.recommendedForm, report.productProposal.workingName], actualArticle ? unknown : '기업·기관 단체계약 기반 보완형 구조')
  const demandResearch = report.missingResearch.find((item) => /수요|계약|시장/.test(item.topic))
  const aiJudgment = assessment?.aiProductJudgment

  const coreCards: BriefingCoreCard[] = [
    {
      id: 'coverage',
      title: '기존 보험의 보장 공백',
      status: gapCount ? '공백 확인' : '자료 정리됨',
      lines: [
        actualArticle
          ? firstValue(coverageRows.map((item) => asText(item.remainingGap, '')), unknown)
          : (gapCount ? '기존 자동차보험·화재보험 적용 후에도 책임 확정 전 보상 지연과 보상한도 공백이 남을 수 있음' : '기존 보험의 보상 범위와 보상 후 남는 공백을 확인함'),
        actualArticle ? firstValue(keyGaps.map((item) => asText(item.description ?? item.title, '')), unknown) : '보험별 우선 보상 순서와 구상관계 확인이 필요함',
      ],
    },
    {
      id: 'feasibility',
      title: '상품화 가능성',
      status: aiJudgment === 'review_worthy' ? '검토 후보' : '추가 확인',
      lines: [
        actualArticle ? firstValue([feasibility.overallAssessment?.conclusion], unknown) : '보험성 필수 요건을 충족하여 상품화 후보로 검토할 수 있음',
        firstValue(feasibility.overallAssessment?.improvements ?? [], actualArticle ? unknown : '책임주체와 보험금 지급 요건 등 일부 실무 기준의 구체화가 필요함'),
      ],
    },
    {
      id: 'proposal',
      title: '추천 상품 구조',
      status: report.productProposal.recommendedForm ? '우선 제안' : '작성 필요',
      lines: actualArticle
        ? [`${proposalForm}`, firstValue([report.productProposal.coveredLoss, report.productProposal.existingInsuranceRelationship], unknown)]
        : ['기업·기관 단체계약 또는 정책연계형 보완보험 구조를 우선 제안함', '기존 보험에서 보상한 금액을 제외한 잔여 손해를 보완하는 방식임'],
    },
    {
      id: 'wording',
      title: '약관화 가능성',
      status: wording.coverageDraft ? '표현 가능' : '추가 검토',
      lines: actualArticle
        ? [firstValue([wording.coverageDraft], unknown), firstValue(ambiguities.map((item) => asText(item.issue, '')), unknown)]
        : ['보장사고와 직접 재산손해는 약관 문장으로 표현 가능함', '원인 미상 화재와 기존 보험 적용 순서는 실무 결정이 필요함'],
    },
  ]

  const risks: BriefingRiskItem[] = [
    {
      title: '손해 규모·PML',
      risk: pmlMissing,
      check: actualArticle ? unknown : '사고 빈도, 최대 동시 피해 차량 수, 건물·시설 손해 자료 확인 필요',
      badge: actualArticle ? unknown : 'PML 1차 추정: 자료 부족으로 미산출',
    },
    {
      title: '기존 보험과의 관계',
      risk: firstValue(coverageRows.map((item) => asText(item.remainingGap, '')), actualArticle ? unknown : '보상 순서와 중복보상·구상관계가 확정되지 않음'),
      check: actualArticle ? unknown : '기존 보험의 실제 보상 사례와 약관 검토 필요',
    },
    {
      title: '사고 인정 기준',
      risk: firstValue(ambiguities.map((item) => asText(item.issue, '')), actualArticle ? unknown : '원인 미상 화재의 보험사고 인정 기준이 필요함'),
      check: actualArticle ? unknown : '화재조사 및 손해사정 사례 확인 필요',
    },
    {
      title: '시장·계약 수요',
      risk: demandResearch?.reason || (actualArticle ? unknown : '잠재 계약자와 보험료 수용도는 공개자료만으로 확정하기 어려움'),
      check: actualArticle ? unknown : '실제 영업 수요와 계약 의향 확인 필요',
    },
  ]

  return {
    eyebrow: 'EXECUTIVE BRIEFING',
    sectionTitles: {
      summary: '종합 검토 결과',
      core: '핵심 검토 결과',
      proposal: '추천 상품 구조 및 예상 보장 문구',
      discussion: '회의 논의 필요사항',
      risks: '주요 리스크 및 추가 확인사항',
      followUp: '후속 검토 과제',
      evidence: '근거자료 및 분석 한계',
      reviewer: '실무자 검토',
    },
    sectionBadges: {
      proposal: '검토 초안',
      discussion: '결정 필요',
      risks: '추가 확인',
    },
    conclusion: '검토 진행 권고',
    decisionStatus: '실무 결정 전',
    checks: actualArticle
      ? [
        firstValue(keyGaps.map((item) => asText(item.description ?? item.title, '')), unknown),
        firstValue(feasibility.overallAssessment?.improvements ?? [], unknown),
        firstValue(report.productProposal.unresolvedItems ?? [], unknown),
        firstValue(report.missingResearch.map((item) => item.reason), unknown),
      ]
      : [
        '기존 보험 적용 후에도 보장 공백이 확인됨',
        '보험성 필수 기준을 충족함',
        '상품 구조 구체화를 위한 후속 검토가 필요함',
        '손해 데이터와 기존 보험 보상 관계는 추가 확인이 필요함',
      ],
    counts: [
      { label: '필수 기준', value: `${mandatoryPass}/${mandatory.length || 3} 충족` },
      { label: '전체 기준', value: `${passCount}/${totalCriteria} 충족` },
      { label: '보완 필요', value: `${needsReviewCount}건` },
      { label: '추가 확인', value: `${additionalCheckCount}건` },
    ],
    coreCards,
    proposalChecks: [
      `계약 형태: ${firstValue(report.productProposal.expectedPolicyholder, actualArticle ? unknown : '기업·기관 단체계약')}`,
      `보장 대상: ${firstValue([report.productProposal.expectedInsured, report.productProposal.coveredObject], actualArticle ? unknown : '대상 명부에 등록된 전기자동차')}`,
      `보장 사고: ${firstValue([report.productProposal.coveredEvent], actualArticle ? unknown : '지하주차장 주차·충전 중 발생한 화재')}`,
      `보장 손해: ${firstValue([report.productProposal.coveredLoss], actualArticle ? unknown : '제3자의 차량·건물 등 직접 재산손해')}`,
      `보상 방식: ${firstValue([report.productProposal.existingInsuranceRelationship, report.productProposal.settlementDirection], actualArticle ? unknown : '기존 보험 적용 후 남은 손해 보완')}`,
    ],
    coverageDraft: firstValue([wording.coverageDraft], actualArticle ? unknown : '보장대상 전기자동차가 지하주차장에서 주차 또는 충전 중 발생시킨 화재로 제3자의 재물에 직접손해를 입힌 경우, 기존 보험의 보상 적용 후 남은 손해를 약정한 한도 내에서 보상합니다.'),
    proposalDisclaimer: 'AI가 작성한 회의 검토용 초안이며 최종 약관 문구가 아닙니다.',
    discussionItems: actualArticle
      ? (report.productProposal.unresolvedItems?.length
        ? report.productProposal.unresolvedItems
        : (report.missingResearch.length ? report.missingResearch.map((item) => item.topic) : [unknown]))
      : [
        '보험계약자·피보험자·보험료 부담 주체를 어떻게 구성할 것인가?',
        '원인 미상 화재를 어떤 자료와 기준으로 인정할 것인가?',
        '기존 자동차보험·화재보험 중 어떤 보상을 우선 적용할 것인가?',
        '제3자 재산손해 외에 차량 자체 손해와 소화비용도 포함할 것인가?',
        '사고당·연간 보상한도는 어느 수준으로 설정할 것인가?',
      ],
    risks,
    followUpTasks: actualArticle
      ? (report.missingResearch.length ? report.missingResearch.map((item) => item.topic) : [unknown])
      : [
        '기존 보험별 보상 적용 순서 확인',
        '원인 미상 화재 인정 기준 구체화',
        '사고 빈도와 평균·최대 손해액 자료 확보',
        '잠재 계약자와 실제 가입 수요 확인',
        '계약자·피보험자·보험료 부담 구조 검토',
        '사고당·연간 보상한도 검토',
      ],
    evidenceMeta: [
      { label: '분석 기준일', value: formatDate(report.meta.analysisBaseDate) },
      { label: '활용 근거자료', value: `${report.meta.evidenceCount ?? report.evidence.length}건` },
      { label: '주요 활용자료', value: actualArticle ? `${report.meta.title} · ${report.evidence[0]?.source ?? 'src/article'}` : '보험 약관·상품자료·사고 사례·법령·산업자료' },
      { label: '추가 확인', value: `${additionalCheckCount + criticalCount}건은 공개자료만으로 확정하기 어려움` },
      { label: '확정하지 않는 항목', value: '보험료·위험률·보상한도·최종 약관' },
    ],
    disclaimer: '본 브리핑은 AI 분석을 기반으로 생성된 회의용 검토 초안이며, 최종 상품화 여부와 세부 상품 조건은 실무 검토를 통해 결정해야 합니다.',
    reviewerStatus: '미검토',
    reviewerOpinion: '',
  }
}

export const createBriefingContent = (report: ReportResult): BriefingContent => {
  const defaults = createDefaults(report)
  const stored = report.ui?.briefing
  if (!stored) return defaults
  return {
    ...defaults,
    ...stored,
    sectionTitles: { ...defaults.sectionTitles, ...(stored.sectionTitles ?? {}) },
    sectionBadges: { ...defaults.sectionBadges, ...(stored.sectionBadges ?? {}) },
    counts: Array.isArray(stored.counts) ? stored.counts : defaults.counts,
    checks: Array.isArray(stored.checks) ? stored.checks : defaults.checks,
    coreCards: Array.isArray(stored.coreCards) ? stored.coreCards : defaults.coreCards,
    proposalChecks: Array.isArray(stored.proposalChecks) ? stored.proposalChecks : defaults.proposalChecks,
    discussionItems: Array.isArray(stored.discussionItems) ? stored.discussionItems : defaults.discussionItems,
    risks: Array.isArray(stored.risks) ? stored.risks : defaults.risks,
    followUpTasks: Array.isArray(stored.followUpTasks) ? stored.followUpTasks : defaults.followUpTasks,
    evidenceMeta: Array.isArray(stored.evidenceMeta) ? stored.evidenceMeta : defaults.evidenceMeta,
    reviewerStatus: stored.reviewerStatus ?? defaults.reviewerStatus,
    reviewerOpinion: stored.reviewerOpinion ?? defaults.reviewerOpinion,
  }
}
