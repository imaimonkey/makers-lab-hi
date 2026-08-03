import type { ReactNode } from 'react'
import type { BriefingContent, BriefingCountItem, BriefingCoreCard, BriefingRiskItem, CommercializationConfidence, CommercializationCriterionStatus, CommercializationEvidence, CommercializationEvidenceStatus, CommercializationNextAction, ReportResult } from '../types'
import { updateReportContent, type EditorPath } from '../services/report-content'
import { COMMERCIALIZATION_CRITERION_DEFINITIONS } from '../services/commercialization-assessment'
import { createBriefingContent } from '../services/briefing-content'

export type ReportEditorTabId =
  | 'ai-judgment'
  | 'coverage-gap'
  | 'feasibility'
  | 'proposal'
  | 'wording'
  | 'evidence'
  | 'briefing'

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
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  return (
    <label className="report-page__editor-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} rows={3} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
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

function EditableStringList({
  label,
  values,
  onChange,
  multiline = false,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  multiline?: boolean
}) {
  const updateAt = (index: number, value: string) => onChange(values.map((item, currentIndex) => currentIndex === index ? value : item))
  const removeAt = (index: number) => onChange(values.filter((_, currentIndex) => currentIndex !== index))
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= values.length) return
    const next = [...values]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange(next)
  }
  return (
    <div className="report-page__editor-list">
      <div className="report-page__editor-list-heading"><strong>{label}</strong><button type="button" onClick={() => onChange([...values, ''])}>항목 추가</button></div>
      {values.map((value, index) => (
        <div className="report-page__editor-item report-page__editor-item--list" key={`${label}-${index}`}>
          <Field label={`${label} ${index + 1}`} value={value} onChange={(next) => updateAt(index, next)} multiline={multiline} />
          <div className="report-page__editor-order-actions">
            <button type="button" disabled={index === 0} aria-label={`${label} ${index + 1} 위로 이동`} onClick={() => move(index, -1)}>위로</button>
            <button type="button" disabled={index === values.length - 1} aria-label={`${label} ${index + 1} 아래로 이동`} onClick={() => move(index, 1)}>아래로</button>
            <button type="button" className="report-page__editor-remove" onClick={() => removeAt(index)}>삭제</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ArrayItemActions({
  label,
  index,
  length,
  onMove,
  onRemove,
}: {
  label: string
  index: number
  length: number
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}) {
  return (
    <div className="report-page__editor-order-actions">
      <button type="button" disabled={index === 0} aria-label={`${label} ${index + 1} 위로 이동`} onClick={() => onMove(-1)}>위로</button>
      <button type="button" disabled={index === length - 1} aria-label={`${label} ${index + 1} 아래로 이동`} onClick={() => onMove(1)}>아래로</button>
      <button type="button" className="report-page__editor-remove" onClick={onRemove}>삭제</button>
    </div>
  )
}

export function ReportEditorPanel({ activeTab, report, onChange, openCriterionId, onOpenCriterion }: EditorProps & { activeTab: ReportEditorTabId; openCriterionId?: string | null; onOpenCriterion?: (id: string | null) => void }) {
  const update = (path: EditorPath, value: unknown) => onChange(updateReportContent(report, path, value))
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
    <Group title="상품화 검토 요약">
      <Grid>
        <Field label="판단 상태" value={report.aiSummary.decisionLabel} onChange={(value) => update(['aiSummary', 'decisionLabel'], value)} />
        <Field label="핵심 판단 근거" value={report.aiSummary.primaryConclusionReason} onChange={(value) => update(['aiSummary', 'primaryConclusionReason'], value)} multiline />
        <Field label="핵심 검토 의견" value={report.aiSummary.overallOpinion} onChange={(value) => update(['aiSummary', 'overallOpinion'], value)} multiline />
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
    ['pass', '충족'], ['needs_review', '보완 필요'], ['additional_check', '추가 확인'], ['critical', '불충족'],
  ]
  const evidenceStatusOptions: Array<[CommercializationEvidenceStatus, string]> = [
    ['sufficient', '근거 충분'],
    ['external_data_required', '외부 자료 보완 필요'],
    ['internal_data_required', '내부 자료 필요'],
    ['reviewer_confirmation_required', '자료 확인 필요'],
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
    <Group title="상품화 종합평가 · 12개 고정 기준">
      {feasibility ? <>
        <Grid>
          <Field label="상품화 종합평가" value={feasibility.overallSummary} onChange={(value) => update(['productFeasibility', 'assessment', 'overallSummary'], value)} multiline />
          <Field label="기준 판단 근거" value={feasibility.overallReason} onChange={(value) => update(['productFeasibility', 'assessment', 'overallReason'], value)} multiline />
          <ListField label="강점" value={feasibility.topStrengths} onChange={(value) => update(['productFeasibility', 'assessment', 'topStrengths'], value)} />
          <ListField label="주요 리스크" value={feasibility.topRisks} onChange={(value) => update(['productFeasibility', 'assessment', 'topRisks'], value)} />
          <ListField label="우선 조치" value={feasibility.priorityActions} onChange={(value) => update(['productFeasibility', 'assessment', 'priorityActions'], value)} />
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
                    <SelectField label="근거 상태" value={criterion.evidenceStatus} options={evidenceStatusOptions} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'evidenceStatus'], value)} />
                    <SelectField label="근거 충분도" value={criterion.confidence} options={confidenceOptions} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'confidence'], value)} />
                    <label className="report-page__editor-field report-page__editor-checkbox"><span>차단 항목</span><input type="checkbox" checked={criterion.isBlocking} onChange={(event) => update(['productFeasibility', 'assessment', 'criteria', index, 'isBlocking'], event.target.checked)} /></label>
                    <ListField label="연동 출처" value={criterion.sourceSections} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'sourceSections'], value)} />
                    <Field label="판단 요약" value={criterion.summary} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'summary'], value)} multiline />
                    <Field label="판단 근거" value={criterion.rationale} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'rationale'], value)} multiline />
                    <Field label="확인된 사실" value={criterion.confirmedFacts ?? ''} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'confirmedFacts'], value)} multiline />
                    <ListField label="추가 확보 정보" value={criterion.missingInformation} onChange={(value) => update(['productFeasibility', 'assessment', 'criteria', index, 'missingInformation'], value)} />
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
      </> : <p className="report-page__muted">상품화 종합평가 데이터가 준비되지 않았습니다.</p>}
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
    (() => {
      const briefing: BriefingContent = createBriefingContent(report)
      const updateBriefing = (path: EditorPath, value: unknown) => update(['ui', 'briefing', ...path], value)
      return (
    <Group title="종합 브리핑">
      <Grid>
        <Field label="브리핑 탭 제목" value={String((report.ui?.labels as Record<string, unknown> | undefined)?.briefingTitle ?? '종합 브리핑')} onChange={(value) => update(['ui', 'labels', 'briefingTitle'], value)} />
        <Field label="브리핑 영문 라벨" value={briefing.eyebrow} onChange={(value) => updateBriefing(['eyebrow'], value)} />
        <Field label="메인 상태" value={briefing.conclusion} onChange={(value) => updateBriefing(['conclusion'], value)} />
        <Field label="보조 상태" value={briefing.decisionStatus} onChange={(value) => updateBriefing(['decisionStatus'], value)} />
      </Grid>
      <Grid>
        {briefing.sectionTitles ? Object.entries(briefing.sectionTitles).map(([key, value]) => (
          <Field key={key} label={`영역 제목 · ${key}`} value={String(value)} onChange={(next) => updateBriefing(['sectionTitles', key], next)} />
        )) : null}
        {Object.entries(briefing.sectionBadges).map(([key, value]) => (
          <Field key={key} label={`상태 배지 · ${key}`} value={String(value)} onChange={(next) => updateBriefing(['sectionBadges', key], next)} />
        ))}
      </Grid>
      <EditableStringList label="종합 검토 체크 문장" values={briefing.checks} onChange={(value) => updateBriefing(['checks'], value)} multiline />
      <div className="report-page__editor-list">
        <div className="report-page__editor-list-heading"><strong>상태 요약 수치</strong></div>
        <div className="report-page__editor-list-heading">
          <button type="button" onClick={() => updateBriefing(['counts'], [...briefing.counts, { label: '', value: '' } as BriefingCountItem])}>항목 추가</button>
        </div>
        {briefing.counts.map((item, index) => (
          <div className="report-page__editor-item" key={`count-${index}`}>
            <Grid>
              <Field label="수치 항목명" value={item.label} onChange={(value) => updateBriefing(['counts', index, 'label'], value)} />
              <Field label="수치 값" value={item.value} onChange={(value) => updateBriefing(['counts', index, 'value'], value)} />
            </Grid>
            <ArrayItemActions
              label="평가 상태 요약"
              index={index}
              length={briefing.counts.length}
              onMove={(direction) => {
                const next = [...briefing.counts]
                const [moved] = next.splice(index, 1)
                next.splice(index + direction, 0, moved)
                updateBriefing(['counts'], next)
              }}
              onRemove={() => updateBriefing(['counts'], briefing.counts.filter((_, currentIndex) => currentIndex !== index))}
            />
          </div>
        ))}
      </div>
      <div className="report-page__editor-list">
        <div className="report-page__editor-list-heading"><strong>핵심 검토 결과 카드</strong></div>
        <div className="report-page__editor-list-heading">
          <button type="button" onClick={() => updateBriefing(['coreCards'], [...briefing.coreCards, { id: `core-${Date.now()}`, title: '', status: '', lines: [] } as BriefingCoreCard])}>카드 추가</button>
        </div>
        {briefing.coreCards.map((card, index) => (
          <div className="report-page__editor-item" key={card.id}>
            <ArrayItemActions
              label="핵심 검토 결과 카드"
              index={index}
              length={briefing.coreCards.length}
              onMove={(direction) => {
                const next = [...briefing.coreCards]
                const [moved] = next.splice(index, 1)
                next.splice(index + direction, 0, moved)
                updateBriefing(['coreCards'], next)
              }}
              onRemove={() => updateBriefing(['coreCards'], briefing.coreCards.filter((_, currentIndex) => currentIndex !== index))}
            />
            <Grid>
              <Field label="카드 제목" value={card.title} onChange={(value) => updateBriefing(['coreCards', index, 'title'], value)} />
              <Field label="상태 배지" value={card.status} onChange={(value) => updateBriefing(['coreCards', index, 'status'], value)} />
            </Grid>
            <EditableStringList label="카드 핵심 문장" values={card.lines} onChange={(value) => updateBriefing(['coreCards', index, 'lines'], value)} multiline />
          </div>
        ))}
      </div>
      <EditableStringList label="추천 상품 구조 항목" values={briefing.proposalChecks} onChange={(value) => updateBriefing(['proposalChecks'], value)} multiline />
      <Grid>
        <Field label="예상 보장 문구" value={briefing.coverageDraft} onChange={(value) => updateBriefing(['coverageDraft'], value)} multiline />
        <Field label="보장 문구 안내" value={briefing.proposalDisclaimer} onChange={(value) => updateBriefing(['proposalDisclaimer'], value)} multiline />
      </Grid>
      <EditableStringList label="회의 논의 필요사항" values={briefing.discussionItems} onChange={(value) => updateBriefing(['discussionItems'], value)} multiline />
      <div className="report-page__editor-list">
        <div className="report-page__editor-list-heading"><strong>주요 리스크 및 추가 확인사항</strong></div>
        <div className="report-page__editor-list-heading">
          <button type="button" onClick={() => updateBriefing(['risks'], [...briefing.risks, { title: '', risk: '', check: '', badge: '' } as BriefingRiskItem])}>항목 추가</button>
        </div>
        {briefing.risks.map((item, index) => (
          <div className="report-page__editor-item" key={`risk-${index}`}>
            <ArrayItemActions
              label="주요 리스크 및 추가 확인사항"
              index={index}
              length={briefing.risks.length}
              onMove={(direction) => {
                const next = [...briefing.risks]
                const [moved] = next.splice(index, 1)
                next.splice(index + direction, 0, moved)
                updateBriefing(['risks'], next)
              }}
              onRemove={() => updateBriefing(['risks'], briefing.risks.filter((_, currentIndex) => currentIndex !== index))}
            />
            <Grid>
              <Field label="리스크 제목" value={item.title} onChange={(value) => updateBriefing(['risks', index, 'title'], value)} />
              <Field label="현재 리스크" value={item.risk} onChange={(value) => updateBriefing(['risks', index, 'risk'], value)} multiline />
              <Field label="필요한 확인" value={item.check} onChange={(value) => updateBriefing(['risks', index, 'check'], value)} multiline />
              <Field label="보조 상태값" value={item.badge ?? ''} onChange={(value) => updateBriefing(['risks', index, 'badge'], value)} />
            </Grid>
          </div>
        ))}
      </div>
      <EditableStringList label="후속 검토 과제" values={briefing.followUpTasks} onChange={(value) => updateBriefing(['followUpTasks'], value)} multiline />
      <div className="report-page__editor-list">
        <div className="report-page__editor-list-heading"><strong>근거자료 및 분석 한계</strong></div>
        <div className="report-page__editor-list-heading">
          <button type="button" onClick={() => updateBriefing(['evidenceMeta'], [...briefing.evidenceMeta, { label: '', value: '' } as BriefingCountItem])}>항목 추가</button>
        </div>
        {briefing.evidenceMeta.map((item, index) => (
          <div className="report-page__editor-item" key={`evidence-meta-${index}`}>
            <ArrayItemActions
              label="근거자료 및 분석 한계"
              index={index}
              length={briefing.evidenceMeta.length}
              onMove={(direction) => {
                const next = [...briefing.evidenceMeta]
                const [moved] = next.splice(index, 1)
                next.splice(index + direction, 0, moved)
                updateBriefing(['evidenceMeta'], next)
              }}
              onRemove={() => updateBriefing(['evidenceMeta'], briefing.evidenceMeta.filter((_, currentIndex) => currentIndex !== index))}
            />

            <Grid>
              <Field label="메타 항목명" value={item.label} onChange={(value) => updateBriefing(['evidenceMeta', index, 'label'], value)} />
              <Field label="메타 값" value={item.value} onChange={(value) => updateBriefing(['evidenceMeta', index, 'value'], value)} multiline />
            </Grid>
          </div>
        ))}
      </div>
      <Field label="최하단 안내 문구" value={briefing.disclaimer} onChange={(value) => updateBriefing(['disclaimer'], value)} multiline />
    </Group>
      )
    })()
  )

  const content = {
    'ai-judgment': aiEditor,
    'coverage-gap': coverageEditor,
    feasibility: feasibilityEditor,
    proposal: proposalEditor,
    wording: wordingEditor,
    evidence: evidenceEditor,
    briefing: briefingEditor,
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
