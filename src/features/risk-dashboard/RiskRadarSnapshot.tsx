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
}

export function RiskRadarLiveSnapshotPanel({
  state,
  onRefresh,
}: {
  state: RiskRadarSnapshotState
  onRefresh: () => Promise<RiskRadarRefreshResult>
}) {
  const sources = Object.keys(sourceLabels) as RadarSnapshotSource[]
  const failedSources = sources.filter((source) => state.errors[source])
  const allLive = sources.every((source) => state.sourceStatus[source] === 'live')
  const hasSample = sources.some((source) => state.sourceStatus[source] === 'sample')
  const generatedAt = state.dashboard.generatedAt || state.dashboard.lastSync?.completedAt

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
        <div className="sample-notice"><span>LOADING</span>세 데이터 소스를 병렬 조회하는 동안 기존 SAMPLE 미리보기를 유지합니다.</div>
      ) : allLive ? (
        <div className="sample-notice"><span>LIVE</span>대시보드·뉴스·위험 후보를 운영 API 응답으로 표시합니다.</div>
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
