import type { RiskLawTrackingItem } from './riskLawTracking'

const medicalPrecedent = {
  type: '대법원 판결 · 의료행위상 주의의무',
  caseNumber: '2016다266606',
  title: '의료과실과 인과관계·손해배상액 산정',
  badge: '대법원 2018. 11. 29. 선고',
  issue: '의료행위상 주의의무 위반과 결과 사이의 인과관계, 환자의 체질적 소인 등을 손해배상액에 반영할 수 있는지가 문제 된 사건입니다.',
  judgment: '의료수준은 당시 임상의학에서 일반적으로 알려지고 시인된 수준을 기준으로 판단하며, 의료과실과 인과관계의 증명 및 손해배상액 제한 법리를 확인했습니다.',
  award: '오른쪽 정중신경 손상에 따른 노동능력상실률 16%, 일실수입·일실퇴직금 및 위자료 1,000만 원 산정 내용이 판결에 포함됩니다.',
  sourceUrl: 'https://portal.scourt.go.kr/pgp/main.on?c=900&jisCntntsSrno=3204272&w2xPath=PGP1011M04',
}
const medicalLossCase = {
  type: '대법원 판결 · 의료사고 손해 사례',
  caseNumber: '2013다96165',
  title: '척추 수술 후 장애와 향후치료비·개호비 손해',
  badge: '대법원 2016. 7. 27. 주요판결',
  issue: '의료사고 피해자가 기왕치료비·위자료 등을 먼저 청구한 뒤 신체감정으로 확인되는 향후치료비·개호비를 추가 청구할 수 있는지가 문제 된 사건입니다.',
  judgment: '대법원은 적극적 손해에 대한 명시적 일부청구 여부를 소송 경과와 청구 내용까지 종합해 판단해야 한다고 보고 일부 파기환송했습니다.',
  award: '선행 소송에서 적극적 손해와 위자료 합계 약 8,000만 원을 청구한 사실 및 추가 향후치료비·개호비 청구가 판결 요지에 기재되어 있습니다.',
  sourceUrl: 'https://www.scourt.go.kr/portal/news/NewsViewAction.work?currentPage=2&gubun=4&searchOption=&searchWord=&seqnum=5282',
}

const firePrecedent = {
  type: '서울북부지방법원 판결 · 화재 손해배상',
  caseNumber: '2024가합22263',
  title: '간이창고 화재의 공작물 하자와 인접 건물 연소 손해',
  badge: '서울북부지방법원 2025. 8. 14. 선고',
  issue: '담배꽁초에서 시작된 불이 가연성 물질이 보관된 간이창고와 인접 건물로 확산된 경우, 발화행위자와 건물 소유자의 공동 책임이 문제 된 사건입니다.',
  judgment: '발화행위자의 불법행위책임과 간이창고의 설치·보존상 하자에 따른 공작물책임을 인정하고, 피해 건물의 화재 취약성 등 과실을 함께 고려했습니다.',
  award: '피고들의 손해배상책임을 피해 확대 원인과 손해분담의 형평성을 고려해 50%로 제한했습니다.',
  sourceUrl: 'https://www.scourt.go.kr/portal/dcboard/DcNewsViewAction.work?cbub_code=000213&gubun=44&scode_kname=&searchOption=&searchWord=&seqnum=27348',
}

const fireLossCase = {
  type: '법원 공개 손해 사례 · 화재 확산',
  caseNumber: '2024가합22263 · 실제 피해 사실',
  title: '인접 건물 2동 전소 및 시설·집기·동산 소실',
  badge: '법원 공개 판결문 기반',
  issue: '간이창고 화재가 인접한 원고 소유 건물 2동으로 번지면서 건물과 보관 중인 시설·집기비품·동산이 소실된 사례입니다.',
  judgment: '화재 원인, 연소 확산, 피해 대상과 정도가 법원 판단의 손해 범위 검토 자료로 확인됩니다.',
  award: '구체적 손해액은 공개 판결문과 손해자료 원문을 대조해야 하며, 책임비율은 50%로 판단되었습니다.',
  sourceUrl: 'https://www.scourt.go.kr/portal/dcboard/DcNewsViewAction.work?cbub_code=000213&gubun=44&scode_kname=&searchOption=&searchWord=&seqnum=27348',
}

const evLossCase = {
  type: '소방청 통계 · 국가화재정보시스템',
  caseNumber: '2020–2024 전기차 화재 223건',
  title: '전기차 화재 발생 증가와 진압·손해확인 공백',
  badge: '소방청 2025. 1. 15. 공개 자료',
  issue: '소방청 국가화재정보시스템 자료에서 최근 5년간 전기차 화재 223건이 집계되어 차량·충전시설·주차장 제3자 손해의 누적 노출을 확인할 수 있습니다.',
  judgment: '공개 통계는 화재 빈도와 추세를 보여주지만 개별 사고의 제조물 결함, 책임 주체, 보험 손해액을 확정하지 않으므로 사고별 원인·손해자료가 추가로 필요합니다.',
  award: '공개 통계에는 개별 손해액이 포함되지 않습니다. 사고별 재산손해·대물손해·영업중단 손해 원문 확인 필요',
  sourceUrl: 'https://www.nfa.go.kr/nfa/news/pressrelease/press/?cntId=2577&mode=view',
}

