import type { ReportQuestionAnswer, ReportResult } from '../types'
import { ensureCommercializationAssessment } from './commercialization-assessment'

export const createMockReportQuestionAnswer = (
  question: string,
  report: ReportResult,
): ReportQuestionAnswer => {
  const normalized = ensureCommercializationAssessment(report)
  const assessment = normalized.productFeasibility.assessment
  const evidenceIds = (assessment?.criteria ?? [])
    .filter((item) => item.status === 'needs_review' || item.status === 'critical')
    .flatMap((item) => item.evidence.map((evidence) => evidence.id))
    .filter((id, index, values) => values.indexOf(id) === index)
    .slice(0, 4)

  return {
    answer: `시연용 mock 답변입니다. “${question}”에 대해 현재 리포트는 ${assessment?.overallStatus ?? '추가 자료 필요'} 판단을 제시합니다. 제공된 문맥 밖의 사실은 확인할 수 없으며, 책임 기준·기존 보험과의 관계·직접손해 자료를 보완하기 전에는 상품 구조를 확정할 수 없습니다.`,
    relatedSections: ['AI 1차 상품화 판단', '상품화 가능성 평가와 총평', '위험 및 기존 보험의 보장 공백'],
    evidenceIds,
    isMock: true,
  }
}
