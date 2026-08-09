export type RiskDetailResearchSource = {
  institution: string
  title: string
  url: string
  role: string
}

const sources = {
  kidi: {
    institution: '보험개발원',
    title: '자동차·모빌리티 보험 연구·통계',
    url: 'https://www.kidi.or.kr/',
    role: '차량·모빌리티 위험의 손해 구조와 통계 확인 경로',
  },
  kiri: {
    institution: '보험연구원',
    title: '보험연구원 연구보고서·KIRI 리포트',
    url: 'https://www.kiri.or.kr/report/intro.do',
    role: '보험제도·상품화 쟁점의 연구 원문 검색 경로',
  },
  kiriMobility: {
    institution: '보험연구원',
    title: '드론 시장 및 보험 현황과 시사점',
    url: 'https://www.kiri.or.kr/publication/list.do?catId=28',
    role: '드론·자율주행 보험 쟁점이 수록된 KIRI 리포트 목록',
  },
  swissReAi: {
    institution: 'Swiss Re Institute',
    title: 'AI and the industry risk landscape',
    url: 'https://www.swissre.com/institute/research/topics-and-risk-dialogues/digital-business-model-and-cyber-risk/ai-and-the-industry-risk-landscape.html',
    role: 'AI 오류·사이버·책임·지식재산 위험과 보험 연결',
  },
  swissReClimate: {
    institution: 'Swiss Re Institute',
    title: 'AI·기후·신종 위험 연구 목록',
    url: 'https://www.swissre.com/institute/research/sonar.html',
    role: '신종 위험의 발생 배경·보험 공백을 확인하는 연구 목록',
  },
  munichCyber: {
    institution: 'Munich Re',
    title: 'Cyber insurance: risks and trends 2026',
    url: 'https://www.munichre.com/en/insights/cyber/cyber-insurance-risks-and-trends-2026.html',
    role: '랜섬웨어·데이터 유출·공급망·사이버보험 손해 구조',
  },
  munichFlood: {
    institution: 'Munich Re',
    title: 'Flood risks on the rise',
    url: 'https://www.munichre.com/en/risks/natural-disasters/floods.item-87d0cff3f2f741a20bc42e26b9c63d28.html',
    role: '침수 위험의 지역성·예방·보험 공백과 손실 누적',
  },
  axa: {
    institution: 'AXA',
    title: 'Future Risks Report 2025',
    url: 'https://www.axa.com/en/news/future-risks-report?tab=risk-radar',
    role: '기후·사이버·AI·건강 등 글로벌 신종 위험 우선순위',
  },
  dataPortal: {
    institution: '공공데이터포털',
    title: '재난·안전·기상 공공데이터 검색',
    url: 'https://www.data.go.kr/',
    role: '지역·시설·기상·사고 원천 데이터의 추가 확인 경로',
  },
  law: {
    institution: '법제처 국가법령정보센터',
    title: '국가법령정보센터 법령·판례 원문',
    url: 'https://www.law.go.kr/',
    role: '시행일·의무·책임 주체·면책 판단의 공식 법령 원문',
  },
  fss: {
    institution: '금융감독원',
    title: '금융소비자 정보·소비자경보',
    url: 'https://www.fss.or.kr/fss/main/main.do?menuNo=200000',
    role: '금융사기·소비자 피해·금융상품 유의사항의 공식 안내',
  },
} satisfies Record<string, RiskDetailResearchSource>

const evBatterySources: RiskDetailResearchSource[] = [
  {
    institution: '보험연구원',
    title: '전기차·모빌리티 위험 연구보고서 PDF 원문',
    url: 'https://www.kiri.or.kr/pdf/%EC%97%B0%EA%B5%AC%EC%9E%90%EB%A3%8C/%EC%97%B0%EA%B5%AC%EB%B3%B4%EA%B3%A0%EC%84%9C/nre2024-04_1.pdf?utm_source=chatgpt.com',
    role: '전기차·모빌리티 위험과 보험 검토에 참고할 수 있는 보험연구원 연구보고서 원문',
  },
  {
    institution: '보험연구원',
    title: '전기자동차·열폭주 위험 · 보험연구원 PDF 원문',
    url: 'https://www.kiri.or.kr/report/downloadFile.do?docId=564739',
    role: '전기자동차와 BESS에 활용되는 리튬이온 배터리의 열폭주·화재 위험을 확인하는 연구 원문',
  },
  {
    institution: '공공데이터포털',
    title: '전기차 화재 관련 파일데이터 원문',
    url: 'https://www.data.go.kr/data/15138615/fileData.do',
    role: '전기차 화재 관련 원천 데이터를 확인하는 공공데이터포털 파일데이터 원문',
  },
  {
    institution: '공공데이터포털',
    title: '전기차 안전·사고 관련 파일데이터 원문',
    url: 'https://www.data.go.kr/data/15155635/fileData.do',
    role: '전기차 안전·사고 관련 원천 데이터를 확인하는 공공데이터포털 파일데이터 원문',
  },
]

const sourceKeysByRisk: Record<string, Array<keyof typeof sources>> = {
  'ev-battery-fire': ['kidi', 'kiri', 'dataPortal', 'law'],
  'commercial-drone': ['kiriMobility', 'kidi', 'law', 'dataPortal'],
  'autonomous-level4': ['kiriMobility', 'kidi', 'law', 'dataPortal'],
  'deepfake-phishing': ['fss', 'swissReAi', 'axa', 'law'],
  'urban-flooding': ['munichFlood', 'axa', 'dataPortal', 'kiri'],
  'enterprise-ransomware': ['munichCyber', 'swissReAi', 'fss', 'law'],
  'ess-ups-battery-fire': ['swissReClimate', 'munichFlood', 'dataPortal', 'law'],
  'heatwave-health-income-loss': ['axa', 'swissReClimate', 'dataPortal', 'law'],
  'platform-worker-transit-accident': ['kidi', 'kiri', 'law', 'fss'],
  'ai-transparency-obligation': ['swissReAi', 'kiri', 'law', 'fss'],
  'mydata-portability-demand': ['swissReAi', 'kiri', 'law', 'fss'],
  'heatwave-workplace-duty': ['axa', 'swissReClimate', 'law', 'dataPortal'],
  'kuam-urban-pilot': ['kiriMobility', 'kidi', 'law', 'dataPortal'],
  'ai-voice-investigation': ['swissReAi', 'munichCyber', 'fss', 'law'],
  'medical-liability-insurance': ['kiri', 'law', 'fss', 'dataPortal'],
  'sns-impersonation-commerce': ['fss', 'swissReAi', 'axa', 'law'],
  'ota-delivery-consumer-disputes': ['kiri', 'fss', 'law', 'dataPortal'],
}

export function getRiskDetailResearchSources(riskId: string): RiskDetailResearchSource[] {
  if (riskId === 'ev-battery-fire') return evBatterySources
  return (sourceKeysByRisk[riskId] ?? ['kiri', 'swissReClimate', 'law', 'dataPortal']).map((key) => sources[key])
}
