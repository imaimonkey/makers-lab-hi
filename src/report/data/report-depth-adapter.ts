import type { RiskDetailNarrative } from '../../domain/risk/riskDetailContent'
import type { ArticleSourceRecord } from '../../features/risk-dashboard/articleSourceData'
import type { ReportResult } from '../types'

export type ReportDepthContext = {
  title: string
  source: string
  sourceDate?: string | null
  event: string
  coveredEvent: string
  changeType: string
  coverageGap: string
  targets: string[]
  damages: string[]
  facts: string[]
  keywords: string[]
  metrics: Array<{ label: string; value: string; sourceHint?: string }>
  policyholder: string
  insured: string
  form: string
  coveredLoss: string
  existingInsurance: string
  underwritingInputs: string[]
  pricingInputs: string[]
  outOfScope: string[]
  uncertainty: string[]
  counterEvidence: string[]
  nextAction: string
  evidenceQuotes: string[]
  narrative?: RiskDetailNarrative
}

const unique = (items: string[]) => [...new Set(items.map((item) => item.trim()).filter(Boolean))]

const cleanReportText = (text: string) => text
  .replaceAll('구조을', '구조를')
  .replaceAll('하면가', '하면')
  .replaceAll('하면은', '하면')
  .replaceAll('것가', '것이')
  .replaceAll('화재을', '화재를')
  .replaceAll('사고을', '사고를')
  .replaceAll('확인가', '확인이')
  .replaceAll('확인를', '확인을')
  .replaceAll('자산가액를', '자산가액을')
  .replaceAll('자산가액가', '자산가액이')
  .replaceAll('PML를', 'PML을')
  .replaceAll('PML가', 'PML이')

const sentenceText = (text: string) => cleanReportText(text).replace(/[.!?。！？]+$/u, '').trim()

const hasBatchim = (text: string) => {
  const value = text.trim()
  const last = value.at(-1)
  if (!last) return false
  const code = last.charCodeAt(0)
  return code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 !== 0 : /[0-9A-Z]$/u.test(last)
}

const withObjectParticle = (text: string) => {
  const value = sentenceText(text)
  return `${value}${hasBatchim(value) ? '을' : '를'}`
}

const withSubjectParticle = (text: string) => {
  const value = sentenceText(text)
  return `${value}${hasBatchim(value) ? '이' : '가'}`
}

const eventDefinition = (event: string) => {
  const value = sentenceText(event)
  if (value.endsWith('경우') || value.endsWith('사고') || value.endsWith('사건')) return value
  if (value.endsWith('하면')) return `${value.slice(0, -2)}하는 사고`
  if (/(?:합니다|됩니다|있습니다|없습니다|됐습니다|되었습니다|제시됐습니다|확대됐습니다|증가했습니다|커지고 있습니다)$/u.test(value)) return `${value}에 해당하는 사건`
  return `${value} 사고`
}
const lossDefinition = (loss: string) => sentenceText(loss)

const padUnique = (items: string[], minimum: number, fallback: (index: number) => string) => {
  const result = unique(items)
  while (result.length < minimum) result.push(fallback(result.length))
  return result
}

const evidenceRef = (ids: string[], index: number) => ids[index % Math.max(ids.length, 1)]

function contextFromArticle(article: ArticleSourceRecord, narrative?: RiskDetailNarrative): ReportDepthContext {
  const { contentProfile: profile, derived } = article
  const concept = derived.productConcept
  return {
    title: article.title,
    source: article.source ?? '연결 원문',
    sourceDate: article.publishedAt ?? article.collectedAt ?? null,
    event: narrative?.incident ?? derived.event ?? profile.event,
    coveredEvent: concept.coveredEvent || derived.event || profile.event,
    changeType: derived.changeType,
    coverageGap: derived.coverageGap,
    targets: unique([...derived.affectedTargets, ...profile.affectedTargets]),
    damages: unique([...derived.damageTypes, ...profile.damageTypes]),
    facts: unique([...derived.facts, ...profile.facts]),
    keywords: unique([...derived.keywords, ...profile.keywords]),
    metrics: derived.metrics,
    policyholder: concept.policyholder,
    insured: concept.insured,
    form: concept.form,
    coveredLoss: concept.coveredLoss,
    existingInsurance: concept.existingInsuranceRelationship,
    underwritingInputs: concept.underwritingInputs,
    pricingInputs: concept.pricingInputs,
    outOfScope: concept.outOfScope,
    uncertainty: derived.uncertainty,
    counterEvidence: derived.counterEvidence,
    nextAction: derived.nextAction,
    evidenceQuotes: derived.evidenceQuotes,
    narrative,
  }
}

