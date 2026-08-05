import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './generativeAiCopyrightDetail.css'

type Paper = {
  title: string
  source: string
  abstract: string
  finding: string
  insurance: string
  url: string
}

const papers: Paper[] = [
  {
    title: '생성형 AI 저작권 안내서',
    source: '한국저작권위원회 · 2023',
    abstract: 'AI 사업자·권리자·이용자 관점의 저작권 쟁점을 정리한 국내 기준 자료입니다.',
    finding: '학습 데이터, 산출물 이용과 인간의 창작적 기여를 분리해 검토해야 합니다.',
    insurance: '학습·생성·상업적 활용 단계별로 사고 정의와 면책 기준을 나눌 필요가 있습니다.',
    url: 'https://www.copyright.or.kr/information-materials/publication/research-report/view.do?brdctsno=52591',
  },
  {
    title: '생성형 AI 결과물에 의한 저작권 분쟁 예방 안내서',
    source: '한국저작권위원회 · 2025',
    abstract: '산출물 이용 전 확인해야 할 침해 가능성과 분쟁 예방 원칙을 다룹니다.',
    finding: '출처 확인, 유사성 검토와 이용 목적 기록이 분쟁 대응의 핵심 자료가 됩니다.',
    insurance: '사전 검수·승인 절차와 로그 보유 수준을 인수조건 또는 보장요건으로 검토할 수 있습니다.',
    url: 'https://www.copyright.or.kr/information-materials/publication/research-report/view.do?brdctsno=54252',
  },
  {
    title: '생성형 AI 활용 저작물의 저작권 등록 안내서',
    source: '한국저작권위원회 · 2025',
    abstract: 'AI를 활용한 저작물의 등록 가능성과 인간 창작자의 기여를 설명합니다.',
    finding: 'AI의 기여와 인간의 선택·수정·배열을 구분해 기록해야 합니다.',
    insurance: '권리 귀속과 계약상 보증책임을 구분하면 방어비용과 배상책임의 범위를 설계하기 쉬워집니다.',
    url: 'https://www.copyright.or.kr/information-materials/publication/research-report/view.do?brdctsno=54253',
  },
  {
    title: '생성형 AI 학습과 저작권법상 공정이용 안내서',
    source: '한국저작권위원회 · 2026',
    abstract: '학습 데이터 이용의 침해 가능성과 공정이용 판단 구조를 설명합니다.',
    finding: '학습 목적, 이용 범위와 잠재적 라이선스 시장 영향을 함께 봐야 합니다.',
    insurance: '학습 데이터의 출처·라이선스 기록과 법률 검토 여부를 사고 조사 자료로 활용할 수 있습니다.',
    url: 'https://www.copyright.or.kr/information-materials/publication/research-report/view.do?brdctsno=55211',
  },
  {
    title: 'Copyright and AI, Part 2: Copyrightability',
    source: 'U.S. Copyright Office · 2025',
    abstract: 'AI 산출물의 저작권 보호 가능성과 인간 저작자의 창작적 기여를 다룹니다.',
    finding: '해외 기준은 국내 책임이나 보험금 지급을 확정하지 않으므로 비교자료로만 사용해야 합니다.',
    insurance: '관할·법률·약관의 차이를 분리해 해외 분쟁 자료를 국내 보장 판단에 직접 대입하지 않아야 합니다.',
    url: 'https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf',
  },
]

const lossRows = [
  ['저작권 침해 주장', '권리자가 학습·복제·전송·2차적저작물 작성 또는 산출물 유사성을 근거로 침해를 주장할 수 있습니다.', '법률 분쟁', '공식 안내서 확인'],
  ['소송·방어비용', '법률자문, 증거보전, 기술감정, 소송대리와 합의 협상 비용이 발생할 수 있습니다.', '비용 손해', '계약·청구자료 확인'],
  ['콘텐츠 삭제·재제작', '광고·디자인·문서·코드가 침해 우려로 중단되면 교체 제작과 캠페인 지연 비용이 발생할 수 있습니다.', '운영 손해', '내부 업무자료 확인'],
  ['계약상 배상책임', '외주 제작물이나 납품 콘텐츠가 제3자 권리를 침해하면 보증·면책조항에 따른 배상책임이 발생할 수 있습니다.', '계약 책임', '계약서·약관 확인'],
  ['평판·서비스 중단', '침해 논란으로 서비스가 중단되거나 고객·파트너 신뢰가 하락할 수 있습니다.', '간접 손해', '공개자료만으로 산정 제한'],
]

