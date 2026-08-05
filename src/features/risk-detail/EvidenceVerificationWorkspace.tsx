import { useEffect, useMemo, useState } from 'react'
import { toLiveEvidenceLedger } from '../../domain/risk/evidenceLedger'
import type { SampleRiskCandidate, SampleRiskDetail } from '../../domain/risk/sampleData'
import { demoLaws, demoRisks } from '../../domain/risk/riskRadarDemo'
import type { RadarNewsDetail } from '../../domain/risk/riskRadarTypes'
import { getRadarArticleId, getWorkbenchRiskId } from '../../domain/risk/riskRadarMappings'
import { riskRadarApi } from '../risk-dashboard/riskRadarApi'
import { getOfficialLawArticle, getOfficialLawDetail, searchOfficialLaw } from '../law/lawOpenApi'
import type { SavedStep3AnalysisRow } from '../llm-util/util-3'
import { step3Nested, step3Root, step3Text, step3TextList } from './step3ResultAdapter'

type ActionKey = 'body' | 'analysis' | 'verification' | 'candidate'
type CandidateRequestState = 'idle' | 'loading' | 'succeeded' | 'failed' | 'pending-mapping'

type OfficialLawRow = {
  id: string
  officialId: string
  lawId?: string
  title: string
  institution: string
  effectiveDate: string
  sourceUrl: string
}

function parseOfficialLawRows(payload: Record<string, unknown>): OfficialLawRow[] {
  const rows: Record<string, unknown>[] = []
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((item) => { if (item && typeof item === 'object' && !Array.isArray(item)) rows.push(item as Record<string, unknown>) })
      return
    }
    if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach(visit)
  }
  visit(payload)
  const read = (row: Record<string, unknown>, keys: string[], fallback: string) => keys.map((key) => row[key]).find((value) => typeof value === 'string' && value.trim()) as string | undefined ?? fallback
  return rows.flatMap((row, index) => {
    const title = read(row, ['법령명한글', '법령명', 'lawName', 'name', 'title'], '')
    const officialId = read(row, ['법령일련번호', 'MST', 'id'], '')
    if (!title || !officialId) return []
    return [{
      id: `${officialId}-${index}`,
      officialId,
      lawId: read(row, ['법령ID', 'ID', 'lawId'], '') || undefined,
      title,
      institution: read(row, ['소관부처명', '소관부처', 'agency', 'institution'], '국가법령정보센터'),
      effectiveDate: read(row, ['시행일자', '시행일', 'effectiveDate', 'date'], '원문 확인 필요'),
      sourceUrl: read(row, ['법령상세링크', 'detailUrl', 'url'], `https://www.law.go.kr/법령/${encodeURIComponent(title)}`),
    }]
  }).filter((item, index, list) => list.findIndex((candidate) => candidate.officialId === item.officialId) === index).slice(0, 5)
}

function collectLawDetailFields(payload: Record<string, unknown>) {
  const fields: Array<[string, string]> = []
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(visit); return }
    if (!value || typeof value !== 'object') return
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      if (typeof entry === 'string' && entry.trim() && entry.length < 1200 && fields.length < 24) fields.push([key, entry.trim()])
      else if (entry && typeof entry === 'object') visit(entry)
    })
  }
  visit(payload)
  return fields.filter(([key]) => !/resultCode|totalCnt|page|display|메시지/i.test(key))
}

type EvidenceWorkspaceProps = {
  risk: SampleRiskCandidate
  detail: SampleRiskDetail
  liveDetail?: RadarNewsDetail | null
  onDetailRefresh?: () => Promise<RadarNewsDetail | null>
  developerMode?: boolean
  step3Results?: SavedStep3AnalysisRow[]
}

function completedStatus(value?: string | null) {
  return Boolean(value && /완료|matched|reviewed|passed|verified|ready|success/i.test(value))
}

