import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  demoIssues,
  demoLaws,
  demoRisks,
  demoTrend,
  type IssueAudience,
  type ProductIssue,
  type ProductRisk,
} from '../../domain/risk/riskRadarDemo'
import { getWorkbenchRiskId } from '../../domain/risk/riskRadarMappings'

const audiences: IssueAudience[] = ['전체', '개인 니즈', '기업 니즈', '영업·현장', '뉴스·산업', '법령·규제']

function statusTone(value: string) {
  if (value.includes('심각') || value.includes('없음') || value.includes('필요')) return 'warning'
  if (value.includes('높음') || value.includes('가능')) return 'positive'
  return 'neutral'
}

function RelatedRiskLink({ risk, children }: { risk: ProductRisk; children: string }) {
  return <Link to={`/risks/${getWorkbenchRiskId(risk)}`}>{children}</Link>
}

function TrendLines() {
  const width = 620
  const height = 190
  const max = Math.max(...demoTrend.flatMap((series) => series.values), 100)
  const points = (values: number[]) => values.map((value, index) => (
    `${(index / Math.max(1, values.length - 1)) * width},${height - 20 - (value / max) * (height - 38)}`
  )).join(' ')

  return (
    <div className="product-board-trend">
      <div className="product-board-trend-legend">
        {demoTrend.map((series) => <span key={series.label}><i style={{ background: series.color }} />{series.label}</span>)}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="최근 7일 위험 분야별 신호 추이 샘플">
        {[22, 92, 162].map((y) => <line key={y} x1="0" x2={width} y1={y} y2={y} />)}
        {demoTrend.map((series) => <polyline key={series.label} points={points(series.values)} fill="none" stroke={series.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
      </svg>
      <div className="product-board-trend-labels"><span>7일 전</span><span>5일 전</span><span>3일 전</span><span>오늘</span></div>
    </div>
  )
}

function ProductBlueprint({ issue }: { issue: ProductIssue }) {
  const relatedRisk = demoRisks.find((risk) => risk.articleId === `demo-news-${issue.id.replace('issue-', '')}`) ?? demoRisks[0]
  const designChecks = [
    { label: '가입 수요·대상', value: issue.target, state: issue.market === '높음' ? '확인' : '조사' },
    { label: '손해 빈도·손해액', value: `데이터 ${issue.data}`, state: issue.data === '충분' ? '확인' : '보강' },
    { label: '법령·책임 주체', value: `법령 ${issue.law}`, state: issue.law === '검토 필요' ? '검토' : '확인' },
    { label: '약관·면책 문구', value: '기존 보장 중복과 면책 경계', state: '검토' },
  ]

  return (
    <section className="product-blueprint surface-card" aria-label="선택 이슈 상품 설계 브리프">
      <div className="product-board-heading">
        <div><p className="eyebrow">PRODUCT BRIEF · SAMPLE</p><h2>보험상품 설계 브리프</h2></div>
        <span className={`product-board-badge ${statusTone(issue.productRoute)}`}>{issue.productRoute}</span>
      </div>
      <div className="product-blueprint-title"><h3>{issue.title}</h3><span>{issue.audience} · {issue.stage} 단계</span></div>
      <div className="product-blueprint-facts">
        <div><small>누가 가입·보장받나</small><strong>{issue.target}</strong></div>
        <div><small>어떤 위험 사건인가</small><strong>{issue.riskEvent}</strong></div>
        <div><small>어떤 손해가 예상되나</small><strong>{issue.expectedLoss}</strong></div>
        <div><small>기존 보장의 공백</small><strong>{issue.coverageGap}</strong></div>
      </div>
      <div className="product-blueprint-flow"><span>위험 발생</span><i>→</i><span>손해 확인</span><i>→</i><span>{issue.productRoute}</span></div>
      <div className="product-blueprint-checks">
        {designChecks.map((check, index) => <article key={check.label}><span>0{index + 1}</span><div><strong>{check.label}</strong><small>{check.value}</small></div><em>{check.state}</em></article>)}
      </div>
      <div className="product-blueprint-next">
        <div><small>지금 설계자가 해야 할 일</small><strong>{issue.next}</strong></div>
        <div><RelatedRiskLink risk={relatedRisk}>근거 상세</RelatedRiskLink><Link to="/reports">종합 리포트</Link></div>
      </div>
    </section>
  )
}

export function RiskProductDevelopmentBoard() {
  const [audience, setAudience] = useState<IssueAudience>('전체')
  const [query, setQuery] = useState('')
  const [selectedIssueId, setSelectedIssueId] = useState(demoIssues[0]?.id ?? '')

  const issues = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    return demoIssues.filter((issue) => {
      const channelMatch = audience === '전체' || issue.audience === audience
      const searchText = `${issue.title} ${issue.target} ${issue.riskEvent} ${issue.coverageGap}`.toLocaleLowerCase('ko-KR')
      return channelMatch && (!normalized || searchText.includes(normalized))
    })
  }, [audience, query])

  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId) ?? issues[0] ?? demoIssues[0]
  const routeCounts = demoIssues.reduce<Record<string, number>>((counts, issue) => ({ ...counts, [issue.productRoute]: (counts[issue.productRoute] ?? 0) + 1 }), {})
  const keywords = ['전기차 배터리 화재', '드론 배송 사고', '생성형 AI 저작권', '메타버스 내 사기', '소상공인 영업중단', '사이버 공격', '기후재난', '공급망 중단', '자율주행 사고', '의료 AI 오류']

  return (
    <section className="product-development-board" aria-label="hyoje 상품개발 통합 현황판">
      <div className="product-board-intro surface-card">
        <div><p className="eyebrow">ISSUE DASHBOARD / PRODUCT DECISION · HYOJE</p><h2>수요에서 상품화 경로까지 한 화면에서 판단</h2><p>수요 → 위험 사건 → 예상 손해 → 보장 공백 → 상품화 경로를 동일 이슈 ID로 연결합니다.</p></div>
        <Link to="/risks">신규 위험 탐색 →</Link>
      </div>

      <section className="product-board-matrix surface-card">
        <div className="product-board-heading"><div><p className="eyebrow">ISSUE MATRIX · SAMPLE</p><h2>보험상품 개발 이슈 매트릭스</h2></div><label><span className="sr-only">이슈 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이슈·대상·위험·보장 공백 검색" /></label></div>
        <div className="product-board-tabs" aria-label="수요 채널 필터">{audiences.map((item) => <button type="button" key={item} className={audience === item ? 'active' : ''} aria-pressed={audience === item} onClick={() => setAudience(item)}>{item}<small>{item === '전체' ? demoIssues.length : demoIssues.filter((issue) => issue.audience === item).length}</small></button>)}</div>
        <div className="product-board-table-wrap">
          <table className="product-board-table">
            <thead><tr><th>이슈명·수요</th><th>대상·위험 사건</th><th>예상 손해</th><th>보장 공백</th><th>상품화 경로</th><th>시장성·데이터</th><th>법령·단계</th><th>다음 행동</th></tr></thead>
            <tbody>{issues.map((issue) => <tr key={issue.id} className={selectedIssue?.id === issue.id ? 'selected' : ''} onClick={() => setSelectedIssueId(issue.id)}><td><strong>{issue.title}</strong><small>{issue.audience} · {issue.type}</small></td><td><strong>{issue.target}</strong><small>{issue.riskEvent}</small></td><td>{issue.expectedLoss}</td><td>{issue.coverageGap}</td><td><span className={`product-board-badge ${statusTone(issue.productRoute)}`}>{issue.productRoute}</span><small>진행 {issue.progress}%</small></td><td><span>시장 {issue.market}</span><small>데이터 {issue.data}</small></td><td><span>법령 {issue.law}</span><small>{issue.stage} · {issue.owner}</small></td><td><strong>{issue.next}</strong><small>{issue.due}</small></td></tr>)}</tbody>
          </table>
          {!issues.length && <div className="table-empty">선택한 조건에 해당하는 이슈가 없습니다.</div>}
        </div>
      </section>

      <div className="product-board-decision-grid">
        <section className="surface-card product-board-priority"><div className="product-board-heading"><div><p className="eyebrow">DECISION FIRST</p><h2>지금 볼 이슈</h2></div><strong>{issues.length}<small>건</small></strong></div>{issues.slice(0, 3).map((issue, index) => <button key={issue.id} type="button" className={selectedIssue?.id === issue.id ? 'selected' : ''} onClick={() => setSelectedIssueId(issue.id)}><span>0{index + 1}</span><div><strong>{issue.title}</strong><small>{issue.target} · {issue.expectedLoss}</small></div><i>{selectedIssue?.id === issue.id ? '●' : '→'}</i></button>)}</section>
        <section className="surface-card product-board-readiness"><div className="product-board-heading"><div><p className="eyebrow">READINESS MAP</p><h2>상품화 우선순위</h2></div><span>위험 × 준비도</span></div><div className="product-board-readiness-plot"><span>바로 검토</span><span>근거 보강</span><span>시장성 조사</span><span>보류</span>{issues.slice(0, 7).map((issue, index) => <button key={issue.id} type="button" title={issue.title} className={issue.severity === '심각' ? 'critical' : issue.severity === '높음' ? 'high' : 'medium'} style={{ left: `${Math.min(88, 16 + issue.progress * .72)}%`, top: `${issue.severity === '심각' ? 20 + index * 3 : issue.severity === '높음' ? 42 + index * 2 : 70}%` }} onClick={() => setSelectedIssueId(issue.id)} />)}</div></section>
      </div>

      {selectedIssue ? <ProductBlueprint issue={selectedIssue} /> : null}

      <div className="product-board-market-grid">
        <section className="surface-card product-board-keywords"><div className="product-board-heading"><div><p className="eyebrow">EMERGING KEYWORDS</p><h2>시장조사 키워드</h2></div><span>SAMPLE</span></div><div>{keywords.map((keyword, index) => <button type="button" className={`weight-${index % 4}`} key={keyword} onClick={() => setQuery(keyword)}>{keyword}</button>)}</div><small>언론량·수요·사고·보장 공백을 합친 시연용 가중치</small></section>
        <section className="surface-card product-board-trend-panel"><div className="product-board-heading"><div><p className="eyebrow">RISK AREA TREND</p><h2>위험 분야별 증가 추이</h2></div><span>최근 7일 · SAMPLE</span></div><TrendLines /></section>
        <section className="surface-card product-board-laws"><div className="product-board-heading"><div><p className="eyebrow">LAW & REGULATION</p><h2>규제·법률 업데이트</h2></div><span>원문 확인 대기</span></div>{demoLaws.map((law) => <article key={law.title}><span>{law.institution}</span><div><strong>{law.title}</strong><small>{law.risk} · {law.impact}</small></div><time>{law.when}</time></article>)}</section>
      </div>

      <section className="surface-card product-board-comparison">
        <div className="product-board-heading"><div><p className="eyebrow">TOP 5 / PRODUCT DEVELOPMENT COMPARISON</p><h2>신규 위험 TOP-5 비교 분석</h2></div><span>SAMPLE · 담당자 검토용</span></div>
        <div className="product-board-table-wrap"><table><thead><tr><th>위험 키워드</th><th>대상 고객</th><th>손해·공백</th><th>시장성</th><th>위험</th><th>데이터</th><th>법률</th><th>기존 상품</th><th>특약</th><th>신규 주계약</th><th>AI 보조점수</th><th /></tr></thead><tbody>{demoRisks.map((risk, index) => <tr key={risk.id}><td><span className="product-board-rank">0{index + 1}</span><strong>{risk.keyword}</strong><small>{risk.industry} · 출처 {risk.sourceCount}곳</small></td><td>{risk.target}</td><td><strong>{risk.loss}</strong><small>{risk.coverageGap}</small></td><td>{risk.market}</td><td>{risk.severity}</td><td>{risk.data}</td><td>{risk.law}</td><td>{risk.existing}</td><td>{risk.rider}</td><td>{risk.mainCoverage}</td><td><strong>{risk.score.toFixed(2)}</strong></td><td><RelatedRiskLink risk={risk}>상세 →</RelatedRiskLink></td></tr>)}</tbody></table></div>
        <div className="product-board-route-summary">{Object.entries(routeCounts).map(([route, count]) => <span key={route}>{route}<strong>{count}</strong></span>)}</div>
        <p>실제 상품명·보장 여부는 표시하지 않습니다. 공식 상품 문서와 약관 확인 전에는 연결 가능성만 검토합니다.</p>
      </section>
    </section>
  )
}
