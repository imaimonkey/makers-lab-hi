import { useState } from 'react'

export function CounterPractice() {
  const [count, setCount] = useState(0)

  return (
    <section className="practice-panel counter-panel">
      <div>
        <span className="panel-label">CURRENT COUNT</span>
        <strong className="counter-value">{String(count).padStart(2, '0')}</strong>
      </div>
      <div className="button-row">
        <button type="button" className="button secondary" onClick={() => setCount(0)}>초기화</button>
        <button type="button" className="button" onClick={() => setCount((value) => value + 1)}>+ 1 올리기</button>
      </div>
    </section>
  )
}
