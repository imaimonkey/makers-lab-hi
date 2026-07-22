import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { sampleOnlyNotice, sampleRiskCandidates } from '../../domain/risk/sampleData'
import { RiskExplorationLens } from '../../features/risk-catalog/RiskExplorationLens'
import { RiskExplorationOperations } from '../../features/risk-catalog/RiskExplorationOperations'
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
    <div className="page catalog-page">
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
      <RiskExplorationOperations />
      <RiskExplorationLens />
      <section className="integration-contract surface-card">
        <span className="contract-label">TEAM 02 INTEGRATION CONTRACT</span>
        <h2>목록은 기사 목록이 아니라 <em>정규화된 위험 후보</em>를 보여줍니다.</h2>
        <div>
          <p><strong>필수 입력</strong>RiskCandidate, evidenceCount, signalStrength, status</p>
          <p><strong>필수 출력</strong>선택한 riskId를 `/risks/:riskId`로 전달</p>
          <p><strong>금지</strong>근거 없는 AI 점수, 플랫폼 홈페이지 링크만 저장</p>
        </div>
      </section>
    </div>
  )
}
