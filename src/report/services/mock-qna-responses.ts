import type { ReportQuestionAnswer, ReportResult } from '../types'

export const createMockReportQuestionAnswer = (
  question: string,
  report: ReportResult,
): ReportQuestionAnswer => {
  const evidenceIds = report.productFeasibility.items
    .filter((item) => /조건부|보완 필요|근거 부족/.test(item.status))
    .flatMap((item) => item.evidenceIds)
    .filter((id, index, values) => values.indexOf(id) === index)
    .slice(0, 4)

  return {
    answer: `시연용 mock 답변입니다. “${question}”에 대해 현재 리포트는 ${report.productFeasibility.overallStatus} 판단을 제시합니다. 제공된 문맥 밖의 사실은 확인할 수 없으며, 책임 기준·기존 보험과의 관계·직접손해 자료를 보완하기 전에는 상품 구조를 확정할 수 없습니다.`,
    relatedSections: ['AI 1차 상품화 판단', '상품화 가능성 평가와 총평', '위험 및 기존 보험의 보장 공백'],
    evidenceIds,
    isMock: true,
  }
}

