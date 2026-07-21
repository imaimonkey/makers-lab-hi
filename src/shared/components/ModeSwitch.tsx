import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppIcon } from './AppIcon'

type ModeSwitchProps = {
  mode: 'analyst' | 'customer' | 'sales'
}

export function ModeSwitch({ mode }: ModeSwitchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const currentLabel = mode === 'analyst' ? '실무자' : mode === 'sales' ? '영업부서' : '개인 고객'

  return (
    <div className="mode-switch mode-menu" ref={menuRef}>
      <button
        type="button"
        className="mode-menu-trigger"
        aria-label={`현재 ${currentLabel} 모드. 사용자 모드 메뉴 열기`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="mode-user-icon"><AppIcon name="user" size={16} /></span>
        <span className="mode-menu-current">{currentLabel}</span>
        <span className="mode-menu-chevron" aria-hidden="true">⌄</span>
      </button>

      {isOpen && (
        <div className="mode-menu-popover" role="menu" aria-label="사용자 모드 선택">
          <p>사용자 모드 전환</p>
          <Link
            to="/"
            role="menuitem"
            className={mode === 'analyst' ? 'active' : undefined}
            aria-current={mode === 'analyst' ? 'page' : undefined}
            onClick={() => setIsOpen(false)}
          >
            <strong>실무자</strong>
            <small>위험 탐지·상품개발 워크벤치</small>
          </Link>
          <Link
            to="/sales-intake"
            role="menuitem"
            className={mode === 'sales' ? 'active' : undefined}
            aria-current={mode === 'sales' ? 'page' : undefined}
            onClick={() => setIsOpen(false)}
          >
            <strong>영업부서</strong>
            <small>현장 리포트·상품개발 입력</small>
          </Link>
          <Link
            to="/customer-insight"
            role="menuitem"
            className={mode === 'customer' ? 'active' : undefined}
            aria-current={mode === 'customer' ? 'page' : undefined}
            onClick={() => setIsOpen(false)}
          >
            <strong>개인 고객</strong>
            <small>내 상황으로 보험 탐색</small>
          </Link>
        </div>
      )}
    </div>
  )
}
