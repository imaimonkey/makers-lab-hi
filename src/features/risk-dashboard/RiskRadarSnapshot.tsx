import type {
  RadarSnapshotSource,
  RadarSnapshotSourceStatus,
  RiskRadarRefreshResult,
  RiskRadarSnapshotState,
} from './useRiskRadarSnapshot'

function formatTimestamp(value?: string) {
  if (!value) return '확인 필요'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

const sourceLabels: Record<RadarSnapshotSource, string> = {
  dashboard: '대시보드',
  news: '뉴스',
  risks: '위험 후보',
}

const statusLabels: Record<RadarSnapshotSourceStatus, string> = {
  loading: '로딩',
  live: 'LIVE',
  local: 'LOCAL ARTICLE',
  stale: '마지막 정상 데이터',
  sample: 'SAMPLE fallback',
  empty: 'NO DATA',
}

export function RiskRadarLiveSnapshotPanel({
  state,
  onRefresh,
  developerMode = false,
}: {
  state: RiskRadarSnapshotState
  onRefresh: () => Promise<RiskRadarRefreshResult>
  developerMode?: boolean
}) {
  const fallbackDashboard = { generatedAt: '', metrics: { news: 0, contentReady: 0, analyzed: 0, pending: 0, failed: 0, clusters: 0, evidencePending: 0, riskCandidates: 0 }, channels: {}, analysisCounts: {}, clusters: [], topNews: [], risks: [] } as typeof state.dashboard
  state.dashboard ??= fallbackDashboard
  state.dashboard.metrics ??= fallbackDashboard.metrics
  state.news ??= []
  state.risks ??= []
  const dashboard = state.dashboard ?? { generatedAt: '', metrics: {}, issues: [] }
  const sources = Object.keys(sourceLabels) as RadarSnapshotSource[]
  const failedSources = sources.filter((source) => state.errors[source])
  const allLive = sources.every((source) => state.sourceStatus[source] === 'live')
  const hasSample = sources.some((source) => state.sourceStatus[source] === 'sample')
  const hasEmpty = sources.some((source) => state.sourceStatus[source] === 'empty')
  const hasLocal = sources.some((source) => state.sourceStatus[source] === 'local')
  const generatedAt = dashboard.generatedAt || dashboard.lastSync?.completedAt

  return (
    <section className="integration-contract surface-card" aria-live="polite" aria-busy={state.initialLoading || state.refreshing}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">LIVE SNAPSHOT / API BOUNDARY</p>
          <h2>위험 레이더 데이터 연결 상태</h2>
        </div>
        <button type="button" className="text-button" disabled={state.initialLoading || state.refreshing} onClick={() => void onRefresh()}>
          {state.initialLoading ? '불러오는 중…' : state.refreshing ? '갱신 중…' : '다시 조회'}
        </button>
      </div>

      {state.initialLoading ? (
        <div className="sample-notice"><span>LOADING</span>세 데이터 소스를 병렬 조회하는 동안 실제 연결 상태를 확인합니다.</div>
      ) : allLive ? (
        <div className="sample-notice"><span>LIVE</span>대시보드·뉴스·위험 후보를 운영 API 응답으로 표시합니다.</div>
      ) : hasLocal && !hasSample ? (
        <div className="sample-notice"><span>CONTENT-DERIVED SAMPLE</span>src/article PDF 본문을 읽어 핵심 사실·지표·보장 공백을 구조화한 더미 결과를 화면에 표시합니다. 실제 AI 분석·법령 확인 결과는 아닙니다.</div>
      ) : developerMode ? (
        <div className="sample-notice"><span>{hasEmpty ? 'NO DATA' : 'PARTIAL'}</span>{hasEmpty ? '실패한 실제 데이터 소스는 샘플로 대체하지 않고 빈 상태로 표시합니다. 아래 오류와 재조회 결과를 확인하세요.' : '실제 원문·분석 저장소의 일부만 연결되어 있습니다. 비어 있는 영역은 아직 저장된 결과가 없는 상태입니다.'}</div>
      ) : (
        <div className="sample-notice"><span>{hasSample ? 'SAMPLE FALLBACK' : 'PARTIAL'}</span>실패한 소스는 SAMPLE 또는 마지막 정상 데이터를 유지하며 성공한 소스만 갱신했습니다.</div>
      )}

      <div className="metric-grid" aria-label="레이더 API 조회 상태">
        {sources.map((source) => (
          <article className="metric-card" key={source}>
            <span>{sourceLabels[source]}</span>
            <strong>{statusLabels[state.sourceStatus[source]]}</strong>
            <p>{state.errors[source] ? `오류 · ${state.errors[source]}` : '조회 상태 정상'}</p>
          </article>
        ))}
        <article className="metric-card emphasis">
          <span>마지막 생성 시각</span>
          <strong>{formatTimestamp(generatedAt)}</strong>
          <p>마지막 조회 {formatTimestamp(state.lastAttemptAt)}</p>
        </article>
      </div>

      <div className="risk-pipeline-metrics" aria-label="현재 스냅샷 건수">
        <span><strong>{state.dashboard.metrics.totalSignals ?? state.dashboard.metrics.news}</strong>전체 신호</span>
        <span><strong>{state.news.length}</strong>뉴스 응답</span>
        <span><strong>{state.risks.length}</strong>위험 후보</span>
        <span><strong>{state.dashboard.issues?.length ?? 0}</strong>이슈</span>
      </div>

      {failedSources.length ? (
        <p className="table-empty">부분 실패: {failedSources.map((source) => `${sourceLabels[source]}(${state.errors[source]})`).join(' · ')}</p>
      ) : null}
    </section>
  )
}
