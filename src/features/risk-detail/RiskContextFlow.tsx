import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { SampleRiskCandidate, SampleRiskDetail } from '../../domain/risk/sampleData'
import './riskContextFlow.css'

type RiskContextFlowProps = {
  catalogPath: string
  risk: SampleRiskCandidate
  detail: SampleRiskDetail
}

type Metric = {
  name: string
  level: string
  tone: 'high' | 'mid' | 'low'
  reason: string
  evidence: Array<{ title: string; body: string; url?: string }>
  missing: string[]
}

function buildJourney(risk: SampleRiskCandidate, detail: SampleRiskDetail) {
  return [
    ['1', '위험 노출 확대', `${risk.title} 관련 사용·시설·운영 규모가 커집니다.`],
    ['2', '위험 요인 발생', `${detail.exposedParty}의 운영·이용 과정에서 위험 신호가 나타납니다.`],
    ['3', '사고·분쟁 발생', detail.riskStatement],
    ['4', '손해 범위 확대', detail.primaryLoss],
    ['5', '책임 주체 확인', `${detail.exposedParty}와 계약·운영 관계에 따라 책임을 구분합니다.`],
    ['6', '보험 보장 검토', detail.decisionChecks[0] || '기존 상품 연결과 보장 공백을 확인합니다.'],
  ]
}

const metricNames = ['수요·시장 근거', '손해 측정 가능성', '보험사고 성립성', '책임·법률 구조', '인수·통제 가능성', '손실 규모·집적위험', '데이터 신뢰도', '기존 상품 보장 공백']

function toneForScore(score: number | undefined): { level: string; tone: Metric['tone'] } {
  if (score === undefined) return { level: '확인 필요', tone: 'mid' }
  if (score >= 70) return { level: '높음', tone: 'high' }
  if (score >= 45) return { level: '보통', tone: 'mid' }
  return { level: '추가 검토', tone: 'low' }
}

function buildMetrics(risk: SampleRiskCandidate, detail: SampleRiskDetail): Metric[] {
  const evidence = [
    ...detail.evidence.filter((item) => item.sourceUrl),
    ...detail.evidence.filter((item) => !item.sourceUrl && item.sourceName),
  ]
  const checks = Array.from(new Set([...detail.decisionChecks, detail.decisionStatus, detail.primaryLoss])).filter(Boolean)
  return metricNames.map((name, index) => {
    const assessment = detail.assessments[index]
    const status = toneForScore(assessment?.score)
    const linkedEvidence = evidence.slice(index % Math.max(1, evidence.length), (index % Math.max(1, evidence.length)) + 2)
    return {
      name,
      ...status,
      reason: assessment?.note || `${risk.title}의 ${name}에 대한 세부 근거와 실제 손해자료를 추가 확인해야 합니다.`,
      evidence: linkedEvidence.length ? linkedEvidence.map((item) => ({ title: item.sourceName || '연결 원문', body: assessment?.evidenceQuotes?.[0] || item.excerpt || item.sourceType || `${risk.title} 관련 원문 자료입니다.`, url: item.sourceUrl ?? undefined })) : [{ title: '연결 원문 확인 필요', body: '현재 상세 화면에 연결된 공식 원문 자료가 없습니다.' }],
      missing: assessment?.uncertainty?.length ? assessment.uncertainty.slice(0, 3) : (checks.slice(0, 3).length ? checks.slice(0, 3) : ['국내 실제 손해·청구자료', '기존 약관의 보장·면책 범위', '업종별 인수조건과 통제 기준']),
    }
  })
}

function buildContextCards(risk: SampleRiskCandidate, detail: SampleRiskDetail) {
  return [
    ['발생 배경', `${risk.title}과 관련된 산업·기술 변화로 해당 위험에 대한 노출과 검토 필요성이 커지고 있습니다.`],
    ['핵심 메커니즘', detail.riskStatement],
    ['주요 피해', detail.primaryLoss],
    ['영향 대상', detail.exposedParty],
    ['상품화 쟁점', detail.decisionChecks[0] || '사고 정의, 책임 범위와 기존 보험의 보장 공백을 구분해야 합니다.'],
  ]
}

