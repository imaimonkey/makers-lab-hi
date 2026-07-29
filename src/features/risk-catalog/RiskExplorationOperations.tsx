import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { demoLaws, demoRisks, type ProductRisk } from '../../domain/risk/riskRadarDemo'
import { getCandidateViewModelForProductRisk, toRadarCandidateViewModel } from '../../domain/risk/candidateViewModel'
import type { RadarRiskCandidate } from '../../domain/risk/riskRadarTypes'
import { getWorkbenchRiskId } from '../../domain/risk/riskRadarMappings'
import { riskRadarApi } from '../risk-dashboard/riskRadarApi'
import { useRiskRadarCatalogSnapshot } from '../risk-dashboard/useRiskRadarSnapshot'
import type { DeveloperRiskCatalogViewData } from './developerStep2Adapter'

type Audience = '전체' | '개인' | '기업'
type SortMode = 'score' | 'market' | 'severity'

const workflow = [
  ['수집', 42], ['본문 확보', 31], ['AI 분석', 24], ['교차검증', 12], ['법령 검토', 9], ['담당자 확인', 6], ['위험 후보', 7],
] as const
const candidateWorkflow = ['후보 대기', '상세 검토 요청', '검증 중', '후보 등록 요청', '검토 완료/보류'] as const

const keywords = ['전기차 배터리 화재', '드론 배송 사고', '생성형 AI 저작권', '메타버스 내 사기', '소상공인 영업중단', '사이버 공격', '기후재난', '공급망 중단', '자율주행 사고', '의료 AI 오류']

function severityValue(value: ProductRisk['severity']) {
  return value === '심각' ? 3 : value === '높음' ? 2 : 1
}

function marketValue(value: ProductRisk['market']) {
  return value === '높음' ? 3 : value === '중간' ? 2 : 1
}

function sourceStatusLabel(status: string) {
  if (status === 'live') return 'LIVE API'
  if (status === 'loading') return 'LOADING'
  if (status === 'stale') return 'STALE · 이전 응답 유지'
  return 'SAMPLE fallback'
}

function RiskDetailLink({ risk, label, developerMode = false }: { risk: ProductRisk; label: string; developerMode?: boolean }) {
  const location = useLocation()
  const isDeveloper = developerMode || location.pathname.startsWith('/developer-test')
  if (isDeveloper && risk.id.startsWith('developer-')) return <Link to={`/developer-test/risks/${risk.id}`}>{label}</Link>
  const candidate = getCandidateViewModelForProductRisk(risk)
  const workbenchRiskId = candidate?.detailRiskId ?? getWorkbenchRiskId(risk)
  return workbenchRiskId ? <Link to={`${isDeveloper ? '/developer-test' : ''}/risks/${workbenchRiskId}`}>{label}</Link> : <span className="table-empty">{label} · SAMPLE / 상세 대기</span>
}

function liveCandidateTarget(candidate: RadarRiskCandidate) {
  return toRadarCandidateViewModel(candidate).detailRiskId
}

