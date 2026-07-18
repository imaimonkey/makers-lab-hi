import { Link } from 'react-router-dom'

type ModeSwitchProps = {
  mode: 'analyst' | 'customer'
}

export function ModeSwitch({ mode }: ModeSwitchProps) {
  return (
    <div className="mode-switch" aria-label="사용자 화면 전환">
      <Link
        to="/"
        className={mode === 'analyst' ? 'active' : undefined}
        aria-current={mode === 'analyst' ? 'page' : undefined}
      >
        실무자
      </Link>
      <Link
        to="/customer-insight"
        className={mode === 'customer' ? 'active' : undefined}
        aria-current={mode === 'customer' ? 'page' : undefined}
      >
        C
      </Link>
    </div>
  )
}
