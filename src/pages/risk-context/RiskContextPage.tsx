import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'
import { resolveSampleRiskId, sampleRiskCandidates, sampleRiskDetails } from '../../domain/risk/sampleData'

const essSources = [
  {
    institution: '산업통상자원부·소방청',
    title: 'ESS 화재사고 원인조사 및 종합안전관리대책',
    url: 'https://www.nfa.go.kr/nfa/news/pressrelease/press/?cntId=525&mode=view&pageIdx=1&searchCondition=all',
    fact: '23개 사고현장을 조사했고, 14건은 충전 완료 후 대기 중, 6건은 충·방전 중 발생한 것으로 발표했습니다.',
  },
  {
    institution: '산업통상자원부',
    title: 'UPS 시설 안전관리 대응방안 및 관련 기준 안내',
    url: 'https://www.motie.go.kr/search/search.do?category=c1&currentPage=1&date=&detailSearch=&end-date=&fdContent=&fdFile=&fdNotice=&fdTitle=&fdTot=&kwd=%EC%97%90%EB%84%88%EC%A7%80&ppkFlag=weekly&preCondi=&reSrchFlag=&rowPerPage=10&searchOptionAnd=&searchOptionOr=&searchRange=fdTot&site=main&sort=d&srchFd=&start-date=',
    fact: 'UPS는 용량·설치 장소·이격거리·내화구조·자동 차단·충전율 등 설치·운영 조건을 함께 확인해야 하는 설비입니다.',
  },
]

