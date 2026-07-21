import { Link, Outlet } from 'react-router-dom'
import { AppIcon } from '../../shared/components/AppIcon'
import { ModeSwitch } from '../../shared/components/ModeSwitch'
import { RouteScrollManager } from '../../shared/components/RouteScrollManager'

export function SalesLayout() {
  return (
    <div className="app-shell sales-workspace-shell">
      <RouteScrollManager />
      <aside className="sidebar sales-workspace-sidebar">
        <Link to="/sales-intake" className="app-brand" aria-label="HI Emerging Risk Studio 영업부서 채널 홈">
          <span className="app-brand-mark" aria-hidden="true">HI</span>
          <span className="app-brand-copy">
            <strong>현대해상</strong>
            <small>Emerging Risk Studio</small>
          </span>
        </Link>

        <div className="prototype-flag">
          <span className="status-dot" aria-hidden="true" />
          비공식 내부 콘셉트
        </div>

        <nav className="side-nav" aria-label="영업부서 업무 메뉴">
          <div className="nav-group">
            <p>영업부서 채널</p>
            <Link to="/sales-intake" className="nav-item active" aria-label="현장 리포트 접수 · 위험·상품 제안 입력" title="현장 리포트 접수" data-label="현장 리포트 접수" aria-current="page">
              <span className="nav-icon-tile"><AppIcon name="inbox" size={18} /></span>
              <span>
                <strong>현장 리포트 접수</strong>
                <small>위험·상품 제안 입력</small>
              </span>
              <em>01</em>
            </Link>
          </div>
        </nav>

        <div className="sidebar-foot">
          <AppIcon name="shield" size={20} />
          <p>
            <strong>상품개발 검토 연결</strong>
            <span>접수 내용은 사람의 검토 후 후보로 연결합니다.</span>
          </p>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-context">
            <span className="topbar-context-icon" aria-hidden="true"><AppIcon name="inbox" size={16} /></span>
            <div>
            <p>영업부서 입력 채널</p>
            <strong>현장 리포트 접수</strong>
            </div>
          </div>
          <label className="topbar-search">
            <AppIcon name="scan" size={16} />
            <span className="sr-only">통합 검색</span>
            <input readOnly placeholder="검색 연동 예정 · 영업 리포트" aria-label="영업 리포트 검색 (연동 예정)" />
          </label>
          <div className="topbar-actions">
            <ModeSwitch mode="sales" />
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>

        <footer className="app-footer">
          <span>HI RISK STUDIO / SALES CHANNEL CONCEPT 2026</span>
          <span>운영 접수 API·권한·검토 큐 연결 전 내부 프로토타입입니다.</span>
        </footer>
      </div>
    </div>
  )
}
