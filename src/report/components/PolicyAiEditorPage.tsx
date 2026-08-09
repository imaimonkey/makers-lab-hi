import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { JsonObject, WordingPolicyEditor } from '../types'
import type { ReportResult, RiskSourceData } from '../types'
import type { ReportProxy } from '../api/report-proxy'
import { asReportView, createArticlePolicyDraft } from './ReportSections'
import type { PolicyArticle } from '../data/aiFullPolicyDraftMock'
import type { ArticleDerivedReportEntry } from '../data/article-derived-report-adapter'
import { createArticleDerivedReportEntries } from '../data/article-derived-report-adapter'
import { createCuratedReportEntries } from '../data/curated-report-adapter'
import { getMockReportData } from '../data/mock-data-adapter'
import { loadArticleSourceRecords } from '../../features/risk-dashboard/articleSourceData'
import { createWordingReportProxy } from '../api/wording-report-proxy'
import '../report.css'

type Clause = { key?: string; number: number; title: string; text: string; chapter?: string; sectionId?: string | null; insertAfter?: number | null }
type Message = { id: string; role: 'user' | 'assistant'; text: string; action?: 'draft' | 'apply'; isTyping?: boolean }
type Reply = { text: string; action?: Message['action']; clause?: Clause; applyClause?: Clause; draftKey?: string; draftText?: string }

const BASE_CLAUSES: Clause[] = [
  { number: 1, title: '목적', text: '이 약관은 서비스 이용과 관련하여 회사와 이용자의 권리·의무 및 책임사항을 정함을 목적으로 합니다.' },
  { number: 2, title: '용어의 정의', text: '이 약관에서 사용하는 용어의 뜻은 관계 법령과 서비스 안내에 따릅니다.' },
  { number: 3, title: '서비스의 제공', text: '회사는 이용자에게 약관과 서비스 안내에 따라 안정적인 서비스를 제공합니다.' },
  { number: 4, title: '환불 및 취소 규정', text: '서비스 결제 후 7일 이내 요청 시 전액 환불이 가능하도록 설정되어 있습니다.' },
  { number: 5, title: '이용자의 의무', text: '이용자는 관계 법령과 약관을 준수하고 타인의 권리와 회사의 업무를 방해하지 않아야 합니다.' },
  { number: 6, title: '서비스 이용 제한', text: '회사는 안전한 서비스 운영을 위해 필요한 경우 이용을 제한할 수 있으며, 그 사유를 안내합니다.' },
  { number: 7, title: '책임의 범위', text: '회사와 이용자의 책임 범위는 관계 법령과 개별 서비스 조건에 따라 정합니다.' },
]

const articleText = (article: PolicyArticle) => [
  ...article.paragraphs,
  ...(article.items ?? []).map((item) => typeof item === 'string' ? item : `${item.term}: ${item.definition}`),
].filter(Boolean).join('\n')

function createReportClauses(report: ArticleDerivedReportEntry['report']): Clause[] {
  const policy = createArticlePolicyDraft(asReportView(report))
  const common = policy.commonPolicy.sections.flatMap((section) => section.articles.map((article) => ({
    key: `common-${section.id}-${article.number}`,
    number: article.number,
    title: article.title,
    text: articleText(article),
    chapter: section.title,
    sectionId: `common-${section.id}`,
  })))
  const special = policy.specialClauses.flatMap((clause) => clause.articles.map((article) => ({
    key: `special-${clause.id}-${article.number}`,
    number: article.number,
    title: article.title,
    text: articleText(article),
    chapter: clause.title,
    sectionId: `special-${clause.id}`,
  })))
  return [...common, ...special]
}

const welcome: Message = { id: 'welcome', role: 'assistant', text: '약관 문서와 관련 근거를 확인했습니다. 조항 검색, 설명, 작성 또는 수정을 요청해 주세요.' }
const CHAT_THINKING_MS = 1_400
const CHAT_TYPE_INTERVAL_MS = 24
const THERMAL_RUNAWAY_DRAFT_KEY = 'common-article-section-2-4'
const THERMAL_RUNAWAY_DRAFT_TEXT = [
  '보장 사건과의 인과관계가 부족하거나 다른 제도·보험에서 이미 보상된 손해는 보상 범위와 구분하여 명시합니다.',
  '제4항 배터리 열폭주 관련 면책 및 책임 소재: 배터리 셀, 배터리 관리시스템 또는 제조 공정상 결함으로 열폭주가 발생한 경우에는 사고 원인 조사 결과에 따라 보상 비율을 산정합니다. 제조사 결함이 명확히 확인되는 손해는 제조사 또는 공급자의 책임 범위로 우선 구상하며, 피보험자의 충전·보관 기준 위반, 정비 소홀 또는 안전관리 의무 위반이 함께 확인되는 경우에는 그 기여도에 따라 보험금 지급 범위와 자기부담금을 조정합니다. 단, 사고 원인이 확정되기 전이라도 제3자 재산손해 확대 방지 비용과 긴급 복구비는 임시 지급 대상으로 검토할 수 있습니다.',
].join('\n')

function pickEntry(entries: ArticleDerivedReportEntry[], id: string | null) {
  return entries.find((entry) => entry.report.meta.sourceRiskId === id || entry.report.meta.reportId === id) ?? entries[0]
}