function buildEvidence(report: ReportResult, context: ReportDepthContext) {
  const originalEvidence = report.evidence.slice(0, 3).map((item) => ({
    ...item,
    usedFor: [...item.usedFor, '상품화·약관 검토'],
    sourceRiskId: report.meta.sourceRiskId,
  }))
  const evidenceRows = unique([
    ...context.evidenceQuotes,
    ...context.facts,
    ...(context.narrative?.analysisSections ?? []).map((section) => `${section[0]}: ${cleanReportText(section[1])}`),
    ...context.metrics.map((metric) => `${metric.label}: ${metric.value}${metric.sourceHint ? ` · ${metric.sourceHint}` : ''}`),
    ...context.narrative?.coverageRows.map((row) => `${row[0]}: ${row[1]}`) ?? [],
  ]).slice(0, 9)
  const rows = evidenceRows.length ? evidenceRows : [context.title, context.event, context.coverageGap]
  const ids = rows.map((_, index) => `${report.meta.sourceRiskId}-depth-evidence-${index + 1}`)
  const generatedEvidence = rows.map((quote, index) => ({
    id: ids[index],
    type: index < context.evidenceQuotes.length ? '연결 근거' : '위험 구조화 메모',
    title: `${context.title} · ${index < context.evidenceQuotes.length ? '원문·후보 근거' : '검토 근거'} ${index + 1}`,
    source: context.source,
    referenceDate: context.sourceDate ?? null,
    usedFor: ['위험 사건 정의', '손해·보장 공백 검토', '상품화 조건 검토'],
    reliability: report.meta.isMockData ? '큐레이션 기준 · 확인 필요' : '원문 연결 근거',
    isMockData: report.meta.isMockData,
    originalAvailable: !report.meta.isMockData,
    quote,
    sourceRiskId: report.meta.sourceRiskId,
  }))
  return [...originalEvidence, ...generatedEvidence].slice(0, 9)
}

function buildDamageTypes(context: ReportDepthContext, ids: string[]) {
  const narrativeRows = context.narrative?.lossRows.map(([label, summary, scope], index) => ({
    id: `damage-${index + 1}`,
    name: label,
    title: label,
    summary: cleanReportText(summary),
    examples: [cleanReportText(scope)],
    initialScope: cleanReportText(scope),
    evidenceIds: [evidenceRef(ids, index)],
  })) ?? []
  const fallback = [
    ...context.damages.map((damage, index) => ({ id: `damage-${narrativeRows.length + index + 1}`, name: damage, title: damage, summary: `${context.event}로 발생 가능한 ${damage}`, examples: [context.coverageGap], initialScope: '실제 손해자료와 책임 인정 기준 확인', evidenceIds: [evidenceRef(ids, index)] })),
    { id: 'damage-direct', name: '직접 재산·신체 손해', title: '직접 재산·신체 손해', summary: `${context.event} 직후 확인되는 직접 손해`, examples: [context.coveredLoss], initialScope: '손해사정 자료로 금액 확인', evidenceIds: [evidenceRef(ids, 0)] },
    { id: 'damage-recovery', name: '복구·대체 비용', title: '복구·대체 비용', summary: '사고 이후 복구·대체·전문 대응에 드는 비용', examples: [context.underwritingInputs[0] ?? context.nextAction], initialScope: '필요 비용과 기존 담보의 지급 범위 대조', evidenceIds: [evidenceRef(ids, 1)] },
    { id: 'damage-interruption', name: '운영·소득 중단 손해', title: '운영·소득 중단 손해', summary: `${context.changeType}가 지속될 때 발생하는 운영·소득 손해`, examples: [context.pricingInputs[0] ?? context.coverageGap], initialScope: '대기기간·한도·지속기간 확인', evidenceIds: [evidenceRef(ids, 2)] },
    { id: 'damage-liability', name: '책임·분쟁 대응 비용', title: '책임·분쟁 대응 비용', summary: '책임 주체 다툼과 법률·방어 비용으로 확산되는 손해', examples: [context.existingInsurance], initialScope: '배상책임과 방어비용의 지급 요건 분리', evidenceIds: [evidenceRef(ids, 3)] },
  ]
  return [...narrativeRows, ...fallback].slice(0, 4)
}

