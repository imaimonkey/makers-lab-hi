export type RiskCandidateEvidenceSnapshot = {
  sourceName: string
  sourceUrl: string
  sourceDate: string
  scope: string
  facts: string[]
  nextChecks: string[]
}

/**
 * 후보 비교용 위험 설명에 연결하는 공개 원문 기반 사실입니다.
 * 사실 자체와 보험화 판단·PML 추정은 분리하여 표시합니다.
 */
export const riskCandidateEvidenceSnapshots: Record<string, RiskCandidateEvidenceSnapshot> = {
  'ev-battery-fire': {
    sourceName: '소방청 · 리튬이온 배터리 화재 통계',
    sourceUrl: 'https://www.nfa.go.kr/nfa/safetyinfo/lifesafety/stats/0010/',
    sourceDate: '2025 공개 통계 페이지',
    scope: '전기차만의 통계가 아니라 리튬이온 배터리 전체 화재 통계입니다.',
    facts: ['소방청 국가화재정보시스템에서 리튬이온 배터리 화재 통계를 별도 공개', '배터리 화재는 제품·충전·보관·시설 조건을 함께 확인해야 하는 유형', '전기차·충전시설 화재는 내연기관차와 다른 조사·대응 기준이 필요'],
    nextChecks: ['전기차 화재와 일반 리튬이온 배터리 통계를 분리', '지하주차장·충전시설별 실제 손해액과 누적 노출 확인'],
  },
  'generative-ai-copyright': {
    sourceName: '한국저작권위원회 · 생성형 AI 저작권 안내서',
    sourceUrl: 'https://www.copyright.or.kr/notify/notice/view.do?brdclasscode=&brdclasscodeList=&brdctsno=55402&etc1=&etc2=&nationcode=&nationcodeList=&pageIndex=97&searchTarget=ALL&searchText=&searchkeyword=',
    sourceDate: '2026-02-25 공개 안내서',
    scope: '생성형 AI 학습·결과물의 저작권 쟁점을 설명하는 안내 자료입니다.',
    facts: ['생성형 AI 결과물에 의한 저작권 분쟁 예방 안내서가 공개됨', '생성형 AI의 저작물 학습에 대한 저작권법상 공정이용 안내서가 함께 공개됨', '학습 데이터와 결과물의 권리 검토를 분리해 기록할 필요가 있음'],
    nextChecks: ['학습 데이터 출처·라이선스 로그 확인', '분쟁 방어비용과 실제 배상손해를 별도 집계'],
  },
  'commercial-drone': {
    sourceName: '국토교통부 · 드론 실증도시·상용화 지원사업',
    sourceUrl: 'https://www.molit.go.kr/broa/USR/N0201/m_11534/dtl.jsp?id=95090603&lcmspage=3',
    sourceDate: '2025-01-16 보도자료',
    scope: '드론 배송 확대 정책 자료로, 사고 빈도나 손해율을 직접 의미하지는 않습니다.',
    facts: ['국토교통부가 2025년 드론 실증도시 구축·드론 상용화 지원사업 공모를 진행', '드론 배송 상용화와 드론 산업 육성을 정책 과제로 제시', '운항·관제·제3자 손해를 분리한 사고 데이터가 상품화의 전제'],
    nextChecks: ['운항 로그·정비 기록·배송 완료 데이터를 표준화', '제3자 인명·대물 사고와 배송 지연 비용을 분리 확인'],
  },
  'autonomous-level4': {
    sourceName: '국토교통부 · 광주 전역 자율주행 실증',
    sourceUrl: 'https://www.molit.go.kr/USR/NEWS/m_71/dtl.jsp?id=95091997&lcmspage=1',
    sourceDate: '2026-05-13 보도자료',
    scope: '레벨4 실증 목표와 정책 진행 상황을 보여주는 자료입니다.',
    facts: ['국토교통부가 광주 전역에서 자율주행 실증을 본격화한다고 발표', '2027년 레벨4 자율주행 실현 목표가 제시됨', '상용화 전에는 시스템 오류·운영자·제조물 책임의 구분이 필요'],
    nextChecks: ['사고 발생 시 운전자·제조사·운영자 책임 기준 확인', '주행 데이터 보존과 사고 포렌식 비용을 별도 산정'],
  },
  'deepfake-phishing': {
    sourceName: '경찰청 · 보이스피싱 피해·대응 성과 자료',
    sourceUrl: 'https://www.police.go.kr/user/bbs/BD_selectBbs.do?q_bbsCode=1007&q_bbscttSn=20260526143737248&q_currPage=1&q_rowPerPage=12&q_sortName=&q_sortOrder=&q_tab=',
    sourceDate: '2026-05-26 공개 자료',
    scope: '전체 보이스피싱 통계이며 딥페이크·AI 음성 사기만을 분리한 수치는 아닙니다.',
    facts: ['경찰청 자료는 2025년 상반기 보이스피싱 피해액을 6,421억 원으로 제시', '2024년 상반기 피해액은 3,243억 원으로 함께 제시됨', 'AI 음성·영상 사용 여부와 피해자 과실·금융기관 인증 절차를 별도 확인해야 함'],
    nextChecks: ['AI 합성 여부를 판별할 수 있는 수사·금융 로그 확보', '피해자 과실과 금융기관 인증 실패를 보상 기준으로 분리'],
  },
  'urban-flooding': {
    sourceName: '행정안전부 · 집중호우 피해·침수 대응 보도자료',
    sourceUrl: 'https://www.mois.go.kr/frt/bbs/type010/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000008&nttId=128004',
    sourceDate: '2026-07 공개 보도자료',
    scope: '재난 대응 지시 자료로, 개별 계약의 침수 확률이나 보험손해액 통계는 아닙니다.',
    facts: ['행정안전부는 집중호우에 대비해 저지대·지하차도·반지하주택 모니터링을 지시', '배수시설·배수펌프장 점검과 위험지역 주민 대피를 대응 항목으로 제시', '지역·층수·방재시설에 따라 동일 강우의 손해가 달라지는 위험'],
    nextChecks: ['주소·층수·침수이력과 공공 재난정보를 결합', '재난지원금과 보험금의 중복·보상 범위 확인'],
  },
  'enterprise-ransomware': {
    sourceName: '한국인터넷진흥원 · 2024년 하반기 사이버 위협 동향',
    sourceUrl: 'https://www.kisa.or.kr/402/form?page=11&postSeq=2482',
    sourceDate: '2025 공개 보고서',
    scope: 'KISA가 분석한 랜섬웨어 동향으로, 보험 청구 손해율과는 다른 지표입니다.',
    facts: ['KISA 보고서는 2024년 랜섬웨어 감염 195건을 제시', '중견·중소기업 피해가 전체의 94%로 확인됐다고 설명', '복구비·영업중단·개인정보 배상책임을 손해 항목별로 나눌 필요가 있음'],
    nextChecks: ['백업·MFA·보안성숙도별 사고 이력 확인', '공급망·클라우드 동시사고 누적한도 검토'],
  },
  'ess-ups-battery-fire': {
    sourceName: '소방청 · ESS 안전관리·화재 대응 자료',
    sourceUrl: 'https://www.nfa.go.kr/nfa/news/pressrelease/press/?cntId=525&mode=view&pageIdx=1&searchCondition=all',
    sourceDate: '공개 ESS 안전대책 자료',
    scope: 'ESS 화재 안전대책 자료로, 개별 시설의 PML을 직접 산출한 자료는 아닙니다.',
    facts: ['정부는 ESS 사업장에 전기적 보호장치·비상정지·운영환경 관리 조치를 제시', '옥내 ESS에는 방화벽·이격거리 등 추가 안전조치를 요구', 'ESS 안전조치 이행 점검과 소방특별조사를 추진'],
    nextChecks: ['BMS 로그·열폭주 원인·안전점검 이력 확보', '재산손해와 장시간 영업중단 손해를 분리 산정'],
  },
  'heatwave-health-income-loss': {
    sourceName: '질병관리청 · 2026년 온열질환 응급실감시체계',
    sourceUrl: 'https://kdca.go.kr/kdca/2847/subview.do?enc=Zm5jdDF8QEB8JTJGYmJzJTJGa2RjYSUyRjQxJTJGMzExMDYwJTJGYXJ0aWclMjZyZ3NCZ25kZVN0ciUzRCUyNmZpbmRPcG53cmQlM0QlMjZmaW5kV29yZCUzRCUyNnJnc0VuZGRlU3RyJTNEJTI2ZmluZFR5cGUlM0QlMjZwYWdlJTNEMSUyNg%3D%3D',
    sourceDate: '2026-05-14 보도자료',
    scope: '응급실 감시체계 신고 자료이며 전국 온열질환 전수조사 결과는 아닙니다.',
    facts: ['2025년 온열질환자는 4,460명, 추정 사망자는 29명으로 집계됨', '2023년 2,818명에서 2024년 3,704명, 2025년 4,460명으로 증가', '실외 작업장·논밭·길가에서 발생이 많고 65세 이상도 주요 취약집단으로 제시됨'],
    nextChecks: ['기온·작업시간·휴식 이력과 의료비·소득손실을 연결', '산재·건강보험과의 중복 및 객관적 지급 트리거 확인'],
  },
  'platform-worker-transit-accident': {
    sourceName: '고용노동부 · 배달종사자 산업안전·산재보험 자료',
    sourceUrl: 'https://moel.go.kr/news/enews/explain/enewsView.do?news_seq=16956',
    sourceDate: '2024 공개 설명자료',
    scope: '배달종사자 안전·산재보험 제도 자료이며 후보의 보험금 손해율은 별도 확인이 필요합니다.',
    facts: ['플랫폼 운영사에 안전모 착용 지시·과도한 배달시간 제한 금지·교통안전 교육 의무가 안내됨', '관련 위반 시 1,000만 원 이하 과태료가 안내됨', '산재보험 가입자 수가 2023년 6월 11만 명에서 2024년 5월 30만 명으로 증가'],
    nextChecks: ['업무운행·비업무운행을 플랫폼 로그로 구분', '산재·자동차보험·단체보험 간 보상 조정 기준 확인'],
  },
}
