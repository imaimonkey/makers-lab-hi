import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  resolveSampleRiskId,
  sampleOnlyNotice,
  sampleRiskCandidates,
  sampleRiskDetails,
} from '../../domain/risk/sampleData'
import type { SampleRiskCandidate, SampleRiskDetail } from '../../domain/risk/sampleData'
import { RiskDecisionWorkspace } from '../../features/risk-detail/RiskDecisionWorkspace'
import { RiskArticleOverview } from '../../features/risk-detail/RiskArticleOverview'
import { buildAiQualitativeSummary, buildAssessmentAiSummary, getAssessmentEvidence } from '../../features/risk-detail/qualitativeAssessment'
import type { RadarNewsDetail } from '../../domain/risk/riskRadarTypes'
import { getRadarArticleId } from '../../domain/risk/riskRadarMappings'
import { riskRadarApi } from '../../features/risk-dashboard/riskRadarApi'
import { AppIcon } from '../../shared/components/AppIcon'
import { PageHeader } from '../../shared/components/PageHeader'
import type { SavedStep3AnalysisRow } from '../../features/llm-util/util-3'

export function RiskDetailPage({ data, developerMode = false, step3Results = [] }: { data?: { risk: SampleRiskCandidate; detail: SampleRiskDetail; articleId: string }; developerMode?: boolean; step3Results?: SavedStep3AnalysisRow[] } = {}) {
  const { riskId } = useParams()
  const resolvedRiskId = resolveSampleRiskId(riskId)
  const risk = data?.risk ?? sampleRiskCandidates.find((item) => item.id === resolvedRiskId)
  const detail = data?.detail ?? (resolvedRiskId ? sampleRiskDetails[resolvedRiskId] : undefined)
  const articleId = data?.articleId ?? (resolvedRiskId ? getRadarArticleId(resolvedRiskId) : undefined)
  const [liveDetail, setLiveDetail] = useState<RadarNewsDetail | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState('')
  const [liveStale, setLiveStale] = useState(false)
  const [lastLiveAt, setLastLiveAt] = useState<string | null>(null)

  const refreshLiveDetail = useCallback(async () => {
    if (!articleId || developerMode) {
      setLiveDetail(null)
      setLiveError('')
      setLiveStale(false)
      return null
    }
    setLiveLoading(true)
    try {
      const next = await riskRadarApi.detail(articleId)
      setLiveDetail(next)
      setLiveError('')
      setLiveStale(false)
      setLastLiveAt(new Date().toISOString())
      return next
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : 'detail API unavailable')
      setLiveStale(true)
      return null
    } finally {
      setLiveLoading(false)
    }
  }, [articleId, developerMode])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshLiveDetail()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshLiveDetail])

  const liveArticle = liveDetail?.article
  const liveAnalysis = liveDetail?.analysis
  const displayTitle = liveArticle?.title ?? risk?.title
  const detailSourceLabel = developerMode
    ? '실제 원문'
    : liveLoading
      ? 'LOADING'
      : liveDetail && liveStale
        ? '최근 정상 응답'
        : liveDetail
          ? '연결 데이터'
          : liveError
            ? '예시 데이터'
            : articleId
              ? '검토 데이터'
              : '연결 대기'
  const catalogPath = developerMode ? '/developer-test/risks' : '/risks'

  const printRiskDetail = useCallback(() => {
    document.body.classList.add('risk-detail-printing')
    window.setTimeout(() => window.print(), 0)
  }, [])

  useEffect(() => {
    const clearPrintState = () => document.body.classList.remove('risk-detail-printing')
    window.addEventListener('afterprint', clearPrintState)
    return () => window.removeEventListener('afterprint', clearPrintState)
  }, [])

  if (!risk || !detail) {
    return (
      <div className="page detail-page sh-visual">
        <PageHeader
          step="03"
          eyebrow="RISK ASSESSMENT / CANDIDATE DETAIL"
          title="위험 후보를 찾을 수 없습니다"
          description="삭제되었거나 존재하지 않는 위험 ID입니다. 후보 목록에서 다시 선택해 주세요."
        />
        <section className="detail-missing surface-card">
          <AppIcon name="scan" size={28} />
          <div><strong>요청한 위험 ID: {riskId}</strong><p>샘플 후보 목록으로 돌아가 유효한 검토 대상을 선택할 수 있습니다.</p></div>
          <Link to={catalogPath} className="secondary-action">위험 후보로 돌아가기 <AppIcon name="arrow" size={17} /></Link>
        </section>
      </div>
    )
  }

  const aiQualitativeSummary = developerMode && step3Results.length
    ? detail.assessments.find((item) => item.label === '증가성')?.interpretation ?? detail.riskStatement
    : buildAiQualitativeSummary(risk, detail)

  return (
    <div className="page detail-page sh-visual">
      <PageHeader
        step="03"
        eyebrow="RISK ASSESSMENT / CANDIDATE DETAIL"
        title="위험상세"
          description="위험 후보의 맥락과 손해 경로를 기사처럼 읽고, 연결된 근거와 핵심 판단 기준을 확인하는 화면입니다."
      />
      <nav className="sh-command-bar" aria-label="위험상세 명령 바">
        <div className="sh-command-context">
          <Link to={catalogPath}>← 위험 후보</Link>
          <i className={risk.status === '검토 중' ? '' : 'complete'} aria-hidden="true" />
          <span>{risk.status} · 위험상세</span>
          <span aria-label={`위험 ID ${risk.id}`}>{risk.id}</span>
        </div>
        <div className="sh-command-actions">
           <a href="#ai-judgment-evidence">AI 판단 근거로 이동</a>
          <button type="button" onClick={printRiskDetail}>PDF 출력</button>
        </div>
      </nav>
      <div className="sample-notice"><span>{detailSourceLabel}</span>{developerMode ? '연결된 원문과 저장된 분석 결과를 사용합니다. 값이 없는 항목은 확인 필요로 표시합니다.' : liveDetail ? `${liveStale ? ' 마지막 정상 상세 응답을 유지합니다.' : ' 연결된 상세 데이터를 사용합니다.'}${lastLiveAt ? ` 응답 시각 ${new Date(lastLiveAt).toLocaleString('ko-KR')}` : ''}` : `${sampleOnlyNotice}${liveError ? ' 상세 데이터를 불러오지 못했습니다.' : ''}`}</div>
      {liveDetail ? <div className="detail-live-strip" role="status"><strong>{detailSourceLabel}</strong><span>본문 {liveArticle?.contentStatus ?? '상태 미제공'}</span><span>분석 {liveArticle?.analysisStatus ?? liveAnalysis?.verificationStatus ?? '상태 미제공'}</span><span>검증 {liveArticle?.verificationStatus ?? liveAnalysis?.verificationStatus ?? '상태 미제공'}</span><span>기준 시각 {liveArticle?.collectedAt ?? liveArticle?.publishedAt ?? '시각 미제공'}</span></div> : null}

      <nav className="risk-anchor-tabs" aria-label="위험상세 섹션 이동">
        <a href="#risk-context">위험 개요</a>
        <a href="#risk-article-title">본문 AI 리뷰</a>
        <a href="#assessment-criteria">평가 기준</a>
        <a href="#ai-judgment-evidence">판단 근거</a>
        <a href="#judgment-materials">상품화 검토</a>
      </nav>

      <section id="risk-context" className="risk-hero surface-card">
        <div className="risk-hero-main">
          <div className="sh-detail-breadcrumb" aria-label="현재 위치"><Link to={catalogPath}>위험 후보</Link><span>/</span><span>상세 검토</span><strong>{risk.id}</strong></div>
          <div className="risk-badges"><span>{risk.themeLabel}</span><em>{risk.status}</em></div>
          <h2>{displayTitle}</h2>
          <p><strong>위험 문장</strong> {detail.riskStatement}</p>
          <div className="risk-facts">
            <span><small>노출 주체</small>{detail.exposedParty}</span>
            <span><small>주요 손해</small>{detail.primaryLoss}</span>
            <span><small>검토 초점</small>{detail.decisionChecks[0] ?? '확인 항목 없음'}</span>
          </div>
        </div>
        <div className="risk-score-card">
           <span>우선 검토 지수</span>
          <strong>{risk.signalStrength}</strong>
          <div><i style={{ width: `${risk.signalStrength}%` }} /></div>
          <div className="sh-score-meta">
            <span>점수 범위</span><strong>0–100</strong>
             <span>데이터 상태</span><strong>{liveDetail ? '연결됨' : '확인 대기'}</strong>
          </div>
             <p>0–100 · {developerMode ? (step3Results.length ? '저장 평가 기반 보조 지수' : '저장 점수 기반 보조 지수') : '후보 관측 신호 기반'} · 위험 규모·사고확률·손해액 아님</p>
          <details className="hero-score-logic">
            <summary>산출 근거</summary>
            <div className="logic-step-list">
               <p><b>01</b><span>입력값</span><code>후보 관측 신호 = {risk.signalStrength}%</code></p>
              <p><b>02</b><span>정규화</span><code>{risk.signalStrength}% → {risk.signalStrength}점 / 100</code></p>
              <p><b>03</b><span>판정</span><code>{risk.signalStrength >= 80 ? '80 이상 → CRITICAL' : risk.signalStrength >= 65 ? '65–79 → HIGH' : '64 이하 → REVIEW'}</code></p>
              <p className="logic-step-note">이 지수는 손해액이나 사고 확률이 아닙니다. 현재 후보를 어떤 순서로 먼저 확인할지 정하는 우선순위 기준입니다.</p>
              <div className="ai-qualitative-assessment">
                 <span>AI 정성 해석</span>
                <p>{aiQualitativeSummary}</p>
              </div>
            </div>
          </details>
        </div>
      </section>

      <RiskArticleOverview
        risk={risk}
        detail={detail}
        article={liveArticle}
        analysis={liveAnalysis}
        relatedArticles={liveDetail?.relatedArticles}
        relatedLaws={liveDetail?.relatedLaws ?? liveAnalysis?.relatedLaws}
        evidence={detail.evidence}
        sourceLabel={detailSourceLabel}
      />

      <section className="detail-grid detail-assessment-grid" id="assessment-criteria">
        <article className="assessment-panel surface-card">
          <div className="panel-heading"><div><p className="eyebrow">ASSESSMENT SUMMARY · AUTHORITY</p><h2>4개 핵심 지표 평가 요약</h2><p className="panel-heading-description">증가성·피해 심각성·확산 가능성·보험 사각지대 가능성을 원점수(0–5), 표시용 점수(0–100), 대표 사유와 원문 인용 상태로 확인합니다.{developerMode && step3Results.length ? ' Step 3 저장 결과가 최신 판단으로 반영되어 있습니다.' : ''}</p></div><span className="updated-label">{detailSourceLabel} · 담당자 검토 필요</span></div>
          <div className="assessment-list">
            {detail.assessments.filter((item) => !['신규성', '근거 신뢰도'].includes(item.label)).map((item) => {
              const assessmentEvidence = getAssessmentEvidence(item.label, risk.id, detail.evidence)
              return (
              <div className="assessment-row" key={item.label}>
                <div><strong>{item.label}</strong><small>{item.evidenceStatus === 'verified' ? `${assessmentEvidence.length}건 연결 근거` : developerMode && step3Results.length ? `Step 3 원장 ${detail.evidence.length}건 · 지표별 연결 보류` : `${assessmentEvidence.length}건 연결 근거`} · 신뢰도 {item.confidence}</small><span className={`assessment-evidence-status ${item.evidenceStatus === 'verified' ? 'is-verified' : 'is-pending'}`}>{item.evidenceStatus === 'verified' ? '원문 인용 확인' : '원문 인용 확인 필요'}</span></div>
                <div className="assessment-bar"><span><i style={{ width: `${item.score}%` }} /></span><strong>{item.score}<small>/100</small><em>AI 원점수 {item.rawScore?.toFixed(1) ?? (item.score / 20).toFixed(1)}/5</em></strong></div>
                 <p className="assessment-reason"><b>왜 이 점수인가</b>{item.note}</p>
                 {item.evidenceQuotes?.length ? <div className="assessment-quotes"><b>원문 인용</b>{item.evidenceQuotes.map((quote) => <q key={quote}>{quote}</q>)}</div> : <div className="assessment-quotes is-pending"><b>원문 인용</b><span>{developerMode && step3Results.length ? 'Step 3 결과에 이 지표를 직접 가리키는 evidenceRefs·인용 연결이 없어, AI 사유는 표시하되 지표별 근거 확정은 보류했습니다.' : 'Step 2 저장 결과에 정확한 인용 구간이 없어, AI 사유는 표시하되 근거 확정은 보류했습니다.'}</span></div>}
                <div className="assessment-logic-preview" aria-label={`${item.label} 산출 요약`}>
                  <div><span>산출 입력</span><strong>{item.inputs ?? '연결된 원자료 확인 필요'}</strong></div>
                  <div><span>적용 산식</span><strong>{item.formula ?? '원점수 ÷ 5 × 100'}</strong></div>
                  <div><span>계산 결과</span><strong>{item.calculation ?? `${item.rawScore?.toFixed(1) ?? (item.score / 20).toFixed(1)} ÷ 5 × 100 = ${item.score}`}</strong></div>
                </div>
                <details className="assessment-logic">
                   <summary>상세 산출 근거 보기</summary>
                  <dl className="assessment-logic-grid">
                    <div><dt>입력값</dt><dd>{item.inputs ?? '연결된 원자료 확인 필요'}</dd></div>
                    <div><dt>계산식</dt><dd>{item.formula ?? '연결된 원자료를 확인한 뒤 계산합니다.'}</dd></div>
                    <div><dt>손계산</dt><dd>{item.calculation ?? '원점수 ÷ 5 × 100'}</dd></div>
                    <div><dt>해석</dt><dd>{item.interpretation ?? item.note}</dd></div>
                    <div className="assessment-logic-sources"><dt>연결 자료·출처</dt><dd>
                      {assessmentEvidence.length
                        ? <ul>{assessmentEvidence.slice(0, 2).map((evidence) => <li key={evidence.id}><strong>{evidence.sourceName}</strong><span>{evidence.id}</span><em>{evidence.sourceUrl ? 'URL 후보' : '원문 연결 대기'}</em></li>)}</ul>
                        : '연결된 자료를 확인한 뒤 출처를 표시합니다.'}
                    </dd></div>
                  </dl>
                  <div className="ai-qualitative-assessment">
                   <span>AI 정성 해석</span>
                    <p>{developerMode && step3Results.length ? item.interpretation ?? item.note : buildAssessmentAiSummary(item)}</p>
                  </div>
                  <small>모든 원점수는 1–5 척도이며, 최종 표시값은 원점수 × 20으로 환산합니다.</small>
                </details>
              </div>
              )
            })}
          </div>
        </article>
      </section>

      <RiskDecisionWorkspace key={`review-${risk.id}`} risk={risk} detail={detail} developerMode={developerMode} step3Results={step3Results} />
    </div>
  )
}