function buildCoverageMap(context: ReportDepthContext, ids: string[]) {
  const narrativeRows = context.narrative?.coverageRows.map(([label, summary, status], index) => ({
    id: `coverage-${index + 1}`,
    damage: label,
    coverageName: label,
    possibleCoverage: cleanReportText(summary),
    remainingGap: context.coverageGap,
    status,
    evidenceIds: [evidenceRef(ids, index)],
  })) ?? []
  const fallback = [
    { id: 'coverage-existing', damage: context.coveredLoss, coverageName: '기존 보험 담보', possibleCoverage: context.existingInsurance, remainingGap: context.coverageGap, status: '기존 약관 대조 필요', evidenceIds: [evidenceRef(ids, 0)] },
    { id: 'coverage-property', damage: '직접 재산·신체 손해', coverageName: '재산·배상책임 담보', possibleCoverage: '사고 원인과 피보험이익이 확인되는 범위', remainingGap: '사고 단위와 제3자 손해의 중복 여부', status: '조건 확인 필요', evidenceIds: [evidenceRef(ids, 1)] },
    { id: 'coverage-recovery', damage: '복구·대체 비용', coverageName: '복구·운영 보완 담보', possibleCoverage: context.underwritingInputs[0] ?? '복구 기준 확인', remainingGap: '실제 비용과 지급 한도의 연결', status: '추가 검토', evidenceIds: [evidenceRef(ids, 2)] },
    { id: 'coverage-interruption', damage: '운영·소득 중단 손해', coverageName: '휴업·소득 보완 담보', possibleCoverage: context.pricingInputs[0] ?? '중단 기간 확인', remainingGap: '대기기간·산정 기준 미확정', status: '추가 검토', evidenceIds: [evidenceRef(ids, 3)] },
    { id: 'coverage-liability', damage: '책임·분쟁 대응 비용', coverageName: '배상책임·방어비용 담보', possibleCoverage: context.existingInsurance, remainingGap: '책임 주체·고의성·면책 범위', status: '법무 확인 필요', evidenceIds: [evidenceRef(ids, 4)] },
  ]
  return [...narrativeRows, ...fallback].slice(0, 5)
}

function buildRoles(context: ReportDepthContext) {
  const narrativeRoles = context.narrative?.stakeholders.map(([role, responsibility], index) => ({ id: `role-${index + 1}`, role, candidates: [cleanReportText(responsibility)], status: '확인 필요', question: `${role}의 책임과 증빙을 확인`, evidenceIds: [] })) ?? []
  const fallback = [
    { id: 'role-policyholder', role: '계약자·운영 주체', candidates: [context.policyholder], status: '구조 검토', question: '위험관리와 보험료 부담 주체를 확인해야 합니다.', evidenceIds: [] },
    { id: 'role-insured', role: '피보험자·손해 주체', candidates: [context.insured], status: '구조 검토', question: '피보험이익과 실제 손해 부담 주체를 구분해야 합니다.', evidenceIds: [] },
    { id: 'role-third-party', role: '제3자 피해자·거래 상대방', candidates: context.targets.slice(0, 3), status: '영향 확인', question: '제3자 손해와 계약상 손해의 지급 범위를 대조해야 합니다.', evidenceIds: [] },
    { id: 'role-claims', role: '손해사정·보상 담당', candidates: ['손해사정·보상 조직'], status: '운영 검토', question: '사고 인정과 손해 산정에 필요한 기록을 정의해야 합니다.', evidenceIds: [] },
    { id: 'role-legal', role: '법무·준법·상품개발 담당', candidates: ['법무·준법·상품개발 조직'], status: '검토 필요', question: '법적 책임, 기존 약관, 면책·중복보장 기준을 검토해야 합니다.', evidenceIds: [] },
  ]
  return [...narrativeRoles, ...fallback].slice(0, 5)
}

function buildQuestions(context: ReportDepthContext) {
  const eventClause = eventDefinition(context.coveredEvent)
  const lossClause = lossDefinition(context.coveredLoss)
  const narrativeQuestions = (context.narrative?.questions ?? []).map(cleanReportText)
  return padUnique([
    narrativeQuestions[0] ?? `보장 사고를 ${eventClause}로 정의할 때 객관적으로 확인할 수 있는 기록은 무엇인가?`,
    narrativeQuestions[1] ?? `직접 손해와 복구·중단 손해 중 손해 범위(${lossClause})의 어느 범위까지 보장할 것인가?`,
    narrativeQuestions[2] ?? `${context.insured}의 책임과 제3자 손해를 어떤 계약·운영 기록으로 구분할 것인가?`,
    `기존 보험의 보완범위와 신규 담보가 중복되지 않도록 어디까지 보장할 것인가?`,
    `인수 판단에 필요한 ${withObjectParticle(context.underwritingInputs[0] ?? '위험관리 정보')} 가입 전 확보할 수 있는가?`,
    `요율과 한도 산정에 필요한 ${withSubjectParticle(context.pricingInputs[0] ?? '빈도·심도 자료')} 확보되어 있는가?`,
    `사고 통지와 손해 입증을 위해 ${withObjectParticle(context.pricingInputs[1] ?? '사고·손해 기록')} 어떤 형식과 기한으로 제출하게 할 것인가?`,
  ], 7, (index) => `${context.title}의 사고 인정·보상 판단을 위한 추가 확인 항목 ${index + 1}`).slice(0, 7)
}

