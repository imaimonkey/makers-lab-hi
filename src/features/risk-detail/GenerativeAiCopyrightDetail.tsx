import { useState } from 'react'
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

export function GenerativeAiCopyrightDetail() {
  const [selectedPaper, setSelectedPaper] = useState(0)
  const paper = papers[selectedPaper]

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
        {['이슈 맥락', '원문 자료', '위험 구조', '손해 경로', '책임 주체', '기존 보험 연결', '정책·공식 자료', '상품화 질문', '근거 원장'].map((label, index) => <a href={`#aic-${['context', 'documents', 'mechanism', 'damage', 'stakeholders', 'coverage', 'policy', 'questions', 'ledger'][index]}`} key={label}>{label}</a>)}
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

          <section className="aic-panel" id="aic-documents"><PanelTitle number="02" title="관련 공식 안내서 및 연구 자료" subtitle="실제 원문을 선택해 핵심 내용을 확인합니다." extra="공식 원문 연결" />
            <div className="aic-paper-layout"><div className="aic-paper-list">{papers.map((item, index) => <button type="button" className={index === selectedPaper ? 'active' : ''} onClick={() => setSelectedPaper(index)} key={item.title}><b>{item.title}</b><small>{item.source}</small></button>)}</div><div className="aic-paper-detail"><h3>{paper.title}</h3><p>{paper.abstract}</p><div className="aic-findings"><b>위험 이해 포인트</b><br />{paper.finding}</div><div className="aic-quote-box"><b>보험 검토 시사점</b><p>{paper.insurance}</p></div><a className="aic-source-btn" href={paper.url} target="_blank" rel="noreferrer noopener">원문 열기 ↗</a></div></div>
          </section>

          <div className="aic-two-col">
            <section className="aic-panel" id="aic-mechanism"><PanelTitle number="03" title="위험 발생 구조" subtitle="업무 과정에서 분쟁으로 이어지는 경로입니다." /><div className="aic-mechanism"><div className="aic-flow">{['저작물 수집·학습', '프롬프트·생성', '기존 저작물 유사성', '상업적 활용', '침해 주장·분쟁'].map((item, index) => <span key={item}><b>{['📚', '⌨️', '🧩', '📢', '⚖️'][index]}</b><strong>{item}</strong>{index < 4 ? <i>→</i> : null}</span>)}</div><div className="aic-callout">동일한 AI 도구를 사용하더라도 데이터 출처, 사용 목적, 인간의 편집·창작 기여, 산출물의 유사성과 실제 이용 방식에 따라 위험 수준이 달라집니다.</div></div></section>
            <section className="aic-panel" id="aic-policy"><PanelTitle number="04" title="정책·공식 자료" subtitle="국내외 공식 기준과 논의 동향입니다." /><div className="aic-news-list">{[['생성형 AI 저작권 안내서', 'AI 사업자·권리자·이용자·등록 관련 안내', '2024-01', papers[0].url], ['생성형 AI 결과물 저작권 분쟁 예방 안내서', '산출물 이용 전 점검과 분쟁 예방 기준', '2025-06', papers[1].url], ['생성형 AI 학습과 공정이용 안내서', '학습 데이터 이용과 공정이용 판단 구조', '2026-02', papers[3].url], ['Copyright and Artificial Intelligence', '미국 저작권청의 AI 저작권 정책 보고서', '상시 갱신', papers[4].url]].map(([title, body, date, url]) => <a href={url} target="_blank" rel="noreferrer noopener" key={title}><div><b>{title}</b><small>{body}</small></div><time>{date}</time></a>)}</div></section>
          </div>

          <section className="aic-panel" id="aic-damage"><PanelTitle number="05" title="손해와 비용의 확산 경로" subtitle="예상 보험금이 아니라 실제로 발생 가능한 손해 유형을 구분합니다." /><div className="aic-damage-path">{lossRows.map(([title, body, tag, evidence]) => <div className="aic-damage-row" key={title}><strong>{title}</strong><p>{body}</p><span><b>{tag}</b>{evidence}</span></div>)}</div><div className="aic-amount-note"><b>금액 표시 원칙:</b> 공개된 판결·합의·실제 비용이 원문에서 확인되는 경우에만 사건별 근거와 함께 표시합니다. 예상 보험금·보험료·PML은 이 화면에서 산출하지 않고 종합 리포트에서 별도 검토합니다.</div></section>

          <section className="aic-panel" id="aic-stakeholders"><PanelTitle number="06" title="영향 대상과 책임 관계" subtitle="누가 위험을 만들고, 이용하며, 손해를 부담할 수 있는지 구분합니다." /><div className="aic-stakeholder-grid">{[['AI 개발·서비스 사업자', '학습 데이터의 확보 방식, 이용약관, 필터링과 면책·보상 조항이 핵심입니다.'], ['도입 기업', '도구 선정, 사내 정책, 검수·승인 절차와 상업적 활용에 대한 관리책임이 문제될 수 있습니다.'], ['임직원·실사용자', '프롬프트 입력, 외부 저작물 업로드, 산출물의 무검수 사용이 사고 원인이 될 수 있습니다.'], ['콘텐츠·외주 제작사', '납품물의 권리 보증, 재사용 범위와 제3자 청구에 대한 계약상 책임이 연결됩니다.'], ['저작권자', '학습·복제·유사 산출물 이용으로 권리가 침해됐다고 주장할 수 있습니다.'], ['플랫폼·유통 채널', '신고·삭제·재업로드와 서비스 약관에 따라 분쟁의 확산과 중단 범위가 달라질 수 있습니다.']].map(([title, body]) => <article key={title}><strong>{title}</strong><p>{body}</p></article>)}</div></section>

          <section className="aic-panel" id="aic-coverage"><PanelTitle number="07" title="기존 보험·약관과의 연결" subtitle="새 상품 결론이 아니라 현재 어떤 보장이 일부 손해와 연결될 수 있는지 확인합니다." /><div className="aic-coverage-map">{[['전문직배상책임보험', '전문서비스 제공 과정에서 발생한 과실과 제3자 손해가 담보 범위에 포함되는지 확인합니다.', '업종별 확인', 'partial'], ['미디어배상책임보험', '콘텐츠 제작·게시 과정의 저작권 침해 주장과 방어비용이 보장되는지 약관을 검토합니다.', '연결 가능', 'possible'], ['사이버보험', 'AI 활용 자체보다 데이터 유출·보안사고와 결합된 손해를 중심으로 보장될 가능성이 있습니다.', '담보 경계 검토', 'review'], ['일반배상책임보험', '광고침해·인격권·지식재산권 관련 면책 또는 제한이 있는지 확인해야 합니다.', '면책 확인 필요', 'partial'], ['법률비용보험', '저작권 침해 주장에 대한 법률자문과 소송비용을 중심으로 별도 담보 가능성을 검토할 수 있습니다.', '구조화 가능', 'possible'], ['계약상 면책·보증', 'AI 서비스 약관과 외주 계약의 면책·보상조항이 실제 보험 책임보다 선행할 수 있습니다.', '계약 우선 검토', 'review']].map(([title, body, status, tone]) => <div className="aic-coverage-row" key={title}><strong>{title}</strong><p>{body}</p><span className={tone}>{status}</span></div>)}</div></section>

          <section className="aic-panel" id="aic-questions"><PanelTitle number="08" title="종합 리포트로 넘길 상품화 질문" subtitle="위험 상세에서는 결론을 내리지 않고 검토 질문을 구조화합니다." /><div className="aic-question-list">{['학습 데이터 이용, 프롬프트 입력과 산출물 활용 중 어느 단계의 행위를 보험사고로 정의할 것인가?', '고의 또는 침해 가능성을 알면서 사용한 경우를 어떤 기준으로 면책할 것인가?', 'AI 서비스 사업자, 도입기업, 임직원과 외주 제작사의 책임을 어떤 증빙과 계약으로 구분할 것인가?', '손해배상금, 방어비용, 콘텐츠 재제작비와 서비스 중단 손해 중 어디까지 보장할 것인가?', '사전 법률검토, 출처 기록, 승인 절차와 유사도 검사를 인수조건 또는 보험료 할인 요소로 활용할 수 있는가?'].map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p></div>)}</div></section>

          <section className="aic-panel" id="aic-ledger"><PanelTitle number="09" title="활용 근거자료 원장" subtitle="화면의 모든 판단을 공식 원문으로 추적합니다." /><div className="aic-source-ledger">{sources.map(([type, title, url]) => <div key={title}><strong>{type}</strong><span>{title}</span><a href={url} target="_blank" rel="noreferrer noopener">원문 보기</a></div>)}<p>본 화면은 공개자료를 연결한 위험 이해용 프로토타입입니다. 법률 자문이나 공식적인 침해 판단을 제공하지 않습니다. 예상 보험금·보험료·손해율·PML과 실제 상품 구조는 보험사 내부 데이터와 법무·계리 검증을 거쳐 종합 리포트에서 별도로 검토해야 합니다.</p></div></section>
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
