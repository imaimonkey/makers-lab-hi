import { useState } from 'react'
import { Link } from 'react-router-dom'
import './riskContextFlow.css'

type RiskContextFlowProps = {
  catalogPath: string
}

type Metric = {
  name: string
  level: string
  tone: 'high' | 'mid' | 'low'
  reason: string
  evidence: Array<{ title: string; body: string; url?: string }>
  missing: string[]
}

const journey = [
  ['1', '왜 등장했나', '산업·기술 변화와 배경'],
  ['2', '왜 보험으로 보나', '비용·책임·보장 공백'],
  ['3', '어떻게 발생하나', '사고·분쟁의 인과 흐름'],
  ['4', '누가 손해 보나', '손해 유형과 책임 주체'],
  ['5', '왜 평가하나', '스크리닝 지표와 원문 근거'],
  ['6', '무엇을 더 보나', '부족한 자료와 상품화 질문'],
]

const contextCards = [
  ['발생 배경', '기업의 생성형 AI 도입이 확대되며 학습·참조·변형·산출물 활용이 일반 업무에 들어오고 있습니다.'],
  ['핵심 메커니즘', '권리 미확인 데이터와 기존 저작물에 유사한 산출물이 상업적으로 사용되며 분쟁이 발생합니다.'],
  ['주요 피해', '손해배상, 소송·방어비용, 콘텐츠 삭제·재제작과 서비스 중단이 결합될 수 있습니다.'],
  ['영향 대상', 'AI 사업자, 도입기업, 임직원, 콘텐츠 제작사, 외주사와 원저작권자가 영향을 받습니다.'],
  ['상품화 쟁점', '고의·인지 가능 침해, 책임 분담, 방어비용과 배상책임의 범위를 구분해야 합니다.'],
]

const reasonCards = [
  ['분쟁이 법률비용과 배상책임으로 구체화될 수 있음', '생성형 AI 결과물의 저작권 침해 주장은 단순 삭제 요청에 그치지 않고, 법률자문·소송대리·합의·손해배상 등 실제 비용으로 이어질 수 있습니다.', '방어비용과 제3자 배상책임을 구분하여 담보 가능성을 검토할 수 있습니다.', '손해액 자체보다 분쟁이 어떤 비용 항목으로 전환되는지 구조화하는 것이 중요합니다.'],
  ['기존 보험의 보장 경계가 불명확함', '미디어배상책임, 전문직배상책임, 사이버보험 등에 일부 연결될 수 있지만 지식재산권 면책, 고의성, 계약상 책임 등에서 공백이 발생할 수 있습니다.', '신상품보다 기존 약관 개정 또는 특약 확장 가능성도 함께 검토해야 합니다.', '완전히 새로운 위험이라기보다 기존 담보 사이의 경계에서 발생하는 복합 보장 공백입니다.'],
  ['기업의 통제 수준에 따라 위험 차이가 큼', '데이터 출처 기록, 내부 승인, 법률검수, 유사도 점검, 외주계약의 권리보증 등 관리체계에 따라 분쟁 가능성이 달라질 수 있습니다.', '기업별 통제 수준을 인수조건과 자기부담금, 면책 기준에 반영할 여지가 있습니다.', '위험 자체뿐 아니라 관리 가능한 위험인지가 상품화 판단의 핵심입니다.'],
]