export function createArticleReportDepthContext(article: ArticleSourceRecord, narrative?: RiskDetailNarrative) {
  return contextFromArticle(article, narrative)
}

function buildWordingCriteria(context: ReportDepthContext, evidenceIds: string[]) {
  const target = context.targets[0] ?? context.insured
  return [
    { id: 'wording-criteria-1', question: '보험계약자와 피보험자를 식별할 수 있는가?', status: '조건부', note: `${context.policyholder}와 ${context.insured}의 계약·운영 관계를 분리해 기재해야 합니다.`, evidenceIds: [evidenceRef(evidenceIds, 0)] },
    { id: 'wording-criteria-2', question: '보험의 목적 또는 보장 대상을 구체화할 수 있는가?', status: '조건부', note: `${target} 및 관련 시설·서비스 중 실제 손해를 부담하는 보장 대상을 특정해야 합니다.`, evidenceIds: [evidenceRef(evidenceIds, 1)] },
    { id: 'wording-criteria-3', question: '보험사고를 객관적으로 정의할 수 있는가?', status: '조건부', note: `${eventDefinition(context.coveredEvent)}를 사고 발생 시점과 인정자료까지 포함한 문구로 좁혀야 합니다.`, evidenceIds: [evidenceRef(evidenceIds, 2)] },
    { id: 'wording-criteria-4', question: '보험금 지급조건을 확인 가능한 형태로 작성할 수 있는가?', status: '조건부', note: `손해 범위(${lossDefinition(context.coveredLoss)})와 손해 입증자료(${context.pricingInputs[0] ?? '사고·손해 기록'})를 지급요건으로 연결해야 합니다.`, evidenceIds: [evidenceRef(evidenceIds, 3)] },
    { id: 'wording-criteria-5', question: '보상하지 않는 상황을 구체적으로 정할 수 있는가?', status: '가능', note: `보장 제외 후보(${context.outOfScope[0] ?? '고의·사고 전 존재 손해'})와 보장대상 밖의 손해를 면책 후보로 분리할 수 있습니다.`, evidenceIds: [evidenceRef(evidenceIds, 4)] },
    { id: 'wording-criteria-6', question: '사고 원인과 책임주체를 구분할 수 있는가?', status: '보완 필요', note: `${context.narrative?.responsibility ?? context.targets.join('·')}의 역할·관리기록·구상관계를 추가 확인해야 합니다.`, evidenceIds: [evidenceRef(evidenceIds, 5)] },
    { id: 'wording-criteria-7', question: '기존 상품과 중복되는 보장을 구분할 수 있는가?', status: '보완 필요', note: `기존 보험 관계(${sentenceText(context.existingInsurance)})와 신규 보완범위의 선보상·중복·초과손해 관계를 정해야 합니다.`, evidenceIds: [evidenceRef(evidenceIds, 6)] },
  ]
}

function buildDefinitions(context: ReportDepthContext, evidenceIds: string[]) {
  const lossLabels = context.narrative?.lossRows.map((row) => row[0]) ?? context.damages
  const stakeholderLabels = context.narrative?.stakeholders.map((row) => row[0]) ?? context.targets
  const rows: Array<[string, string, string]> = [
    ['보장대상', `계약상 위험을 부담하거나 관리하는 주체(${context.policyholder})와 실제 손해 주체(${context.insured})의 범위를 특정`, '계약·대상 명부·운영 관계 확인'],
    ['보험사고', `${eventDefinition(context.coveredEvent)}가 발생한 때를 사고 발생 시점으로 정의`, '사고 일시·장소·상태 확인'],
    ['보장 상태', `${context.title}에서 위험이 현실화된 상태와 사고 전 관리조건을 구분`, context.underwritingInputs[0] ?? '사전 관리·통제 기록'],
    ['보장손해', `손해 범위(${lossDefinition(context.coveredLoss)}) 중 약관상 직접손해와 비용손해의 범위를 구분`, lossLabels.join(' · ')],
    ['직접손해', `${eventDefinition(context.coveredEvent)}의 직접 결과로 발생한 물리적 손해·필요비용을 정의`, '손해사정·수리·복구 자료 확인'],
    ['책임주체', `${context.narrative?.responsibility ?? stakeholderLabels.join('·')}의 계약상·법률상 책임을 구분`, '계약서·관리 로그·조사자료 확인'],
    ['기존 보험', `기존 보험의 보장 범위(${sentenceText(context.existingInsurance)})에 따른 선행 보상과 신규 보완범위를 구분`, '기존 약관·보험금 지급내역 확인'],
    ['사고 단위', `${context.title}에서 연속적으로 확대된 손해를 하나의 사고로 볼지 정의`, '사고 단위·누적한도·집적 기준 확인'],
    ['손해 입증자료', `손해 범위(${lossDefinition(context.coveredLoss)})와 인과관계를 객관적으로 확인할 수 있는 자료를 특정`, context.pricingInputs.join(' · ') || '사고·손해 기록'],
    ['보장기간', `위험 노출 기간, ${context.coveredEvent}, 사고 통지·청구 기간을 구분`, '보험기간·대기기간·통지기한 확인'],
    ['제3자·간접손해', `${context.insured} 외 제3자 손해와 영업·소득 중단 등 간접손해의 포함 여부를 구분`, '피해자·손해 유형·별도 담보 확인'],
  ]
  return rows.map(([term, draftDefinition, status], index) => ({ id: `definition-${index + 1}`, term, draftDefinition, status, evidenceIds: [evidenceRef(evidenceIds, index)] }))
}

