/**
 * mock-risk-data.js
 *
 * 전기차 지하주차장 화재 위험 리포트를 생성하기 위한 입력용 가상데이터.
 * 이 파일에는 AI가 분석하기 전 단계의 정보만 담는다.
 * 상품화 결론, 추천 상품 구조, 최종 약관 문구는 넣지 않는다.
 *
 * 사용 예시:
 *   <script src="./mock-risk-data.js"></script>
 *   <script>
 *     console.log(window.mockRiskData);
 *   </script>
 */

const mockRiskData = {
  schemaVersion: "1.0.0",

  meta: {
    riskId: "RSK-EVFIRE-001",
    analysisMode: "retrospective-benchmark",
    analysisBaseDate: "2026-02-28",
    preparedAt: "2026-07-18T14:30:00+09:00",
    language: "ko-KR",
    dataStatus: "prototype-mock",
    isMockData: true,
    inputEvidenceCount: 9,
    validationMaterialCount: 2,
    badges: ["프로토타입용 가상데이터", "과거 시점 재구성"],
  },

  risk: {
    title: "전기차 배터리 화재",
    shortTitle: "전기차 배터리 화재",
    formalDefinition:
      "전기차가 지하주차장 등에서 주차 또는 충전 중 화재를 일으켜 주변 차량과 건물에 대규모 제3자 재산손해를 발생시키는 위험",
    categories: ["모빌리티", "화재·재물", "복합위험"],
    detectionChannel: "위험 탐색",
    sourcePage: "위험 상세",
    geographicScope: "대한민국",
    primaryEnvironment: "공동주택·업무시설·상업시설의 지하주차장",
    includedOperatingStates: ["주차 중", "충전 중"],
    excludedOperatingStatesForInitialReview: ["일반 도로 주행 중"],
  },

  demoContext: {
    purpose:
      "실제 출시 사례를 과거 시점 기준으로 재구성하여 AI가 상품화 검토 방향과 약관 검토 쟁점을 도출할 수 있는지 확인한다.",
    assumption:
      "2026년 2월 말에 전기차 지하주차장 화재 관련 위험 신호와 기존 보험의 보장 공백 가능성이 탐지되었다고 가정한다.",
    presentationMessage:
      "실제로 최근 보험상품화된 신규 위험 사례를 과거 시점 기준으로 재구성하여, AI가 실제 상품과 유사한 방향을 도출할 수 있는지 검증했습니다.",
    importantRule:
      "실제 전기차화재안심보험의 최종 상품 구조와 약관 문구는 최초 AI 입력에서 제외하고 사후 검증에만 사용한다.",
  },

  selectionPreview: {
    urgencyLabel: "우선 검토 후보",
    oneLineReason:
      "밀폐된 주차공간에서 화재가 확산될 경우 다수 차량과 건물에 집적손해가 발생하고, 발화 원인·책임 확정 전 보상 지연 가능성이 있음",
    expectedDamageTypes: [
      "인접 차량 재산손해",
      "건물·주차장 시설손해",
      "연기·열·소화수에 의한 추가손해",
    ],
    unresolvedQuestions: [
      "발화 차량과 화재 원인을 어떤 기준으로 인정할 것인가?",
      "기존 자동차보험·화재보험 중 어떤 보상을 먼저 적용할 것인가?",
      "원인과 책임이 확정되기 전에도 피해 보완이 가능한가?",
    ],
  },

  riskSignals: [
    {
      id: "SIG-EV-001",
      type: "news-signal",
      title: "지하주차장 전기차 화재와 다수 차량 피해 보도 증가 신호",
      observedAt: "2025-08-15",
      summary:
        "한 대의 차량 화재가 인접 차량과 주차장 설비 피해로 확산되는 사례가 반복적으로 보도된다는 가상 탐지 신호",
      relevance: "집적손해 가능성",
      evidenceStrength: "탐색 신호",
      sourceLabel: "프로토타입용 가상 뉴스 묶음",
      isMockData: true,
    },
    {
      id: "SIG-EV-002",
      type: "industry-signal",
      title: "공동주택 지하주차장 내 전기차 충전·주차 확대",
      observedAt: "2025-09-30",
      summary:
        "전기차와 충전설비가 지하주차장에 함께 밀집하면서 동일 장소에서 다수 재물이 노출되는 상황이 확대된다는 가상 분석",
      relevance: "노출량 증가",
      evidenceStrength: "추가 통계 필요",
      sourceLabel: "프로토타입용 산업 동향 요약",
      isMockData: true,
    },
    {
      id: "SIG-EV-003",
      type: "claims-signal",
      title: "화재 원인 규명 장기화에 따른 보상 지연 가능성",
      observedAt: "2025-11-10",
      summary:
        "배터리·차량·충전설비·외부 요인 중 원인을 구분하는 데 시간이 걸리면 보험별 보상 책임 판단도 늦어질 수 있다는 가상 분쟁 신호",
      relevance: "책임 확정 전 보상 공백",
      evidenceStrength: "판례·분쟁사례 확인 필요",
      sourceLabel: "프로토타입용 분쟁사례 요약",
      isMockData: true,
    },
    {
      id: "SIG-EV-004",
      type: "loss-signal",
      title: "밀폐공간 화재의 열·연기·소화수 손해 확대 가능성",
      observedAt: "2026-01-08",
      summary:
        "직접 연소 피해 외에도 그을음, 열, 연기, 소화활동으로 주변 차량과 건물 설비에 손해가 확대될 수 있다는 가상 손해 시나리오",
      relevance: "손해 유형 다양화",
      evidenceStrength: "손해사정 자료 필요",
      sourceLabel: "프로토타입용 손해 시나리오",
      isMockData: true,
    },
    {
      id: "SIG-EV-005",
      type: "regulation-signal",
      title: "전기차·충전시설 화재안전 관리기준 변화 가능성",
      observedAt: "2026-02-20",
      summary:
        "관련 안전기준이 강화될 경우 위험관리 조건, 인수 기준, 책임 판단에 영향을 줄 수 있다는 가상 제도 변화 신호",
      relevance: "법령·규제 영향",
      evidenceStrength: "공식 법령 확인 필요",
      sourceLabel: "프로토타입용 규제 모니터링",
      isMockData: true,
    },
  ],

  accidentScenario: {
    scenarioId: "SCN-EV-UNDERGROUND-01",
    title: "지하주차장 충전구역 인근 화재 확산 시나리오",
    description:
      "보장대상 여부가 아직 정해지지 않은 전기차 한 대에서 주차 또는 충전 중 화재가 시작되어 인접 차량과 주차장 시설로 손해가 확산되는 상황",
    sequence: [
      "지하주차장에 전기차가 주차 또는 충전 중인 상태",
      "차량 인근에서 연기와 화염이 발생",
      "발화 원인이 확정되지 않은 상태에서 인접 차량으로 열과 연기가 확산",
      "주차장 벽체·배선·소방설비에 손해 발생",
      "자동차보험·자차보험·화재보험 등 여러 보험의 적용 가능성 검토",
      "원인조사와 책임 판단이 지연되며 피해자의 보상 대기 가능성 발생",
    ],
    directDamageCandidates: [
      "인접 차량의 소손·그을음·열 손해",
      "주차장 벽체와 천장 마감재 손해",
      "배선·충전설비·소방설비 손해",
      "연기 및 소화수에 의한 재물손해",
    ],
    indirectDamageCandidates: [
      "주차장 사용 제한",
      "복구기간 중 영업중단",
      "대체 교통·임시주차 비용",
    ],
    initialCoverageScope: {
      included: ["제3자 차량의 직접 재산손해", "건물·주차장 시설의 직접 재산손해"],
      needsSeparateDecision: [
        "발화 차량 자체 손해",
        "신체 상해",
        "영업중단 등 간접손해",
        "소화활동 비용",
      ],
    },
  },

  stakeholders: [
    {
      id: "STK-01",
      role: "전기차 소유자·사용자",
      relationshipToRisk: "차량을 소유·사용하며 화재 사고와 직접 연결될 수 있음",
      possibleInsuranceRole: ["피보험자 후보", "보장대상 차량 등록 주체 후보"],
      keyQuestions: ["차량 관리의무", "불법 개조 여부", "기존 자동차보험 가입 여부"],
    },
    {
      id: "STK-02",
      role: "전기차 제조·수입사",
      relationshipToRisk: "차량·배터리 품질관리 및 집단 위험관리와 관련될 수 있음",
      possibleInsuranceRole: ["보험계약자 후보", "보험료 부담 주체 후보", "구상 대상 후보"],
      keyQuestions: ["대상 차량 선정 방식", "제조결함 확인 시 책임", "보험료 공동부담 가능성"],
    },
    {
      id: "STK-03",
      role: "배터리 제조사",
      relationshipToRisk: "배터리 결함이 발화 원인으로 확인될 경우 책임과 관련될 수 있음",
      possibleInsuranceRole: ["추가 피보험자 후보", "구상 대상 후보"],
      keyQuestions: ["완성차 제조사와의 책임 구분", "결함 판정 기준"],
    },
    {
      id: "STK-04",
      role: "충전사업자",
      relationshipToRisk: "충전기 설치·운영·유지보수 상태가 사고 원인과 관련될 수 있음",
      possibleInsuranceRole: ["추가 피보험자 후보", "구상 대상 후보"],
      keyQuestions: ["충전기 결함", "점검 이력", "차량과 충전설비의 원인 구분"],
    },
    {
      id: "STK-05",
      role: "주차장 소유자·관리자",
      relationshipToRisk: "시설 안전관리와 화재 확산 방지조치에 관여함",
      possibleInsuranceRole: ["피해자 후보", "추가 책임주체 후보"],
      keyQuestions: ["소방설비 작동 여부", "시설 관리책임", "건물 화재보험 가입 여부"],
    },
    {
      id: "STK-06",
      role: "인접 차량·건물 소유자",
      relationshipToRisk: "화재로 직접 재산손해를 입는 제3자",
      possibleInsuranceRole: ["피해자", "보험금 청구권자 후보"],
      keyQuestions: ["직접손해 입증", "자차·화재보험 선보상 여부", "중복보상 방지"],
    },
    {
      id: "STK-07",
      role: "보험회사",
      relationshipToRisk: "자동차·화재·재산·배상책임 담보의 적용과 보상 순서를 검토함",
      possibleInsuranceRole: ["보험자", "선보상 보험자", "구상 참여자"],
      keyQuestions: ["보상 순서", "중복보험 처리", "총보상한도", "재보험 필요성"],
    },
  ],

  existingCoverage: [
    {
      id: "COV-01",
      coverageName: "발화 차량의 자동차보험 대물배상",
      possibleCoverage:
        "차량 소유자·운전자에게 법률상 손해배상책임이 인정되는 경우 제3자 재산손해의 일부를 보상할 가능성",
      uncertainty:
        "주차·충전 중 원인 미상 화재에서 피보험자의 법률상 책임이 성립하는지와 적용 한도 확인 필요",
      questions: ["운행 중 사고 해당 여부", "법률상 책임 요건", "대물 한도"],
      conclusionStatus: "미확정",
    },
    {
      id: "COV-02",
      coverageName: "피해 차량의 자기차량손해 담보",
      possibleCoverage: "피해 차량 소유자가 가입한 담보 조건에 따라 차량 손해를 먼저 보상할 가능성",
      uncertainty: "자기부담금, 가입 여부, 면책 조건과 보상 후 구상 절차 확인 필요",
      questions: ["피해 차량별 가입 여부", "자기부담금", "구상권 행사"],
      conclusionStatus: "미확정",
    },
    {
      id: "COV-03",
      coverageName: "건물의 화재보험·재산종합보험",
      possibleCoverage: "주차장 벽체와 건물 설비 등 보험 목적에 발생한 화재손해를 보상할 가능성",
      uncertainty: "충전설비 포함 여부, 손해 범위, 보험가액과 한도, 대위 절차 확인 필요",
      questions: ["보험 목적의 범위", "충전설비 포함 여부", "영업중단 담보 여부"],
      conclusionStatus: "미확정",
    },
    {
      id: "COV-04",
      coverageName: "생산물배상책임보험",
      possibleCoverage: "차량·배터리 결함이 확인되고 제조사의 법률상 책임이 성립하면 적용될 가능성",
      uncertainty: "결함과 화재 사이의 인과관계 및 제조사별 계약 조건 확인 필요",
      questions: ["결함 판정", "인과관계", "제조사 책임", "보상 한도"],
      conclusionStatus: "미확정",
    },
    {
      id: "COV-05",
      coverageName: "시설소유·관리자 배상책임보험",
      possibleCoverage: "주차장·충전시설 관리상 과실이 인정되는 경우 제3자 손해에 적용될 가능성",
      uncertainty: "시설 관리자의 과실과 화재 확산 사이의 인과관계 확인 필요",
      questions: ["소방설비 관리", "충전시설 점검", "관리상 과실"],
      conclusionStatus: "미확정",
    },
  ],

  coverageGapHypotheses: [
    {
      id: "GAP-01",
      title: "책임 확정 전 보상 지연",
      description:
        "화재 원인과 책임주체를 확정하는 동안 기존 배상책임 담보의 보험금 지급이 지연될 가능성",
      status: "검증 필요",
    },
    {
      id: "GAP-02",
      title: "다수 피해에 따른 보상한도 부족",
      description:
        "한 장소에서 인접 차량과 건물에 손해가 동시에 발생하면 개별 보험의 한도를 초과할 가능성",
      status: "최대예상손실 자료 필요",
    },
    {
      id: "GAP-03",
      title: "보험별 보상 순서 불명확",
      description:
        "자동차보험, 피해 차량의 자차보험, 건물 화재보험, 생산물배상책임보험 사이의 우선 보상과 구상관계가 복잡할 가능성",
      status: "약관 비교 필요",
    },
    {
      id: "GAP-04",
      title: "원인 미상 화재의 처리 기준 부족",
      description:
        "발화 차량이 추정되지만 결함·과실 등 구체적인 원인이 확인되지 않은 경우 보장 인정 기준이 불명확할 가능성",
      status: "법무·손해사정 검토 필요",
    },
    {
      id: "GAP-05",
      title: "손해 범위의 경계",
      description:
        "발화 차량 자체 손해, 신체손해, 소화활동 비용, 영업중단 등 간접손해의 포함 여부가 분리되어야 함",
      status: "상품 범위 결정 필요",
    },
  ],

  insurabilityInputs: {
    marketNeed: {
      observations: [
        "전기차와 지하주차장 충전·주차 노출이 확대되는 방향",
        "다수 피해자에 대한 신속한 재산손해 보완 수요 가능성",
      ],
      missingData: ["전기차 등록대수", "지하주차장 이용 비중", "잠재 가입 대상 규모"],
    },
    fortuity: {
      observations: ["화재의 발생 여부와 시점을 사전에 확정하기 어려움"],
      controlQuestions: ["고의", "불법 개조", "안전점검 미이행", "충전기 임의 조작"],
    },
    lossMeasurability: {
      measurableCandidates: ["차량 수리·교체비", "건물·설비 복구비"],
      difficultCandidates: ["영업중단손해", "사용손실", "다수 피해의 총집적손해"],
    },
    aggregationRisk: {
      observations: ["지하주차장 한 장소에 다수 차량과 건물 설비가 밀집"],
      missingData: ["사고당 최대 피해 차량 수", "평균·최대 건물손해", "최대예상손실"],
    },
    responsibilityClarity: {
      possibleResponsibleParties: [
        "차량 소유자·사용자",
        "전기차 제조·수입사",
        "배터리 제조사",
        "충전사업자",
        "주차장 소유자·관리자",
      ],
      unresolvedIssue: "발화 원인과 화재 확산 원인에 따라 책임주체가 달라질 수 있음",
    },
    moralHazardControls: {
      candidates: [
        "대상 차량 명부 관리",
        "불법 개조 여부 확인",
        "정기점검 이력 확인",
        "사고 조사자료 제출",
        "동일 손해 중복보상 제외",
      ],
      status: "검토안",
    },
    legalAndRegulatory: {
      reviewTopics: [
        "전기차·배터리·충전시설 화재안전기준",
        "자동차보험과 화재보험의 적용 관계",
        "제조물책임과 시설 관리책임",
        "책임 확정 전 피해 보완 구조의 법적 가능성",
        "중복보험·보험자대위·구상권 처리",
      ],
      status: "공식 자료 확인 필요",
    },
  },

  referenceDocuments: {
    includedInAiInput: [
      {
        id: "DOC-FIRE-BIZ-SUMMARY",
        displayName: "무배당 현대해상다이렉트H사업장화재보험(Hi2601) 상품요약서",
        uploadedFileName: "20260109162940584.pdf",
        documentType: "보험 상품요약서",
        useScope: "건물·시설 화재손해와 배상책임 보장 구조 참고",
        sourceStatus: "사용자 제공 실제 자료",
        includedInAiInput: true,
      },
      {
        id: "DOC-FIRE-BIZ-METHOD",
        displayName: "무배당 현대해상다이렉트H사업장화재보험(Hi2601) 사업방법서 별지",
        uploadedFileName: "20260109162931572.pdf",
        documentType: "보험 사업방법서",
        useScope: "상품 대상, 보험기간, 특별약관 구성 방식 참고",
        sourceStatus: "사용자 제공 실제 자료",
        includedInAiInput: true,
      },
      {
        id: "DOC-HOME-FIRE-SUMMARY",
        displayName: "주택화재보험 상품요약서",
        uploadedFileName: "e2f5f2145beeb607c5aac6dbaf03a24c.pdf",
        documentType: "보험 상품요약서",
        useScope: "개인 소유 재산의 화재손해와 배상책임 구조 참고",
        sourceStatus: "사용자 제공 실제 자료",
        includedInAiInput: true,
      },
      {
        id: "DOC-HOME-FIRE-METHOD",
        displayName: "주택화재보험 사업방법서 별지",
        uploadedFileName: "b8382389bd5b1bb4047062b1c2c18ab3.pdf",
        documentType: "보험 사업방법서",
        useScope: "개인보험 대상과 계약 구조 참고",
        sourceStatus: "사용자 제공 실제 자료",
        includedInAiInput: true,
      },
    ],
    validationOnly: [
      {
        id: "DOC-EV-FIRE-METHOD",
        displayName: "전기차화재안심보험 사업방법서 별지",
        uploadedFileName: "56257e09f9db6c5682c0ef0fbf4976ec.pdf",
        documentType: "사후 검증자료",
        useScope: "AI 결과와 실제 상품의 대상·보장 사고·상품 구조 비교",
        sourceStatus: "사용자 제공 실제 자료",
        includedInAiInput: false,
        exclusionReason: "정답 유출 방지를 위해 최초 AI 입력에서 제외",
      },
      {
        id: "DOC-EV-FIRE-TERMS",
        displayName: "전기차화재안심보험 약관 또는 상품 설명자료",
        uploadedFileName: "16acdacf0b3ee0e06d612e485f60923d.pdf",
        documentType: "사후 검증자료",
        useScope: "AI 약관 검토용 문구와 실제 약관의 공통점·차이점 비교",
        sourceStatus: "사용자 제공 실제 자료",
        includedInAiInput: false,
        exclusionReason: "정답 유출 방지를 위해 최초 AI 입력에서 제외",
      },
    ],
  },

  evidenceItems: [
    {
      id: "EVD-001",
      type: "뉴스",
      title: "지하주차장 전기차 화재 확산 관련 가상 뉴스 묶음",
      source: "프로토타입용 가상자료",
      referenceDate: "2025-08-15",
      usedFor: ["위험 탐지", "집적손해 가능성"],
      reliability: "탐색 신호",
      isMockData: true,
    },
    {
      id: "EVD-002",
      type: "산업동향",
      title: "지하주차장 전기차·충전설비 노출 확대 가상 요약",
      source: "프로토타입용 가상자료",
      referenceDate: "2025-09-30",
      usedFor: ["시장 노출", "잠재 수요"],
      reliability: "공식 통계 보완 필요",
      isMockData: true,
    },
    {
      id: "EVD-003",
      type: "분쟁사례",
      title: "발화 원인 규명 지연과 보상 공백 가상 사례",
      source: "프로토타입용 가상자료",
      referenceDate: "2025-11-10",
      usedFor: ["책임주체", "보상 지연"],
      reliability: "판례·공식 분쟁자료 보완 필요",
      isMockData: true,
    },
    {
      id: "EVD-004",
      type: "손해시나리오",
      title: "열·연기·소화수에 따른 재산손해 확산 가상 시나리오",
      source: "프로토타입용 가상자료",
      referenceDate: "2026-01-08",
      usedFor: ["손해 유형", "손해 측정 가능성"],
      reliability: "손해사정 자료 보완 필요",
      isMockData: true,
    },
    {
      id: "EVD-005",
      type: "법령·규제",
      title: "전기차·충전시설 화재안전기준 변화 가상 모니터링",
      source: "프로토타입용 가상자료",
      referenceDate: "2026-02-20",
      usedFor: ["규제 영향", "위험관리 조건"],
      reliability: "공식 법령 확인 필요",
      isMockData: true,
    },
    {
      id: "EVD-006",
      type: "보험약관",
      title: "사업장화재보험 상품요약서",
      source: "사용자 제공 실제 자료",
      referenceDate: null,
      usedFor: ["화재손해", "시설 배상책임", "특별약관 구조"],
      reliability: "실제 보험자료",
      isMockData: false,
    },
    {
      id: "EVD-007",
      type: "보험 사업방법서",
      title: "사업장화재보험 사업방법서 별지",
      source: "사용자 제공 실제 자료",
      referenceDate: null,
      usedFor: ["상품 구조", "보험기간", "가입 대상"],
      reliability: "실제 보험자료",
      isMockData: false,
    },
    {
      id: "EVD-008",
      type: "보험약관",
      title: "주택화재보험 상품요약서",
      source: "사용자 제공 실제 자료",
      referenceDate: null,
      usedFor: ["개인 재산손해", "화재 배상책임"],
      reliability: "실제 보험자료",
      isMockData: false,
    },
    {
      id: "EVD-009",
      type: "보험 사업방법서",
      title: "주택화재보험 사업방법서 별지",
      source: "사용자 제공 실제 자료",
      referenceDate: null,
      usedFor: ["개인보험 구조", "가입 대상 비교"],
      reliability: "실제 보험자료",
      isMockData: false,
    },
  ],

  missingResearch: [
    {
      id: "MIS-01",
      priority: "높음",
      topic: "국내 전기차 화재 건수와 주차·충전 상태별 발생 비중",
      reason: "사고 빈도와 위험률 검토에 필요",
    },
    {
      id: "MIS-02",
      priority: "높음",
      topic: "지하주차장 사고당 평균·최대 재산손해액",
      reason: "집적손해와 보상한도 검토에 필요",
    },
    {
      id: "MIS-03",
      priority: "높음",
      topic: "발화 원인 미상으로 종결된 사고 비율과 판정 기준",
      reason: "보험사고 인정 기준과 약관 문구 작성에 필요",
    },
    {
      id: "MIS-04",
      priority: "높음",
      topic: "기존 자동차·화재·재산·생산물배상책임보험의 실제 보상 사례",
      reason: "보장 공백과 중복보험 처리 확인에 필요",
    },
    {
      id: "MIS-05",
      priority: "중간",
      topic: "차량 소유자·제조사·충전사업자·시설 관리자의 책임 판례와 분쟁사례",
      reason: "책임주체와 구상관계 검토에 필요",
    },
    {
      id: "MIS-06",
      priority: "중간",
      topic: "전기차·배터리·충전시설 관련 화재안전기준과 제도 변화",
      reason: "인수조건과 법령·규제 영향 검토에 필요",
    },
    {
      id: "MIS-07",
      priority: "중간",
      topic: "최대예상손실과 재보험 필요성",
      reason: "집적위험 관리와 상품 수용능력 검토에 필요",
    },
  ],

  analysisQuestions: [
    "이 위험은 보험상품으로 검토할 수 있는가?",
    "개인보험, 기업보험, 혼합형 중 어떤 대상 구조가 더 적합한가?",
    "보험계약자·피보험자·피해자·위험관리 주체를 어떻게 구분해야 하는가?",
    "기존 보험이 보상할 수 있는 부분과 남는 보장 공백은 무엇인가?",
    "별도 상품, 기존 상품 특약, 단체계약 또는 정책연계형 중 어떤 방향을 검토할 수 있는가?",
    "보험사고와 보험금 지급조건을 모호하지 않은 약관 문장으로 표현할 수 있는가?",
    "상품화 전에 추가로 확보해야 할 데이터·법률·규제 정보는 무엇인가?",
  ],

  expectedReportSections: [
    "aiSummary",
    "riskGapSummary",
    "targetSuitability",
    "productFeasibility",
    "productProposal",
    "wordingFeasibility",
    "evidence",
    "missingResearch",
  ],

  aiGuardrails: {
    useOnlyProvidedInformation: true,
    doNotInventStatistics: true,
    doNotInventSources: true,
    doNotInventLawsOrPrecedents: true,
    separateEvidenceFromInference: true,
    markInsufficientEvidenceAs: "근거 부족",
    noFinalLaunchDecision: true,
    noFinalPremiumOrRate: true,
    noFinalCoverageLimit: true,
    noFinalLegalOpinion: true,
    wordingMustBeLabeled: "AI가 생성한 검토용 초안",
    exclusionsMustBeLabeled: "면책 검토 후보",
    validationMaterialsExcludedFromInitialInput: true,
  },

  uiConfig: {
    defaultSelected: true,
    reportButtonLabel: "리포트 생성",
    loadingSteps: [
      "위험 및 보장 공백을 확인하고 있습니다.",
      "보험 대상과 상품 방향을 검토하고 있습니다.",
      "기존 약관과 유사 보장을 비교하고 있습니다.",
      "검토용 리포트를 생성하고 있습니다.",
    ],
    mockLoadingDurationMs: 2200,
  },

  disclaimer:
    "본 데이터는 화면 시연과 AI 리포트 생성 테스트를 위한 프로토타입용 입력자료입니다. 실제 통계, 법률 판단, 보험상품 출시 결정 또는 최종 약관으로 사용할 수 없습니다.",
};

// 일반 <script> 태그 방식에서 사용할 수 있도록 전역 객체로 노출한다.
if (typeof window !== "undefined") {
  window.mockRiskData = mockRiskData;
}

// Node.js에서 간단한 검증이나 테스트를 할 때 사용할 수 있도록 지원한다.
if (typeof module !== "undefined" && module.exports) {
  module.exports = mockRiskData;
}
