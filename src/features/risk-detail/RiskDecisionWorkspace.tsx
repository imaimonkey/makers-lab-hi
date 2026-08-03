import { useState } from 'react'
import type { SampleRiskCandidate, SampleRiskDetail } from '../../domain/risk/sampleData'
import { buildAiQualitativeSummary } from './qualitativeAssessment'
import type { SavedStep3AnalysisRow } from '../llm-util/util-3'
import { step3Nested, step3Text } from './step3ResultAdapter'

export function RiskDecisionWorkspace({
  risk,
  detail,
  developerMode = false,
  step3Results = [],
}: {
  risk: SampleRiskCandidate
  detail: SampleRiskDetail
  developerMode?: boolean
  step3Results?: SavedStep3AnalysisRow[]
}) {
  const [showDetail, setShowDetail] = useState(true)
  const displayDecisionStatus = detail.decisionStatus === '콘셉트 검토' ? '상품개발 검토' : detail.decisionStatus
  const step3Decision = step3Nested(step3Results, 'decisionBrief', 'decisionBrief')
  const aiQualitativeSummary = risk.id === 'generative-ai-copyright'
    ? '관련 위험 신호는 확인되지만, 공식 원문·국내 판례·실제 손해자료를 확인하기 전에는 상품화 가능성을 확정할 수 없습니다. 우선 책임 주체와 기존 약관의 보장 범위를 대조합니다.'
    : developerMode
    ? step3Text(step3Decision.logicComment, step3Text(step3Decision.summary, buildAiQualitativeSummary(risk, detail)))
    : buildAiQualitativeSummary(risk, detail)
  const nextChecks = detail.decisionChecks.filter(Boolean).slice(0, 4)

  return (
    <section className="detail-workspace" aria-label="상품개발 판단 메모">
      <section id="ai-judgment-evidence" className={showDetail ? 'detail-judgment-detail surface-card is-expanded' : 'detail-judgment-detail surface-card'} aria-labelledby="judgment-detail-title">
        <div className="detail-judgment-detail-heading">
          <div><p className="eyebrow">상품개발 판단</p><h2 id="judgment-detail-title">현재 판단과 다음 확인 항목</h2><p>현재 자료로 어디까지 확인됐고, 다음에 무엇을 확인해야 하는지 정리합니다.</p></div>
          <button type="button" className="detail-panel-toggle detail-panel-toggle--outline" aria-expanded={showDetail} aria-controls="judgment-detail-content" onClick={() => setShowDetail((current) => !current)}><strong>{showDetail ? '메모 접기' : '판단 메모 보기'}</strong><i aria-hidden="true">{showDetail ? '−' : '+'}</i></button>
        </div>
        {showDetail ? <div id="judgment-detail-content" className="detail-judgment-detail-content">
          <div className="detail-judgment-callout"><span>현재 판단 · {displayDecisionStatus}</span><strong>현재 자료만으로는 상품개발 여부를 결정하기 어렵습니다.</strong><p>{aiQualitativeSummary}</p></div>
          <div className="detail-judgment-summary-grid">
            <article><span>권고 방향</span><strong>추가 자료 확보 후 재검토</strong><p>현재는 위험 후보로 우선 관리하고, 국내 사례와 기존 보장 범위를 확인한 뒤 상품개발 여부를 판단합니다.</p></article>
            <article><span>다음 확인 항목</span><ul>{nextChecks.map((check) => <li key={check}>{check}</li>)}</ul></article>
            <article><span>AI 분석 방식</span><strong>근거 연결형 1차 검토</strong><p>LLM이 자료의 핵심 문장과 손해·책임 단서를 구조화하고, 위험 신호와 상품개발 검토 항목으로 연결합니다. 최종 판단은 원문과 국내 기준을 확인한 담당자가 수행합니다.</p></article>
          </div>
        </div> : <p className="detail-judgment-collapsed">판단 근거와 다음 확인 항목을 보려면 <strong>판단 메모 보기</strong>를 눌러 주세요.</p>}
      </section>
    </section>
  )
}
