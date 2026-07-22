import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { demoLaws, demoRisks, type ProductRisk } from '../../domain/risk/riskRadarDemo'
import { getWorkbenchRiskId } from '../../domain/risk/riskRadarMappings'
import { riskRadarApi } from '../risk-dashboard/riskRadarApi'

type Audience = '전체' | '개인' | '기업'
type SortMode = 'score' | 'market' | 'severity'

const workflow = [
  ['수집', 42], ['본문 확보', 31], ['AI 분석', 24], ['교차검증', 12], ['법령 검토', 9], ['담당자 확인', 6], ['위험 후보', 7],
] as const

const keywords = ['전기차 배터리 화재', '드론 배송 사고', '생성형 AI 저작권', '메타버스 내 사기', '소상공인 영업중단', '사이버 공격', '기후재난', '공급망 중단', '자율주행 사고', '의료 AI 오류']

function severityValue(value: ProductRisk['severity']) {
  return value === '심각' ? 3 : value === '높음' ? 2 : 1
}

function marketValue(value: ProductRisk['market']) {
  return value === '높음' ? 3 : value === '중간' ? 2 : 1
}

export function RiskExplorationOperations() {
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
    const filtered = demoRisks.filter((risk) => {
      const audienceMatch = audience === '전체' || risk.audience.includes(audience)
      const searchText = `${risk.keyword} ${risk.target} ${risk.industry} ${risk.loss} ${risk.coverageGap} ${risk.keywords.join(' ')}`.toLocaleLowerCase('ko-KR')
      return audienceMatch && (!normalized || searchText.includes(normalized))
    })
    return [...filtered].sort((first, second) => {
      if (sort === 'market') return marketValue(second.market) - marketValue(first.market)
      if (sort === 'severity') return severityValue(second.severity) - severityValue(first.severity)
      return second.score - first.score
    })
  }, [audience, query, sort])

  async function runAction(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key)
    setNotice('')
    try {
      await action()
      setNotice(success)
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
        <div><button type="button" disabled={Boolean(busy)} onClick={() => void runAction('enrich', () => riskRadarApi.enrich(), '본문 확보 작업을 요청했습니다.')}>{busy === 'enrich' ? '확보 중…' : '본문 일괄 확보'}</button><button type="button" disabled={Boolean(busy)} onClick={() => void runAction('pending', () => riskRadarApi.analyzePending(), '분석 대기 큐를 실행했습니다.')}>{busy === 'pending' ? '분석 중…' : '대기 큐 분석'}</button></div>
      </div>
      {notice ? <p className="risk-operations-notice" role="status">{notice}</p> : null}

      <div className="risk-operations-filters">
        <label className="wide"><span>위험 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="위험 키워드·기술·대상·보장 공백" /></label>
        <label><span>기간</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option>최근 7일</option><option>최근 30일</option><option>최근 90일</option></select></label>
        <label><span>지역</span><select value={region} onChange={(event) => setRegion(event.target.value)}><option>전체 지역</option><option>국내</option><option>해외</option></select></label>
        <label><span>소스</span><select value={source} onChange={(event) => setSource(event.target.value)}><option>전체 소스</option><option>뉴스</option><option>개인 니즈</option><option>기업 니즈</option></select></label>
        <label><span>정렬</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="score">AI 보조점수 순</option><option value="market">시장성 순</option><option value="severity">위험 심각도 순</option></select></label>
      </div>
      <div className="risk-operations-audience" aria-label="개인 기업 대상 필터">{(['전체', '개인', '기업'] as Audience[]).map((item) => <button type="button" key={item} className={audience === item ? 'active' : ''} aria-pressed={audience === item} onClick={() => setAudience(item)}>{item}</button>)}</div>

      <div className="risk-operations-workflow" aria-label="후보 전환 업무 단계">{workflow.map(([label, count], index) => <div key={label}><span className={index < 3 ? 'done' : index === 3 ? 'pending' : ''}>{label}<strong>{count}</strong></span>{index < workflow.length - 1 ? <i>→</i> : null}</div>)}</div>
      <div className="risk-operations-summary"><article><span>탐색 후보</span><strong>{risks.length}</strong><small>현재 필터</small></article><article><span>본문 확보</span><strong>31</strong><small>{period} · SAMPLE</small></article><article><span>기업 수요</span><strong>14</strong><small>{source}</small></article><article><span>법령 변화</span><strong>{demoLaws.length}</strong><small>{region} · 확인 대기</small></article></div>

      <div className="risk-operations-context-grid">
        <article><div className="risk-operations-section-heading"><div><p className="eyebrow">EMERGING KEYWORDS</p><h3>주요 키워드</h3></div><span>SAMPLE</span></div><div className="risk-operations-cloud">{keywords.map((keyword, index) => <button type="button" className={`weight-${index % 4}`} key={keyword} onClick={() => setQuery(keyword)}>{keyword}</button>)}</div></article>
        <article><div className="risk-operations-section-heading"><div><p className="eyebrow">LAW & REGULATION</p><h3>법령·규제 검토 큐</h3></div><span>원문 확인 필요</span></div><div className="risk-operations-law-list">{demoLaws.slice(0, 4).map((law) => <div key={law.title}><span>{law.institution}</span><strong>{law.title}</strong><small>{law.risk} · {law.impact} · {law.when}</small></div>)}</div></article>
      </div>

      <div className="risk-operations-table-wrap">
        <table className="risk-operations-table">
          <caption className="sr-only">hyoje 브랜치 신규 위험 상품개발 비교표</caption>
          <thead><tr><th>위험·대상</th><th>손해·보장 공백</th><th>시장성</th><th>위험</th><th>데이터</th><th>법률</th><th>기존 상품</th><th>특약</th><th>신규 주계약</th><th>AI 보조점수</th><th>작업</th></tr></thead>
          <tbody>{risks.map((risk, index) => <tr key={risk.id}><td><span>0{index + 1}</span><strong>{risk.keyword}</strong><small>{risk.audience} · {risk.target}</small></td><td><strong>{risk.loss}</strong><small>{risk.coverageGap}</small></td><td>{risk.market}</td><td>{risk.severity}</td><td>{risk.data}</td><td>{risk.law}</td><td>{risk.existing}</td><td>{risk.rider}</td><td>{risk.mainCoverage}</td><td><strong>{risk.score.toFixed(2)}</strong></td><td><Link to={`/risks/${getWorkbenchRiskId(risk)}`}>상세</Link></td></tr>)}</tbody>
        </table>
        {!risks.length ? <div className="table-empty">조건에 맞는 위험 후보가 없습니다.</div> : null}
      </div>

      <div className="risk-operations-queue-grid">
        <article><div className="risk-operations-section-heading"><div><p className="eyebrow">ARTICLE QUEUE</p><h3>뉴스 본문 분석 큐</h3></div><span>API 경계 포함</span></div>{risks.map((risk, index) => <div className="risk-article-queue-row" key={risk.id}><span>0{index + 1}</span><div><strong>{risk.keyword} 관련 기사 묶음</strong><small>{risk.sourceCount}개 출처 · {risk.mentions}회 언급</small></div><em>{index < 3 ? '본문 확보' : '본문 필요'}</em><div><Link to={`/risks/${getWorkbenchRiskId(risk)}`}>상세</Link><button type="button" disabled={Boolean(busy)} onClick={() => void runAction(`analyze:${risk.id}`, () => riskRadarApi.analyze(risk.articleId), `${risk.keyword} 분석을 요청했습니다.`)}>{busy === `analyze:${risk.id}` ? '분석 중' : 'AI 분석'}</button><button type="button" disabled={Boolean(busy)} onClick={() => void runAction(`verify:${risk.id}`, () => riskRadarApi.verify(risk.articleId), `${risk.keyword} 교차검증을 요청했습니다.`)}>검증</button></div></div>)}</article>
        <article><div className="risk-operations-section-heading"><div><p className="eyebrow">CANDIDATE REVIEW</p><h3>상품개발 후보 카드</h3></div><span>담당자 확인 전</span></div>{risks.slice(0, 3).map((risk) => <div className="risk-candidate-review-card" key={risk.id}><div><span>{risk.audience}</span><em>점수 {risk.score.toFixed(2)}</em></div><strong>{risk.keyword}</strong><p>{risk.impact}</p><small>다음 행동 · {risk.next}</small><div><Link to={`/risks/${getWorkbenchRiskId(risk)}`}>위험 상세</Link><button type="button" disabled={Boolean(busy)} onClick={() => void runAction(`candidate:${risk.id}`, () => riskRadarApi.createRisk(risk.articleId), `${risk.keyword} 후보 등록을 요청했습니다.`)}>후보 등록 요청</button></div></div>)}</article>
      </div>
      <p className="risk-operations-disclaimer">SAMPLE · AI 점수와 후보 등록 요청은 실무자 검토를 대체하지 않으며, 단일 신호를 자동 승격하지 않습니다.</p>
    </section>
  )
}
