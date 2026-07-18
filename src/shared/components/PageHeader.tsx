type PageHeaderProps = {
  step: string
  eyebrow: string
  title: string
  description: string
  status?: string
  updatedAt?: string
}

export function PageHeader({
  step,
  eyebrow,
  title,
  description,
  status = 'FRAME READY',
  updatedAt = '통합 기준 · 2026.07',
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <p className="page-kicker"><span>{step}</span> {eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-header-meta">
        <span className="status-badge">{status}</span>
        <small>{updatedAt}</small>
      </div>
    </header>
  )
}