function buildFlow(risk: SampleRiskCandidate, detail: SampleRiskDetail) {
  return [
    ['환경·기술 변화', `${risk.title}을 둘러싼 시장·제도·업무 환경 변화`],
    ['위험 노출 확대', `${detail.exposedParty}의 실제 업무·서비스 이용 과정`],
    ['사고·분쟁 발생', detail.riskStatement],
    ['손해 확산', detail.primaryLoss],
    ['보험 검토', detail.decisionChecks[1] || '기존 상품 연결성과 별도 담보 필요성을 확인'],
  ]
}

function buildDamageRows(risk: SampleRiskCandidate, detail: SampleRiskDetail) {
  return [
    ['직접 손해·사고', detail.primaryLoss, '직접 손해'],
    ['소송·방어비용', `${risk.title} 관련 법률자문, 조사, 소송대리와 합의 협상 비용이 발생할 수 있습니다.`, '비용 손해'],
    ['복구·재제작 비용', '사고 이후 복구, 대체 운영, 재제작과 복원 과정에서 추가 비용이 발생할 수 있습니다.', '운영 손해'],
    ['계약상 배상책임', `${detail.exposedParty} 사이의 계약·관리 책임에 따라 제3자 배상책임이 연결될 수 있습니다.`, '계약 책임'],
    ['평판·서비스 중단', '사고가 확산되면 고객·파트너 신뢰 하락과 서비스 중단 등 간접 손해가 발생할 수 있습니다.', '간접 손해'],
  ]
}

function buildStakeholders(detail: SampleRiskDetail) {
  return [
    ['주요 노출 대상', detail.exposedParty],
    ['위험을 관리하는 주체', '사업자·시설 운영자·서비스 제공자의 예방·검수·기록 관리 수준이 중요합니다.'],
    ['사고를 경험하는 주체', '직접 피해자와 고객, 이용자 또는 거래 상대방의 손해가 사고로 구체화될 수 있습니다.'],
    ['계약·외주 관계자', '외주·납품·플랫폼 계약의 역할과 권리·책임 조항에 따라 부담 주체가 달라질 수 있습니다.'],
    ['보험 계약자', '주된 보험 계약자의 사업 형태와 위험 통제 수준을 인수조건에 반영할 필요가 있습니다.'],
    ['규제·감독 기관', '법령·가이드라인·감독 기준의 변화가 사고 정의와 보장 범위에 영향을 줄 수 있습니다.'],
  ]
}

function buildCoverage(risk: SampleRiskCandidate) {
  const isPersonal = risk.theme === 'health-lifestyle' || risk.theme === 'platform-work'
  const subject = isPersonal ? '개인·근로자 관련 기존 담보' : '기업·시설 운영 관련 기존 담보'
  return [
    [subject, `${risk.title}의 직접 손해와 기존 담보가 연결되는지 가입 대상·약관별 확인이 필요합니다.`, '업종별 확인'],
    ['배상책임보험', '제3자 손해와 법률비용이 사고 정의와 면책 조항에 포함되는지 검토합니다.', '담보 경계 검토'],
    ['재산·휴업손해 담보', '시설·장비·서비스 중단과 복구 비용이 어떤 조건에서 보장되는지 확인합니다.', '보장 범위 확인'],
    ['사이버·전문직 담보', '데이터·전문서비스·플랫폼 사용 과정의 책임과 기존 특약 연결성을 확인합니다.', '특약 검토'],
    ['신규 특약·신상품', '기존 상품으로 설명되지 않는 누적손실과 책임 공백을 별도 구조화할 수 있습니다.', '구조화 가능'],
  ]
}

