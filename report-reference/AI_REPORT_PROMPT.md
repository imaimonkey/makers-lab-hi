# 신규 위험 보험상품 검토 리포트 AI 프롬프트 명세

> 문서 버전: v1.0  
> 시연 주제: 전기차 지하주차장 화재 위험  
> 입력 파일: `mock-risk-data.js`  
> 결과 예시·fallback: `mock-report-result.js`  
> 구현 단계: 포텐스닷 API 연결 준비

---

## 0. Codex 구현 지침

이 문서는 포텐스닷 AI에 전달할 프롬프트와 응답 형식을 정의한다.

구현 전에 다음 파일을 함께 읽는다.

1. `REPORT_PAGE_SPEC.md`
2. `mock-risk-data.js`
3. `mock-report-result.js`
4. `AI_REPORT_PROMPT.md`

중요 원칙:

- AI 최초 분석 입력에는 `mock-risk-data.js`만 사용한다.
- `mock-report-result.js`는 화면 개발용 가상 결과와 API 실패 시 fallback으로만 사용한다.
- `mock-report-result.js`의 결론이나 문구를 프롬프트에 포함하지 않는다.
- `referenceDocuments.validationOnly` 자료는 최초 AI 입력에서 반드시 제거한다.
- 전기차화재안심보험 자료는 리포트가 생성된 뒤 별도의 사후 검증에만 사용한다.
- 포텐스닷 API 키를 HTML이나 프론트엔드 JavaScript에 직접 작성하지 않는다.
- API 호출은 Node.js, GAS 등 중간 서버를 통해 처리한다.

---

## 1. 이 프롬프트의 목적

사용자가 선택한 신규 위험 입력데이터를 바탕으로 AI가 다음 내용을 포함한 보험상품 의사결정 지원 리포트를 JSON으로 생성하게 한다.

1. AI 1차 상품화 판단
2. 현재 보험으로 남는 보장 공백
3. 개인·기업·혼합형 보험 대상 적합성
4. 상품화 가능성 평가
5. AI 제안 상품 구조(검토 초안)
6. 약관화 가능성 및 검토용 문구 제안
7. 근거자료 연결
8. 추가 확보가 필요한 자료와 검토 담당

AI는 최종 결정을 내리지 않는다. AI는 실무자가 검토할 수 있는 초안, 판단 근거와 미확인 사항을 구조화한다.

---

## 2. 전체 데이터 흐름

```text
mock-risk-data.js
  → validationOnly 제거
  → JSON 문자열로 변환
  → 아래 프롬프트의 {{RISK_INPUT_JSON}}에 삽입
  → 포텐스닷 API 호출
  → JSON 응답 파싱 및 검증
  → 리포트 화면 렌더링
  → API 실패 시 mock-report-result.js 표시
```

`mock-report-result.js`를 AI 입력에 넣으면 안 된다. 이 파일은 AI가 생성해야 할 결론을 미리 담고 있으므로 입력에 사용하면 시연의 검증 의미가 사라진다.

---

## 3. AI에 전달할 입력데이터 만들기

### 3.1 포함할 필드

- `meta`
- `risk`
- `demoContext`
- `selectionPreview`
- `riskSignals`
- `accidentScenario`
- `stakeholders`
- `existingCoverage`
- `coverageGapHypotheses`
- `insurabilityInputs`
- `referenceDocuments.includedInAiInput`
- `evidenceItems`
- `missingResearch`
- `analysisQuestions`
- `expectedReportSections`
- `aiGuardrails`
- `disclaimer`

### 3.2 제외할 필드

- `referenceDocuments.validationOnly`
- 전기차화재안심보험의 최종 상품 구조
- 전기차화재안심보험의 완성된 약관 문구
- `mock-report-result.js` 전체
- 실무자 검토 상태·체크리스트·메모
- API 키와 그 밖의 비밀정보

### 3.3 권장 전처리 코드

