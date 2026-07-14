type PageIntroProps = {
  eyebrow: string
  title: string
  description: string
  accent: string
}

export function PageIntro({ eyebrow, title, description, accent }: PageIntroProps) {
  return (
    <header className="page-intro" style={{ '--accent': accent } as React.CSSProperties}>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="page-description">{description}</p>
    </header>
  )
}
