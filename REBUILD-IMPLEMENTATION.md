# 새 개발자 워크벤치 구현 안내

이 폴더는 `C:\Users\kimhy\Desktop\maker`를 수정하지 않고 UI와 입력 자산을 별도 복사한 재구축본입니다.

## 화면 분리

- 실무자: `/`, `/risks`, `/risks/:riskId`, `/reports`
- 개발자: `/developer-test`, `/developer-test/risks`, `/developer-test/risks/:riskId`, `/developer-test/reports`
- 고객·영업 화면: `/customer-insight`, `/sales-intake`

개발자 경로에서는 실무자 모드의 `demo*`, `sample*`, 고정 차트·법령·후보를 사용하지 않습니다. 데이터가 없으면 빈 상태를 보여주고, 실패하면 실패 원인과 대상 ID를 표시합니다.

## 실제 데이터 흐름

1. `src/article/*.pdf`를 브라우저에서 읽고 PDF 본문을 추출합니다.
2. `/developer-test`에서 본문 확보와 Step 1 위험 신호 분류를 실행합니다. Step 1은 서버의 `/api/llm/generate`를 통해 설정된 Gemini/Potens만 사용하며 mock 결과는 저장하지 않습니다.
3. `/developer-test/risks`에서 실제 원문을 입력으로 Step 2 프롬프트 7개를 순차 실행합니다. 결과는 `data/developer-step2-analysis.xlsx`에 저장됩니다.
4. 저장된 Step 2의 `articleId`로 `/developer-test/risks/:riskId`를 열고, 실제 PDF·Step 2 결과를 확인한 뒤 Step 3 8개 분석을 실행합니다. 결과는 `data/developer-step3-analysis.xlsx`에 저장됩니다.
5. Step 3 결과가 같은 `articleId`로 존재할 때만 `/developer-test/reports`에서 Step 4를 실행할 수 있습니다. 결과는 `data/developer-step4-analysis.xlsx`에 저장됩니다.

모든 단계는 다음 ID 계약을 사용합니다.

```text
articleId  ARTICLE-001
riskId     developer-ARTICLE-001
evidenceId ARTICLE-001-source
```

## 실행

```bash
npm.cmd install
npm.cmd run dev
npm.cmd run check
```

AI를 실행하려면 새 폴더에 `.env`를 만들고 `GEMINI_API_KEY` 또는 `POTENS_API_KEY`를 설정합니다. 키가 없거나 API가 실패하면 임의의 샘플 결과를 만들지 않고 해당 단계가 실패 상태로 남습니다.

원본 프로젝트의 기존 Excel 결과는 화면 초기값으로 사용하지 않도록 `data/reference/legacy-results`에 보관했습니다.
