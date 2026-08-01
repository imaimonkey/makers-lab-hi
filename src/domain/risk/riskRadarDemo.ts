export type IssueAudience = '전체' | '개인 니즈' | '기업 니즈' | '영업·현장' | '뉴스·산업' | '법령·규제';

export type ProductIssue = {
  id: string;
  title: string;
  audience: Exclude<IssueAudience, '전체'>;
  target: string;
  riskEvent: string;
  expectedLoss: string;
  coverageGap: string;
  productRoute: '기존 상품' | '특약 확장' | '신규 담보' | '신규 주계약' | '판단 대기';
  market: '높음' | '중간' | '낮음';
  data: '충분' | '보강 필요' | '없음';
  law: '확인' | '검토 필요' | '관련 없음 확인';
  stage: '기획' | '심의' | '설계' | '검증' | '출시';
  next: string;
  severity: '심각' | '높음' | '중간';
  owner: string;
  due: string;
  type: string;
  progress: number;
  sourceCount: number;
  metrics?: Array<{ label: string; value: string; sourceHint?: string }>;
};

export type ProductRisk = {
  id: string;
  keyword: string;
  audience: '개인' | '기업' | '개인·기업';
  target: string;
  industry: string;
  loss: string;
  coverageGap: string;
  market: '높음' | '중간' | '낮음' | '확인 필요';
  severity: '심각' | '높음' | '중간' | '확인 필요';
  data: '충분' | '보강 필요' | '없음' | '확인 필요';
  law: '확인' | '검토 필요' | '관련 없음 확인' | '확인 필요';
  existing: '연결 가능' | '부분 연결' | '연결 없음' | '확인 필요';
  rider: '가능성 높음' | '검토 필요' | '낮음' | '확인 필요';
  mainCoverage: '가능성 있음' | '검토 필요' | '낮음' | '확인 필요';
  score: number;
  mentions: number;
  sourceCount: number;
  keywords: string[];
  trend: number[];
  impact: string;
  next: string;
  articleId: string;
  riskEvent?: string;
  expectedLoss?: string;
  facts?: string[];
  metrics?: Array<{ label: string; value: string; sourceHint?: string }>;
  confidence?: string;
  recommendation?: string;
};