const sources = [
  ['국내 안내서', '생성형 AI 기술과 저작권, 사업자·권리자·이용자별 주의사항', papers[0].url],
  ['분쟁 예방', '생성형 AI 결과물 이용에 따른 저작권 분쟁 예방 안내', papers[1].url],
  ['등록 기준', '생성형 AI 활용 저작물의 저작권 등록 가능성과 인간 창작 기여', papers[2].url],
  ['학습·공정이용', '저작물 학습 단계의 침해 가능성과 공정이용 판단 구조', papers[3].url],
  ['해외 보고서', 'AI 산출물의 저작권 보호 가능성과 인간 저작자의 창작적 기여', papers[4].url],
]

const deepAnalysisSections = [
  { number: '01', title: '위험은 산출물이 아니라 전 과정에서 만들어진다', paragraphs: ['생성형 AI 모델은 대규모 데이터를 학습하고 사용자의 지시에 따라 텍스트·이미지·음원·영상·코드 등의 결과물을 생성합니다. 이 과정에서 저작권 위험은 학습 단계와 이용 단계로 나뉩니다. 학습 단계에서는 저작권자의 허락 없이 저작물이 수집·복제됐는지가, 이용 단계에서는 외부 저작물이 프롬프트에 입력됐는지와 산출물이 기존 저작물과 실질적으로 유사한지가 문제가 됩니다.'], quote: '“copyright-protected training data”', cite: 'Swiss Re Institute, AI and the insurance risk landscape', linkLabel: '원문 보기 ↗', link: 'https://www.swissre.com/risk-knowledge/advancing-societal-benefits-digitalisation/ai-brings-major-change-to-insurance.html', meaningLabel: '보험적 의미', meaning: '이 위험은 콘텐츠 침해 한 건만 보는 것이 아니라 학습·입력·생성·검수·활용 단계별 책임과 손해를 분리해 보장 구조를 설계해야 하는 복합 책임 위험입니다.' },
  { number: '02', title: '현재 법률 환경은 명확한 결론보다 사건별 판단이 축적되는 단계다', paragraphs: ['생성형 AI 학습과 저작권의 관계는 아직 하나의 기준으로 정리되지 않았습니다. 공정이용 여부는 이용 목적, 저작물의 성격, 이용량, 시장에 미치는 영향 등 사건별 사정을 종합해 판단됩니다. 같은 저작물을 사용했더라도 어떤 목적으로 어떻게 활용했는지에 따라 법적 결론이 달라질 수 있습니다.'], quote: '“Dozens of lawsuits are pending.”', cite: 'U.S. Copyright Office, Copyright and Artificial Intelligence, Part 3', linkLabel: '원문 PDF ↗', link: 'https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-3-Generative-AI-Training-Report-Pre-Publication-Version.pdf', meaningLabel: '보험적 의미', meaning: '책임 확정 전에도 분쟁 대응비용이 발생하므로 최종 침해 확정에 따른 배상책임과 침해 주장에 대한 방어비용을 별도 담보로 구분할 필요가 있습니다.' },
  { number: '03', title: '책임이 확정되기 전부터 손해는 발생한다', paragraphs: ['기업이 AI로 제작한 광고·디자인·코드·문서를 상업적으로 사용한 뒤 저작권자의 경고장을 받으면, 최종 판결 전에도 법률자문, 증거보전, 기술감정과 콘텐츠 삭제·재제작 비용이 발생합니다. 서비스 중단과 납품 지연이 결합되면 운영손해와 계약상 책임으로도 확산될 수 있습니다.', '보험상품의 필요성은 침해가 확정됐기 때문에만 생기는 것이 아닙니다. 법적 결론이 나오기 전에 현실화되는 비용이 존재한다는 점에서 법률비용과 사고 대응비용은 초기 담보 후보가 될 수 있습니다.'] },
  { number: '04', title: 'AI 산출물의 권리와 책임은 인간의 개입 정도에 따라 달라진다', paragraphs: ['기업이 만든 AI 산출물이 저작권 보호를 받을 수 있는지도 중요한 문제입니다. 단순히 프롬프트를 입력했다는 사실보다 사람이 결과물을 선택·배열·수정하고 창작적 표현을 결정한 정도가 핵심 기준으로 제시됩니다. 따라서 기업의 편집·검수·승인 과정은 권리관계뿐 아니라 보험 인수정보로도 활용될 수 있습니다.'], quote: '“the Copyright Act itself requires human authorship”', cite: 'U.S. Court of Appeals decision, human authorship requirement', linkLabel: '판결문 보기 ↗', link: 'https://www.copyright.gov/ai/docs/court-of-appeals-decision-affirming-refusal-of-registration.pdf', meaningLabel: '보험적 의미', meaning: '허용 모델 목록, 프롬프트·산출물 로그, 인간 편집 기록, 법률검수와 최종 승인 절차를 기업별 위험을 구분하는 인수조건으로 활용할 수 있습니다.' },
  { number: '05', title: '국내 규제는 AI 활용 사실의 표시와 고지를 요구하기 시작했다', paragraphs: ['국내 제도 역시 기업의 AI 활용을 기록하고 고지하는 방향으로 이동하고 있습니다. 생성형 AI 결과물 표시 의무는 저작권 침해 책임을 직접 정하는 조항은 아니지만, 어떤 결과물이 AI로 생성됐고 누가 어떤 절차로 사용했는지를 추적하는 관리체계를 요구한다는 점에서 의미가 있습니다.'], quote: '“생성형 인공지능에 의하여 생성되었다는 사실을 표시하여야 한다.”', cite: '인공지능기본법 제31조', linkLabel: '법령 원문 ↗', link: 'https://www.law.go.kr/lsInfoP.do?lsId=014820', meaningLabel: '보험적 의미', meaning: '표시·고지·로그 관리가 부실한 기업은 사고 원인과 책임관계를 입증하기 어렵습니다. 따라서 준수 여부를 인수심사의 기본 통제항목으로 볼 수 있습니다.' },
  { number: '06', title: '기존 보험으로 보장할 수 있는가', paragraphs: ['생성형 AI 저작권 책임은 완전히 새로운 손해만을 만드는 것은 아닙니다. 미디어배상책임보험, 전문직배상책임보험, 사이버보험과 법률비용 담보에 일부 연결될 수 있습니다. 다만 지식재산권 면책, 고의행위, 계약상 책임, 사전 인지 청구와 같은 조항 때문에 실제 보장 여부는 불명확할 수 있습니다.', '따라서 신규상품 개발에 앞서 확인해야 할 질문은 새 상품을 만들 것인가가 아니라 기존 보험은 어디까지 보장하며 어느 지점부터 명확한 공백이 발생하는가입니다.'], meaningLabel: '검토 방향', meaning: '기존 미디어·전문직·사이버 약관의 지식재산권 관련 담보와 면책을 실제 판매 약관 기준으로 비교한 뒤, 특약 확장과 독립상품 중 적절한 방식을 판단해야 합니다.' },
  { number: '07', title: '상품화에 유리한 요소와 불리한 요소', paragraphs: ['상품화에 유리한 요소는 제3자의 침해 주장, 소송 제기, 변호사 비용, 감정비용, 합의와 판결처럼 사고와 비용을 객관적인 자료로 확인할 수 있다는 점입니다. 또한 기업별로 출처 기록, 유사도 검사, 법률검수, 승인 절차와 외주계약의 권리보증 수준을 구분할 수 있습니다.', '반면 국내 사고 빈도와 평균 손해액이 충분히 축적되지 않았고, 법률 기준도 빠르게 변하고 있습니다. 동일한 AI 모델과 플랫폼을 다수 기업이 사용하는 구조는 하나의 사건이 여러 계약의 청구로 확대되는 집적위험을 만들 수 있습니다.'], quote: '“인수 가능성이 높은 위험부터 선별하여 시범적으로 보험상품을 도입하는 단계적 접근이 필요”', cite: '보험연구원, 「생성형 AI 위험과 보험산업」', linkLabel: '원문 PDF ↗', link: 'https://www.kiri.or.kr/report/downloadFile.do?docId=793789' },
  { number: '08', title: '어떤 형태의 상품이 현실적인가', paragraphs: ['현재 단계에서는 생성형 AI 저작권 책임 전체를 넓게 보장하는 독립상품보다, 기존 미디어·전문직배상책임보험에 제한된 특약을 추가하거나 법률방어비용 중심의 시범상품을 운영하는 방식이 현실적입니다.', '초기 담보는 제3자의 저작권 침해 청구에 대한 사전 승인 법률비용과, 합의 또는 판결로 확정된 제한적 손해배상금으로 구성할 수 있습니다. 고의적 복제, 권리자의 경고 이후 계속 사용, 출처 불명 자료의 무단 입력과 이미 인지한 분쟁은 면책 대상으로 검토할 수 있습니다.'] },
]

