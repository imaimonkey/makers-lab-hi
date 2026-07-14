import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="not-found">
      <p className="eyebrow">ERROR / 404</p>
      <h1>이 방은 아직<br />만들어지지 않았어요.</h1>
      <Link to="/" className="button">홈으로 돌아가기</Link>
    </section>
  )
}
