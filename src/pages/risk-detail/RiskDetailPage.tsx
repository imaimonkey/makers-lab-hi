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
import { buildAssessmentAiSummary, getAssessmentEvidence } from '../../features/risk-detail/qualitativeAssessment'
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
      setLiveError(error instanceof Error ? error.message : '상세 자료를 불러오지 못했습니다.')
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
  const displayTitle = risk?.title
  const detailSourceLabel = developerMode
    ? '실제 원문'
    : liveLoading
      ? '자료 불러오는 중'
      : liveDetail && liveStale
        ? '최근 정상 응답'
          : liveDetail
          ? '연결 자료'
          : liveError
            ? '샘플 자료'
            : articleId
              ? '검토 자료'
              : '자료 연결 대기'
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
          eyebrow="위험 후보 상세 검토"
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

  return (
    <div className="page detail-page sh-visual">
      <PageHeader
        step="03"
        eyebrow="위험 후보 상세 검토"
        title="위험 상세"
        description="신규 위험 후보의 발생 배경부터 보장 공백과 상품개발 검토 항목까지 확인합니다."
        status="검토 진행 중"
        updatedAt="검토 기준일 · 2026.07"
      />
      <nav className="sh-command-bar" aria-label="위험상세 명령 바">
        <div className="sh-command-context">
          <Link to={catalogPath}>← 위험 후보</Link>
          <i className={risk.status === '검토 중' ? '' : 'complete'} aria-hidden="true" />
          <span>{risk.status} · 상세 검토</span>
          <span aria-label={`위험 ID ${risk.id}`}>{risk.id}</span>
        </div>
        <div className="sh-command-actions">
          <a href="#ai-judgment-evidence">판단 메모 보기</a>
          <button type="button" onClick={printRiskDetail}>PDF 출력</button>
        </div>
      </nav>
      <div className="sample-notice"><span>{detailSourceLabel}</span>{developerMode ? '연결된 원문과 저장된 분석 결과를 사용합니다. 값이 없는 항목은 확인 필요로 표시합니다.' : liveDetail ? `${liveStale ? '최근 정상 응답을 유지하고 있습니다.' : '연결된 상세 데이터를 사용합니다.'}${lastLiveAt ? ` 응답 시각 ${new Date(lastLiveAt).toLocaleString('ko-KR')}` : ''}` : `${sampleOnlyNotice}${liveError ? ' 상세 데이터를 불러오지 못했습니다.' : ''}`}</div>
      <div className="detail-status-strip" role="status" aria-label="자료 및 검토 상태">
        <span><b>자료 상태</b><strong>{liveDetail ? '연결 자료' : '원문 확인 필요'}</strong></span>
        <span><b>AI 분석</b><strong>{developerMode && step3Results.length ? '저장 결과' : '1차 검토'}</strong></span>
        <span><b>담당자 확인</b><strong>필요</strong></span>
      </div>

      <nav className="risk-anchor-tabs" aria-label="위험상세 섹션 이동">
        <a href="#risk-context">위험 개요</a>
        <a href="#risk-overview">위험 요약</a>
        <a href="#assessment-criteria">평가 기준</a>
        <a href="#ai-judgment-evidence">판단 메모</a>
        <a href="#product-review">상품개발 검토</a>
      </nav>

      <section id="risk-context" className="risk-hero surface-card">
        <div className="risk-hero-main">
          <div className="sh-detail-breadcrumb" aria-label="현재 위치"><Link to={catalogPath}>위험 후보</Link><span>/</span><span>상세 검토</span><strong>{risk.id}</strong></div>
          <div className="risk-badges"><span>{risk.themeLabel}</span><em>{risk.status}</em></div>
          <h2>{displayTitle}</h2>
          <p><strong>위험 설명</strong> {detail.riskStatement}</p>
          <div className="risk-facts">
            <span><small>주요 대상</small>{detail.exposedParty}</span>
            <span><small>주요 손해 유형</small>{detail.primaryLoss}</span>
            <span><small>상품 검토 포인트</small>{detail.decisionChecks[0] ?? '확인 항목 없음'}</span>
          </div>
        </div>
        <div className="risk-score-card">
           <span>검토 우선순위</span>
          <strong>{risk.signalStrength}</strong>
          <div><i style={{ width: `${risk.signalStrength}%` }} /></div>
          <p>위험 규모·사고 확률·손해액이 아닌, 현재 자료를 기준으로 먼저 확인할 순서를 나타내는 보조 지표입니다.</p>
        </div>
      </section>

      <div className="detail-review-shell">
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
          <div className="panel-heading"><div><p className="eyebrow">평가 기준</p><h2>위험 평가 프로파일</h2><p className="panel-heading-description">신규성·피해 심각성·확산 가능성·기존 보장 공백을 비교해 먼저 확인할 위험을 정합니다. 점수는 상품화 결론이 아닌 참고값입니다.{developerMode && step3Results.length ? ' 저장된 분석 결과가 최신 판단으로 반영되어 있습니다.' : ''}</p></div><span className="updated-label">4개 지표 · 확인 필요</span></div>
          <div className="assessment-list">
            {(() => {
              const visibleAssessments = detail.assessments.filter((item) => !['근거 신뢰도', '신규성'].includes(item.label))
              const rankedAssessments = [...visibleAssessments].sort((left, right) => right.score - left.score)
              const assessmentRanks = new Map(rankedAssessments.map((item, index) => [item.label, index + 1]))
              return visibleAssessments.map((item) => {
              const assessmentLabel = item.label === '증가성' ? '신규성' : item.label === '보험 사각지대 가능성' ? '기존 보장 공백' : item.label
              const assessmentRank = assessmentRanks.get(item.label) ?? visibleAssessments.length
              const assessmentEvidence = getAssessmentEvidence(item.label, risk.id, detail.evidence)
              const assessmentNote = risk.id === 'generative-ai-copyright'
                ? item.label === '증가성'
                  ? '관련 위험 신호가 높게 나타나 우선 확인 대상으로 분류했습니다. 실제 가입 수요나 손해율을 의미하지 않습니다.'
                  : item.label === '피해 심각성'
                    ? '분쟁 발생 시 법률비용·방어비용·손해배상 부담이 커질 수 있는지 확인합니다.'
                    : item.label === '확산 가능성'
                      ? '특정 기업을 넘어 산업·플랫폼으로 책임 이슈가 번질 가능성을 확인합니다.'
                      : '기존 상품과 약관으로 충분히 설명하거나 보장하기 어려운 영역이 있는지 확인합니다.'
                : buildAssessmentAiSummary(item)
              return (
              <div className="assessment-row" key={item.label}>
                <div><div className="assessment-heading-line"><strong>{assessmentLabel}</strong><span className="assessment-rank">우선 {assessmentRank}</span></div><small>{item.evidenceStatus === 'verified' ? `${assessmentEvidence.length}건 연결 근거` : developerMode && step3Results.length ? `저장 분석 ${detail.evidence.length}건 · 지표별 연결 보류` : `${assessmentEvidence.length}건 연결 근거`} · 자료 신뢰도 {item.confidence}</small><span className={`assessment-evidence-status ${item.evidenceStatus === 'verified' ? 'is-verified' : 'is-pending'}`}>{item.evidenceStatus === 'verified' ? '원문 인용 확인' : '근거 확인 필요'}</span></div>
                <div className="assessment-bar"><span><i style={{ width: `${item.score}%` }} /></span><strong>{item.score}<small>/100</small><em>5점 척도 {item.rawScore?.toFixed(1) ?? (item.score / 20).toFixed(1)}</em></strong></div>
                 <p className="assessment-reason"><b>검토 포인트</b>{assessmentNote}</p>
                 {item.evidenceQuotes?.length ? <div className="assessment-quotes"><b>원문 인용</b>{item.evidenceQuotes.map((quote) => <q key={quote}>{quote}</q>)}</div> : <div className="assessment-quotes is-pending"><b>원문 인용</b><span>{developerMode && step3Results.length ? '저장 분석 결과에 이 지표를 직접 가리키는 인용 연결이 없어, 판단 이유는 표시하되 지표별 근거 확정은 보류했습니다.' : '저장 결과에 정확한 인용 구간이 없어, 판단 이유는 표시하되 지표별 근거 확정은 보류했습니다.'}</span></div>}
                <div className="assessment-logic-preview" aria-label={`${item.label} 산출 요약`}>
                  <div><span>산출 입력</span><strong>{item.inputs ?? '연결된 원자료 확인 필요'}</strong></div>
                  <div><span>적용 산식</span><strong>{item.formula ?? '원점수 ÷ 5 × 100'}</strong></div>
                  <div><span>계산 결과</span><strong>{item.calculation ?? `${item.rawScore?.toFixed(1) ?? (item.score / 20).toFixed(1)} ÷ 5 × 100 = ${item.score}`}</strong></div>
                </div>
                <details className="assessment-logic">
                   <summary>점수 산출 근거 보기</summary>
                  <dl className="assessment-logic-grid">
                    <div><dt>입력값</dt><dd>{item.inputs ?? '연결된 원자료 확인 필요'}</dd></div>
                    <div><dt>계산식</dt><dd>{item.formula ?? '연결된 원자료를 확인한 뒤 계산합니다.'}</dd></div>
                    <div><dt>손계산</dt><dd>{item.calculation ?? '원점수 ÷ 5 × 100'}</dd></div>
                    <div><dt>해석</dt><dd>{item.interpretation ?? item.note}</dd></div>
                    <div className="assessment-logic-sources"><dt>연결 자료·출처</dt><dd>
                      {assessmentEvidence.length
                        ? <ul>{assessmentEvidence.slice(0, 2).map((evidence) => <li key={evidence.id}><strong>{evidence.sourceName}</strong><span>{evidence.id}</span><em>{evidence.sourceUrl ? '원문 링크 확인' : '원문 링크 필요'}</em></li>)}</ul>
                        : '연결된 자료를 확인한 뒤 출처를 표시합니다.'}
                    </dd></div>
                  </dl>
                  <div className="ai-qualitative-assessment">
                   <span>해석 메모</span>
                    <p>{developerMode && step3Results.length ? item.interpretation ?? item.note : buildAssessmentAiSummary(item)}</p>
                  </div>
                  <small>입력은 1–5점 척도이며, 화면 점수는 원점수에 20을 곱해 100점 기준으로 표시합니다.</small>
                </details>
              </div>
              )
              })
            })()}
          </div>
        </article>
        </section>
      </div>

      <RiskDecisionWorkspace key={`review-${risk.id}`} risk={risk} detail={detail} developerMode={developerMode} step3Results={step3Results} />

      <section className="detail-decision-footer" aria-label="다음 작업">
        <div className="detail-decision-footer-copy">
          <p className="eyebrow">다음 단계</p>
          <h2>근거를 확인한 뒤 종합 리포트로 이어가기</h2>
          <p>공식 원문과 국내 손해자료를 확인한 뒤, 보장 범위와 상품 구조를 종합 리포트에서 검토합니다.</p>
        </div>
        <div className="detail-decision-footer-actions">
          <a href="#ai-judgment-evidence">판단 메모로 이동</a>
          <Link to="/reports">종합 리포트로 이동 <AppIcon name="arrow" size={16} /></Link>
        </div>
      </section>
    </div>
  )
}