function buildPaymentConditions(context: ReportDepthContext, evidenceIds: string[]) {
  const rows: Array<[string, string, string]> = [
    ['사고 발생', `보험기간 중 ${eventDefinition(context.coveredEvent)}가 발생했을 것`, '사고 일시·장소·보험기간 확인'],
    ['보장대상 확인', `${context.insured} 또는 계약상 특정된 위험 대상과 관련된 사고일 것`, '계약서·대상 명부·운영 기록 확인'],
    ['사고 상태', `약관에서 정한 위험 상태와 관리조건에서 ${eventDefinition(context.coveredEvent)}가 발생했을 것`, context.underwritingInputs[0] ?? '사전 점검·관리 기록 확인'],
    ['인과관계', `확인된 사고와 손해 범위(${lossDefinition(context.coveredLoss)}) 사이의 직접적인 인과관계가 인정될 것`, '조사보고서·감정·손해사정 자료 확인'],
    ['직접손해', `제3자 또는 보장대상에 발생한 손해 범위(${lossDefinition(context.coveredLoss)})가 객관적으로 확인될 것`, '수리견적·영수증·복구·배상 자료 확인'],
    ['기존 보험 조정', `기존 보험(${sentenceText(context.existingInsurance)})의 적용 여부와 선행 보상액이 확인될 것`, '기존 약관·보험금 지급내역 확인'],
    ['손해액 산정', `실제 손해액과 ${withObjectParticle(context.pricingInputs[0] ?? '손해 빈도·심도 자료')}를 기준으로 보상액을 산정할 것`, '손해사정·매출·복구비·빈도 자료 확인'],
    ['통지·협조', '사고 통지, 자료 제출, 손해 확대 방지와 조사 협조 의무를 이행할 것', '사고 접수·청구서류·조사 협조 기록 확인'],
  ]
  return rows.map(([label, text, verification], index) => ({ id: `payment-${index + 1}`, label, text, verification, evidenceIds: [evidenceRef(evidenceIds, index)] }))
}

function buildExclusionCandidates(context: ReportDepthContext, evidenceIds: string[]) {
  const sourceExclusions = context.outOfScope.filter((text) => !/[?？]\s*$/u.test(text.trim()))
  const rows = padUnique([
    `고의·사기 또는 관리 의무 위반·무단 운영으로 발생한 ${context.title} 손해`,
    `보험기간 시작 전 이미 존재했거나 사고 후 확대된 손해(${lossDefinition(context.coveredLoss)})`,
    `사고와 직접 인과관계가 확인되지 않는 추정·평판·간접 손해`,
    `기존 보험(${sentenceText(context.existingInsurance)})에서 전액 보상된 동일 손해`,
    `${context.insured} 또는 약관상 보장대상으로 특정되지 않은 주체의 손해`,
    `공식 조사·손해자료로 확인되지 않는 ${context.title} 관련 손해`,
    '전쟁·테러·제재 등 일반 약관상 별도 면책 위험',
    ...sourceExclusions,
  ], 10, (index) => `${context.title}의 원인·손해·책임 관계가 확인되지 않은 추가 손해 ${index + 1}`).slice(0, 10)
  return rows.map((text, index) => ({ id: `exclusion-${index + 1}`, text, reason: `${context.title}의 사고 인정과 보장 범위를 분리하기 위한 후보 조항`, status: '면책 검토 후보', evidenceIds: [evidenceRef(evidenceIds, index)] }))
}

function buildAmbiguities(context: ReportDepthContext, evidenceIds: string[]) {
  const questions = buildQuestions(context)
  const issueLabels = ['사고 발생 상태', '보장손해 범위', '책임주체·구상', '기존 보험 선보상', '사고 단위·누적한도', '통지·손해 입증', '간접손해·면책']
  return questions.map((question, index) => ({
    id: `ambiguity-${index + 1}`,
    issue: `${context.title} · ${issueLabels[index] ?? '추가 약관 쟁점'}`,
    question,
    owner: index % 3 === 0 ? '상품·법무' : index % 3 === 1 ? '손해사정·보상' : '계리·재보험',
    evidenceIds: [evidenceRef(evidenceIds, index)],
  }))
}