```js
function createAiRiskInput(mockRiskData) {
  return {
    meta: mockRiskData.meta,
    risk: mockRiskData.risk,
    demoContext: {
      purpose: mockRiskData.demoContext.purpose,
      assumption: mockRiskData.demoContext.assumption,
      importantRule: mockRiskData.demoContext.importantRule,
    },
    selectionPreview: mockRiskData.selectionPreview,
    riskSignals: mockRiskData.riskSignals,
    accidentScenario: mockRiskData.accidentScenario,
    stakeholders: mockRiskData.stakeholders,
    existingCoverage: mockRiskData.existingCoverage,
    coverageGapHypotheses: mockRiskData.coverageGapHypotheses,
    insurabilityInputs: mockRiskData.insurabilityInputs,
    referenceDocuments: {
      includedInAiInput: mockRiskData.referenceDocuments.includedInAiInput,
    },
    evidenceItems: mockRiskData.evidenceItems,
    missingResearch: mockRiskData.missingResearch,
    analysisQuestions: mockRiskData.analysisQuestions,
    expectedReportSections: mockRiskData.expectedReportSections,
    aiGuardrails: mockRiskData.aiGuardrails,
    disclaimer: mockRiskData.disclaimer,
  };
}
```

### 3.4 참고 약관 원문을 추가하는 경우

초기 프로토타입에서는 문서명과 활용 범위만 사용해도 된다. 이후 실제 약관 문장을 참고시키려면 PDF 전체가 아니라 관련 조항만 선별하여 다음 필드로 추가한다.

```json
{
  "referenceExcerpts": [
    {
      "documentId": "DOC-FIRE-BIZ-SUMMARY",
      "sectionTitle": "참고 조항명",
      "excerpt": "선별한 참고 문구",
      "useScope": "재물손해 또는 보험금 지급조건의 문장 구조 참고"
    }
  ]
}
```

AI가 실제로 제공되지 않은 PDF 내용을 읽은 것처럼 표현하면 안 된다.

---

## 4. 포텐스닷에 전달할 메인 프롬프트

아래 `{{RISK_INPUT_JSON}}` 자리에 3번에서 만든 입력데이터를 `JSON.stringify()`한 문자열로 삽입한다.