function PanelHeading({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return <div className="rcf-panel-head"><span className="rcf-num">{number}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>
}

export function RiskContextFlow({ catalogPath, risk, detail }: RiskContextFlowProps) {
  const [openMetric, setOpenMetric] = useState(0)
  const journey = buildJourney(risk, detail)
  const contextCards = buildContextCards(risk, detail)
  const flow = buildFlow(risk, detail)
  const damageRows = buildDamageRows(risk, detail)
  const stakeholders = buildStakeholders(detail)
  const coverage = buildCoverage(risk)
  const metrics = buildMetrics(risk, detail)
  const insuranceLosses = risk.id === 'ev-battery-fire'
    ? ['발화 차량의 배터리·차체 손해', '인접 차량의 화재·열·그을음·소화수 피해', '천장·기둥·마감재의 열손상', '전기·통신·급수·환기설비 손상', '단전·단수 및 주차장 사용 중단', '입주민 대피와 임시거주 비용', '관리주체의 긴급조치 및 복구 비용']
    : [`직접 손해: ${detail.primaryLoss}`, '인접 목적물·제3자 손해', '조사·방어·복구 비용', '영업·서비스 중단', '대피·임시조치 비용', '관리주체 긴급조치', '계약·법률상 배상책임']
  const insuranceReasons = [
    {
      title: risk.id === 'ev-battery-fire' ? '하나의 사고가 다수 손해로 확대될 수 있음' : '하나의 사고가 여러 손해로 확대될 수 있음',
      description: risk.id === 'ev-battery-fire' ? '지하주차장은 차량, 전기설비, 통신시설, 배관, 환기설비 등이 가까이 모여 있어 한 차량의 화재가 여러 피해 대상으로 확산될 수 있습니다.' : `${risk.title}은 사고가 발생하면 ${detail.exposedParty}와 주변 시설·이용자에게 손해가 연쇄적으로 확산될 수 있습니다.`,
      losses: insuranceLosses,
      insurance: '서로 다른 보험 목적물과 다수 피해자가 한 사고에 동시에 노출되는 집적위험으로 볼 필요가 있습니다.',
      ai: '손해 종류만이 아니라 한 사고에서 몇 개의 목적물과 이해관계자가 동시에 영향을 받는지를 확인해야 합니다.',
    },
    {
      title: risk.id === 'ev-battery-fire' ? '발생 빈도보다 사고당 손해 규모가 중요함' : '발생 빈도보다 사고당 손해 규모가 중요함',
      description: risk.id === 'ev-battery-fire' ? '전기차의 차량당 화재 발생률이 특별히 높다고 단정하기는 어렵지만, 지하주차장에서는 열과 연기가 축적되고 인접 차량과 구조물이 가까워 사고 한 건의 피해 규모가 커질 가능성이 있습니다.' : `${risk.title}은 발생 빈도만으로 판단하기보다 사고 한 건에서 발생할 수 있는 손해 심도와 누적손실을 함께 확인해야 합니다.`,
      quote: detail.evidence[0]?.excerpt || '사고 빈도와 별도로 사고당 손해심도·누적손해를 구분해 확인해야 합니다.',
      insurance: '발생 빈도보다 사고당 최대손해와 다수 목적물의 동시 손해 가능성을 함께 봐야 합니다.',
      ai: `${risk.title}의 손해 규모는 사고 원인뿐 아니라 노출된 목적물과 책임 주체의 범위에 따라 달라질 수 있습니다.`,
    },
    {
      title: risk.id === 'ev-battery-fire' ? '사고 진압 이후에도 손해가 계속될 수 있음' : '사고 이후에도 손해가 계속될 수 있음',
      description: risk.id === 'ev-battery-fire' ? '전기차 배터리는 차량 하부에 위치해 배터리 팩 내부를 직접 냉각하기 어려울 수 있습니다. 상부 스프링클러는 주변 확산 억제에 효과가 있어도 배터리 내부 열폭주 제어에는 한계가 있을 수 있습니다.' : `${risk.title}은 사고가 종료된 뒤에도 복구, 재발 방지, 영업 재개와 관련된 추가 손해가 이어질 수 있습니다.`,
      chips: risk.id === 'ev-battery-fire' ? ['진압 시간 장기화', '추가 소방활동 비용', '재발화 감시', '차량 보관', '주차장 폐쇄', '복구비용 증가'] : [detail.decisionChecks[0], detail.decisionChecks[1], detail.primaryLoss].filter(Boolean),
      insurance: '사고 당시의 직접손해뿐 아니라 사고 이후 관리·복구 비용까지 손해 범위가 넓어질 수 있습니다.',
      ai: '사고 종료 시점과 보험상 손해 종료 시점이 다를 수 있으므로 후속 비용의 발생 경로를 분리해야 합니다.',
    },
  ]
  const linkedEvidence = [
    ...detail.evidence.filter((item) => item.sourceUrl),
    ...detail.evidence.filter((item) => !item.sourceUrl && item.sourceName),
  ].slice(0, 3)
  const questions = [
    `${risk.title}에서 보험사고로 정의할 수 있는 최초의 객관적 사건은 무엇인가?`,
    '직접 손해, 방어비용, 배상책임과 서비스 중단 중 어디까지 보장할 것인가?',
    `주요 책임 주체(${detail.exposedParty})를 어떤 계약·증빙·통제 기록으로 구분할 것인가?`,
    '기존 상품의 보장·면책 조항으로 해결할 수 있는 범위와 신규 담보가 필요한 범위는 어디인가?',
    '사전 예방·검수·기록 관리 수준을 인수조건, 자기부담금과 면책 기준에 반영할 수 있는가?',
  ]

  return (
    <div className="risk-context-flow">
      <section className="rcf-hero">
        <article className="rcf-card rcf-hero-main"><div className="rcf-chips"><span>{risk.themeLabel}</span><span className="green">원문 중심 분석</span><span className="gray">위험·책임 구조</span></div><h1>{risk.title}</h1><p>{detail.riskStatement}</p><div className="rcf-hero-note"><b>이 화면의 역할</b><span>예상 보험금이나 보험료를 산출하지 않고, 위험 발생 구조·손해 유형·책임 주체·기존 보험 연결 가능성과 원문 근거를 확인합니다.</span></div></article>
        <aside className="rcf-card rcf-hero-side"><small>위험 요약</small><h3>{risk.themeLabel} · 상품화 검토</h3>{[['핵심 발생 구간', flow[1][1]], ['주요 손해 형태', detail.primaryLoss], ['주요 책임 주체', detail.exposedParty], ['핵심 불확실성', detail.decisionChecks[2] || '사고 정의와 손해자료의 추가 확인']].map(([label, value]) => <div className="rcf-summary-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</aside>
      </section>

      <section className="rcf-journey"><div className="rcf-journey-title"><strong>이 위험을 돌아보는 흐름</strong><span>배경 이해 → 보험 관점 → 사고 구조 → 근거 검증 → 상품화 질문</span></div><div className="rcf-journey-track">{journey.map(([number, title, caption], index) => <div className={`rcf-journey-step ${index === 0 ? 'active' : ''}`} key={number}><div className="jnum">{number}</div><b>{title}</b><span>{caption}</span></div>)}</div></section>

      <div className="rcf-layout"><main className="rcf-content-col">
        <section className="rcf-card rcf-panel" id="context"><PanelHeading number="01" title="이슈의 내용과 맥락" subtitle="상품화 판단 전 위험 자체를 이해하는 단계입니다." /><div className="rcf-context-grid">{contextCards.map(([title, body]) => <article className="rcf-context-card" key={title}><b>{title}</b><p>{body}</p></article>)}</div></section>
        <section className="rcf-card rcf-panel" id="why-insurance"><PanelHeading number="02" title="왜 보험 관점에서 주목해야 하나?" subtitle="단순한 이슈가 아니라 보험 검토 가치가 있는 이유를 정리합니다." />
          <div className="rcf-reason-list rcf-insurance-reasons">
            {insuranceReasons.map((reason, index) => <article className="rcf-reason rcf-insurance-reason" key={reason.title}>
              <div className="rcf-reason-head"><div className="rcf-reason-index">{String(index + 1).padStart(2, '0')}</div><h3>{reason.title}</h3></div>
              <p>{reason.description}</p>
              {reason.losses ? <div className="rcf-loss-grid">{reason.losses.map((item) => <span className="rcf-loss-item" key={item}>{item}</span>)}</div> : null}
              {reason.quote ? <div className="rcf-insurance-quote">{reason.quote}</div> : null}
              <div className="rcf-reason-grid"><div className="insurance"><b>보험 관점의 의미</b>{reason.insurance}</div><div className="ai"><b>AI 해석</b>{reason.ai}</div></div>
              {reason.chips ? <div className="rcf-chip-list">{reason.chips.map((item) => <span key={item}>{item}</span>)}</div> : null}
            </article>)}
          </div>
        </section>
        <section className="rcf-card rcf-panel" id="mechanism"><PanelHeading number="03" title="위험 발생 구조" subtitle="업무·서비스 과정에서 사고와 손해로 이어지는 흐름입니다." /><div className="rcf-flow-wrap"><div className="rcf-flow">{flow.map(([title, body]) => <div className="rcf-step" key={title}><strong>{title}</strong><span>{body}</span></div>)}</div><div className="rcf-callout">동일한 위험이라도 노출 규모, 운영 방식, 사전 통제, 계약 관계와 실제 사용 방식에 따라 사고 가능성과 손해 수준이 달라집니다.</div></div></section>
        <section className="rcf-card rcf-panel" id="damage"><PanelHeading number="04" title="손해와 비용의 확산 경로" subtitle="예상 보험금이 아니라 발생 가능한 손해 유형을 구분합니다." /><div className="rcf-damage-list">{damageRows.map(([title, body, tag]) => <div className="rcf-damage-row" key={title}><strong>{title}</strong><p>{body}</p><span>{tag}</span></div>)}</div><div className="rcf-note">금액 표시 원칙: 공개된 판결·합의·실제 비용이 확인되는 경우에만 근거와 함께 표시하며, 예상 보험료·PML은 종합 리포트에서 별도 검토합니다.</div></section>
        <section className="rcf-card rcf-panel" id="stakeholders"><PanelHeading number="05" title="영향 대상과 책임 관계" subtitle="누가 위험을 만들고 이용하며 손해를 부담할 수 있는지 구분합니다." /><div className="rcf-stake-grid">{stakeholders.map(([title, body]) => <article className="rcf-stake-card" key={title}><b>{title}</b><p>{body}</p></article>)}</div></section>
        <section className="rcf-card rcf-panel" id="coverage"><PanelHeading number="06" title="기존 보험·약관과의 연결" subtitle="현재 어떤 담보가 일부 손해와 연결될 수 있는지 확인합니다." /><div className="rcf-coverage-list">{coverage.map(([title, body, tag]) => <div className="rcf-coverage-row" key={title}><strong>{title}</strong><p>{body}</p><span>{tag}</span></div>)}</div></section>
        <section className="rcf-card rcf-panel" id="metrics"><PanelHeading number="07" title="위험 탐색 평가항목별 상세 근거" subtitle="위험 탐색의 평가 결과를 실제 데이터·원문·미확인 사항과 연결합니다." /><div className="rcf-intro"><b>읽는 방법:</b> 각 평가항목을 선택하면 판단 이유, 활용한 공식 자료와 원문 링크, 아직 부족한 자료를 함께 확인할 수 있습니다. 점수를 다시 보여주는 것이 아니라 왜 이런 평가가 나왔는지 검증하는 영역입니다.</div><div className="rcf-metric-evidence">{metrics.map((metric, index) => { const isOpen = openMetric === index; return <article className={`rcf-metric-card ${isOpen ? 'open' : ''}`} key={metric.name}><button type="button" className="rcf-metric-summary" onClick={() => setOpenMetric(isOpen ? -1 : index)} aria-expanded={isOpen}><strong className="metric-name">{metric.name}</strong><span className={`metric-level ${metric.tone}`}>{metric.level}</span><span className="metric-reason">{metric.reason}</span><span className="metric-toggle">{isOpen ? '접기 ▴' : '근거 보기 ▾'}</span></button>{isOpen && <div className="rcf-metric-detail"><div className="rcf-metric-detail-grid"><div className="rcf-evidence-box"><h4>확인된 근거</h4><div className="rcf-evidence-list">{metric.evidence.map((item) => <div className="rcf-evidence-item" key={item.title}><b>{item.title}</b><p>{item.body}</p>{item.url && <a href={item.url} target="_blank" rel="noreferrer noopener">{item.title} 원문 →</a>}</div>)}</div></div><div className="rcf-missing-box"><h4>추가 확인 필요</h4><ul>{metric.missing.map((item) => <li key={item}>{item}</li>)}</ul></div></div></div>}</article> })}</div><div className="rcf-bridge"><b>다음 흐름:</b> 평가항목별 근거를 확인한 뒤 아래에서 AI가 왜 이 위험을 별도 검토 대상으로 판단했는지 종합적으로 연결합니다.</div></section>
        <section className="rcf-card rcf-panel" id="evidence"><PanelHeading number="08" title="AI는 왜 이 위험을 별도 위험으로 판단했나?" subtitle="각 판단이 어떤 공식 자료와 위험 데이터에 기반하는지 추적합니다." /><div className="rcf-intro"><b>이 섹션의 핵심:</b> AI가 단순히 위험하다고 평가한 것이 아니라, 어떤 판단을 했고 어떤 자료가 이를 뒷받침하며 보험 검토에 어떤 의미를 갖는지 연결합니다.</div><div className="rcf-evidence-map">{(linkedEvidence.length ? linkedEvidence : [{ sourceName: '연결 원문 확인 필요', sourceUrl: undefined, excerpt: `${risk.title} 관련 공식 원문과 실제 손해자료를 추가 확인해야 합니다.` }]).map((source, index) => <div className="rcf-evidence-row" key={source.sourceName || String(index)}><div className="rcf-judgment"><small>AI 판단 {String(index + 1).padStart(2, '0')}</small><b>{index === 0 ? '공식 자료로 위험 신호를 확인' : index === 1 ? '사고와 손해의 연결 구조를 분리' : '기존 담보와 상품화 공백을 검토'}</b><p>{source.excerpt || `${risk.title}의 위험 신호와 보험 검토 의미를 연결합니다.`}</p></div><div className="rcf-connector">→</div><div className="rcf-source"><span>공식 자료</span><h4>{source.sourceName || '연결 원문'}</h4><p>판단 근거와 위험 쟁점을 재검증할 수 있는 원문 자료입니다.</p>{source.sourceUrl && <a href={source.sourceUrl} target="_blank" rel="noreferrer noopener">{source.sourceName} 원문 →</a>}</div></div>)}</div><div className="rcf-final-judgment">{risk.title}은 사고 가능성, 손해 발생 경로와 기존 담보의 보장 경계가 함께 검토되어야 하는 위험입니다. 다만 실제 상품화 여부는 국내 손해사례, 청구자료, 원문 최신성, 기존 약관의 보장·면책 범위와 법무 검토를 추가로 거쳐야 합니다.</div></section>
        <section className="rcf-card rcf-panel" id="questions"><PanelHeading number="09" title="종합 리포트로 넘길 상품화 질문" subtitle="위험 상세에서는 결론 대신 검토 질문을 구조화합니다." /><div className="rcf-questions">{questions.map((question, index) => <div className="rcf-question" key={question}><span>{String(index + 1).padStart(2, '0')}</span><p>{question}</p></div>)}</div></section>
      </main>
      <aside className="rcf-aside"><section className="rcf-card rcf-aside-card rcf-readiness"><div className="rcf-aside-head"><h3>상품화 검토 준비도</h3><p>정확한 요율 산출이 아닌 검토 근거의 준비 상태입니다.</p></div><div className="rcf-readiness-top"><b>근거 준비도</b><span>{Math.min(99, Math.max(35, Math.round((detail.evidence.length / 8) * 100)))}%</span></div><div className="rcf-progress"><i style={{ width: `${Math.min(99, Math.max(35, Math.round((detail.evidence.length / 8) * 100)))}%` }} /></div><p>공식 자료와 위험 구조는 확인되지만, 실제 국내 손해사례·청구자료와 기존 약관 비교가 추가로 필요합니다.</p></section><section className="rcf-card rcf-aside-card"><div className="rcf-aside-head"><h3>현재 확인된 내용</h3></div><div className="rcf-aside-list">{[['수요 신호', `${risk.title}과 관련된 시장·업무 변화와 노출 확대 신호가 확인됩니다.`], ['사고 정의', '발생 원인·사고 시점·손해 발생을 단계별로 분리해야 합니다.'], ['기존 담보', '기존 배상책임·재산·사이버·전문직 담보와의 연결 여부를 약관별로 확인해야 합니다.']].map(([title, body]) => <div className="rcf-aside-item" key={title}><b>{title}</b><span>{body}</span></div>)}</div></section><section className="rcf-card rcf-aside-card"><div className="rcf-aside-head"><h3>추가 확인 필요</h3></div><div className="rcf-aside-list">{Array.from(new Set([detail.decisionChecks[0], detail.decisionChecks[1], detail.primaryLoss])).filter(Boolean).slice(0, 3).map((item, index) => <div className="rcf-aside-item" key={item}><b>{['실제 손해·청구자료', '약관 비교', '책임 분담'][index]}</b><span>{item}</span></div>)}</div></section><section className="rcf-card rcf-aside-card"><div className="rcf-aside-head"><h3>수치 사용 원칙</h3></div><div className="rcf-aside-list">{[['위험 상세에서 제공', '공식 원문, 실제 사건, 책임 구조, 손해 유형과 추가 검토사항'], ['종합 리포트에서 참고', '러프한 보험료 범위, 유사 상품 비교와 시나리오 기반 손해 수준'], ['AI가 대체하지 않음', '공식 위험률, 연간 손해율, 최종 보험료와 요율 산출']].map(([title, body]) => <div className="rcf-aside-item" key={title}><b>{title}</b><span>{body}</span></div>)}</div><div className="rcf-actions"><Link className="primary" to={`${catalogPath.replace('/risks', '')}/reports`}>종합 리포트</Link><a className="ghost" href="#evidence">원문 모아보기</a></div></section></aside></div>
    </div>
  )
}
