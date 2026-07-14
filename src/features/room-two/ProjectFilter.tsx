import { useState } from 'react'

const projects = [
  { id: 1, name: 'Poster System', type: 'Design' },
  { id: 2, name: 'Tiny Dashboard', type: 'Code' },
  { id: 3, name: 'Motion Notes', type: 'Design' },
  { id: 4, name: 'Open API Map', type: 'Code' },
]

const filters = ['All', 'Design', 'Code'] as const

export function ProjectFilter() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('All')
  const visibleProjects = projects.filter(
    (project) => activeFilter === 'All' || project.type === activeFilter,
  )

  return (
    <section className="practice-panel filter-panel">
      <div className="filter-bar" aria-label="프로젝트 필터">
        {filters.map((filter) => (
          <button
            type="button"
            className={activeFilter === filter ? 'filter active' : 'filter'}
            onClick={() => setActiveFilter(filter)}
            key={filter}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="mini-project-grid">
        {visibleProjects.map((project) => (
          <article className="mini-project" key={project.id}>
            <span>{String(project.id).padStart(2, '0')}</span>
            <h2>{project.name}</h2>
            <p>{project.type}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