export const demoIssues: ProductIssue[] = [
  { id: 'issue-ev', title: '전기차 배터리 화재와 충전시설 책임', audience: '기업 니즈', target: '충전사업자·전기차 운전자', riskEvent: '배터리 열폭주·충전 중 화재', expectedLoss: '재산손해·대인손해·영업중단', coverageGap: '충전시설 운영자 책임과 휴업손해', productRoute: '특약 확장', market: '높음', data: '보강 필요', law: '검토 필요', stage: '설계', next: '충전사업자 책임 범위 조사', severity: '심각', owner: '김매니저', due: '오늘', type: '보장 공백', progress: 62, sourceCount: 6 },
  { id: 'issue-ai', title: '생성형 AI 결과물의 저작권 분쟁', audience: '기업 니즈', target: 'AI 도입 기업·콘텐츠 사업자', riskEvent: '학습·생성 결과물 권리 분쟁', expectedLoss: '방어비용·손해배상·매출 손실', coverageGap: 'AI 사용 과정의 배상책임 범위', productRoute: '신규 담보', market: '높음', data: '보강 필요', law: '검토 필요', stage: '기획', next: '분쟁 사례와 면책 범위 수집', severity: '높음', owner: '상품개발팀', due: '7/22', type: '신규 보장 수요', progress: 28, sourceCount: 4 },
  { id: 'issue-drone', title: '드론 배송 운영자·시설 책임 분리', audience: '기업 니즈', target: '물류기업·드론 운영자', riskEvent: '비행 중 추락·제3자 충돌', expectedLoss: '대인배상·대물배상·배송 지연', coverageGap: '운영자·플랫폼·시설 책임 구분', productRoute: '신규 주계약', market: '높음', data: '충분', law: '확인', stage: '심의', next: '운영자별 책임 시나리오 심의', severity: '높음', owner: '이서윤', due: '7/24', type: '책임 범위', progress: 48, sourceCount: 8 },
  { id: 'issue-climate', title: '국지성 폭우로 인한 소상공인 영업중단', audience: '개인 니즈', target: '소상공인·자영업자', riskEvent: '침수·시설 폐쇄·매출 중단', expectedLoss: '재산손해·영업중단·복구비', coverageGap: '기존 풍수해 담보의 휴업 공백', productRoute: '특약 확장', market: '높음', data: '충분', law: '관련 없음 확인', stage: '검증', next: '지역별 빈도·손해액 표준화', severity: '심각', owner: '박민서', due: '7/20', type: '손해율', progress: 78, sourceCount: 12 },
  { id: 'issue-cyber', title: '중소기업 랜섬웨어 복구와 매출 손실', audience: '기업 니즈', target: '중소기업·온라인 사업자', riskEvent: '시스템 잠금·데이터 유출', expectedLoss: '복구비·영업중단·배상책임', coverageGap: '복구 기간과 매출 손실 산정', productRoute: '신규 담보', market: '높음', data: '보강 필요', law: '확인', stage: '설계', next: '업종별 평균 복구기간 비교', severity: '높음', owner: '최지훈', due: '7/25', type: '요율·손해율', progress: 55, sourceCount: 9 },
  { id: 'issue-mobility', title: '개인형 이동장치 배터리·상해 보장', audience: '개인 니즈', target: '전동킥보드 이용자', riskEvent: '주행 중 상해·배터리 발화', expectedLoss: '상해·대인배상·재산손해', coverageGap: '단기 이용자와 비소유자 공백', productRoute: '신규 주계약', market: '중간', data: '보강 필요', law: '검토 필요', stage: '기획', next: '이용자 인터뷰 20건 확보', severity: '중간', owner: '정하림', due: '7/29', type: '고객 니즈', progress: 22, sourceCount: 5 },
  { id: 'issue-supply', title: '공급망 중단에 따른 납품 지연 손실', audience: '기업 니즈', target: '제조사·수출기업', riskEvent: '부품 조달 중단·납품 지연', expectedLoss: '영업손실·위약금·대체조달비', coverageGap: '거래상대방·운송 지연 보장 공백', productRoute: '판단 대기', market: '중간', data: '없음', law: '검토 필요', stage: '기획', next: '손해 데이터 확보 전 보류', severity: '높음', owner: '기업보험팀', due: '8/01', type: '영업 요청', progress: 12, sourceCount: 3 },
  { id: 'issue-metaverse', title: '가상공간 내 사기와 디지털 자산 손실', audience: '개인 니즈', target: '가상자산 이용자·플랫폼', riskEvent: '계정 탈취·거래 사기', expectedLoss: '금전손실·복구비·분쟁비용', coverageGap: '개인 이용자의 디지털 자산 손해', productRoute: '판단 대기', market: '중간', data: '없음', law: '검토 필요', stage: '기획', next: '사고 정의와 면책 가능성 확인', severity: '중간', owner: '시장조사팀', due: '8/05', type: '시장 조사', progress: 8, sourceCount: 2 }
];

