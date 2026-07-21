import { Link, Outlet, useLocation } from 'react-router-dom'
import { AppIcon } from '../../shared/components/AppIcon'
import { ModeSwitch } from '../../shared/components/ModeSwitch'
import { RouteScrollManager } from '../../shared/components/RouteScrollManager'
import { isNavigationItemActive, navigationGroups } from '../../shared/config/navigation'

export function RootLayout() {
  const location = useLocation()
  const activeItem = navigationGroups
    .flatMap((group) => group.items)
    .find((item) => isNavigationItemActive(item, location.pathname))

  return (
    <div className="app-shell">
      <RouteScrollManager />
      <aside className="sidebar">
        <Link to="/" className="app-brand" aria-label="HI Risk Studio 홈">
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

        <nav className="side-nav" aria-label="주요 업무 메뉴">
          {navigationGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const isActive = isNavigationItemActive(item, location.pathname)
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={isActive ? 'nav-item active' : 'nav-item'}
                    aria-label={`${item.label} · ${item.caption}`}
                    title={item.label}
                    data-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="nav-icon-tile"><AppIcon name={item.icon} size={18} /></span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.caption}</small>
                    </span>
                    <em>{item.step}</em>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <AppIcon name="shield" size={20} />
          <p>
            <strong>근거 중심 의사결정</strong>
            <span>AI 결과는 실무자 검토 후 사용합니다.</span>
          </p>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-context">
            <span className="topbar-context-icon" aria-hidden="true"><AppIcon name={activeItem?.icon ?? 'radar'} size={16} /></span>
            <div>
            <p>신규위험 전략 워크벤치</p>
            <strong>{activeItem?.label ?? '업무 화면'}</strong>
            </div>
          </div>
          <label className="topbar-search">
            <AppIcon name="scan" size={16} />
            <span className="sr-only">통합 검색</span>
            <input readOnly placeholder="검색 연동 예정 · 신규 위험·기사·후보" aria-label="통합 검색 (연동 예정)" />
          </label>
          <div className="topbar-actions">
            <ModeSwitch mode="analyst" />
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>

        <footer className="app-footer">
          <span>HI RISK STUDIO / CONCEPT 2026</span>
          <span>현대해상 공식 서비스가 아닌 내부 프로토타입입니다.</span>
        </footer>
      </div>
    </div>
  )
}