export function RiskContextPage() {
  const { riskId } = useParams()
  const resolvedId = resolveSampleRiskId(riskId) ?? 'ess-ups-battery-fire'
  const risk = sampleRiskCandidates.find((item) => item.id === resolvedId) ?? sampleRiskCandidates[0]
  const detail = sampleRiskDetails[resolvedId] ?? sampleRiskDetails[risk.id]
  const isEss = resolvedId === 'ess-ups-battery-fire'

  return (
    <div className="page risk-context-page sh-visual">
      <PageHeader step="03-A" eyebrow="위험 배경 브리핑" title="왜 이 위험을 검토해야 하나" description="근거자료를 하나씩 읽기 전에, 사건의 구조와 보험 검토 포인트를 먼저 이해할 수 있도록 정리한 AI 브리핑입니다." status="AI CONTEXT BRIEF" updatedAt="공식자료 기준 · 2026.07" />
      <div className="context-toolbar"><Link to={`/risks/${risk.id}`}>← 위험 상세로 돌아가기</Link><span>자료 2건 · 담당자 확인 필요</span></div>

      <section className="context-hero surface-card">
        <div><p className="eyebrow">RISK CONTEXT / {risk.themeLabel}</p><h2>{risk.title}</h2><p className="context-lead">{isEss ? 'ESS·UPS 배터리 화재는 배터리 한 개의 손상으로 끝나는 위험이 아니라, 화재 진압·설비 교체·서비스 중단이 동시에 발생할 수 있는 복합 손해 위험입니다.' : detail.riskStatement}</p></div>
        <div className="context-verdict"><span>AI 1차 해석</span><strong>우선 확인 필요</strong><p>위험 신호는 확인됐지만, 사고 빈도와 손해액은 원문·국내 사례를 대조한 뒤 판단해야 합니다.</p></div>
      </section>

      <section className="context-grid">
        <article className="surface-card context-story"><p className="eyebrow">01 · 위험 배경</p><h3>무슨 변화가 위험을 만들었나</h3><p>{isEss ? '데이터센터와 제조시설은 전원 안정성을 위해 ESS·UPS에 의존합니다. 이 설비는 전기에너지를 저장하고 있어 이상 상태가 발생하면 설비 자체 손해뿐 아니라 정전, 생산·서비스 중단, 주변 설비 손해로 피해가 확대될 수 있습니다.' : '관련 자료에서 확인된 변화가 기존 위험과 다른 노출과 손해를 만들 수 있는지 구조화했습니다.'}</p><div className="context-flow"><span>전기 저장·충전</span><b>→</b><span>이상 징후·열폭주</span><b>→</b><span>화재·정전</span><b>→</b><span>복구·영업중단</span></div></article>
        <article className="surface-card context-story"><p className="eyebrow">02 · 왜 보험 위험인가</p><h3>손해가 한 항목에 그치지 않음</h3><ul className="context-bullets"><li><strong>재물손해</strong><span>배터리 랙·전력변환장치·실내 설비 손상</span></li><li><strong>영업중단</strong><span>정전과 복구 기간에 따른 서비스·생산 중단</span></li><li><strong>책임손해</strong><span>시설 운영자·시공사·제조사 간 책임 분쟁</span></li></ul></article>
      </section>

      <section className="context-section surface-card"><div className="context-section-heading"><div><p className="eyebrow">03 · 자료를 읽은 결과</p><h3>실무자가 먼저 이해해야 할 판단 맥락</h3></div><span>AI가 자료의 사실·해석·확인 필요를 분리</span></div><div className="context-evidence-grid"><article><span className="context-label is-fact">자료에서 확인된 사실</span><strong>사고는 충전 중에만 발생하지 않았습니다.</strong><p>공식 조사자료는 충전 완료 후 대기 중 사고와 충·방전 중 사고를 구분해 제시합니다. 따라서 인수 검토는 충전기 사양만이 아니라 보관·대기 상태, 운영환경, 보호체계까지 포함해야 합니다.</p></article><article><span className="context-label is-meaning">보험 관점의 의미</span><strong>설비 위험과 운영중단 위험을 함께 봐야 합니다.</strong><p>화재 한 건의 손해액만 보면 위험을 과소평가할 수 있습니다. 데이터센터·공장에서는 복구기간, 대체전원, 생산·서비스 중단, 주변 설비 손해를 손해 항목별로 분리해 확인해야 합니다.</p></article><article><span className="context-label is-check">추가 확인이 필요한 내용</span><strong>시설별 위험도와 손해액은 아직 동일하지 않습니다.</strong><p>배터리 종류·용량, 설치 위치, 랙 간 이격, BMS 경보 이력, 소방·차단 설비, 실제 복구기간을 확보해야 개별 계약의 인수 조건과 보장 한도를 검토할 수 있습니다.</p></article></div></section>

      <section className="context-section surface-card"><div className="context-section-heading"><div><p className="eyebrow">04 · 보험 실무 검토</p><h3>상품개발·인수 담당자가 확인할 질문</h3></div></div><div className="context-checklist"><div><span>01</span><strong>무엇을 보장할 것인가</strong><p>배터리 자체 손해, 주변 설비 손해, 화재 진압 비용, 영업중단 손해를 하나의 담보로 볼지 구분할지.</p></div><div><span>02</span><strong>누가 책임지는가</strong><p>시설 소유자·운영자·시공사·제조사 사이의 유지관리 의무와 구상 가능성을 어떻게 정의할지.</p></div><div><span>03</span><strong>어떤 조건에서 인수할 것인가</strong><p>BMS·소방·정기검사·충전율·이격거리·점검 이력 등 객관적인 인수 조건과 면책 기준을 어떻게 둘지.</p></div><div><span>04</span><strong>누적 손해를 어떻게 관리할 것인가</strong><p>동일 시설·동일 사업장·공급망에 동시에 발생하는 재물·중단 손해의 누적한도와 재보험 검토가 필요한지.</p></div></div></section>

      <section className="context-section surface-card"><div className="context-section-heading"><div><p className="eyebrow">05 · 원문 근거</p><h3>AI가 읽고 요약한 공식 자료</h3></div><span>링크를 열어 원문 직접 확인</span></div><div className="context-source-list">{(isEss ? essSources : essSources.slice(0, 1)).map((source) => <article key={source.title}><div><span>{source.institution}</span><strong>{source.title}</strong><p>{source.fact}</p></div><a href={source.url} target="_blank" rel="noreferrer noopener">원문 보기 ↗</a></article>)}</div><p className="context-disclaimer">이 페이지는 공개 자료를 바탕으로 한 1차 맥락화 결과입니다. AI 요약은 상품화·인수 결정을 대신하지 않으며, 최종 판단 전 원문과 내부 기준 확인이 필요합니다.</p></section>
    </div>
  )
}