function citationSourceLabel(citation: string, fallback: string) {
  if (citation.includes('Swiss Re')) return 'Swiss Re Institute 원문 →'
  if (citation.includes('U.S. Copyright Office')) return 'U.S. Copyright Office 원문 →'
  if (citation.includes('U.S. Court')) return 'U.S. Court of Appeals 원문 →'
  if (citation.includes('인공지능기본법')) return '법제처 원문 →'
  if (citation.includes('보험연구원')) return '보험연구원 원문 PDF →'
  return fallback
}

function sourceLedgerLabel(type: string, url: string) {
  if (url.includes('copyright.or.kr')) return '한국저작권위원회 원문 →'
  if (url.includes('copyright.gov')) return 'U.S. Copyright Office 원문 →'
  return `${type} 원문 →`
}

export function GenerativeAiCopyrightDetail() {
  return (
    <main className="ai-copyright-detail">
      <section className="aic-hero">
        <div className="aic-hero-main">
          <div className="aic-chips"><span>기업 위험</span><span className="green">원문 중심 분석</span><span className="gray">법률·책임 구조 이해</span></div>
          <h1>생성형 AI 저작권 위험</h1>
          <p>기업이 생성형 AI를 학습·도입·활용하는 과정에서 저작물의 무단 이용, AI 산출물의 유사성, 저작권 귀속과 침해 책임이 복합적으로 발생하는 위험입니다.</p>
          <div className="aic-definition"><b>위험 상세의 목적</b><p>이 화면은 예상 보험금이나 보험료를 산출하지 않습니다. 원문 안내서·공식 보고서·정책자료를 연결해 위험이 어디에서 발생하고, 어떤 주체가 어떤 책임에 노출되는지를 이해하는 데 초점을 둡니다.</p></div>
        </div>
        <aside className="aic-hero-summary"><small>위험 요약</small><h3>저작권·법률비용·기업책임</h3>
          {[
            ['핵심 발생 구간', '학습 데이터 · 프롬프트 · 산출물 활용'],
            ['주요 손해 형태', '소송·방어비용 · 사용중단 · 재제작'],
            ['책임 주체', 'AI 사업자 · 도입기업 · 사용자 · 권리자'],
            ['핵심 불확실성', '침해 판단 · 인간 창작 기여 · 공정이용'],
          ].map(([label, value]) => <div className="aic-summary-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </aside>
      </section>

      <section className="aic-fact-grid">
        {[
          ['국내 기준 자료', '생성형 AI 저작권 안내서', 'AI 사업자·권리자·이용자 관점의 저작권 쟁점을 정리합니다.', '한국저작권위원회'],
          ['분쟁 예방 자료', 'AI 결과물 저작권 분쟁 예방', '산출물 이용 전 점검해야 할 침해 가능성과 대응 원칙을 다룹니다.', '한국저작권위원회'],
          ['학습 단계 쟁점', '저작물 학습과 공정이용', '학습 데이터 이용의 침해 가능성과 공정이용 판단 구조를 설명합니다.', '2026 공식 안내서'],
          ['해외 기준 자료', 'AI 산출물의 저작권성', '인간 저작자의 창작적 기여가 보호 가능성 판단의 핵심입니다.', 'U.S. Copyright Office'],
        ].map(([label, title, body, source]) => <article className="aic-fact" key={title}><small>{label}</small><strong>{title}</strong><p>{body}</p><span>{source}</span></article>)}
      </section>

      <nav className="aic-section-nav">
        {['이슈 맥락', '보험 관점', '위험 구조', '손해 경로', '책임 주체', '기존 보험 연결', '정책·공식 자료', '상품화 질문', '위험 심층 해설', '근거 원장'].map((label, index) => <a href={`#aic-${['context', 'why-insurance', 'mechanism', 'damage', 'stakeholders', 'coverage', 'policy', 'questions', 'deep-analysis', 'ledger'][index]}`} key={label}>{label}</a>)}
      </nav>

      <div className="aic-layout">
        <div className="aic-content">
          <section className="aic-panel" id="aic-context"><PanelTitle number="01" title="해당 이슈의 내용과 맥락" subtitle="상품화 판단 전 위험 자체를 이해하는 단계입니다." />
            <div className="aic-context-grid">
              {[
                ['발생 배경', '기업의 생성형 AI 도입이 확대되면서 외부 저작물의 학습·참조·변형과 산출물 활용이 일상적인 업무 과정에 들어오고 있습니다.'],
                ['핵심 메커니즘', '학습 데이터의 권리 문제, 기존 저작물과 유사한 산출물, 출처 미확인 콘텐츠의 상업적 사용이 분쟁으로 이어질 수 있습니다.'],
                ['피해 유형', '손해배상, 소송·방어비용, 콘텐츠 삭제·재제작, 서비스 중단과 계약상 배상책임이 결합될 수 있습니다.'],
                ['영향 대상', 'AI 개발사, 도입기업, 콘텐츠 제작자, 마케팅·법무부서, 외주 제작사와 원저작권자가 영향을 받습니다.'],
                ['상품화 쟁점', '고의·인지 가능 침해, 보장 전 법률 검토, 모델·서비스별 면책, 방어비용과 배상책임의 범위를 구분해야 합니다.'],
              ].map(([title, body], index) => <article className="aic-context-card" key={title}><div>{index + 1}</div><h4>{title}</h4><p>{body}</p></article>)}
            </div>
          </section>

          <section className="aic-panel aic-editorial-panel" id="aic-why-insurance">
            <PanelTitle number="02" title="왜 보험 관점에서 주목해야 하나?" subtitle="단순한 법률 이슈가 아니라 보험 검토 가치가 있는 이유를 정리합니다." />
            <div className="aic-editorial-reasons">
              {[
                ['분쟁이 법률비용과 배상책임으로 구체화될 수 있음', '생성형 AI 결과물의 저작권 침해 주장은 단순 삭제 요청에 그치지 않고, 법률자문·소송대리·합의·손해배상 등 실제 비용으로 이어질 수 있습니다.', '방어비용과 제3자 배상책임을 구분하여 담보 가능성을 검토할 수 있습니다.', '손해액 자체보다 분쟁이 어떤 비용 항목으로 전환되는지 구조화하는 것이 중요합니다.'],
                ['기존 보험의 보장 경계가 불명확함', '미디어배상책임, 전문직배상책임, 사이버보험 등에 일부 연결될 수 있지만 지식재산권 면책, 고의성, 계약상 책임 등에서 공백이 발생할 수 있습니다.', '신상품보다 기존 약관 개정 또는 특약 확장 가능성도 함께 검토해야 합니다.', '완전히 새로운 위험이라기보다 기존 담보 사이의 경계에서 발생하는 복합 보장 공백입니다.'],
                ['기업의 통제 수준에 따라 위험 차이가 큼', '데이터 출처 기록, 내부 승인, 법률검수, 유사도 점검, 외주계약의 권리보증 등 관리체계에 따라 분쟁 가능성이 달라질 수 있습니다.', '기업별 통제 수준을 인수조건과 자기부담금, 면책 기준에 반영할 여지가 있습니다.', '위험 자체뿐 아니라 관리 가능한 위험인지가 상품화 판단의 핵심입니다.'],
              ].map(([title, body, insurance, ai], index) => <article className="aic-editorial-reason" key={title}><div className="aic-editorial-reason-head"><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3></div><p>{body}</p><div className="aic-editorial-meaning-grid"><div className="insurance"><b>보험 관점의 의미</b>{insurance}</div><div className="ai"><b>AI 해석</b>{ai}</div></div></article>)}
            </div>
            <div className="aic-editorial-grid">
              <article className="aic-editorial-card"><small>국내 보험산업</small><h3>단계적 상품 도입 필요성</h3><div className="aic-editorial-quote"><blockquote>“인수 가능성이 높은 위험부터 선별하여 시범적으로 보험상품을 도입하는 단계적 접근이 필요”</blockquote><cite>보험연구원, 「생성형 AI 위험과 보험산업」</cite></div><div className="aic-editorial-split"><div className="context"><b>맥락 해설</b><span>손해자료가 부족한 초기 시장에서는 위험 전체를 포괄하기보다 사고 정의가 가능한 영역부터 접근할 필요가 있습니다.</span></div><div className="insurance"><b>보험적 의미</b><span>법률비용·방어비용·제한적 제3자 배상책임 중심의 특약 또는 시범상품이 현실적입니다.</span></div></div><a href="https://www.kiri.or.kr/report/downloadFile.do?docId=793789" target="_blank" rel="noreferrer noopener">보험연구원 원문 PDF ↗</a></article>
              <article className="aic-editorial-card"><small>글로벌 위험 전망</small><h3>지식재산권 위험을 포함하는 새로운 보험 리스크</h3><div className="aic-editorial-quote"><blockquote>“copyright-protected training data”</blockquote><cite>Swiss Re Institute, AI and the insurance risk landscape</cite></div><div className="aic-editorial-split"><div className="context"><b>맥락 해설</b><span>AI 학습데이터 사용은 기술 오류를 넘어 지식재산권 침해 불확실성을 확대하는 요인으로 제시됩니다.</span></div><div className="insurance"><b>보험적 의미</b><span>미디어·전문직·사이버 책임이 겹치는 복합 위험으로 분류할 수 있습니다.</span></div></div><a href="https://www.swissre.com/risk-knowledge/advancing-societal-benefits-digitalisation/ai-brings-major-change-to-insurance.html" target="_blank" rel="noreferrer noopener">Swiss Re 원문 ↗</a></article>
            </div>
          </section>

          <section className="aic-panel aic-editorial-panel" id="aic-mechanism">
            <PanelTitle number="03" title="위험 발생 구조" subtitle="업무 과정에서 저작권 분쟁으로 이어지는 흐름입니다." />
            <div className="aic-mechanism"><div className="aic-flow">{[['저작물 수집·학습', '권리 확인이 불충분한 데이터'], ['프롬프트·생성', '외부 콘텐츠 입력·참조'], ['산출물 유사성', '기존 표현과의 중복 가능성'], ['상업적 활용', '광고·디자인·문서·코드 납품'], ['침해 주장·분쟁', '삭제·배상·소송·계약 책임']].map(([title, body], index) => <span key={title}><b>{['📚', '⌨️', '🧩', '📢', '⚖️'][index]}</b><strong>{title}</strong><small>{body}</small>{index < 4 ? <i>→</i> : null}</span>)}</div><div className="aic-callout">동일한 AI 도구를 사용하더라도 데이터 출처, 사용 목적, 인간의 편집·창작 기여, 산출물 검수 여부와 실제 활용 방식에 따라 위험 수준이 달라집니다.</div></div>
            <div className="aic-editorial-grid aic-mechanism-articles">
              <article className="aic-editorial-card"><small>학습 단계</small><h3>권리 미확인 데이터의 수집·복제</h3><p>모델 개발 또는 파인튜닝 과정에서 저작권자의 허락 없이 저작물이 수집·복제됐는지가 쟁점이 됩니다.</p></article>
              <article className="aic-editorial-card"><small>이용 단계</small><h3>외부 저작물 입력과 산출물의 상업적 활용</h3><p>사용자가 외부 콘텐츠를 프롬프트로 입력하거나, 기존 저작물과 유사한 결과물을 광고·디자인·코드·납품물에 사용하는 과정에서 분쟁이 발생할 수 있습니다.</p></article>
              <article className="aic-editorial-card wide"><small>집적위험</small><h3>동일 모델·플랫폼을 통한 다수 계약의 동시 노출</h3><p>많은 기업이 동일한 AI 모델과 공급자를 이용하기 때문에 하나의 데이터셋·모델·판결 이슈가 여러 피보험자의 청구로 동시에 확산될 수 있습니다.</p></article>
            </div>
          </section>

          <section className="aic-panel" id="aic-policy"><PanelTitle number="04" title="정책·공식 자료" subtitle="국내외 공식 기준과 논의 동향입니다." /><div className="aic-news-list">{[['생성형 AI 저작권 안내서', 'AI 사업자·권리자·이용자·등록 관련 안내', '2024-01', papers[0].url], ['생성형 AI 결과물 저작권 분쟁 예방 안내서', '산출물 이용 전 점검과 분쟁 예방 기준', '2025-06', papers[1].url], ['생성형 AI 학습과 공정이용 안내서', '학습 데이터 이용과 공정이용 판단 구조', '2026-02', papers[3].url], ['Copyright and Artificial Intelligence', '미국 저작권청의 AI 저작권 정책 보고서', '상시 갱신', papers[4].url]].map(([title, body, date, url]) => <a href={url} target="_blank" rel="noreferrer noopener" key={title}><div><b>{title}</b><small>{body}</small></div><time>{date}</time></a>)}</div></section>

          <section className="aic-panel" id="aic-damage"><PanelTitle number="05" title="손해와 비용의 확산 경로" subtitle="예상 보험금이 아니라 실제로 발생 가능한 손해 유형을 구분합니다." /><div className="aic-damage-path">{lossRows.map(([title, body, tag, evidence]) => <div className="aic-damage-row" key={title}><strong>{title}</strong><p>{body}</p><span><b>{tag}</b>{evidence}</span></div>)}</div><div className="aic-amount-note"><b>금액 표시 원칙:</b> 공개된 판결·합의·실제 비용이 원문에서 확인되는 경우에만 사건별 근거와 함께 표시합니다. 예상 보험금·보험료·PML은 이 화면에서 산출하지 않고 종합 리포트에서 별도 검토합니다.</div></section>

          <section className="aic-panel" id="aic-stakeholders"><PanelTitle number="06" title="영향 대상과 책임 관계" subtitle="누가 위험을 만들고, 이용하며, 손해를 부담할 수 있는지 구분합니다." /><div className="aic-stakeholder-grid">{[['AI 개발·서비스 사업자', '학습 데이터의 확보 방식, 이용약관, 필터링과 면책·보상 조항이 핵심입니다.'], ['도입 기업', '도구 선정, 사내 정책, 검수·승인 절차와 상업적 활용에 대한 관리책임이 문제될 수 있습니다.'], ['임직원·실사용자', '프롬프트 입력, 외부 저작물 업로드, 산출물의 무검수 사용이 사고 원인이 될 수 있습니다.'], ['콘텐츠·외주 제작사', '납품물의 권리 보증, 재사용 범위와 제3자 청구에 대한 계약상 책임이 연결됩니다.'], ['저작권자', '학습·복제·유사 산출물 이용으로 권리가 침해됐다고 주장할 수 있습니다.'], ['플랫폼·유통 채널', '신고·삭제·재업로드와 서비스 약관에 따라 분쟁의 확산과 중단 범위가 달라질 수 있습니다.']].map(([title, body]) => <article key={title}><strong>{title}</strong><p>{body}</p></article>)}</div></section>

          <section className="aic-panel" id="aic-coverage"><PanelTitle number="07" title="기존 보험·약관과의 연결" subtitle="새 상품 결론이 아니라 현재 어떤 보장이 일부 손해와 연결될 수 있는지 확인합니다." /><div className="aic-coverage-map">{[['전문직배상책임보험', '전문서비스 제공 과정에서 발생한 과실과 제3자 손해가 담보 범위에 포함되는지 확인합니다.', '업종별 확인', 'partial'], ['미디어배상책임보험', '콘텐츠 제작·게시 과정의 저작권 침해 주장과 방어비용이 보장되는지 약관을 검토합니다.', '연결 가능', 'possible'], ['사이버보험', 'AI 활용 자체보다 데이터 유출·보안사고와 결합된 손해를 중심으로 보장될 가능성이 있습니다.', '담보 경계 검토', 'review'], ['일반배상책임보험', '광고침해·인격권·지식재산권 관련 면책 또는 제한이 있는지 확인해야 합니다.', '면책 확인 필요', 'partial'], ['법률비용보험', '저작권 침해 주장에 대한 법률자문과 소송비용을 중심으로 별도 담보 가능성을 검토할 수 있습니다.', '구조화 가능', 'possible'], ['계약상 면책·보증', 'AI 서비스 약관과 외주 계약의 면책·보상조항이 실제 보험 책임보다 선행할 수 있습니다.', '계약 우선 검토', 'review']].map(([title, body, status, tone]) => <div className="aic-coverage-row" key={title}><strong>{title}</strong><p>{body}</p><span className={tone}>{status}</span></div>)}</div></section>

          <section className="aic-panel" id="aic-questions"><PanelTitle number="08" title="종합 리포트로 넘길 상품화 질문" subtitle="위험 상세에서는 결론을 내리지 않고 검토 질문을 구조화합니다." /><div className="aic-question-list">{['학습 데이터 이용, 프롬프트 입력과 산출물 활용 중 어느 단계의 행위를 보험사고로 정의할 것인가?', '고의 또는 침해 가능성을 알면서 사용한 경우를 어떤 기준으로 면책할 것인가?', 'AI 서비스 사업자, 도입기업, 임직원과 외주 제작사의 책임을 어떤 증빙과 계약으로 구분할 것인가?', '손해배상금, 방어비용, 콘텐츠 재제작비와 서비스 중단 손해 중 어디까지 보장할 것인가?', '사전 법률검토, 출처 기록, 승인 절차와 유사도 검사를 인수조건 또는 보험료 할인 요소로 활용할 수 있는가?'].map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p></div>)}</div></section>
          <section className="aic-panel aic-deep-analysis" id="aic-deep-analysis"><PanelTitle number="09" title="위험 심층 해설" subtitle="실제 자료와 인용을 바탕으로 위험 환경, 법률적 불확실성과 상품화 가능성을 하나의 흐름으로 해설합니다." /><div className="aic-editorial-wrap"><div className="aic-editorial-hero"><small>원문 기반 위험 분석</small><h2>생성형 AI 저작권 책임은 신규 보험상품이 될 수 있는가</h2><p>위험의 발생 배경부터 실제 비용, 기존 보험의 보장 공백과 현실적인 상품 형태까지 연결해 살펴봅니다.</p></div><div className="aic-editorial-body"><p className="aic-editorial-intro">생성형 AI 저작권 책임을 보험의 관점에서 바라볼 때 가장 먼저 구분해야 할 것은, 이 위험이 단순히 ‘AI가 저작물을 베꼈는가’의 문제가 아니라는 점입니다. 위험은 학습데이터 수집, 외부 저작물의 프롬프트 입력, 산출물 생성, 사람의 편집, 상업적 활용, 제3자의 침해 주장에 이르는 전 과정에서 발생합니다. 따라서 상품화 가능성을 판단하려면 저작권법상의 결론만 찾을 것이 아니라, 어떤 행위가 사고를 발생시키고 어떤 비용이 실제 손해로 전환되는지, 책임 주체를 식별할 수 있는지와 기업별 위험을 사전에 통제할 수 있는지를 함께 살펴봐야 합니다.</p>{deepAnalysisSections.map((section) => <article className="aic-editorial-section" key={section.number}><div className="aic-editorial-section-head"><span>{section.number}</span><h3>{section.title}</h3></div>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.quote ? <div className="aic-editorial-quote"><blockquote>{section.quote}</blockquote><cite>{section.cite}</cite><a href={section.link} target="_blank" rel="noreferrer noopener">{citationSourceLabel(section.cite, section.linkLabel)}</a></div> : null}{section.meaning ? <div className="aic-editorial-meaning"><b>{section.meaningLabel}</b><p>{section.meaning}</p></div> : null}</article>)}<div className="aic-editorial-decision"><small>잠정 상품화 판단</small><h3>검토 가치가 있으나, 전면 보장보다 제한적 특약·시범상품이 우선</h3><p>생성형 AI 저작권 책임은 법률 분쟁 가능성, 책임 확정 전 비용 발생, 기존 담보의 불명확한 경계와 기업별 통제 수준 차이가 존재해 신규 보험 검토 가치가 있습니다. 다만 국내 청구자료와 판례가 충분하지 않으므로 법률방어비용과 제한된 제3자 배상책임부터 시작하고, 실제 손해자료를 축적하면서 보장 범위를 확대하는 접근이 적절합니다.</p><div className="aic-editorial-checks"><div><b>우선 검토 담보</b><span>법률방어비용·감정비용·제한적 배상책임</span></div><div><b>핵심 인수조건</b><span>출처 기록·로그·유사도 검사·법률검수·승인체계</span></div><div><b>추가 필요 자료</b><span>국내 청구 빈도·평균 손해액·약관 공백·집적노출</span></div></div></div></div></div></section>

          <section className="aic-panel" id="aic-ledger"><PanelTitle number="10" title="활용 근거자료 원장" subtitle="화면의 모든 판단을 공식 원문으로 추적합니다." /><div className="aic-source-ledger">{sources.map(([type, title, url]) => <div key={title}><strong>{type}</strong><span>{title}</span><a href={url} target="_blank" rel="noreferrer noopener">{sourceLedgerLabel(type, url)}</a></div>)}<p>본 화면은 공개자료를 연결한 위험 이해용 프로토타입입니다. 법률 자문이나 공식적인 침해 판단을 제공하지 않습니다. 예상 보험금·보험료·손해율·PML과 실제 상품 구조는 보험사 내부 데이터와 법무·계리 검증을 거쳐 종합 리포트에서 별도로 검토해야 합니다.</p></div></section>
        </div>

        <aside className="aic-aside">
          <AsideCard title="이 위험을 읽는 순서" description="원문을 보면서 아래 흐름으로 이해합니다."><AsideItem number="01" title="어디서 권리 문제가 발생하는가" body="학습 데이터·프롬프트·산출물 활용 단계 구분" /><AsideItem number="02" title="어떤 손해로 확산되는가" body="법률비용·배상·재제작·서비스 중단" /><AsideItem number="03" title="누가 책임질 수 있는가" body="개발사·도입기업·사용자·외주사·권리자" /><AsideItem number="04" title="기존 보험은 어디까지 가능한가" body="미디어·전문직·사이버·법률비용 담보의 경계" /></AsideCard>
          <AsideCard title="연결된 공식 출처" description="현재 화면에서 확인 가능한 자료입니다."><AsideItem label="KCC" title="한국저작권위원회" body="저작권 안내서·분쟁 예방·등록·공정이용 자료" /><AsideItem label="USCO" title="미국 저작권청" body="AI 산출물의 저작권성과 학습 관련 정책 보고서" /><AsideItem label="WIPO" title="세계지식재산기구" body="생성형 AI와 지식재산권의 국제적 쟁점" /></AsideCard>
          <Link className="aic-report-button" to="/reports">종합리포트 &gt;</Link>
        </aside>
      </div>
    </main>
  )
}

function PanelTitle({ number, title, subtitle, extra }: { number: string; title: string; subtitle: string; extra?: string }) {
  return <header className="aic-panel-title"><div><span>{number}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>{extra ? <b>{extra}</b> : null}</header>
}

function AsideCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="aic-aside-card"><header><h3>{title}</h3><p>{description}</p></header><div>{children}</div></section>
}

function AsideItem({ number, label, title, body }: { number?: string; label?: string; title: string; body: string }) {
  return <div className="aic-aside-item"><span className={label ? 'label' : 'number'}>{label || number}</span><strong>{title}</strong><p>{body}</p></div>
}
