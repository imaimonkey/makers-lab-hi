import type { RadarNewsAnalysis, RadarNewsArticle } from '../../domain/risk/riskRadarTypes'
import type { SampleRiskCandidate, SampleRiskDetail } from '../../domain/risk/sampleData'

function formatDate(value?: string) {
  if (!value) return '발행일 확인 필요'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR')
}

function firstOrFallback(values: string[] | undefined, fallback: string[]) {
  return values?.filter(Boolean).length ? values.filter(Boolean) : fallback
}

export function RiskArticleOverview({
  risk,
  detail,
  article,
  analysis,
  sourceLabel,
}: {
  risk: SampleRiskCandidate
  detail: SampleRiskDetail
  article?: RadarNewsArticle
  analysis?: RadarNewsAnalysis | null
  sourceLabel: string
}) {
  const facts = analysis?.articleFacts
  const interpretation = analysis?.riskInterpretation
  const keyFacts = firstOrFallback(facts?.facts, [detail.riskStatement, `${detail.exposedParty}에게 ${detail.primaryLoss}가 발생할 수 있습니다.`])
  const damageTypes = firstOrFallback(interpretation?.expectedLosses, [detail.primaryLoss])
  const affectedTargets = firstOrFallback(interpretation?.responsibilityCandidates, [detail.exposedParty])
  const industries = firstOrFallback(facts?.industries, [risk.themeLabel])
  const headline = article?.summary ?? detail.riskStatement
  const event = facts?.event ?? detail.riskStatement
  const whyNow = interpretation?.whyNow ?? '현재 관측된 변화가 기존 위험 분류와 보장 범위를 다시 확인할 이유를 만들고 있습니다.'

  return (
    <section className="risk-article-overview" aria-labelledby="risk-article-title">
      <header className="risk-article-header">
        <div className="risk-article-kicker"><span>RISK BRIEF</span><i aria-hidden="true" /> <span>{risk.themeLabel}</span></div>
        <h2 id="risk-article-title">{article?.title ?? risk.title}</h2>
        <p className="risk-article-dek">{headline}</p>
        <div className="risk-article-meta" aria-label="기사 메타데이터">
          <span>{article?.source ?? '위험 후보 분석'}</span>
          <span>{formatDate(article?.publishedAt ?? article?.collectedAt ?? risk.updatedAt)}</span>
          <span>{sourceLabel}</span>
        </div>
      </header>

      <div className="risk-article-lead-grid">
        <article className="risk-article-story">
          <p className="risk-article-section-label">WHAT HAPPENED</p>
          <h3>무슨 일이 일어났나</h3>
          <p className="risk-article-event">{event}</p>
          <ul className="risk-article-facts">
            {keyFacts.slice(0, 4).map((fact) => <li key={fact}>{fact}</li>)}
          </ul>
        </article>

        <aside className="risk-article-why">
          <p className="risk-article-section-label">WHY IT MATTERS</p>
          <h3>왜 위험으로 보는가</h3>
          <p>{whyNow}</p>
          <dl>
            <div><dt>노출 주체</dt><dd>{affectedTargets.slice(0, 2).join(' · ')}</dd></div>
            <div><dt>예상 손해</dt><dd>{damageTypes.slice(0, 2).join(' · ')}</dd></div>
          </dl>
        </aside>
      </div>

      <div className="risk-article-analysis" aria-label="위험 내용 분석">
        <article>
          <p className="risk-article-section-label">RISK PATH</p>
          <h3>어떤 손해로 이어지나</h3>
          <ul className="risk-article-chip-list">{damageTypes.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article>
          <p className="risk-article-section-label">EXPOSURE</p>
          <h3>누가 영향을 받나</h3>
          <ul className="risk-article-chip-list">{affectedTargets.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article>
          <p className="risk-article-section-label">SCOPE</p>
          <h3>관련 산업·키워드</h3>
          <ul className="risk-article-chip-list">{industries.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      </div>

      <details className="risk-article-source-context">
        <summary>기사 분석에 연결된 정보 보기</summary>
        <div>
          <span>분석 범위</span>
          <p>{facts?.timeAndPlace ?? '위험 후보 설명과 연결 근거를 바탕으로 정리한 분석입니다.'}</p>
          {facts?.changeType ? <><span>변화 유형</span><p>{facts.changeType}</p></> : null}
          {interpretation?.searchKeywords?.length ? <><span>검색 키워드</span><p>{interpretation.searchKeywords.join(' · ')}</p></> : null}
        </div>
      </details>
    </section>
  )
}
