import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import './generativeAiCopyrightDetail.css'
import type { SampleRiskCandidate, SampleRiskDetail, SampleRiskEvidence } from '../../domain/risk/sampleData'
import { riskExplorationRecords } from '../../domain/risk/riskExplorationDemo'
import { riskCandidateEvidenceSnapshots } from '../../domain/risk/riskCandidateEvidence'
import { getRiskDetailNarrative } from '../../domain/risk/riskDetailContent'
import { getRiskDetailResearchSources } from '../../domain/risk/riskDetailSources'

type StandardRiskDetailProps = { risk: SampleRiskCandidate; detail: SampleRiskDetail }

const importantRiskPhrases = new Set([
  '신규 보험상품', '보험상품', '상품화 가능성', '보험사고', '보험금', '손해', '책임',
  '보장 공백', '기존 보험', '방어비용', '복구비용', '제3자 배상책임', '인수조건',
  '집적위험', '공식 원문', '공개자료', '법률', '규제', '통제 수준', '관리 로그', '사고 정의',
])

function emphasizeImportantText(text: string): ReactNode {
  const parts = text.split(/(신규 보험상품|보험상품|상품화 가능성|보험사고|보험금|손해|책임|보장 공백|기존 보험|방어비용|복구비용|제3자 배상책임|인수조건|집적위험|공식 원문|공개자료|법률|규제|통제 수준|관리 로그|사고 정의)/g)
  return parts.map((part, index) => importantRiskPhrases.has(part) ? <strong key={`${part}-${index}`}>{part}</strong> : part)
}

function sourceBadgeName(sourceName: string | undefined, fallback: string) {
  return sourceName && !sourceName.includes('위험 후보 비교 자료') && !sourceName.includes('연결된 공개 원문') ? sourceName : fallback
}

const sectionIds = ['context', 'why-insurance', 'mechanism', 'policy', 'damage', 'stakeholders', 'coverage', 'questions', 'deep-analysis', 'ledger']
const sectionLabels = ['이슈 맥락', '보험 관점', '위험 구조', '정책·공식 자료', '손해 경로', '책임 주체', '기존 보험 연결', '상품화 질문', '위험 심층 해설', '근거 원장']

function PanelTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return <header className="aic-panel-title"><div><span>{number}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div></header>
}

function sourceFor(detail: SampleRiskDetail, index: number): SampleRiskEvidence | undefined {
  const items = detail.evidence.filter((item) => item.sourceUrl)
  return items.length ? items[index % items.length] : undefined
}

