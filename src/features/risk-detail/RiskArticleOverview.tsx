import type { RadarNewsAnalysis, RadarNewsArticle, RadarRelatedLaw } from '../../domain/risk/riskRadarTypes'
import type { SampleRiskCandidate, SampleRiskDetail, SampleRiskEvidence } from '../../domain/risk/sampleData'
import { getSafeSourceUrl } from './qualitativeAssessment'

function formatDate(value?: string) {
  if (!value) return '발행일 확인 필요'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR')
}

function firstOrFallback(values: string[] | undefined, fallback: string[]) {
  return values?.filter(Boolean).length ? values.filter(Boolean) : fallback
}

function compact(value?: string) {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

function uniqueByKey<T extends { key: string }>(items: Array<T | null>) {
  const seen = new Set<string>()
  return items.filter((item): item is T => {
    if (!item || seen.has(item.key)) return false
    seen.add(item.key)
    return true
  })
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
  const facts = analysis?.articleFacts
  const interpretation = analysis?.riskInterpretation
  const keyFacts = firstOrFallback(facts?.facts, [detail.riskStatement, `${detail.exposedParty}에게 ${detail.primaryLoss}가 발생할 수 있습니다.`])
  const damageTypes = firstOrFallback(interpretation?.expectedLosses, [detail.primaryLoss])
  const affectedTargets = firstOrFallback(interpretation?.responsibilityCandidates, [detail.exposedParty])
  const industries = firstOrFallback(facts?.industries, [risk.themeLabel])
  const uncertainties = firstOrFallback(analysis?.uncertainty, ['공식 원문·국내 판례·실제 손해자료를 추가 확인해야 합니다.'])
  const headline = article?.summary ?? detail.riskStatement
  const event = facts?.event ?? detail.riskStatement
  const whyNow = interpretation?.whyNow ?? '관련 변화가 기존 약관의 보장 범위와 책임 기준을 다시 확인할 필요성을 만들고 있습니다.'
  const sourceUrl = getSafeSourceUrl(article?.originalUrl ?? null)
  const reviewEnvironment = compact(interpretation?.riskEnvironment) || '관련 자료에서 확인된 변화가 어떤 손해와 책임 공백으로 이어질 수 있는지 AI가 정리했습니다.'
  const confidenceReason = compact(analysis?.confidence?.reason) || '원문과 연결 자료를 바탕으로 한 1차 검토입니다. 실제 손해액과 기존 약관의 적용 여부는 별도 확인이 필요합니다.'
  const reviewEvidence = analysis?.evidence?.filter((item) => compact(item.quote)).slice(0, 3) ?? []
  const quoteEvidence = reviewEvidence.length
    ? reviewEvidence.map((item, index) => ({ key: `analysis-${index}-${item.sentenceNo ?? 'na'}`, quote: item.quote, source: article?.source ?? '기사 본문', url: sourceUrl }))
    : evidence.filter((item) => compact(item.excerpt)).slice(0, 3).map((item) => ({ key: item.id, quote: item.excerpt, source: item.sourceName, url: getSafeSourceUrl(item.sourceUrl) }))
  const sourceItems = uniqueByKey([
    article ? { key: `article-${article.id}`, title: article.title, source: article.source ?? '현재 원문', kind: '원문', url: sourceUrl } : null,
    ...relatedArticles.filter((item) => item.id !== article?.id).slice(0, 3).map((item) => ({ key: `article-${item.id}`, title: item.title, source: item.source ?? '연결 기사', kind: '관련 기사', url: getSafeSourceUrl(item.originalUrl ?? null) })),
    ...relatedLaws.slice(0, 3).map((law, index) => ({ key: `law-${law.id ?? index}`, title: law.title ?? '관련 법령·제도 자료', source: law.source ?? '관련 법령', kind: '법령', url: getSafeSourceUrl(law.sourceUrl ?? null) })),
  ])
  const productChecks = detail.decisionChecks.filter(Boolean).slice(0, 4)
  const articleBody = compact(article?.content)

  return (
    <section className="risk-article-overview" aria-labelledby="risk-article-title">
      <header className="risk-article-header">
        <div className="risk-article-kicker"><span>위험 브리핑</span><i aria-hidden="true" /> <span>{risk.themeLabel}</span></div>
        <h2 id="risk-article-title">위험 브리핑</h2>
        <p className="risk-article-dek">{headline}</p>
        <div className="risk-article-meta" aria-label="기사 메타데이터">
          <span>{article?.source ?? '위험 후보 분석'}</span>
          <span>{formatDate(article?.publishedAt ?? article?.collectedAt ?? risk.updatedAt)}</span>
          <span>{sourceLabel}</span>
          {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer noopener">원문 열기 ↗</a> : <em>원문 링크 확인 필요</em>}
        </div>
      </header>

      <div className="risk-article-lead-grid">
        <article className="risk-article-story">
          <p className="risk-article-section-label">사건 요약</p>
          <h3>무슨 일이 일어났나</h3>
          <p className="risk-article-event">{event}</p>
          <ul className="risk-article-facts">
            {keyFacts.slice(0, 4).map((fact) => <li key={fact}>{fact}</li>)}
          </ul>
        </article>

        <aside className="risk-article-why">
          <p className="risk-article-section-label">왜 검토 대상인가</p>
          <h3>왜 위험으로 보는가</h3>
          <p>{whyNow}</p>
          <dl>
            <div><dt>주요 대상</dt><dd>{affectedTargets.slice(0, 2).join(' · ')}</dd></div>
            <div><dt>예상 손해</dt><dd>{damageTypes.slice(0, 2).join(' · ')}</dd></div>
          </dl>
        </aside>
      </div>

      <div className="risk-article-analysis" aria-label="위험 내용 분석">
        <article>
          <p className="risk-article-section-label">손해 경로</p>
          <h3>어떤 손해로 이어지나</h3>
          <ul className="risk-article-chip-list">{damageTypes.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article>
          <p className="risk-article-section-label">영향 대상</p>
          <h3>누가 영향을 받나</h3>
          <ul className="risk-article-chip-list">{affectedTargets.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article>
          <p className="risk-article-section-label">관련 범위</p>
          <h3>관련 산업·키워드</h3>
          <ul className="risk-article-chip-list">{industries.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      </div>

      <div className="risk-article-verification-bar" aria-label="사실과 확인 필요 사항">
        <article><span>현재 확인된 사실</span><p>{keyFacts[0]}</p></article>
        <article><span>아직 확인할 내용</span><p>{uncertainties[0]}</p></article>
      </div>

      <div className="risk-article-review-grid">
        <article className="risk-article-ai-review">
          <p className="risk-article-section-label">본문 해석</p>
          <h3>상품 검토를 위한 위험 해석</h3>
          <p className="risk-article-review-lead">관련 자료에서 확인된 사건·피해·책임 단서를 바탕으로, 상품개발 담당자가 다음 검토를 시작할 수 있도록 위험의 맥락을 정리했습니다.</p>
          <dl className="risk-article-review-points">
            <div><dt>핵심 판단</dt><dd>{reviewEnvironment}</dd></div>
            <div><dt>왜 지금 확인하나</dt><dd>{whyNow}</dd></div>
            <div><dt>판단의 한계</dt><dd>{confidenceReason}</dd></div>
          </dl>
        </article>

        <article className="risk-article-quotes">
          <p className="risk-article-section-label">판단에 사용한 인용</p>
          <h3>판단에 연결된 인용</h3>
          {quoteEvidence.length ? (
            <div className="risk-article-quote-list">
              {quoteEvidence.map((item) => (
                <blockquote key={item.key}>
                  <p>“{item.quote}”</p>
                  <footer><span>{item.source}</span>{item.url ? <a href={item.url} target="_blank" rel="noreferrer noopener">원문 열기 ↗</a> : <em>원문 링크 확인 필요</em>}</footer>
                </blockquote>
              ))}
            </div>
          ) : <p className="risk-article-empty">현재 연결된 원문 인용이 없습니다. 원문 확인 후 주장별 인용을 추가할 수 있습니다.</p>}
        </article>
      </div>

      <div className="risk-article-materials-grid">
        <article className="risk-article-materials">
          <p className="risk-article-section-label">원문과 연결 자료</p>
          <h3>근거자료 및 원문 링크</h3>
          <p className="risk-article-section-note">본문 해석에 연결된 원문·관련 기사·법령을 구분해 확인합니다. 아직 링크가 확인되지 않은 자료는 별도로 표시합니다.</p>
          <ul className="risk-article-material-list">
            {sourceItems.length ? sourceItems.map((item) => (
              <li key={item.key}>
                <div><span>{item.kind}</span><strong>{item.title}</strong><small>{item.source}</small></div>
                {item.url ? <a href={item.url} target="_blank" rel="noreferrer noopener">자료 열기 ↗</a> : <em>원문 링크 확인 필요</em>}
              </li>
            )) : <li className="is-empty">연결된 자료가 없습니다. 후보 원문과 독립 자료를 추가로 확인해야 합니다.</li>}
          </ul>
          {articleBody ? <details className="risk-article-original-body"><summary>원문 본문 보기</summary><p>{articleBody}</p></details> : null}
        </article>

        <article className="risk-article-productization">
          <p className="risk-article-section-label">상품화 검토 관점</p>
          <h3>상품개발 검토 항목</h3>
          <p className="risk-article-product-status"><span>현재 검토 상태</span><strong>{detail.decisionStatus}</strong></p>
          <p className="risk-article-section-note">상품화 여부를 확정하는 화면이 아니라, 보장 구조를 검토하기 전에 확인할 조건을 정리합니다.</p>
          <ul className="risk-article-check-list">
            {productChecks.map((check, index) => <li key={`${check}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{check}</p></li>)}
          </ul>
          <div className="risk-article-product-risk"><span>예상 손해</span><strong>{damageTypes.slice(0, 2).join(' · ')}</strong></div>
        </article>
      </div>

      <details className="risk-article-source-context">
        <summary>이 해석에 사용한 범위 보기</summary>
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
