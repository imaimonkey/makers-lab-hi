import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  llmUtilityDefinitions,
  readSharedSystemPrompts,
  runLlmUtility,
  saveSharedSystemPrompt,
  buildFilePromptContext,
  parsePromptFile,
  saveUtil0RiskDiscovery,
  readDeveloperPromptFile,
} from '../../features/llm-util'
import type { LlmRunResult, LlmUtilityId, SharedSystemPromptMap, UploadedPromptFile } from '../../features/llm-util'
import {
  buildNewsClassificationPrompt,
  bindNewsGroupsToSourceItems,
  collectNaverNews,
  createNewsSourceRecords,
  defaultNaverNewsSearchKeywords,
  parseNewsClassificationOutput,
  readNaverNewsSearchConfig,
  readNewsClassificationStore,
  searchNaverNews,
  saveNewsClassification,
  saveNaverNewsSearchConfig,
  saveUtil1ManualTestRun,
} from '../../features/news-intake'
import type { NewsClassificationStore, NewsRiskGroupRecord } from '../../domain/risk/newsSignal'
import type { NaverNewsItem, NaverNewsSearchConfig } from '../../features/news-intake'
import { AppIcon } from '../../shared/components/AppIcon'
import { PageHeader } from '../../shared/components/PageHeader'

const defaultUtilityId: LlmUtilityId = 'util-0'
const isMockMode = import.meta.env.VITE_LLM_USE_MOCK === 'true'
const showDeveloperNewsPanel = import.meta.env.VITE_SHOW_DEVELOPER_NEWS_PANEL === 'true'

type RunPromptSource = 'markdown' | 'shared' | 'browser'

function createInitialSharedPromptMap() {
  return Object.fromEntries(
    llmUtilityDefinitions.map((utility) => [utility.id, {
      text: utility.defaultSystemPrompt,
      updatedAt: null,
      source: 'markdown' as const,
    }]),
  ) as SharedSystemPromptMap
}

function createInitialSystemPromptDrafts() {
  return Object.fromEntries(
    llmUtilityDefinitions.map((utility) => [utility.id, utility.defaultSystemPrompt]),
  ) as Record<LlmUtilityId, string>
}

function promptSourceLabel(source: RunPromptSource) {
  if (source === 'browser') return '현재 수정 초안'
  if (source === 'shared') return '공유 서버 저장본'
  return 'system-prompt.md 기본값'
}