```text
당신은 대한민국 손해보험사의 일반보험 상품개발 실무자를 지원하는 AI 분석가입니다.

목표는 제공된 신규 위험 입력자료만을 사용하여 보험상품화 가능성, 보험 대상, 상품 방향, 기존 보장 공백, 약관화 가능성과 추가 조사사항을 1차 검토하는 것입니다.

당신은 최종 의사결정권자가 아닙니다. 결과는 상품·법무·계리·보상·손해사정 담당자가 검토할 AI 생성 초안입니다.

[반드시 지킬 원칙]

1. 오직 아래 입력 JSON에 포함된 정보만 사용합니다.
2. 입력에 없는 통계 수치, 사고 건수, 손해액, 법령, 판례, 상품명, 출처를 만들어내지 않습니다.
3. 입력에 없는 사실은 추정으로 단정하지 말고 "근거 부족" 또는 "추가 확인 필요"로 표시합니다.
4. 근거로 확인된 내용과 AI가 제안하는 검토안을 명확히 구분합니다.
5. 각 주요 판단에는 입력에 존재하는 evidence ID만 연결합니다.
6. 존재하지 않는 evidence ID를 새로 만들지 않습니다.
7. 뉴스와 가상자료는 위험 탐색 신호로만 사용하고, 확정적인 상품화 근거처럼 표현하지 않습니다.
8. 실제 보험료, 요율, 보상한도, 자기부담금 수치를 산출하거나 제안하지 않습니다.
9. 최종 상품 출시 여부를 확정하지 않습니다.
10. 법률상 책임이나 규제 해석을 확정적인 법률 의견처럼 작성하지 않습니다.
11. 약관 문구는 반드시 "AI가 생성한 검토용 초안"으로 표시합니다.
12. 면책사항은 반드시 "면책 검토 후보"로 표시합니다.
13. 보험계약자, 피보험자, 보험수익자와 피해자를 같은 개념으로 사용하지 않습니다.
14. 개인보험, 기업보험, 혼합형을 모두 비교한 뒤 판단 이유를 제시합니다.
15. 기존 자동차보험·화재보험 등과의 중복 가능성, 우선 보상과 구상관계를 검토합니다.
16. 법률상 배상책임형과 책임 확정 전 피해보완형의 차이를 구분합니다.
17. 발화 원인이나 책임이 불명확하면 불명확하다고 표시합니다.
18. validationOnly 자료나 실제 출시상품의 결론을 알고 있다고 가정하지 않습니다.
19. 한국어로 작성합니다.
20. 응답은 유효한 JSON 하나만 출력합니다. 설명, 인사말, 마크다운, 코드펜스는 출력하지 않습니다.
21. evidenceCount는 입력의 evidenceItems 개수와 같아야 합니다.
22. 응답에는 validationComparison, reviewer, ui 키를 만들지 않습니다. 이 세 영역은 프론트엔드에서 추가합니다.

[고정 상태값]

- 요약 카드 status: "긍정", "조건부 검토", "보완 필요"
- 상품화 평가 status: "양호", "조건부", "보완 필요", "근거 부족"
- 대상 적합성: "추천", "적합", "부분 적합", "제한적"
- 추가 조사 priority: "높음", "중간", "낮음"

[작성 길이]

- 종합 의견은 5문장 이내로 작성합니다.
- 요약 카드 detail은 각 2문장 이내로 작성합니다.
- 판단 내용은 항목당 2문장 이내로 작성합니다.
- 문장을 짧고 실무적으로 작성합니다.
- 같은 내용을 여러 영역에서 불필요하게 반복하지 않습니다.

[AI 1차 상품화 판단]

decisionLabel에는 "조건부 우선 검토" 또는 "판단 보류"를 작성하고, primaryConclusionReason에는 핵심 판단 이유를 작성합니다.
다음 4개 보조 카드를 정확히 이 순서로 생성합니다. 영문 상태값을 사용하지 않습니다.

1. target / 보험 대상
2. productDirection / 상품 방향
3. wording / 약관화 가능성
4. dataReadiness / 데이터 준비도

nextActions에는 실제 다음 검토 단계를 1~3개 작성합니다. 각 항목에는 추천 이유, 관련 평가항목 id, 근거자료 id, 담당 분야를 포함합니다.
additionalConfirmations에는 담당자가 추가 확인할 사항을 1~4개 작성합니다. 각 항목에는 무엇을 확인하는지, 왜 필요한지, 필요한 자료, 담당 분야, 근거자료 id를 포함합니다.

[보험 대상 적합성]

다음 3개 대상을 모두 작성합니다.

1. corporate / 기업보험
2. individual / 개인보험
3. hybrid / 혼합형

세 대상의 rank는 1, 2, 3을 중복 없이 사용합니다. roleStructure에는 예상 보험계약자, 예상 피보험자, 주요 피해자, 위험관리 주체, 보험료 부담 주체를 모두 포함합니다.

[상품화 가능성 평가]

다음 8개 기준을 정확히 이 순서로 평가합니다.

1. marketability / 시장성
2. fortuity / 우연성
3. measurability / 손해 측정 가능성
4. responsibility / 책임주체 명확성
5. moralHazard / 도덕적 해이 통제
6. dataAvailability / 데이터 확보 가능성
7. differentiation / 기존 보험과의 차별성
8. regulation / 법령·규제 영향

overallAssessment에는 전체 결론, 강점, 보완점, 다음 단계 진입 조건을 작성합니다.

[약관 문구 작성 원칙]

- 보장대상, 보험사고, 보장 손해와 지급조건을 가능한 구체적으로 작성합니다.
- 모호한 표현을 사용했다면 ambiguities에서 반드시 지적합니다.
- coverageDraft는 우선 검토하는 상품 구조에 맞는 문구 하나를 작성합니다.
- 구조가 확정되지 않았다면 selectedDraftType에 "검토안"임을 표시합니다.
- structureOptions의 두 구조 중 정확히 하나만 selected: true로 표시합니다. 근거가 부족해 선택할 수 없다면 두 구조를 모두 false로 두고 selectedDraftType을 "구조 판단 보류"로 작성합니다.
- definitions에는 최소 8개 용어를 작성합니다.
- paymentConditions에는 최소 6개 조건을 작성합니다.
- exclusionCandidates에는 최소 6개 후보를 작성합니다.
- ambiguities에는 최소 5개 쟁점을 작성합니다.
- 제공된 참고자료의 원문이 없으면 특정 조항을 인용하거나 실제 약관 내용이라고 단정하지 않습니다.

[근거자료 작성 원칙]

- evidence 배열은 입력의 evidenceItems만 사용합니다.
- 입력 evidenceItems의 모든 항목을 한 번씩 포함하고 개수를 변경하지 않습니다.
- id, title, source, isMockData를 바꾸지 않습니다.
- usedFor와 reliability는 입력값을 유지하거나 더 보수적으로 표현합니다.
- 가상자료에는 반드시 isMockData: true가 유지되어야 합니다.

[출력 JSON 구조]

아래 키 이름과 자료형을 그대로 따릅니다. 모든 최상위 키를 빠짐없이 출력합니다.

{
  "meta": {
    "sourceRiskId": "입력의 riskId",
    "title": "상품화 검토 리포트 제목",
    "riskTitle": "입력의 위험명",
    "riskCategories": ["입력의 분류"],
    "analysisMode": "입력값",
    "analysisBaseDate": "입력값",
    "generatedAt": null,
    "evidenceCount": 0,
    "aiStatus": "AI 생성 초안",
    "dataStatus": "프로토타입용 가상데이터",
    "isMockData": true,
    "disclaimer": "의사결정 지원용 초안이며 최종 상품·보험료·요율·약관·법률 의견이 아니라는 안내"
  },
  "aiSummary": {
    "decisionLabel": "조건부 우선 검토 또는 판단 보류",
    "primaryConclusionReason": "핵심 판단 이유",
    "cards": [
      {
        "id": "target 또는 productDirection 또는 wording 또는 dataReadiness",
        "label": "보험 대상 또는 상품 방향 또는 약관화 가능성 또는 데이터 준비도",
        "result": "짧은 결과",
        "status": "긍정 또는 조건부 검토 또는 보완 필요",
        "shortReason": "한 줄 이유",
        "detail": "판단 설명",
        "evidenceIds": ["입력에 존재하는 evidence ID"],
        "caveat": "한계 또는 추가 확인사항"
      }
    ],
    "overallOpinion": "5문장 이내 종합 의견",
    "recommendedNextAction": "다음 행동 한 문장",
    "nextActions": [{
      "id": "NEXT-01부터 순차 부여",
      "action": "다음 검토 단계",
      "reason": "추천 이유",
      "evaluationIds": ["상품화 평가 8개 기준의 id"],
      "evidenceIds": ["입력에 존재하는 evidence ID"],
      "responsibleTeams": ["담당 분야"]
    }],
    "additionalConfirmations": [{
      "id": "CONF-01부터 순차 부여",
      "title": "확인 주제",
      "whatToConfirm": "무엇을 확인하는지",
      "whyNeeded": "왜 필요한지",
      "requiredMaterials": ["필요 자료"],
      "responsibleTeams": ["담당 분야"],
      "evidenceIds": ["입력에 존재하는 evidence ID"]
    }]
  },
  "riskGapSummary": {
    "definition": "위험 한 줄 정의",
    "whyNow": ["지금 검토해야 하는 이유"],
    "damageTypes": [
      {
        "id": "DMG-01부터 순차 부여",
        "name": "피해 유형",
        "examples": ["피해 예시"],
        "initialScope": "우선 검토 또는 별도 검토 또는 제외 검토"
      }
    ],
    "affectedParties": ["영향을 받는 대상"],
    "existingCoverageMap": [
      {
        "id": "입력 existingCoverage의 id",
        "damage": "발생 손해",
        "coverageName": "기존 보험 또는 담보명",
        "possibleCoverage": "보장 가능 영역",
        "remainingGap": "남을 수 있는 공백",
        "status": "조건 확인 필요 또는 원인 확인 필요 또는 책임 확인 필요"
      }
    ],
    "keyCoverageGaps": [
      {
        "id": "입력 coverageGapHypotheses의 id",
        "title": "보장 공백 제목",
        "description": "보장 공백 설명",
        "importance": "높음 또는 중간 또는 낮음"
      }
    ]
  },
  "targetSuitability": {
    "recommendation": "기업보험 또는 개인보험 또는 혼합형",
    "recommendationLabel": "추천 구조 한 줄",
    "options": [
      {
        "id": "corporate",
        "target": "기업보험",
        "suitability": "추천 또는 적합 또는 부분 적합 또는 제한적",
        "rank": 1,
        "reason": "판단 이유",
        "limitation": "한계 또는 추가 검토"
      }
    ],
    "roleStructure": [
      {
        "role": "예상 보험계약자 또는 예상 피보험자 또는 주요 피해자 또는 위험관리 주체 또는 보험료 부담 주체",
        "candidates": ["후보"],
        "status": "검토안",
        "question": "확인해야 할 질문"
      }
    ],
    "caution": "보험계약자·피보험자·보험수익자·피해자 구분 안내"
  },
  "productFeasibility": {
    "overallStatus": "조건부 검토 또는 판단 보류",
    "overallAssessment": {
      "conclusion": "전체 결론",
      "strengths": ["강점"],
      "improvements": ["보완점"],
      "entryConditions": ["다음 단계 진입 조건"]
    },
    "items": [
      {
        "id": "marketability",
        "criterion": "시장성",
        "status": "양호 또는 조건부 또는 보완 필요 또는 근거 부족",
        "judgment": "판단 내용",
        "evidenceIds": ["입력에 존재하는 evidence ID"],
        "additionalChecks": ["추가 확인사항"]
      }
    ],
    "interpretation": "상품화 가능성 종합 해석"
  },
  "productProposal": {
    "status": "AI 제안 검토안",
    "workingName": "가칭 상품명",
    "recommendedForm": "추천 형태",
    "alternativeForms": ["대안 형태"],
    "expectedPolicyholder": ["예상 보험계약자 후보"],
    "expectedInsured": "예상 피보험자 검토안",
    "coveredObject": "보장 대상",
    "coveredEvent": "보장 사고",
    "coveredLoss": "보장 손해",
    "existingInsuranceRelationship": "기존 보험과의 관계",
    "settlementDirection": "보상과 구상 방향",
    "policyPeriodDirection": "보험기간 검토 방향",
    "coverageLimitDirection": "수치 없이 작성한 보상한도 검토 방향",
    "deductibleDirection": "수치 없이 작성한 자기부담금 검토 방향",
    "underwritingCandidates": ["인수조건 후보"],
    "outOfScopeCandidates": ["초기 보장 제외 또는 별도 담보 후보"],
    "recommendationReason": "추천 이유",
    "unresolvedItems": ["미확정 항목"]
  },
  "wordingFeasibility": {
    "status": "조건부 가능 또는 보완 필요 또는 근거 부족",
    "label": "약관화 가능성 및 검토용 문구 제안",
    "disclaimer": "AI가 생성한 검토용 초안이며 전문 담당자 검토가 필요하다는 안내",
    "possibleReasons": ["약관화 가능한 이유"],
    "improvementReasons": ["보완해야 하는 이유"],
    "assessmentCriteria": [
      {
        "id": "TERM-CRITERIA-01부터 순차 부여",
        "question": "약관화 판단 질문",
        "status": "가능 또는 조건부 또는 보완 필요 또는 근거 부족",
        "note": "판단 설명"
      }
    ],
    "structureOptions": [
      {
        "id": "liability",
        "name": "배상책임형",
        "selected": false,
        "description": "구조 설명",
        "strength": "장점",
        "limitation": "한계"
      },
      {
        "id": "damageSupplement",
        "name": "피해보완형",
        "selected": false,
        "description": "구조 설명",
        "strength": "장점",
        "limitation": "한계"
      }
    ],
    "selectedDraftType": "선택한 구조의 검토안",
    "coverageDraft": "AI가 생성한 검토용 보장 문구",
    "definitions": [
      {
        "term": "정의할 용어",
        "draftDefinition": "검토용 정의 초안",
        "status": "정의 필요 또는 기존 약관 참고 가능 또는 법무 검토 필요"
      }
    ],
    "paymentConditions": [
      {
        "id": "PAY-01부터 순차 부여",
        "text": "보험금 지급조건 검토안",
        "verification": "확인 방법"
      }
    ],
    "exclusionCandidates": [
      {
        "id": "EXC-01부터 순차 부여",
        "text": "보상하지 않는 손해 검토 후보",
        "reason": "검토 이유",
        "status": "면책 검토 후보"
      }
    ],
    "ambiguities": [
      {
        "id": "AMB-01부터 순차 부여",
        "issue": "모호한 쟁점",
        "question": "확인 질문",
        "owner": "검토 담당 후보"
      }
    ],
    "referenceDocuments": [
      {
        "id": "입력 includedInAiInput에 존재하는 문서 ID",
        "name": "문서명",
        "role": "AI 분석 참고자료",
        "usedFor": "실제로 제공된 정보 범위 안에서의 활용 영역",
        "includedInAiInput": true
      }
    ]
  },
  "evidence": [
    {
      "id": "입력 evidenceItems의 id",
      "type": "입력값",
      "title": "입력값",
      "source": "입력값",
      "referenceDate": null,
      "usedFor": ["입력값"],
      "reliability": "입력값",
      "isMockData": true,
      "originalAvailable": false
    }
  ],
  "missingResearch": [
    {
      "id": "입력 missingResearch의 id",
      "priority": "높음 또는 중간 또는 낮음",
      "topic": "추가 조사 주제",
      "reason": "필요한 이유",
      "responsibleTeam": "상품·법무·계리·보상·손해사정·준법·재보험 중 담당 후보",
      "status": "미확보",
      "acquisitionType": "AI·공공 API로 확보 가능 또는 사내자료 필요 또는 전문가 판단 필요",
      "requiredMaterials": ["필요 자료"]
    }
  ]
}

[신규 위험 입력 JSON]

{{RISK_INPUT_JSON}}
```

