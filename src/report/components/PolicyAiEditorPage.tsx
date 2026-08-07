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

type Clause = { key?: string; number: number; title: string; text: string; chapter?: string }
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
  })))
  const special = policy.specialClauses.flatMap((clause) => clause.articles.map((article) => ({
    key: `special-${clause.id}-${article.number}`,
    number: article.number,
    title: article.title,
    text: articleText(article),
    chapter: clause.title,
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
  const pendingAssistantMessageIdRef = useRef<string | null>(null)
  const messageCounterRef = useRef(0)

  useEffect(() => () => {
    if (responseTimerRef.current !== null) window.clearTimeout(responseTimerRef.current)
    if (typingTimerRef.current !== null) window.clearInterval(typingTimerRef.current)
  }, [])

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
  const clauses = [...reportClauses, ...addedClauses]
  const policyTitle = entry ? createArticlePolicyDraft(asReportView(entry.report)).documentTitle : '서비스 이용 약관'
  const reportTitle = entry?.report.meta.title ?? 'AI 약관 편집'
  const specialClauseNumbers = clauses
    .filter((clause) => clause.chapter?.includes('특별약관'))
    .map((clause) => clause.number)
  const nextArticleNumber = (specialClauseNumbers.length ? specialClauseNumbers : clauses.map((clause) => clause.number))
    .reduce((highest, number) => Math.max(highest, number), 0) + 1
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
  ]

  const createAssistantReply = (value: string): Reply => {
    const scripted = scenarioScripts.find((item) => item.prompt === value)
    if (scripted) return { text: scripted.answer, clause: scripted.clause, applyClause: scripted.applyClause, draftKey: scripted.draftKey, draftText: scripted.draftText }

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
    const existsInAdded = addedClauses.some((item) => isSameClause(item, clause))
    if (!existsInReport && !existsInAdded) {
      setAddedClauses((current) => dedupeClauses([...current, clause]))
      setStatus('editing')
    }
    const targetKey = clause.key ?? `added-${clause.number}`
    setActiveClauseKey(targetKey)
    window.setTimeout(() => {
      document.getElementById(`policy-clause-${targetKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 180)
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
      addedArticles: dedupeClauses(addedClauses),
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
        <div><span className="policy-editor__kicker">INSURANCE WORDING STUDIO</span><h1>AI 약관 편집</h1><p>{reportTitle} · 저장된 문서를 기반으로 편집합니다.</p></div>
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
          </div>
          <form className="policy-editor__composer" onSubmit={(event) => { event.preventDefault(); ask() }}><label htmlFor="policy-chat-input">약관에 대해 질문하기</label><div><input id="policy-chat-input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="예: 환불 관련 규정 알려줘" disabled={isReading} /><button type="submit" disabled={isReading}>{isReading ? '읽는 중' : '전송'}</button></div></form>
        </section>
      </div>
      {toast ? <div className="policy-editor__toast" role="status">{toast}</div> : null}
      {leaveOpen ? <div className="policy-editor__modal-backdrop" role="presentation"><section className="policy-editor__modal" role="dialog" aria-modal="true" aria-labelledby="leave-title"><h2 id="leave-title">저장하지 않은 내용이 있습니다. 그래도 나가시겠습니까?</h2><div><button type="button" onClick={() => setLeaveOpen(false)}>취소</button><button type="button" className="is-danger" onClick={discardAndLeave}>저장 않고 나가기</button></div></section></div> : null}
    </main>
  )
}