export function StandardRiskDetail({ risk, detail }: StandardRiskDetailProps) {
  const record = riskExplorationRecords.find((item) => item.detailRiskId === risk.id)
  const narrative = getRiskDetailNarrative(risk.id) ?? detail.narrative
  const researchSources = getRiskDetailResearchSources(risk.id)
  const snapshot = riskCandidateEvidenceSnapshots[risk.id]
  const firstEvidence = sourceFor(detail, 0)
  const sourceFacts = snapshot?.facts ?? [detail.riskStatement, record?.summary ?? detail.riskStatement, detail.primaryLoss]
  const sourceChecks = snapshot?.nextChecks ?? detail.decisionChecks
  const primarySource = snapshot?.sourceUrl || firstEvidence?.sourceUrl || record?.sourceUrl
  const primarySourceName = snapshot?.sourceName || firstEvidence?.sourceName || record?.sourceName || '연결된 공개 원문'
  const reportPath = risk.articleId
    ? `/reports?reportId=article-report-${encodeURIComponent(risk.articleId)}`
    : risk.id === 'ev-battery-fire'
      ? '/reports?reportId=RPT-EVFIRE-001-20260228'
      : '/reports'
  const policySources = [
    ...(snapshot ? [{ id: `${risk.id}-snapshot`, title: `${risk.title} · 공개 원문 사실`, sourceName: snapshot.sourceName, sourceUrl: snapshot.sourceUrl, date: snapshot.sourceDate, excerpt: snapshot.scope }] : []),
    ...researchSources.map((item) => ({ id: `${risk.id}-${item.institution}-${item.title}`, title: item.title, sourceName: item.institution, sourceUrl: item.url, date: '공식 원문', excerpt: item.role })),
    ...detail.evidence,
  ]
  const uniquePolicySources = [...new Map(policySources.map((item) => [`${item.sourceName}|${item.title}`, item] as const)).values()]
  const contexts = [
    ['발생 배경', narrative?.background || sourceFacts[0]],
    ['핵심 메커니즘', narrative?.mechanism || sourceFacts[1]],
    ['피해 유형', narrative?.damage || detail.primaryLoss],
    ['영향 대상', narrative?.exposure || detail.exposedParty],
    ['상품화 쟁점', narrative?.productIssue || sourceChecks[0] || detail.decisionChecks[0]],
  ]
  const reasons = narrative?.insuranceReasons ?? []
  const flow = [
    ['환경 변화', narrative?.background || sourceFacts[0]],
    ['위험 요인 발생', narrative?.mechanism || sourceFacts[1]],
    ['사고·분쟁 발생', narrative?.incident || detail.riskStatement],
    ['손해 확대', narrative?.escalation || detail.primaryLoss],
    ['보장 검토', narrative?.insuranceBoundary || sourceChecks[1] || detail.decisionStatus],
  ]
  const lossRows = narrative?.lossRows ?? []
  const stakeholders = narrative?.stakeholders ?? []
  const coverageRows = narrative?.coverageRows ?? []
  const questions = narrative?.questions ?? []
  const analysisSections = narrative?.analysisSections ?? []
  const decisionTitle = detail.decisionTitle.replace(/\n/g, ' ')

  return (
    <main className="ai-copyright-detail standard-risk-detail">
      <section className="aic-hero">
        <div className="aic-hero-main">
          <div className="aic-chips"><span>{risk.themeLabel}</span><span className="green">원문 중심 분석</span><span className="gray">위험 구조·보험 연결</span></div>
          <h1>{risk.title}</h1>
          <p>{risk.trend}. {narrative?.overview || detail.riskStatement} {narrative?.background || snapshot?.scope || ''}</p>
          <div className="aic-definition"><b>위험 상세의 목적</b><p>예상 보험금이나 보험료를 단정하지 않고, 위험이 발생하는 맥락과 손해 구조·책임 주체·기존 보험 연결 가능성을 원문과 함께 확인합니다.</p></div>
        </div>
        <aside className="aic-hero-summary"><small>위험 요약</small><h3>{risk.title}</h3>
          {[
            ['핵심 발생 구간', narrative?.mechanism || risk.themeLabel],
            ['주요 손해 형태', narrative?.damage || detail.primaryLoss],
            ['주요 책임 주체', narrative?.responsibility || detail.exposedParty],
            ['현재 판단 상태', detail.decisionStatus],
          ].map(([label, value]) => <div className="aic-summary-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </aside>
      </section>

      <section className="aic-fact-grid">
        {[
          ['공개 원문 사실', sourceFacts[0], snapshot?.sourceDate || '발행일 확인 필요'],
          ['손해 측정 과제', narrative?.damage || detail.primaryLoss, narrative?.evidenceNeeded || sourceChecks[0] || '국내 손해자료 추가 확인'],
          ['기존 보장 연결', narrative?.insuranceBoundary || detail.decisionChecks[3] || '기존 상품·약관 확인 필요', '약관·사고 정의 검토'],
          ['권장 다음 단계', decisionTitle, narrative?.productIssue || sourceChecks[1] || record?.nextAction || '공식 원문과 손해자료 추가 확인'],
        ].map(([label, title, body], index) => <article className="aic-fact" key={label}><small>{label}</small><strong>{title}</strong><p>{body}</p>{index === 0 && primarySource ? <a href={primarySource} target="_blank" rel="noreferrer noopener">{primarySourceName} ↗</a> : <span>원문 확인 필요</span>}</article>)}
      </section>

       <nav className="aic-section-nav" aria-label="위험 상세 섹션 이동">
        {sectionLabels.map((label, index) => <a href={`#aic-${sectionIds[index]}`} key={label}>{label}</a>)}
      </nav>

      <div className="aic-layout">
        <div className="aic-content">
           <section className="aic-panel" id="aic-context"><PanelTitle number="01" title="해당 이슈의 내용과 맥락" subtitle="상품화 판단 전 위험 자체를 이해하는 단계입니다." /><div className="aic-context-grid">{contexts.map(([title, body]) => <article className="aic-context-card" key={title}><h4>{title}</h4><p>{body}</p></article>)}</div></section>

          <section className="aic-panel aic-editorial-panel" id="aic-why-insurance"><PanelTitle number="02" title="왜 보험 관점에서 주목해야 하나?" subtitle="단순한 이슈가 아니라 보험 검토 가치가 있는 이유를 정리합니다." /><div className="aic-editorial-reasons">{reasons.map(([title, body, meaning], index) => <article className="aic-editorial-reason" key={title}><div className="aic-editorial-reason-head"><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3></div><p>{body}</p><div className="aic-editorial-meaning-grid"><div className="insurance"><b>보험 관점의 의미</b>{meaning}</div><div className="ai"><b>AI 해석</b>{index === 0 ? narrative?.damage || detail.primaryLoss : index === 1 ? narrative?.evidenceNeeded || record?.gap || detail.decisionStatus : narrative?.insuranceBoundary || detail.decisionStatus}</div></div></article>)}</div><div className="aic-editorial-grid">{researchSources.slice(0, 2).map((item) => <article className="aic-editorial-card" key={item.title}><small>{item.institution}</small><h3>{item.title}</h3><div className="aic-editorial-quote"><blockquote>{item.role}</blockquote><cite>{item.institution}</cite></div><div className="aic-editorial-split"><div className="context"><b>맥락 해설</b><span>{narrative?.background || sourceFacts[0]}</span></div><div className="insurance"><b>보험적 의미</b><span>{narrative?.productIssue || record?.gap || detail.decisionStatus}</span></div></div><a href={item.url} target="_blank" rel="noreferrer noopener">{item.institution} 원문 →</a></article>)}</div></section>

          <section className="aic-panel aic-editorial-panel" id="aic-mechanism"><PanelTitle number="03" title="위험 발생 구조" subtitle="환경 변화에서 사고·분쟁과 보험 검토까지의 흐름입니다." /><div className="aic-mechanism"><div className="aic-flow">{flow.map(([title, body], index) => <span key={title}><b>{['🌐', '⚠️', '🔥', '📋', '🛡️'][index]}</b><strong>{title}</strong><small>{body}</small>{index < flow.length - 1 ? <i>→</i> : null}</span>)}</div><div className="aic-callout">위험 신호가 곧바로 보험사고나 보험금 지급을 의미하지는 않습니다. 실제 손해와 책임 관계가 확인되는 지점을 기준으로 보장 가능성을 검토해야 합니다.</div></div><div className="aic-editorial-grid aic-mechanism-articles"><article className="aic-editorial-card"><small>발생 단계</small><h3>{narrative?.mechanism || '위험 요인이 사고로 전환되는 과정'}</h3><p>{narrative?.incident || detail.riskStatement}</p></article><article className="aic-editorial-card"><small>손해 단계</small><h3>{narrative?.escalation || '사고 이후 비용과 책임의 확대'}</h3><p>{narrative?.damage || detail.primaryLoss}</p></article><article className="aic-editorial-card wide"><small>집적위험</small><h3>동일 플랫폼·시설·제도에 연결된 다수 피보험자의 동시 노출</h3><p>{narrative?.productIssue || record?.gap || detail.decisionStatus}를 기업별로 분리해 확인해야 집적 손해와 보장 한도를 검토할 수 있습니다.</p></article></div></section>

          <section className="aic-panel" id="aic-policy"><PanelTitle number="04" title="정책·공식 자료" subtitle="국내외 공식 기준과 논의 동향입니다." /><div className="aic-news-list">{policySources.slice(0, 5).map((item) => <a href={item.sourceUrl || '#'} target={item.sourceUrl ? '_blank' : undefined} rel={item.sourceUrl ? 'noreferrer noopener' : undefined} key={item.id}><div><b>{item.title}</b><small>{item.sourceName} · {item.excerpt || '공개 원문'}</small></div><time>{item.date}</time></a>)}</div></section>

           <section className="aic-panel" id="aic-damage"><PanelTitle number="05" title="손해와 비용의 확산 경로" subtitle="예상 보험금이 아니라 실제로 발생 가능한 손해 유형을 구분합니다." /><div className="aic-damage-path">{lossRows.map(([title, body, tag]) => <div className="aic-damage-row" key={title}><strong>{title}</strong><p>{body}</p><span><b>{tag}</b>원문·약관 확인</span></div>)}</div></section>

          <section className="aic-panel" id="aic-stakeholders"><PanelTitle number="06" title="영향 대상과 책임 관계" subtitle="누가 위험을 만들고, 이용하며, 손해를 부담할 수 있는지 구분합니다." /><div className="aic-stakeholder-grid">{stakeholders.map(([title, body]) => <article key={title}><strong>{title}</strong><p>{body}</p></article>)}</div></section>

          <section className="aic-panel" id="aic-coverage"><PanelTitle number="07" title="기존 보험·약관과의 연결" subtitle="새 상품 결론이 아니라 현재 어떤 보장이 일부 손해와 연결될 수 있는지 확인합니다." /><div className="aic-coverage-map">{coverageRows.map(([title, body, status], index) => <div className="aic-coverage-row" key={title}><strong>{title}</strong><p>{body}</p><span className={index % 3 === 0 ? 'partial' : index % 3 === 1 ? 'possible' : 'review'}>{status}</span></div>)}</div></section>

          <section className="aic-panel" id="aic-questions"><PanelTitle number="08" title="종합 리포트로 넘길 상품화 질문" subtitle="위험 상세에서는 결론을 내리지 않고 검토 질문을 구조화합니다." /><div className="aic-question-list">{questions.map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p></div>)}</div></section>

           <section className="aic-panel aic-deep-analysis" id="aic-deep-analysis"><PanelTitle number="09" title="위험 심층 해설" subtitle="실제 자료와 인용을 바탕으로 위험 환경, 불확실성과 상품화 가능성을 하나의 흐름으로 해설합니다." /><div className="aic-editorial-wrap"><div className="aic-editorial-hero"><small>원문 기반 위험 분석</small><h2>{risk.title}은 신규 보험상품이 될 수 있는가</h2><p>위험의 발생 배경부터 실제 비용, 기존 보험의 보장 공백과 현실적인 상품 형태까지 연결해 살펴봅니다.</p></div><div className="aic-editorial-body"><p className="aic-editorial-intro">{narrative?.analysisIntro || `${risk.title}을 보험의 관점에서 바라볼 때 가장 먼저 구분해야 할 것은, 이 위험이 단순히 하나의 사고나 분쟁으로 끝나는 문제가 아니라는 점입니다. 위험은 ${sourceFacts.join(' ')}의 전 과정에서 발생합니다.`} 따라서 상품화 가능성을 판단하려면 위험의 원인과 사고 정의, 손해 전환 과정, 책임 주체, 기업별 통제 수준을 함께 살펴봐야 합니다.</p>{analysisSections.map(([title, body], index) => { const item = researchSources[index % researchSources.length]; const evidence = index === 0 ? firstEvidence : undefined; return <article className="aic-editorial-section" key={title}><div className="aic-editorial-section-head"><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3></div><p>{emphasizeImportantText(body)}</p>{evidence ? <div className="aic-editorial-quote"><blockquote>{evidence.excerpt || evidence.title}</blockquote><cite>{evidence.sourceName}</cite><a href={evidence.sourceUrl || '#'} target="_blank" rel="noreferrer noopener">{sourceBadgeName(evidence.sourceName, item?.institution || '공식 원문')} 원문 →</a></div> : item ? <div className="aic-editorial-quote"><blockquote>{item.role}</blockquote><cite>{item.institution} · {item.title}</cite><a href={item.url} target="_blank" rel="noreferrer noopener">{item.institution} 원문 →</a></div> : null}<div className="aic-editorial-meaning"><b>보험적 의미</b><p>{index === 0 ? narrative?.priorityCover || '사고 정의와 손해 항목을 분리해 담보 구조를 설계해야 합니다.' : index === 1 ? narrative?.underwriting || '방어비용·복구비용·제3자 배상책임을 구분해야 합니다.' : narrative?.evidenceNeeded || '실제 자료가 확보된 범위부터 제한적 특약을 검토할 수 있습니다.'}</p></div></article> })}<div className="aic-editorial-decision"><small>잠정 상품화 판단</small><h3>{decisionTitle}</h3><p>{detail.decisionStatus}. 다만 판단은 공개자료 기반 판단이며, 실제 보장 범위와 가입 가능 여부는 내부 사고·약관·계리 검증이 필요합니다.</p><div className="aic-editorial-checks"><div><b>우선 검토 담보</b><span>{narrative?.priorityCover || '직접 손해·방어비용·제한적 배상책임'}</span></div><div><b>핵심 인수조건</b><span>{narrative?.underwriting || '사전 점검·관리 로그·책임 증빙'}</span></div><div><b>추가 필요 자료</b><span>{narrative?.evidenceNeeded || '국내 사고 빈도·평균 손해액·집적 위험'}</span></div></div></div></div></div></section>

           <section className="aic-panel" id="aic-ledger"><PanelTitle number="10" title="활용 근거자료 원장" subtitle="화면의 모든 판단을 공식 원문으로 추적합니다." /><div className="aic-source-ledger">{uniquePolicySources.map((item) => <div key={item.id}><strong>{item.sourceName}</strong><span>{item.title}</span>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener">{item.sourceName} 원문 →</a> : <span>확인 필요</span>}</div>)}<p>본 화면은 공개자료를 연결해 위험 구조를 정리한 검토 화면입니다. 보험금·보험료·손해율·PML과 실제 상품 구조는 보험사 내부 데이터와 법무·계리 검증을 거쳐 별도로 검토해야 합니다.</p></div></section>
        </div>

        <aside className="aic-aside"><section className="aic-aside-card"><header><h3>이 위험을 읽는 순서</h3><p>원문을 보면서 아래 흐름으로 이해합니다.</p></header><div>{[['01', '어디서 위험이 발생하는가', narrative?.background || sourceFacts[0]], ['02', '어떤 손해로 확산되는가', narrative?.damage || detail.primaryLoss], ['03', '누가 책임질 수 있는가', narrative?.responsibility || detail.exposedParty], ['04', '기존 보험은 어디까지 가능한가', narrative?.insuranceBoundary || detail.decisionStatus]].map(([number, title, body]) => <div className="aic-aside-item" key={number}><span>{number}</span><strong>{title}</strong><p>{body}</p></div>)}</div></section><section className="aic-aside-card"><header><h3>연결된 공식 출처</h3><p>현재 화면에서 확인 가능한 자료입니다.</p></header><div>{researchSources.slice(0, 3).map((item, index) => <div className="aic-aside-item" key={item.title}><span className="label">{String(index + 1).padStart(2, '0')}</span><strong>{item.institution}</strong><p>{item.title}</p><a href={item.url} target="_blank" rel="noreferrer noopener">{item.institution} 원문 →</a></div>)}</div></section><Link className="aic-report-button" to={reportPath}>종합리포트 &gt;</Link></aside>
      </div>
    </main>
  )
}