---

## 5. 프롬프트 생성 예시

메인 프롬프트 문자열을 `AI_REPORT_PROMPT_TEMPLATE`이라는 변수로 관리한다고 가정한다.

```js
const aiRiskInput = createAiRiskInput(window.mockRiskData);

const finalPrompt = AI_REPORT_PROMPT_TEMPLATE.replace(
  "{{RISK_INPUT_JSON}}",
  JSON.stringify(aiRiskInput)
);
```

입력데이터를 사람이 읽기 쉽게 전송하려면 다음처럼 들여쓰기를 적용할 수 있다.

```js
const finalPrompt = AI_REPORT_PROMPT_TEMPLATE.replace(
  "{{RISK_INPUT_JSON}}",
  JSON.stringify(aiRiskInput, null, 2)
);
```

문자 수 제한이 있다면 들여쓰기를 제거한 첫 번째 방식을 사용한다.

---

## 6. AI 응답 처리 원칙

### 6.1 응답 파싱

AI는 JSON만 반환하도록 요청했지만 예외 상황을 고려한다.

```js
function parseAiReportResponse(rawResponse) {
  if (typeof rawResponse === "object" && rawResponse !== null) {
    return rawResponse;
  }

  if (typeof rawResponse !== "string") {
    throw new Error("AI 응답 형식이 올바르지 않습니다.");
  }

  const cleaned = rawResponse
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  return JSON.parse(cleaned);
}
```

