import { Link } from 'react-router-dom'
import { AppIcon } from '../../shared/components/AppIcon'

export function NotFoundPage() {
  return (
    <section className="not-found">
      <span>404</span>
      <p className="page-kicker">ROUTE NOT FOUND</p>
      <h1>찾는 업무 화면이<br />연결되지 않았습니다.</h1>
      <p>주소를 다시 확인하거나 위험 레이더로 돌아가세요.</p>
      <Link className="primary-action inline-action" to="/">위험 레이더로 이동 <AppIcon name="arrow" size={18} /></Link>
    </section>
  )
}
