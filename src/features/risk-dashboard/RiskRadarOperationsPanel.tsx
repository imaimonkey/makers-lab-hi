import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { demoDashboardMetrics, demoIssues, demoLaws, demoRisks, type IssueAudience, type ProductIssue } from '../../domain/risk/riskRadarDemo'
import { getWorkbenchRiskId } from '../../domain/risk/riskRadarMappings'
import { riskRadarApi } from './riskRadarApi'
import { AppIcon } from '../../shared/components/AppIcon'
import { collectNaverNews, readNaverNewsSearchConfig } from '../news-intake/searchKeywordRepository'
import { buildNewsClassificationPrompt, bindNewsGroupsToSourceItems, parseNewsClassificationOutput, readNewsClassificationStore, saveNewsClassification } from '../news-intake/classificationRepository'
import { runLlmUtility } from '../llm-util'
import { readDeveloperPromptFile } from '../llm-util/developerPromptFileRepository'
import { searchOfficialLaw } from '../law/lawOpenApi'
import { loadArticleSourceRecords } from './articleSourceData'
import type { NewsSourceRecord } from '../../domain/risk/newsSignal'
import type { DeveloperRiskCatalogViewData } from '../risk-catalog/developerStep2Adapter'
import type { RiskRadarRefreshResult, RiskRadarSnapshotState } from './useRiskRadarSnapshot'

const audiences: Array<'전체' | IssueAudience> = ['전체', '개인 니즈', '기업 니즈', '영업·현장', '뉴스·산업', '법령·규제']

const routeLabels = ['기존 상품', '특약 확장', '신규 담보', '신규 주계약', '판단 대기'] as const
const FIELD_SIGNAL_STORAGE_KEY = 'hi-emerging-risk:developer-field-signals'

function tone(value: string) {
  if (value === '심각' || value === '검토 필요' || value === '없음') return 'warning'
  if (value === '높음' || value === '보강 필요') return 'attention'
  return 'normal'
}

function relatedRiskFor(issueId: string) {
  return demoRisks.find((risk) => risk.articleId === `demo-news-${issueId.replace('issue-', '')}`)
}

function createArticleSourceItems(articles: Awaited<ReturnType<typeof loadArticleSourceRecords>>): NewsSourceRecord[] {
  const collectedAt = new Date().toISOString()
  return articles.map((article) => ({
    id: article.id,
    title: article.title,
    sourceName: article.source ?? 'src/article',
    sourceUrl: article.fileName,
    excerpt: article.summary ?? article.text.slice(0, 480),
    publishedAt: article.collectedAt ?? collectedAt,
    collectedAt,
    query: 'src/article PDF',
  }))
}

