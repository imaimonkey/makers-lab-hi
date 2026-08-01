# 현재 기능 분류

기준일: 2026-08-01

| 영역 | UI | 로컬 동작 | 운영 연동 | 주요 코드 |
| --- | --- | --- | --- | --- |
| 실무자·고객·영업 분리 셸과 사용자 전환 | 구현 | 동작 | 인증 미연동 | `src/app/layouts/RootLayout.tsx`, `src/app/layouts/CustomerLayout.tsx`, `src/app/layouts/SalesLayout.tsx`, `src/shared/components/ModeSwitch.tsx` |
| 1. 신규위험 대시보드 | 구현 | 5채널 신호·이슈 매트릭스·준비도·시장 추이·법령·상품 설계 보드, 대시보드·뉴스·후보 병렬 조회, 부분 실패·마지막 정상 데이터·SAMPLE fallback | API 어댑터 구현, 서버/키/실데이터 미연결 시 소스별 SAMPLE 유지 | `src/features/risk-dashboard/RiskRadarSnapshot.tsx`, `RiskSignalPipeline.tsx`, `RiskRadarOperationsPanel.tsx`, `RiskProductDevelopmentBoard.tsx` |
| 2. 위험 후보 목록 | 구현 | 수집 단계·기사 큐·후보 등록 요청·5개 카테고리 필터·공식 공개근거가 연결된 TOP-18 신규 위험 타당성 스크리닝 가로 비교표·법률 보험의무/시행단계/제재강도 기반 우선순위·기사 사건 설명·평가 항목 상세·URL 검색/분류/정렬 | API 어댑터 구현, 후보·법령·통계 서버 미연결; 공개근거 기반 예비 점수는 실제 손해·가입 수요가 아님 | `src/domain/risk/riskExplorationDemo.ts`, `riskLawTracking.ts`, `riskScreeningInsights.ts`, `src/features/risk-catalog/RiskExplorationLens.tsx` |
| 3. 위험 상세·상품화 평가 | 구현 | 기사형 위험 설명·본문 기반 AI 리뷰·현재 사실/확인 필요 경계·원문/관련 기사/법령 링크·연결 인용·상품화 검토 항목·TOP-18 상세 ID·역할별 검토·통계·드라이버·근거 원장 대표 항목 미리보기 및 펼치기·원문/근거/교차검증 게이트·4개 핵심 평가 지표·산출 근거·참조 디자인 섹션 탭·PDF 출력 | 관측 신호 추이 합성 차트는 제거했고, 근거·법령·평가 API 경계 구현 및 브라우저 SAMPLE 저장을 운영 권한 저장소로 교체 필요; URL이 없거나 검증 전인 자료는 연결 대기로 표시 | `src/domain/risk/sampleData.ts`, `src/features/risk-detail/RiskArticleOverview.tsx`, `RiskDecisionWorkspace.tsx`, `EvidenceVerificationWorkspace.tsx`, `ProductizationEvaluationPanel.tsx`, `src/styles/workstream-parity.css` |
| 4. 종합 리포트 | 구현 | 목록 검색·필터·정렬·보기 전환, 신규 생성·로딩·fallback, 12개 상품화 기준별 AI/실무자 판단, 구조화 브리핑·섹션 편집·저장·약관 초안·Q&A·PDF | same-origin·로컬 fallback 프록시 구현, `VITE_POTENS_PROXY_URL` 및 운영 인증/저장소 필요 | `src/pages/reports/ReportsPage.tsx`, `src/report/**`, `vite.config.ts` |
| 5. 고객 상황 입력 | 구현 | 동작 | 고객 인증·채널 미연동 | `src/features/customer-insight/CustomerInsightStudio.tsx` |
| 영업부서 현장 리포트 모드 | 구현 | 동작·`localStorage` 데모 | 접수 API·SSO·검토 큐 미연동 | `src/app/layouts/SalesLayout.tsx`, `src/pages/sales-intake/SalesIntakePage.tsx`, `src/features/sales-intake/SalesIntakeStudio.tsx` |
| 상품 후보 산출 | 구현 | 규칙 기반 동작 | 상품 마스터·약관 검색 미연동 | `src/features/customer-insight/recommendationEngine.ts` |
| 신규위험 갭 탐지 | 구현 | 규칙 기반 동작 | 모델·검토 API 미연동 | `src/features/customer-insight/recommendationEngine.ts` |
| 비식별 신호 환류 | 구현 | `localStorage` 동작 | 동의 원장·집계 API 미연동 | `src/domain/risk/customerSignalStorage.ts` |
| 공식 상품 링크 | 구현 | 외부 링크 | 링크 유효성 자동검사 미연동 | `src/domain/product/catalog.ts` |

## 알려진 제한

- 위험 후보, 점수, 증거 수, 보고서 내용은 모두 구조 검토용 샘플이다.
- 고객 결과는 키워드 기반 프로토타입이며 현대해상의 공식 추천·설계·인수 판단이 아니다.
- 고객과 실무자 화면은 한 SPA 안의 서로 다른 레이아웃으로 시연한다. 운영 시에는 채널, 인증, 권한, 배포 단위까지 분리해야 한다.
- 새로고침 후에도 동의한 고객 신호가 같은 브라우저에 남지만 서버나 다른 사용자에게 전송되지는 않는다.
- 영업부서 리포트도 현재는 같은 브라우저의 `localStorage`에 최대 30건을 보관하는 발표용 입력 프레임이며, 실무자 위험 후보로 자동 승격되지 않는다.
- 실제 상품 약관 본문, 판매 상태, 개정 이력은 앱 데이터에 동기화되지 않는다.
- hyoje API 액션과 jh 리포트 프록시는 프런트 경계까지 구현되어 있으나, `.env`의 서버 URL과 운영 백엔드가 없으면 실패 상태를 표시하고 SAMPLE 데이터를 유지한다.
- seoyeon의 셀별 출처·판단과 sh의 통계·추세 값은 브랜치 기능을 검증하기 위한 샘플이며 공식 데이터나 실제 인수 판단이 아니다.
- 위험 상세와 리포트의 브라우저 저장은 발표용 로컬 SAMPLE 상태다. 실제 사용자 간 공유, 권한, 버전 충돌, 감사 이력은 운영 저장소 연결 전까지 지원하지 않는다.
- 2026-07-28 재통합 범위와 브랜치별 비교 기준은 `features/workstream-integration-0728.md`에서 관리한다.