const aiPrecedent = {
  type: '미국 캘리포니아 북부연방지방법원',
  caseNumber: '3:23-cv-03417-VC',
  title: 'Kadrey et al. v. Meta Platforms, Inc.',
  badge: '2025. 6. 25. 부분적 summary judgment',
  issue: '저작권 보호 저작물을 생성형 AI 학습에 복제한 행위의 공정이용과 저작권자의 잠재적 라이선스 시장 손해가 문제 된 사건입니다.',
  judgment: '법원은 원고들이 AI 학습으로 인한 시장손해를 충분히 입증하지 못했다고 보았지만, 해당 판단이 AI 학습 전반의 적법성을 선언한 것은 아니라고 설명했습니다.',
  award: '해당 판결에서 원고에 대한 손해배상액은 확정되지 않았습니다. 국내 저작권법 적용은 별도 검토가 필요합니다.',
  sourceUrl: 'https://cand.uscourts.gov/cases-e-filing/cases/323-cv-03417-vc/kadrey-et-al-v-meta-platforms-inc',
}

const aiLossCase = {
  type: '미국 캘리포니아 북부연방지방법원 · 집단합의',
  caseNumber: '3:24-cv-05417-AMO',
  title: 'Bartz et al. v. Anthropic PBC',
  badge: '2026. 7. 법원 승인 기록',
  issue: '저작권 보호 도서를 불법 취득·복제하여 AI 학습에 사용했다는 작가·출판권자 측의 손해배상 청구와 집단합의가 문제 된 사건입니다.',
  judgment: '법원 기록에는 비환급성 합의기금 15억 달러와 저작권자·출판권자에 대한 분배 구조가 기재되어 있습니다. 이는 미국 사건의 합의 결과이며 국내 책임이나 보험금 지급을 의미하지 않습니다.',
  award: '합의기금 15억 달러 + 이자. 개별 권리자 지급액은 청구·작품 확인 절차에 따라 달라집니다.',
  sourceUrl: 'https://cand.uscourts.gov/cases-e-filing/cases/324-cv-05417-amo/bartz-et-al-v-anthropic-pbc',
}

