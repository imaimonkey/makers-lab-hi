import type { PropsWithChildren } from 'react'
import type { ReportNavItem } from './standalone-nav'

type StandaloneReportLayoutProps = PropsWithChildren<{
  navConfig: ReportNavItem[]
}>

function NavEntry({ item }: { item: ReportNavItem }) {
  const className = [
    'report-standalone__nav-entry',
    item.active ? 'is-active' : '',
    item.disabled ? 'is-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      <span className="report-standalone__nav-dot" aria-hidden="true" />
      <span>{item.label}</span>
      {item.statusLabel ? (
        <small className="report-standalone__nav-status">
          {item.statusLabel}
        </small>
      ) : null}
    </>
  )

  if (!item.disabled && item.href) {
    return (
      <a
        className={className}
        href={item.href}
        aria-current={item.active ? 'page' : undefined}
      >
        {content}
      </a>
    )
  }

  return (
    <span
      className={className}
      aria-current={item.active ? 'page' : undefined}
      aria-disabled={item.disabled || undefined}
    >
      {content}
    </span>
  )
}

export function StandaloneReportLayout({
  navConfig,
  children,
}: StandaloneReportLayoutProps) {
  return (
    <div className="report-standalone">
      <aside className="report-standalone__sidebar" aria-label="핵심 기능">
        <div className="report-standalone__brand">
          <span className="report-standalone__brand-mark" aria-hidden="true">
            R
          </span>
          <span>
            <strong>RISKON</strong>
            <small>Risk intelligence workspace</small>
          </span>
        </div>

        <nav className="report-standalone__nav">
          {navConfig.map((item) => (
            <NavEntry key={item.id} item={item} />
          ))}
        </nav>

        <p className="report-standalone__aside-note">
          단독 시연용 화면입니다. 다른 기능은 팀 통합 후 연결됩니다.
        </p>
      </aside>

      <div className="report-standalone__workspace">
        <header className="report-standalone__topbar">
          <div>
            <span className="report-standalone__topbar-kicker">04 / REPORT</span>
            <strong>신규 위험 상품화 의사결정 지원</strong>
          </div>
          <span className="report-standalone__environment">PROTOTYPE</span>
        </header>
        <main className="report-standalone__main">{children}</main>
      </div>
    </div>
  )
}

