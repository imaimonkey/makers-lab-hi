import { useMemo, useState } from 'react'
import type { SampleRiskCandidate, SampleRiskDetail, SampleRiskEvidence } from '../../domain/risk/sampleData'
import { toEvidenceLedger, type EvidenceLedgerItem } from '../../domain/risk/evidenceLedger'
import { AppIcon } from '../../shared/components/AppIcon'
import { buildAiQualitativeSummary, buildJudgmentSignalDetails, getSafeSourceUrl } from './qualitativeAssessment'
import type { SavedStep3AnalysisRow } from '../llm-util/util-3'
import { step3Nested, step3Text } from './step3ResultAdapter'

const confidenceLabel: Record<SampleRiskEvidence['confidence'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR')
}

function getEvidenceDate(evidence: EvidenceLedgerItem): string {
  if (evidence.publishedAt) return formatDate(evidence.publishedAt)
  if (evidence.collectedAt) return formatDate(evidence.collectedAt)
  return '확인 필요'
}

function sourceKindLabel(evidence: EvidenceLedgerItem): string {
  if (evidence.sourceType === 'news' || evidence.type.includes('뉴스')) return '뉴스'
  if (evidence.sourceType === 'research' || evidence.sourceType === 'report' || evidence.type.includes('보고서') || evidence.type.includes('논문')) return '논문·보고서'
  if (evidence.sourceType === 'regulation' || evidence.type.includes('기관') || evidence.type.includes('규제')) return '기관·법령'
  if (evidence.sourceType === 'internal-sample') return '분석 결과'
  return '연결 자료'
}

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
  const [activeEvidence, setActiveEvidence] = useState('전체')
  const [showEvidence, setShowEvidence] = useState(false)
  const [showJudgmentDetail, setShowJudgmentDetail] = useState(true)
  const evidenceLedger = useMemo(() => toEvidenceLedger(detail.evidence), [detail.evidence])
  const evidenceTypes = useMemo(
    () => ['전체', ...new Set(evidenceLedger.map((item) => item.type))],
    [evidenceLedger],
  )
  const filteredEvidence = evidenceLedger.filter(
    (item) => activeEvidence === '전체' || item.type === activeEvidence,
  )
  const step3Decision = step3Nested(step3Results, 'decisionBrief', 'decisionBrief')
  const linkedSourceCount = evidenceLedger.filter((item) => getSafeSourceUrl(item.sourceUrl ?? null)).length
  const previewEvidence = evidenceLedger.slice(0, 2)
  const aiQualitativeSummary = developerMode
    ? step3Text(step3Decision.logicComment, step3Text(step3Decision.summary, buildAiQualitativeSummary(risk, detail)))
    : buildAiQualitativeSummary(risk, detail)
  const decisionSummary = detail.decisionTitle.replace(/\s+/g, ' ')
  const judgmentSignals = buildJudgmentSignalDetails(risk, detail).filter((signal) => signal.label !== '근거 신뢰도')

  return (
    <section className="detail-workspace" aria-label="위험상세 평가 워크스페이스">
      <div className="detail-workspace-grid" id="assessment-signal">
        <article id="judgment-materials" className={showEvidence ? 'detail-evidence-panel surface-card is-expanded' : 'detail-evidence-panel surface-card is-collapsed'}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">근거 자료</p>
              <button type="button" className="detail-panel-toggle" aria-expanded={showEvidence} aria-controls="judgment-materials" onClick={() => setShowEvidence((current) => !current)}>
                <strong>근거 자료</strong><span>{showEvidence ? '접기' : '전체 보기'}</span><i aria-hidden="true">{showEvidence ? '−' : '+'}</i>
              </button>
              <p className="detail-evidence-caption">원문·뉴스·기관 자료를 근거 ID와 검증 상태로 관리합니다.</p>
            </div>
            <span className="status-badge sample">원문 링크 {linkedSourceCount}/{evidenceLedger.length} · 검증 필요</span>
          </div>
          {showEvidence ? <div className="detail-evidence-content">
            <div className="detail-evidence-tabs" aria-label="근거 자료 유형 필터">
              {evidenceTypes.map((type) => (
                <button key={type} type="button" className={activeEvidence === type ? 'active' : ''} aria-pressed={activeEvidence === type} onClick={() => setActiveEvidence(type)}>
                  {type}
                </button>
              ))}
            </div>
            <div className="detail-evidence-list">
              {filteredEvidence.map((evidence, index) => (
                <article key={evidence.id}>
                  <span>{String(index + 1).padStart(2, '0')} · {evidence.type}</span>
                  <strong>{evidence.title}</strong>
                  <small>{evidence.sourceName} · {getEvidenceDate(evidence)} · 신뢰도 {confidenceLabel[evidence.confidence]}</small>
                  <p>{evidence.excerpt}</p>
                  <details className="detail-evidence-item-details">
                    <summary>검증 메모 보기</summary>
                    <dl>
                      <div><dt>근거 ID</dt><dd>{evidence.id}</dd></div>
                      <div><dt>연결 판단</dt><dd>{evidence.supports.join(', ')}</dd></div>
                      <div><dt>불확실성</dt><dd>{evidence.uncertainty}</dd></div>
                      <div><dt>반증·주의</dt><dd>{evidence.counterpoint}</dd></div>
                    </dl>
                  </details>
                  <div className="detail-evidence-source-action">
                    {getSafeSourceUrl(evidence.sourceUrl ?? null)
                      ? <a href={getSafeSourceUrl(evidence.sourceUrl ?? null) ?? undefined} target="_blank" rel="noreferrer noopener">원문 열기 ↗</a>
                      : <span>원문 링크 확인 필요</span>}
                  </div>
                </article>
              ))}
              {!filteredEvidence.length && <p className="table-empty">선택한 근거 자료 유형이 없습니다.</p>}
            </div>
            <p className="detail-evidence-rule"><AppIcon name="shield" size={14} /> 링크가 있어도 구체적 주장·발행일·인용 범위를 확인하기 전에는 확정 자료로 보지 않습니다.</p>
          </div> : <div className="detail-evidence-preview" aria-label="대표 근거 자료 미리보기">
            {previewEvidence.map((evidence) => (
              <article key={evidence.id}>
                <div><span>{evidence.type}</span><strong>{evidence.title}</strong><small>{evidence.sourceName} · {getEvidenceDate(evidence)} · 신뢰도 {confidenceLabel[evidence.confidence]}</small></div>
                <p>{evidence.excerpt}</p>
                {getSafeSourceUrl(evidence.sourceUrl ?? null) ? <a href={getSafeSourceUrl(evidence.sourceUrl ?? null) ?? undefined} target="_blank" rel="noreferrer noopener">원문 열기 ↗</a> : <em>원문 링크 확인 필요</em>}
              </article>
            ))}
            {!previewEvidence.length && <p className="table-empty">연결된 근거 자료가 없습니다.</p>}
          </div>}
        </article>
      </div>

      <section id="ai-judgment-evidence" className={showJudgmentDetail ? 'detail-judgment-detail surface-card is-expanded' : 'detail-judgment-detail surface-card'} aria-labelledby="judgment-detail-title">
        <div className="detail-judgment-detail-heading">
          <div><p className="eyebrow">판단 설명</p><h2 id="judgment-detail-title">왜 이 위험을 먼저 보는가</h2><p>본문과 연결 자료를 바탕으로 한 판단 이유, 수치 산출 방식, 추가 확인 항목을 확인합니다.</p></div>
          <button type="button" className="detail-panel-toggle detail-panel-toggle--outline" aria-expanded={showJudgmentDetail} aria-controls="judgment-detail-content" onClick={() => setShowJudgmentDetail((current) => !current)}><strong>{showJudgmentDetail ? '설명 접기' : '판단 설명 보기'}</strong><i aria-hidden="true">{showJudgmentDetail ? '−' : '+'}</i></button>
        </div>
        {showJudgmentDetail ? <div id="judgment-detail-content" className="detail-judgment-detail-content">
          <div className="detail-judgment-callout"><span>현재 판단 · {detail.decisionStatus}</span><strong>{decisionSummary}</strong><p>{aiQualitativeSummary}</p></div>
          <div className="detail-judgment-metrics">
            {judgmentSignals.map((signal) => (
              <article key={signal.label}>
                <div className="detail-judgment-metric-heading">
                  <span>{signal.label}</span>
                  <strong>{signal.score}<small>/100</small></strong>
                </div>
                <div className="detail-judgment-metric-bar"><i style={{ width: `${signal.score}%` }} /></div>
                <p className="detail-judgment-metric-note">{signal.note}</p>
                <details className="detail-judgment-metric-details">
                  <summary>근거·계산·해석 보기</summary>
                  <dl>
                    <div><dt>수치 근거</dt><dd>{signal.basis}</dd></div>
                    <div><dt>계산 방식</dt><dd><code>{signal.calculation}</code></dd></div>
                  </dl>
                  <div className="detail-judgment-ai-comment">
                    <span>AI 해석</span>
                    <p>{signal.aiComment}</p>
                  </div>
                  <div className="detail-judgment-sources">
                    <span>연결 근거 · {signal.evidence.length}건</span>
                    {signal.evidence.length ? (
                      <ul>
                        {signal.evidence.map((evidence) => {
                          const sourceUrl = getSafeSourceUrl(evidence.sourceUrl)
                          return (
                            <li key={evidence.id}>
                              <strong>{evidence.id}</strong>
                              <small><b>{sourceKindLabel(evidence)}</b> · {evidence.sourceName} · {evidence.title}</small>
                              {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer noopener">원문 열기 ↗</a> : <em>원문 링크 확인 필요</em>}
                            </li>
                          )
                        })}
                      </ul>
                    ) : <p>연결된 근거 자료가 없습니다. 원문 확인 후 자료를 추가해야 합니다.</p>}
                  </div>
                </details>
              </article>
            ))}
          </div>
          <div className="detail-judgment-next"><div><span>다음 확인 항목</span><small>결론 확정 전 확인할 내용</small></div><ul>{detail.decisionChecks.slice(0, 3).map((check) => <li key={check}>{check}</li>)}</ul></div>
        </div> : <p className="detail-judgment-collapsed">이 위험을 먼저 검토하는 이유와 연결 근거를 보려면 <strong>판단 설명 보기</strong>를 눌러 주세요.</p>}
      </section>

    </section>
  )
}
