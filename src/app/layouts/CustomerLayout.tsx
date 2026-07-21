import { Link, Outlet } from 'react-router-dom'
import { AppIcon } from '../../shared/components/AppIcon'
import { ModeSwitch } from '../../shared/components/ModeSwitch'

export function CustomerLayout() {
  return (
    <div className="customer-site-shell">
      <header className="customer-site-header">
        <div className="customer-header-inner">
          <Link to="/customer-insight" className="customer-brand" aria-label="현대해상 생활안심 찾기 홈">
            <span aria-hidden="true">HI</span>
            <div>
              <strong>현대해상</strong>
              <small>생활안심 찾기</small>
            </div>
          </Link>

          <nav className="customer-site-nav" aria-label="고객 서비스 메뉴">
            <a href="#situation-search"><AppIcon name="scan" size={15} />내 상황 찾기</a>
            <a href="#service-guide"><AppIcon name="list" size={15} />이용 방법</a>
            <a href="#official-products"><AppIcon name="shield" size={15} />상품 확인</a>
          </nav>

          <div className="customer-header-actions">
            <span className="demo-label"><i /> DEMO</span>
            <ModeSwitch mode="customer" />
          </div>
        </div>
      </header>

      <main className="customer-site-main">
        <Outlet />
      </main>

      <footer className="customer-site-footer">
        <div>
          <div className="customer-footer-brand"><span>HI</span><strong>현대해상 생활안심 찾기</strong></div>
          <p>공식 보험 가입설계가 아닌 발표용 서비스 콘셉트입니다.</p>
        </div>
        <div className="customer-footer-links">
          <a href="https://www.hi.co.kr/serviceAction.do?menuId=100950" target="_blank" rel="noreferrer">
            상품공시 <AppIcon name="external" size={14} />
          </a>
          <span>개인정보 입력 금지</span>
          <span>CONCEPT 2026</span>
        </div>
      </footer>
    </div>
  )
}