const metrics: Metric[] = [
  { name: '수요·시장 근거', level: '높음', tone: 'high', reason: '기업의 생성형 AI 활용 확대와 콘텐츠·광고·플랫폼 업종의 법률책임 우려가 증가하고 있습니다.', evidence: [{ title: '생성형 AI 저작권 안내서', body: 'AI 사업자·권리자·이용자별 위험과 주의사항을 공식적으로 정리합니다.', url: 'https://www.copyright.or.kr/information-materials/publication/research-report/view.do?brdctsno=52591' }, { title: '영업 현장 수요 신호', body: '광고·콘텐츠 제작 기업에서 AI 산출물의 법률비용과 배상책임 문의가 발생하는 시나리오입니다.' }], missing: ['실제 고객 문의 건수와 업종별 분포', '가입 의향 및 보험료 수용 수준', '기존 미디어배상책임 가입 기업 중 AI 활용 비중'] },
  { name: '손해 측정 가능성', level: '보통', tone: 'mid', reason: '법률비용과 재제작비는 구분 가능하지만 실제 국내 청구·합의·판결 손해자료가 아직 부족합니다.', evidence: [{ title: '측정 가능한 비용 항목', body: '법률자문, 소송대리, 기술감정, 합의, 콘텐츠 삭제·재제작 비용으로 구분할 수 있습니다.' }, { title: '분쟁 예방 안내서', body: '분쟁 유형과 사전 점검 항목을 통해 손해 발생 경로를 구조화할 수 있습니다.', url: 'https://www.copyright.or.kr/information-materials/publication/research-report/view.do?brdctsno=54252' }], missing: ['국내 사건별 방어비용·합의금 자료', '콘텐츠 재제작과 서비스 중단 비용', '보험 청구자료 및 평균 손해액'] },
  { name: '보험사고 성립성', level: '보통', tone: 'mid', reason: '침해 주장과 비용 발생은 확인 가능하지만, AI 산출물과 원저작물 간 인과관계 및 침해 성립 판단은 복잡합니다.', evidence: [{ title: '객관적으로 확인 가능한 요소', body: '권리자의 청구, 산출물 사용 시점, 삭제·소송·법률비용 발생 여부는 확인할 수 있습니다.' }, { title: 'AI 산출물 저작권성 기준', body: '인간의 창작적 기여 정도가 권리 판단의 핵심 요소로 제시됩니다.', url: 'https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf' }], missing: ['침해 성립을 보험사고로 정의할 기준', '법적 청구 시점과 최종 판결 시점의 구분', '고의·인지 가능 침해의 면책 기준'] },
  { name: '책임·법률 구조', level: '불확실', tone: 'low', reason: 'AI 사업자·도입기업·사용자·외주사 간 계약과 실제 활용 방식에 따라 책임이 달라질 수 있습니다.', evidence: [{ title: '다수 책임 주체', body: '학습 데이터 제공, 도구 제공, 프롬프트 입력, 산출물 검수와 상업적 사용 주체가 분리됩니다.' }, { title: '공정이용 안내 자료', body: '학습 목적, 이용 범위와 시장 영향 등 구체적 사정에 따라 판단이 달라질 수 있습니다.', url: 'https://www.copyright.or.kr/information-materials/publication/research-report/view.do?brdctsno=55211' }], missing: ['AI 서비스 이용약관의 면책·보상조항', '외주·납품 계약의 권리보증 조항', '국내 판례와 책임 분담 기준'] },
  { name: '인수·통제 가능성', level: '통제 가능', tone: 'high', reason: '출처 기록, 내부 승인, 유사도 점검, 법률검수와 계약 관리 여부로 기업별 위험을 구분할 수 있습니다.', evidence: [{ title: '통제 항목', body: '허용 도구 목록, 프롬프트·산출물 로그, 출처 기록, 승인 절차, 법률검수와 유사도 검사를 활용할 수 있습니다.' }, { title: '분쟁 예방 자료', body: '산출물 이용 전 확인과 기록 관리가 분쟁 예방에 중요하다는 방향을 제공합니다.', url: 'https://www.copyright.or.kr/information-materials/publication/research-report/view.do?brdctsno=54252' }], missing: ['통제 수준별 실제 사고 감소 효과', '업종별 최소 인수조건', '통제 미준수 시 면책·자기부담금 구조'] },
  { name: '손실 규모·집적위험', level: '자료 부족', tone: 'mid', reason: '개별 분쟁은 제한적일 수 있으나 동일 모델·콘텐츠를 다수 고객에게 사용하면 집단 청구와 동시 손해 가능성이 있습니다.', evidence: [{ title: '손해 확대 경로', body: '동일 산출물·캠페인·모델이 여러 국가와 고객에게 사용되면 소송·삭제·재제작 비용이 동시에 확대될 수 있습니다.' }], missing: ['1사고당 최대 손해 시나리오', '다수 고객·국가에 대한 누적노출', '재보험 가능성과 연간 총한도'] },
  { name: '데이터 신뢰도', level: '보통', tone: 'mid', reason: '공식 안내서와 해외 정책자료는 확보됐지만 실제 보험 손해자료와 국내 판례 축적은 제한적입니다.', evidence: [{ title: '공식 출처', body: '한국저작권위원회와 미국 저작권청의 정책·안내 자료를 사용합니다.' }, { title: '출처 추적성', body: '각 AI 판단에 원문 링크와 발행기관을 연결해 재검증할 수 있습니다.' }], missing: ['국내 판례와 실제 분쟁 사례', '보험사의 청구·손해 데이터', '자료별 최신성·적용 범위 검증'] },
  { name: '기존 상품 보장 공백', level: '공백 존재', tone: 'high', reason: '미디어·전문직·사이버보험에 일부 연결되지만 AI 학습·산출물·계약책임이 하나의 구조로 명확히 보장되지는 않습니다.', evidence: [{ title: '연결 가능 담보', body: '미디어배상책임, 전문직배상책임, 법률비용 담보와 일부 연결 가능합니다.' }, { title: '공백 가능 영역', body: '학습 데이터 책임, 고의성, 계약상 책임, 콘텐츠 재제작과 서비스 중단 손해의 보장 경계가 불명확합니다.' }], missing: ['실제 판매 약관의 지식재산권 면책', '기존 특약 개정으로 해결 가능한 범위', '신상품과 기존 상품 확장 중 적정 방식'] },
]

