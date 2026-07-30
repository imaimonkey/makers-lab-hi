# 위험 후보 01 · 기본 카드와 개요

기사 원문에서 후보 카드의 `candidate`와 `overview`를 만든다. 후보명은 상품 승인 문구가 아니라 상세 검토를 시작하기 위한 초안이다.

- `title`, `summary`, `tags`, `categories`는 기사에 확인된 변화·노출집단·위험 사건만 사용한다.
- `overview`는 `riskEvent`, `expectedLoss`, `productRouteHypothesis`, `nextReview`를 포함한다.
- 손실액 근거가 없으면 `expectedLoss`를 `산정 전 · 확인 필요`로 쓴다.
- 상품화 경로는 보장·보험료·가입 가능 여부의 결론이 아닌 조사 가설로 쓴다.
- 점수·신뢰도는 후보 선별 보조값이며 `isSample: true`와 근거 ID를 남긴다.
- 근거가 약하면 `보류`와 구체적 사유를 반환한다.

주요 출력:

```json
{
  "candidate": {"id":"RC-A-001","title":"위험 후보명","summary":"원인 → 노출집단 → 사건","tags":[],"categories":[],"gap":"조사 공백","nextAction":"다음 확인 작업","status":"검토 대기","evidenceIds":[],"counterEvidence":[],"uncertainty":[]},
  "overview": {"riskEvent":"기사 근거가 있는 위험 사건","expectedLoss":"산정 전 · 확인 필요","productRouteHypothesis":"기존 보장·중복 조사 후 검토할 경로 가설","nextReview":"다음 검토"},
  "screeningScore": {"value":null,"scale":"0-5","meaning":"candidate-prioritization","isSample":true},
  "dataConfidence": {"value":null,"display":"확인 필요","isSample":true},
  "actions": {"detail":"후보 상세","evidence":"근거 검증","assessment":"종합 평가"}
}
```
