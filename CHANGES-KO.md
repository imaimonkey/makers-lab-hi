# 0723-backup 반영 내용

이번 반영은 `C:\Users\kimhy\Documents\makerslap\maker-rebuild`에서 검증한 개발자 모드 재구축 결과를 기준으로 합니다. 원본 `C:\Users\kimhy\Desktop\maker`는 수정하지 않았습니다.

## 주요 수정

- 개발자 모드에 실제 `public/articles/*.pdf` 원문을 연결했습니다. PDF 본문을 Step 1~4 입력으로 사용하고, 원문이 없으면 다른 후보의 자료를 대신 표시하지 않습니다.
- 페이지 1 `/developer-test`의 원문 수집·본문 확보·Step 1 분석 버튼을 실제 저장 흐름에 연결했습니다. Step 2 저장 후보·추이·법령 큐는 저장된 결과가 있을 때만 표시합니다.
- 개발자 모드에서는 `demoIssues`, `demoRisks`, `demoLaws`, `demoTrend`, `sampleRiskCandidates`, `sampleRiskDetails`를 결과 대체값으로 사용하지 않습니다. 실제 데이터가 없으면 빈 상태·로딩·오류로 표시합니다.
- 페이지 2 `/developer-test/risks`에서 실제 Step 2 결과를 후보·점수·법령·추이로 복원하고 후보의 `articleId`를 페이지 3으로 전달합니다.
- 페이지 3 `/developer-test/risks/:riskId`에서 저장된 Step 3 8개 결과를 실제 상세 UI에 반영합니다.
  - 위험 문장·노출 주체·주요 손해·판단 상태
  - 지표별 점수와 원점수, `왜 이 점수인가` 사유
  - 실제 Evidence Ledger, 불확실성, 독립 출처 비교
  - 판단 브리프·상품화 검토·담당자 인계 결과
  - Step 3 실제 관측점만 표시하며 없는 시계열을 임의로 만들지 않음
- 페이지 3의 법령 영역에서 국가법령정보 API를 실제 검색하고, 선택한 결과의 상세 원문과 제1조 조문을 조회할 수 있도록 연결했습니다. 법률 판단은 자동 확정하지 않고 담당자·법무 확인 게이트로 남깁니다.
- 페이지 4 `/developer-test/reports`는 선택한 동일 `articleId`의 Step 3 결과만 입력으로 사용하고, Step 3가 완성되지 않으면 Step 4 실행을 막습니다.
- 개발자 모드에서 화면 버튼이 실패할 때 운영 모드의 샘플 유지 문구를 보여주지 않고, 실패 원인·대상 단계·재시도 가능 상태를 표시하도록 정리했습니다.
- 페이지 1의 개발자 우선순위·추이·법령 카드가 저장된 실제 결과를 소비하도록 수정하고, 운영 모드 링크가 개발자 라우트로 잘못 빠지는 문제를 수정했습니다.
- Step 3 카드의 구조화 필드가 없는 응답도 원문에서 실제 요약·불릿을 추출해 카드가 빈 설명으로 남지 않도록 보완했습니다.

## 데이터 계약

```text
ARTICLE-001
└─ developer-ARTICLE-001
   ├─ data/developer-step2-analysis.xlsx
   ├─ data/developer-step3-analysis.xlsx
   └─ data/developer-step4-analysis.xlsx
```

Excel 결과와 `news-classifications.json`은 로컬 실행 중 생성되는 데이터이므로 저장소의 `.gitignore` 정책에 따라 커밋하지 않았습니다. 실제 실행 시 각 단계 결과가 해당 `articleId`로 다시 생성·복원됩니다. API 키는 `.env.example`의 자리표시자만 올리고 실제 `.env`는 올리지 않았습니다.

## 검증 결과

```text
npm run lint   통과
npm run build  통과
```

브라우저에서 다음 흐름을 확인했습니다.

```text
/developer-test
→ /developer-test/risks
→ /developer-test/risks/developer-ARTICLE-001
→ /developer-test/reports?articleId=ARTICLE-001
```

페이지 3에서는 실제 Step 3 결과의 6개 지표 점수와 사유, 19개 근거 원장, 1개 실제 추세 관측점을 확인했고, 샘플 문구가 결과 화면에 표시되지 않는 것을 확인했습니다.

## 실행 방법

```bash
npm install
npm run dev
```

개발자 모드에서 실제 AI 분석을 실행하려면 `.env`에 Gemini 또는 Potens 키, 네이버 뉴스 API 키, 국가법령정보 API 키를 설정해야 합니다. 키가 없을 때는 mock 결과를 개발자 Excel에 저장하지 않습니다.
