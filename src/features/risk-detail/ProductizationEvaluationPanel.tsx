import { type FormEvent, useEffect, useMemo, useState } from 'react'
import type { SampleRiskCandidate, SampleRiskDetail } from '../../domain/risk/sampleData'
import type { RadarEvaluation } from '../../domain/risk/riskRadarTypes'
import { getRadarArticleId, getRadarRiskId } from '../../domain/risk/riskRadarMappings'
import { riskRadarApi } from '../risk-dashboard/riskRadarApi'

const checklistItems = [
  ['existingProduct', '기존 상품 연결 여부'],
  ['specialRider', '특약·담보 확장 가능성'],
  ['mainCoverage', '주계약 보장 가능성'],
  ['damageFit', '피해 유형 적합성'],
  ['responsibility', '책임 주체 명확성'],
  ['lawConfirmed', '관련 법령 확인'],
  ['termsReview', '약관 검토 필요 여부'],
  ['frequencyData', '손해 빈도 데이터 확보'],
  ['severityData', '손해 규모 데이터 확보'],
] as const

type EvaluationSavePayload = Omit<RadarEvaluation, 'id' | 'createdAt' | 'reviewedAt' | 'status'>

export function ProductizationEvaluationPanel({ risk, detail }: { risk: SampleRiskCandidate; detail: SampleRiskDetail }) {
  const articleId = getRadarArticleId(risk.id)
  const radarRiskId = getRadarRiskId(risk.id)
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [decision, setDecision] = useState('')
  const [score, setScore] = useState(risk.productFit ?? 50)
  const [productFit, setProductFit] = useState('기존 상품 없음')
  const [coverageFit, setCoverageFit] = useState('검토 필요')
  const [lawStatus, setLawStatus] = useState('법령 확인 필요')
  const [reviewer, setReviewer] = useState('상품개발 담당자')
  const [note, setNote] = useState('')
  const [additionalResearch, setAdditionalResearch] = useState('')
  const [history, setHistory] = useState<RadarEvaluation[]>([])
  const [status, setStatus] = useState(
    articleId && radarRiskId
      ? '운영 평가 이력을 확인하고 있습니다.'
      : '연결 기사 없음 · SAMPLE/원문 확인 대기. 평가 API를 호출하지 않습니다.',
  )
  const [saving, setSaving] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(Boolean(articleId && radarRiskId))
  const completeCount = useMemo(() => checklistItems.filter(([key]) => checks[key]).length, [checks])
  const complete = completeCount === checklistItems.length

  useEffect(() => {
    let cancelled = false
    if (!articleId || !radarRiskId) {
      return () => {
        cancelled = true
      }
    }
    void riskRadarApi.evaluations(radarRiskId)
      .then(({ evaluations }) => {
        if (cancelled) return
        setHistory(evaluations.slice(0, 4))
        setStatus('운영 평가 이력을 불러왔습니다.')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('운영 평가 이력이 연결되지 않아 SAMPLE 입력 상태를 유지합니다.')
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [articleId, radarRiskId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!complete || !decision) return
    const payload: EvaluationSavePayload = {
      riskId: radarRiskId ?? risk.id,
      decision,
      finalDecision: decision,
      score,
      productFit,
      coverageFit,
      lawStatus,
      note,
      additionalResearch,
      reviewer,
      checklist: checks,
    }
    const sampleEvaluation: RadarEvaluation = {
      id: `sample-evaluation-${Date.now()}`,
      ...payload,
      status: '현재 세션 저장 · SAMPLE',
      createdAt: new Date().toISOString(),
    }
    if (!articleId || !radarRiskId) {
      setHistory((current) => [sampleEvaluation, ...current].slice(0, 4))
      setStatus('연결 기사 없음 · API 요청 없이 현재 세션의 SAMPLE 이력에만 추가했습니다.')
      return
    }
    setSaving(true)
    try {
      const { evaluation } = await riskRadarApi.saveEvaluation(payload)
      setHistory((current) => [evaluation, ...current.filter((item) => item.id !== evaluation.id)].slice(0, 4))
      setStatus('운영 평가 이력에 저장했습니다.')
    } catch {
      setHistory((current) => [sampleEvaluation, ...current].slice(0, 4))
      setStatus('운영 API가 연결되지 않아 현재 세션의 SAMPLE 이력에만 추가했습니다.')
    } finally {
      setSaving(false)
    }
  }

  function checkProductApi() {
    if (!articleId || !radarRiskId) {
      setStatus('연결 기사 없음 · 상품 API 요청을 보내지 않았습니다.')
      return
    }
    void riskRadarApi.productSearch(risk.title)
      .then(() => setStatus('상품 API 조회를 완료했습니다.'))
      .catch(() => setStatus('상품 API가 설정되지 않았습니다.'))
  }

  return (
    <section className="productization-evaluation" aria-labelledby="productization-evaluation-title">
      <div className="evaluation-subject surface-card"><div><p className="eyebrow">SELECTED RISK CANDIDATE · HYOJE</p><h2 id="productization-evaluation-title">보험상품화 종합 평가</h2><strong>{risk.title}</strong><span>{risk.themeLabel} · {detail.decisionStatus}</span></div><div><span>현재 우선순위</span><strong>{score}</strong><small>/ 100 · SAMPLE</small></div></div>
      <div className="productization-evaluation-layout">
        <form onSubmit={(event) => void submit(event)}>
          <article className="surface-card evaluation-checklist-panel">
            <div className="verification-panel-heading"><div><p className="eyebrow">REVIEW CHECKLIST</p><h3>담당자 상세 체크리스트</h3></div><span>{completeCount}/{checklistItems.length} 확인</span></div>
            <div className="evaluation-checklist">{checklistItems.map(([key, label]) => <label className={checks[key] ? 'checked' : ''} key={key}><input type="checkbox" checked={Boolean(checks[key])} onChange={(event) => setChecks((current) => ({ ...current, [key]: event.target.checked }))} /><span>{label}</span><small>{checks[key] ? '확인 완료' : '확인 필요'}</small></label>)}</div>
          </article>
          <article className="surface-card evaluation-decision-form">
            <div className="verification-panel-heading"><div><p className="eyebrow">DECISION</p><h3>최종 판단 입력</h3></div><span>사람의 검토 필수</span></div>
            <div className="evaluation-form-grid">
              <label><span>최종 판단</span><select value={decision} onChange={(event) => setDecision(event.target.value)}><option value="">선택하세요</option><option>신규 상품화 추진</option><option>기존 특약 확장</option><option>추가 조사 후 재검토</option><option>상품화 보류</option></select></label>
              <label><span>우선순위 점수</span><input type="number" min="0" max="100" value={score} onChange={(event) => setScore(Number(event.target.value))} /></label>
              <label><span>기존 상품 연결</span><select value={productFit} onChange={(event) => setProductFit(event.target.value)}><option>기존 상품 없음</option><option>기존 상품 직접 연결</option><option>특약·담보 확장</option></select></label>
              <label><span>보장 적합성</span><select value={coverageFit} onChange={(event) => setCoverageFit(event.target.value)}><option>검토 필요</option><option>적합</option><option>부적합</option></select></label>
              <label><span>법령 상태</span><select value={lawStatus} onChange={(event) => setLawStatus(event.target.value)}><option>법령 확인 필요</option><option>관련 법령 확인</option><option>법령 비적용 확인</option></select></label>
              <label><span>담당자</span><input value={reviewer} onChange={(event) => setReviewer(event.target.value)} /></label>
              <label className="wide"><span>판단 메모</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="상품화 관점의 판단 근거와 반증을 기록하세요." /></label>
              <label className="wide"><span>추가 조사사항</span><textarea value={additionalResearch} onChange={(event) => setAdditionalResearch(event.target.value)} placeholder="손해 빈도·규모·약관 검토 등 남은 조사를 기록하세요." /></label>
            </div>
            <div className="evaluation-save-row"><div><strong>{complete ? '체크리스트 완료' : `${checklistItems.length - completeCount}개 항목 확인 필요`}</strong><small>{status || '모든 체크 항목과 최종 판단을 입력해야 저장할 수 있습니다.'}</small></div><button type="submit" disabled={!complete || !decision || saving}>{saving ? '저장 중…' : articleId ? '종합 평가 저장' : 'SAMPLE 세션 이력 추가'}</button></div>
          </article>
        </form>
        <aside>
          <article className="surface-card evaluation-product-api"><p className="eyebrow">PRODUCT API</p><h3>기존 상품 검색</h3><div><span>⌁</span><strong>{articleId ? '상품 API 연결 상태 확인' : '연결 기사 없음 · API 비활성화'}</strong><p>명세 연결 전에는 실제 상품이나 가상 상품명을 표시하지 않습니다.</p><button type="button" disabled={!articleId} onClick={checkProductApi}>{articleId ? '연결 상태 확인' : '원문 확인 대기'}</button></div></article>
          <article className="surface-card evaluation-evidence-summary"><p className="eyebrow">EVIDENCE SUMMARY</p><h3>검증 결과 요약</h3><dl><dt>본문 확보</dt><dd>{articleId ? '완료 · SAMPLE' : '연결 기사 없음'}</dd><dt>교차검증</dt><dd>{articleId ? '담당자 확인 필요' : '원문 확인 대기'}</dd><dt>독립 출처</dt><dd>{risk.evidenceCount}건 SAMPLE 후보</dd><dt>법령 검토</dt><dd>{lawStatus}</dd><dt>연결 기사</dt><dd>{articleId ?? '연결 기사 없음 · SAMPLE/원문 확인 대기'}</dd></dl></article>
          <article className="surface-card evaluation-history"><p className="eyebrow">HISTORY</p><h3>최근 저장 평가</h3>{historyLoading ? <p>운영 평가 이력 확인 중…</p> : history.length ? history.map((item) => <div key={item.id}><strong>{item.finalDecision}</strong><small>{item.reviewer} · {new Date(item.createdAt).toLocaleString('ko-KR')}</small><span>{item.status}</span></div>) : <p>{articleId ? '현재 확인된 평가 이력이 없습니다.' : '기사 매핑이 없어 운영 이력을 요청하지 않았습니다.'}</p>}</article>
        </aside>
      </div>
      <p className="evaluation-disclaimer">SAMPLE · 이 평가는 보험상품의 보장, 면책, 보험료 또는 가입 가능 여부를 확정하지 않습니다. 공식 상품·약관·법령과 담당자 승인이 필요합니다.</p>
    </section>
  )
}