### 6.2 필수 검증

화면에 표시하기 전에 최소한 다음을 검사한다.

```js
function validateAiReport(report, riskInput) {
  const requiredTopLevelKeys = [
    "meta",
    "aiSummary",
    "riskGapSummary",
    "targetSuitability",
    "productFeasibility",
    "productProposal",
    "wordingFeasibility",
    "evidence",
    "missingResearch",
  ];

  for (const key of requiredTopLevelKeys) {
    if (!report[key]) {
      throw new Error(`AI 응답에 필수 영역이 없습니다: ${key}`);
    }
  }

  if (report.meta.sourceRiskId !== riskInput.meta.riskId) {
    throw new Error("AI 응답의 위험 ID가 입력데이터와 일치하지 않습니다.");
  }

  if (!Array.isArray(report.aiSummary.cards) || report.aiSummary.cards.length !== 5) {
    throw new Error("AI 핵심 결론 카드가 5개가 아닙니다.");
  }

  if (
    !Array.isArray(report.productFeasibility.items) ||
    report.productFeasibility.items.length !== 8
  ) {
    throw new Error("상품화 가능성 평가가 8개 기준으로 생성되지 않았습니다.");
  }

  const allowedEvidenceIds = new Set(
    riskInput.evidenceItems.map((item) => item.id)
  );

  const usedEvidenceIds = [
    ...report.aiSummary.cards.flatMap((item) => item.evidenceIds || []),
    ...report.productFeasibility.items.flatMap(
      (item) => item.evidenceIds || []
    ),
  ];

  const inventedEvidenceIds = usedEvidenceIds.filter(
    (id) => !allowedEvidenceIds.has(id)
  );

  if (inventedEvidenceIds.length > 0) {
    throw new Error(
      `입력에 없는 근거 ID가 포함되었습니다: ${[
        ...new Set(inventedEvidenceIds),
      ].join(", ")}`
    );
  }

  return true;
}
```