export function EvidenceVerificationWorkspace({ risk, detail, liveDetail, onDetailRefresh, developerMode = false, step3Results = [] }: EvidenceWorkspaceProps) {
  const productRisk = useMemo(
    () => demoRisks.find((item) => getWorkbenchRiskId(item) === risk.id),
    [risk.id],
  )
  const articleId = developerMode ? risk.articleId : productRisk ? getRadarArticleId(risk.id) : undefined
  const step3Context = step3Nested(step3Results, 'context', 'context')
  const step3Facts = step3Nested(step3Results, 'context', 'context').articleFacts
  const articleFacts = step3Facts && typeof step3Facts === 'object' && !Array.isArray(step3Facts) ? step3Facts as Record<string, unknown> : {}
  const riskInterpretation = step3Context.riskInterpretation && typeof step3Context.riskInterpretation === 'object' && !Array.isArray(step3Context.riskInterpretation) ? step3Context.riskInterpretation as Record<string, unknown> : {}
  const step3Decision = step3Nested(step3Results, 'decisionBrief', 'decisionBrief')
  const step3Productization = step3Nested(step3Results, 'productization', 'productizationReview')
  const step3Handoff = step3Nested(step3Results, 'handoff', 'humanReviewHandoff')
  const rawStep3Evidence = step3Root(step3Results, 'evidence').evidence
  const step3Evidence = Array.isArray(rawStep3Evidence) ? rawStep3Evidence.flatMap((value) => {
    const item = value && typeof value === 'object' ? value as Record<string, unknown> : {}
    const excerpt = step3Text(item.excerpt, '')
    return excerpt ? [{ id: step3Text(item.id, 'Step3-evidence'), excerpt, sourceName: step3Text(item.sourceName, 'Step 3 저장 결과'), status: step3Text(item.verificationStatus, 'source-pending'), title: step3Text(item.title, '') }] : []
  }) : []
  const liveArticle = liveDetail?.article
  const liveAnalysis = liveDetail?.analysis
  const liveEvidenceLedger = useMemo(
    () => liveArticle ? toLiveEvidenceLedger(liveArticle, liveAnalysis ?? null) : [],
    [liveAnalysis, liveArticle],
  )
  const bodyDone = completedStatus(liveArticle?.contentStatus)
  const analysisDone = completedStatus(liveArticle?.analysisStatus) || Boolean(liveAnalysis)
  const verificationDone = completedStatus(liveArticle?.verificationStatus) || completedStatus(liveAnalysis?.verificationStatus)
  const [completed, setCompleted] = useState<ActionKey[]>(developerMode ? (step3Results.length ? ['body', 'analysis'] : ['body']) : articleId ? ['body', 'analysis'] : [])
  const [busy, setBusy] = useState<ActionKey | ''>('')
  const [candidateRequestState, setCandidateRequestState] = useState<CandidateRequestState>('idle')
  const [officialLaws, setOfficialLaws] = useState<OfficialLawRow[]>([])
  const [officialLawDetails, setOfficialLawDetails] = useState<Record<string, Array<[string, string]>>>({})
  const [officialLawLoading, setOfficialLawLoading] = useState(false)
  const [officialLawError, setOfficialLawError] = useState('')
  const [notice, setNotice] = useState(
    developerMode ? '실제 PDF와 저장된 분석 결과를 사용합니다. 아래 확인 버튼은 현재 검토 상태만 갱신합니다.' : articleId ? '' : '연결 기사 없음 · 원문 확인 대기. 다른 위험의 기사나 수치를 대신 사용하지 않습니다.',
  )

  const sourceCount = developerMode ? new Set(detail.evidence.map((item) => item.sourceName)).size : productRisk?.sourceCount ?? 0
  const lawReady = developerMode ? Object.keys(officialLawDetails).length > 0 : Boolean(productRisk && (productRisk.law === '확인' || completed.includes('verification')))
  const gates: ReadonlyArray<readonly [string, boolean, string]> = developerMode ? [
    ['본문 확보', Boolean(articleId) && detail.evidence.length > 0, 'src/article PDF 연결'],
    ['AI 분석', step3Results.length > 0 && completed.includes('analysis'), `${step3Results.length}개 Step 3 결과 저장`],
    ['근거 일치', step3Evidence.length > 0 && completed.includes('verification'), step3Evidence.length ? `${step3Evidence.length}개 Step 3 근거 원장` : 'Step 3 근거 결과 대기'],
    ['독립 출처 2개', sourceCount >= 2, `${sourceCount}개 실제 출처 · 기준 2개`],
    ['공식 법령 검토', lawReady, '국가법령정보 API 상세 결과 필요'],
  ] : [
    ['본문 확보', Boolean(articleId) && completed.includes('body'), articleId ? '샘플 본문 3문단' : '연결 기사 없음'],
    ['AI 분석', Boolean(articleId) && completed.includes('analysis'), articleId ? '사실과 해석 분리' : 'API 요청 비활성화'],
    ['근거 일치', Boolean(articleId) && completed.includes('verification'), articleId && completed.includes('verification') ? '2/2 문장 확인' : articleId ? '교차검증 필요' : '원문 확인 대기'],
    ['독립 출처 2개', Boolean(articleId) && sourceCount >= 2, articleId ? `${sourceCount}개 출처 후보` : '연결 기사 없음'],
    ['공식 법령 검토', lawReady, articleId ? lawReady ? '검토 상태 기록' : '법무 확인 필요' : '연결 기사 없음'],
  ]
  const stageDone = [
    completed.includes('body') || bodyDone,
    completed.includes('analysis') || analysisDone,
    completed.includes('verification') || verificationDone,
    lawReady,
    completed.includes('candidate'),
  ]

  useEffect(() => {
    if (!developerMode || !articleId) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setOfficialLawLoading(true)
      setOfficialLawError('')
      void searchOfficialLaw(risk.title.slice(0, 80)).then((payload) => {
        if (cancelled) return
        setOfficialLaws(parseOfficialLawRows(payload))
      }).catch((reason) => {
        if (!cancelled) setOfficialLawError(reason instanceof Error ? reason.message : '국가법령정보 API 검색 실패')
      }).finally(() => {
        if (!cancelled) setOfficialLawLoading(false)
      })
    }, 0)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [articleId, developerMode, risk.title])

  async function loadOfficialLawDetail(row: OfficialLawRow) {
    if (officialLawDetails[row.id]) return
    try {
      const [detailResponse, articleResponse] = await Promise.all([
        getOfficialLawDetail(row.officialId, row.lawId),
        getOfficialLawArticle(row.officialId, row.lawId),
      ])
      setOfficialLawDetails((current) => ({ ...current, [row.id]: [...collectLawDetailFields(detailResponse), ...collectLawDetailFields(articleResponse)].slice(0, 24) }))
    } catch (reason) {
      setOfficialLawError(reason instanceof Error ? reason.message : '법령 상세 원문 조회 실패')
    }
  }

  async function runAction(key: ActionKey) {
    if (!articleId) {
      if (key === 'candidate') setCandidateRequestState('pending-mapping')
       setNotice('연결 기사 없음 · 원문 확인 대기. 요청을 보내지 않았습니다.')
      return
    }
    if (key === 'candidate' && completed.includes('candidate')) {
      setNotice('이미 후보 등록 요청을 완료했습니다. 중복 요청은 전송하지 않았습니다.')
      return
    }
    setBusy(key)
    if (key === 'candidate') setCandidateRequestState('loading')
    setNotice('')
    try {
      if (developerMode) {
        if (key === 'candidate') {
          setCandidateRequestState('pending-mapping')
          setNotice('개발자 화면에서는 후보 등록 API를 호출하지 않습니다. Step 3 인계 결과를 기준으로 실무자 등록 검토가 필요합니다.')
        } else {
          setCompleted((current) => current.includes(key) ? current : [...current, key])
          setNotice(key === 'body'
            ? 'PDF 원문이 이미 연결되어 있습니다. 본문 확보 확인 상태를 갱신했습니다.'
            : key === 'analysis'
              ? `저장된 Step 3 ${step3Results.length}개 결과를 상세 화면에 반영했습니다.`
              : 'Step 3 근거 원장은 실제 저장 결과를 사용합니다. 독립 출처 2개 충족 여부는 별도 확인 필요입니다.')
        }
        return
      }
      if (key === 'body') await riskRadarApi.enrichArticle(articleId)
      if (key === 'analysis') await riskRadarApi.analyze(articleId)
      if (key === 'verification') await riskRadarApi.verify(articleId)
      if (key === 'candidate') await riskRadarApi.createRisk(articleId)
      await onDetailRefresh?.()
      // API가 성공한 경우에만 완료 상태를 기록합니다.
      setCompleted((current) => current.includes(key) ? current : [...current, key])
      if (key === 'candidate') {
        setCandidateRequestState('succeeded')
        setNotice('후보 등록 요청 완료 · 다음 검토 큐로 전달했으며 상품화 승인이나 보장 확정이 아닙니다.')
      } else {
        setNotice(`${key === 'body' ? '본문 확보' : key === 'analysis' ? 'AI 분석' : '교차검증'} 요청을 처리했습니다.`)
      }
    } catch {
      if (key === 'candidate') setCandidateRequestState('failed')
      setNotice('운영 API가 연결되지 않아 화면의 기존 근거는 유지했습니다. 실패한 단계는 완료 처리하지 않았습니다.')
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="evidence-verification-workspace" aria-labelledby="verification-workspace-title">
      <div className="verification-stage-rail" aria-label="hyoje 위험 검증 단계">
        {['본문 확보', 'AI 분석', '근거 검증', '법령 검토', '후보 등록'].map((stage, index) => <span className={stageDone[index] ? 'done' : ''} key={stage}><b>0{index + 1}</b>{stage}</span>)}
      </div>

      <div className="verification-workspace-heading surface-card">
        <div>
          <p className="eyebrow">ARTICLE EVIDENCE WORKBENCH · HYOJE</p>
          <h2 id="verification-workspace-title">본문에서 상품화 게이트까지 검증</h2>
          <p>{articleId
            ? '기사 요약을 판단 근거로 쓰지 않고 원문 문장, 독립 출처, 법령 상태를 각각 기록합니다.'
            : '이 TOP-10 후보에는 연결된 canonical 기사가 없습니다. 다른 후보의 기사·점수·법령을 재사용하지 않습니다.'}</p>
        </div>
        <div>
          {(['body', 'analysis', 'verification'] as ActionKey[]).map((key) => (
            <button type="button" key={key} disabled={Boolean(busy) || !articleId} onClick={() => void runAction(key)}>
              {!articleId ? '연결 기사 없음' : busy === key ? '처리 중…' : key === 'body' ? '본문 다시 확보' : key === 'analysis' ? 'AI 분석 실행' : '독립 교차검증'}
            </button>
          ))}
        </div>
      </div>
      {notice ? <p className="verification-notice" role="status">{notice}</p> : null}

      <div className="verification-two-column">
        <article className="surface-card verification-article-panel" id="article-body">
          <div className="verification-panel-heading"><div><p className="eyebrow">ORIGINAL ARTICLE</p><h3>기사 본문</h3></div><span>{developerMode ? '본문 추출 완료' : articleId ? '본문 추출 완료' : '연결 기사 없음'}</span></div>
          {developerMode && articleId ? (
            <>
              <h4>{risk.title}</h4>
              <p>{step3Text(articleFacts.event, detail.riskStatement)}</p>
              <p>{step3Text(articleFacts.timeAndPlace, '기사의 시간·장소 정보 확인 필요')}</p>
              <ul className="verification-fact-list">{(Array.isArray(articleFacts.facts) ? articleFacts.facts : []).slice(0, 4).map((value, index) => { const fact = value && typeof value === 'object' ? value as Record<string, unknown> : {}; return <li key={`${step3Text(fact.evidenceRef, 'fact')}-${index}`}><strong>{step3Text(fact.evidenceRef, `fact-${index + 1}`)}</strong><span>{step3Text(fact.fact, '원문 사실 확인 필요')}</span></li> })}</ul>
              <div className="verification-quality"><span>확보 방식 <strong>src/article PDF</strong></span><span>원문 문자 <strong>{detail.evidence[0]?.excerpt.length ?? 0}자 이상</strong></span><span>Step 3 근거 <strong>{step3Evidence.length}개</strong></span><span>기사 ID <strong>{articleId}</strong></span></div>
            </>
          ) : productRisk && articleId ? (
            <>
              <h4>{productRisk.keyword} 관련 보험상품 개발 이슈</h4>
              <p>{productRisk.target}에서 {productRisk.keyword}와 관련한 새로운 손해 가능성이 관찰되고 있습니다.</p>
              <p>주요 예상 손해는 {productRisk.loss}이며, 현재 확인할 보장 공백은 {productRisk.coverageGap}입니다.</p>
              <p>확보한 기사 원문과 공식 출처 URL을 연결해 확인합니다.</p>
              <div className="verification-quality"><span>확보 방식 <strong>demo</strong></span><span>문단 <strong>3개</strong></span><span>출처 후보 <strong>{sourceCount}개</strong></span><span>기사 ID <strong>{articleId}</strong></span></div>
            </>
          ) : (
            <>
              <h4>연결 기사 없음 · 원문 확인 대기</h4>
              <p>{risk.title} 후보는 현재 hyoje canonical 기사 매핑 대상이 아닙니다.</p>
              <p>현재 후보의 상세만 유지하며, 다른 위험의 기사 본문과 수치를 대신 표시하지 않습니다.</p>
              <div className="verification-quality"><span>확보 방식 <strong>미연결</strong></span><span>문단 <strong>0개</strong></span><span>출처 후보 <strong>0개</strong></span><span>API 요청 <strong>차단</strong></span></div>
            </>
          )}
        </article>
        <article className="surface-card verification-analysis-panel">
          <div className="verification-panel-heading"><div><p className="eyebrow">FACTS VS INTERPRETATION</p><h3>사실과 위험 해석</h3></div><span>{developerMode ? `${step3Results.length}개 분석 결과 연결` : articleId ? '담당자 확인 전' : '기사 분석 없음'}</span></div>
          {developerMode && articleId ? (
            <div className="verification-fact-grid">
              <div><span>본문에서 확인된 사실</span><ul>{(Array.isArray(articleFacts.facts) ? articleFacts.facts : []).slice(0, 3).map((value, index) => { const fact = value && typeof value === 'object' ? value as Record<string, unknown> : {}; return <li key={index}>{step3Text(fact.fact, '원문 사실 확인 필요')}</li> })}</ul></div>
              <div><span>위험 해석</span><p>{step3Text(riskInterpretation.lossEvent, detail.primaryLoss)}</p><dl><dt>왜 지금인가</dt><dd>{step3Text(riskInterpretation.whyNow, '확인 필요')}</dd><dt>노출 대상</dt><dd>{step3TextList(riskInterpretation.responsibilityCandidates).join(' · ') || detail.exposedParty}</dd><dt>기존 판단</dt><dd>{step3Text(step3Decision.recommendedStatus, detail.decisionStatus)}</dd></dl></div>
            </div>
          ) : productRisk && articleId ? (
            <div className="verification-fact-grid">
              <div><span>본문에서 확인된 사실</span><ul><li>{productRisk.target}에서 관련 손해 가능성이 언급됨</li><li>예상 손해가 {productRisk.loss}로 분류됨</li></ul></div>
              <div><span>보험 위험 해석</span><p>{productRisk.impact}</p><dl><dt>왜 지금인가</dt><dd>언급량과 수요 신호의 변화를 확인합니다.</dd><dt>책임 후보</dt><dd>{productRisk.target}</dd><dt>기존 판단</dt><dd>{detail.decisionStatus}</dd></dl></div>
            </div>
          ) : (
            <div className="verification-fact-grid">
              <div><span>기사에서 확인된 사실</span><p>연결된 원문 기사가 없어 확인된 기사 사실이 없습니다.</p></div>
              <div><span>후보 가설</span><p>{detail.riskStatement}</p><dl><dt>현재 상태</dt><dd>원문 확인 대기</dd><dt>연결 상태</dt><dd>연결 대기</dd></dl></div>
            </div>
          )}
          <p className="verification-caution">위험 해석은 상품화 확정이 아닙니다. 반증 자료와 담당자 검토를 함께 남겨야 합니다.</p>
        </article>
      </div>

      <article className="surface-card verification-ledger">
        <div className="verification-panel-heading"><div><p className="eyebrow">EVIDENCE LEDGER / STEP 3</p><h3>핵심 근거 문장</h3></div><span>{developerMode ? `${step3Evidence.length}개 실제 근거 · ${completed.includes('verification') ? '확인 상태 갱신' : '원문 인용 확인 필요'}` : articleId ? completed.includes('verification') ? '근거 일치 2/2' : '검증 대기' : '기사 근거 없음'}</span></div>
        {developerMode ? (
          <div className="verification-evidence-grid">
            {(step3Evidence.length ? step3Evidence : detail.evidence).slice(0, 4).map((evidence) => (
              <blockquote key={evidence.id}><span>{evidence.id} · {step3Evidence.length ? 'Step 3 저장 결과' : 'Step 2 원문 연결'}</span><q>{evidence.excerpt}</q><small>{evidence.sourceName} · 원문 인용 확인 필요</small></blockquote>
            ))}
          </div>
        ) : liveEvidenceLedger.length ? (
          <div className="verification-evidence-grid">
            {liveEvidenceLedger.slice(0, 2).map((item) => (
              <blockquote key={item.id}><span>{item.id} · {completedStatus(item.verificationStatus) ? '검증 완료' : '확인 필요'}</span><q>{item.excerpt ?? item.title}</q><small>{item.sourceName} · 원문 확인 필요</small></blockquote>
            ))}
          </div>
        ) : productRisk && articleId ? (
          <div className="verification-evidence-grid"><blockquote><span>근거 01 · 문장 1</span><q>{productRisk.target}에서 {productRisk.keyword} 관련 손해 가능성이 관찰되고 있습니다.</q><small>위험 대상과 사건을 확인할 근거 문장</small></blockquote><blockquote><span>근거 02 · 문장 2</span><q>주요 예상 손해는 {productRisk.loss}이며, 보장 공백은 {productRisk.coverageGap}입니다.</q><small>손해와 보장 공백을 확인할 근거 문장</small></blockquote></div>
        ) : (
          <div className="verification-evidence-grid">
            {detail.evidence.slice(0, 2).map((evidence) => (
              <blockquote key={evidence.id}><span>{evidence.id}</span><q>{evidence.title}</q><small>후보 상세의 예시 근거이며 기사 원문 인용이 아닙니다.</small></blockquote>
            ))}
          </div>
        )}
      </article>

      <div className="verification-three-column">
        <article className="surface-card"><p className="eyebrow">UNCERTAINTY</p><h3>확인되지 않은 내용</h3>{developerMode ? <ul>{[...step3TextList(step3Context.uncertainty), ...step3TextList(step3Decision.blockers), ...step3TextList(step3Handoff.uncertainties)].slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul> : <ul><li>사고 빈도와 평균 손해액</li><li>책임 주체별 법률 귀속</li><li>기존 약관의 적용·중복 범위</li></ul>}</article>
        <article className="surface-card"><p className="eyebrow">SOURCE COMPARISON</p><h3>독립 출처 비교</h3><strong>{articleId ? `${sourceCount}개 실제 출처 / 기준 2개` : '0개 · 연결 기사 없음'}</strong><p>{developerMode ? `Step 3 근거 원장과 PDF 원문을 연결했습니다. 현재 ${sourceCount}개 출처가 확인되어 독립 출처 2개 기준은 ${sourceCount >= 2 ? '충족' : '미충족'}입니다.` : articleId ? completed.includes('verification') ? '비교 요청 완료. 상충 주장 유무는 원문과 함께 담당자가 확인합니다.' : '동일 보도를 재인용한 출처는 독립 출처로 계산하지 않습니다.' : '다른 위험의 출처 수를 재사용하지 않습니다. 후보 근거 원문 연결이 필요합니다.'}</p></article>
        <article className="surface-card"><p className="eyebrow">LAW & REGULATION</p><h3>관련 법령·규제</h3>{developerMode ? <>
          {officialLawLoading ? <p>국가법령정보 API에서 위험 제목 기준으로 공식 법령을 검색하는 중입니다.</p> : null}
          {officialLawError ? <p role="alert">법령 API 확인 실패: {officialLawError}</p> : null}
          {officialLaws.map((law) => <div className="verification-law" key={law.id}><strong>{law.title}</strong><small>{law.institution} · 시행일 {law.effectiveDate} · 공식 ID {law.lawId ?? law.officialId}</small><div><a href={law.sourceUrl} target="_blank" rel="noreferrer">{law.institution} 원문 →</a><button type="button" onClick={() => void loadOfficialLawDetail(law)} disabled={Boolean(officialLawDetails[law.id])}>{officialLawDetails[law.id] ? '상세 조회 완료' : '상세·제1조 조회'}</button></div>{officialLawDetails[law.id]?.slice(0, 6).map(([key, value]) => <p key={`${law.id}-${key}-${value}`}><b>{key}</b> {value}</p>)}</div>)}
          {!officialLawLoading && !officialLaws.length && !officialLawError ? <p>위험 제목과 직접 일치하는 공식 법령 검색 결과가 없습니다. Step 3 법무 확인 질문을 기준으로 담당자가 법령명을 직접 검색해야 합니다.</p> : null}
          {step3TextList(step3Productization.lawAndConsumerQuestions).slice(0, 4).map((question) => <div className="verification-law" key={question}><strong>Step 3 법무 확인 질문</strong><small>{question}</small></div>)}
          <p>{officialLawDetails && Object.keys(officialLawDetails).length ? '공식 법령 상세·조문 원문을 조회했습니다. 적용 여부와 약관 반영은 법무·담당자 확인이 필요합니다.' : '공식 법령 검색 결과를 선택해 상세·제1조 원문을 조회하세요. 검색·상세 결과 모두 API 응답을 표시하며 법률 판단을 자동 확정하지 않습니다.'}</p>
        </> : productRisk && articleId ? demoLaws.filter((law) => law.risk.includes(productRisk.keyword.split(' ')[0]) || productRisk.keyword.includes(law.risk.split(' ')[0])).slice(0, 2).map((law) => <div className="verification-law" key={law.title}><strong>{law.title}</strong><small>{law.institution} · {law.impact}</small></div>) : <p>연결 기사와 공식 법령 원문이 없습니다. 법무 검토와 원문 연결이 필요합니다.</p>}{articleId && !lawReady ? <p>공식 API 상세·조문 결과와 법무 검토가 필요합니다.</p> : null}</article>
      </div>

      <article className="surface-card verification-gate-board">
        <div className="verification-panel-heading"><div><p className="eyebrow">GATE STATUS / STEP 4</p><h3>상품화 검토 잠금 상태</h3></div><span>{articleId && gates.every(([, done]) => done) ? '다음 단계 진행 가능' : '검증 항목 보강 필요'}</span></div>
        <div className="verification-gates">{gates.map(([label, done, description]) => <div className={done ? 'done' : ''} key={label}><i>{done ? '✓' : '!'}</i><span><strong>{label}</strong><small>{description}</small></span></div>)}</div>
        <div className="verification-next-action"><div><span>다음 작업</span><strong>{!articleId ? 'canonical 기사 연결 및 원문 확인' : !completed.includes('verification') ? '독립 교차검증 실행' : !lawReady ? '공식 법령 검토' : '담당자 종합 평가'}</strong><small>단일 신호는 자동으로 신규 위험 후보로 승격하지 않습니다.</small><em>요청 상태 · {candidateRequestState === 'succeeded' ? '후보 등록 요청 완료' : candidateRequestState === 'loading' ? '전송 중' : candidateRequestState === 'failed' ? '실패 · 재시도 필요' : candidateRequestState === 'pending-mapping' ? 'canonical mapping 대기' : '대기'}</em></div><button type="button" disabled={!articleId || Boolean(busy) || completed.includes('candidate') || !gates.every(([, done]) => done)} onClick={() => void runAction('candidate')}>{!articleId ? '상세 매핑 대기' : completed.includes('candidate') ? '요청 완료' : candidateRequestState === 'loading' ? '전송 중…' : '후보 등록 요청'}</button></div>
      </article>
    </section>
  )
}
