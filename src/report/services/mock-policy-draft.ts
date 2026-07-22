import type { PolicyDraftResult, ReportResult } from '../types'

const lines = (items: unknown[]): string =>
  items
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') return item.text
      if (item && typeof item === 'object' && 'term' in item && 'draftDefinition' in item) {
        return `${String(item.term)}: ${String(item.draftDefinition)}`
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')

export const createMockPolicyDraft = (report: ReportResult): PolicyDraftResult => {
  const proposal = report.productProposal
  const wording = report.wordingFeasibility
  return {
    title: `${proposal.workingName || report.meta.riskTitle} 약관 초안`,
    disclaimer: '시연용 mock 초안입니다. AI 작성 검토용 문서이며 최종 약관·법률 검토·보험료·보상한도·자기부담금의 확정 내용이 아닙니다.',
    isMock: true,
    sections: [
      { id: 'subject', title: '보험의 목적과 보장 대상', content: proposal.coveredObject || '현재 리포트에서 보장 대상을 확정할 수 없어 담당자 결정 필요입니다.' },
      { id: 'definitions', title: '핵심 용어 정의', content: lines(wording.definitions) || '현재 리포트에서 용어 정의를 확정할 수 없어 담당자 결정 필요입니다.' },
      { id: 'covered-loss', title: '보상하는 손해', content: proposal.coveredLoss || '현재 리포트에서 보상 손해 범위를 확정할 수 없어 담당자 결정 필요입니다.' },
      { id: 'payment', title: '보험금 지급조건', content: lines(wording.paymentConditions) || '현재 리포트에서 지급조건을 확정할 수 없어 담당자 결정 필요입니다.' },
      { id: 'exclusions', title: '보상하지 않는 손해', content: lines(wording.exclusionCandidates) || '현재 리포트에서 면책 범위를 확정할 수 없어 담당자 결정 필요입니다.' },
      { id: 'limit', title: '보상 범위와 한도', content: `${proposal.coverageLimitDirection || '보상 범위와 한도는 담당자 결정 필요입니다.'}\n${proposal.deductibleDirection || '자기부담금은 담당자 결정 필요입니다.'}` },
      { id: 'existing', title: '기존 보험과의 보상 순서', content: proposal.existingInsuranceRelationship || '기존 보험과의 관계는 담당자 결정 필요입니다.' },
      { id: 'notice', title: '사고 통지 및 필요 서류', content: '사고 통지 시점, 사고 조사자료, 손해 입증자료와 기존 보험 처리 현황은 담당자 검토 후 정해야 합니다.' },
      { id: 'decisions', title: '담당자 결정 필요사항', content: proposal.unresolvedItems.join('\n') || '현재 리포트에서 확정할 수 없는 약관 조건은 담당자 결정 필요입니다.' },
    ],
  }
}
