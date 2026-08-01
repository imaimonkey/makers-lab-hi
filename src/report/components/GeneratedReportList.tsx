import { useMemo, useState } from 'react'
import type { GeneratedReportListItem } from '../services/report-list'

type GeneratedReportListProps = {
  reports: GeneratedReportListItem[]
  onOpenReport?: (report: GeneratedReportListItem) => void
  /** 위험 탐색 라우트가 연결되면 이 콜백만 주입해 신규 생성 흐름을 연결합니다. */
  onRequestCreate?: () => void
}

type ViewMode = 'grid' | 'list'
type SortOrder = 'latest' | 'oldest'
type TargetFilter = 'all' | GeneratedReportListItem['targetType']
type WorkflowFilter = 'all' | '검토 필요' | '검토 중' | '검토 완료' | '초안 생성'
type PriorityFilter = 'all' | GeneratedReportListItem['priority']

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

const slug = (value: string): string => value.replace(/\s+/g, '-').replace(/[·/]/g, '').toLowerCase()

const matchesWorkflow = (status: GeneratedReportListItem['workflowStatus'], filter: WorkflowFilter): boolean => {
  if (filter === 'all') return true
  if (filter === '검토 필요') return status === '검토 필요' || status === '실무자 미검토'
  return status === filter
}

function ReportCard({
  report,
  onOpenReport,
  onUnavailable,
  viewMode,
}: {
  report: GeneratedReportListItem
  onOpenReport?: (report: GeneratedReportListItem) => void
  onUnavailable?: (report: GeneratedReportListItem) => void
  viewMode: ViewMode
}) {
  const cardClassName = `report-page__report-card report-page__report-card--${viewMode}${report.priority === '우선 검토' ? ' report-page__report-card--priority' : ''}`
  const cardContent = (
    <>
      <div className="report-page__report-card-top">
        <span className="report-page__report-card-type">AI RISK REPORT</span>
        <div className="report-page__report-card-badges" aria-label="리포트 상태">
          <span className={`report-page__report-card-workflow report-page__report-card-workflow--${slug(report.workflowStatus)}`}>{report.workflowStatus}</span>
        </div>
      </div>
      <div className="report-page__report-card-heading">
        <div className="report-page__report-card-title-row">
          <h3>{report.riskName}</h3>
          {report.priority === '우선 검토' ? <span className="report-page__report-card-priority-mark"><i aria-hidden="true" />우선 검토</span> : null}
        </div>
        <div className="report-page__report-card-submeta">
          <span>{report.targetType}</span>
          <span aria-hidden="true">·</span>
          <span title={`위험 ID: ${report.riskId}`}>{report.reportId}</span>
        </div>
      </div>
      <div className="report-page__report-card-conclusion">
        <span>핵심 결론</span>
        <p>{report.shortConclusion}</p>
      </div>
      <div className="report-page__report-card-bottom">
        <span className="report-page__report-card-date">생성일 {formatDate(report.generatedAt)}</span>
        <span className="report-page__report-card-action">
          {report.detailAvailable ? '리포트 열기' : '상세 준비 중'} <span aria-hidden="true">→</span>
        </span>
      </div>
    </>
  )

  if (!report.detailAvailable) {
    return (
      <article
        className={cardClassName}
        role="button"
        tabIndex={0}
        aria-label={`${report.riskName} 상세 리포트 준비 중`}
        onClick={() => onUnavailable?.(report)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onUnavailable?.(report)
          }
        }}
      >
        {cardContent}
      </article>
    )
  }

  return (
    <a
      className={cardClassName}
      href={report.detailHref}
      aria-label={`${report.riskName} 리포트 열기`}
      onClick={(event) => {
        if (!onOpenReport) return
        event.preventDefault()
        onOpenReport(report)
      }}
    >
      {cardContent}
    </a>
  )
}

