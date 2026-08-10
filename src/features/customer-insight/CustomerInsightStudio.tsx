import { type FormEvent, useMemo, useState } from 'react'
import type { CustomerContextTag } from '../../domain/product/catalog'
import { productDisclosureUrl } from '../../domain/product/catalog'
import { appendCustomerSignal } from '../../domain/risk/customerSignalStorage'
import { AppIcon } from '../../shared/components/AppIcon'
import {
  analyzeCustomerSituation,
  buildCustomerSignal,
  type CustomerInsightInput,
  type CustomerInsightResult,
  type EmergingRiskFinding,
} from './recommendationEngine'

const lifeStages = [
  { value: 'young-adult', label: '사회초년·1인 생활' },
  { value: 'family-start', label: '결혼·출산·자녀' },
  { value: 'active-adult', label: '활동기·자산 형성' },
  { value: 'mid-life', label: '중장년·가족 돌봄' },
  { value: 'senior-life', label: '은퇴·건강 관리' },
]

const contextOptions: Array<{ value: CustomerContextTag; label: string }> = [
  { value: 'home', label: '주택·스마트홈' },
  { value: 'car', label: '자동차' },
  { value: 'mobility', label: '새 이동수단' },
  { value: 'child', label: '자녀 돌봄' },
  { value: 'pet', label: '반려동물' },
  { value: 'health', label: '건강 관리' },
  { value: 'travel', label: '여행·출장' },
  { value: 'business', label: '개인사업' },
  { value: 'digital', label: 'AI·디지털 생활' },
]

const emptyInput: CustomerInsightInput = {
  lifeStage: 'young-adult',
  contexts: [],
  situation: '',
  concernLevel: 'exploring',
  insightConsent: false,
}

const sampleInput: CustomerInsightInput = {
  lifeStage: 'family-start',
  contexts: ['home', 'family', 'digital'],
  situation: '신축 아파트에서 태양광과 가정용 ESS, 스마트홈 기기를 함께 사용하고 있습니다. 배터리 화재나 홈IoT 오작동으로 이웃집까지 피해가 생길 때 기존 보험으로 충분한지 궁금합니다.',
  concernLevel: 'needs-review',
  insightConsent: true,
}
void sampleInput

