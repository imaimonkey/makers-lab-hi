/**
 * mock-report-result.js
 *
 * mock-risk-data.js를 AI가 분석한 뒤 반환한 것처럼 보여주는
 * 전기차 지하주차장 화재 위험의 완성 리포트 가상 결과값이다.
 *
 * 중요:
 * - 모든 결론과 약관 문구는 프로토타입용 AI 생성 초안이다.
 * - 실제 상품 출시 결정, 보험료·요율·보상한도 산출, 최종 약관이 아니다.
 * - 전기차화재안심보험 자료는 최초 AI 입력에서 제외하고 사후 검증에만 사용한다.
 *
 * 사용 예시:
 *   <script src="./mock-report-result.js"></script>
 *   <script>
 *     console.log(window.mockReportResult);
 *   </script>
 */

const mockReportResult = {
  schemaVersion: "1.0.0",

  meta: {
    reportId: "RPT-EVFIRE-001-20260228",
    sourceRiskId: "RSK-EVFIRE-001",
    title: "전기차 지하주차장 화재 위험 상품화 검토 리포트",
    riskTitle: "전기차 지하주차장 주차·충전 중 화재",
    riskCategories: ["모빌리티", "화재·재물", "복합위험"],
    analysisMode: "retrospective-benchmark",
    analysisBaseDate: "2026-02-28",
    generatedAt: "2026-07-18T14:30:00+09:00",
    evidenceCount: 9,
    aiStatus: "AI 생성 초안",
    dataStatus: "프로토타입용 가상데이터",
    isMockData: true,
    badges: ["AI 생성 초안", "프로토타입용 가상데이터", "과거 시점 재구성"],
    disclaimer:
      "이 리포트는 가상 입력데이터를 바탕으로 생성한 의사결정 지원용 초안입니다. 실제 보험상품 출시 결정, 보험료·요율 산출, 최종 약관 또는 법률 의견으로 사용할 수 없습니다.",
  },

  aiSummary: {
    decisionLabel: "조건부 우선 검토",
    primaryConclusionReason:
      "대형 집적손해와 기존 보험의 보상 지연·공백 가능성이 확인됐지만, 책임 기준과 손해 자료를 보완해야 다음 단계로 진입할 수 있습니다.",
    cards: [
      {
        id: "target",
        label: "보험 대상",
        result: "혼합형",
        status: "조건부 검토",
        shortReason: "기업·기관 계약과 차량 단위 보장을 결합하는 구조 검토",
        detail:
          "개별 차량 소유자만 가입하는 구조보다 제조·수입사, 협회 또는 기관이 계약 주체가 되고 대상 차량과 제3자 피해를 연결하는 단체형 구조가 위험의 집단성과 피해자 보호 목적에 더 부합할 가능성이 있습니다.",
        evidenceIds: ["EVD-002", "EVD-006", "EVD-008"],
        caveat: "보험계약자, 피보험자, 보험료 부담 주체는 별도로 확정해야 합니다.",
      },
      {
        id: "productDirection",
        label: "상품 방향",
        result: "보완보험",
        status: "조건부 검토",
        shortReason: "기존 자동차·화재보험 보상 후 공백과 초과손해 보완",
        detail:
          "기존 자동차보험, 피해 차량의 자기차량손해 담보, 건물 화재보험 등을 우선 검토한 뒤 남는 제3자 직접 재산손해를 보완하는 단체계약 또는 정책연계형 구조를 우선 검토할 수 있습니다.",
        evidenceIds: ["EVD-006", "EVD-007", "EVD-008", "EVD-009"],
        caveat: "기존 보험의 보상 순서와 중복보험 처리 기준을 약관으로 명확히 해야 합니다.",
      },
      {
        id: "wording",
        label: "약관화 가능성",
        result: "조건부 가능",
        status: "조건부 검토",
        shortReason: "사고와 손해는 정의 가능하나 발화·보상 기준 확정 필요",
        detail:
          "보장대상 전기차, 주차·충전 중 화재, 제3자 직접 재산손해는 문장으로 구체화할 수 있습니다. 다만 원인 미상 화재의 인정 기준, 기존 보험의 우선 보상, 하나의 사고 정의가 필요합니다.",
        evidenceIds: ["EVD-003", "EVD-006", "EVD-008"],
        caveat: "상품·법무·손해사정 담당자의 검토가 필요합니다.",
      },
      {
        id: "dataReadiness",
        label: "데이터 준비도",
        result: "보완 필요",
        status: "보완 필요",
        shortReason: "화재 빈도, 집적손해 및 최대예상손실 자료 부족",
        detail:
          "화재 건수만으로는 보험료와 보상한도를 검토하기 어렵습니다. 주차·충전 상태별 사고 빈도, 다수 차량 피해 규모, 건물손해 및 최대예상손실 자료가 필요합니다.",
        evidenceIds: ["EVD-001", "EVD-002", "EVD-004"],
        caveat: "이 리포트에서는 보험료·요율·보상한도 수치를 제시하지 않습니다.",
      },
    ],
    overallOpinion:
      "전기차가 지하주차장에서 주차 또는 충전 중 화재를 일으킬 경우 주변 차량과 건물에 대규모 재산손해가 확산될 수 있습니다. 기존 자동차보험·화재보험에서 일부 손해를 보상할 수 있으나 발화 원인과 책임 확정이 지연되거나 다수 피해가 발생하면 보상 순서와 한도에 공백이 생길 가능성이 있습니다. 기업·기관이 계약 주체가 되고 보장대상 전기차와 제3자 재산손해를 연결하는 보완보험 구조를 우선 검토할 수 있습니다. 다만 발화 차량의 판정 기준, 기존 보험과의 중복 처리, 집적손해 규모와 요율 자료를 추가로 확인해야 합니다.",
    recommendedNextAction:
      "기존 보험의 실제 보상 사례와 지하주차장 최대예상손실 자료를 확보한 뒤 피해보완형 구조의 법률·약관 검토를 진행합니다.",
    nextActions: [
      {
        id: "NEXT-01",
        action: "기존 보험의 실제 보상 순서와 구상 관계를 비교 검토합니다.",
        reason: "피해보완형 구조가 기존 자동차·화재보험과 중복되지 않는지 판단해야 합니다.",
        evaluationIds: ["responsibility", "differentiation"],
        evidenceIds: ["EVD-006", "EVD-007", "EVD-008"],
        responsibleTeams: ["상품개발", "약관·법무", "보상"],
      },
      {
        id: "NEXT-02",
        action: "지하주차장 집적손해와 최대예상손실 자료를 확보합니다.",
        reason: "상품 구조의 수용 가능성과 계리 검토 범위를 정하기 위한 선행 조건입니다.",
        evaluationIds: ["dataAvailability", "measurability"],
        evidenceIds: ["EVD-001", "EVD-002", "EVD-004"],
        responsibleTeams: ["계리", "재보험", "상품개발"],
      },
    ],
    additionalConfirmations: [
      {
        id: "CONF-01",
        title: "책임 확정 전 보상 구조",
        whatToConfirm: "원인 미상 화재에서 발화 차량 확인, 선보상 가능 범위와 구상 절차",
        whyNeeded: "책임주체가 확정되기 전 피해보완형 보장의 지급 요건을 정해야 합니다.",
        requiredMaterials: ["유사 사고 보상 사례", "손해사정 기준", "관련 약관"],
        responsibleTeams: ["약관·법무", "보상", "손해사정"],
        evidenceIds: ["EVD-003", "EVD-006", "EVD-008"],
      },
      {
        id: "CONF-02",
        title: "집적손해 자료와 대상 집단",
        whatToConfirm: "주차·충전 상태별 사고 빈도, 다수 차량·시설 손해 분포, 대상 차량 명부 관리 가능성",
        whyNeeded: "보험 대상과 인수 기준, 향후 계리 검토 범위를 판단해야 합니다.",
        requiredMaterials: ["사고통계", "손해액 분포", "대상 차량·시설 현황"],
        responsibleTeams: ["계리", "재보험", "상품개발"],
        evidenceIds: ["EVD-001", "EVD-002", "EVD-004"],
      },
    ],
  },

  riskGapSummary: {
    definition:
      "전기차가 지하주차장 등에서 주차 또는 충전 중 화재를 일으켜 주변 차량과 건물에 대규모 제3자 재산손해를 발생시키는 위험",
    whyNow: [
      "전기차 보급과 지하주차장 내 충전·주차 노출이 확대되는 방향입니다.",
      "밀폐된 공간에서 화재가 발생하면 다수 차량과 건물 설비에 손해가 확산될 수 있습니다.",
      "배터리, 차량, 충전설비, 외부 요인 중 발화 원인을 구분하는 데 시간이 걸릴 수 있습니다.",
      "원인과 법률상 책임이 확정되기 전에 피해자의 보상이 지연될 가능성이 있습니다.",
    ],
    damageTypes: [
      {
        id: "DMG-01",
        name: "인접 차량 재산손해",
        examples: ["소손", "그을음", "열 손해", "소화수 손해"],
        initialScope: "우선 검토",
      },
      {
        id: "DMG-02",
        name: "건물·주차장 시설손해",
        examples: ["벽체", "천장 마감재", "배선", "소방설비"],
        initialScope: "우선 검토",
      },
      {
        id: "DMG-03",
        name: "발화 차량 자체 손해",
        examples: ["차량 전손", "배터리 교체"],
        initialScope: "초기 보장범위에서 제외 검토",
      },
      {
        id: "DMG-04",
        name: "신체·간접손해",
        examples: ["신체 상해", "영업중단", "사용손실", "대체비용"],
        initialScope: "별도 담보 여부 검토",
      },
    ],
    affectedParties: [
      "인접 차량 소유자",
      "건물·주차장 소유자 또는 관리주체",
      "전기차 소유자·사용자",
      "전기차 제조·수입사",
      "배터리 제조사",
      "충전사업자",
      "관련 보험회사",
    ],
    existingCoverageMap: [
      {
        id: "COV-01",
        damage: "인접 차량의 직접 재산손해",
        coverageName: "발화 차량의 자동차보험 대물배상",
        possibleCoverage:
          "차량 소유자·운전자에게 법률상 손해배상책임이 인정되면 제3자 재산손해 일부를 보상할 가능성이 있습니다.",
        remainingGap:
          "주차·충전 중 원인 미상 화재에서 법률상 책임 성립 여부와 보상한도 확인이 필요합니다.",
        status: "조건 확인 필요",
      },
      {
        id: "COV-02",
        damage: "피해 차량의 수리·교체 손해",
        coverageName: "피해 차량의 자기차량손해 담보",
        possibleCoverage: "피해 차량 소유자의 가입 조건에 따라 차량 손해를 먼저 보상할 가능성이 있습니다.",
        remainingGap: "미가입 차량, 자기부담금, 면책 조건과 보상 후 구상 절차가 남을 수 있습니다.",
        status: "조건 확인 필요",
      },
      {
        id: "COV-03",
        damage: "건물·주차장 시설의 직접 화재손해",
        coverageName: "건물 화재보험·재산종합보험",
        possibleCoverage: "건물과 주차장 시설의 직접 화재손해를 보상할 가능성이 있습니다.",
        remainingGap:
          "충전설비 포함 여부, 보험가액·한도, 간접손해 및 보상 후 대위 절차를 확인해야 합니다.",
        status: "조건 확인 필요",
      },
      {
        id: "COV-04",
        damage: "결함 관련 제3자 재산손해",
        coverageName: "생산물배상책임보험",
        possibleCoverage:
          "차량·배터리 결함과 제조사의 법률상 책임이 확인되면 적용될 가능성이 있습니다.",
        remainingGap: "결함과 인과관계를 확정하기 전에는 보상이 지연될 수 있습니다.",
        status: "원인 확인 필요",
      },
      {
        id: "COV-05",
        damage: "시설 관리상 과실 관련 손해",
        coverageName: "시설소유·관리자 배상책임보험",
        possibleCoverage: "주차장 또는 충전시설의 관리상 과실이 인정되면 적용될 가능성이 있습니다.",
        remainingGap: "시설 관리상 과실과 화재 확산 사이의 인과관계가 필요합니다.",
        status: "책임 확인 필요",
      },
    ],
    keyCoverageGaps: [
      {
        id: "GAP-01",
        title: "책임 확정 전 보상 지연",
        description:
          "원인과 책임주체를 확정하는 동안 기존 배상책임 담보의 지급이 지연될 수 있습니다.",
        importance: "높음",
      },
      {
        id: "GAP-02",
        title: "다수 피해에 따른 한도 부족",
        description:
          "동일 장소의 다수 차량과 건물에 손해가 동시에 발생하면 개별 보험 한도를 초과할 수 있습니다.",
        importance: "높음",
      },
      {
        id: "GAP-03",
        title: "보험별 보상 순서와 구상관계",
        description:
          "자동차보험·자차보험·화재보험·생산물배상책임보험 간 우선 보상과 구상관계가 복잡할 수 있습니다.",
        importance: "높음",
      },
      {
        id: "GAP-04",
        title: "원인 미상 화재 인정 기준",
        description:
          "발화 차량은 추정되지만 구체적인 결함·과실이 확인되지 않은 사고의 인정 기준이 필요합니다.",
        importance: "높음",
      },
      {
        id: "GAP-05",
        title: "손해 범위 경계",
        description:
          "발화 차량 자체 손해, 신체손해, 소화활동 비용과 영업중단손해의 포함 여부를 구분해야 합니다.",
        importance: "중간",
      },
    ],
  },

  targetSuitability: {
    recommendation: "혼합형",
    recommendationLabel: "혼합형 단체계약 구조 우선 검토",
    options: [
      {
        id: "corporate",
        target: "기업보험",
        suitability: "적합",
        rank: 2,
        reason:
          "제조·수입사, 관련 협회 또는 기관을 계약 주체로 하면 대상 차량을 집단으로 관리하고 위험 분산과 피해자 보호 체계를 구성하기 쉽습니다.",
        limitation:
          "실제 차량 소유자와 제3자 피해가 보장에 어떻게 연결되는지 별도 정의가 필요합니다.",
      },
      {
        id: "individual",
        target: "개인보험",
        suitability: "부분 적합",
        rank: 3,
        reason:
          "개인 전기차 소유자도 위험과 직접 연결되며 차량 단위로 대상 식별이 가능합니다.",
        limitation:
          "개별 가입만으로는 미가입 차량, 역선택, 다수 피해자에 대한 신속 보상 문제를 해결하기 어려울 수 있습니다.",
      },
      {
        id: "hybrid",
        target: "혼합형",
        suitability: "추천",
        rank: 1,
        reason:
          "기업·기관이 단체계약을 체결하고 대상 차량 명부를 통해 개인·사업자 차량 소유자와 제3자 피해를 연결하는 구조가 위험의 집단성과 피해보완 목적에 가장 부합합니다.",
        limitation:
          "계약자, 피보험자, 보험료 부담 주체, 보험금 청구권자를 법률적으로 구분해야 합니다.",
      },
    ],
    roleStructure: [
      {
        role: "예상 보험계약자",
        candidates: ["전기차 제조·수입사", "관련 협회", "정책 수행기관"],
        status: "검토안",
        question: "위험 집단 관리와 보험료 부담을 맡을 주체는 누구인가?",
      },
      {
        role: "예상 피보험자",
        candidates: ["대상 차량 명부에 기재된 전기차 소유자·사용자"],
        status: "검토안",
        question: "법률상 책임을 담보할지, 차량과 손해를 직접 연결할지에 따라 달라질 수 있습니다.",
      },
      {
        role: "주요 피해자",
        candidates: ["인접 차량 소유자", "건물·주차장 소유자 또는 관리주체"],
        status: "우선 보호 대상",
        question: "피해자가 보험금을 직접 청구할 수 있는 구조인지 검토해야 합니다.",
      },
      {
        role: "위험관리 주체",
        candidates: ["제조·수입사", "차량 소유자", "충전사업자", "주차장 관리주체"],
        status: "공동 관리",
        question: "인수조건과 사고 예방의무를 역할별로 구분해야 합니다.",
      },
      {
        role: "보험료 부담 주체",
        candidates: ["제조·수입사", "공공 지원", "관련 기관과의 공동부담"],
        status: "추가 검토",
        question: "개별 차량 소유자 부담을 포함할지는 정책·시장성 검토가 필요합니다.",
      },
    ],
    caution:
      "보험계약자, 피보험자, 보험수익자와 피해자는 같은 의미가 아닙니다. 최종 역할은 상품·법무 검토 후 확정해야 합니다.",
  },

  productFeasibility: {
    overallStatus: "조건부 검토",
    overallAssessment: {
      conclusion:
        "보장 공백과 대상 수요는 확인되지만, 책임 확정 전 보상 기준과 집적손해 자료를 보완한 뒤 다음 단계로 진입해야 합니다.",
      strengths: ["대형 집적손해의 보장 공백", "혼합형 단체계약 검토 가능성", "정의 가능한 보장 사고·손해 범위"],
      improvements: ["책임주체와 지급 요건", "집적손해·최대예상손실 자료", "기존 보험과의 우선 보상 기준"],
      entryConditions: ["유사 사고 보상 사례 확보", "사고·손해 분포 확인", "약관·법무 검토 착수"],
    },
    items: [
      {
        id: "marketability",
        criterion: "시장성",
        status: "양호",
        judgment:
          "전기차 보급과 공동주택·업무시설의 지하주차장 노출이 확대되면 잠재 보장 수요가 커질 가능성이 있습니다.",
        evidenceIds: ["EVD-001", "EVD-002"],
        additionalChecks: ["전기차 등록대수", "지하주차장 이용 비중", "잠재 대상 차량 규모"],
      },
      {
        id: "fortuity",
        criterion: "우연성",
        status: "양호",
        judgment:
          "화재의 발생 여부와 시점을 사전에 확정하기 어려워 우연한 사고 구조로 검토할 수 있습니다.",
        evidenceIds: ["EVD-001", "EVD-004"],
        additionalChecks: ["고의·불법 개조 통제", "안전점검 미이행 처리"],
      },
      {
        id: "measurability",
        criterion: "손해 측정 가능성",
        status: "조건부",
        judgment:
          "차량 수리·교체비와 건물·설비 복구비는 산정할 수 있으나 다수 피해와 간접손해의 범위는 별도 정의가 필요합니다.",
        evidenceIds: ["EVD-004", "EVD-006", "EVD-008"],
        additionalChecks: ["직접손해 정의", "손해사정 기준", "간접손해 포함 여부"],
      },
      {
        id: "responsibility",
        criterion: "책임주체 명확성",
        status: "보완 필요",
        judgment:
          "발화 원인에 따라 차량 소유자, 제조사, 배터리 제조사, 충전사업자 또는 시설 관리자의 책임이 달라질 수 있습니다.",
        evidenceIds: ["EVD-003"],
        additionalChecks: ["관련 판례", "결함 판정", "시설 관리상 과실", "구상권 처리"],
      },
      {
        id: "moralHazard",
        criterion: "도덕적 해이 통제",
        status: "조건부",
        judgment:
          "대상 차량 명부, 불법 개조, 점검 이력, 사고 조사자료와 중복보상 제외 조건으로 일부 통제할 수 있습니다.",
        evidenceIds: ["EVD-006", "EVD-007"],
        additionalChecks: ["인수질문", "안전관리 의무", "면책의 명확성"],
      },
      {
        id: "dataAvailability",
        criterion: "데이터 확보 가능성",
        status: "보완 필요",
        judgment:
          "화재 건수 외에 주차·충전 상태별 빈도, 지하주차장 집적손해, 원인 미상 비율과 최대예상손실 자료가 필요합니다.",
        evidenceIds: ["EVD-001", "EVD-002", "EVD-004"],
        additionalChecks: ["사고통계", "손해액 분포", "최대예상손실", "재보험 자료"],
      },
      {
        id: "differentiation",
        criterion: "기존 보험과의 차별성",
        status: "조건부",
        judgment:
          "기존 자동차·화재·재산·생산물배상책임보험의 보상 후 남는 공백과 책임 확정 전 피해보완 기능을 명확히 해야 합니다.",
        evidenceIds: ["EVD-006", "EVD-007", "EVD-008", "EVD-009"],
        additionalChecks: ["중복보험", "우선 보상", "구상관계", "기존 특약 비교"],
      },
      {
        id: "regulation",
        criterion: "법령·규제 영향",
        status: "보완 필요",
        displayStatus: "추가 확인",
        judgment:
          "전기차·충전시설 화재안전기준과 자동차·보험 관련 제도 변화가 인수조건과 책임 판단에 영향을 줄 수 있습니다.",
        evidenceIds: ["EVD-005"],
        additionalChecks: ["공식 법령", "감독규정", "책임 확정 전 보상 구조의 법적 검토"],
      },
    ],
    interpretation:
      "상품화 검토는 가능하지만 데이터, 책임주체, 기존 보험과의 관계 및 약관 핵심 용어를 보완한 뒤 다음 단계로 이동해야 합니다.",
  },

  productProposal: {
    status: "AI 제안 검토안",
    workingName: "전기차 화재 제3자 재산손해 보완보험",
    recommendedForm: "기업·기관 단체계약 또는 정책연계형 보완보험",
    alternativeForms: [
      "기존 자동차보험 또는 화재보험에 부가하는 특별약관",
      "제조·수입사 단체계약",
      "관련 협회 또는 기관을 통한 단체계약",
    ],
    expectedPolicyholder: ["전기차 제조·수입사", "관련 협회", "정책 수행기관"],
    expectedInsured:
      "보험증권 또는 대상 차량 명부에 기재된 전기자동차의 소유자·사용자 중 상품 구조에 따라 확정",
    coveredObject: "보험증권 또는 대상 차량 명부에 기재된 전기자동차",
    coveredEvent:
      "보장대상 전기차가 보험기간 중 지하주차장 등에서 주차 또는 충전 중 발생시킨 화재",
    coveredLoss:
      "화재로 제3자의 자동차 또는 건물 등 재물에 발생한 직접 재산손해 중 약관에서 정한 손해",
    existingInsuranceRelationship:
      "자동차보험·피해 차량의 자기차량손해 담보·건물 화재보험 등 기존 보험의 적용 여부와 보상액을 확인한 후 남는 공백 또는 약정한 초과손해를 보완하는 방향을 검토",
    settlementDirection:
      "피해자 신속 보상을 위해 책임 확정 전 지급 가능성을 검토하되, 지급요건과 이후 제조사·충전사업자·시설 관리자 등에 대한 구상관계를 약관으로 정해야 합니다.",
    policyPeriodDirection: "단체계약 1년과 대상 차량별 보장기간을 연계하는 방안 검토",
    coverageLimitDirection:
      "지하주차장 최대예상손실, 사고당 피해 차량 수, 건물손해 및 기존 보험 한도를 바탕으로 별도 산정 필요",
    deductibleDirection:
      "피해자 신속 보상 목적과 소액손해 관리의 균형을 고려하여 적용 여부를 별도 검토",
    underwritingCandidates: [
      "대상 차량 식별정보와 명부 관리",
      "차량·배터리 불법 개조 여부",
      "제조사 리콜 및 점검 이력",
      "충전설비 안전점검 체계",
      "주차장 소방설비와 위험관리 수준",
    ],
    outOfScopeCandidates: [
      "보장대상 전기차 자체 손해",
      "제3자의 신체 상해",
      "영업중단·사용손실 등 간접손해",
      "일반 도로 주행 중 사고",
    ],
    recommendationReason:
      "개별 차량의 위험과 지하주차장 집적손해를 함께 관리하고, 기존 보험의 보상 이후에도 남을 수 있는 제3자 직접 재산손해를 보완하기 위해 단체형 보완보험 구조를 우선 검토합니다.",
    unresolvedItems: [
      "보험계약자와 피보험자의 최종 정의",
      "보험료 부담 주체",
      "기존 보험의 우선 보상 순서",
      "사고당·연간 총보상한도",
      "재보험 구조",
    ],
  },

  wordingFeasibility: {
    status: "조건부 가능",
    label: "약관화 가능성 및 검토용 문구 제안",
    disclaimer:
      "기존 약관과 제공된 가상 근거를 바탕으로 AI가 생성한 검토용 초안입니다. 최종 약관 확정을 위해 상품·법무·계리·손해사정 담당자의 검토가 필요합니다.",
    possibleReasons: [
      "보험증권 또는 대상 차량 명부로 보장대상 전기차를 식별할 수 있습니다.",
      "주차·충전 중 화재와 제3자 직접 재산손해를 기본 사고·손해 구조로 표현할 수 있습니다.",
      "기존 자동차·화재보험 자료에서 보험기간, 보장 사고, 재물손해와 면책 구성 방식을 참고할 수 있습니다.",
    ],
    improvementReasons: [
      "발화 차량과 원인 미상 화재를 인정하는 객관적 기준이 필요합니다.",
      "기존 보험의 우선 보상과 중복보험 처리 순서를 정해야 합니다.",
      "법률상 배상책임형과 책임 확정 전 피해보완형 중 상품 구조를 확정해야 합니다.",
      "하나의 사고, 직접손해, 제3자, 주차·충전 중의 범위를 구체화해야 합니다.",
    ],
    assessmentCriteria: [
      {
        id: "TERM-CRITERIA-01",
        question: "보험계약자와 피보험자를 식별할 수 있는가?",
        status: "조건부",
        note: "대상 차량은 식별 가능하지만 계약자·피보험자 역할 확정이 필요합니다.",
      },
      {
        id: "TERM-CRITERIA-02",
        question: "보험의 목적 또는 보장 대상을 구체화할 수 있는가?",
        status: "가능",
        note: "보험증권 또는 대상 차량 명부에 기재된 전기차로 구체화할 수 있습니다.",
      },
      {
        id: "TERM-CRITERIA-03",
        question: "보험사고를 객관적으로 정의할 수 있는가?",
        status: "조건부",
        note: "주차·충전 중 화재는 정의 가능하지만 발화 차량 판정 기준이 필요합니다.",
      },
      {
        id: "TERM-CRITERIA-04",
        question: "보험금 지급조건을 확인 가능한 형태로 작성할 수 있는가?",
        status: "조건부",
        note: "조사자료, 직접손해와 기존 보험 보상액을 확인하도록 구성할 수 있습니다.",
      },
      {
        id: "TERM-CRITERIA-05",
        question: "보상하지 않는 상황을 구체적으로 정할 수 있는가?",
        status: "가능",
        note: "고의, 불법 개조, 발화 차량 자체 손해, 중복보상 등을 후보로 검토할 수 있습니다.",
      },
      {
        id: "TERM-CRITERIA-06",
        question: "사고 원인과 책임주체를 구분할 수 있는가?",
        status: "보완 필요",
        note: "원인 미상 화재와 다수 책임주체의 구상관계를 정해야 합니다.",
      },
      {
        id: "TERM-CRITERIA-07",
        question: "기존 상품과 중복되는 보장을 구분할 수 있는가?",
        status: "보완 필요",
        note: "자동차·자차·화재·생산물배상책임보험의 보상 순서를 비교해야 합니다.",
      },
    ],
    structureOptions: [
      {
        id: "liability",
        name: "배상책임형",
        selected: false,
        description: "피보험자의 법률상 손해배상책임이 확정된 경우 보상하는 구조",
        strength: "기존 배상책임보험과 구조적으로 연결하기 쉬움",
        limitation: "원인과 책임 확정이 늦어지면 피해자 보상도 지연될 수 있음",
      },
      {
        id: "damageSupplement",
        name: "피해보완형",
        selected: true,
        description:
          "책임 확정 전이라도 객관적인 사고·손해 요건을 충족하면 제3자 재산손해를 우선 보상하고 이후 구상관계를 정산하는 검토안",
        strength: "피해자 신속 보상과 원인 규명 지연 공백 보완에 적합",
        limitation: "지급요건, 중복보험, 대위·구상 구조에 대한 법률·약관 검토가 필요함",
      },
    ],
    selectedDraftType: "피해보완형 검토안",
    coverageDraft:
      "회사는 보험증권 또는 대상 차량 명부에 기재된 보장대상 전기자동차가 보험기간 중 주차 또는 충전 중 발생한 화재로 제3자의 자동차 또는 건물 등 재물에 직접적인 손해를 입힌 경우, 약관에서 정한 기존 보험의 보상 적용 후 남은 손해를 보상한도 내에서 보상합니다.",
    alternativeLiabilityDraft:
      "회사는 피보험자가 보험증권 또는 대상 차량 명부에 기재된 보장대상 전기자동차를 소유·사용 또는 관리하는 중 주차 또는 충전 중 발생한 화재로 제3자의 재물에 손해를 입혀 법률상 손해배상책임을 부담함으로써 입은 손해를 보상합니다.",
    definitions: [
      {
        term: "보장대상 전기자동차",
        draftDefinition:
          "보험증권 또는 보험계약에 첨부된 대상 차량 명부에 식별정보가 기재된 전기자동차",
        status: "기존 약관 참고 가능",
      },
      {
        term: "주차 중",
        draftDefinition:
          "차량이 통행을 목적으로 운행되지 않고 약관에서 정한 장소에 정지하여 보관된 상태",
        status: "정의 필요",
      },
      {
        term: "충전 중",
        draftDefinition:
          "전기자동차가 적법하게 설치된 충전설비에 연결되어 충전을 시작한 때부터 연결을 해제한 때까지의 상태",
        status: "정의 필요",
      },
      {
        term: "화재",
        draftDefinition:
          "우연히 발생한 연소현상으로서 소화가 필요하거나 재물에 직접적인 열·연기·그을음 손해를 발생시킨 사고",
        status: "기존 약관 참고 가능",
      },
      {
        term: "발화 차량",
        draftDefinition:
          "관계기관 조사자료 등 객관적인 자료에 따라 화재가 시작된 것으로 확인되거나 합리적으로 인정되는 보장대상 전기자동차",
        status: "법무·손해사정 검토 필요",
      },
      {
        term: "원인 미상 화재",
        draftDefinition:
          "발화 차량은 확인되었으나 배터리 결함, 외부 요인 또는 관리상 과실 등 구체적인 발화 원인이 확정되지 않은 화재",
        status: "법무 검토 필요",
      },
      {
        term: "제3자",
        draftDefinition:
          "보험계약자·피보험자 및 약관에서 별도로 제외한 자 이외의 사람 또는 법인",
        status: "기존 약관 참고 가능",
      },
      {
        term: "재물손해",
        draftDefinition: "유형 재물이 멸실·훼손되거나 오손되어 수리 또는 교체가 필요한 손해",
        status: "기존 약관 참고 가능",
      },
      {
        term: "직접손해",
        draftDefinition:
          "화재의 열, 불꽃, 연기, 그을음 또는 소화활동으로 제3자의 재물에 직접 발생한 물리적 손해",
        status: "정의 필요",
      },
      {
        term: "기존 보험",
        draftDefinition:
          "동일한 사고와 손해에 대하여 보상책임이 있는 자동차보험, 자기차량손해 담보, 화재보험 또는 그 밖의 보험계약",
        status: "중복보험 검토 필요",
      },
      {
        term: "하나의 사고",
        draftDefinition:
          "동일한 발화 차량에서 발생한 하나의 화재와 그 화재가 연속적으로 확산되어 발생한 일련의 손해",
        status: "누적손해 검토 필요",
      },
    ],
    paymentConditions: [
      {
        id: "PAY-01",
        text: "보험기간 중 사고가 발생했을 것",
        verification: "사고일시 및 보험기간 확인",
      },
      {
        id: "PAY-02",
        text: "보험증권 또는 대상 차량 명부에 기재된 전기차와 관련된 사고일 것",
        verification: "차량 식별정보와 대상 명부 확인",
      },
      {
        id: "PAY-03",
        text: "약관에서 정한 주차 또는 충전 상태에서 발생한 화재일 것",
        verification: "주차·충전 기록, 영상, 현장 조사자료 확인",
      },
      {
        id: "PAY-04",
        text: "관계기관 조사자료 등으로 보장대상 차량에서 시작된 화재임이 합리적으로 확인될 것",
        verification: "소방·경찰·감정기관 등 객관적 조사자료 확인",
      },
      {
        id: "PAY-05",
        text: "제3자의 차량 또는 건물 등 재산에 발생한 직접손해가 객관적으로 확인될 것",
        verification: "손해사정, 수리견적, 소유관계와 현장자료 확인",
      },
      {
        id: "PAY-06",
        text: "자동차보험·화재보험 등 기존 보험의 적용 여부와 보상액이 확인될 것",
        verification: "기존 보험 계약과 지급내역 확인",
      },
      {
        id: "PAY-07",
        text: "동일한 손해에 대한 중복 보상을 제외할 수 있을 것",
        verification: "보험금 합계와 실제 손해액 비교",
      },
      {
        id: "PAY-08",
        text: "약관에서 정한 사고 통지 및 청구 절차를 이행할 것",
        verification: "사고통지, 청구서류와 협조의무 확인",
      },
    ],
    exclusionCandidates: [
      {
        id: "EXC-01",
        text: "보험계약자 또는 피보험자의 고의로 발생한 손해",
        reason: "우연성이 없는 사고 제외",
        status: "면책 검토 후보",
      },
      {
        id: "EXC-02",
        text: "보장대상 차량의 불법 개조 또는 배터리·충전장치의 임의 변경으로 발생한 손해",
        reason: "통제 가능한 위험 증가 행위 관리",
        status: "면책 검토 후보",
      },
      {
        id: "EXC-03",
        text: "일반 도로 주행 중 발생한 사고로 인한 손해",
        reason: "초기 검토 범위를 주차·충전 중 화재로 한정",
        status: "면책 검토 후보",
      },
      {
        id: "EXC-04",
        text: "보장대상 전기자동차 자체에 발생한 손해",
        reason: "제3자 직접 재산손해와 구분",
        status: "면책 검토 후보",
      },
      {
        id: "EXC-05",
        text: "제3자의 신체 상해 또는 사망으로 인한 손해",
        reason: "초기 재산손해 중심 범위와 구분하며 별도 담보 검토 가능",
        status: "면책 검토 후보",
      },
      {
        id: "EXC-06",
        text: "기존 보험에서 전액 보상된 동일 손해",
        reason: "실손보상 원칙과 중복보상 방지",
        status: "면책 검토 후보",
      },
      {
        id: "EXC-07",
        text: "영업중단, 사용손실 등 간접손해",
        reason: "직접 재산손해와 구분하며 별도 담보 검토 가능",
        status: "면책 검토 후보",
      },
      {
        id: "EXC-08",
        text: "대상 차량 명부에 포함되지 않은 차량에서 시작된 화재로 인한 손해",
        reason: "보장대상 식별과 위험집단 관리",
        status: "면책 검토 후보",
      },
      {
        id: "EXC-09",
        text: "충전시설 또는 건물 자체의 결함만으로 발생한 사고",
        reason: "전기차 화재 위험과 시설 고유 위험의 구분",
        status: "면책 검토 후보",
      },
      {
        id: "EXC-10",
        text: "전쟁, 테러 등 일반 약관에서 정한 면책사유로 발생한 손해",
        reason: "일반적인 비보험위험과의 정합성 검토",
        status: "면책 검토 후보",
      },
    ],
    ambiguities: [
      {
        id: "AMB-01",
        issue: "주차 중의 범위",
        question: "입·출차를 위한 저속 이동이나 시동 상태를 포함할 것인가?",
        owner: "상품·법무",
      },
      {
        id: "AMB-02",
        issue: "충전 중의 범위",
        question: "완속·급속·비접촉 충전과 충전 완료 후 연결 상태를 어디까지 포함할 것인가?",
        owner: "상품·기술",
      },
      {
        id: "AMB-03",
        issue: "발화 차량 인정",
        question: "차량이 완전히 소실되어 구체적인 원인이 확정되지 않은 경우 어떤 자료와 기준으로 인정할 것인가?",
        owner: "법무·손해사정",
      },
      {
        id: "AMB-04",
        issue: "기존 보험의 우선 보상",
        question: "자동차보험, 피해 차량의 자차보험, 건물 화재보험 중 어떤 보상을 먼저 적용할 것인가?",
        owner: "상품·보상",
      },
      {
        id: "AMB-05",
        issue: "하나의 사고와 총보상한도",
        question: "연속 확산된 다수 차량·건물 피해를 하나의 사고로 볼 것인가?",
        owner: "상품·계리·재보험",
      },
      {
        id: "AMB-06",
        issue: "보장 손해 범위",
        question: "발화 차량 자체 손해, 신체손해, 소화활동 비용, 영업중단손해를 포함할 것인가?",
        owner: "상품",
      },
      {
        id: "AMB-07",
        issue: "선보상 후 구상",
        question: "책임 확정 전에 보상한 뒤 제조사·충전사업자·시설 관리자에게 어떤 절차로 구상할 것인가?",
        owner: "법무·보상",
      },
    ],
    referenceDocuments: [
      {
        id: "DOC-FIRE-BIZ-SUMMARY",
        name: "무배당 현대해상다이렉트H사업장화재보험(Hi2601) 상품요약서",
        role: "AI 분석 참고자료",
        usedFor: "건물·시설 화재손해와 배상책임 보장 구조 참고",
        includedInAiInput: true,
      },
      {
        id: "DOC-FIRE-BIZ-METHOD",
        name: "무배당 현대해상다이렉트H사업장화재보험(Hi2601) 사업방법서 별지",
        role: "AI 분석 참고자료",
        usedFor: "상품 대상, 보험기간과 특별약관 구성 방식 참고",
        includedInAiInput: true,
      },
      {
        id: "DOC-HOME-FIRE-SUMMARY",
        name: "주택화재보험 상품요약서",
        role: "AI 분석 참고자료",
        usedFor: "개인 소유 재산의 화재손해와 배상책임 구조 참고",
        includedInAiInput: true,
      },
      {
        id: "DOC-HOME-FIRE-METHOD",
        name: "주택화재보험 사업방법서 별지",
        role: "AI 분석 참고자료",
        usedFor: "개인보험 대상과 계약 구조 참고",
        includedInAiInput: true,
      },
      {
        id: "DOC-EV-FIRE-METHOD",
        name: "전기차화재안심보험 사업방법서 별지",
        role: "사후 검증자료",
        usedFor: "AI 결과와 실제 상품 방향 비교",
        includedInAiInput: false,
        badge: "정답 유출 방지를 위해 AI 입력 제외",
      },
      {
        id: "DOC-EV-FIRE-TERMS",
        name: "전기차화재안심보험 약관 또는 상품 설명자료",
        role: "사후 검증자료",
        usedFor: "검토용 문구와 실제 약관 구조 비교",
        includedInAiInput: false,
        badge: "정답 유출 방지를 위해 AI 입력 제외",
      },
    ],
  },

  evidence: [
    {
      id: "EVD-001",
      type: "뉴스",
      title: "지하주차장 전기차 화재 확산 관련 가상 뉴스 묶음",
      source: "프로토타입용 가상자료",
      referenceDate: "2025-08-15",
      usedFor: ["위험 탐지", "집적손해 가능성"],
      reliability: "탐색 신호",
      isMockData: true,
      originalAvailable: false,
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
      originalAvailable: false,
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
      originalAvailable: false,
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
      originalAvailable: false,
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
      originalAvailable: false,
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
      originalAvailable: true,
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
      originalAvailable: true,
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
      originalAvailable: true,
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
      originalAvailable: true,
    },
  ],

  missingResearch: [
    {
      id: "MIS-01",
      priority: "높음",
      topic: "국내 전기차 화재 건수와 주차·충전 상태별 발생 비중",
      reason: "사고 빈도와 위험률 검토에 필요",
      responsibleTeam: "상품·계리",
      status: "미확보",
      acquisitionType: "AI·공공 API로 확보 가능",
      requiredMaterials: ["공공 사고통계", "차량 등록·운행 현황"],
    },
    {
      id: "MIS-02",
      priority: "높음",
      topic: "지하주차장 사고당 평균·최대 재산손해액",
      reason: "집적손해, 보상한도와 재보험 검토에 필요",
      responsibleTeam: "보상·계리·재보험",
      status: "미확보",
      acquisitionType: "사내자료 필요",
      requiredMaterials: ["사고별 지급자료", "손해사정 결과", "재보험 검토자료"],
    },
    {
      id: "MIS-03",
      priority: "높음",
      topic: "발화 원인 미상으로 종결된 사고 비율과 판정 기준",
      reason: "보험사고 인정 기준과 약관 문구 작성에 필요",
      responsibleTeam: "손해사정·법무",
      status: "미확보",
      acquisitionType: "전문가 판단 필요",
      requiredMaterials: ["사고조사 보고서", "손해사정 기준", "법률 검토 의견"],
    },
    {
      id: "MIS-04",
      priority: "높음",
      topic: "기존 자동차·화재·재산·생산물배상책임보험의 실제 보상 사례",
      reason: "보장 공백, 보상 순서와 중복보험 처리 확인에 필요",
      responsibleTeam: "상품·보상",
      status: "미확보",
      acquisitionType: "사내자료 필요",
      requiredMaterials: ["기존 약관", "보상 사례", "구상 처리 자료"],
    },
    {
      id: "MIS-05",
      priority: "중간",
      topic: "차량 소유자·제조사·충전사업자·시설 관리자의 책임 판례와 분쟁사례",
      reason: "책임주체와 구상관계 검토에 필요",
      responsibleTeam: "법무",
      status: "미확보",
      acquisitionType: "전문가 판단 필요",
      requiredMaterials: ["판례·분쟁사례", "법률 검토 의견"],
    },
    {
      id: "MIS-06",
      priority: "중간",
      topic: "전기차·배터리·충전시설 관련 화재안전기준과 제도 변화",
      reason: "인수조건과 법령·규제 영향 검토에 필요",
      responsibleTeam: "상품·준법",
      status: "미확보",
      acquisitionType: "AI·공공 API로 확보 가능",
      requiredMaterials: ["공식 법령·고시", "안전기준 공표자료"],
    },
    {
      id: "MIS-07",
      priority: "중간",
      topic: "최대예상손실과 재보험 필요성",
      reason: "집적위험 관리와 보험회사의 수용능력 검토에 필요",
      responsibleTeam: "계리·재보험",
      status: "미확보",
      acquisitionType: "사내자료 필요",
      requiredMaterials: ["누적손해 시나리오", "재보험 수용능력 자료"],
    },
  ],

  validationComparison: {
    excludedFromAiInput: true,
    status: "사후 검증 예시",
    buttonLabel: "실제 상품과 비교",
    title: "AI 검토 결과와 전기차화재안심보험 사후 비교",
    notice:
      "전기차화재안심보험 자료는 AI 최초 분석에 사용하지 않았으며, 리포트 생성 후 결과의 방향성을 검증하는 용도로만 비교합니다.",
    validationSources: ["DOC-EV-FIRE-METHOD", "DOC-EV-FIRE-TERMS"],
    similarities: [
      {
        topic: "사고 상태",
        aiResult: "전기차의 주차 또는 충전 중 화재를 핵심 사고로 제안",
        validationPoint: "실제 상품자료의 보장 사고 범위와 비교 가능한 방향",
      },
      {
        topic: "주요 피해",
        aiResult: "주변 차량과 건물 등 제3자 직접 재산손해를 우선 검토",
        validationPoint: "실제 상품자료의 제3자 차량·건물 손해 보장 방향과 비교 가능",
      },
      {
        topic: "기존 보험과의 관계",
        aiResult: "자동차보험·화재보험 등 기존 보험 보상 후 남는 공백을 보완하는 구조 제안",
        validationPoint: "실제 상품자료의 기존 보험과의 보상 관계를 확인할 수 있음",
      },
      {
        topic: "원인·책임 확정 전 보상",
        aiResult: "피해보완형과 선보상 후 구상 가능성을 핵심 검토안으로 제안",
        validationPoint: "실제 상품자료의 원인 미상 사고 처리와 보상 절차 방향을 비교할 수 있음",
      },
    ],
    differences: [
      {
        topic: "계약자·피보험자 구조",
        aiResult: "제조·수입사, 협회 또는 기관을 계약자 후보로 열어 둔 검토안",
        actualProductReview:
          "실제 상품자료에서는 계약자·대상 차량·보험료 부담 구조가 구체적으로 정해져 있는지 확인 필요",
      },
      {
        topic: "보상한도·보험료",
        aiResult: "통계와 최대예상손실 부족으로 수치를 제안하지 않음",
        actualProductReview: "실제 상품자료의 보상한도와 보험료 구조를 별도로 비교해야 함",
      },
      {
        topic: "보험금 지급요건",
        aiResult: "관계기관 조사자료와 합리적인 발화 차량 확인을 검토용 조건으로 제안",
        actualProductReview: "실제 약관의 정확한 발화·원인 미상 인정 요건과 서류 기준을 확인해야 함",
      },
      {
        topic: "면책·구상 절차",
        aiResult: "면책과 구상관계를 후보 수준으로 제시",
        actualProductReview: "실제 약관의 확정 면책사항과 보험자대위·정산 절차를 비교해야 함",
      },
    ],
    interpretation:
      "AI가 상품의 핵심 방향을 어느 정도 도출했는지 확인하되, 실제 상품과 다른 부분은 오류라기보다 입력자료 부족 또는 실무 확정이 필요한 영역으로 구분하여 평가합니다.",
  },

  reviewer: {
    status: "미검토",
    statusOptions: ["미검토", "검토 중", "추가 조사 필요", "1차 검토 완료", "보류", "제외"],
    checklist: [
      {
        id: "COMMON-01",
        label: "입력 근거자료의 최신성과 적용 범위를 확인",
        checked: false,
      },
      {
        id: "COMMON-02",
        label: "기존 보험·중복보상·구상 관계를 검토",
        checked: false,
      },
      {
        id: "COMMON-03",
        label: "상품·약관·법무 검토 담당과 역할을 확정",
        checked: false,
      },
      {
        id: "COMMON-04",
        label: "추가 자료와 계리 검토의 범위를 합의",
        checked: false,
      },
    ],
    memo: "",
    savedAt: null,
    localStorageKey: "evFireReportReviewer_RPT-EVFIRE-001-20260228",
  },

  ui: {
    initialState: "generated",
    printable: true,
    copyableField: "wordingFeasibility.coverageDraft",
    expandableSummaryCardIds: [
      "target",
      "productDirection",
      "wording",
      "dataReadiness",
    ],
    expandableFeasibilityItemIds: [
      "marketability",
      "fortuity",
      "measurability",
      "responsibility",
      "moralHazard",
      "dataAvailability",
      "differentiation",
      "regulation",
    ],
    sectionOrder: [
      "meta",
      "aiSummary",
      "riskGapSummary",
      "targetSuitability",
      "productFeasibility",
      "productProposal",
      "wordingFeasibility",
      "evidence",
      "missingResearch",
      "reviewer",
    ],
    labels: {
      print: "인쇄/PDF 저장",
      showReason: "판단 근거 보기",
      copyWording: "문구 복사",
      compareProduct: "실제 상품과 비교",
      saveReview: "검토 내용 저장",
    },
  },
};

// 일반 <script> 태그 방식에서 사용할 수 있도록 전역 객체로 노출한다.
if (typeof window !== "undefined") {
  window.mockReportResult = mockReportResult;
}

// Node.js에서 간단한 검증이나 테스트를 할 때 사용할 수 있도록 지원한다.
if (typeof module !== "undefined" && module.exports) {
  module.exports = mockReportResult;
}