const damageRows = [
  ['저작권 침해 주장', '학습·복제·전송·2차적저작물 작성 또는 산출물 유사성을 근거로 침해가 주장될 수 있습니다.', '법률 분쟁'],
  ['소송·방어비용', '법률자문, 증거보전, 기술감정, 소송대리와 합의 협상 비용이 발생할 수 있습니다.', '비용 손해'],
  ['콘텐츠 삭제·재제작', '광고·디자인·문서·코드 사용이 중단되면 교체 제작과 캠페인 지연 비용이 발생할 수 있습니다.', '운영 손해'],
  ['계약상 배상책임', '외주·납품 콘텐츠가 제3자의 권리를 침해하면 보증·면책조항에 따른 책임이 연결될 수 있습니다.', '계약 책임'],
  ['평판·서비스 중단', '침해 논란으로 서비스가 중단되거나 고객·파트너 신뢰가 하락할 수 있습니다.', '간접 손해'],
]

const stakeholders = [
  ['AI 개발·서비스 사업자', '학습 데이터 확보 방식, 이용약관, 필터링과 보상조항이 핵심입니다.'],
  ['도입 기업', '도구 선정, 사내 정책, 검수·승인 절차와 상업적 활용에 대한 관리책임이 있습니다.'],
  ['임직원·실사용자', '외부 저작물 업로드, 프롬프트 입력과 무검수 산출물 사용이 사고 원인이 될 수 있습니다.'],
  ['콘텐츠·외주 제작사', '납품물의 권리 보증과 제3자 청구에 대한 계약상 책임이 연결됩니다.'],
  ['저작권자', '학습·복제·유사 산출물의 상업적 이용으로 권리가 침해됐다고 주장할 수 있습니다.'],
  ['플랫폼·유통 채널', '신고·삭제·서비스 약관에 따라 분쟁의 확산과 중단 범위가 달라질 수 있습니다.'],
]

