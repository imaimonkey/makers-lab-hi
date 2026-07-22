import type { GeneratedReportListItem } from '../services/report-list'

type GeneratedReportListProps = {
  reports: GeneratedReportListItem[]
  onOpenReport?: (report: GeneratedReportListItem) => void
  /** 위험 탐색 라우트가 연결되면 이 콜백만 주입해 신규 생성 흐름을 연결합니다. */
  onRequestCreate?: () => void
}

const formatDate = (value: string | null): string => {
  if (!value) return '생성일 확인 필요'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function ReportCard({
  report,
  onOpenReport,
}: {
  report: GeneratedReportListItem
  onOpenReport?: (report: GeneratedReportListItem) => void
}) {
  return (
    <a
      className="report-page__report-card"
      href={report.detailHref}
      aria-label={`${report.riskName} 리포트 열기`}
      onClick={(event) => {
        if (!onOpenReport) return
        event.preventDefault()
        onOpenReport(report)
      }}
    >
      <div className="report-page__report-card-top">
        <div className="report-page__report-card-heading">
          <span className="report-page__report-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <rect x="5" y="3.5" width="14" height="17" rx="2" />
              <path d="M8.5 8h7M8.5 12h4M8.5 16l1.8 1.8L14 14" />
            </svg>
          </span>
          <div>
            <h3>{report.riskName}</h3>
            <span
              className="report-page__report-card-identifier"
              title={`위험 ID: ${report.riskId}`}
            >
              리포트 {report.reportId}
            </span>
          </div>
        </div>
        <div className="report-page__report-card-badges">
          <span className="report-page__report-card-priority">{report.priority}</span>
          <span className="report-page__report-card-workflow">{report.workflowStatus}</span>
          <span className="report-page__report-card-status">{report.productizationDecision}</span>
        </div>
      </div>
      <div className="report-page__report-card-body">
        <p className="report-page__report-card-summary">{report.riskSummary}</p>
        <div className="report-page__report-card-assessment">
          <span>상품화 판단</span>
          <p>{report.assessmentSummary}</p>
        </div>
      </div>
      <dl className="report-page__report-card-meta">
        <div>
          <dt>생성일</dt>
          <dd>{formatDate(report.generatedAt)}</dd>
        </div>
      </dl>
      {report.reviewFlags.length ? (
        <div className="report-page__report-card-flags">
          <span>추가 확인 항목</span>
          <div>
            {report.reviewFlags.slice(0, 2).map((flag) => (
              <span key={flag}>{flag}</span>
            ))}
            {report.reviewFlags.length > 2 ? <small>+{report.reviewFlags.length - 2}</small> : null}
          </div>
        </div>
      ) : null}
      <span className="report-page__report-card-action">검토 이어가기 <span aria-hidden="true">→</span></span>
    </a>
  )
}

function EmptyReportState({ onRequestCreate }: { onRequestCreate?: () => void }) {
  return (
    <div className="report-page__report-list-empty" role="status">
      <span className="report-page__report-list-empty-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <rect x="5" y="3.5" width="14" height="17" rx="2" />
          <path d="M8.5 8h7M8.5 12h4M8.5 16h7" />
        </svg>
      </span>
      <h3>아직 생성된 상품화 검토 리포트가 없습니다.</h3>
      <p>신규 위험 후보를 확인하고 AI 상품화 리포트를 생성해 보세요.</p>
      <button
        className="report-page__button report-page__button--secondary"
        type="button"
        disabled={!onRequestCreate}
        onClick={onRequestCreate}
        title={!onRequestCreate ? '위험 탐색 기능 연결 후 사용할 수 있습니다.' : undefined}
      >
        신규 위험 탐색하기
      </button>
      {!onRequestCreate ? <small>위험 탐색 기능 연결 후 신규 리포트를 생성할 수 있습니다.</small> : null}
    </div>
  )
}

export function GeneratedReportList({
  reports,
  onOpenReport,
  onRequestCreate,
}: GeneratedReportListProps) {
  const reviewReports = reports.filter((report) => report.workflowStatus !== '검토 완료')
  const recentReports = reports.filter((report) => report.workflowStatus === '검토 완료')

  return (
    <section className="report-page__report-list" aria-labelledby="generated-report-list-title">
      <header className="report-page__report-home-header">
        <div>
          <p className="report-page__eyebrow">04 / REPORT</p>
          <h1 id="generated-report-list-title">신규 위험 상품화 검토 리포트</h1>
          <p className="report-page__report-list-description">
            생성된 AI 상품화 검토 리포트를 확인하고 실무 검토를 이어서 진행합니다.
          </p>
        </div>
        <div className="report-page__report-home-action">
          <button
            className="report-page__button report-page__button--primary"
            type="button"
            disabled={!onRequestCreate}
            onClick={onRequestCreate}
            title={!onRequestCreate ? '위험 탐색 기능 연결 후 사용할 수 있습니다.' : undefined}
          >
            새 리포트 생성
          </button>
          {!onRequestCreate ? <p>위험 탐색 기능 연결 후 신규 리포트를 생성할 수 있습니다.</p> : null}
        </div>
      </header>

      <section className="report-page__report-list-section" aria-labelledby="review-needed-reports-title">
        <div className="report-page__report-list-section-heading">
          <div>
            <p className="report-page__eyebrow">WORK QUEUE</p>
            <h2 id="review-needed-reports-title">검토가 필요한 리포트</h2>
            <p>실무자가 확인하거나 작업을 이어가야 하는 리포트입니다.</p>
          </div>
          {reviewReports.length ? <span>{reviewReports.length}건</span> : null}
        </div>
        {reviewReports.length ? (
          <div className={`report-page__report-list-grid${reviewReports.length === 1 ? ' report-page__report-list-grid--single' : ''}`}>
            {reviewReports.map((report) => <ReportCard key={report.reportId} report={report} onOpenReport={onOpenReport} />)}
          </div>
        ) : <EmptyReportState onRequestCreate={onRequestCreate} />}
      </section>

      {recentReports.length ? (
        <section className="report-page__report-list-section report-page__report-list-section--recent" aria-labelledby="recent-reports-title">
          <div className="report-page__report-list-section-heading">
            <div>
              <p className="report-page__eyebrow">RECENT</p>
              <h2 id="recent-reports-title">최근 리포트</h2>
              <p>최근 생성하거나 수정한 리포트입니다.</p>
            </div>
          </div>
          <div className={`report-page__report-list-grid${recentReports.length === 1 ? ' report-page__report-list-grid--single' : ''}`}>
            {recentReports.map((report) => <ReportCard key={report.reportId} report={report} onOpenReport={onOpenReport} />)}
          </div>
        </section>
      ) : null}
    </section>
  )
}