### 6.3 프론트엔드가 추가할 데이터

다음 영역은 AI가 만들지 않고 프론트엔드에서 추가한다.

- `generatedAt`: 실제 API 응답을 받은 시각
- `validationComparison`: 실제 상품과의 사후 검증 예시
- `reviewer`: 실무자 상태·체크리스트·메모
- `ui`: 버튼, 섹션 순서와 펼침 설정

```js
function completeReportForUi(aiReport, fallbackReport) {
  return {
    ...aiReport,
    meta: {
      ...aiReport.meta,
      generatedAt: new Date().toISOString(),
    },
    validationComparison: fallbackReport.validationComparison,
    reviewer: {
      ...fallbackReport.reviewer,
      status: "미검토",
      checklist: fallbackReport.reviewer.checklist.map((item) => ({
        ...item,
        checked: false,
      })),
      savedAt: null,
    },
    ui: fallbackReport.ui,
  };
}
```

`validationComparison`을 추가하는 시점은 반드시 AI 최초 분석이 완료된 이후여야 한다.

---

## 7. API 실패 시 처리

API 호출 실패, JSON 파싱 오류 또는 필수 필드 누락 시 페이지 전체를 오류 화면으로 바꾸지 않는다.

권장 흐름:

1. 오류를 콘솔에 기록한다.
2. 사용자에게 `AI 연결이 원활하지 않아 시연용 분석 결과를 표시합니다.`라는 안내를 보여준다.
3. `mock-report-result.js`의 결과를 렌더링한다.
4. 화면에 `시연용 fallback 데이터` 배지를 표시한다.