export const verifiedRiskLawTrackingOverrides: Record<string, Partial<RiskLawTrackingItem>> = {
  'law-medical-liability-insurance': {
    relatedCaseCount: 1,
    relatedLossCount: 1,
    relatedCases: [medicalPrecedent],
    relatedLossCases: [medicalLossCase],
    checklist: ['법률 제·개정문과 2027. 5. 27. 시행일 확인', '2016다266606·2013다96165 판결의 과실·인과관계·손해액 판단을 별도 검토', '보험 가입 의무와 실제 보상범위·보험료는 하위법령과 약관 확인'],
    evidenceIds: ['LAW-MEDICAL-LIABILITY-20260526', 'SC-2016다266606', 'SC-2013다96165'],
  },
  'law-disaster-mandatory-insurance-standard': {
    relatedCaseCount: 1,
    relatedLossCount: 1,
    relatedCases: [firePrecedent],
    relatedLossCases: [fireLossCase],
    checklist: ['재난안전법 제76조의2와 2026. 1. 27. 업무기준의 보상한도·가입자 관리 기준 확인', '2024가합22263 판결에서 인정된 발화·공작물 하자·피해자 과실 구조 확인', '재난안전의무보험별 실제 가입대상·보상한도·중복보상 여부 확인'],
    evidenceIds: ['LAW-DISASTER-MANDATORY-20260127', 'SC-2024가합22263'],
  },
  'law-ev-fire': {
    sourceType: 'administrative',
    typeLabel: '기후에너지환경부 / 정책성 보험',
    institution: '기후에너지환경부·국토교통부·소방청',
    title: '전기차 화재안심보험 및 배터리 화재 안전관리',
    summary: '2026년 전기차 주차·충전 중 제3자 대물피해를 사고당 100억 원 이상 보장하는 정책성 보험이 추진되고, 배터리 인증·이력관리·무상 안전점검이 병행됩니다.',
    status: '정책성 보험 공모·안전점검 추진',
    expectedEffectiveDate: '2026.07.01 참여 기준',
    lastUpdated: '2026.06.18',
    riskLevel: 'high',
    sourceUrl: 'https://eng.me.go.kr/home/web/board/read.do?boardCategoryId=&boardId=1848920&boardMasterId=939&decorator=&maxIndexPages=10&maxPageItems=10&menuId=10598&orgCd=&pagerOffset=280&searchKey=&searchValue=',
    relatedCaseCount: 0,
    relatedLossCount: 1,
    timeline: [
      { label: '전기차 화재안심보험 공모', stage: 'complete', date: '2026.03.12' },
      { label: '제작사·수입사 참여 기준', stage: 'complete', date: '2026.06.30' },
      { label: '미참여 업체 보조금 기준', stage: 'current', date: '2026.07.01' },
      { label: '배터리·충전시설 안전점검', stage: 'current', date: '2026.06.18' },
    ],
    beforeChanges: [
      { label: '피해 범위', value: '전기차 화재의 제3자 대물손해 책임 주체·보상재원이 사고별로 달라질 수 있음' },
      { label: '공개 손해 데이터', value: '소방청 화재 건수는 확인되지만 사고별 손해액·책임 원인은 별도 확인 필요' },
    ],
    afterChanges: [
      { label: '정책성 보험', value: '주차·충전 중 제3자 대물피해를 사고당 100억 원 이상 보장하는 기준 제시', emphasis: 'red' },
      { label: '참여 유인', value: '2026.07.01 이후 미참여 업체 차량은 전기차 보조금 대상에서 제외', emphasis: 'blue' },
      { label: '안전관리', value: '배터리 인증·이력관리와 제작사 무상 안전점검을 병행', emphasis: 'blue' },
    ],
    changeBadge: '정책성 보험·배터리 안전관리 실제 자료',
    relatedCases: [],
    relatedLossCases: [evLossCase],
    checklist: ['환경부 정책성 보험 지침의 가입대상·우선 적용 보험·보장범위 확인', '소방청 2020~2024 전기차 화재 223건 통계와 사고별 손해자료 분리', '국내 전기차 화재 판례가 확인되기 전까지 제조물 결함·충전사업자 책임을 단정하지 않음'],
    evidenceIds: ['ME-EV-FIRE-INSURANCE-20260312', 'MOLIT-EV-SAFETY-20260618', 'NFA-EV-FIRE-20250115'],
    candidateIds: ['ev-battery-fire'],
  },
  'law-ai-copyright': {
    sourceType: 'administrative',
    typeLabel: '법원·저작권 정책 자료',
    institution: '미국 캘리포니아 북부연방지방법원·대한민국 법원 IP 연구센터',
    title: '생성형 AI 학습데이터 저작권·시장손해 쟁점',
    summary: 'AI 학습데이터의 복제·취득과 잠재적 라이선스 시장 손해를 다룬 해외 판결·집단합의가 공개되어 국내 저작권·방어비용 검토의 비교자료로 연결됩니다.',
    status: '해외 판결·합의 확인 · 국내 적용 별도 검토',
    expectedEffectiveDate: '해당 없음 · 비교 판례·합의',
    lastUpdated: '2026.07',
    riskLevel: 'high',
    sourceUrl: 'https://patent.scourt.go.kr/dcboard/new/DcNewsViewAction.work?gubun=565&seqnum=99',
    relatedCaseCount: 2,
    relatedLossCount: 1,
    timeline: [
      { label: 'AI 학습 저작권 소송 제기', stage: 'complete', date: '2023~2024' },
      { label: 'Kadrey v. Meta 판결', stage: 'complete', date: '2025.06.25' },
      { label: 'Bartz v. Anthropic 집단합의', stage: 'complete', date: '2026.07' },
      { label: '국내 저작권법 적용 검토', stage: 'current', date: '국내 판례·약관 확인 필요' },
    ],
    beforeChanges: [
      { label: '학습데이터', value: '저작물 취득 경위·복제 범위·라이선스 여부를 기업별로 확인해야 함' },
      { label: '손해 범위', value: '저작권 침해 손해·라이선스 시장 손해·방어비용을 분리해야 함' },
    ],
    afterChanges: [
      { label: '비교 판례', value: 'Kadrey v. Meta가 AI 학습과 공정이용·시장손해 입증 쟁점을 제시', emphasis: 'red' },
      { label: '실제 합의', value: 'Bartz v. Anthropic에서 15억 달러 합의기금 법원 기록 확인', emphasis: 'red' },
      { label: '국내 적용', value: '해외 결과를 국내 저작권법·약관·보험 보장 판단으로 직접 확정하지 않음', emphasis: 'blue' },
    ],
    changeBadge: '해외 판결·집단합의 실제 자료',
    relatedCases: [aiPrecedent, aiLossCase],
    relatedLossCases: [aiLossCase],
    checklist: ['미국 판결·합의의 관할과 사실관계를 국내 저작권법과 분리', '학습데이터 출처·라이선스 로그와 생성 결과물의 재현 여부 확보', '저작권 손해·방어비용·영업손실의 실제 청구자료를 별도 검증'],
    evidenceIds: ['SC-IP-AI-20260227', 'US-NDCA-3-23-CV-03417-VC', 'US-NDCA-3-24-CV-05417-AMO'],
    candidateIds: ['generative-ai-copyright'],
  },
}
