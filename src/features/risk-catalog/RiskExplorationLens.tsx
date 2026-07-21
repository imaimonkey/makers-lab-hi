import { useMemo, useState } from 'react'
import { riskExplorationRecords, type ExplorationCategory } from '../../domain/risk/riskExplorationDemo'

const categoryFilters: Array<{ key: 'all' | ExplorationCategory; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'individual', label: '개인 위험' },
  { key: 'corporate', label: '기업 위험' },
  { key: 'legal', label: '법률·규제' },
  { key: 'department', label: '타 부서 신호' },
  { key: 'customer', label: '고객 신호' },
]

export function RiskExplorationLens() {
  const [category, setCategory] = useState<'all' | ExplorationCategory>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(riskExplorationRecords[0]?.id ?? '')

  const records = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    return riskExplorationRecords.filter((record) => {
      const matchesCategory = category === 'all' || record.categories.includes(category)
      const haystack = `${record.title} ${record.summary} ${record.tags.join(' ')}`.toLocaleLowerCase('ko-KR')
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery))
    })
  }, [category, query])

  const selected = records.find((record) => record.id === selectedId) ?? records[0]

  return (
    <section className="risk-exploration-lens surface-card" aria-labelledby="risk-exploration-title">
      <div className="risk-exploration-heading">
        <div>
          <p className="eyebrow">PRODUCTABILITY COMPARISON LENS</p>
          <h2 id="risk-exploration-title">위험 후보를 같은 기준으로 비교</h2>
          <p>seoyeon 브랜치의 카테고리 필터와 보험화 검토 지표를 현재 후보 계약에 맞춰 정리했습니다.</p>
        </div>
        <span className="status-badge sample">SAMPLE · 검토용</span>
      </div>

      <div className="risk-exploration-controls">
        <div className="risk-exploration-tabs" aria-label="위험 후보 분류 필터">
          {categoryFilters.map((filter) => (
            <button
              type="button"
              key={filter.key}
              className={category === filter.key ? 'active' : ''}
              aria-pressed={category === filter.key}
              onClick={() => setCategory(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <label className="risk-exploration-search">
          <span className="sr-only">후보 검색</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="후보명·태그 검색" />
        </label>
      </div>

      <div className="risk-exploration-table-wrap">
        <table className="risk-exploration-table">
          <caption className="sr-only">보험상품화 검토 후보 비교표</caption>
          <thead>
            <tr>
              <th scope="col">위험 후보</th>
              <th scope="col">시장 수요</th>
              <th scope="col">우연성·누적</th>
              <th scope="col">측정 가능성</th>
              <th scope="col">데이터·법적</th>
              <th scope="col">AI 보조 점수</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className={selected?.id === record.id ? 'selected' : ''}>
                <td>
                  <button type="button" className="risk-exploration-row-button" onClick={() => setSelectedId(record.id)}>
                    <strong>{record.title}</strong>
                    <small>{record.summary}</small>
                    <span>{record.tags.map((tag) => `#${tag}`).join(' ')}</span>
                  </button>
                </td>
                <td>{record.demand}</td>
                <td><span>{record.fortuity}</span><small>누적 {record.accumulation}</small></td>
                <td>{record.measurability}</td>
                <td><span>{record.dataConfidence}</span><small>법적 {record.legalExposure}</small></td>
                <td><strong className="risk-exploration-score">{record.score.toFixed(2)}</strong><small>/ 5.00</small></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!records.length && <div className="table-empty">조건에 맞는 위험 후보가 없습니다.</div>}
      </div>

      {selected && (
        <aside className="risk-exploration-detail" aria-live="polite">
          <div>
            <p className="eyebrow">SELECTED CANDIDATE</p>
            <h3>{selected.title}</h3>
            <p>{selected.nextAction}</p>
          </div>
          <dl>
            <div><dt>역선택 통제</dt><dd>{selected.adverseSelection}</dd></div>
            <div><dt>도덕적 해이</dt><dd>{selected.moralHazard}</dd></div>
            <div><dt>보장 공백</dt><dd>{selected.gap}</dd></div>
          </dl>
          <p className="risk-exploration-disclaimer">샘플 점수는 우선순위 논의를 돕는 보조 지표이며, 보험료·보장·가입 가능 여부를 의미하지 않습니다. 공식 통계와 약관 검토가 필요합니다.</p>
        </aside>
      )}
    </section>
  )
}