export function RiskRadarOperationsPanel({
  radarSnapshot,
  onRefresh,
  developerMode = false,
  developerData,
}: {
  radarSnapshot: RiskRadarSnapshotState
  onRefresh: () => Promise<RiskRadarRefreshResult>
  developerMode?: boolean
  developerData?: DeveloperRiskCatalogViewData
}) {
  const developerIssues: ProductIssue[] = developerMode
    ? radarSnapshot.risks.map((risk) => {
      const step2 = developerData?.risks.find((candidate) => candidate.articleId === risk.articleId)
      return {
      id: `developer-${risk.articleId ?? risk.id}`, title: step2?.keyword ?? risk.name, audience: '기업 니즈', target: step2?.target ?? risk.source ?? 'src/article PDF',
      riskEvent: step2?.loss ?? risk.name, expectedLoss: step2?.impact ?? risk.promotionBlockReason ?? 'Step 2 분석 결과 확인 필요', coverageGap: step2?.coverageGap ?? 'Step 2 보장 공백 분석 대기',
      productRoute: step2 ? '신규 담보' : '판단 대기', market: step2?.market ?? '확인 필요', data: step2?.data ?? '확인 필요', law: step2?.law ?? '확인 필요', stage: step2 ? 'Step 2 완료' : 'Step 2 대기', next: step2?.next ?? 'Step 2 후보 분석 실행', severity: step2?.severity ?? '확인 필요', owner: '개발자 분석', due: '확인 필요', type: step2 ? 'Step 2 저장 결과' : 'Step 1 원문 그룹', progress: step2 ? Math.round(step2.score * 20) : 0, sourceCount: step2?.sourceCount ?? 1,
    } as unknown as ProductIssue
    })
    : demoIssues
  const [audience, setAudience] = useState<'전체' | IssueAudience>('전체')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [signalTitle, setSignalTitle] = useState('')
  const [signalDescription, setSignalDescription] = useState('')
  const [signals, setSignals] = useState<Array<{ title: string; description: string; createdAt: string }>>(() => {
    try {
      const stored = window.localStorage.getItem(FIELD_SIGNAL_STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) as unknown : []
      return Array.isArray(parsed) ? parsed.filter((item): item is { title: string; description: string; createdAt: string } => Boolean(item && typeof item === 'object' && typeof (item as { title?: unknown }).title === 'string' && typeof (item as { description?: unknown }).description === 'string')) : []
    } catch {
      return []
    }
  })
  const [busy, setBusy] = useState('')
  const [lawResults, setLawResults] = useState<Array<{ title: string; agency: string; date: string }>>([])

  useEffect(() => {
    try {
      window.localStorage.setItem(FIELD_SIGNAL_STORAGE_KEY, JSON.stringify(signals))
    } catch {
      // 브라우저 저장소를 사용할 수 없는 환경에서는 현재 세션에서만 유지합니다.
    }
  }, [signals])

  async function collectDeveloperNews() {
    const config = await readNaverNewsSearchConfig(true)
    const result = await collectNaverNews({ clientId: '', clientSecret: '', keywords: config.keywords, display: 10 })
    setNotice(`네이버 뉴스 ${result.articleCount}건을 수집했습니다. ${result.failures.length ? `실패 검색어 ${result.failures.length}건은 확인이 필요합니다.` : ''}`)
  }

  async function enrichDeveloperSources() {
    const articles = await loadArticleSourceRecords()
    const bodyReady = articles.filter((article) => article.text.trim().length > 0).length
    if (!bodyReady) throw new Error('본문을 확보할 원문 데이터가 없습니다.')
    setNotice(`개발자 모드 본문 확보 완료: src/article 원문 ${bodyReady}건을 구조화 더미 입력으로 사용할 수 있습니다.`)
  }

  async function analyzeDeveloperQueue() {
    const articles = await loadArticleSourceRecords()
    if (!articles.length) throw new Error('분석할 src/article PDF가 없습니다.')
    const sourceItems = createArticleSourceItems(articles)
    const previous = await readNewsClassificationStore(true)
    const prompt = buildNewsClassificationPrompt(sourceItems, previous.groups)
    const systemPrompt = await readDeveloperPromptFile('step1', '01-news-risk-clustering.md')
    const response = await runLlmUtility({ utilityId: 'util-1', systemPrompt: systemPrompt.text, prompt })
    if (response.mode === 'mock') throw new Error('개발자 모드에서는 mock 분석을 저장하지 않습니다. GEMINI_API_KEY 또는 POTENS_API_KEY를 설정해 주세요.')
    const text = response.text
    const parsed = parseNewsClassificationOutput(text)
    const groups = bindNewsGroupsToSourceItems(parsed.groups, sourceItems)
    await saveNewsClassification({ sourceItems, groups, rawOutput: text, generatedAt: response.generatedAt, mode: response.mode, model: response.model })
    setNotice(`Step 1 분석 완료: src/article ${sourceItems.length}건을 ${groups.length}개 위험 신호 그룹으로 저장했습니다.`)
  }

  async function searchDeveloperLaw() {
    const query = radarSnapshot.risks[0]?.name || radarSnapshot.news[0]?.title
    if (!query) throw new Error('법령을 검색할 분석 키워드가 없습니다.')
    const payload = await searchOfficialLaw(query)
    const values = Object.values(payload).flatMap((value) => Array.isArray(value) ? value : [])
    const parsed = values.flatMap((value) => {
      if (!value || typeof value !== 'object') return []
      const row = value as Record<string, unknown>
      const title = String(row.법령명 ?? row.lawName ?? row.name ?? '')
      if (!title) return []
      return [{ title, agency: String(row.소관부처명 ?? row.agency ?? '국가법령정보'), date: String(row.시행일자 ?? row.date ?? '확인 필요') }]
    })
    setLawResults(parsed.slice(0, 5))
    setNotice(`공식 법령 검색 완료: ${parsed.length}건을 개발자 분석 근거로 불러왔습니다.`)
  }

  const issues = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    return developerIssues.filter((issue) => {
      const matchesAudience = audience === '전체' || issue.audience === audience
      const haystack = `${issue.title} ${issue.target} ${issue.coverageGap}`.toLocaleLowerCase('ko-KR')
      return matchesAudience && (!normalizedQuery || haystack.includes(normalizedQuery))
    })
  }, [audience, query, developerIssues])

  const routeCounts = useMemo(() => routeLabels.map((route) => ({
    route,
    count: developerIssues.filter((issue) => issue.productRoute === route).length,
  })), [developerIssues])

  async function runAction(action: string, operation: () => Promise<unknown>) {
    setBusy(action)
    try {
      await operation()
      const refreshResult = await onRefresh()
      setNotice(refreshResult.failedSources.length
        ? `${action} 작업은 완료됐지만 ${refreshResult.failedSources.join(', ')} 재조회가 실패했습니다. 개발자 모드에서는 실패한 소스를 빈 상태로 표시합니다.`
        : `${action} 작업이 완료되어 대시보드·뉴스·위험 후보를 다시 조회했습니다.`)
    } catch {
      if (developerMode) {
        setNotice(`${action} 실패: 실제 개발자 데이터 분석에 실패했습니다.`)
        return
      }
      setNotice(`${action} API가 연결되지 않았습니다. 운영 데이터는 변경하지 않고 샘플 상태를 유지합니다.`)
    } finally {
      setBusy('')
    }
  }

  function submitSignal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!signalTitle.trim() || !signalDescription.trim()) return
    setSignals((current) => [{ title: signalTitle.trim(), description: signalDescription.trim(), createdAt: new Date().toISOString() }, ...current].slice(0, 20))
    setNotice('현장 신호를 로컬 검토 큐에 추가했습니다. 후보 자동 승격은 하지 않습니다.')
    setSignalTitle('')
    setSignalDescription('')
  }

  return (
    <section className="radar-operations" aria-label="레이더 운영 작업 큐">
      <div className="radar-operations-toolbar surface-card">
        <div>
          <p className="eyebrow">PRODUCT DEVELOPMENT WORK QUEUE · HYOJE</p>
          <h2>신호를 상품화 검토 단계로 연결</h2>
          <p>수집·본문 확보·분석·검증은 독립 단계로 남기고, 담당자 확인 전에는 위험 후보를 확정하지 않습니다. 현재 대시보드 소스는 {developerMode ? 'src/article 본문 기반 구조화 더미' : radarSnapshot.sourceStatus.dashboard === 'live' ? 'LIVE API' : '공식 데이터 연결 필요'}입니다.</p>
        </div>
        <div className="radar-operation-actions" aria-label="레이더 작업 액션">
          <button type="button" disabled={Boolean(busy)} onClick={() => void runAction('자료 수집', developerMode ? collectDeveloperNews : riskRadarApi.collect)}><AppIcon name="trend" size={14} /> {busy === '자료 수집' ? '수집 중…' : '자료 수집'}</button>
          <button type="button" disabled={Boolean(busy)} onClick={() => void runAction('본문 확보', developerMode ? enrichDeveloperSources : riskRadarApi.enrich)}><AppIcon name="scan" size={14} /> {busy === '본문 확보' ? '확보 중…' : '본문 확보'}</button>
          <button type="button" disabled={Boolean(busy)} onClick={() => void runAction('대기 큐 분석', developerMode ? analyzeDeveloperQueue : riskRadarApi.analyzePending)}><AppIcon name="spark" size={14} /> {busy === '대기 큐 분석' ? '분석 중…' : '대기 큐 분석'}</button>
        </div>
      </div>
      {notice && <p className="radar-operation-notice" role="status">{notice}</p>}

      <div className="radar-operations-grid">
        <article className="radar-issue-focus surface-card">
          <div className="panel-heading">
            <div><p className="eyebrow">ISSUE REGISTER</p><h2>상품개발 이슈 큐</h2></div>
            <span className="status-badge sample">{developerMode ? 'CONTENT-DERIVED SAMPLE' : 'SAMPLE'}</span>
          </div>
          <div className="radar-issue-controls">
            <div className="radar-audience-tabs" aria-label="이슈 유입 채널 필터">
              {audiences.map((item) => <button type="button" key={item} className={audience === item ? 'active' : ''} aria-pressed={audience === item} onClick={() => setAudience(item)}>{item}</button>)}
            </div>
            <label><span className="sr-only">이슈 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이슈·대상·공백 검색" /></label>
          </div>
          <div className="radar-issue-focus-list">
            {issues.slice(0, 4).map((issue, index) => {
              const relatedDeveloperRisk = developerMode
                ? radarSnapshot.risks.find((risk) => risk.articleId === issue.id.replace(/^developer-/, ''))
                : undefined
              const relatedRisk = developerMode ? undefined : relatedRiskFor(issue.id)
              const articleId = relatedRisk?.articleId ?? issue.id.replace(/^developer-/, '')
              return (
              <article key={issue.id}>
                <div className="radar-issue-focus-top"><span>0{index + 1}</span><em className={tone(issue.severity)}>{issue.type}</em><small>{issue.stage} · {issue.owner}</small></div>
                <h3>{issue.title}</h3>
                <div className="radar-issue-facts"><span><small>위험 사건</small><strong>{issue.riskEvent}</strong></span><span><small>예상 손실</small><strong>{issue.expectedLoss}</strong></span><span><small>상품화 경로</small><strong>{issue.productRoute}</strong></span><span><small>다음 행동</small><strong>{issue.next}</strong></span></div>
                <div className="radar-issue-progress"><span><i style={{ width: `${issue.progress}%` }} /></span><small>{issue.progress}% · 근거 {issue.sourceCount}건</small></div>
                <div className="radar-issue-actions" aria-label={`${issue.title} 다음 작업`}>
                  {relatedDeveloperRisk ? <Link to={`/developer-test/risks/developer-${encodeURIComponent(articleId)}`}>후보 상세</Link> : relatedRisk ? <Link to={`/risks/${getWorkbenchRiskId(relatedRisk)}`}>후보 상세</Link> : null}
                  <button type="button" disabled={Boolean(busy)} onClick={() => void runAction('AI 분석', developerMode ? async () => { throw new Error('Step 2 분석은 위험 후보 화면에서 실행해 주세요.') } : () => riskRadarApi.analyze(articleId))}>AI 분석</button>
                  <button type="button" disabled={Boolean(busy)} onClick={() => void runAction('교차검증', developerMode ? async () => { throw new Error('교차검증은 공식 출처 연결 후 실행합니다.') } : () => riskRadarApi.verify(articleId))}>교차검증</button>
                </div>
              </article>
              )
            })}
            {!issues.length && <div className="table-empty">조건에 맞는 이슈가 없습니다.</div>}
          </div>
        </article>

        <article className="radar-readiness surface-card">
          <div className="panel-heading"><div><p className="eyebrow">PRODUCT READINESS</p><h2>상품화 준비도 매트릭스</h2></div><span className="updated-label">보조 지표</span></div>
          <p className="radar-card-description">점수는 자동 결정이 아니라 시장·손해·데이터 확인 순서를 정하는 탐색용 지표입니다.</p>
          <div className="radar-readiness-list">
            {developerMode ? developerIssues.slice(0, 5).map((issue) => <div key={issue.id}><div><strong>{issue.title}</strong><small>{issue.coverageGap}</small></div><span><i style={{ width: `${issue.progress}%` }} /></span><b>{(issue.progress / 20).toFixed(2)}</b></div>) : demoRisks.slice(0, 5).map((risk) => <div key={risk.id}><div><strong>{risk.keyword}</strong><small>{risk.rider} · {risk.coverageGap}</small></div><span><i style={{ width: `${Math.min(100, risk.score * 20)}%` }} /></span><b>{risk.score.toFixed(2)}</b></div>)}
          </div>
          <div className="radar-route-mix" aria-label="상품화 경로별 후보 수">
            {routeCounts.map((item) => <span key={item.route}><i />{item.route}<strong>{item.count}</strong></span>)}
          </div>
        </article>
      </div>

      <div className="radar-operations-grid secondary">
        <article className="radar-signal-form-panel surface-card">
          <div className="panel-heading"><div><p className="eyebrow">SIGNAL INTAKE</p><h2>뉴스 밖의 현장 신호 등록</h2></div><span className="status-badge sample">{developerMode ? 'LOCAL REVIEW QUEUE' : 'LOCAL REVIEW QUEUE'}</span></div>
          <form className="radar-signal-form" onSubmit={submitSignal}>
            <label><span>이슈 제목</span><input value={signalTitle} onChange={(event) => setSignalTitle(event.target.value)} placeholder="반복 문의·현장 이슈" /></label>
            <label><span>관찰 내용</span><textarea value={signalDescription} onChange={(event) => setSignalDescription(event.target.value)} placeholder="문제 상황과 반복 근거를 요약해 주세요." /></label>
            <button type="submit" disabled={!signalTitle.trim() || !signalDescription.trim()}>검토 큐에 추가</button>
          </form>
          {signals.length ? <ul className="radar-captured-signals">{signals.slice(0, 3).map((signal) => <li key={`${signal.createdAt}-${signal.title}`}><AppIcon name="check" size={13} /><span><strong>{signal.title}</strong><small>{signal.description}</small></span></li>)}</ul> : <p className="radar-form-note">입력값은 현재 브라우저의 검토 큐에만 남습니다. 고객 개인정보나 원문을 입력하지 마세요.</p>}
        </article>

        <article className="radar-process-panel surface-card">
          <div className="panel-heading"><div><p className="eyebrow">PROCESS GATES</p><h2>검증 파이프라인</h2></div><span className="updated-label">{developerMode ? 'CONTENT-DERIVED SAMPLE' : 'SAMPLE'}</span></div>
          <ol className="radar-process-list">
            <li><span>01</span><div><strong>수집</strong><small>뉴스·현장 신호</small></div><b>{developerMode ? radarSnapshot.news.length : demoDashboardMetrics.unresolved}</b></li>
            <li><span>02</span><div><strong>후보화</strong><small>클러스터·반복성</small></div><b>{developerMode ? radarSnapshot.risks.length : demoDashboardMetrics.candidates}</b></li>
            <li><span>03</span><div><strong>근거·법령 확인</strong><small>보류 이유 기록</small></div><b>{developerMode ? radarSnapshot.dashboard.metrics.evidencePending : demoDashboardMetrics.lawPending}</b></li>
            <li><span>04</span><div><strong>담당자 판단</strong><small>상품화 다음 단계</small></div><b>{developerMode ? radarSnapshot.dashboard.metrics.reviewerPending : demoDashboardMetrics.reviewerPending}</b></li>
          </ol>
        </article>

        <article className="radar-laws-panel surface-card">
          <div className="panel-heading"><div><p className="eyebrow">LAW & REGULATION</p><h2>공식 확인 대기 변화</h2></div><button type="button" disabled={Boolean(busy)} onClick={() => void runAction('법령 검색', developerMode ? searchDeveloperLaw : async () => undefined)}>법령 검색</button></div>
          {developerMode ? lawResults.length ? <ul>{lawResults.map((law) => <li key={`${law.title}-${law.date}`}><span>{law.agency}</span><strong>{law.title}</strong><small>{law.date} · 국가법령정보</small></li>)}</ul> : <p className="table-empty">공식 법령 검색을 실행하면 결과가 표시됩니다.</p> : <ul>{demoLaws.slice(0, 4).map((law) => <li key={law.title}><span>{law.institution}</span><strong>{law.title}</strong><small>{law.impact} · {law.when}</small></li>)}</ul>}
        </article>
      </div>
    </section>
  )
}
