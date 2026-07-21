# 현재 기능 분류

기준일: 2026-07-20

| 영역 | UI | 로컬 동작 | 운영 연동 | 주요 코드 |
| --- | --- | --- | --- | --- |
| 실무자·고객·영업 분리 셸과 사용자 전환 | 구현 | 동작 | 인증 미연동 | `src/app/layouts/RootLayout.tsx`, `src/app/layouts/CustomerLayout.tsx`, `src/app/layouts/SalesLayout.tsx`, `src/shared/components/ModeSwitch.tsx` |
| 1. 신규위험 대시보드 | 구현 | 샘플 표시 | 데이터 소스 미연동 | `src/pages/risk-dashboard/RiskDashboardPage.tsx` |
| 2. 위험 후보 목록 | 구현 | 검색·필터 샘플 | 후보 API 미연동 | `src/pages/risk-catalog/RiskCatalogPage.tsx` |
| 3. 위험 상세·상품화 평가 | 구현 | 샘플 표시 | 근거·의견·승인 API 미연동 | `src/pages/risk-detail/RiskDetailPage.tsx` |
| 4. 종합 리포트 | 구현 | 샘플 표시 | 생성·결재·내보내기 미연동 | `src/pages/reports/ReportsPage.tsx` |
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