const coverage = [
  ['미디어배상책임보험', '콘텐츠 제작·게시 과정의 저작권 침해 주장과 방어비용 보장 여부를 검토합니다.', '연결 가능'],
  ['전문직배상책임보험', '전문서비스 제공 과정의 과실과 제3자 손해가 포함되는지 업종별 약관 확인이 필요합니다.', '업종별 확인'],
  ['사이버보험', 'AI 활용 자체보다 데이터 유출·보안사고와 결합된 손해를 중심으로 연결될 수 있습니다.', '담보 경계 검토'],
  ['일반배상책임보험', '광고침해·지식재산권 관련 면책 또는 제한 조항이 있는지 확인해야 합니다.', '면책 확인'],
  ['법률비용 담보', '침해 주장에 대한 법률자문과 소송비용을 중심으로 별도 담보 구조를 검토할 수 있습니다.', '구조화 가능'],
]

const questions = [
  '학습 데이터 이용, 프롬프트 입력과 산출물 활용 중 어느 단계의 행위를 보험사고로 정의할 것인가?',
  '고의 또는 침해 가능성을 알면서 사용한 경우를 어떤 기준으로 면책할 것인가?',
  'AI 사업자, 도입기업, 임직원과 외주사의 책임을 어떤 계약·증빙으로 구분할 것인가?',
  '배상금, 방어비용, 콘텐츠 재제작비와 서비스 중단 손해 중 어디까지 보장할 것인가?',
  '사전 법률검토, 출처 기록, 승인 절차와 유사도 검사를 인수조건으로 활용할 수 있는가?',
]

