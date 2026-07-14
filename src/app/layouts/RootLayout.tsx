import { NavLink, Outlet } from 'react-router-dom'
import { rooms } from '../../shared/config/rooms'

export function RootLayout() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <NavLink to="/" className="brand" aria-label="Makers Lab 홈">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span>
            <strong>Makers Lab</strong>
            <small>Four rooms, one playground</small>
          </span>
        </NavLink>

        <nav className="main-nav" aria-label="주요 메뉴">
          <NavLink to="/" end>Home</NavLink>
          {rooms.map((room) => (
            <NavLink key={room.id} to={room.path}>
              {room.shortLabel}
            </NavLink>
          ))}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <span>MAKERS LAB / 2026</span>
        <span>각자의 방에서 만들고, 하나의 결과로 연결합니다.</span>
      </footer>
    </div>
  )
}