function EmptyReportState({ onRequestCreate, filtered }: { onRequestCreate?: () => void; filtered?: boolean }) {
  return (
    <div className="report-page__report-list-empty" role="status">
      <span className="report-page__report-list-empty-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <rect x="5" y="3.5" width="14" height="17" rx="2" />
          <path d="M8.5 8h7M8.5 12h4M8.5 16h7" />
        </svg>
      </span>
      <h3>{filtered ? '조건에 맞는 리포트가 없습니다.' : '아직 생성된 상품화 검토 리포트가 없습니다.'}</h3>
      <p>{filtered ? '검색어나 필터 조건을 변경해보세요.' : '신규 위험 후보를 확인하고 AI 상품화 리포트를 생성해 보세요.'}</p>
      {filtered ? (
        <button className="report-page__button report-page__button--secondary" type="button" onClick={onRequestCreate}>
          검색·필터 초기화
        </button>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}

export function GeneratedReportList({ reports, onOpenReport, onRequestCreate }: GeneratedReportListProps) {
  const [query, setQuery] = useState('')
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('all')
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [notice, setNotice] = useState('')

  const summary = useMemo(() => ({
    total: reports.length,
    reviewNeeded: reports.filter((report) => report.workflowStatus === '실무자 미검토' || report.workflowStatus === '검토 필요').length,
    inProgress: reports.filter((report) => report.workflowStatus === '검토 중' || report.workflowStatus === '초안 생성').length,
    completed: reports.filter((report) => report.workflowStatus === '검토 완료').length,
  }), [reports])

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return reports
      .filter((report) => !normalizedQuery || [report.riskName, report.reportId, report.riskId].some((value) => value.toLowerCase().includes(normalizedQuery)))
      .filter((report) => targetFilter === 'all' || report.targetType === targetFilter)
      .filter((report) => matchesWorkflow(report.workflowStatus, workflowFilter))
      .filter((report) => priorityFilter === 'all' || report.priority === priorityFilter)
      .sort((a, b) => {
        const left = a.generatedAt ? new Date(a.generatedAt).getTime() : 0
        const right = b.generatedAt ? new Date(b.generatedAt).getTime() : 0
        return sortOrder === 'latest' ? right - left : left - right
      })
  }, [priorityFilter, query, reports, sortOrder, targetFilter, workflowFilter])

  const resetFilters = () => {
    setQuery('')
    setTargetFilter('all')
    setWorkflowFilter('all')
    setPriorityFilter('all')
    setSortOrder('latest')
  }

  return (
    <section className="report-page__report-list" aria-label="생성된 리포트 목록">
      <section className="report-page__report-list-section" aria-labelledby="report-library-title">
        <div className="report-page__report-list-section-heading">
          <div>
            <p className="report-page__eyebrow">REPORT LIBRARY</p>
            <h2 id="report-library-title">생성된 리포트 <span>총 {summary.total}건</span></h2>
            <p>AI 분석 결과와 실무 검토 상태를 확인할 수 있습니다.</p>
          </div>
        </div>

        <div className="report-page__report-toolbar" aria-label="리포트 검색 및 필터">
          <label className="report-page__report-search"><span className="sr-only">리포트 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="리포트명 또는 위험 ID 검색" type="search" /></label>
          <label><span className="sr-only">대상 구분</span><select value={targetFilter} onChange={(event) => setTargetFilter(event.target.value as TargetFilter)}><option value="all">전체 대상</option><option value="가계">가계</option><option value="기업">기업</option><option value="혼합">혼합</option></select></label>
          <label><span className="sr-only">검토 상태</span><select value={workflowFilter} onChange={(event) => setWorkflowFilter(event.target.value as WorkflowFilter)}><option value="all">전체 상태</option><option value="검토 필요">검토 필요</option><option value="검토 중">검토 중</option><option value="검토 완료">검토 완료</option><option value="초안 생성">초안 생성</option></select></label>
          <label><span className="sr-only">우선순위</span><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}><option value="all">전체 우선순위</option><option value="우선 검토">우선 검토</option><option value="일반">일반</option></select></label>
          <label><span className="sr-only">정렬</span><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}><option value="latest">최신순</option><option value="oldest">오래된순</option></select></label>
          <div className="report-page__report-view-toggle" role="group" aria-label="보기 방식">
            <button type="button" className={viewMode === 'grid' ? 'is-active' : ''} aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')} title="그리드 보기">▦<span className="sr-only">그리드 보기</span></button>
            <button type="button" className={viewMode === 'list' ? 'is-active' : ''} aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')} title="리스트 보기">☷<span className="sr-only">리스트 보기</span></button>
          </div>
        </div>

        {notice ? <p className="report-page__report-list-notice" role="status">{notice}</p> : null}
        {reports.length === 0 ? <EmptyReportState onRequestCreate={onRequestCreate} /> : filteredReports.length === 0 ? <EmptyReportState filtered onRequestCreate={resetFilters} /> : (

          <div className={`report-page__report-list-grid report-page__report-list-grid--${viewMode}`}>
            {filteredReports.map((report) => <ReportCard key={report.reportId} report={report} viewMode={viewMode} onOpenReport={onOpenReport} onUnavailable={(item) => setNotice(`${item.riskName}의 상세 리포트는 준비 중입니다.`)} />)}
          </div>
        )}
      </section>
    </section>
  )
}