function stripNaverMarkup(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function createNewsTestInput(item: NaverNewsItem) {
  return [
    '[NAVER NEWS]',
    `제목: ${stripNaverMarkup(item.title)}`,
    `발행일: ${item.pubDate}`,
    `원문: ${item.originallink || item.link}`,
    `내용 요약: ${stripNaverMarkup(item.description)}`,
  ].join('\n')
}

function parseRiskDiscoveryJson(text: string) {
  const normalized = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const parsed: unknown = JSON.parse(normalized)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('util-0 결과가 객체 JSON 형식이 아닙니다.')
  return parsed as Record<string, unknown>
}


export function DeveloperTestPage() {
  const [selectedUtilityId, setSelectedUtilityId] = useState<LlmUtilityId>(defaultUtilityId)
  const [sharedPrompts, setSharedPrompts] = useState<SharedSystemPromptMap>(createInitialSharedPromptMap)
  const [systemPromptDrafts, setSystemPromptDrafts] = useState(createInitialSystemPromptDrafts)
  const [testInput, setTestInput] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedPromptFile[]>([])
  const [fileUploadError, setFileUploadError] = useState('')
  const [isParsingFiles, setIsParsingFiles] = useState(false)
  const [result, setResult] = useState<LlmRunResult | null>(null)
  const [lastRunSystemPrompt, setLastRunSystemPrompt] = useState<{ text: string; source: RunPromptSource } | null>(null)
  const [lastRunTestInput, setLastRunTestInput] = useState('')
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSharedPromptLoading, setIsSharedPromptLoading] = useState(true)
  const [newsSearchConfig, setNewsSearchConfig] = useState<NaverNewsSearchConfig>({
    keywords: [...defaultNaverNewsSearchKeywords],
    updatedAt: null,
    source: 'default',
  })
  const [newsKeywordDrafts, setNewsKeywordDrafts] = useState<string[]>([...defaultNaverNewsSearchKeywords])
  const [newNewsKeyword, setNewNewsKeyword] = useState('')
  const [newsConfigMessage, setNewsConfigMessage] = useState('')
  const [newsConfigError, setNewsConfigError] = useState('')
  const [isNewsSearchConfigLoading, setIsNewsSearchConfigLoading] = useState(true)
  const [isNewsSearchConfigSaving, setIsNewsSearchConfigSaving] = useState(false)
  const [naverClientId, setNaverClientId] = useState('')
  const [naverClientSecret, setNaverClientSecret] = useState('')
  const [selectedNewsKeyword, setSelectedNewsKeyword] = useState<string>(defaultNaverNewsSearchKeywords[0] ?? '')
  const [newsResults, setNewsResults] = useState<NaverNewsItem[]>([])
  const [newsSearchTotal, setNewsSearchTotal] = useState(0)
  const [newsResultsLabel, setNewsResultsLabel] = useState('')
  const [newsCollectionFailures, setNewsCollectionFailures] = useState<string[]>([])
  const [newsSearchError, setNewsSearchError] = useState('')
  const [isNewsSearching, setIsNewsSearching] = useState(false)
  const [isNewsCollecting, setIsNewsCollecting] = useState(false)
  const [isNewsClassifying, setIsNewsClassifying] = useState(false)
  const [storedNewsGroups, setStoredNewsGroups] = useState<NewsRiskGroupRecord[]>([])
  const [newsStoreSnapshot, setNewsStoreSnapshot] = useState<NewsClassificationStore | null>(null)
  const [isNewsStoreViewerOpen, setIsNewsStoreViewerOpen] = useState(false)
  const [isNewsStoreLoading, setIsNewsStoreLoading] = useState(false)
  const [newsStoreViewerError, setNewsStoreViewerError] = useState('')
  const [isUtil1ManualTestSaving, setIsUtil1ManualTestSaving] = useState(false)
  const [util1ManualTestSaveMessage, setUtil1ManualTestSaveMessage] = useState('')
  const [util1ManualTestSaveError, setUtil1ManualTestSaveError] = useState('')
  const [util0ExportMessage, setUtil0ExportMessage] = useState('')

  const selectedUtility = llmUtilityDefinitions.find((utility) => utility.id === selectedUtilityId)
    ?? llmUtilityDefinitions[0]
  const sharedPrompt = sharedPrompts[selectedUtility.id]
  const systemPrompt = systemPromptDrafts[selectedUtility.id] ?? selectedUtility.defaultSystemPrompt
  const isSystemPromptDirty = systemPrompt.trim() !== sharedPrompt.text.trim()
  const currentPromptSource: RunPromptSource = isSystemPromptDirty ? 'browser' : sharedPrompt.source === 'shared' ? 'shared' : 'markdown'
  const markdownPath = `src/features/llm-util/${selectedUtility.id}/system-prompt.md`
  const isNewsSearchConfigDirty = JSON.stringify(newsKeywordDrafts) !== JSON.stringify(newsSearchConfig.keywords)
  const fileContext = buildFilePromptContext(uploadedFiles)
  const composedSystemPrompt = [systemPrompt.trim(), fileContext].filter(Boolean).join('\n\n')
  const composedTestInput = testInput.trim() || (uploadedFiles.length > 0 ? '업로드된 파일의 내용을 분석하고 핵심 내용을 정리해 주세요.' : '')

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    setIsParsingFiles(true)
    setFileUploadError('')
    try {
      const parsed = await Promise.all(files.map(parsePromptFile))
      setUploadedFiles((current) => [...current, ...parsed.filter((file) => !current.some((item) => item.id === file.id))])
    } catch (caught) {
      setFileUploadError(caught instanceof Error ? caught.message : '파일을 읽지 못했습니다.')
    } finally {
      setIsParsingFiles(false)
    }
  }

  const handleRemoveFile = (id: string) => setUploadedFiles((current) => current.filter((file) => file.id !== id))

  useEffect(() => {
    let isActive = true

    readSharedSystemPrompts()
      .then((prompts) => {
        if (!isActive) return
        setSharedPrompts(prompts)
        setSystemPromptDrafts(Object.fromEntries(
          llmUtilityDefinitions.map((utility) => [utility.id, prompts[utility.id].text]),
        ) as Record<LlmUtilityId, string>)
        setSaveMessage('공유 서버 저장소에서 시스템 프롬프트를 불러왔습니다.')
        setError('')
      })
      .catch((caught) => {
        if (!isActive) return
        setSaveMessage('공유 서버에 연결되지 않아 Markdown 기본값으로 동작합니다.')
        setError(caught instanceof Error ? caught.message : '공유 시스템 프롬프트를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (isActive) setIsSharedPromptLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    readNewsClassificationStore()
      .then((store) => {
        if (isActive) {
          setStoredNewsGroups(store.groups)
          setNewsStoreSnapshot(store)
        }
      })
      .catch(() => {
        // The development store is optional until the first classification is saved.
      })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    readNaverNewsSearchConfig()
      .then((config) => {
        if (!isActive) return
        setNewsSearchConfig(config)
        setNewsKeywordDrafts(config.keywords)
        setSelectedNewsKeyword((current) => config.keywords.includes(current) ? current : config.keywords[0] ?? '')
        setNewsConfigMessage(config.source === 'shared'
          ? '공유 서버에 저장된 네이버 뉴스 검색어를 불러왔습니다.'
          : '기본 네이버 뉴스 검색어를 사용합니다.')
        setNewsConfigError('')
      })
      .catch((caught) => {
        if (!isActive) return
        setNewsConfigMessage('공유 서버에 연결되지 않아 기본 검색어를 사용합니다.')
        setNewsConfigError(caught instanceof Error ? caught.message : '네이버 뉴스 검색어를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (isActive) setIsNewsSearchConfigLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  const persistCurrentPrompt = useCallback(async () => {
    const normalizedPrompt = systemPrompt.trim()
    if (!normalizedPrompt) {
      setError('시스템 프롬프트를 입력해 주세요.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const saved = await saveSharedSystemPrompt(selectedUtility.id, normalizedPrompt)
      setSharedPrompts((current) => ({ ...current, [selectedUtility.id]: saved }))
      setSystemPromptDrafts((current) => current[selectedUtility.id]?.trim() === normalizedPrompt
        ? { ...current, [selectedUtility.id]: saved.text }
        : current)
      setSaveMessage(`${selectedUtility.label} 시스템 프롬프트를 공유 서버에 저장했습니다.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '공유 시스템 프롬프트 저장에 실패했습니다.')
      setSaveMessage('')
    } finally {
      setIsSaving(false)
    }
  }, [selectedUtility.id, selectedUtility.label, systemPrompt])

  const handleNewsKeywordChange = (index: number, value: string) => {
    const previousKeyword = newsKeywordDrafts[index]
    setNewsKeywordDrafts((current) => current.map((keyword, keywordIndex) => keywordIndex === index ? value : keyword))
    if (previousKeyword === selectedNewsKeyword) setSelectedNewsKeyword(value)
    setNewsConfigMessage('검색어가 수정되었습니다. 저장 버튼을 눌러 공유하세요.')
    setNewsConfigError('')
  }

  const handleAddNewsKeyword = () => {
    const normalizedKeyword = newNewsKeyword.trim()
    if (!normalizedKeyword) {
      setNewsConfigError('추가할 검색어를 입력해 주세요.')
      return
    }
    if (newsKeywordDrafts.some((keyword) => keyword.trim() === normalizedKeyword)) {
      setNewsConfigError('이미 등록된 검색어입니다.')
      return
    }
    if (newsKeywordDrafts.length >= 50) {
      setNewsConfigError('검색어는 최대 50개까지 등록할 수 있습니다.')
      return
    }

    setNewsKeywordDrafts((current) => [...current, normalizedKeyword])
    if (!selectedNewsKeyword) setSelectedNewsKeyword(normalizedKeyword)
    setNewNewsKeyword('')
    setNewsConfigMessage('검색어가 추가되었습니다. 저장 버튼을 눌러 공유하세요.')
    setNewsConfigError('')
  }

  const handleRemoveNewsKeyword = (index: number) => {
    const removedKeyword = newsKeywordDrafts[index]
    const nextKeywords = newsKeywordDrafts.filter((_, keywordIndex) => keywordIndex !== index)
    setNewsKeywordDrafts(nextKeywords)
    if (removedKeyword === selectedNewsKeyword) setSelectedNewsKeyword(nextKeywords[0] ?? '')
    setNewsConfigMessage('검색어가 삭제되었습니다. 저장 버튼을 눌러 공유하세요.')
    setNewsConfigError('')
  }

  const handleRestoreDefaultNewsKeywords = () => {
    setNewsKeywordDrafts([...defaultNaverNewsSearchKeywords])
    setSelectedNewsKeyword((current) => defaultNaverNewsSearchKeywords.some((keyword) => keyword === current)
      ? current
      : defaultNaverNewsSearchKeywords[0] ?? '')
    setNewsConfigMessage('기본 검색어로 복원했습니다. 저장 버튼을 눌러 공유하세요.')
    setNewsConfigError('')
  }

  const persistNewsSearchConfig = async () => {
    const normalizedKeywords = [...new Set(newsKeywordDrafts.map((keyword) => keyword.trim()).filter(Boolean))]
    if (!normalizedKeywords.length) {
      setNewsConfigError('검색어를 하나 이상 입력해 주세요.')
      return
    }

    setIsNewsSearchConfigSaving(true)
    setNewsConfigError('')

    try {
      const saved = await saveNaverNewsSearchConfig(normalizedKeywords)
      setNewsSearchConfig(saved)
      setNewsKeywordDrafts(saved.keywords)
      setNewsConfigMessage('네이버 뉴스 검색어를 공유 서버에 저장했습니다.')
    } catch (caught) {
      setNewsConfigError(caught instanceof Error ? caught.message : '네이버 뉴스 검색어 저장에 실패했습니다.')
      setNewsConfigMessage('')
    } finally {
      setIsNewsSearchConfigSaving(false)
    }
  }

  const handleSearchNaverNews = async () => {
    setNewsSearchError('')
    setNewsResults([])
    setNewsSearchTotal(0)
    setNewsResultsLabel(selectedNewsKeyword)
    setNewsCollectionFailures([])

    if (!naverClientId.trim() || !naverClientSecret.trim()) {
      setNewsSearchError('네이버 Client ID와 Client Secret을 입력해 주세요.')
      return
    }
    if (!selectedNewsKeyword.trim()) {
      setNewsSearchError('검색어를 선택해 주세요.')
      return
    }

    setIsNewsSearching(true)

    try {
      const response = await searchNaverNews({
        clientId: naverClientId,
        clientSecret: naverClientSecret,
        query: selectedNewsKeyword,
        display: 20,
      })
      setNewsResults(response.items)
      setNewsSearchTotal(response.total)
      setNewsResultsLabel(selectedNewsKeyword)
      if (!response.items.length) setNewsSearchError('검색 결과가 없습니다.')
    } catch (caught) {
      setNewsSearchError(caught instanceof Error ? caught.message : '네이버 뉴스 검색에 실패했습니다.')
    } finally {
      setIsNewsSearching(false)
    }
  }

  const handleCollectNaverNews = async () => {
    setNewsSearchError('')
    setNewsResults([])
    setNewsSearchTotal(0)
    setNewsResultsLabel('전체 검색어')
    setNewsCollectionFailures([])

    if (!naverClientId.trim() || !naverClientSecret.trim()) {
      setNewsSearchError('네이버 Client ID와 Client Secret을 입력해 주세요.')
      return
    }
    const keywords = newsKeywordDrafts.map((keyword) => keyword.trim()).filter(Boolean)
    if (!keywords.length) {
      setNewsSearchError('수집할 검색어가 없습니다.')
      return
    }

    setIsNewsCollecting(true)

    try {
      const response = await collectNaverNews({
        clientId: naverClientId,
        clientSecret: naverClientSecret,
        keywords,
        display: 10,
      })
      setNewsResults(response.items)
      setNewsSearchTotal(response.articleCount)
      setNewsResultsLabel(`검색어 ${response.keywordCount}개 전체`)
      setNewsCollectionFailures(response.failures.map((failure) => `${failure.query}: ${failure.message}`))
      if (!response.items.length) setNewsSearchError('수집된 뉴스가 없습니다.')
    } catch (caught) {
      setNewsSearchError(caught instanceof Error ? caught.message : '네이버 뉴스 정보 수집에 실패했습니다.')
    } finally {
      setIsNewsCollecting(false)
    }
  }

  const handleClassifyNews = async () => {
    setNewsSearchError('')
    setError('')

    if (isSharedPromptLoading) {
      setNewsSearchError('공유 시스템 프롬프트를 불러오는 중입니다.')
      return
    }
    if (!newsResults.length) {
      setNewsSearchError('먼저 뉴스를 검색하거나 수집해 주세요.')
      return
    }

    const sourceItems = createNewsSourceRecords(newsResults.slice(0, 30))
    const prompt = buildNewsClassificationPrompt(sourceItems, storedNewsGroups)
    setIsNewsClassifying(true)
    setLastRunSystemPrompt({ text: composedSystemPrompt, source: currentPromptSource })
    setLastRunTestInput(prompt)
    setResult(null)

    try {
      const step1Prompt = await readDeveloperPromptFile('step1', '01-news-risk-clustering.md')
      setLastRunSystemPrompt({ text: step1Prompt.text, source: 'shared' })
      const response = await runLlmUtility({
        utilityId: 'util-1',
        systemPrompt: step1Prompt.text,
        prompt,
      })
      if (response.mode === 'mock') throw new Error('개발자 화면에서는 mock Step 1 결과를 저장하지 않습니다. Gemini 또는 Potens 연결을 확인하세요.')
      const classificationText = response.text
      setResult(response)

      const parsed = parseNewsClassificationOutput(classificationText)
      const groups = bindNewsGroupsToSourceItems(parsed.groups, sourceItems)
      const saved = await saveNewsClassification({
        sourceItems,
        groups,
        rawOutput: classificationText,
        generatedAt: response.generatedAt,
        mode: response.mode,
        model: response.model,
      })
      setStoredNewsGroups(saved.store.groups)
      setNewsStoreSnapshot(saved.store)
      setNewsConfigMessage(`${sourceItems.length}건을 ${parsed.groups.length}개 동적 위험 묶음으로 분류하고 저장했습니다.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '뉴스 분류·저장에 실패했습니다.')
    } finally {
      setIsNewsClassifying(false)
    }
  }

  const handleOpenNewsStoreViewer = async () => {
    setIsNewsStoreViewerOpen(true)
    setIsNewsStoreLoading(true)
    setNewsStoreViewerError('')

    try {
      const store = await readNewsClassificationStore(true)
      setNewsStoreSnapshot(store)
      setStoredNewsGroups(store.groups)
    } catch (caught) {
      setNewsStoreViewerError(caught instanceof Error ? caught.message : '저장된 뉴스 분류 데이터를 불러오지 못했습니다.')
    } finally {
      setIsNewsStoreLoading(false)
    }
  }

  const handleSaveUtil1ManualTest = async () => {
    setUtil1ManualTestSaveMessage('')
    setUtil1ManualTestSaveError('')

    if (!result || !lastRunSystemPrompt || !lastRunTestInput) {
      setUtil1ManualTestSaveError('먼저 기능 1번 테스트 입력을 실행해 주세요.')
      return
    }

    setIsUtil1ManualTestSaving(true)

    try {
      await saveUtil1ManualTestRun({
        systemPrompt: lastRunSystemPrompt.text,
        prompt: lastRunTestInput,
        result,
      })
      setUtil1ManualTestSaveMessage('기능 1번 수동 입력과 AI 응답을 저장했습니다. 위험 묶음으로 자동 승격하지 않습니다.')
    } catch (caught) {
      setUtil1ManualTestSaveError(caught instanceof Error ? caught.message : '기능 1번 수동 입력 저장에 실패했습니다.')
    } finally {
      setIsUtil1ManualTestSaving(false)
    }
  }

  const handleExportUtil0Result = async () => {
    setUtil0ExportMessage('')
    if (!result) return
    try {
      const data = parseRiskDiscoveryJson(result.text)
      const saved = await saveUtil0RiskDiscovery(data, result.generatedAt, result.mode)
      setUtil0ExportMessage(`서버 엑셀 저장 완료 · ${saved.file ?? 'util-0-risk-discovery.xlsx'}`)
    } catch (caught) {
      setUtil0ExportMessage(caught instanceof Error ? `엑셀 저장 실패: ${caught.message}` : '엑셀 저장에 실패했습니다.')
    }
  }

  const handleUseNewsItemForAi = (item: NaverNewsItem) => {
    setTestInput(createNewsTestInput(item))
    setResult(null)
    setError('')
    setNewsConfigMessage('선택한 기사를 AI 1 테스트 입력에 넣었습니다. 아래 실행 버튼으로 분석하세요.')
    setNewsSearchError('')
  }

  const handleUtilitySelect = (utilityId: LlmUtilityId) => {
    if (!llmUtilityDefinitions.some((utility) => utility.id === utilityId)) return

    setSelectedUtilityId(utilityId)
    setResult(null)
    setLastRunSystemPrompt(null)
    setLastRunTestInput('')
    setError('')
    setSaveMessage('')
    setIsNewsStoreViewerOpen(false)
    setUtil1ManualTestSaveMessage('')
    setUtil1ManualTestSaveError('')
  }

  const handleSystemPromptChange = (value: string) => {
    setSystemPromptDrafts((current) => ({ ...current, [selectedUtility.id]: value }))
    setSaveMessage('수정 중입니다. 저장 버튼을 누르면 다른 사용자와 공유됩니다.')
    setError('')
  }

  const handleRestoreSharedPrompt = async () => {
    setIsSharedPromptLoading(true)

    try {
      const prompts = await readSharedSystemPrompts(true)
      setSharedPrompts(prompts)
      setSystemPromptDrafts((current) => ({ ...current, [selectedUtility.id]: prompts[selectedUtility.id].text }))
      setSaveMessage('최신 공유 서버 저장본으로 복원했습니다.')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '공유 저장본을 다시 불러오지 못했습니다.')
    } finally {
      setIsSharedPromptLoading(false)
    }
  }

  const handleRun = async () => {
    setError('')
    setResult(null)
    setUtil1ManualTestSaveMessage('')
    setUtil1ManualTestSaveError('')

    if (isSharedPromptLoading) {
      setError('공유 시스템 프롬프트를 불러오는 중입니다.')
      return
    }

    if (!systemPrompt.trim()) {
      setError('시스템 프롬프트를 입력해 주세요.')
      return
    }

    if (!composedTestInput) {
      setError('사용자 테스트 입력을 입력해 주세요.')
      return
    }

    setIsRunning(true)
    setLastRunSystemPrompt({ text: composedSystemPrompt, source: currentPromptSource })
    setLastRunTestInput(composedTestInput)

    try {
      const response = await runLlmUtility({
        utilityId: selectedUtility.id,
        systemPrompt: composedSystemPrompt,
        prompt: composedTestInput,
      })
      setResult(response)
      if (selectedUtility.id === 'util-0') {
        try {
          const saved = await saveUtil0RiskDiscovery(parseRiskDiscoveryJson(response.text), response.generatedAt, response.mode)
          setUtil0ExportMessage(`서버 엑셀 자동 저장 완료 · ${saved.file ?? 'data/util-0-risk-discovery.xlsx'}`)
        } catch (caught) {
          setUtil0ExportMessage(caught instanceof Error ? `서버 엑셀 저장 실패: ${caught.message}` : '서버 엑셀 저장에 실패했습니다.')
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="page developer-test-page">
      <PageHeader
        step="AI"
        eyebrow="DEVELOPER MODE / LLM UTILITIES"
        title="개발자 테스트"
        description="AI별 시스템 프롬프트를 실험하고 공유 서버에 저장하는 입출력 워크벤치입니다."
        status="AI TEST MODE"
        updatedAt="공유 저장소 · 개발환경"
      />

      <div className="sample-notice developer-test-notice">
        <span>{isMockMode ? 'MOCK' : 'GEMINI'}</span>
        {isMockMode
          ? '현재 Mock 응답 모드입니다. 분류·저장 결과는 SAMPLE로 표시되며 실제 위험 판단에 사용하지 않습니다.'
          : '서버 전용 Gemini 프록시로 공유 시스템 프롬프트와 테스트 입력을 각각 전달합니다. 결과는 반드시 실무자가 검토합니다.'}
      </div>
      <nav className="developer-workflow-nav" aria-label="개발자 분석 흐름">
        <span className="active">01 · 신호 수집·분류</span><Link to="/developer-test/risks">02 · 위험 후보 분석 →</Link><span>03 · 위험 상세</span><span>04 · 종합 리포트</span>
      </nav>

      <section className="developer-utility-switcher surface-card" aria-label="LLM 유틸리티 선택">
        <div className="developer-switcher-heading">
          <div>
            <p className="eyebrow">UTILITY DIRECTORY</p>
            <h2>실험할 AI 선택</h2>
          </div>
          <span className="developer-count">{llmUtilityDefinitions.length}개</span>
        </div>
        <div className="developer-utility-tabs" role="tablist" aria-label="LLM 기능 선택">
          {llmUtilityDefinitions.map((utility) => {
            const isActive = utility.id === selectedUtilityId
            return (
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                className={isActive ? 'developer-utility-tab active' : 'developer-utility-tab'}
                onClick={() => handleUtilitySelect(utility.id)}
                key={utility.id}
                disabled={isSharedPromptLoading}
              >
                <span className="developer-utility-icon"><AppIcon name={utility.icon} size={17} /></span>
                <span>
                  <strong>{utility.label}</strong>
                  <small>{utility.caption}</small>
                </span>
                <em>{utility.id.replace('util-', '0')}</em>
              </button>
            )
          })}
        </div>
        <p className="developer-path-note">
          <code>{markdownPath}</code>
          <span>{sharedPrompt.source === 'shared' ? `공유 저장 ${sharedPrompt.updatedAt ? new Date(sharedPrompt.updatedAt).toLocaleString('ko-KR') : ''}` : '공유 저장 전 · Markdown 기본값 사용'}</span>
        </p>
      </section>

      {showDeveloperNewsPanel && selectedUtility.id === 'util-1' && (
        <section className="developer-news-config surface-card" aria-labelledby="developer-util-1-news-config-title">
          <div className="developer-card-heading">
            <div>
              <p className="eyebrow">AI 01 · NEWS SIGNAL INPUT</p>
              <h2 id="developer-util-1-news-config-title">1번 AI 뉴스 수집·분류 설정</h2>
            </div>
            <span className="developer-count">{newsKeywordDrafts.length}개 검색어</span>
          </div>
          <p className="developer-news-config-description">
            1번 신호 정리 AI가 분류할 네이버 뉴스 검색어입니다. 검색어로 뉴스를 수집한 뒤 관측 사실·위험 신호·분류 결과를 저장하는 입력 기준으로 사용합니다.
          </p>

          <div className="developer-news-api-grid">
            <label className="developer-prompt-label" htmlFor="developer-naver-client-id">
              Naver Client ID
              <input
                id="developer-naver-client-id"
                type="text"
                value={naverClientId}
                onChange={(event) => setNaverClientId(event.target.value)}
                placeholder="네이버 애플리케이션 Client ID"
                autoComplete="off"
              />
            </label>
            <label className="developer-prompt-label" htmlFor="developer-naver-client-secret">
              Naver Client Secret
              <input
                id="developer-naver-client-secret"
                type="password"
                value={naverClientSecret}
                onChange={(event) => setNaverClientSecret(event.target.value)}
                placeholder="네이버 애플리케이션 Client Secret"
                autoComplete="new-password"
              />
            </label>
          </div>
          <p className="developer-news-secret-note">API 인증값은 파일이나 공유 저장소에 저장하지 않고 현재 검색 요청에만 사용합니다.</p>

          <div className="developer-news-search-controls">
            <label className="developer-prompt-label" htmlFor="developer-news-search-keyword">
              검색할 키워드
              <select
                id="developer-news-search-keyword"
                value={selectedNewsKeyword}
                onChange={(event) => setSelectedNewsKeyword(event.target.value)}
                disabled={isNewsSearchConfigLoading || isNewsSearching || !newsKeywordDrafts.length}
              >
                {newsKeywordDrafts.map((keyword) => <option value={keyword} key={keyword}>{keyword}</option>)}
              </select>
            </label>
            <div className="developer-news-search-actions">
              <button
                type="button"
                className="secondary-action developer-news-search-button"
                onClick={() => void handleSearchNaverNews()}
                disabled={isNewsSearchConfigLoading || isNewsSearching || isNewsCollecting || !newsKeywordDrafts.length}
              >
                <AppIcon name="scan" size={15} />
                {isNewsSearching ? '검색 중...' : '뉴스 검색'}
              </button>
              <button
                type="button"
                className="primary-action developer-news-search-button"
                onClick={() => void handleCollectNaverNews()}
                disabled={isNewsSearchConfigLoading || isNewsSearching || isNewsCollecting || !newsKeywordDrafts.length}
              >
                <AppIcon name="inbox" size={15} />
                {isNewsCollecting ? '정보 수집 중...' : '정보 수집'}
              </button>
            </div>
          </div>
          {newsSearchError && <p className="developer-inline-error" role="alert">{newsSearchError}</p>}
          {newsCollectionFailures.length > 0 && (
            <p className="developer-inline-error" role="status">일부 검색어 수집 실패: {newsCollectionFailures.join(' · ')}</p>
          )}

          {newsResults.length > 0 && (
            <div className="developer-news-results" aria-live="polite">
                <div className="developer-news-results-heading">
                  <strong>검색 결과 {newsSearchTotal.toLocaleString('ko-KR')}건 중 최근 {newsResults.length}건</strong>
                  <div className="developer-news-results-actions">
                    <span>{newsResultsLabel}</span>
                    <button
                      type="button"
                      className="secondary-action developer-news-classify-button"
                      onClick={() => void handleClassifyNews()}
                      disabled={isNewsClassifying || isNewsSearching || isNewsCollecting}
                    >
                       {isNewsClassifying ? '자동 분류·저장 중...' : '자동 AI 분류·묶음 저장'}
                    </button>
                  </div>
                </div>
              <div className="developer-news-result-list">
                {newsResults.map((item, index) => (
                  <article className="developer-news-result" key={`${item.link}-${index}`}>
                    <a href={item.link} target="_blank" rel="noreferrer">
                      <strong>{stripNaverMarkup(item.title)}</strong>
                    </a>
                    <p>{stripNaverMarkup(item.description)}</p>
                    <div>
                      <small>{item.query ? `${item.query} · ` : ''}{item.pubDate}</small>
                      <button type="button" className="text-button" onClick={() => handleUseNewsItemForAi(item)}>
                        AI 1 입력에 넣기
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {storedNewsGroups.length > 0 && (
                <div className="developer-news-groups">
                  <div className="developer-news-groups-heading">
                    <strong>누적 저장된 AI 위험 묶음</strong>
                    <span>{storedNewsGroups.length}개</span>
                  </div>
                  <div className="developer-news-group-list">
                    {storedNewsGroups.slice(0, 8).map((group) => (
                      <article className="developer-news-group" key={group.groupKey}>
                        <strong>{group.title}</strong>
                        <p>{group.summary || '요약 확인 필요'}</p>
                        <small>{group.dataQuality === 'sample' ? 'SAMPLE · ' : ''}{group.articleCount}건 기사 · 출처 {group.sourceCount}개 · {group.action === 'uncertain' ? '확인 필요' : group.status === 'new' ? '신규 묶음' : '누적 묶음'}</small>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="developer-news-keyword-list">
          {newsKeywordDrafts.map((keyword, index) => (
            <div className="developer-news-keyword-row" key={`${index}-${keyword}`}>
              <label htmlFor={`developer-news-keyword-${index}`}>검색어 {String(index + 1).padStart(2, '0')}</label>
              <input
                id={`developer-news-keyword-${index}`}
                type="text"
                value={keyword}
                onChange={(event) => handleNewsKeywordChange(index, event.target.value)}
                disabled={isNewsSearchConfigLoading || isNewsSearchConfigSaving}
              />
              <button
                type="button"
                className="text-button developer-news-remove-button"
                onClick={() => handleRemoveNewsKeyword(index)}
                disabled={isNewsSearchConfigLoading || isNewsSearchConfigSaving}
              >
                삭제
              </button>
            </div>
          ))}
        </div>

        <div className="developer-news-keyword-add">
          <label className="developer-prompt-label" htmlFor="developer-new-news-keyword">
            검색어 추가
            <small>예: 생성형 AI 저작권, 배터리 열폭주, 소상공인 침수</small>
          </label>
          <div>
            <input
              id="developer-new-news-keyword"
              type="text"
              value={newNewsKeyword}
              onChange={(event) => setNewNewsKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleAddNewsKeyword()
                }
              }}
              placeholder="새 검색어를 입력하세요."
              disabled={isNewsSearchConfigLoading || isNewsSearchConfigSaving}
            />
            <button
              type="button"
              className="secondary-action developer-news-add-button"
              onClick={handleAddNewsKeyword}
              disabled={isNewsSearchConfigLoading || isNewsSearchConfigSaving}
            >
              추가
            </button>
          </div>
        </div>

          <div className="developer-system-prompt-footer developer-news-config-footer">
          <span>
            {isNewsSearchConfigLoading
              ? '공유 검색어 불러오는 중...'
              : `${newsKeywordDrafts.length}개 · ${isNewsSearchConfigDirty ? '저장 필요' : newsSearchConfig.source === 'shared' ? '공유 서버 저장본' : '기본 검색어'}`}
          </span>
            <div>
              <button type="button" className="text-button" onClick={handleRestoreDefaultNewsKeywords} disabled={isNewsSearchConfigLoading || isNewsSearchConfigSaving}>기본값 복원</button>
              <button type="button" className="secondary-action developer-save-button" onClick={() => void handleOpenNewsStoreViewer()} disabled={isNewsStoreLoading}>
                {isNewsStoreLoading ? '불러오는 중...' : '저장 데이터 확인'}
              </button>
              <button type="button" className="secondary-action developer-save-button" onClick={() => void persistNewsSearchConfig()} disabled={isNewsSearchConfigLoading || isNewsSearchConfigSaving || !isNewsSearchConfigDirty}>
                {isNewsSearchConfigSaving ? '저장 중...' : '검색어 저장'}
              </button>
            </div>
          </div>
          {newsConfigMessage && <p className="developer-save-message" role="status">{newsConfigMessage}</p>}
          {newsConfigError && <p className="developer-inline-error" role="alert">{newsConfigError}</p>}

          {isNewsStoreViewerOpen && (
            <section className="developer-news-store-viewer" aria-labelledby="developer-news-store-viewer-title">
              <div className="developer-news-store-viewer-heading">
                <div>
                  <p className="eyebrow">STORED NEWS DATA</p>
                  <h3 id="developer-news-store-viewer-title">저장된 뉴스 분류 데이터</h3>
                </div>
                <button type="button" className="text-button" onClick={() => setIsNewsStoreViewerOpen(false)}>닫기</button>
              </div>

              {newsStoreViewerError && <p className="developer-inline-error" role="alert">{newsStoreViewerError}</p>}
              {isNewsStoreLoading && <p className="developer-store-empty">저장 데이터를 불러오는 중입니다...</p>}
              {!isNewsStoreLoading && !newsStoreViewerError && newsStoreSnapshot && (
                <>
                  <div className="developer-news-store-stats">
                    <span>분류 실행 <strong>{newsStoreSnapshot.runs.length}건</strong></span>
                    <span>위험 묶음 <strong>{newsStoreSnapshot.groups.length}개</strong></span>
                    <span>최근 원문 <strong>{newsStoreSnapshot.runs[0]?.sourceItemCount ?? 0}건</strong></span>
                    <span>갱신 시각 <strong>{newsStoreSnapshot.updatedAt ? new Date(newsStoreSnapshot.updatedAt).toLocaleString('ko-KR') : '저장 없음'}</strong></span>
                  </div>

                  {newsStoreSnapshot.runs[0] ? (
                    <details className="developer-news-store-details">
                      <summary>최근 실행의 구조화 뉴스 보기</summary>
                      <pre>{JSON.stringify(newsStoreSnapshot.runs[0].sourceItems, null, 2)}</pre>
                    </details>
                  ) : (
                    <p className="developer-store-empty">아직 저장된 뉴스 분류 실행이 없습니다.</p>
                  )}

                  <details className="developer-news-store-details">
                    <summary>누적 위험 묶음 보기</summary>
                    <pre>{JSON.stringify(newsStoreSnapshot.groups, null, 2)}</pre>
                  </details>

                  <details className="developer-news-store-details">
                    <summary>전체 저장 JSON 보기</summary>
                    <pre>{JSON.stringify(newsStoreSnapshot, null, 2)}</pre>
                  </details>
                </>
              )}
            </section>
          )}
        </section>
      )}

      <section className="developer-test-grid" aria-label="시스템 프롬프트 입출력 실험">
        {import.meta.env.VITE_SHOW_SYSTEM_PROMPT_UI === 'true' && <section className="developer-prompt-card surface-card">
          <div className="developer-card-heading">
            <div>
              <p className="eyebrow">SYSTEM PROMPT LAB</p>
              <h2>{selectedUtility.label}</h2>
            </div>
            <span className={isSystemPromptDirty ? 'developer-status-dot draft' : 'developer-status-dot'}><i />
              {isSystemPromptDirty ? 'DRAFT' : sharedPrompt.source === 'shared' ? 'SHARED' : 'MARKDOWN'}
            </span>
          </div>
          <p className="developer-utility-description">{selectedUtility.description}</p>
          <label className="developer-prompt-label" htmlFor="developer-system-prompt">
            시스템 프롬프트
            <small>공유 서버에 저장된 이 AI의 역할·출력 형식·금지사항입니다. 사용자 입력과 분리되어 매 실행에 먼저 적용됩니다.</small>
          </label>
          <textarea
            id="developer-system-prompt"
            className="developer-prompt-input developer-system-prompt-input"
            value={systemPrompt}
            onChange={(event) => handleSystemPromptChange(event.target.value)}
            placeholder="이 AI가 항상 따라야 할 역할과 응답 규칙을 입력하세요."
            rows={19}
            disabled={isSharedPromptLoading || isSaving}
          />
          <div className="developer-system-prompt-footer">
            <span>{systemPrompt.length.toLocaleString('ko-KR')}자 · {isSystemPromptDirty ? '저장 필요' : promptSourceLabel(currentPromptSource)}</span>
            <div>
              <button type="button" className="text-button" onClick={() => void handleRestoreSharedPrompt()} disabled={isSharedPromptLoading || isSaving}>공유본 새로고침</button>
              <button type="button" className="secondary-action developer-save-button" onClick={() => void persistCurrentPrompt()} disabled={isSharedPromptLoading || isSaving || !isSystemPromptDirty}>
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
          {saveMessage && <p className="developer-save-message" role="status">{saveMessage}</p>}
        </section>}

        <div className="developer-right-stack">
          <section className="developer-input-card surface-card">
            <div className="developer-card-heading">
              <div>
                <p className="eyebrow">TEST INPUT</p>
                <h2>테스트 입력</h2>
              </div>
              <span className="developer-input-note">USER MESSAGE</span>
            </div>
            <label className="developer-prompt-label" htmlFor="developer-test-input">
              사용자 테스트 입력
              <small>시스템 프롬프트가 처리할 이번 실행의 자료나 질문입니다. 개인정보나 실제 고객 식별정보를 포함하지 마세요.</small>
            </label>
            <textarea
              id="developer-test-input"
              className="developer-prompt-input developer-test-input"
              value={testInput}
              onChange={(event) => setTestInput(event.target.value)}
              placeholder="시스템 프롬프트가 처리할 테스트 자료나 질문을 입력하세요."
              rows={8}
            />
            <div className="developer-file-upload">
              <div className="developer-file-upload-heading">
                <label className="developer-prompt-label" htmlFor="developer-reference-files">참고 파일 업로드
                  <small>PDF, Word, PowerPoint, Excel, 텍스트, 이미지(OCR) 등 여러 파일을 선택하면 파싱해 프롬프트 앞에 포함합니다. 파일은 브라우저에서만 처리합니다.</small>
                </label>
                <label className="secondary-action developer-upload-button" htmlFor="developer-reference-files">
                  {isParsingFiles ? '파싱 중...' : '파일 선택'}
                  <input id="developer-reference-files" type="file" multiple accept=".txt,.md,.markdown,.json,.csv,.tsv,.pdf,.docx,.pptx,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.bmp" onChange={(event) => void handleFileUpload(event)} disabled={isParsingFiles} />
                </label>
              </div>
              {uploadedFiles.length > 0 && <ul className="developer-file-list">{uploadedFiles.map((file) => <li key={file.id}><span>{file.name} · {(file.size / 1024).toFixed(1)} KB</span><button type="button" className="text-button" onClick={() => handleRemoveFile(file.id)}>제거</button></li>)}</ul>}
              {fileUploadError && <p className="developer-inline-error" role="alert">{fileUploadError}</p>}
              {uploadedFiles.length > 0 && <p className="developer-file-context-note">실행 시 포함될 파일 컨텍스트 {fileContext.length.toLocaleString('ko-KR')}자</p>}
            </div>
            <div className="developer-prompt-footer developer-run-footer">
              <span>{composedTestInput.length.toLocaleString('ko-KR')}자 · 파일 {uploadedFiles.length}개 · 시스템 프롬프트에 포함</span>
              <div className="developer-run-actions">
                <button type="button" className="primary-action developer-run-button" onClick={handleRun} disabled={isRunning || isSharedPromptLoading}>
                  <AppIcon name="spark" size={16} />
                  {isRunning ? '실행 중...' : '실행'}
                </button>
                {selectedUtility.id === 'util-1' && (
                  <button type="button" className="secondary-action developer-run-button" onClick={() => void handleSaveUtil1ManualTest()} disabled={isRunning || isUtil1ManualTestSaving || !result}>
                    {isUtil1ManualTestSaving ? '수동 저장 중...' : '수동 입력 결과 저장'}
                  </button>
                )}
              </div>
            </div>
            {selectedUtility.id === 'util-1' && (
              <p className="developer-manual-save-note">수동 저장은 입력·프롬프트·AI 응답만 보관하며 위험 묶음으로 분류하지 않습니다. 뉴스 전체를 자동 분류하려면 위의 자동 AI 분류·묶음 저장을 사용하세요.</p>
            )}
            {util1ManualTestSaveMessage && <p className="developer-save-message" role="status">{util1ManualTestSaveMessage}</p>}
            {util1ManualTestSaveError && <p className="developer-inline-error" role="alert">{util1ManualTestSaveError}</p>}
          </section>

          <section className="developer-result-card surface-card" aria-live="polite">
            <div className="developer-card-heading">
              <div>
                <p className="eyebrow">RESULT BOX</p>
                <h2>AI 응답 결과</h2>
              </div>
              {selectedUtility.id === 'util-0' && result && (
                <button type="button" className="secondary-action developer-save-button" onClick={() => void handleExportUtil0Result()}>서버에 엑셀 저장</button>
              )}
              {result && (
                <span className={`developer-mode-chip ${result.mode}`}>
                  {result.mode === 'gemini' ? 'GEMINI API' : result.mode === 'potens' ? 'POTENS API' : 'MOCK'}
                </span>
              )}
            </div>
            {util0ExportMessage && <p className="developer-save-message" role="status">{util0ExportMessage}</p>}

            <div className={error ? 'developer-result-box has-error' : 'developer-result-box'}>
              {isRunning && <p className="developer-result-placeholder">응답을 생성하고 있습니다...</p>}
              {!isRunning && error && (
                <div className="developer-result-error">
                  <strong>호출 실패</strong>
                  <p>{error}</p>
                </div>
              )}
              {!isRunning && !error && !result && (
                <div className="developer-result-placeholder">
                  <span><AppIcon name="spark" size={20} /></span>
                  <strong>실행 결과가 여기에 표시됩니다.</strong>
                  <p>공유 시스템 프롬프트와 테스트 입력을 준비한 뒤 실행해 보세요.</p>
                </div>
              )}
              {!isRunning && !error && result && (
                <>
                  <pre>{result.text}</pre>
                  {lastRunSystemPrompt && (
                    <details className="developer-system-prompt-used">
                      <summary>실행에 사용한 시스템 프롬프트 · {promptSourceLabel(lastRunSystemPrompt.source)}</summary>
                      <pre>{lastRunSystemPrompt.text}</pre>
                    </details>
                  )}
                  {lastRunTestInput && (
                    <details className="developer-system-prompt-used">
                      <summary>실행에 사용한 사용자 테스트 입력 · {lastRunTestInput.length.toLocaleString('ko-KR')}자</summary>
                      <pre>{lastRunTestInput}</pre>
                    </details>
                  )}
                  <span className="developer-result-meta">
                    {result.model ? `${result.model} · ` : ''}
                    {new Date(result.generatedAt).toLocaleString('ko-KR')}
                  </span>
                </>
              )}
            </div>
          </section>
        </div>
      </section>

      <p className="developer-disclaimer">
        시스템 프롬프트는 서버 저장소에 공유됩니다. 같은 프롬프트를 동시에 수정하면 마지막 저장값이 적용될 수 있으므로, 운영 환경에서는 인증·권한·버전 충돌·감사 이력을 추가해야 합니다. 테스트 결과는 신규위험 후보 승격이나 상품 판단을 자동으로 수행하지 않습니다.
      </p>
    </div>
  )
}
