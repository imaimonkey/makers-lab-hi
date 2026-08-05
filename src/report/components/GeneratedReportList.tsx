import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import type { GeneratedReportListItem } from '../services/report-list'
import { browserReportListPreferences, type ReportListPreference, type ReportListPreferences } from '../services/report-list-preferences'

type GeneratedReportListProps = {
  reports: GeneratedReportListItem[]
  onOpenReport?: (report: GeneratedReportListItem) => void
  /** 위험 탐색 라우트가 연결되면 이 콜백만 주입해 신규 생성 흐름을 연결합니다. */
  onRequestCreate?: () => void
}

type ViewMode = 'grid' | 'list'
type SortOrder = 'configured' | 'latest' | 'oldest'
type TargetFilter = 'all' | GeneratedReportListItem['targetType']
type PriorityFilter = 'all' | GeneratedReportListItem['priority']

const REPORTS_PER_PAGE = 9

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
  preference,
  onOpenReport,
  onUnavailable,
  onTogglePinned,
  viewMode,
}: {
  report: GeneratedReportListItem
  preference: ReportListPreference
  onOpenReport?: (report: GeneratedReportListItem) => void
  onUnavailable?: (report: GeneratedReportListItem) => void
  onTogglePinned: (reportId: string) => void
  viewMode: ViewMode
}) {
  const cardClassName = `report-page__report-card report-page__report-card--${viewMode}${report.priority === '우선 검토' ? ' report-page__report-card--priority' : ''}${preference.pinned ? ' is-pinned' : ''}`
  const openReport = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onOpenReport) return
    event.preventDefault()
    onOpenReport(report)
  }
  const handleUnavailableKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onUnavailable?.(report)
  }
  const cardMain = (
    <>
      <div className="report-page__report-card-top">
        <span className="report-page__report-card-type">AI RISK REPORT</span>
      </div>
      <div className="report-page__report-card-heading">
        <div className="report-page__report-card-title-row">
          <h3>{report.riskName}</h3>
          {report.priority === '우선 검토' ? <span className="report-page__report-card-priority-mark"><i aria-hidden="true" />우선 검토</span> : null}
        </div>
      </div>
    </>
  )
  const cardActions = (
    <div className="report-page__report-card-controls" aria-label="리포트 빠른 작업">
      {report.detailAvailable ? (
        <a className="report-page__report-card-action" href={report.detailHref} onClick={openReport}>
          리포트 열기 <span aria-hidden="true">→</span>
        </a>
      ) : (
        <span className="report-page__report-card-action">상세 준비 중 <span aria-hidden="true">→</span></span>
      )}
    </div>
  )
  const pinControl = (
    <button
      className={`report-page__report-card-pin${preference.pinned ? ' is-active' : ''}`}
      type="button"
      aria-pressed={preference.pinned}
      aria-label={preference.pinned ? '스크랩 해제' : '스크랩'}
      title={preference.pinned ? '스크랩 해제' : '스크랩'}
      onClick={() => onTogglePinned(report.reportId)}
    >
      <span aria-hidden="true">{preference.pinned ? '★' : '☆'}</span>
    </button>
  )
  const cardContent = report.detailAvailable ? (
    <a className="report-page__report-card-main" href={report.detailHref} aria-label={`${report.riskName} 리포트 열기`} onClick={openReport}>
      {cardMain}
    </a>
  ) : (
    <div
      className="report-page__report-card-main report-page__report-card-main--unavailable"
      role="button"
      tabIndex={0}
      aria-label={`${report.riskName} 상세 리포트 준비 중`}
      onClick={() => onUnavailable?.(report)}
      onKeyDown={handleUnavailableKeyDown}
    >
      {cardMain}
    </div>
  )

  return <article className={cardClassName}>{pinControl}{cardContent}<div className="report-page__report-card-bottom"><span className="report-page__report-card-date">생성일 {formatDate(report.generatedAt)}</span>{cardActions}</div></article>
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
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('configured')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [notice, setNotice] = useState('')
  const [preferences, setPreferences] = useState<ReportListPreferences>(() => browserReportListPreferences.load())
  const [currentPage, setCurrentPage] = useState(1)
  const reportListSectionRef = useRef<HTMLElement>(null)
  const pendingSectionPositionRef = useRef<{ documentTop: number; left: number } | null>(null)

  const summary = useMemo(() => ({ total: reports.length }), [reports.length])

  const updatePreference = (reportId: string) => {
    setPreferences((current) => {
      const next = {
        ...current,
        [reportId]: {
          pinned: !(current[reportId]?.pinned ?? false),
        },
      }
      browserReportListPreferences.save(next)
      return next
    })
  }

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return reports
      .filter((report) => !normalizedQuery || [report.riskName, report.reportId, report.riskId].some((value) => value.toLowerCase().includes(normalizedQuery)))
      .filter((report) => targetFilter === 'all' || report.targetType === targetFilter)
      .filter((report) => priorityFilter === 'all' || report.priority === priorityFilter)
      .sort((a, b) => {
        const pinnedDifference = Number(preferences[b.reportId]?.pinned === true) - Number(preferences[a.reportId]?.pinned === true)
        if (pinnedDifference) return pinnedDifference
        if (sortOrder === 'configured') return 0
        const left = a.generatedAt ? new Date(a.generatedAt).getTime() : 0
        const right = b.generatedAt ? new Date(b.generatedAt).getTime() : 0
        return sortOrder === 'latest' ? right - left : left - right
      })
  }, [preferences, priorityFilter, query, reports, sortOrder, targetFilter])

  const pageCount = Math.max(1, Math.ceil(filteredReports.length / REPORTS_PER_PAGE))
  const activePage = Math.min(currentPage, pageCount)
  const visibleReports = useMemo(() => {
    const start = (activePage - 1) * REPORTS_PER_PAGE
    return filteredReports.slice(start, start + REPORTS_PER_PAGE)
  }, [activePage, filteredReports])

  const changePage = (nextPage: number) => {
    const section = reportListSectionRef.current
    if (section) {
      const rect = section.getBoundingClientRect()
      // The next page can be shorter than the current page. Preserve a
      // reachable document anchor instead of the current viewport position,
      // which may no longer exist after the card grid shrinks.
      pendingSectionPositionRef.current = {
        documentTop: Math.max(0, rect.top + window.scrollY - 16),
        left: window.scrollX,
      }
    }
    setCurrentPage(nextPage)
  }

  const preventPaginationFocusScroll = (event: MouseEvent<HTMLButtonElement>) => {
    // The pagination row moves when the last page has fewer card rows. Do not
    // let the browser re-scroll to the focused mouse button after that reflow.
    if (event.button === 0) event.preventDefault()
  }

  useLayoutEffect(() => {
    const previousPosition = pendingSectionPositionRef.current
    if (!previousPosition) return

    const section = reportListSectionRef.current
    pendingSectionPositionRef.current = null
    if (!section) return

    const restoreSectionPosition = () => {
      window.scrollTo({
        top: previousPosition.documentTop,
        left: previousPosition.left,
        behavior: 'auto',
      })
    }

    // A pointer click can focus the pagination button after the layout effect
    // and make the browser scroll once more. Restore on two animation frames
    // so the section heading remains the stable handoff point after both the
    // React reflow and focus handling have completed.
    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      restoreSectionPosition()
      secondFrame = window.requestAnimationFrame(restoreSectionPosition)
    })
    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame) window.cancelAnimationFrame(secondFrame)
    }
  }, [activePage])

  const resetFilters = () => {
    setQuery('')
    setTargetFilter('all')
    setPriorityFilter('all')
    setSortOrder('configured')
    setCurrentPage(1)
  }

  return (
    <section className="report-page__report-list" aria-label="생성된 리포트 목록">
      <section ref={reportListSectionRef} className="report-page__report-list-section" aria-labelledby="report-library-title">
        <div className="report-page__report-list-section-heading">
          <div>
            <p className="report-page__eyebrow">REPORT LIBRARY</p>
            <h2 id="report-library-title">생성된 리포트 <span>총 {summary.total}건</span></h2>
            <p>AI 분석 결과와 생성된 리포트를 확인할 수 있습니다.</p>
          </div>
        </div>

        <div className="report-page__report-toolbar" aria-label="리포트 검색 및 필터">
          <label className="report-page__report-search"><span className="sr-only">리포트 검색</span><input value={query} onChange={(event) => { setCurrentPage(1); setQuery(event.target.value) }} placeholder="리포트명 또는 위험 ID 검색" type="search" /></label>
          <label><span className="sr-only">대상 구분</span><select value={targetFilter} onChange={(event) => { setCurrentPage(1); setTargetFilter(event.target.value as TargetFilter) }}><option value="all">전체 대상</option><option value="가계">가계</option><option value="기업">기업</option><option value="혼합">혼합</option></select></label>
          <label><span className="sr-only">우선순위</span><select value={priorityFilter} onChange={(event) => { setCurrentPage(1); setPriorityFilter(event.target.value as PriorityFilter) }}><option value="all">전체 우선순위</option><option value="우선 검토">우선 검토</option><option value="일반">일반</option></select></label>
          <label><span className="sr-only">정렬</span><select value={sortOrder} onChange={(event) => { setCurrentPage(1); setSortOrder(event.target.value as SortOrder) }}><option value="configured">구성 순서</option><option value="latest">최신순</option><option value="oldest">오래된순</option></select></label>
          <div className="report-page__report-view-toggle" role="group" aria-label="보기 방식">
            <button type="button" className={viewMode === 'grid' ? 'is-active' : ''} aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')} title="그리드 보기">▦<span className="sr-only">그리드 보기</span></button>
            <button type="button" className={viewMode === 'list' ? 'is-active' : ''} aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')} title="리스트 보기">☷<span className="sr-only">리스트 보기</span></button>
          </div>
        </div>

        {notice ? <p className="report-page__report-list-notice" role="status">{notice}</p> : null}
        {reports.length === 0 ? <EmptyReportState onRequestCreate={onRequestCreate} /> : filteredReports.length === 0 ? <EmptyReportState filtered onRequestCreate={resetFilters} /> : (

          <>
            <div className={`report-page__report-list-grid report-page__report-list-grid--${viewMode}`}>
              {visibleReports.map((report) => <ReportCard key={report.reportId} report={report} preference={preferences[report.reportId] ?? { pinned: false }} viewMode={viewMode} onOpenReport={onOpenReport} onTogglePinned={updatePreference} onUnavailable={(item) => setNotice(`${item.riskName}의 상세 리포트는 준비 중입니다.`)} />)}
            </div>
            {pageCount > 1 ? (
              <nav className="report-page__report-pagination" aria-label="리포트 목록 페이지 이동">
                <button type="button" disabled={activePage === 1} onMouseDown={preventPaginationFocusScroll} onClick={() => changePage(Math.max(1, activePage - 1))}>
                  <span aria-hidden="true">←</span> 이전
                </button>
                <strong aria-live="polite">{activePage} / {pageCount}</strong>
                <button type="button" disabled={activePage === pageCount} onMouseDown={preventPaginationFocusScroll} onClick={() => changePage(Math.min(pageCount, activePage + 1))}>
                  다음 <span aria-hidden="true">→</span>
                </button>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </section>
  )
}