```js
async function generateReport() {
  try {
    const aiRiskInput = createAiRiskInput(window.mockRiskData);
    const rawResponse = await requestAiReport(aiRiskInput);
    const aiReport = parseAiReportResponse(rawResponse);

    validateAiReport(aiReport, aiRiskInput);

    return completeReportForUi(
      aiReport,
      window.mockReportResult
    );
  } catch (error) {
    console.error("AI 리포트 생성 실패:", error);

    return {
      ...window.mockReportResult,
      meta: {
        ...window.mockReportResult.meta,
        badges: [
          ...window.mockReportResult.meta.badges,
          "시연용 fallback 데이터",
        ],
      },
    };
  }
}
```

---

## 8. 선택 기능: 약관 문구만 다시 제안받기

전체 리포트를 다시 생성하지 않고 `약관 검토용 문구 다시 제안받기` 버튼에 연결할 수 있는 짧은 프롬프트다.

```text
당신은 대한민국 손해보험사의 일반보험 상품개발 담당자를 지원하는 AI입니다.

아래 자료만 사용하여 보험 약관의 검토용 보장 문구를 다시 제안하세요.

원칙:

1. 최종 약관이 아니라 AI 생성 검토용 초안입니다.
2. 입력에 없는 사실, 법령, 통계, 출처를 만들지 마세요.
3. 보험료, 요율, 보상한도 수치를 만들지 마세요.
4. 보장대상, 보험사고, 보장손해와 지급조건을 구체적으로 작성하세요.
5. 모호한 표현은 ambiguities에 표시하세요.
6. 면책은 확정안이 아니라 면책 검토 후보로 작성하세요.
7. 한국어로 작성하세요.
8. 유효한 JSON만 출력하고 코드펜스는 사용하지 마세요.

출력 형식:

{
  "status": "조건부 가능 또는 보완 필요 또는 근거 부족",
  "selectedDraftType": "검토안 유형",
  "coverageDraft": "검토용 보장 문구",
  "definitions": [
    {
      "term": "용어",
      "draftDefinition": "검토용 정의",
      "status": "검토 상태"
    }
  ],
  "paymentConditions": ["보험금 지급조건"],
  "exclusionCandidates": ["면책 검토 후보"],
  "ambiguities": ["추가 검토할 모호성"],
  "disclaimer": "AI가 생성한 검토용 초안"
}

입력자료:

{{WORDING_INPUT_JSON}}
```

