import type { ReactNode } from 'react'
import type { CommercializationConfidence, CommercializationCriterionStatus, CommercializationEvidence, CommercializationNextAction, ReportResult } from '../types'
import { updateReportContent, type EditorPath } from '../services/report-content'
import { COMMERCIALIZATION_CRITERION_DEFINITIONS } from '../services/commercialization-assessment'

export type ReportEditorTabId =
  | 'ai-judgment'
  | 'coverage-gap'
  | 'feasibility'
  | 'proposal'
  | 'wording'
  | 'evidence'
  | 'briefing'
  | 'reviewer'

type EditorProps = {
  report: ReportResult
  onChange: (report: ReportResult) => void
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const objectRows = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? value.filter(isRecord) : []

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}) {
  return (
    <label className="report-page__editor-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} rows={3} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return (
    <label className="report-page__editor-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  )
}

function ListField({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  return (
    <Field
      label={`${label} (쉼표로 구분)`}
      value={value.join(', ')}
      onChange={(next) => onChange(next.split(',').map((item) => item.trim()).filter(Boolean))}
    />
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="report-page__editor-group" open>
      <summary>{title}</summary>
      <div className="report-page__editor-group-body">{children}</div>
    </details>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="report-page__editor-grid">{children}</div>
}

export function ReportEditorPanel({ activeTab, report, onChange, openCriterionId, onOpenCriterion }: EditorProps & { activeTab: ReportEditorTabId; openCriterionId?: string | null; onOpenCriterion?: (id: string | null) => void }) {
  const update = (path: EditorPath, value: unknown) => onChange(updateReportContent(report, path, value))
  const labels = (report.ui?.labels ?? {}) as Record<string, unknown>

  const commonEditor = (
    <Group title="현재 보고서 헤더 정보">
      <Grid>
        <Field label="보고서 제목" value={report.meta.title} onChange={(value) => update(['meta', 'title'], value)} />
        <Field label="위험 제목" value={report.meta.riskTitle} onChange={(value) => update(['meta', 'riskTitle'], value)} />
        <Field label="분석 기준일" value={report.meta.analysisBaseDate} onChange={(value) => update(['meta', 'analysisBaseDate'], value)} />
        {activeTab !== 'feasibility' ? <Field label="상태 배지" value={report.meta.aiStatus} onChange={(value) => update(['meta', 'aiStatus'], value)} /> : null}
        <Field label="데이터 상태 배지" value={report.meta.dataStatus} onChange={(value) => update(['meta', 'dataStatus'], value)} />
        <ListField label="위험도/상태 배지" value={report.meta.badges ?? []} onChange={(value) => update(['meta', 'badges'], value)} />
        <Field label="면책/주의 문구" value={report.meta.disclaimer} onChange={(value) => update(['meta', 'disclaimer'], value)} multiline />
      </Grid>
    </Group>
  )

  const aiEditor = (
    <Group title="AI 판단">
      <Grid>
        <Field label="판단 상태" value={report.aiSummary.decisionLabel} onChange={(value) => update(['aiSummary', 'decisionLabel'], value)} />
        <Field label="핵심 판단 근거" value={report.aiSummary.primaryConclusionReason} onChange={(value) => update(['aiSummary', 'primaryConclusionReason'], value)} multiline />
        <Field label="AI 종합 의견" value={report.aiSummary.overallOpinion} onChange={(value) => update(['aiSummary', 'overallOpinion'], value)} multiline />
      </Grid>
      <div className="report-page__editor-list">
        {(report.aiSummary.cards ?? []).map((card, index) => (
          <div className="report-page__editor-item" key={card.id}>
            <strong>{card.id}</strong>
            <Field label="카드 제목" value={card.label} onChange={(value) => update(['aiSummary', 'cards', index, 'label'], value)} />
            <Field label="결론값" value={card.result} onChange={(value) => update(['aiSummary', 'cards', index, 'result'], value)} />
            <Field label="상태 배지" value={card.status} onChange={(value) => update(['aiSummary', 'cards', index, 'status'], value)} />
            <Field label="요약 본문" value={card.shortReason} onChange={(value) => update(['aiSummary', 'cards', index, 'shortReason'], value)} multiline />
            <Field label="상세 본문" value={card.detail} onChange={(value) => update(['aiSummary', 'cards', index, 'detail'], value)} multiline />
          </div>
        ))}
      </div>
    </Group>
  )

  const coverageRows = objectRows((report.riskGapSummary as Record<string, unknown>).existingCoverageMap)
  const coverageEditor = (
    <Group title="보장 공백 표">
      <Field label="공백 정의" value={String((report.riskGapSummary as Record<string, unknown>).definition ?? '')} onChange={(value) => update(['riskGapSummary', 'definition'], value)} multiline />
      <div className="report-page__editor-list">
        {coverageRows.map((row, index) => (
          <div className="report-page__editor-item" key={String(row.id ?? index)}>
            <Field label="발생 손해" value={String(row.damage ?? '')} onChange={(value) => update(['riskGapSummary', 'existingCoverageMap', index, 'damage'], value)} />
            <Field label="기존 보험 가능 범위" value={String(row.coverageName ?? '')} onChange={(value) => update(['riskGapSummary', 'existingCoverageMap', index, 'coverageName'], value)} />
            <Field label="기존 보험 설명" value={String(row.possibleCoverage ?? '')} onChange={(value) => update(['riskGapSummary', 'existingCoverageMap', index, 'possibleCoverage'], value)} multiline />
            <Field label="남는 보장 공백" value={String(row.remainingGap ?? '')} onChange={(value) => update(['riskGapSummary', 'existingCoverageMap', index, 'remainingGap'], value)} multiline />
          </div>
        ))}
      </div>
    </Group>
  )

  const feasibility = report.productFeasibility.assessment
  const feasibilityStatusOptions: Array<[CommercializationCriterionStatus, string]> = [
    ['pass', '통과'], ['conditional', '조건부'], ['needs_review', '보완 필요'], ['critical', '중대 위험'], ['unknown', '미평가'],
  ]
  const confidenceOptions: Array<[CommercializationConfidence, string]> = [
    ['high', '충분'], ['medium', '일부 확보'], ['low', '부족'], ['unknown', '미입력'],
  ]
  const priorityOptions: Array<[CommercializationNextAction['priority'], string]> = [
    ['high', '높음'], ['medium', '보통'], ['low', '낮음'],
  ]
  const emptyEvidence: CommercializationEvidence = { id: 'new-evidence', title: '', sourceType: 'other', sourceName: '', publishedAt: null, collectedAt: null, url: '', excerpt: '' }
  const emptyAction: CommercializationNextAction = { id: 'new-action', text: '', owner: '', dueDate: '', priority: 'medium', completed: false }
  const feasibilityEditor = (
    <Group title="상품화 가능성 평가 · 12개 고정 기준">
      {feasibility ? <>
        <Grid>
          <Field label="상품화 종합평가" value={feasibility.overallSummary} onChange={(value) => update(['productFeasibility', 'assessment', 'overallSummary'], value)} multiline />
          <Field label="게이트 판단 근거" value={feasibility.overallReason} onChange={(value) => update(['productFeasibility', 'assessment', 'overallReason'], value)} multiline />
          <ListField label="강점" value={feasibility.topStrengths} onChange={(value) => update(['productFeasibility', 'assessment', 'topStrengths'], value)} />
          <ListField label="주요 리스크" value={feasibility.topRisks} onChange={(value) => update(['productFeasibility', 'assessment', 'topRisks'], value)} />
          <ListField label="우선 조치" value={feasibility.priorityActions} onChange={(value) => update(['productFeasibility', 'assessment', 'priorityActions'], value)} />
          <Field label="실무자 종합 메모" value={feasibility.reviewerMemo ?? ''} onChange={(value) => update(['productFeasibility', 'assessment', 'reviewerMemo'], value)} multiline />
        </Grid>
        <p className="report-page__editor-note">평가항목 ID·분류·순서·질문은 고정됩니다. 상태·근거·추가정보·다음 조치만 수정할 수 있으며, 법령·규제는 독립 평가항목으로 추가하지 않습니다.</p>
        <div className="report-page__editor-list">
          {COMMERCIALIZATION_CRITERION_DEFINITIONS.map((definition) => {
            const index = feasibility.criteria.findIndex((item) => item.id === definition.id)
            const criterion = feasibility.criteria[index]
            if (!criterion || index < 0) return null
            return (
              <details className="report-page__editor-item report-page__editor-item--criterion" key={criterion.id} open={onOpenCriterion ? openCriterionId === criterion.id : undefined} onToggle={(event) => { if (!onOpenCriterion) return; onOpenCriterion(event.currentTarget.open ? criterion.id : null) }}>
                <summary><strong>{String(criterion.order).padStart(2, '0')} · {criterion.title}</strong><span>{criterion.question}</span></summary>
                <div className="report-page__editor-group-body">
                  <Grid>
                    <SelectField label="상태" value={criterion.status} options={feasibilityStatusOptions} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'status'], value)} />
                    <SelectField label="근거 충분도" value={criterion.confidence} options={confidenceOptions} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'confidence'], value)} />
                    <label className="report-page__editor-field report-page__editor-checkbox"><span>차단 항목</span><input type="checkbox" checked={criterion.isBlocking} onChange={(event) => update(['productFeasibility', 'assessment', 'criteria', index, 'isBlocking'], event.target.checked)} /></label>
                    <Field label="판단 요약" value={criterion.summary} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'summary'], value)} multiline />
                    <Field label="판단 근거" value={criterion.rationale} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'rationale'], value)} multiline />
                    <Field label="확인된 사실" value={criterion.confirmedFacts ?? ''} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'confirmedFacts'], value)} multiline />
                    <ListField label="추가 확보 정보" value={criterion.missingInformation} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'missingInformation'], value)} />
                    <Field label="실무자 판단 메모" value={criterion.reviewerMemo ?? ''} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'reviewerMemo'], value)} multiline />
                  </Grid>
                  <div className="report-page__editor-list">
                    <div className="report-page__editor-list-heading"><strong>근거자료</strong><button type="button" onClick={() => update(['productFeasibility', 'assessment', 'criteria', index, 'evidence'], [...criterion.evidence, { ...emptyEvidence, id: `${criterion.id}-evidence-${criterion.evidence.length + 1}` }])}>근거 추가</button></div>
                    {criterion.evidence.map((evidence, evidenceIndex) => <div className="report-page__editor-item" key={`${criterion.id}-${evidence.id}-${evidenceIndex}`}>
                      <Grid>
                        <Field label="근거 ID" value={evidence.id} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'evidence', evidenceIndex, 'id'], value)} />
                        <Field label="제목" value={evidence.title} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'evidence', evidenceIndex, 'title'], value)} />
                        <Field label="출처 유형" value={evidence.sourceType} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'evidence', evidenceIndex, 'sourceType'], value)} />
                        <Field label="출처명" value={evidence.sourceName} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'evidence', evidenceIndex, 'sourceName'], value)} />
                        <Field label="발행일" value={evidence.publishedAt ?? ''} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'evidence', evidenceIndex, 'publishedAt'], value)} />
                        <Field label="수집일" value={evidence.collectedAt ?? ''} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'evidence', evidenceIndex, 'collectedAt'], value)} />
                        <Field label="링크" value={evidence.url ?? ''} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'evidence', evidenceIndex, 'url'], value)} />
                        <Field label="짧은 요약" value={evidence.excerpt ?? ''} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'evidence', evidenceIndex, 'excerpt'], value)} multiline />
                      </Grid>
                      <button type="button" className="report-page__editor-remove" onClick={() => update(['productFeasibility', 'assessment', 'criteria', index, 'evidence'], criterion.evidence.filter((_, currentIndex) => currentIndex !== evidenceIndex))}>근거 삭제</button>
                    </div>)}
                  </div>
                  <div className="report-page__editor-list">
                    <div className="report-page__editor-list-heading"><strong>다음 조치</strong><button type="button" onClick={() => update(['productFeasibility', 'assessment', 'criteria', index, 'nextActions'], [...criterion.nextActions, { ...emptyAction, id: `${criterion.id}-action-${criterion.nextActions.length + 1}` }])}>조치 추가</button></div>
                    {criterion.nextActions.map((action, actionIndex) => <div className="report-page__editor-item" key={`${criterion.id}-${action.id}-${actionIndex}`}>
                      <Grid>
                        <Field label="해야 할 일" value={action.text} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'nextActions', actionIndex, 'text'], value)} multiline />
                        <Field label="담당자" value={action.owner} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'nextActions', actionIndex, 'owner'], value)} />
                        <Field label="기한" value={action.dueDate ?? ''} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'nextActions', actionIndex, 'dueDate'], value)} />
                        <SelectField label="우선순위" value={action.priority} options={priorityOptions} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'nextActions', actionIndex, 'priority'], value)} />
                        <label className="report-page__editor-field report-page__editor-checkbox"><span>완료</span><input type="checkbox" checked={action.completed} onChange={(event) => update(['productFeasibility', 'assessment', 'criteria', index, 'nextActions', actionIndex, 'completed'], event.target.checked)} /></label>
                      </Grid>
                      <button type="button" className="report-page__editor-remove" onClick={() => update(['productFeasibility', 'assessment', 'criteria', index, 'nextActions'], criterion.nextActions.filter((_, currentIndex) => currentIndex !== actionIndex))}>조치 삭제</button>
                    </div>)}
                  </div>
                </div>
              </details>
            )
          })}
        </div>
      </> : <p className="report-page__muted">상품화 가능성 평가 데이터가 준비되지 않았습니다.</p>}
    </Group>
  )

  const proposalEditor = (
    <Group title="상품 구조">
      <Grid>
        <Field label="상품 작업명" value={report.productProposal.workingName} onChange={(value) => update(['productProposal', 'workingName'], value)} />
        <Field label="추천 상품 형태" value={report.productProposal.recommendedForm} onChange={(value) => update(['productProposal', 'recommendedForm'], value)} />
        <Field label="보험 대상" value={report.productProposal.coveredObject} onChange={(value) => update(['productProposal', 'coveredObject'], value)} multiline />
        <Field label="보장 사고" value={report.productProposal.coveredEvent} onChange={(value) => update(['productProposal', 'coveredEvent'], value)} multiline />
        <Field label="보상 손해" value={report.productProposal.coveredLoss} onChange={(value) => update(['productProposal', 'coveredLoss'], value)} multiline />
        <Field label="기존 보험과의 관계" value={report.productProposal.existingInsuranceRelationship} onChange={(value) => update(['productProposal', 'existingInsuranceRelationship'], value)} multiline />
        <Field label="상품 상태" value={report.productProposal.status} onChange={(value) => update(['productProposal', 'status'], value)} />
        <Field label="추천 이유" value={report.productProposal.recommendationReason} onChange={(value) => update(['productProposal', 'recommendationReason'], value)} multiline />
      </Grid>
    </Group>
  )

  const wordingEditor = (
    <Group title="약관 검토">
      <Grid>
        <Field label="약관 검토 상태" value={report.wordingFeasibility.label} onChange={(value) => update(['wordingFeasibility', 'label'], value)} />
        <Field label="추천 보장 문구" value={report.wordingFeasibility.coverageDraft} onChange={(value) => update(['wordingFeasibility', 'coverageDraft'], value)} multiline />
        <Field label="약관 주의 문구" value={report.wordingFeasibility.disclaimer} onChange={(value) => update(['wordingFeasibility', 'disclaimer'], value)} multiline />
      </Grid>
      <div className="report-page__editor-list">
        {(report.wordingFeasibility.definitions ?? []).map((item, index) => (
          <div className="report-page__editor-item" key={String(item.term ?? index)}>
            <Field label="핵심 용어" value={String(item.term ?? '')} onChange={(value) => update(['wordingFeasibility', 'definitions', index, 'term'], value)} />
            <Field label="정의 문구" value={String(item.draftDefinition ?? '')} onChange={(value) => update(['wordingFeasibility', 'definitions', index, 'draftDefinition'], value)} multiline />
          </div>
        ))}
        {(report.wordingFeasibility.paymentConditions ?? []).map((item, index) => (
          <div className="report-page__editor-item" key={String(item.id ?? `payment-${index}`)}>
            <Field label="보험금 지급조건" value={String(item.text ?? '')} onChange={(value) => update(['wordingFeasibility', 'paymentConditions', index, 'text'], value)} multiline />
          </div>
        ))}
        {(report.wordingFeasibility.exclusionCandidates ?? []).map((item, index) => (
          <div className="report-page__editor-item" key={String(item.id ?? `exclusion-${index}`)}>
            <Field label="보상하지 않는 손해" value={String(item.text ?? '')} onChange={(value) => update(['wordingFeasibility', 'exclusionCandidates', index, 'text'], value)} multiline />
          </div>
        ))}
      </div>
    </Group>
  )

  const evidenceEditor = (
    <Group title="근거자료">
      <div className="report-page__editor-list">
        {report.evidence.map((item, index) => (
          <div className="report-page__editor-item" key={item.id}>
            <Field label="근거자료 제목" value={item.title} onChange={(value) => update(['evidence', index, 'title'], value)} />
            <Field label="출처" value={item.source} onChange={(value) => update(['evidence', index, 'source'], value)} />
            <ListField label="사용 목적" value={item.usedFor} onChange={(value) => update(['evidence', index, 'usedFor'], value)} />
          </div>
        ))}
      </div>
    </Group>
  )

  const briefingEditor = (
    <Group title="종합 브리핑">
      <Grid>
        <Field label="브리핑 제목" value={String(labels.briefingTitle ?? '종합 브리핑')} onChange={(value) => update(['ui', 'labels', 'briefingTitle'], value)} />
        <Field label="브리핑 설명" value={String(labels.briefingDescription ?? '')} onChange={(value) => update(['ui', 'labels', 'briefingDescription'], value)} multiline />
      </Grid>
      <p className="report-page__editor-note">핵심 결론과 리스크는 리포트 전체 평가값에서 자동으로 구성됩니다. 이 탭에서는 브리핑의 제목과 설명만 수정합니다.</p>
    </Group>
  )

  const reviewerEditor = (
    <Group title="실무자 검토">
      {report.reviewer ? (
        <>
          <Grid>
            <Field label="실무자 검토 상태" value={report.reviewer.status} onChange={(value) => update(['reviewer', 'status'], value)} />
            <Field label="실무자 메모" value={report.reviewer.memo} onChange={(value) => update(['reviewer', 'memo'], value)} multiline />
          </Grid>
          <div className="report-page__editor-checklist">
            {(report.reviewer.checklist ?? []).map((item, index) => (
              <label key={item.id}>
                <input type="checkbox" checked={item.checked} onChange={(event) => update(['reviewer', 'checklist', index, 'checked'], event.target.checked)} />
                <input value={item.label} onChange={(event) => update(['reviewer', 'checklist', index, 'label'], event.target.value)} />
              </label>
            ))}
          </div>
        </>
      ) : <p className="report-page__muted">실무자 검토 데이터가 없습니다.</p>}
    </Group>
  )

  const content = {
    'ai-judgment': aiEditor,
    'coverage-gap': coverageEditor,
    feasibility: feasibilityEditor,
    proposal: proposalEditor,
    wording: wordingEditor,
    evidence: evidenceEditor,
    briefing: briefingEditor,
    reviewer: reviewerEditor,
  }[activeTab]

  return (
    <section className="report-page__editor-panel report-page__editor-panel--inline" aria-label={`${activeTab} 탭 편집 영역`}>
      <div className="report-page__editor-panel-header">
        <div>
          <p className="report-page__eyebrow">EDITING CURRENT TAB</p>
          <h2>현재 탭 내용 편집</h2>
        </div>
        <p>다른 탭의 데이터는 이 편집 화면에 표시하거나 수정하지 않습니다.</p>
      </div>
      {activeTab === 'feasibility' ? null : commonEditor}
      {content}
    </section>
  )
}