export function RiskExplorationOperations({ developerMode = false, sourceRisks, developerData, onRunDeveloperStep2 }: { developerMode?: boolean; sourceRisks?: ProductRisk[]; developerData?: DeveloperRiskCatalogViewData; onRunDeveloperStep2?: () => void } = {}) {
  const rawNavigate = useNavigate()
  const navigate = (path: string) => rawNavigate(developerMode && path.startsWith('/') ? `/developer-test${path}` : path)
  const { snapshot: catalogSnapshot, refresh: refreshCatalog } = useRiskRadarCatalogSnapshot()
  catalogSnapshot.news ??= []
  catalogSnapshot.risks ??= []
  catalogSnapshot.issues ??= []
  const [query, setQuery] = useState('')
  const [audience, setAudience] = useState<Audience>('전체')
  const [sort, setSort] = useState<SortMode>('score')
  const [period, setPeriod] = useState('최근 7일')
  const [region, setRegion] = useState('전체 지역')
  const [source, setSource] = useState('전체 소스')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')

  const risks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    const availableRisks = developerMode ? (developerData?.risks ?? sourceRisks ?? []) : (sourceRisks ?? demoRisks)
    const filtered = availableRisks.filter((risk) => {
      const audienceMatch = audience === '전체' || risk.audience.includes(audience)
      const searchText = `${risk.keyword} ${risk.target} ${risk.industry} ${risk.loss} ${risk.coverageGap} ${risk.keywords.join(' ')}`.toLocaleLowerCase('ko-KR')
      return audienceMatch && (!normalized || searchText.includes(normalized))
    })
    return [...filtered].sort((first, second) => {
      if (sort === 'market') return marketValue(second.market) - marketValue(first.market)
      if (sort === 'severity') return severityValue(second.severity) - severityValue(first.severity)
      return second.score - first.score
    })
  }, [audience, developerData, developerMode, query, sort, sourceRisks])
  const activeKeywords = developerMode ? (developerData?.keywords ?? []) : keywords
  const activeWorkflow = developerMode ? (developerData?.workflow ?? []) : workflow

  async function runAction<T>(key: string, action: () => Promise<T>, success: string, afterSuccess?: (result: T) => void) {
    setBusy(key)
    setNotice('')
    try {
      const result = await action()
      const refreshResult = await refreshCatalog()
      const refreshNotice = refreshResult.failedSources.length
        ? ` 일부 재조회 실패(${refreshResult.failedSources.join(', ')}), 기존 SAMPLE/이전 응답을 유지합니다.`
        : ' news·risks·issues를 다시 조회했습니다.'
      setNotice(`${success}${refreshNotice}`)
      afterSuccess?.(result)
    } catch {
      setNotice('운영 API가 연결되지 않아 샘플 데이터는 변경하지 않았습니다. 작업 경계와 실패 상태만 확인할 수 있습니다.')
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="risk-exploration-operations surface-card" aria-labelledby="risk-operations-title">
      <div className="risk-operations-heading">
        <div><p className="eyebrow">RISK EXPLORATION / MARKET SIGNAL · HYOJE</p><h2 id="risk-operations-title">수집된 신호를 검증 가능한 후보로 전환</h2><p>본문 확보·AI 분석·교차검증·법령 검토를 분리하고 차단 사유를 남기는 작업 큐입니다.</p></div>
        <div>{developerMode ? <><button type="button" disabled={Boolean(busy)} onClick={() => onRunDeveloperStep2?.()}>{busy ? 'Step 2 실행 중…' : 'Step 2 전체 실행 · Excel 저장'}</button><button type="button" disabled>실제 결과 연결됨</button></> : <><button type="button" disabled={Boolean(busy)} onClick={() => void runAction('enrich', () => riskRadarApi.enrich(), '본문 확보 작업을 요청했습니다.')}>{busy === 'enrich' ? '확보 중…' : '본문 일괄 확보'}</button><button type="button" disabled={Boolean(busy)} onClick={() => void runAction('pending', () => riskRadarApi.analyzePending(), '분석 대기 큐를 실행했습니다.')}>{busy === 'pending' ? '분석 중…' : '대기 큐 분석'}</button></>}</div>
      </div>
      {notice ? <p className="risk-operations-notice" role="status">{notice}</p> : null}
      {developerMode ? <div className="risk-operations-summary" aria-label="실제 아티클 및 Step 2 상태">
        <article><span>ARTICLES</span><strong>{developerData?.counts.articles ?? '…'}</strong><small>src/article PDF</small></article>
        <article><span>STEP 2 RISKS</span><strong>{developerData?.counts.analyzed ?? '…'}</strong><small>저장된 분석 결과</small></article>
        <article><span>LAW REFERENCES</span><strong>{developerData?.counts.laws ?? '…'}</strong><small>Step 2 law</small></article>
        <article><span>DATA STATUS</span><strong>LOCAL</strong><small>Excel · Step 2 결과</small></article>
      </div> : <div className="risk-operations-summary" aria-label="뉴스 위험 이슈 API 상태">
        {(['news', 'risks', 'issues'] as const).map((source) => {
          const count = source === 'news' ? (catalogSnapshot.news?.length ?? 0) : source === 'risks' ? (catalogSnapshot.risks?.length ?? 0) : (catalogSnapshot.issues?.length ?? 0)
          return <article key={source}><span>{source.toUpperCase()}</span><strong>{count}</strong><small>{sourceStatusLabel(catalogSnapshot.sourceStatus[source])}</small></article>
        })}
        <article><span>LAST RESPONSE</span><strong>{catalogSnapshot.lastSuccessfulAt ? 'OK' : '—'}</strong><small>{catalogSnapshot.refreshing ? '재조회 중' : 'API 미확인 시 SAMPLE'}</small></article>
      </div>}
      {!developerMode && catalogSnapshot.initialLoading ? <p className="risk-operations-notice" role="status">뉴스·위험 후보·이슈를 불러오는 중입니다. 기존 SAMPLE 목록을 유지합니다.</p> : null}
      {!developerMode && Object.keys(catalogSnapshot.errors).length ? <p className="risk-operations-notice" role="status">일부 API 응답이 없어 실패한 원천은 SAMPLE 또는 이전 응답으로 유지됩니다.</p> : null}

      <div className="risk-operations-filters">
        <label className="wide"><span>위험 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="위험 키워드·기술·대상·보장 공백" /></label>
        <label><span>기간</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option>최근 7일</option><option>최근 30일</option><option>최근 90일</option></select></label>
        <label><span>지역</span><select value={region} onChange={(event) => setRegion(event.target.value)}><option>전체 지역</option><option>국내</option><option>해외</option></select></label>
        <label><span>소스</span><select value={source} onChange={(event) => setSource(event.target.value)}><option>전체 소스</option><option>뉴스</option><option>개인 니즈</option><option>기업 니즈</option></select></label>
        <label><span>정렬</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="score">AI 보조점수 순</option><option value="market">시장성 순</option><option value="severity">위험 심각도 순</option></select></label>
      </div>
      <div className="risk-operations-audience" aria-label="개인 기업 대상 필터">{(['전체', '개인', '기업'] as Audience[]).map((item) => <button type="button" key={item} className={audience === item ? 'active' : ''} aria-pressed={audience === item} onClick={() => setAudience(item)}>{item}</button>)}</div>

      <div className="risk-operations-workflow" aria-label="후보 전환 업무 단계">{activeWorkflow.map(([label, count], index) => <div key={label}><span className={index < 3 ? 'done' : index === 3 ? 'pending' : ''}>{label}<strong>{count}</strong></span>{index < activeWorkflow.length - 1 ? <i>→</i> : null}</div>)}</div>
      <div className="risk-operations-workflow candidate-status-row" aria-label="후보 상태 단계">{candidateWorkflow.map((label, index) => <div key={label}><span className={index === 1 ? 'pending' : ''}>{label}<strong>{index === 0 ? risks.length : '—'}</strong></span>{index < candidateWorkflow.length - 1 ? <i>→</i> : null}</div>)}</div>
      <div className="risk-operations-summary"><article><span>탐색 후보</span><strong>{risks.length}</strong><small>현재 필터</small></article><article><span>본문 확보</span><strong>{developerMode ? (developerData?.counts.bodyReady ?? 0) : 31}</strong><small>{developerMode ? 'src/article' : `${period} · SAMPLE`}</small></article><article><span>기업 수요</span><strong>{developerMode ? (developerData?.counts.corporateDemand ?? 0) : 14}</strong><small>{developerMode ? 'Step 2 후보 결과' : source}</small></article><article><span>법령 변화</span><strong>{developerMode ? (developerData?.counts.laws ?? 0) : demoLaws.length}</strong><small>{developerMode ? 'Step 2 law 결과' : `${region} · 확인 대기`}</small></article></div>

      <div className="risk-operations-context-grid">
        <article><div className="risk-operations-section-heading"><div><p className="eyebrow">EMERGING KEYWORDS</p><h3>주요 키워드</h3></div><span>{developerMode ? 'ACTUAL ARTICLE · STEP 2' : 'SAMPLE'}</span></div><div className="risk-operations-cloud">{activeKeywords.map((keyword, index) => <button type="button" className={`weight-${index % 4}`} key={keyword} onClick={() => setQuery(keyword)}>{keyword}</button>)}</div></article>
        <article><div className="risk-operations-section-heading"><div><p className="eyebrow">LAW & REGULATION</p><h3>법령·규제 검토 큐</h3></div><span>{developerMode ? 'ACTUAL ARTICLE · STEP 2' : '원문 확인 필요'}</span></div><div className="risk-operations-law-list">{developerMode ? (developerData?.laws ?? []).slice(0, 4).map((law) => <div key={law.id}><span>{law.institution}</span><strong>{law.title}</strong><small>{law.description} · {law.verificationStatus} · {law.date || law.sourceName}</small></div>) : demoLaws.slice(0, 4).map((law) => <div key={law.title}><span>{law.institution}</span><strong>{law.title}</strong><small>{law.risk} · {law.impact} · {law.when}</small></div>)}</div></article>
      </div>

      <article className="risk-operations-trend-card surface-card">
        <div className="risk-operations-section-heading"><div><p className="eyebrow">SIGNAL TREND / HYOJE</p><h3>주요 위험 신호의 최근 상승 흐름</h3></div><span>{developerMode ? 'ACTUAL ARTICLE · STEP 2' : 'SAMPLE · 7개 관측점'}</span></div>
        <div className="risk-operations-trend-plot" role="img" aria-label="주요 위험 후보 3개의 최근 7개 관측점 추세">
          {developerMode ? (developerData?.trends ?? []).slice(0, 3).map((trend) => <div className="risk-operations-trend-series" key={trend.id}><strong>{trend.label}</strong>{trend.values.length ? <div>{trend.values.map((value, index) => <span key={`${trend.id}-${index}`} style={{ height: `${Math.max(12, Math.min(100, value))}%` }} title={`${trend.metric || '관측값'} ${value}`} />)}</div> : <p className="table-empty">관측값 확인 필요</p>}</div>) : (sourceRisks ?? demoRisks).slice(0, 3).map((risk) => <div className="risk-operations-trend-series" key={risk.id}><strong>{risk.keyword}</strong><div>{risk.trend.map((value, index) => <span key={`${risk.id}-${index}`} style={{ height: `${Math.max(12, value)}%` }} title={`${risk.keyword} ${value} SAMPLE`} />)}</div></div>)}
        </div>
        <small className="risk-operations-trend-note">{developerMode ? 'Step 2 signalTrend에 실제 관측값이 있는 항목만 표시합니다. 값이 없으면 확인 필요로 표시합니다.' : '신호 강도는 후보 비교용 SAMPLE 값이며 실제 손해율·보험료·가입 가능 여부를 의미하지 않습니다.'}</small>
      </article>

      <div className="risk-operations-table-wrap">
        <table className="risk-operations-table">
          <caption className="sr-only">hyoje 브랜치 신규 위험 상품개발 비교표</caption>
          <thead><tr><th>위험·대상</th><th>손해·보장 공백</th><th>시장성</th><th>위험</th><th>데이터</th><th>법률</th><th>기존 상품</th><th>특약</th><th>신규 주계약</th><th>후보 선별점수</th><th>작업</th></tr></thead>
          <tbody>{risks.map((risk, index) => { const candidate = getCandidateViewModelForProductRisk(risk); return <tr key={risk.id}><td><span>0{index + 1}</span><strong>{candidate?.title ?? risk.keyword}</strong><small>{risk.audience} · {risk.target}</small></td><td><strong>{risk.loss}</strong><small>{risk.coverageGap}</small></td><td>{risk.market}</td><td>{risk.severity}</td><td>{risk.data}</td><td>{risk.law}</td><td>{risk.existing}</td><td>{risk.rider}</td><td>{risk.mainCoverage}</td><td><strong>{candidate?.screeningScore.value?.toFixed(2) ?? '—'}</strong><small>0–5 · 후보 우선순위 SAMPLE</small></td><td><RiskDetailLink risk={risk} label="상세 검증" developerMode={developerMode} /></td></tr> })}</tbody>
        </table>
        {!risks.length ? <div className="table-empty">조건에 맞는 위험 후보가 없습니다.</div> : null}
      </div>

      <div className="risk-operations-queue-grid">
        <article><div className="risk-operations-section-heading"><div><p className="eyebrow">ARTICLE QUEUE</p><h3>뉴스 본문 분석 큐</h3></div><span>{developerMode ? 'src/article · Step 2' : 'API 경계 포함'}</span></div>{risks.map((risk, index) => <div className="risk-article-queue-row" key={risk.id}><span>0{index + 1}</span><div><strong>{risk.keyword} 관련 기사 묶음</strong><small>{risk.sourceCount}개 출처 · {risk.mentions}회 언급</small></div><em>{developerMode ? (developerData?.counts.bodyReady ? '본문 확보' : '본문 확인 필요') : index < 3 ? '본문 확보' : '본문 필요'}</em><div><RiskDetailLink risk={risk} label="상세" developerMode={developerMode} />{developerMode ? <><button type="button" disabled={Boolean(busy)} onClick={() => onRunDeveloperStep2?.()}>Step 2 재실행</button><button type="button" disabled>실제 근거</button></> : <><button type="button" disabled={Boolean(busy)} onClick={() => void runAction(`analyze:${risk.id}`, () => riskRadarApi.analyze(risk.articleId), `${risk.keyword} 분석을 요청했습니다.`)}>{busy === `analyze:${risk.id}` ? '분석 중' : 'AI 분석'}</button><button type="button" disabled={Boolean(busy)} onClick={() => void runAction(`verify:${risk.id}`, () => riskRadarApi.verify(risk.articleId), `${risk.keyword} 교차검증을 요청했습니다.`)}>검증</button></>}</div></div>)}</article>
        <article><div className="risk-operations-section-heading"><div><p className="eyebrow">CANDIDATE REVIEW</p><h3>상품개발 후보 카드</h3></div><span>{developerMode ? 'Step 2 결과 확인' : '담당자 확인 전'}</span></div>{risks.slice(0, 3).map((risk) => { const candidate = getCandidateViewModelForProductRisk(risk); return <div className="risk-candidate-review-card" key={risk.id}><div><span>{risk.audience}</span><em>{candidate?.screeningScore.value?.toFixed(2) ?? '—'} · 후보 우선순위</em></div><strong>{candidate?.title ?? risk.keyword}</strong><p>{risk.impact}</p><small>다음 행동 · {candidate?.nextAction ?? risk.next}</small><div><RiskDetailLink risk={risk} label="위험 상세" developerMode={developerMode} />{developerMode ? <button type="button" disabled={Boolean(busy)} onClick={() => onRunDeveloperStep2?.()}>Step 2 결과 갱신</button> : <button type="button" disabled={Boolean(busy) || !candidate?.detailRiskId} onClick={() => void runAction(`candidate:${risk.id}`, () => riskRadarApi.createRisk(risk.articleId), `${risk.keyword} 후보 등록 요청을 전송했습니다.`, () => { const workbenchRiskId = candidate?.detailRiskId; if (workbenchRiskId) navigate(`/risks/${workbenchRiskId}`); else setNotice(`${risk.keyword} 후보 등록 요청은 canonical 상세 매핑 대기 상태로 남겼습니다.`) })}>후보 등록 요청</button>}</div></div> })}</article>
      </div>
      {!developerMode && catalogSnapshot.sourceStatus.risks === 'live' ? <div className="risk-operations-queue-grid"><article><div className="risk-operations-section-heading"><div><p className="eyebrow">LIVE API CANDIDATES</p><h3>재조회된 위험 후보</h3></div><span>LIVE API</span></div>{catalogSnapshot.risks.length ? catalogSnapshot.risks.slice(0, 5).map((candidate) => { const workbenchRiskId = liveCandidateTarget(candidate); return <div className="risk-article-queue-row" key={candidate.id}><span>•</span><div><strong>{candidate.name}</strong><small>{candidate.status} · {candidate.source ?? 'API source unavailable'}</small></div><em>{candidate.eligibleForProductReview ? '검토 가능' : '게이트 대기'}</em><div>{workbenchRiskId ? <Link to={`/risks/${workbenchRiskId}`}>canonical 상세</Link> : <span className="table-empty">SAMPLE / 상세 대기</span>}</div></div> }) : <div className="table-empty">API가 반환한 후보가 없습니다.</div>}</article><article><div className="risk-operations-section-heading"><div><p className="eyebrow">LIVE API ISSUES</p><h3>재조회된 이슈 클러스터</h3></div><span>LIVE API</span></div>{catalogSnapshot.issues.length ? catalogSnapshot.issues.slice(0, 5).map((issue) => <div className="risk-article-queue-row" key={issue.id}><span>•</span><div><strong>{issue.title}</strong><small>{issue.evidenceStatus} · {issue.sourceCount} sources</small></div><em>{issue.nextAction}</em><div><span>{issue.latestAt ? new Date(issue.latestAt).toLocaleDateString('ko-KR') : '날짜 없음'}</span></div></div>) : <div className="table-empty">API가 반환한 이슈가 없습니다.</div>}</article></div> : null}
      <p className="risk-operations-disclaimer">{developerMode ? 'ACTUAL ARTICLE · Step 2 분석 결과를 표시합니다. 결과에 없는 값은 확인 필요로 남기며, 실무자 화면으로 자동 승격하지 않습니다.' : 'SAMPLE · AI 점수와 후보 등록 요청은 실무자 검토를 대체하지 않으며, 단일 신호를 자동 승격하지 않습니다.'}</p>
    </section>
  )
}