문구 재생성 기능에서도 `validationOnly` 자료는 사용자가 사후 검증 단계를 명확히 선택하지 않은 한 입력하지 않는다.

---

## 9. 구현 완료 체크리스트

- [ ] AI 입력은 `mock-risk-data.js`에서 생성한다.
- [ ] `referenceDocuments.validationOnly`를 AI 입력에서 제거했다.
- [ ] `mock-report-result.js`를 AI 입력에 포함하지 않았다.
- [ ] API 키를 프론트엔드 코드에 작성하지 않았다.
- [ ] AI 응답을 JSON으로 파싱한다.
- [ ] 위험 ID와 필수 영역을 검증한다.
- [ ] AI 핵심 결론 카드가 정확히 5개인지 검증한다.
- [ ] 상품화 가능성 평가가 정확히 8개인지 검증한다.
- [ ] 입력에 없는 근거 ID가 생성되지 않았는지 검증한다.
- [ ] 보험료·요율·보상한도 수치가 임의로 생성되지 않게 했다.
- [ ] 가상자료와 실제 참고자료를 화면에서 구분한다.
- [ ] 약관 문구에 `AI 생성 검토용 초안` 안내가 표시된다.
- [ ] 실무자 검토 상태와 AI 결과를 분리했다.
- [ ] AI 실패 시 `mock-report-result.js` fallback이 동작한다.
- [ ] 실제 상품 비교는 AI 최초 분석 이후에만 표시한다.

---

## 10. Codex가 구현 후 보고할 내용

1. 프롬프트를 저장한 파일 위치
2. API 요청을 담당하는 파일 위치
3. API 키를 설정하는 방법
4. AI 입력에서 제외한 데이터
5. 응답 JSON 검증 방식
6. fallback이 작동하는 조건
7. 실행 방법
8. 포텐스닷 API 응답 구조에서 추가 확인이 필요한 부분

