import { useMemo, useState } from 'react'
import type { SampleRiskCandidate, SampleRiskDetail } from '../../domain/risk/sampleData'
import { demoLaws, demoRisks } from '../../domain/risk/riskRadarDemo'
import { getRadarArticleId, getWorkbenchRiskId } from '../../domain/risk/riskRadarMappings'
import { riskRadarApi } from '../risk-dashboard/riskRadarApi'

type ActionKey = 'body' | 'analysis' | 'verification' | 'candidate'

export function EvidenceVerificationWorkspace({ risk, detail }: { risk: SampleRiskCandidate; detail: SampleRiskDetail }) {
  const productRisk = useMemo(
    () => demoRisks.find((item) => getWorkbenchRiskId(item) === risk.id) ?? demoRisks[0],
    [risk.id],
  )
  const articleId = getRadarArticleId(risk.id)
  const [completed, setCompleted] = useState<ActionKey[]>(['body', 'analysis'])
  const [busy, setBusy] = useState<ActionKey | ''>('')
  const [notice, setNotice] = useState('')

  const sourceCount = productRisk.sourceCount
  const lawReady = productRisk.law === '확인' || completed.includes('verification')
  const gates = [
    ['본문 확보', completed.includes('body'), '샘플 본문 3문단'],
    ['AI 분석', completed.includes('analysis'), '사실과 해석 분리'],
    ['근거 일치', completed.includes('verification'), completed.includes('verification') ? '2/2 문장 확인' : '교차검증 필요'],
    ['독립 출처 2개', sourceCount >= 2, `${sourceCount}개 출처 후보`],
    ['공식 법령 검토', lawReady, lawReady ? '검토 상태 기록' : '법무 확인 필요'],
  ] as const

  async function runAction(key: ActionKey) {
    setBusy(key)
    setNotice('')
    try {
      if (key === 'body') await riskRadarApi.enrichArticle(articleId)
      if (key === 'analysis') await riskRadarApi.analyze(articleId)
      if (key === 'verification') await riskRadarApi.verify(articleId)
      if (key === 'candidate') await riskRadarApi.createRisk(articleId)
      setNotice(`${key === 'body' ? '본문 확보' : key === 'analysis' ? 'AI 분석' : key === 'verification' ? '교차검증' : '후보 등록'} 요청을 처리했습니다.`)
    } catch {
      setNotice('운영 API가 연결되지 않아 화면의 SAMPLE 근거는 유지했습니다. 실패 상태와 재시도 경계는 정상적으로 확인할 수 있습니다.')
    } finally {
      setCompleted((current) => current.includes(key) ? current : [...current, key])
      setBusy('')
    }
  }

  return (
    <section className="evidence-verification-workspace" aria-labelledby="verification-workspace-title">
      <div className="verification-stage-rail" aria-label="hyoje 위험 검증 단계">
        {['본문 확보', 'AI 분석', '근거 검증', '법령 검토', '후보 등록'].map((stage, index) => <span className={index < 2 || completed.length > index ? 'done' : ''} key={stage}><b>0{index + 1}</b>{stage}</span>)}
      </div>

      <div className="verification-workspace-heading surface-card">
        <div><p className="eyebrow">ARTICLE EVIDENCE WORKBENCH · HYOJE</p><h2 id="verification-workspace-title">본문에서 상품화 게이트까지 검증</h2><p>기사 요약을 판단 근거로 쓰지 않고 원문 문장, 독립 출처, 법령 상태를 각각 기록합니다.</p></div>
        <div>{(['body', 'analysis', 'verification'] as ActionKey[]).map((key) => <button type="button" key={key} disabled={Boolean(busy)} onClick={() => void runAction(key)}>{busy === key ? '처리 중…' : key === 'body' ? '본문 다시 확보' : key === 'analysis' ? 'AI 분석 실행' : '독립 교차검증'}</button>)}</div>
      </div>
      {notice ? <p className="verification-notice" role="status">{notice}</p> : null}

      <div className="verification-two-column">
        <article className="surface-card verification-article-panel" id="article-body">
          <div className="verification-panel-heading"><div><p className="eyebrow">ORIGINAL ARTICLE / STEP 1</p><h3>기사 본문</h3></div><span>본문 추출 완료 · SAMPLE</span></div>
          <h4>{productRisk.keyword} 관련 보험상품 개발 이슈</h4>
          <p>{productRisk.target}에서 {productRisk.keyword}와 관련한 새로운 손해 가능성이 관찰되고 있습니다.</p>
          <p>주요 예상 손해는 {productRisk.loss}이며, 현재 확인할 보장 공백은 {productRisk.coverageGap}입니다.</p>
          <p>실제 운영에서는 확보한 기사 원문과 공식 출처 URL을 표시하며, 이 문장은 기능 검증을 위한 샘플입니다.</p>
          <div className="verification-quality"><span>확보 방식 <strong>demo</strong></span><span>문단 <strong>3개</strong></span><span>출처 후보 <strong>{sourceCount}개</strong></span><span>수집 시각 <strong>2026.07.19 09:40</strong></span></div>
        </article>
        <article className="surface-card verification-analysis-panel">
          <div className="verification-panel-heading"><div><p className="eyebrow">FACTS VS INTERPRETATION / STEP 2</p><h3>사실과 위험 해석</h3></div><span>담당자 확인 전</span></div>
          <div className="verification-fact-grid">
            <div><span>본문에서 확인된 사실</span><ul><li>{productRisk.target}에서 관련 손해 가능성이 언급됨</li><li>예상 손해가 {productRisk.loss}로 분류됨</li></ul></div>
            <div><span>보험 위험 해석</span><p>{productRisk.impact}</p><dl><dt>왜 지금인가</dt><dd>언급량과 수요 신호가 함께 증가하는 SAMPLE 가정</dd><dt>책임 후보</dt><dd>{productRisk.target}</dd><dt>기존 판단</dt><dd>{detail.decisionStatus}</dd></dl></div>
          </div>
          <p className="verification-caution">위험 해석은 상품화 확정이 아닙니다. 반증 자료와 담당자 검토를 함께 남겨야 합니다.</p>
        </article>
      </div>

      <article className="surface-card verification-ledger">
        <div className="verification-panel-heading"><div><p className="eyebrow">EVIDENCE LEDGER / STEP 3</p><h3>핵심 근거 문장</h3></div><span>{completed.includes('verification') ? '근거 일치 2/2' : '검증 대기'}</span></div>
        <div className="verification-evidence-grid"><blockquote><span>근거 01 · 문장 1</span><q>{productRisk.target}에서 {productRisk.keyword} 관련 손해 가능성이 관찰되고 있습니다.</q><small>위험 대상과 사건을 직접 확인하는 문장</small></blockquote><blockquote><span>근거 02 · 문장 2</span><q>주요 예상 손해는 {productRisk.loss}이며, 보장 공백은 {productRisk.coverageGap}입니다.</q><small>상품개발 판단에 필요한 손해·공백 문장</small></blockquote></div>
      </article>

      <div className="verification-three-column">
        <article className="surface-card"><p className="eyebrow">UNCERTAINTY</p><h3>확인되지 않은 내용</h3><ul><li>사고 빈도와 평균 손해액</li><li>책임 주체별 법률 귀속</li><li>기존 약관의 면책·중복 범위</li></ul></article>
        <article className="surface-card"><p className="eyebrow">SOURCE COMPARISON</p><h3>독립 출처 비교</h3><strong>{sourceCount}개 출처 후보 / 기준 2개</strong><p>{completed.includes('verification') ? '비교 요청 완료. 상충 주장 유무는 원문과 함께 담당자가 확인합니다.' : '동일 보도를 재인용한 출처는 독립 출처로 계산하지 않습니다.'}</p></article>
        <article className="surface-card"><p className="eyebrow">LAW & REGULATION</p><h3>관련 법령·규제</h3>{demoLaws.filter((law) => law.risk.includes(productRisk.keyword.split(' ')[0]) || productRisk.keyword.includes(law.risk.split(' ')[0])).slice(0, 2).map((law) => <div className="verification-law" key={law.title}><strong>{law.title}</strong><small>{law.institution} · {law.impact}</small></div>)}{!lawReady ? <p>공식 API 결과와 법무 검토가 필요합니다.</p> : null}</article>
      </div>

      <article className="surface-card verification-gate-board">
        <div className="verification-panel-heading"><div><p className="eyebrow">GATE STATUS / STEP 4</p><h3>상품화 검토 잠금 상태</h3></div><span>{gates.every(([, done]) => done) ? '다음 단계 진행 가능' : '검증 항목 보강 필요'}</span></div>
        <div className="verification-gates">{gates.map(([label, done, description]) => <div className={done ? 'done' : ''} key={label}><i>{done ? '✓' : '!'}</i><span><strong>{label}</strong><small>{description}</small></span></div>)}</div>
        <div className="verification-next-action"><div><span>다음 작업</span><strong>{!completed.includes('verification') ? '독립 교차검증 실행' : !lawReady ? '공식 법령 검토' : '담당자 종합 평가'}</strong><small>단일 신호는 자동으로 신규 위험 후보로 승격하지 않습니다.</small></div><button type="button" disabled={Boolean(busy) || !gates.every(([, done]) => done)} onClick={() => void runAction('candidate')}>위험 후보 등록 요청</button></div>
      </article>
    </section>
  )
}