function normalizeForCompare(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function isSameClause(a: Clause, b: Clause) {
  return normalizeForCompare(a.title) === normalizeForCompare(b.title)
    && normalizeForCompare(a.text) === normalizeForCompare(b.text)
}

function dedupeClauses(items: Clause[]) {
  const seen = new Map<string, Clause>()
  for (const it of items) {
    const key = `${normalizeForCompare(it.title)}|${normalizeForCompare(it.text)}`
    if (!seen.has(key)) seen.set(key, it)
  }
  return Array.from(seen.values())
}

export function PolicyAiEditorPage({
  report: embeddedReport,
  riskData: embeddedRiskData,
  reportProxy: embeddedReportProxy,
  onSavePolicyEditor,
  onClose,
}: {
  report?: ReportResult
  riskData?: RiskSourceData
  reportProxy?: ReportProxy
  onSavePolicyEditor?: (editor: WordingPolicyEditor) => Promise<boolean>
  onClose?: () => void
}) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [entry, setEntry] = useState<ArticleDerivedReportEntry | null>(null)
  const [messages, setMessages] = useState<Message[]>([welcome])
  const [question, setQuestion] = useState('')
  const [addedClauses, setAddedClauses] = useState<Clause[]>([])
  const [articleDrafts, setArticleDrafts] = useState<JsonObject>({})
  const [status, setStatus] = useState<'saved' | 'editing'>('saved')
  const [toast, setToast] = useState('')
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [activeClauseKey, setActiveClauseKey] = useState('')
  const localReportProxy = useMemo(() => createWordingReportProxy(), [])
  const reportProxy = embeddedReportProxy ?? localReportProxy
  const responseTimerRef = useRef<number | null>(null)
  const typingTimerRef = useRef<number | null>(null)
  const pendingReplyRef = useRef<Reply | null>(null)
  const pendingDraftRef = useRef<Reply | null>(null)
  const pendingProposalRef = useRef<Reply | null>(null)
  const lastQuestionRef = useRef('')
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const pendingAssistantMessageIdRef = useRef<string | null>(null)
  const messageCounterRef = useRef(0)

  useEffect(() => () => {
    if (responseTimerRef.current !== null) window.clearTimeout(responseTimerRef.current)
    if (typingTimerRef.current !== null) window.clearInterval(typingTimerRef.current)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, isReading])

  useEffect(() => {
    const loadSelectedEntry = async () => {
      if (embeddedReport && embeddedRiskData) {
        let selected: ArticleDerivedReportEntry = { report: embeddedReport, riskData: embeddedRiskData }
        if (reportProxy.getReportContent) {
          try {
            const stored = await reportProxy.getReportContent(selected.report.meta.sourceRiskId)
            if (stored && typeof stored === 'object') {
              const storedRecord = stored as Record<string, unknown>
              const candidate = storedRecord.content && typeof storedRecord.content === 'object' ? storedRecord.content : stored
              if (candidate && typeof candidate === 'object' && 'wordingFeasibility' in candidate) selected = { ...selected, report: candidate as ArticleDerivedReportEntry['report'] }
            }
          } catch {
            // Keep the current report when the saved snapshot is unavailable.
          }
        }
        setEntry(selected)
        setMessages([{ ...welcome, text: `${selected.report.meta.title}의 약관 문서와 관련 근거를 확인했습니다. 이 리포트의 조항 검색, 설명, 작성 또는 수정을 요청해 주세요.` }])
        setArticleDrafts(selected.report.wordingFeasibility.policyEditor?.articleDrafts ?? {})
        const existingAdded = selected.report.wordingFeasibility.policyEditor?.addedArticles ?? []
        if (existingAdded.length) setAddedClauses(dedupeClauses(existingAdded))
        return
      }
      const articles = await loadArticleSourceRecords()
      const curated = getMockReportData()
      const all = [
        { riskData: curated.riskData, report: curated.fallbackReport },
        ...createCuratedReportEntries(),
        ...createArticleDerivedReportEntries(articles),
      ]
      let selected = pickEntry(all, params.get('reportId'))
      if (selected && reportProxy.getReportContent) {
        try {
          const stored = await reportProxy.getReportContent(selected.report.meta.sourceRiskId)
          if (stored && typeof stored === 'object') {
            const storedRecord = stored as Record<string, unknown>
            const candidate = storedRecord.content && typeof storedRecord.content === 'object'
              ? storedRecord.content
              : stored
            if (candidate && typeof candidate === 'object' && 'wordingFeasibility' in candidate) {
              selected = { ...selected, report: candidate as ArticleDerivedReportEntry['report'] }
            }
          }
        } catch {
          // The source report remains available when browser storage is empty.
        }
      }
      setEntry(selected)
      setMessages([{ ...welcome, text: `${selected?.report.meta.title ?? '현재 리포트'}의 약관 문서와 관련 근거를 확인했습니다. 이 리포트의 조항 검색, 설명, 작성 또는 수정을 요청해 주세요.` }])
      const existing = selected?.report.wordingFeasibility.policyEditor
      setArticleDrafts(existing?.articleDrafts ?? {})
      const existingAdded = existing?.addedArticles ?? []
      if (existingAdded.length) setAddedClauses(dedupeClauses(existingAdded))
    }
    void loadSelectedEntry()
  }, [embeddedReport, embeddedRiskData, params, reportProxy])

  const reportClauses = entry ? createReportClauses(entry.report).map((clause) => {
    if (!clause.key) return clause
    const draft = articleDrafts[clause.key]
    return typeof draft === 'string' && draft.trim() ? { ...clause, text: draft } : clause
  }) : BASE_CLAUSES
  const orderedClauses = [...reportClauses]
  addedClauses.forEach((added) => {
    const sameSection = added.sectionId ? orderedClauses.map((item, index) => ({ item, index })).filter(({ item }) => item.sectionId === added.sectionId).map(({ index }) => index) : []
    const sectionEnd = sameSection.length ? sameSection[sameSection.length - 1] + 1 : -1
    // Article numbers in the full policy are the final placement authority.
    // A persisted section id can differ between older drafts, so do not let it
    // block a unique anchor such as article 42 when inserting article 43.
    const exactAnchor = added.insertAfter == null ? -1 : orderedClauses.findIndex((item) => item.number === added.insertAfter)
    const insertAt = exactAnchor >= 0
      ? exactAnchor + 1
      : sectionEnd >= 0
        ? sectionEnd
        : added.insertAfter == null
          ? orderedClauses.findIndex((item) => item.number > added.number)
          : orderedClauses.findIndex((item) => item.number > added.insertAfter!)
    orderedClauses.splice(insertAt < 0 ? orderedClauses.length : insertAt, 0, added)
  })
  const clauses = orderedClauses
  const policyTitle = entry ? createArticlePolicyDraft(asReportView(entry.report)).documentTitle : '서비스 이용 약관'
  const reportTitle = entry?.report.meta.title ?? 'AI 약관 편집'
  const specialClauseNumbers = clauses
    .filter((clause) => clause.chapter?.includes('특별약관'))
    .map((clause) => clause.number)
  // Include common, special, and previously added AI articles so a new draft
  // can never reuse an existing article number.
  const nextArticleNumber = clauses.reduce((highest, clause) => Math.max(highest, clause.number), 0) + 1
  void specialClauseNumbers
  const focus = entry?.report.wordingFeasibility.improvementReasons?.[0]
    ?? entry?.report.productProposal.unresolvedItems?.[0]
    ?? entry?.report.productProposal.coveredLoss
    ?? '보장 범위와 지급요건'
  const generatedClause: Clause = {
    key: `added-${nextArticleNumber}`,
    number: nextArticleNumber,
    title: `${reportTitle} 보장 기준 정리`,
    text: `이 조항은 ${reportTitle}에서 우선 검토할 항목인 '${focus}'를 약관에 반영하기 위한 기준을 정합니다. 보장 대상은 ${entry?.report.productProposal.coveredObject ?? '리포트에 기재된 위험 대상'}로 하고, 보장 사건은 ${entry?.report.productProposal.coveredEvent ?? '리포트에서 확인된 사건 기준'}으로 구분합니다. ${entry?.report.productProposal.coveredLoss ?? '해당 사건으로 발생한 손해'}가 보장 범위에 해당하려면 발생 사실·인과관계·손해 규모를 확인할 수 있는 자료가 필요하며, ${entry?.report.productProposal.existingInsuranceRelationship ?? '기존 보험 및 다른 보상수단과의 관계'}도 함께 검토합니다. 적용 한도, 면책, 자기부담금과 최종 책임 범위는 이 리포트의 미해결 항목을 확인한 뒤 상품·법무·보상 담당자가 확정합니다.`,
  }
  const clauseDomId = (clause: Clause, index: number) => `policy-clause-${clause.key ?? `${clause.number}-${index}`}`
  const clauseIdentity = (clause: Clause, index: number) => clause.key ?? `${clause.number}-${index}`
  const scenarioScripts: Array<{ prompt: string; answer: string; clause?: Clause; applyClause?: Clause; draftKey?: string; draftText?: string }> = [
    {
      prompt: '전기차 화재 제3자 재산손해 보완보험 보통약관 리포트 내용 있어?',
      answer: '네, 있습니다. 본 리포트는 전기차 화재 발생 시 제3자의 재산 피해를 보상하는 기준과 한도를 명시하고 있습니다.',
      clause: clauses.find((clause) => /제3자|재산손해|화재/i.test(`${clause.title} ${clause.text}`)) ?? clauses[0],
    },
    {
      prompt: '배터리 열폭주 관련 면책 조항 내용도 있어?',
      answer: "아니요, 현재 약관 리포트에는 배터리 열폭주를 별도 면책 사유로 분리한 문구는 없습니다. 다만 사용자가 보고 있는 '제2관 보험금의 지급 > 제4조(보상하지 않는 손해)'가 보상 제외 사유와 책임 소재를 정리하는 자리이므로, 여기에 제4항을 추가하는 방식이 맞습니다. 구성할 때는 제조사 결함, 피보험자의 충전·보관 관리 소홀, 사고 원인 미확정 상태의 긴급 복구비 임시 지급 여부를 나누어 쓰면 됩니다.",
      clause: clauses.find((clause) => clause.key === THERMAL_RUNAWAY_DRAFT_KEY) ?? clauses.find((clause) => /보상하지 않는 손해|면책|제4조/i.test(`${clause.title} ${clause.text}`)) ?? clauses[0],
    },
    {
      prompt: '구성해 줘.',
      answer: '[제4조 제4항: 배터리 제조사 결함으로 인한 열폭주 시 보상 비율 및 책임 전가 규정 신설] 반영되었습니다. 왼쪽 약관 수정 페이지의 제2관 보험금의 지급 > 제4조 보상하지 않는 손해가 노란색으로 표시됩니다. 확인 후 저장하면 종합리포트 약관 초안에 적용됩니다.',
      clause: clauses.find((clause) => clause.key === THERMAL_RUNAWAY_DRAFT_KEY) ?? clauses[0],
      draftKey: THERMAL_RUNAWAY_DRAFT_KEY,
      draftText: THERMAL_RUNAWAY_DRAFT_TEXT,
    },
    {
      prompt: '전기차 배터리 화재에서 제조사 결함이면 누가 보상해?',
      answer: '현재 리포트는 제조사 결함을 확정하지 않습니다. 제4조 보상하지 않는 손해와 제8조 선보상 및 구상에서 배터리 결함, 차량 관리, 충전시설 과실을 분리해 확인합니다. 화재 원인 감정서·리콜 이력·충전 로그가 확인되면 선지급 후 구상하는 구조를 검토할 수 있지만, 책임과 보상 비율은 법무·보상 확인 전 확정하지 않습니다.',
      clause: clauses.find((clause) => clause.number === 4) ?? clauses[0],
    },
    {
      prompt: '지하주차장 연쇄피해에서 충전사업자 책임을 약관에 넣을 수 있어?',
      answer: '제4조에는 충전시설 설치·점검·관리상 과실이 사고의 직접 원인으로 확인된 경우를 검토용 문구로 둘 수 있습니다. 제8조에는 회사의 선지급 후 충전사업자·관리주체·제조사에 대한 구상 가능성을 남깁니다. 충전기 점검기록, 고장코드, CCTV, 시설관리 계약과 원인 감정서가 없으면 책임 주체나 면책을 확정하지 않습니다.',
      clause: clauses.find((clause) => clause.number === 4) ?? clauses[0],
    },
    {
      prompt: '원인 미확정인데 긴급복구비를 먼저 지급해도 돼?',
      answer: '제8조 선보상 및 구상에 원인 미확정 긴급복구비의 임시 지급 조건을 검토할 수 있습니다. 임시 지급은 최종 책임 인정이나 구상권 포기를 의미하지 않아야 하며, 대피·소화·추가 확산 방지 같은 긴급 비용으로 한정하고 조사 후 정산하는 구조가 적절합니다.',
      clause: clauses.find((clause) => clause.number === 8) ?? clauses[0],
    },
    {
      prompt: '제4조에서 배터리 열폭주를 전부 면책해도 돼?',
      answer: '배터리 열폭주 전체를 일괄 면책하면 보장 공백이 커질 수 있어 그대로 확정하면 안 됩니다. 제4조에서 배터리 자체 결함, 임의 개조·관리 소홀, 충전시설 결함, 원인 미확정 상태를 분리하고 직접 원인과 인과관계가 확인된 경우에만 적용하도록 검토합니다.',
      clause: clauses.find((clause) => clause.number === 4) ?? clauses[0],
    },
    {
      prompt: '보상한도와 제3자 피해 범위를 어디에서 확인해?',
      answer: '제7조 보험금 지급절차와 제10조 보험금 등의 지급한도에서 확인하는 흐름입니다. 발화 차량, 인접 차량·건물·주차장 시설, 소화수·대피·긴급복구 비용을 항목별로 나누고 사고당 한도와 연간 총한도를 구분해야 합니다. 실제 금액은 손해자료와 집적 PML 확인 후 정합니다.',
      clause: clauses.find((clause) => clause.number === 10) ?? clauses.find((clause) => clause.number === 7) ?? clauses[0],
    },
    {
      prompt: '같은 화재에서 자동차보험과 이 상품이 중복 지급되면 어떻게 해?',
      answer: '제9조 중복보상의 조정에서 확인합니다. 자동차보험의 차량 손해, 이 상품의 제3자 재산손해·긴급복구비, 시설배상책임보험 손해를 분리하고 동일 손해의 이중 지급을 조정합니다. 실제 회수액과 한도 적용 순서는 계약·지급자료 확인 후 확정합니다.',
      clause: clauses.find((clause) => clause.number === 9) ?? clauses[0],
    },
    {
      prompt: '보상한도 문구를 제7조 기준으로 더 명확하게 해줘',
      answer: '제7조 기준으로 사고당 한도, 피해자별 한도, 연간 총한도를 분리해 쓰는 검토안을 제시합니다. 지하주차장 연쇄피해는 차량·시설·소화수 손해와 영업중단 손해를 구분하고, 다수 피해를 하나의 사고로 볼지 정의해야 합니다. 금액은 실제 손해·재보험·집적 PML 확인 전 확정하지 않습니다.',
      clause: clauses.find((clause) => clause.number === 7) ?? clauses[0],
    },
  ]

  const createAssistantReply = (value: string): Reply => {
    const scripted = scenarioScripts.find((item) => item.prompt === value)
    if (scripted) {
      const reply: Reply = { text: scripted.answer, clause: scripted.clause, applyClause: scripted.applyClause, draftKey: scripted.draftKey, draftText: scripted.draftText }
      if (/중복보상/.test(value) && /구성|작성|수정/.test(value) && scripted.clause?.key) {
        const duplicateDraft = '피보험자가 동일한 사고와 손해에 대하여 기존 보험, 보증서비스, 국가·지방자치단체의 지원금 또는 책임주체로부터 이미 회수한 금액이 있는 경우 회사는 그 금액을 공제한 후 보험금을 지급합니다. 회사가 선보상한 후 피보험자가 다른 보험 또는 책임주체로부터 금액을 회수한 경우 피보험자는 회수 사실을 회사에 알리고 최종 보험금 정산에 협력하여야 합니다. 여러 보험계약에서 산출한 보험금 합계가 실제 손해액을 초과하는 경우 회사는 각 계약의 책임액 비율에 따라 이 계약의 지급보험금을 계산합니다. 동일 사고의 차량 손해, 제3자 재산손해, 시설배상책임보험 손해와 긴급복구비는 손해 항목별로 구분하여 정산합니다.'
        const duplicateIntro = scripted.answer.replace(/문서에 넣으려면[\s\S]*?입력하세요\.?/g, '').trim()
        const duplicateReply: Reply = { text: `${duplicateIntro}\n\n제${scripted.clause.number}조 ${scripted.clause.title}\n\n${duplicateDraft}`, clause: scripted.clause, draftKey: scripted.clause.key, draftText: duplicateDraft }
        pendingDraftRef.current = duplicateReply
        return duplicateReply
      }
      if (/구성|만들|작성/.test(value) && (reply.draftKey || reply.applyClause)) {
        pendingDraftRef.current = reply
        return { ...reply, applyClause: undefined }
      }
      return reply
    }

    const compactValue = value.replace(/\s+/g, '')
    if (/^(네|예|넵|넹|넵네)?(넣어|넣어줘|넣어죠|넣어주세요|넣어주세|넣어주셈|넣어줴|반영|반영해줘|반영해주세요|반영해주세|적용해줘|적용해주세요|문서에넣어줘)?$/.test(compactValue) && /네|예|넵|넹|넣어|반영|적용/.test(compactValue) && pendingProposalRef.current?.clause) {
      const proposal = pendingProposalRef.current
      pendingProposalRef.current = null
      return { text: `제${proposal.clause!.number}조 ${proposal.clause!.title}을 약관 문서에 반영합니다. 반영 후 저장 버튼을 눌러 리포트 약관에 적용하세요.`, clause: proposal.clause, applyClause: proposal.clause }
    }
    if (/^(아니요|아니오|안함|아니요-안함|안할게|넣지마|취소|노)\.?$/.test(compactValue) && pendingProposalRef.current) {
      pendingProposalRef.current = null
      return { text: '제안한 신규 조항은 반영하지 않았습니다. 현재 약관 문서는 변경되지 않았습니다.' }
    }
    if (/^(저장|저장해줘|저장해주세요)$/.test(compactValue)) {
      return { text: '약관 문서에 반영된 내용을 저장하려면 상단의 저장 버튼을 눌러 주세요. 저장이 완료되면 종합 리포트 약관에도 반영됩니다.' }
    }
    if (/^\s*(넣어줘|반영해줘|문서에 넣어줘)\s*$/.test(value)) {
      const pending = pendingDraftRef.current
      if (!pending?.clause) return { text: '먼저 반영할 조항 초안을 구성해 주세요. 예: “충전시설 책임 조항 구성해줘”' }
      pendingDraftRef.current = null
      const duplicate = clauses.find((item) => isSameClause(item, pending.clause!))
      if (duplicate) {
        return { text: `같은 내용의 조항이 이미 있어 새로 추가하지 않았습니다. 기존 제${duplicate.number}조 ${duplicate.title}을 확인해 주세요. 해당 조항으로 이동했습니다.`, clause: duplicate }
      }
      return { text: `방금 구성한 제${pending.clause.number}조 ${pending.clause.title} 초안을 약관 문서에 반영합니다. 반영된 부분은 강조 표시되며 저장 전 실무자 확인이 필요합니다.`, clause: pending.clause, applyClause: pending.clause, draftKey: pending.draftKey, draftText: pending.draftText }
    }

    if (/약관|조항/.test(value) && /있어|없어|찾아|어디/.test(value) && /발화|원인|책임|충전|배터리|재발화|긴급복구/.test(value)) {
      const proposalClause: Clause = { key: `added-${nextArticleNumber}`, number: nextArticleNumber, title: '전기차 화재 사고 인정 및 확인자료', chapter: '전기차 화재 보완 검토 조항', sectionId: 'special-adjacent-vehicle', insertAfter: nextArticleNumber - 1, text: '전기차 배터리 화재 또는 충전 중 화재의 사고 인정 여부는 화재 감식 결과, 배터리 진단·충전 로그, 차량 및 충전시설 점검기록, 리콜·정비 이력과 손해 발생의 시간·장소 자료를 종합하여 판단합니다. 원인과 책임 주체가 확인되지 않은 경우에는 특정 주체의 책임이나 면책을 확정하지 않으며, 긴급복구비의 임시 지급 여부와 최종 구상은 조사 결과에 따릅니다.' }
      const proposal: Reply = { text: `현재 약관에는 질문하신 내용을 직접 정한 조항이 없습니다. 다만 다음 관점의 보완이 필요합니다.\n\n- 보험 관점: 발화 차량·보장 사건·제3자 손해의 인정 기준\n- 법무 관점: 제조사·충전사업자·주차장 운영자 책임을 확정하기 위한 증빙\n- 보상 관점: 원인 미상 상태의 긴급복구비 임시 지급과 최종 구상\n- 손해사정 관점: 감식 결과·BMS·충전 로그·점검기록·리콜자료 확보\n\n이 내용을 신규 제안 조항으로 구성했습니다. 약관에 넣을까요?`, clause: proposalClause }
      pendingProposalRef.current = proposal
      return proposal
    }

    const existingPolicyQuestion = /중복보상|중복 보상|보상한도|보상 한도|환불|취소|해지|지급한도|지급 한도|보험금 계산|보험금 지급/.test(compactValue)
    if (existingPolicyQuestion && /알려|설명|어디|확인|있어|찾아|알려죠|설명해죠/.test(compactValue)) {
      const existing = /중복보상|중복 보상/.test(compactValue)
        ? clauses.find((clause) => clause.number === 9)
        : /보상한도|보상 한도|지급한도|지급 한도/.test(compactValue)
          ? clauses.find((clause) => clause.number === 7) ?? clauses.find((clause) => clause.number === 10)
          : clauses.find((clause) => /환불|취소|해지|보험금 지급|보험금 계산/i.test(`${clause.title} ${clause.text}`))
      if (existing) {
        return { text: `현재 약관에 관련 내용이 있습니다. 제${existing.number}조 ${existing.title}로 이동합니다.\n\n${existing.text}\n\n이 조항은 전기차 배터리 화재 사고의 손해 항목과 기존 보험의 지급 관계를 확인한 뒤 실무 검토에 사용합니다. 신규 조항을 추가하지 않습니다.`, clause: existing }
      }
    }

    if (/발화 차량|원인 미상|객관적 기준|화재 인정 기준/.test(value)) {
      const matched = clauses.find((clause) => /발화 차량|원인 미상|객관적 기준|원인 및 책임 확인/.test(`${clause.title} ${clause.text}`)) ?? clauses.find((clause) => clause.number === 4) ?? clauses[0]
      return {
        text: `현재 리포트에서 확인할 위치는 ${matched ? `제${matched.number}조 ${matched.title}` : '관련 검토 조항'}입니다. 발화 차량과 원인 미상 화재를 인정하려면 소방·감식 결과, 배터리 진단·충전 로그, 차량·충전시설 점검기록, 인접 손해의 시간·장소 일치 자료를 분리해 확인해야 합니다. 단순히 차량이 화재 현장에 있었다는 사실만으로 발화 차량이나 제조사·충전사업자 책임을 확정할 수 없습니다. 이 기준을 조항으로 구성하려면 “그 내용 구성해줘”라고 입력하세요.`,
        clause: matched,
      }
    }

    const contextValue = `${lastQuestionRef.current} ${value}`
    const explicitArticleNumber = contextValue.match(/제\s*(\d+)조/)?.[1]
    const requestedClause = explicitArticleNumber
      ? clauses.find((clause) => clause.number === Number(explicitArticleNumber))
      : /긴급복구|선보상|구상/.test(contextValue)
        ? clauses.find((clause) => clause.number === 8)
        : /중복보상|자동차보험/.test(contextValue)
          ? clauses.find((clause) => clause.number === 9)
          : /보상한도|지급한도|한도/.test(contextValue)
            ? clauses.find((clause) => clause.number === 7 || clause.number === 10)
            : /제\s*4조|면책|보상하지 않는|열폭주/.test(contextValue)
      ? clauses.find((clause) => clause.number === 4)
      : /제\s*7조|한도|지급절차/.test(value)
        ? clauses.find((clause) => clause.number === 7)
        : /제\s*8조|선보상|구상|책임/.test(value)
          ? clauses.find((clause) => clause.number === 8)
          : /제\s*9조|중복보상/.test(value)
            ? clauses.find((clause) => clause.number === 9)
            : undefined
    const isFollowUpBuild = /그 내용|그 조항|방금|직전|관련 내용/.test(value) && /구성|수정|추가|반영|만들어|정리해/.test(value)
    const isEVBuild = /전기차|배터리|화재|충전|열폭주|면책|보상한도|중복보상|구상|법/.test(contextValue) && /구성|수정|추가|반영|만들어|정리해/.test(value)
    if (isFollowUpBuild || isEVBuild || (lastQuestionRef.current && /구성|수정|추가|반영|만들어|정리해/.test(value))) {
      if (requestedClause?.key) {
        const revisedText = /중복보상|자동차보험/.test(contextValue)
          ? '피보험자가 동일한 사고와 손해에 대하여 기존 보험, 보증서비스, 국가·지방자치단체의 지원금 또는 책임주체로부터 이미 회수한 금액이 있는 경우 회사는 그 금액을 공제한 후 보험금을 지급합니다. 회사가 선보상한 후 피보험자가 다른 보험 또는 책임주체로부터 금액을 회수한 경우 피보험자는 회수 사실을 회사에 알리고 최종 보험금 정산에 협력하여야 합니다. 여러 보험계약에서 산출한 보험금 합계가 실제 손해액을 초과하는 경우 회사는 각 계약의 책임액 비율에 따라 이 계약의 지급보험금을 계산합니다. 동일 사고의 차량 손해, 제3자 재산손해, 시설배상책임보험 손해와 긴급복구비는 손해 항목별로 구분하여 정산합니다.'
          : /긴급복구|선보상|구상/.test(contextValue)
            ? `${requestedClause.text}\n\n 화재 원인과 책임 주체가 확정되기 전에는 대피·소화·추가 확산 방지 등 긴급복구에 필요한 비용만 임시 지급할 수 있습니다. 임시 지급은 최종 책임 인정이나 구상권 포기를 의미하지 않으며, 원인 감정서·점검기록·충전 로그 확인 후 최종 정산합니다.`
            : /보상한도|지급한도|한도/.test(contextValue)
              ? `${requestedClause.text}\n\n 사고당 한도, 피해자별 한도, 연간 총한도를 구분하고 발화 차량·인접 차량·건물·주차장 시설·긴급복구·영업중단 손해를 항목별로 산정합니다. 실제 금액과 누적한도는 손해자료·집적 PML·재보험 검토 후 확정합니다.`
              : `${requestedClause.text}\n\n 전기차 배터리 화재의 원인과 책임 주체를 확정하지 않은 상태에서 면책 또는 보상 제외를 단정하지 않습니다. 배터리 결함, 충전시설 관리, 주차장 운영, 피보험자의 관리상 과실을 구분하고 화재 원인 감정서·점검기록·충전 로그·리콜 자료를 확인한 뒤 보상 및 구상 여부를 결정합니다.`
        const draftReply: Reply = { text: `현재 리포트의 제${requestedClause.number}조 ${requestedClause.title}에서 처리할 수 있는 내용입니다. 기존 조항을 유지하면서 전기차 배터리 화재의 책임·증빙 기준을 보완하는 수정안을 구성했습니다. 문서에 넣으려면 “넣어줘”라고 입력하세요.`, clause: requestedClause, draftKey: requestedClause.key, draftText: revisedText }
        pendingDraftRef.current = draftReply
        return draftReply
      }
      const extraClause: Clause = { key: `added-${nextArticleNumber}`, number: nextArticleNumber, title: '전기차 배터리 화재 원인 및 책임 확인', chapter: '전기차 화재 보완 검토 조항', sectionId: requestedClause?.sectionId ?? 'special-adjacent-vehicle', insertAfter: nextArticleNumber - 1, text: `이 조항은 전기차 배터리 열폭주 또는 충전 중 화재로 차량·인접 차량·건물·주차장 시설에 손해가 발생한 경우 적용합니다. 회사는 배터리 제조·수입 결함, 충전시설 설치·관리, 주차장 운영, 피보험자의 개조·관리상 과실을 구분하여 화재 원인과 손해 범위를 확인합니다. 원인 감정서·점검기록·충전 로그·리콜 자료가 확보되기 전에는 특정 책임 주체나 면책을 확정하지 않으며, 긴급복구비를 임시 지급한 경우에도 최종 책임 및 구상권 판단은 조사 결과에 따릅니다. 관련 법령이나 공식 기준이 확인되지 않은 부분은 법무 검토 전 확정 문구로 사용하지 않습니다.` }
      const draftReply: Reply = { text: `현재 약관에 요청 내용을 직접 담은 조항이 없어 마지막 조항 다음인 제${nextArticleNumber}조로 신규 검토 조항을 구성했습니다. 제4조·제7조·제8조·제9조와 충돌하지 않도록 면책, 한도, 선보상·구상, 중복보상은 각 기존 조항을 우선 적용하도록 연결했습니다. 법령 근거가 확인되지 않은 책임·보상 문구는 법무 확인 필요 상태로 남겼습니다. 문서에 넣으려면 “넣어줘”라고 입력하세요.`, clause: extraClause }
      pendingDraftRef.current = draftReply
      return draftReply
    }

    if (value.includes('환불')) {
      const matched = clauses.find((clause) => /환불|취소|반환|refund/i.test(`${clause.title} ${clause.text}`))
      return { text: `${reportTitle} 기준 ${matched ? `제${matched.number}조(${matched.title})` : '관련 약관 조항'}을 확인했습니다. ${matched?.text ?? '환불·취소 기준은 해당 리포트의 약관 원문과 공식 기준을 함께 확인해야 합니다.'}`, clause: matched }
    }

    if (value.includes('조항') || value.includes('추가') || value.includes('작성') || value.includes('만들어')) {
      const matched = clauses.find((clause) => /보장|손해|사건|대상|지급/i.test(`${clause.title} ${clause.text}`)) ?? clauses[0]
      return { text: `${reportTitle}의 기존 약관과 보장 공백을 확인했습니다. '${focus}'를 기준으로 새 조항을 작성하고, 기존 조항과의 충돌·근거자료·최종 확인 항목까지 함께 정리할 수 있습니다.`, action: 'draft', clause: matched }
    }

    if (value.includes('보상한도') || value.includes('명확')) {
      const matched = clauses.find((clause) => /한도|지급|보상|손해|자기부담/i.test(`${clause.title} ${clause.text}`)) ?? clauses[0]
      return { text: `${reportTitle}의 약관에서 보상한도는 적용 대상, 산정 기준, 자기부담금과 함께 명시하면 검토가 수월합니다. 현재 문서의 관련 조항을 기준으로 문구를 정리해 드릴까요?`, action: 'draft', clause: matched }
    }

    return { text: '질문하신 내용은 현재 약관의 제4조부터 제7조를 함께 확인해야 합니다. 관련 조항과 확인이 필요한 근거를 정리해 드릴게요.' }
  }

  const goBack = () => {
    if (onClose) {
      if (status === 'editing') setLeaveOpen(true)
      else onClose()
      return
    }
    if (status === 'editing') setLeaveOpen(true)
    else navigate(`/reports?reportId=${encodeURIComponent(entry?.report.meta.sourceRiskId ?? params.get('reportId') ?? '')}`)
  }

  const scrollToClause = (clause?: Clause) => {
    if (!clause) return
    const index = clauses.findIndex((item) => item === clause || isSameClause(item, clause))
    if (index < 0) return
    const id = clauseDomId(clauses[index], index)
    setActiveClauseKey(clauseIdentity(clauses[index], index))
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }

  const respond = (text: string, action?: Message['action'], clause?: Clause) => {
    messageCounterRef.current += 1
    setMessages((current) => [...current, { id: `assistant-${messageCounterRef.current}`, role: 'assistant', text, action }])
    scrollToClause(clause)
  }

  const applyClauseToDraft = (clause: Clause, message?: string) => {
    const existsInReport = reportClauses.some((item) => isSameClause(item, clause))
    if (!existsInReport) {
      setAddedClauses((current) => {
        const withoutSameNumber = current.filter((item) => item.number !== clause.number)
        return dedupeClauses([...withoutSameNumber, clause])
      })
    }
    setStatus('editing')
    const targetKey = clause.key ?? `added-${clause.number}`
    setActiveClauseKey(targetKey)
    const focusAddedClause = () => document.getElementById(`policy-clause-${targetKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(focusAddedClause, 180)
    window.setTimeout(focusAddedClause, 520)
    if (message) setToast(message)
  }

  const applyArticleDraftToDocument = (draftKey: string, draftText: string, message?: string) => {
    setArticleDrafts((current) => ({ ...current, [draftKey]: draftText }))
    setStatus('editing')
    setActiveClauseKey(draftKey)
    window.setTimeout(() => {
      document.getElementById(`policy-clause-${draftKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 180)
    if (message) setToast(message)
  }

  const startTyping = (reply: Reply) => {
    if (typingTimerRef.current !== null) window.clearInterval(typingTimerRef.current)
    if (pendingAssistantMessageIdRef.current) {
      setMessages((current) => current.filter((message) => message.id !== pendingAssistantMessageIdRef.current))
    }
    messageCounterRef.current += 1
    const assistantMessageId = `assistant-${messageCounterRef.current}`
    pendingAssistantMessageIdRef.current = assistantMessageId
    setMessages((current) => [...current, { id: assistantMessageId, role: 'assistant', text: '', isTyping: true }])
    let index = 0
    typingTimerRef.current = window.setInterval(() => {
      index += 1
      const partialText = reply.text.slice(0, index)
      setMessages((current) => current.map((message) => (
        message.id === assistantMessageId
          ? { ...message, text: partialText, isTyping: index < reply.text.length }
          : message
      )))
      if (index >= reply.text.length) {
        if (typingTimerRef.current !== null) window.clearInterval(typingTimerRef.current)
        typingTimerRef.current = null
        pendingAssistantMessageIdRef.current = null
        setMessages((current) => current.map((message) => (
          message.id === assistantMessageId
            ? { ...message, text: reply.text, action: reply.action, isTyping: false }
            : message
        )))
        if (reply.draftKey && reply.draftText) {
          applyArticleDraftToDocument(reply.draftKey, reply.draftText, '제4조 보상하지 않는 손해가 수정되었습니다')
          window.setTimeout(() => setToast(''), 2400)
        } else if (reply.applyClause) {
          applyClauseToDraft(reply.applyClause, '약관 수정 페이지에 신규 조항이 반영되었습니다')
          window.setTimeout(() => setToast(''), 2400)
        }
        scrollToClause(reply.clause)
      }
    }, CHAT_TYPE_INTERVAL_MS)
  }

  const buildReply = (value: string): Reply => {
    return createAssistantReply(value)
  }

  const ask = () => {
    const value = question.trim()
    if (!value || isReading) return
    if (responseTimerRef.current !== null) window.clearTimeout(responseTimerRef.current)
    setQuestion('')
    messageCounterRef.current += 1
    setMessages((current) => [...current, { id: `user-${messageCounterRef.current}`, role: 'user', text: value }])
    setIsReading(true)
    const isFollowUp = /^\s*(그 내용|그 조항|방금|직전|관련 내용|넣어줘|반영해줘|문서에 넣어줘)/.test(value)
    if (!isFollowUp) lastQuestionRef.current = value
    pendingReplyRef.current = buildReply(value)
    responseTimerRef.current = window.setTimeout(() => {
      setIsReading(false)
      if (pendingReplyRef.current) startTyping(pendingReplyRef.current)
      pendingReplyRef.current = null
      responseTimerRef.current = null
    }, CHAT_THINKING_MS)
  }

  const handleAction = (action: Message['action']) => {
    if (action === 'draft') {
      respond(`다음과 같이 '${generatedClause.number}조(${generatedClause.title})' 조항 초안을 작성했습니다.\n\n> '${generatedClause.number}조(${generatedClause.title}) ${generatedClause.text}'\n\n이 문안은 ${reportTitle}의 보장 대상·사건·손해 범위를 반영한 검토용 초안이며, 최종 책임 범위는 법무·보상 검토가 필요합니다.`, 'apply')
    } else if (action === 'apply') {
      applyClauseToDraft(generatedClause)
      respond(`제${generatedClause.number}조를 ${reportTitle} 약관 문서 하단에 반영했습니다. 노란색 하이라이트로 변경된 부분을 확인한 뒤 저장해 주세요.`)
    }
  }

  const save = async () => {
    if (!entry) return
    if (!reportProxy.saveReportContent) {
      setToast('저장 기능을 사용할 수 없습니다. 저장 연결을 확인해 주세요.')
      return
    }
    const nextEditor: WordingPolicyEditor = {
      articleDrafts,
      addedArticles: dedupeClauses(addedClauses).map((clause) => ({
        number: clause.number,
        title: clause.title,
        text: clause.text,
        sectionId: clause.sectionId ?? null,
        insertAfter: clause.insertAfter ?? clause.number - 1,
      })),
      updatedAt: new Date().toISOString(),
    }
    const nextReport: ReportResult = {
      ...entry.report,
      meta: {
        ...entry.report.meta,
        revision: (entry.report.meta.revision ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      },
      wordingFeasibility: { ...entry.report.wordingFeasibility, policyEditor: nextEditor },
    }
    try {
      if (onSavePolicyEditor) {
        const saved = await onSavePolicyEditor(nextEditor)
        if (!saved) throw new Error('save-failed')
      } else {
        await reportProxy.saveReportContent({
          reportId: entry.report.meta.sourceRiskId,
          content: nextReport,
        })
        const stored = await reportProxy.getReportContent?.(entry.report.meta.sourceRiskId)
        const storedRecord = stored && typeof stored === 'object' ? stored as Record<string, unknown> : null
        const storedContent = storedRecord?.content && typeof storedRecord.content === 'object' ? storedRecord.content as Record<string, unknown> : storedRecord
        const storedWording = storedContent?.wordingFeasibility
        const storedPolicyEditor = storedWording && typeof storedWording === 'object' ? (storedWording as Record<string, unknown>).policyEditor : undefined
        if (stored !== null && stored !== undefined && !storedPolicyEditor) throw new Error('save-verification-failed')
      }
      setEntry((current) => current ? { ...current, report: nextReport } : current)
      setArticleDrafts(nextEditor.articleDrafts)
      setStatus('saved')
      setToast('성공적으로 저장되었습니다')
      window.setTimeout(() => setToast(''), 2400)
    } catch {
      setToast('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  const discardAndLeave = () => {
    if (onClose) onClose()
    else navigate(`/reports?reportId=${encodeURIComponent(entry?.report.meta.sourceRiskId ?? '')}`)
  }

  if (!entry) return <main className="policy-editor-loading" aria-live="polite">약관 문서를 준비하고 있습니다…</main>

  return (
    <main className="policy-editor" aria-label="AI 약관 편집 화면">
      <header className="policy-editor__header">
        <div><h1>AI 약관 편집</h1></div>
        <button className="policy-editor__back" type="button" onClick={goBack}>리포트로 돌아가기</button>
      </header>
      <div className="policy-editor__split">
        <section className="policy-editor__document-pane" aria-labelledby="policy-editor-document-title">
          <div className="policy-editor__document-toolbar"><div><strong>AI 전체 약관 초안</strong><span className={status === 'editing' ? 'is-editing' : ''}>{status === 'editing' ? '수정 중' : '저장됨'}</span></div><button className="policy-editor__save" type="button" onClick={() => void save()} disabled={status === 'saved'}>저장</button></div>
          <div className="policy-editor__document-layout">
            <nav className="policy-editor__toc" aria-label="약관 목차"><strong>약관 목차</strong>{clauses.map((clause, index) => <a key={clause.key ?? `${clause.number}-${index}`} href={`#policy-clause-${clause.key ?? `${clause.number}-${index}`}`}>제{clause.number}조 {clause.title}</a>)}</nav>
            <article className="policy-editor__paper">
              <header className="policy-editor__cover"><span>FULL POLICY DRAFT</span><h2 id="policy-editor-document-title">{policyTitle}</h2><p>현재 리포트에서 생성된 검토용 약관 · 실무자 확인 필요</p></header>
              <div className="policy-editor__body">{clauses.map((clause, index) => {
                const identity = clauseIdentity(clause, index)
                const isEdited = Boolean(clause.key && articleDrafts[clause.key])
                return <section id={clauseDomId(clause, index)} className={`policy-editor__clause${clause.key?.startsWith('added-') ? ' is-new' : ''}${isEdited ? ' is-edited' : ''}${activeClauseKey === identity ? ' is-active' : ''}`} key={identity}><p className="policy-editor__clause-chapter">{clause.chapter ?? '신규 제안 조항'}</p><div><span>제{clause.number}조</span><h3>{clause.title}</h3></div><p>{clause.text}</p>{isEdited ? <small>AI 수정 반영 · 저장 전 검토 필요</small> : clause.key?.startsWith('added-') ? <small>AI 반영 · 저장 전 검토 필요</small> : null}</section>
              })}</div>
            </article>
          </div>
        </section>
        <section className="policy-editor__chat-pane" aria-labelledby="policy-chat-title">
          <div className="policy-editor__chat-heading"><span className="policy-editor__ai-mark">AI</span><div><h2 id="policy-chat-title">약관 AI Chat</h2><p>조항을 검색하고, 검토용 문구를 함께 다듬어 보세요.</p></div></div>
          <div className="policy-editor__messages" role="log" aria-live="polite">
            {messages.map((message) => (
              <article className={`policy-editor__message is-${message.role}${message.isTyping ? ' is-typing' : ''}`} key={message.id}>
                <span>{message.role === 'user' ? '실무자' : 'AI 약관 편집'}</span>
                <p>{message.text}{message.isTyping ? <i aria-hidden="true" /> : null}</p>
                {message.action ? <button type="button" className="policy-editor__message-action" onClick={() => handleAction(message.action)}>{message.action === 'draft' ? '관련 약관 만들어 보기' : '약관 수정해드릴까요?'}</button> : null}
              </article>
            ))}
            {isReading ? <article className="policy-editor__message is-assistant is-reading"><span>AI 약관 편집</span><p><i aria-hidden="true" />생각하는 중입니다</p></article> : null}
            <div ref={chatEndRef} aria-hidden="true" />
          </div>
          <form className="policy-editor__composer" onSubmit={(event) => { event.preventDefault(); ask() }}><label htmlFor="policy-chat-input">약관에 대해 질문하기</label><div><input id="policy-chat-input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="예: 환불 관련 규정 알려줘" disabled={isReading} /><button type="submit" disabled={isReading}>{isReading ? '읽는 중' : '전송'}</button></div></form>
        </section>
      </div>
      {toast ? <div className="policy-editor__toast" role="status">{toast}</div> : null}
      {leaveOpen ? <div className="policy-editor__modal-backdrop" role="presentation"><section className="policy-editor__modal" role="dialog" aria-modal="true" aria-labelledby="leave-title"><h2 id="leave-title">저장하지 않은 내용이 있습니다. 그래도 나가시겠습니까?</h2><div><button type="button" onClick={() => setLeaveOpen(false)}>취소</button><button type="button" className="is-danger" onClick={discardAndLeave}>저장 않고 나가기</button></div></section></div> : null}
    </main>
  )
}