export function CustomerInsightStudio() {
  const [input, setInput] = useState<CustomerInsightInput>(emptyInput)
  const [result, setResult] = useState<CustomerInsightResult | null>(null)
  const [queuedFindingIds, setQueuedFindingIds] = useState<string[]>([])
  const [error, setError] = useState('')

  const selectedLifeStage = useMemo(
    () => lifeStages.find((stage) => stage.value === input.lifeStage)?.label ?? input.lifeStage,
    [input.lifeStage],
  )

  const toggleContext = (context: CustomerContextTag) => {
    setInput((current) => ({
      ...current,
      contexts: current.contexts.includes(context)
        ? current.contexts.filter((item) => item !== context)
        : [...current.contexts, context],
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (input.situation.trim().length < 12) {
      setError('상황을 12자 이상으로 조금 더 구체적으로 적어주세요.')
      return
    }
    setError('')
    setQueuedFindingIds([])
    setResult(analyzeCustomerSituation(input))
  }

  const queueFinding = (finding: EmergingRiskFinding) => {
    if (!input.insightConsent || !result || queuedFindingIds.includes(finding.id)) return
    appendCustomerSignal(buildCustomerSignal(input, finding, result.redactedSituation))
    setQueuedFindingIds((current) => [...current, finding.id])
  }

  return (
    <div className="customer-studio">
      <div className={result ? 'customer-studio-grid has-result' : 'customer-studio-grid is-empty'}>
        <form className="situation-form surface-card" onSubmit={handleSubmit}>
          <div className="card-heading">
            <div>
              <span className="section-index">01</span>
              <span>
                <h3>내 생활 상황</h3>
                <small>알고 있는 만큼만 편하게 알려주세요.</small>
              </span>
            </div>
          </div>

          <label className="field-label" htmlFor="life-stage">현재 생활 단계</label>
          <select
            id="life-stage"
            value={input.lifeStage}
            onChange={(event) => setInput((current) => ({ ...current, lifeStage: event.target.value }))}
          >
            {lifeStages.map((stage) => <option value={stage.value} key={stage.value}>{stage.label}</option>)}
          </select>

          <fieldset className="context-fieldset">
            <legend>나와 관련된 생활 환경 <small>복수 선택 가능</small></legend>
            <div className="choice-grid">
              {contextOptions.map((option) => (
                <button
                  type="button"
                  aria-pressed={input.contexts.includes(option.value)}
                  className={input.contexts.includes(option.value) ? 'choice-chip selected' : 'choice-chip'}
                  onClick={() => toggleContext(option.value)}
                  key={option.value}
                >
                  <span>{input.contexts.includes(option.value) ? '✓' : '+'}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="field-label" htmlFor="situation">
            걱정되는 상황
            <small>기술·제품·활동과 예상되는 피해를 함께 적으면 더 정확합니다.</small>
          </label>
          <textarea
            id="situation"
            value={input.situation}
            onChange={(event) => setInput((current) => ({ ...current, situation: event.target.value }))}
            placeholder="예: 전동킥보드로 출퇴근하고 있는데 사고가 났을 때 운전자보험이나 자동차보험으로 어디까지 확인할 수 있는지 궁금합니다."
            rows={7}
          />
          <div className="privacy-hint">
            <AppIcon name="lock" size={17} />
            이름, 연락처, 주민번호, 상세 주소는 입력하지 마세요. 형식이 감지되면 저장 전에 마스킹합니다.
          </div>

          <label className="field-label" htmlFor="concern-level">현재 필요한 도움</label>
          <select
            id="concern-level"
            value={input.concernLevel}
            onChange={(event) => setInput((current) => ({ ...current, concernLevel: event.target.value }))}
          >
            <option value="exploring">미리 알아보고 싶어요</option>
            <option value="needs-review">기존 보험의 빈틈을 확인하고 싶어요</option>
            <option value="urgent">가까운 시일 내 상담이 필요해요</option>
          </select>

          <label className="consent-row">
            <input
              type="checkbox"
              checked={input.insightConsent}
              onChange={(event) => setInput((current) => ({ ...current, insightConsent: event.target.checked }))}
            />
            <span>
              <strong>더 나은 상품 연구에 의견 보내기 · 선택</strong>
              개인정보가 제거된 상황 키워드만 새로운 생활 위험과 상품 연구에 활용됩니다.
            </span>
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-action" type="submit">
            내 상황 분석하기 <AppIcon name="arrow" size={18} />
          </button>
        </form>

        <section className="insight-results" id="official-products" aria-live="polite">
          {!result ? (
            <div className="customer-input-guide surface-card">
              <button type="button" className="guide-icon" aria-label="고객 요청 입력 예시 채우기" onClick={() => { setInput(sampleInput); setResult(null); setError('') }}><AppIcon name="spark" size={22} /></button>
              <p className="eyebrow">WRITING GUIDE</p>
              <h3>이 세 가지만 함께 적으면<br />더 정확하게 찾을 수 있어요.</h3>
              <ol>
                <li><span>01</span><div><strong>사용하는 것</strong><p>제품, 기술, 이동수단, 주거 환경</p></div></li>
                <li><span>02</span><div><strong>걱정되는 사고</strong><p>고장, 화재, 상해, 타인 피해</p></div></li>
                <li><span>03</span><div><strong>확인하고 싶은 것</strong><p>기존 보험의 보장 가능성과 빈틈</p></div></li>
              </ol>
              <div className="guide-example">
                <p>“가정용 ESS를 쓰는데 화재로 이웃집까지 피해가 생기면 기존 보험에서 무엇을 확인해야 하나요?”</p>
              </div>
              <div className="guide-privacy"><AppIcon name="lock" size={16} /> 이름·연락처·상세 주소는 적지 않아도 됩니다.</div>
            </div>
          ) : (
            <>
              <article className="result-summary surface-card">
                <div>
                  <p className="eyebrow">ANALYSIS SUMMARY</p>
                  <h3>{selectedLifeStage} 기준 결과</h3>
                </div>
                <div className="summary-counts">
                  <span><strong>{result.recommendations.length}</strong>상품 후보</span>
                  <span className={result.emergingRisks.length ? 'alert' : ''}>
                    <strong>{result.emergingRisks.length}</strong>신규 신호
                  </span>
                </div>
              </article>

              <div className="result-section-heading">
                <div><span className="section-index">02</span><h3>기존 상품 확인 후보</h3></div>
                <a href={productDisclosureUrl} target="_blank" rel="noreferrer">
                  상품공시 확인 <AppIcon name="external" size={15} />
                </a>
              </div>

              <div className="recommendation-list">
                {result.recommendations.slice(0, 2).map(({ product, reason, relevance }, index) => (
                  <article className="product-card surface-card" key={product.id}>
                    <div className="product-rank">0{index + 1}</div>
                    <div className="product-copy">
                      <div className="product-meta">
                        <span>{product.category}</span>
                        <span className="product-meta-actions"><em data-level={relevance}>{relevance} 관련도</em><a href={product.productUrl} target="_blank" rel="noreferrer" className="product-link">공식 상품에서 확인 <AppIcon name="external" size={15} /></a></span>
                      </div>
                      <h4>{product.name}</h4>
                      <p>{product.summary}</p>
                      <div className="recommendation-reason"><AppIcon name="spark" size={16} />{reason}</div>
                      <div className="confirmation-point">
                        <strong>약관 확인 포인트</strong>
                        <span>{product.confirmationPoint}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="result-section-heading emerging-heading">
                <div><span className="section-index">03</span><h3>새롭게 살펴볼 생활 위험</h3></div>
              </div>

              {result.emergingRisks.length ? (
                <div className="emerging-list">
                  {result.emergingRisks.map((finding) => {
                    const queued = queuedFindingIds.includes(finding.id)
                    return (
                      <article className="emerging-card" key={finding.id}>
                        <div className="emerging-card-top">
                          <span><AppIcon name="trend" size={17} /> 기존 설명을 더 확인할 상황</span>
                          <div>{finding.keywords.map((keyword) => <i key={keyword}>#{keyword}</i>)}</div>
                        </div>
                        <h4>{finding.title}</h4>
                        <dl>
                          <div><dt>확인할 빈틈</dt><dd>{finding.gapHypothesis}</dd></div>
                          <div><dt>연구 질문</dt><dd>{finding.analystQuestion}</dd></div>
                        </dl>
                        <button
                          type="button"
                          className={queued ? 'queue-button queued' : 'queue-button'}
                          disabled={!input.insightConsent || queued}
                          onClick={() => queueFinding(finding)}
                        >
                          <AppIcon name={queued ? 'check' : 'arrow'} size={17} />
                          {queued ? '상품 연구 의견이 전달됐어요' : input.insightConsent ? '개인정보 없이 연구 의견 보내기' : '선택 동의 후 의견을 보낼 수 있어요'}
                        </button>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="no-emerging surface-card">
                  <AppIcon name="shield" size={24} />
                  <p><strong>뚜렷한 신규 위험 키워드는 발견되지 않았습니다.</strong>기존 상품 후보의 약관과 가입 조건부터 확인해 보세요.</p>
                </div>
              )}

            </>
          )}
        </section>
      </div>
    </div>
  )
}