export const demoRisks: ProductRisk[] = [
  { id: 'demo-risk-ev', keyword: '전기차 배터리 화재', audience: '개인·기업', target: '개인 운전자·충전사업자', industry: '자동차·모빌리티', loss: '화재·대인·영업중단', coverageGap: '충전시설 운영자 책임', market: '높음', severity: '심각', data: '보강 필요', law: '검토 필요', existing: '부분 연결', rider: '가능성 높음', mainCoverage: '검토 필요', score: 4.35, mentions: 92, sourceCount: 6, keywords: ['배터리 열폭주', '충전 인프라', '시설 책임'], trend: [42, 48, 57, 65, 75, 88, 92], impact: '기존 자동차보험만으로는 충전시설 운영자의 책임과 영업중단을 설명하기 어렵습니다.', next: '충전사업자 사고·손해액 데이터 조사', articleId: 'demo-news-ev' },
  { id: 'demo-risk-ai', keyword: '생성형 AI 저작권', audience: '기업', target: 'AI 도입 기업·콘텐츠 사업자', industry: 'IT·서비스', loss: '방어비용·배상·매출 손실', coverageGap: 'AI 사용 과정의 배상책임', market: '높음', severity: '높음', data: '보강 필요', law: '검토 필요', existing: '연결 없음', rider: '검토 필요', mainCoverage: '가능성 있음', score: 3.68, mentions: 78, sourceCount: 4, keywords: ['저작권 분쟁', '생성물', 'AI 거버넌스'], trend: [25, 36, 42, 49, 59, 68, 78], impact: '기업의 AI 도입이 늘지만 분쟁 시 방어비용과 책임 범위를 정한 보장이 부족합니다.', next: '분쟁 판례·계약 면책 범위 조사', articleId: 'demo-news-ai' },
  { id: 'demo-risk-drone', keyword: '드론 배송 사고', audience: '기업', target: '물류기업·드론 운영자', industry: '물류·모빌리티', loss: '대인·대물·배송 지연', coverageGap: '운영자·플랫폼·시설 책임', market: '중간', severity: '높음', data: '충분', law: '확인', existing: '부분 연결', rider: '가능성 높음', mainCoverage: '가능성 있음', score: 2.94, mentions: 61, sourceCount: 8, keywords: ['비행 안전', '운영자 책임', '제3자 손해'], trend: [36, 41, 39, 46, 51, 56, 61], impact: '운영 주체가 나뉘는 위험이라 기존 배상책임 상품의 책임 기준을 세분화할 수 있습니다.', next: '운영자별 책임 시나리오 심의', articleId: 'demo-news-drone' },
  { id: 'demo-risk-meta', keyword: '메타버스 내 사기', audience: '개인', target: '가상자산 이용자·플랫폼', industry: '디지털 플랫폼', loss: '금전손실·복구비·분쟁비용', coverageGap: '개인 디지털 자산 손해', market: '중간', severity: '중간', data: '없음', law: '검토 필요', existing: '연결 없음', rider: '낮음', mainCoverage: '검토 필요', score: 2.31, mentions: 49, sourceCount: 3, keywords: ['계정 탈취', '거래 사기', '플랫폼 책임'], trend: [20, 25, 27, 32, 35, 43, 49], impact: '새로운 수요는 있으나 보험사고와 손해액을 표준화할 데이터가 부족합니다.', next: '사고 정의·면책 가능성 확인', articleId: 'demo-news-meta' },
  { id: 'demo-risk-climate', keyword: '소상공인 영업중단', audience: '개인·기업', target: '소상공인·자영업자', industry: '상공업·기후', loss: '침수·복구비·매출 중단', coverageGap: '풍수해 휴업손해', market: '높음', severity: '심각', data: '충분', law: '관련 없음 확인', existing: '부분 연결', rider: '가능성 높음', mainCoverage: '검토 필요', score: 1.62, mentions: 37, sourceCount: 12, keywords: ['국지성 폭우', '침수', '휴업손해'], trend: [17, 22, 26, 28, 31, 34, 37], impact: '기존 자연재해 보장에 실제 영업중단 손해를 연결할 수 있는 후보입니다.', next: '지역별 빈도·손해액 표준화', articleId: 'demo-news-climate' }
];

export const demoDashboardMetrics = {
  unresolved: 28,
  candidates: 7,
  gaps: 13,
  riders: 8,
  severe: 7,
  lawPending: 5,
  dataMissing: 9,
  reviewerPending: 6
};

export const demoTrend = [
  { label: '자동차·모빌리티', color: '#2563eb', values: [42, 48, 57, 65, 75, 88, 92] },
  { label: 'AI·디지털', color: '#0f9f8f', values: [28, 34, 41, 46, 55, 67, 74] },
  { label: '기후·재난', color: '#e7a43b', values: [18, 26, 24, 35, 40, 47, 56] }
];

export const demoLaws = [
  { institution: '금융위원회', title: 'AI 보험상품 가이드라인 개정안', risk: '생성형 AI 저작권', impact: '책임 범위·약관 검토 필요', when: '2시간 전', color: 'blue' },
  { institution: '국토교통부', title: '드론 비행 안전관리 기준 강화', risk: '드론 배송 사고', impact: '운영자·시설 책임 구분', when: '5시간 전', color: 'orange' },
  { institution: '환경부', title: '기후재난 대응 공시 범위 확대', risk: '소상공인 영업중단', impact: '기후위험 데이터 확보', when: '8시간 전', color: 'green' },
  { institution: '과학기술정보통신부', title: '생성형 AI 저작권 가이드라인 추진', risk: 'AI 저작권', impact: '면책·방어비용 검토', when: '12시간 전', color: 'violet' },
  { institution: '국회', title: '전기차 화재 피해보상 특별법 발의', risk: '전기차 배터리 화재', impact: '충전사업자 책임 확인', when: '1일 전', color: 'indigo' }
];

