# AI 약관 편집

- Entry: `/reports` 약관 영역의 `AI Chat`
- Full-screen route: `/reports/policy-editor?reportId=...`
- Layout: 문서 영역과 AI 대화 영역을 50:50으로 배치하고 실무자용 사이드바를 숨긴다.
- Save state: `수정 중` → `저장됨`; 저장하지 않은 상태로 이탈하면 확인 모달을 표시한다.
- Persistence: `wordingFeasibility.policyEditor.addedArticles`에 신규 조항을 저장하고 종합리포트 약관 문서에 다시 반영한다. 저장소에 저장된 wrapper의 `content`도 다시 읽어 편집 화면을 복원한다.
- Document source: 편집 화면은 선택된 `reportId`의 `createArticlePolicyDraft` 결과를 사용하며 고정 약관을 사용하지 않는다.

## AI 대화 예시

1. `환불 관련 규정 알려줘` → 현재 리포트에서 일치하는 환불·취소 조항 안내
2. `[현재 리포트의 미해결 항목] 관련 조항을 만들어줘` → 현재 리포트의 마지막 조항 다음 번호로 새 초안 작성 → 문서 반영
3. `보상한도 문구를 명확하게 해줘` → 제7조 기준의 검토 안내

응답은 현재 리포트의 제목·조항을 반영한 프론트엔드 대화이며 최종 약관이나 법률 의견으로 확정하지 않는다.
