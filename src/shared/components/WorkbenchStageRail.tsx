import { Link, useLocation } from 'react-router-dom'
import { AppIcon } from './AppIcon'
import { isNavigationItemActive, navigationGroups } from '../config/navigation'

/**
 * Compact stage shortcuts for the analyst workbench. The full labels remain in
 * the sidebar; this rail gives a quick visual read of the signal-to-report
 * journey without introducing a second active-page announcement.
 */
export function WorkbenchStageRail() {
  const location = useLocation()
  const items = navigationGroups.flatMap((group) => group.items)

  return (
    <nav className="workbench-stage-rail" aria-label="신규위험 업무 단계 바로가기">
      {items.map((item) => {
        const active = isNavigationItemActive(item, location.pathname)
        return (
          <Link
            key={item.id}
            to={item.path}
            className={active ? 'workbench-stage active' : 'workbench-stage'}
            data-active={active ? 'true' : 'false'}
            aria-label={`${item.step} ${item.label}${active ? ' · 현재 화면' : ''}`}
          >
            <span className="workbench-stage-icon"><AppIcon name={item.icon} size={14} /></span>
            <span className="workbench-stage-copy">
              <small>{item.step}</small>
              <strong>{item.label}</strong>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

