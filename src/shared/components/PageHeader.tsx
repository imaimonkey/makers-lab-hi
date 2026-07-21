import { AppIcon } from './AppIcon'

type PageHeaderProps = {
  step: string
  eyebrow: string
  title: string
  description: string
  status?: string
  updatedAt?: string
}

const stageIcons = {
  '01': 'radar',
  '02': 'list',
  '03': 'scan',
  '04': 'report',
} as const

export function PageHeader({
  step,
  eyebrow,
  title,
  description,
  status = 'FRAME READY',
  updatedAt = '통합 기준 · 2026.07',
}: PageHeaderProps) {
  const stageIcon = eyebrow.includes('SALES') ? 'inbox' : stageIcons[step as keyof typeof stageIcons] ?? 'spark'

  return (
    <header className="page-header">
      <div>
        <p className="page-kicker">
          <span className="page-kicker-icon"><AppIcon name={stageIcon} size={13} /></span>
          <span className="page-kicker-number">{step}</span> {eyebrow}
        </p>
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