export function deepenReport(report: ReportResult, context: ReportDepthContext): ReportResult {
  const evidence = buildEvidence(report, context)
  const evidenceIds = evidence.map((item) => item.id)
  const damageTypes = buildDamageTypes(context, evidenceIds)
  const existingCoverageMap = buildCoverageMap(context, evidenceIds)
  const roles = buildRoles(context)
  const questions = buildQuestions(context)
  const affectedParties = unique([...context.targets, ...roles.slice(0, 3).flatMap((role) => role.candidates)]).slice(0, 6)
  const keyCoverageGaps = unique([
    context.coverageGap,
    `${context.event}의 사고 인정 기준과 손해 입증 기준`,
    `${context.existingInsurance}와의 중복·우선 보상 관계`,
    `책임 주체와 고의·중대한 관리 소홀의 구분`,
    ...context.uncertainty,
  ]).slice(0, 5).map((description, index) => ({ id: `gap-${index + 1}`, title: index === 0 ? '핵심 보장 공백' : `추가 확인 공백 ${index}`, description, importance: index < 2 ? 'high' : 'medium', evidenceIds: [evidenceRef(evidenceIds, index)] }))
  const criteria: NonNullable<ReportResult['productFeasibility']['assessment']>['criteria'] = (report.productFeasibility.assessment?.criteria ?? []).map((criterion, index) => ({
    ...criterion,
    summary: `${context.title} · ${criterion.title}: ${context.facts[index % Math.max(context.facts.length, 1)] ?? context.event}. ${context.uncertainty[index % Math.max(context.uncertainty.length, 1)] ?? '내부 손해·인수 자료'} 확인이 필요합니다.`,
    rationale: `${criterion.title} 관점에서 다음 위험 사건(${context.event})과 보장 공백(${context.coverageGap})의 연결을 대조합니다.`,
    confirmedFacts: context.facts.slice(0, 3).join(' · '),
    evidence: [
      { id: `${criterion.id}-depth-evidence`, title: `${context.title} ${criterion.title} 근거`, sourceType: 'risk-review', sourceName: context.source, isMockData: report.meta.isMockData },
    ],
    evidenceIds: [evidenceRef(evidenceIds, index)],
    missingInformation: unique([...(criterion.missingInformation ?? []), ...context.uncertainty]).slice(0, 3),
    nextActions: [{ id: `${criterion.id}-depth-action`, text: `${criterion.title} 확인을 위해 ${context.nextAction}`, owner: '상품개발·리스크 검토', priority: index < 3 ? 'high' : 'medium', completed: false }],
    analysisDetail: {
      ...(criterion.analysisDetail ?? { aiSummary: '', rationale: [], materials: [], assumptions: [], limitations: [], reviewerChecks: [] }),
      aiSummary: `${context.title}의 ${criterion.title} 검토 결과`,
      rationale: [context.event, context.coverageGap],
      materials: context.facts.slice(0, 3),
      limitations: context.uncertainty.slice(0, 3),
      reviewerChecks: [questions[index % questions.length]],
    },
  })) as NonNullable<ReportResult['productFeasibility']['assessment']>['criteria']
  const feasibilityItems: ReportResult['productFeasibility']['items'] = criteria.slice(0, 10).map((criterion, index) => ({
    id: `feasibility-${index + 1}`,
    criterion: criterion.title,
    status: criterion.status,
    displayStatus: '추가 확인 필요',
    judgment: criterion.summary,
    evidenceIds: Array.isArray(criterion.evidenceIds) ? criterion.evidenceIds.filter((id): id is string => typeof id === 'string') : [],
    additionalChecks: criterion.missingInformation,
  }))
  const summaryEvidence = evidenceIds.slice(0, 3)
  const cards: ReportResult['aiSummary']['cards'] = [
    { id: 'target', label: '보험 대상', result: affectedParties.slice(0, 2).join(' · ') || context.insured, status: '조건부 검토', shortReason: `${context.policyholder}와 ${context.insured}의 역할을 분리해 검토`, detail: `${context.insured}를 중심으로 계약자·운영 주체·피해자·책임 주체를 나눠야 합니다.`, evidenceIds: summaryEvidence, caveat: '계약자·피보험자·보험료 부담 주체는 별도 확정이 필요합니다.' },
    { id: 'productDirection', label: '상품 방향', result: context.form, status: '조건부 검토', shortReason: '기존 담보와 남은 공백을 대조한 보완형 구조', detail: `${context.existingInsurance}를 우선 대조한 뒤 ${context.coverageGap}에 해당하는 손해만 보완하는 구조를 검토합니다.`, evidenceIds: summaryEvidence, caveat: '기존 보험의 우선 보상과 중복보험 처리 기준을 약관으로 정해야 합니다.' },
    { id: 'wording', label: '약관화 가능성', result: '조건부 가능', status: '조건부 검토', shortReason: '사고·손해·책임 경계를 문장으로 분리해야 함', detail: `${context.event}와 ${context.coveredLoss}는 정의할 수 있으나, 원인·인과관계·기존 담보 적용 순서를 확정해야 합니다.`, evidenceIds: summaryEvidence, caveat: '상품·법무·손해사정 담당자의 검토가 필요합니다.' },
    { id: 'dataReadiness', label: '데이터 준비도', result: `${context.metrics.length}개 지표·${evidence.length}개 근거`, status: '보완 필요', shortReason: '공식 원문과 내부 손해·인수 자료의 교차 확인 필요', detail: `${context.pricingInputs.join(' · ')}를 확보해야 요율·한도·자기부담금 검토가 가능합니다.`, evidenceIds: summaryEvidence, caveat: context.uncertainty[0] ?? '공개 자료만으로 최종 판단할 수 없습니다.' },
  ]
  const nextActions = [
    { id: 'depth-action-1', action: context.nextAction, reason: `${context.title}의 상품화 판단을 위해 우선 확인해야 하는 자료입니다.`, evaluationIds: [], evidenceIds: summaryEvidence, responsibleTeams: ['신규위험 탐색', '상품개발'] },
    { id: 'depth-action-2', action: `${context.existingInsurance}와 실제 손해자료를 대조하고 보장 공백을 확정`, reason: '기존 담보와 중복되지 않는 보완 범위를 정하기 위한 후속 작업입니다.', evaluationIds: [], evidenceIds: summaryEvidence, responsibleTeams: ['상품개발', '법무·준법', '손해사정'] },
  ]
  const confirmations = questions.map((question, index) => ({ id: `depth-confirmation-${index + 1}`, title: index < 2 ? '핵심 확인사항' : '추가 확인사항', whatToConfirm: question, whyNeeded: `${context.title}의 사고 인정·손해 산정·책임 범위를 확정하기 위해 필요합니다.`, requiredMaterials: [context.facts[index % Math.max(context.facts.length, 1)] ?? context.nextAction, context.pricingInputs[index % Math.max(context.pricingInputs.length, 1)] ?? '내부 손해·인수 자료'], responsibleTeams: ['상품개발', '법무·준법', '계리·손해사정'], evidenceIds: [evidenceRef(evidenceIds, index)] }))
  const definitions = buildDefinitions(context, evidenceIds)
  const paymentConditions = buildPaymentConditions(context, evidenceIds)
  const exclusionCandidates = buildExclusionCandidates(context, evidenceIds)
  const ambiguities = buildAmbiguities(context, evidenceIds)
  const referenceDocuments = evidence.slice(0, 6).map((item, index) => ({ id: `reference-${index + 1}`, name: item.title, role: index < 3 ? '위험 사건·손해 근거' : '상품화·약관 검토 근거', usedFor: item.usedFor.join(' · '), includedInAiInput: !item.isMockData, badge: item.isMockData ? '큐레이션 근거' : '원문 근거', sourcePath: item.source }))
  return {
    ...report,
    aiSummary: { ...report.aiSummary, cards, nextActions, additionalConfirmations: confirmations, overallOpinion: `${context.title}은 ${context.event}와 ${context.coverageGap}가 연결된 후보입니다. ${context.uncertainty[0] ?? '내부 손해·인수 자료'} 확인 전에는 상품 승인이나 보험금·보험료를 확정하지 않습니다.`, recommendedNextAction: context.nextAction },
    riskGapSummary: { ...report.riskGapSummary, definition: context.coverageGap, whyNow: unique([context.event, context.changeType, ...context.facts.slice(0, 2)]), damageTypes, affectedParties, existingCoverageMap, keyCoverageGaps },
    targetSuitability: { ...report.targetSuitability, recommendation: '조건부 검토', recommendationLabel: '위험 보유·운영 주체 중심의 조건부 검토', options: padUnique(affectedParties, 3, (index) => `${context.title} 관련 추가 보장 주체 ${index + 1}`).slice(0, 3).map((target, index) => ({ id: `target-${index + 1}`, target, suitability: index === 0 ? '우선 검토' : '조건부 검토', rank: index + 1, reason: `${target}의 ${context.event} 노출과 손해 부담을 확인`, limitation: context.uncertainty[0] ?? '실제 계약·손해자료 확인 필요', evidenceIds: [evidenceRef(evidenceIds, index)] })), roleStructure: roles, caution: '계약자·피보험자·피해자·책임 주체를 분리하고 기존 보험과의 중복을 확인해야 합니다.' },
    productFeasibility: { ...report.productFeasibility, overallAssessment: { ...report.productFeasibility.overallAssessment, conclusion: `${context.title}은 위험 사건과 보장 공백을 구조화할 수 있으나 추가 자료 확인 후 상품화 판단이 필요합니다.`, strengths: context.facts.slice(0, 4), improvements: unique([...context.uncertainty, ...context.counterEvidence]).slice(0, 5), entryConditions: [context.nextAction, ...context.pricingInputs.slice(0, 2)] }, items: feasibilityItems, assessment: report.productFeasibility.assessment ? { ...report.productFeasibility.assessment, overallSummary: `${context.title} 12개 상품화 기준 검토`, overallReason: context.coverageGap, topStrengths: context.facts.slice(0, 4), topRisks: unique([...context.uncertainty, ...context.counterEvidence]).slice(0, 5), priorityActions: [context.nextAction, `${context.existingInsurance} 확인`], criteria } : report.productFeasibility.assessment },
    productProposal: { ...report.productProposal, status: '초안 검토 · 추가 확인 필요', workingName: `${context.title} 보완보험 검토안`, recommendedForm: context.form, alternativeForms: ['기존 담보 보완형 특약', '운영 주체 단체계약형', '사고지수·실손 혼합형'], expectedPolicyholder: [context.policyholder], expectedInsured: context.insured, coveredObject: `${context.insured} 및 관련 시설·서비스`, coveredEvent: context.coveredEvent, coveredLoss: context.coveredLoss, existingInsuranceRelationship: context.existingInsurance, settlementDirection: '실제 손해·배상책임·방어비용을 구분하고 기존 보험 선행 보상 후 잔여 손해를 검토', policyPeriodDirection: '위험 노출 기간과 사고 발생·통지 기간을 구분해 설정', coverageLimitDirection: `사고당·연간 누적 한도는 ${withObjectParticle(context.pricingInputs.slice(0, 2).join(' · '))} 확인 후 산정`, deductibleDirection: `자기부담금은 ${withObjectParticle(context.underwritingInputs.slice(0, 2).join(' · '))} 반영하고 손해 빈도·심도를 함께 검토`, underwritingCandidates: context.underwritingInputs, outOfScopeCandidates: exclusionCandidates.map((item) => item.text), recommendationReason: context.nextAction, unresolvedItems: unique([...context.uncertainty, ...context.counterEvidence, ...questions]).slice(0, 8) },
    wordingFeasibility: { ...report.wordingFeasibility, status: 'additional_check_required', label: '약관 문구 검토 · 위험별 초안', disclaimer: '아래 문구는 위험별 사건·손해·책임 경계를 검토하기 위한 초안이며 최종 약관이 아닙니다.', possibleReasons: [context.event, context.coverageGap], improvementReasons: unique([...context.uncertainty, ...context.counterEvidence]).slice(0, 5), assessmentCriteria: buildWordingCriteria(context, evidenceIds), structureOptions: [{ id: 'structure-1', title: '기본 보완형', summary: `${context.coveredLoss} 중 기존 보험 미보장 손해를 보완`, selected: true }, { id: 'structure-2', title: '책임·방어비용 분리형', summary: `${context.insured}의 배상책임과 법률·방어비용을 분리` }, { id: 'structure-3', title: '운영중단 연계형', summary: '직접 손해와 복구·운영 중단 손해를 구분' }], selectedDraftType: '위험별 보완보험 초안', coverageDraft: `보험기간 중 다음 사건이 발생하고(${eventDefinition(context.coveredEvent)}), 다음 손해가 확인된 경우(${lossDefinition(context.coveredLoss)}), 약관에서 정한 보장 대상과 손해 입증 범위 안에서 보상하는 구조를 검토합니다. 다만 기존 보험 관계(${sentenceText(context.existingInsurance)})와의 중복·우선 보상 관계, 사고 원인과 책임 주체, 직접 손해와 간접 손해의 구분을 확인한 뒤 최종 문구를 확정합니다.`, alternativeLiabilityDraft: `${context.insured}의 법률상 배상책임과 사고 조사·방어비용은 손해 유형과 지급 요건을 분리해 검토합니다.`, definitions, paymentConditions, exclusionCandidates, ambiguities, referenceDocuments },
    evidence,
    missingResearch: confirmations.slice(0, 7).map((item, index) => ({ id: `follow-up-depth-${index + 1}`, priority: index < 2 ? 'high' : 'medium', topic: item.title, reason: item.whatToConfirm, responsibleTeam: item.responsibleTeams.join(' · '), status: 'pending', acquisitionType: '사내자료 필요', requiredMaterials: item.requiredMaterials })),
  }
}
