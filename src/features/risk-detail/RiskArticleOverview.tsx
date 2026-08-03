import type { RadarNewsAnalysis, RadarNewsArticle, RadarRelatedLaw } from '../../domain/risk/riskRadarTypes'
import type { SampleRiskCandidate, SampleRiskDetail, SampleRiskEvidence } from '../../domain/risk/sampleData'
import { getSafeSourceUrl } from './qualitativeAssessment'

function formatDate(value?: string) {
  if (!value) return '발행일 확인 필요'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR')
}

function displayAssessmentLabel(label: string) {
  if (label === '증가성') return '신규성'
  if (label === '보험 사각지대 가능성') return '기존 보장 공백'
  return label
}

export function RiskArticleOverview({
  risk,
  detail,
  article,
  analysis,
  relatedArticles = [],
  relatedLaws = [],
  evidence = [],
  sourceLabel,
}: {
  risk: SampleRiskCandidate
  detail: SampleRiskDetail
  article?: RadarNewsArticle
  analysis?: RadarNewsAnalysis | null
  relatedArticles?: RadarNewsArticle[]
  relatedLaws?: RadarRelatedLaw[]
  evidence?: SampleRiskEvidence[]
  sourceLabel: string
}) {
  const isAiCopyright = risk.id === 'generative-ai-copyright'
  const displayDecisionStatus = detail.decisionStatus === '콘셉트 검토' ? '상품개발 검토' : detail.decisionStatus
  const facts = analysis?.articleFacts
  const interpretation = analysis?.riskInterpretation
  const event = isAiCopyright
    ? '생성형 AI 활용 과정에서 학습 데이터와 생성물의 권리 책임이 문제될 수 있습니다.'
    : facts?.event ?? detail.riskStatement
  const damageTypes = isAiCopyright ? ['법률 검토·소송 방어비용', '손해배상금', '매출 손실'] : interpretation?.expectedLosses?.slice(0, 3) ?? [detail.primaryLoss]
  const affectedTargets = isAiCopyright ? ['AI 활용 기업', '콘텐츠 제작사', '저작권자'] : interpretation?.responsibilityCandidates?.slice(0, 3) ?? [detail.exposedParty]
  const productChecks = isAiCopyright
    ? ['국내 판례와 실제 손해액 자료 확인', 'AI 사용·저작권 관리 수준에 따른 보장 범위 검토', '기존 상품·약관의 보장 범위와 책임 주체 확인', '면책·보상한도·사고 정의의 설계 가능성 검토']
    : detail.decisionChecks.filter(Boolean).slice(0, 4)
  const scoredAssessments = detail.assessments.filter((item) => !['근거 신뢰도', '신규성'].includes(item.label))
  const leadingAssessment = [...scoredAssessments].sort((left, right) => right.score - left.score)[0]
  const totalEvidence = detail.evidence.length
  const verifiedEvidence = detail.evidence.filter((item) => item.verificationStatus === 'verified').length
  const evidenceCoverage = totalEvidence ? Math.round((verifiedEvidence / totalEvidence) * 100) : 0
  const productFrame = [
    ['검토 대상', isAiCopyright ? 'AI를 사용하는 기업과 콘텐츠 제작 과정에서 발생하는 저작권 관련 책임' : `${detail.exposedParty}에서 발생하는 화재·손해 책임`],
    ['사고로 볼 범위', isAiCopyright ? '권리자 이의 제기, 분쟁, 소송, 손해배상 청구가 실제 사고에 해당하는지 확인' : '발화 원인·사고 발생 조건·손해 발생 시점을 어떻게 정의할지 확인'],
    ['기존 보장 확인', isAiCopyright ? '기존 배상책임 상품·특약에서 어디까지 보장하는지 대조 필요' : '기존 상품·특약에서 어디까지 보장하는지 대조 필요'],
    ['검토할 보장', isAiCopyright ? '법률 검토·소송 방어비용·손해배상금 등' : detail.primaryLoss],
    ['설계 쟁점', isAiCopyright ? '학습데이터 출처·생성물 권리·고의성 및 관리 수준' : '면책·보상한도·안전관리 책임 주체'],
  ]
  const sourceItems = [
    article ? { key: `article-${article.id}`, kind: '원문', title: article.title, source: article.source ?? '현재 연결 자료', date: article.publishedAt ?? risk.updatedAt, url: getSafeSourceUrl(article.originalUrl ?? null), status: '원문 확인 필요' } : null,
    ...relatedArticles.filter((item) => item.id !== article?.id).slice(0, 2).map((item) => ({ key: `article-${item.id}`, kind: '관련 기사', title: item.title, source: item.source ?? '연결 기사', date: item.publishedAt ?? risk.updatedAt, url: getSafeSourceUrl(item.originalUrl ?? null), status: '검증 대기' })),
    ...relatedLaws.slice(0, 2).map((law, index) => ({ key: `law-${law.id ?? index}`, kind: '법령·지침', title: law.title ?? '관련 법령·제도 자료', source: law.source ?? '관련 법령', date: law.date ?? risk.updatedAt, url: getSafeSourceUrl(law.sourceUrl ?? null), status: '검증 대기' })),
    ...evidence.slice(0, 2).map((item) => ({ key: item.id, kind: item.type, title: item.title, source: item.sourceName, date: item.publishedAt ?? item.date ?? risk.updatedAt, url: getSafeSourceUrl(item.sourceUrl), status: '원문 확인 필요' })),
  ].filter((item, index, list) => item && list.findIndex((candidate) => candidate?.key === item.key) === index).slice(0, 5)

  return (
    <section id="risk-overview" className="risk-brief-report" aria-label="상품개발 사전 브리핑">
      <div className="brief-report-lead">
        <article className="brief-thesis">
          <p className="brief-label">검토 방향</p>
          <h2>{isAiCopyright ? '생성형 AI 저작권은 현재 상품화 결론보다 책임 기준과 국내 손해자료 확인이 먼저 필요한 위험입니다.' : `${risk.title} 위험은 상품화 여부를 정하기 전에 손해 범위와 기존 보장 여부를 먼저 확인해야 하는 후보입니다.`}</h2>
          <p>{detail.riskStatement}</p>
          <div className="brief-thesis-tags"><span>{risk.themeLabel}</span><span>{displayDecisionStatus}</span></div>
        </article>
        <aside className="brief-decision-card">
          <p className="brief-label">현재 검토 상태</p>
          <strong>{displayDecisionStatus}</strong>
          <p>공식 원문·국내 사례·기존 약관을 확인한 뒤 상품개발 방향을 결정합니다.</p>
          <dl><div><dt>검토 우선순위</dt><dd>{risk.signalStrength}/100</dd></div><div><dt>자료 상태</dt><dd>{sourceLabel}</dd></div></dl>
        </aside>
      </div>

      <div className="brief-report-grid">
        <article className="brief-risk-panel">
          <header><p className="brief-label">01 · 위험 항목</p><h3>위험이 어떻게 발생하고, 누가 영향을 받는가</h3><p>자료에서 포착된 위험 신호를 실제 상품개발 검토에 필요한 문장으로 풀어 정리했습니다.</p></header>
          <dl className="brief-fact-list">
            <div><dt>위험 상황</dt><dd>{event}</dd></div>
            <div><dt>주요 대상</dt><dd>{affectedTargets.join(' · ')}</dd></div>
            <div><dt>예상 손해</dt><dd>{damageTypes.join(' · ')}</dd></div>
            <div><dt>보장 공백</dt><dd>{detail.decisionChecks[1] ?? '기존 상품·약관과의 적용 범위 대조 필요'}</dd></div>
          </dl>
        </article>

        <article id="product-review" className="brief-product-panel">
          <header><p className="brief-label">02 · 상품개발 검토</p><h3>상품으로 검토하기 전에 확인할 내용</h3><p>아직 보장안을 확정하지 않고, 사고와 책임의 범위를 정하기 위해 확인할 기준입니다.</p></header>
          <dl className="brief-product-list">{productFrame.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <details className="brief-next-checks"><summary>추가 확인할 내용 {productChecks.length}개</summary><ul>{productChecks.map((check) => <li key={check}>{check}</li>)}</ul></details>
        </article>
      </div>

      <section className="brief-analytics-panel" aria-labelledby="brief-analytics-title">
        <header className="brief-analytics-heading">
          <div><p className="brief-label">분석 리드아웃</p><h3 id="brief-analytics-title">지금 확인해야 할 판단 포인트</h3><p>현재 연결된 자료와 평가값을 기준으로, 다음 검토 순서를 한눈에 보여줍니다.</p></div>
          <span>현재 연결 데이터 기준</span>
        </header>
        <div className="brief-analytics-grid">
          <article className="brief-analytic-card brief-analytic-card--signal">
            <p className="brief-analytic-label">가장 먼저 확인할 신호</p>
            <div className="brief-analytic-value"><strong>{leadingAssessment ? displayAssessmentLabel(leadingAssessment.label) : '평가 자료 없음'}</strong><b>{leadingAssessment?.score ?? '-'}<small>/100</small></b></div>
            <div className="brief-analytic-bar"><i style={{ width: `${leadingAssessment?.score ?? 0}%` }} /></div>
            <p>현재 평가값 중 가장 높은 항목입니다. 상품화 결론이 아니라 우선 확인할 주제를 정하는 참고값입니다.</p>
          </article>
          <article className="brief-analytic-card brief-analytic-card--coverage">
            <p className="brief-analytic-label">자료 확인 현황</p>
            <div className="brief-analytic-value"><strong>원문 검증</strong><b>{verifiedEvidence}<small>/{totalEvidence}건</small></b></div>
            <div className="brief-analytic-bar"><i style={{ width: `${evidenceCoverage}%` }} /></div>
            <p>{totalEvidence ? `연결된 ${totalEvidence}건 중 ${verifiedEvidence}건이 공식 원문 기준으로 확인됐습니다.` : '연결된 근거자료가 없어 원문 확인부터 필요합니다.'}</p>
          </article>
          <article className="brief-analytic-card brief-analytic-card--gate">
            <p className="brief-analytic-label">판단을 막고 있는 확인 항목</p>
            <strong>{detail.decisionChecks[1] ?? '기존 상품·약관의 적용 범위 대조'}</strong>
            <p>이 항목을 확인한 뒤 보장 공백과 상품개발 가능성을 다시 검토합니다.</p>
          </article>
        </div>
      </section>

      <article id="evidence-materials" className="brief-evidence-panel">
        <header className="brief-evidence-heading"><div><p className="brief-label">03 · 근거자료</p><h3>검토에 사용한 자료</h3><p>원문을 확인하기 전까지는 AI가 정리한 내용을 상품개발 판단의 확정 근거로 사용하지 않습니다.</p></div><span>{sourceItems.length}건 · 원문 확인 필요</span></header>
        <div className="brief-evidence-table" role="table" aria-label="판단 근거자료 목록">
          <div className="brief-evidence-row brief-evidence-row--head" role="row"><span>유형</span><span>자료명·출처</span><span>상태</span><span>열기</span></div>
          {sourceItems.length ? sourceItems.map((item) => item && <div className="brief-evidence-row" role="row" key={item.key}><span className="brief-evidence-kind">{item.kind}</span><div><strong>{item.title}</strong><small>{item.source} · {formatDate(item.date)}</small></div><em>{item.status}</em>{item.url ? <a href={item.url} target="_blank" rel="noreferrer noopener">원문 열기 ↗</a> : <button type="button" disabled>검증 대기</button>}</div>) : <p className="brief-evidence-empty">연결된 자료가 없습니다. 후보 원문과 독립 자료를 추가로 확인해야 합니다.</p>}
        </div>
      </article>
    </section>
  )
}
