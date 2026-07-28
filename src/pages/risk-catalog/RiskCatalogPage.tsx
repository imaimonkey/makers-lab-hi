import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { sampleOnlyNotice, sampleRiskCandidates } from '../../domain/risk/sampleData'
import { AppIcon } from '../../shared/components/AppIcon'
import { PageHeader } from '../../shared/components/PageHeader'

export function RiskCatalogPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('전체')
  const filters = ['전체', '신규', '검토 중', '관찰']
  const risks = useMemo(() => sampleRiskCandidates.filter((risk) => (
    (filter === '전체' || risk.status === filter)
    && risk.title.toLocaleLowerCase('ko-KR').includes(query.toLocaleLowerCase('ko-KR'))
  )), [filter, query])

  return (
    <div className="page catalog-page seoyeon-visual">
      <PageHeader
        step="02"
        eyebrow="RISK CANDIDATE CATALOG"
        title="위험 후보"
        description="탐지된 요소를 동일한 위험 문장과 상태 체계로 정규화하고, 검토 대상을 선별하는 목록입니다."
      />
      <div className="sample-notice"><span>SAMPLE</span>{sampleOnlyNotice}</div>
      <section className="catalog-toolbar surface-card">
        <label className="search-box">
          <span className="sr-only">위험 후보 검색</span>
          <AppIcon name="scan" size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="위험명·산업·키워드 검색" />
        </label>
        <div className="filter-tabs" aria-label="상태 필터">
          {filters.map((item) => (
            <button
              type="button"
              className={filter === item ? 'active' : ''}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      <section className="risk-table surface-card" aria-label="위험 후보 목록 예시">
        <div className="risk-table-head">
          <span>위험 후보</span><span>상태</span><span>신호 강도</span><span>상품성</span><span>근거</span><span>업데이트</span><span />
        </div>
        {risks.map((risk) => (
          <Link to={`/risks/${risk.id}`} className="risk-table-row" key={risk.id}>
            <span>
              <i className={`theme-dot ${risk.theme}`} />
              <span className="risk-row-icon"><AppIcon name={risk.theme === 'climate-energy' ? 'trend' : risk.theme === 'smart-living' ? 'spark' : risk.theme === 'platform-work' ? 'inbox' : 'scan'} size={14} /></span>
              <strong>{risk.title}</strong>
              <small>{risk.themeLabel} · {risk.trend}</small>
            </span>
            <span><em data-status={risk.status}>{risk.status}</em></span>
            <span><strong>{risk.signalStrength}</strong><small>/ 100</small></span>
            <span><strong>{risk.productFit ?? '—'}</strong><small>{risk.productFit ? '/ 100' : '미평가'}</small></span>
            <span>{risk.evidenceCount}건</span>
            <span>{risk.updatedAt}</span>
            <span><AppIcon name="arrow" size={17} /></span>
          </Link>
        ))}
        {!risks.length && <div className="table-empty">조건에 맞는 위험 후보가 없습니다.</div>}
      </section>
    </div>
  )
}