function PanelHeading({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return <div className="rcf-panel-head"><span className="rcf-num">{number}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>
}

export function RiskContextFlow({ catalogPath }: RiskContextFlowProps) {
  const [openMetric, setOpenMetric] = useState(0)

  return (
    <div className="risk-context-flow">
      <div className="rcf-breadcrumb"><Link to={catalogPath}>위험 탐색</Link><span>〉</span><span>위험 상세</span><span>〉</span><strong>생성형 AI 저작권 책임</strong></div>
      <section className="rcf-hero">
        <article className="rcf-card rcf-hero-main"><div className="rcf-chips"><span>기업 위험</span><span className="green">원문 중심 분석</span><span className="gray">법률·책임 구조</span></div><h1>생성형 AI 저작권 책임</h1><p>기업이 생성형 AI를 학습·도입·활용하는 과정에서 저작물의 무단 이용, AI 산출물의 유사성, 저작권 귀속과 침해 책임이 복합적으로 발생할 수 있는 위험입니다.</p><div className="rcf-hero-note"><b>이 화면의 역할</b><span>예상 보험금이나 보험료를 산출하지 않고, 위험 발생 구조·손해 유형·책임 주체·기존 보험 연결 가능성과 원문 근거를 확인합니다.</span></div></article>
        <aside className="rcf-card rcf-hero-side"><small>위험 요약</small><h3>저작권·법률비용·기업책임</h3>{[['핵심 발생 구간','학습 데이터 · 프롬프트 · 산출물 활용'],['주요 손해 형태','방어비용 · 배상 · 재제작 · 서비스 중단'],['주요 책임 주체','AI 사업자 · 도입기업 · 사용자 · 외주사'],['핵심 불확실성','침해 판단 · 고의성 · 인간 창작 기여']].map(([label, value]) => <div className="rcf-summary-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</aside>
      </section>

      <section className="rcf-journey"><div className="rcf-journey-title"><strong>이 위험을 돌아보는 흐름</strong><span>배경 이해 → 보험 관점 → 사고 구조 → 근거 검증 → 상품화 질문</span></div><div className="rcf-journey-track">{journey.map(([number, title, caption], index) => <div className={`rcf-journey-step ${index === 0 ? 'active' : ''}`} key={number}><div className="jnum">{number}</div><b>{title}</b><span>{caption}</span></div>)}</div></section>
      <div className="rcf-layout"><main className="rcf-content-col">
        <section className="rcf-card rcf-panel" id="context"><PanelHeading number="01" title="이슈의 내용과 맥락" subtitle="상품화 판단 전 위험 자체를 이해하는 단계입니다." /><div className="rcf-context-grid">{contextCards.map(([title, body]) => <article className="rcf-context-card" key={title}><b>{title}</b><p>{body}</p></article>)}</div></section>
        <section className="rcf-card rcf-panel" id="why-insurance"><PanelHeading number="02" title="왜 보험 관점에서 주목해야 하나?" subtitle="단순한 법률 이슈가 아니라 보험 검토 가치가 있는 이유를 정리합니다." /><div className="rcf-reason-list">{reasonCards.map(([title, body, insurance, ai], index) => <article className="rcf-reason" key={title}><div className="rcf-reason-head"><div className="rcf-reason-index">{String(index + 1).padStart(2, '0')}</div><h3>{title}</h3></div><p>{body}</p><div className="rcf-reason-grid"><div className="insurance"><b>보험 관점의 의미</b>{insurance}</div><div className="ai"><b>AI 해석</b>{ai}</div></div></article>)}</div></section>
        <section className="rcf-card rcf-panel" id="mechanism"><PanelHeading number="03" title="위험 발생 구조" subtitle="업무 과정에서 저작권 분쟁으로 이어지는 흐름입니다." /><div className="rcf-flow-wrap"><div className="rcf-flow">{[['저작물 수집·학습','권리 확인이 불충분한 데이터'],['프롬프트·생성','외부 콘텐츠 입력·참조'],['산출물 유사성','기존 표현과의 중복 가능성'],['상업적 활용','광고·디자인·문서·코드 납품'],['침해 주장·분쟁','삭제·배상·소송·계약 책임']].map(([title, body]) => <div className="rcf-step" key={title}><strong>{title}</strong><span>{body}</span></div>)}</div><div className="rcf-callout">동일한 AI 도구를 사용하더라도 데이터 출처, 사용 목적, 인간의 편집·창작 기여, 산출물 검수 여부와 실제 활용 방식에 따라 위험 수준이 달라집니다.</div></div></section>
        <section className="rcf-card rcf-panel" id="damage"><PanelHeading number="04" title="손해와 비용의 확산 경로" subtitle="예상 보험금이 아니라 발생 가능한 손해 유형을 구분합니다." /><div className="rcf-damage-list">{damageRows.map(([title, body, tag]) => <div className="rcf-damage-row" key={title}><strong>{title}</strong><p>{body}</p><span>{tag}</span></div>)}</div><div className="rcf-note">금액 표시 원칙: 공개된 판결·합의·실제 비용이 확인되는 경우에만 근거와 함께 표시하며, 예상 보험료·PML은 종합 리포트에서 별도 검토합니다.</div></section>
        <section className="rcf-card rcf-panel" id="stakeholders"><PanelHeading number="05" title="영향 대상과 책임 관계" subtitle="누가 위험을 만들고 이용하며 손해를 부담할 수 있는지 구분합니다." /><div className="rcf-stake-grid">{stakeholders.map(([title, body]) => <article className="rcf-stake-card" key={title}><b>{title}</b><p>{body}</p></article>)}</div></section>
        <section className="rcf-card rcf-panel" id="coverage"><PanelHeading number="06" title="기존 보험·약관과의 연결" subtitle="현재 어떤 담보가 일부 손해와 연결될 수 있는지 확인합니다." /><div className="rcf-coverage-list">{coverage.map(([title, body, tag]) => <div className="rcf-coverage-row" key={title}><strong>{title}</strong><p>{body}</p><span>{tag}</span></div>)}</div></section>
        <section className="rcf-card rcf-panel" id="metrics"><PanelHeading number="07" title="위험 탐색 평가항목별 상세 근거" subtitle="위험 탐색에서 본 평가 결과를 실제 데이터·원문·미확인 사항과 연결합니다." /><div className="rcf-intro"><b>읽는 방법:</b> 각 평가항목을 선택하면 판단 이유, 활용한 공식 자료와 원문 링크, 아직 부족한 자료를 함께 확인할 수 있습니다. 점수를 다시 보여주는 것이 아니라 “왜 이런 평가가 나왔는지”를 검증하는 영역입니다.</div><div className="rcf-metric-evidence">{metrics.map((metric, index) => { const isOpen = openMetric === index; return <article className={`rcf-metric-card ${isOpen ? 'open' : ''}`} key={metric.name}><button type="button" className="rcf-metric-summary" onClick={() => setOpenMetric(isOpen ? -1 : index)} aria-expanded={isOpen}><strong className="metric-name">{metric.name}</strong><span className={`metric-level ${metric.tone}`}>{metric.level}</span><span className="metric-reason">{metric.reason}</span><span className="metric-toggle">{isOpen ? '접기 ▴' : '근거 보기 ▾'}</span></button>{isOpen && <div className="rcf-metric-detail"><div className="rcf-metric-detail-grid"><div className="rcf-evidence-box"><h4>확인된 근거</h4><div className="rcf-evidence-list">{metric.evidence.map((item) => <div className="rcf-evidence-item" key={item.title}><b>{item.title}</b><p>{item.body}</p>{item.url && <a href={item.url} target="_blank" rel="noreferrer noopener">원문 확인 ↗</a>}</div>)}</div></div><div className="rcf-missing-box"><h4>추가 확인 필요</h4><ul>{metric.missing.map((item) => <li key={item}>{item}</li>)}</ul></div></div></div>}</article>})}</div><div className="rcf-bridge"><b>다음 흐름:</b> 평가항목별 근거를 확인한 뒤 아래에서 AI가 왜 이 위험을 별도 검토 대상으로 판단했는지 종합적으로 연결합니다.</div></section>
        <section className="rcf-card rcf-panel" id="evidence"><PanelHeading number="08" title="AI는 왜 이 위험을 별도 위험으로 판단했나?" subtitle="각 판단이 어떤 공식 자료에 기반하는지 추적합니다." /><div className="rcf-intro"><b>이 섹션의 핵심:</b> AI가 단순히 “위험하다”고 평가한 것이 아니라, 어떤 판단을 했고 어떤 공식 자료가 이를 뒷받침하며 그 자료가 보험 검토에 어떤 의미를 갖는지 연결합니다.</div><div className="rcf-evidence-map">{[['위험은 산출물뿐 아니라 전 과정에서 발생','학습 데이터 수집, 도구 운영, 사용자의 입력과 상업적 활용을 분리해 검토해야 합니다.','생성형 AI 저작권 안내서','https://www.copyright.or.kr/information-materials/publication/research-report/view.do?brdctsno=52591'],['사전 검수와 출처 기록이 핵심 통제 수단','유사도 확인, 내부 승인과 출처 기록 여부가 분쟁 예방과 인수조건 설계에 중요합니다.','생성형 AI 결과물 저작권 분쟁 예방 안내서','https://www.copyright.or.kr/information-materials/publication/research-report/view.do?brdctsno=54252'],['인간의 창작적 기여 정도가 권리 판단에 중요','AI를 사용했다는 사실보다 인간이 표현을 선택·배열·수정한 정도가 핵심입니다.','Copyright and AI, Part 2','https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf']].map(([title, body, source, url], index) => <div className="rcf-evidence-row" key={title}><div className="rcf-judgment"><small>AI 판단 {String(index + 1).padStart(2, '0')}</small><b>{title}</b><p>{body}</p></div><div className="rcf-connector">→</div><div className="rcf-source"><span>공식 자료</span><h4>{source}</h4><p>판단 근거와 저작권 쟁점을 정리한 원문 자료입니다.</p><a href={url} target="_blank" rel="noreferrer noopener">원문 확인 ↗</a></div></div>)}</div><div className="rcf-final-judgment">생성형 AI 저작권 위험은 법률 분쟁 가능성, 기존 담보의 불명확한 경계, 기업별 통제 수준 차이가 동시에 존재하기 때문에 별도 검토 가치가 있는 신규 위험으로 판단했습니다. 다만 실제 상품화 여부는 국내 손해사례, 청구자료, 기존 약관의 지식재산권 면책과 법무 검토를 추가로 거쳐야 합니다.</div></section>
        <section className="rcf-card rcf-panel" id="questions"><PanelHeading number="09" title="종합 리포트로 넘길 상품화 질문" subtitle="위험 상세에서는 결론 대신 검토 질문을 구조화합니다." /><div className="rcf-questions">{questions.map((question, index) => <div className="rcf-question" key={question}><span>{String(index + 1).padStart(2, '0')}</span><p>{question}</p></div>)}</div></section>
      </main>
      <aside className="rcf-aside"><section className="rcf-card rcf-aside-card rcf-readiness"><div className="rcf-aside-head"><h3>상품화 검토 준비도</h3><p>정확한 요율 산출이 아닌 검토 근거의 준비 상태입니다.</p></div><div className="rcf-readiness-top"><b>근거 준비도</b><span>64%</span></div><div className="rcf-progress"><i /></div><p>공식 안내서와 책임 구조는 확인됐지만, 실제 국내 손해사례·청구자료와 기존 약관 비교가 추가로 필요합니다.</p></section><section className="rcf-card rcf-aside-card"><div className="rcf-aside-head"><h3>현재 확인된 내용</h3></div><div className="rcf-aside-list">{[['수요 신호','광고·콘텐츠·플랫폼 기업의 AI 활용 확대로 법률비용과 책임 우려가 증가하고 있습니다.'],['사고 정의','학습·입력·산출물 활용 단계별 책임과 침해 성립 조건을 분리해야 합니다.'],['기존 담보','미디어배상책임과 전문직배상책임에 일부 연결될 수 있으나 면책 검토가 필요합니다.']].map(([title, body]) => <div className="rcf-aside-item" key={title}><b>{title}</b><span>{body}</span></div>)}</div></section><section className="rcf-card rcf-aside-card"><div className="rcf-aside-head"><h3>추가 확인 필요</h3></div><div className="rcf-aside-list">{[['실제 손해·청구자료','국내 법률비용, 합의·배상, 콘텐츠 재제작 비용 사례가 부족합니다.'],['약관 비교','지식재산권 면책과 AI 사용 관련 고지·인수조건을 확인해야 합니다.'],['책임 분담','AI 사업자, 도입기업, 사용자와 외주사의 계약상 책임 관계를 검토해야 합니다.']].map(([title, body]) => <div className="rcf-aside-item" key={title}><b>{title}</b><span>{body}</span></div>)}</div></section><section className="rcf-card rcf-aside-card"><div className="rcf-aside-head"><h3>수치 사용 원칙</h3></div><div className="rcf-aside-list">{[['위험 상세에서 제공','공식 원문, 실제 사건, 책임 구조, 손해 유형과 추가 검토사항'],['종합 리포트에서 참고','러프한 보험료 범위, 유사 상품 비교와 시나리오 기반 손해 수준'],['AI가 대체하지 않음','공식 위험률, 연간 손해율, 최종 보험료와 요율 산출']].map(([title, body]) => <div className="rcf-aside-item" key={title}><b>{title}</b><span>{body}</span></div>)}</div><div className="rcf-actions"><Link className="primary" to={`${catalogPath.replace('/risks', '')}/reports`}>종합 리포트</Link><a className="ghost" href="#evidence">원문 모아보기</a></div></section></aside></div>
    </div>
  )
}
