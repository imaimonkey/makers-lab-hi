import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { demoDashboardMetrics, demoIssues, demoLaws, demoRisks, type IssueAudience } from '../../domain/risk/riskRadarDemo'
import { riskRadarApi } from './riskRadarApi'
import { AppIcon } from '../../shared/components/AppIcon'

const audiences: Array<'전체' | IssueAudience> = ['전체', '개인 니즈', '기업 니즈', '영업·현장', '뉴스·산업', '법령·규제']

const routeLabels = ['기존 상품', '특약 확장', '신규 담보', '신규 주계약', '판단 대기'] as const

function tone(value: string) {
  if (value === '심각' || value === '검토 필요' || value === '없음') return 'warning'
  if (value === '높음' || value === '보강 필요') return 'attention'
  return 'normal'
}

function relatedRiskFor(issueId: string) {
  return demoRisks.find((risk) => risk.articleId === `demo-news-${issueId.replace('issue-', '')}`)
}

export function RiskRadarOperationsPanel() {
  const [audience, setAudience] = useState<'전체' | IssueAudience>('전체')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [signalTitle, setSignalTitle] = useState('')
  const [signalDescription, setSignalDescription] = useState('')
  const [signals, setSignals] = useState<string[]>([])
  const [busy, setBusy] = useState('')

  const issues = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    return demoIssues.filter((issue) => {
      const matchesAudience = audience === '전체' || issue.audience === audience
      const haystack = `${issue.title} ${issue.target} ${issue.coverageGap}`.toLocaleLowerCase('ko-KR')
      return matchesAudience && (!normalizedQuery || haystack.includes(normalizedQuery))
    })
  }, [audience, query])

  const routeCounts = useMemo(() => routeLabels.map((route) => ({
    route,
    count: demoIssues.filter((issue) => issue.productRoute === route).length,
  })), [])

  async function runAction(action: string, operation: () => Promise<unknown>) {
    setBusy(action)
    try {
      await operation()
      setNotice(`${action} 작업이 완료되었습니다. 대시보드 데이터는 새로고침 후 확인합니다.`)
    } catch {
      setNotice(`${action} API가 연결되지 않았습니다. 운영 데이터는 변경하지 않고 샘플 상태를 유지합니다.`)
    } finally {
      setBusy('')
    }
  }

  function submitSignal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!signalTitle.trim() || !signalDescription.trim()) return
    setSignals((current) => [signalTitle.trim(), ...current].slice(0, 3))
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
          <p>수집·본문 확보·분석·검증은 독립 단계로 남기고, 담당자 확인 전에는 위험 후보를 확정하지 않습니다.</p>
        </div>
        <div className="radar-operation-actions" aria-label="레이더 작업 액션">
          <button type="button" disabled={Boolean(busy)} onClick={() => void runAction('자료 수집', riskRadarApi.collect)}><AppIcon name="trend" size={14} /> {busy === '자료 수집' ? '수집 중…' : '자료 수집'}</button>
          <button type="button" disabled={Boolean(busy)} onClick={() => void runAction('본문 확보', riskRadarApi.enrich)}><AppIcon name="scan" size={14} /> {busy === '본문 확보' ? '확보 중…' : '본문 확보'}</button>
          <button type="button" disabled={Boolean(busy)} onClick={() => void runAction('대기 큐 분석', riskRadarApi.analyzePending)}><AppIcon name="spark" size={14} /> {busy === '대기 큐 분석' ? '분석 중…' : '대기 큐 분석'}</button>
        </div>
      </div>
      {notice && <p className="radar-operation-notice" role="status">{notice}</p>}

      <div className="radar-operations-grid">
        <article className="radar-issue-focus surface-card">
          <div className="panel-heading">
            <div><p className="eyebrow">ISSUE REGISTER</p><h2>상품개발 이슈 큐</h2></div>
            <span className="status-badge sample">SAMPLE</span>
          </div>
          <div className="radar-issue-controls">
            <div className="radar-audience-tabs" aria-label="이슈 유입 채널 필터">
              {audiences.map((item) => <button type="button" key={item} className={audience === item ? 'active' : ''} aria-pressed={audience === item} onClick={() => setAudience(item)}>{item}</button>)}
            </div>
            <label><span className="sr-only">이슈 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이슈·대상·공백 검색" /></label>
          </div>
          <div className="radar-issue-focus-list">
            {issues.slice(0, 4).map((issue, index) => {
              const relatedRisk = relatedRiskFor(issue.id)
              const articleId = relatedRisk?.articleId ?? issue.id
              return (
              <article key={issue.id}>
                <div className="radar-issue-focus-top"><span>0{index + 1}</span><em className={tone(issue.severity)}>{issue.type}</em><small>{issue.stage} · {issue.owner}</small></div>
                <h3>{issue.title}</h3>
                <div className="radar-issue-facts"><span><small>위험 사건</small><strong>{issue.riskEvent}</strong></span><span><small>예상 손실</small><strong>{issue.expectedLoss}</strong></span><span><small>상품화 경로</small><strong>{issue.productRoute}</strong></span><span><small>다음 행동</small><strong>{issue.next}</strong></span></div>
                <div className="radar-issue-progress"><span><i style={{ width: `${issue.progress}%` }} /></span><small>{issue.progress}% · 근거 {issue.sourceCount}건</small></div>
                <div className="radar-issue-actions" aria-label={`${issue.title} 다음 작업`}>
                  {relatedRisk ? <Link to={`/risks/${relatedRisk.id}`}>후보 상세</Link> : null}
                  <button type="button" disabled={Boolean(busy)} onClick={() => void runAction('AI 분석', () => riskRadarApi.analyze(articleId))}>AI 분석</button>
                  <button type="button" disabled={Boolean(busy)} onClick={() => void runAction('교차검증', () => riskRadarApi.verify(articleId))}>교차검증</button>
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
            {demoRisks.slice(0, 5).map((risk) => <div key={risk.id}><div><strong>{risk.keyword}</strong><small>{risk.rider} · {risk.coverageGap}</small></div><span><i style={{ width: `${Math.min(100, risk.score * 20)}%` }} /></span><b>{risk.score.toFixed(2)}</b></div>)}
          </div>
          <div className="radar-route-mix" aria-label="상품화 경로별 후보 수">
            {routeCounts.map((item) => <span key={item.route}><i />{item.route}<strong>{item.count}</strong></span>)}
          </div>
        </article>
      </div>

      <div className="radar-operations-grid secondary">
        <article className="radar-signal-form-panel surface-card">
          <div className="panel-heading"><div><p className="eyebrow">SIGNAL INTAKE</p><h2>뉴스 밖의 현장 신호 등록</h2></div><span className="status-badge sample">LOCAL SAMPLE</span></div>
          <form className="radar-signal-form" onSubmit={submitSignal}>
            <label><span>이슈 제목</span><input value={signalTitle} onChange={(event) => setSignalTitle(event.target.value)} placeholder="반복 문의·현장 이슈" /></label>
            <label><span>관찰 내용</span><textarea value={signalDescription} onChange={(event) => setSignalDescription(event.target.value)} placeholder="문제 상황과 반복 근거를 요약해 주세요." /></label>
            <button type="submit" disabled={!signalTitle.trim() || !signalDescription.trim()}>검토 큐에 추가</button>
          </form>
          {signals.length ? <ul className="radar-captured-signals">{signals.map((signal) => <li key={signal}><AppIcon name="check" size={13} /> {signal}</li>)}</ul> : <p className="radar-form-note">입력값은 현재 화면의 데모 큐에만 남습니다. 고객 개인정보나 원문을 입력하지 마세요.</p>}
        </article>

        <article className="radar-process-panel surface-card">
          <div className="panel-heading"><div><p className="eyebrow">PROCESS GATES</p><h2>검증 파이프라인</h2></div><span className="updated-label">SAMPLE</span></div>
          <ol className="radar-process-list">
            <li><span>01</span><div><strong>수집</strong><small>뉴스·현장 신호</small></div><b>{demoDashboardMetrics.unresolved}</b></li>
            <li><span>02</span><div><strong>후보화</strong><small>클러스터·반복성</small></div><b>{demoDashboardMetrics.candidates}</b></li>
            <li><span>03</span><div><strong>근거·법령 확인</strong><small>보류 이유 기록</small></div><b>{demoDashboardMetrics.lawPending}</b></li>
            <li><span>04</span><div><strong>담당자 판단</strong><small>상품화 다음 단계</small></div><b>{demoDashboardMetrics.reviewerPending}</b></li>
          </ol>
        </article>

        <article className="radar-laws-panel surface-card">
          <div className="panel-heading"><div><p className="eyebrow">LAW & REGULATION</p><h2>공식 확인 대기 변화</h2></div><span className="updated-label">출처 확인 필요</span></div>
          <ul>{demoLaws.slice(0, 4).map((law) => <li key={law.title}><span>{law.institution}</span><strong>{law.title}</strong><small>{law.impact} · {law.when}</small></li>)}</ul>
        </article>
      </div>
    </section>
  )
}
