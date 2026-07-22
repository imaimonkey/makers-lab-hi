# 기능 브랜치 패리티 점검

기준일: 2026-07-23

대상: `origin/hyoje`, `origin/seoyeon`, `origin/jh`, `origin/sh`

## 점검 방법

네 원격 브랜치를 독립 worktree로 체크아웃해 공통 시작점 이후의 파일과 최종 화면을 직접 비교했다. 단순 병합 여부가 아니라 각 브랜치에만 있던 화면·상호작용·데이터 경계가 `0723-backup`의 안정 경로에서 접근 가능한지를 기준으로 확인했다.

## 브랜치별 결론

### hyoje

- 대시보드의 채널·처리 단계·이슈 매트릭스·준비도·시장 조사·상품 설계 보드를 `/`에 통합했다.
- 수집·본문 확보·AI 분석·교차검증·법령·후보 등록 흐름을 `/risks`에 통합했다.
- 기사 본문·사실/해석·근거 원장·불확실성·독립 출처·법령·5개 게이트와 9개 평가 항목을 `/risks/:riskId`에 통합했다.
- 브랜치 API 계약은 `src/domain/risk/riskRadarTypes.ts`와 `src/features/risk-dashboard/riskRadarApi.ts`로 옮겼다.

### seoyeon

- TOP-5 후보와 6개 분류, 검색·기간·지역·정렬을 `/risks`에 통합했다.
- 법률·규제 4건과 판례·손해·시장 신호 4건을 분류 필터와 연동했다.
- 12열 비교표의 8개 평가 지표마다 분석 근거·데이터 출처·최종 판단 팝오버를 제공한다. 마우스 hover와 키보드 focus를 모두 지원한다.
- 원본의 `<style jsx global>` 및 기본 export 불일치로 인한 단독 빌드 오류는 현재 Vite/React 구조에 맞게 제거했다.

### sh

- 역할별 뷰, 검토 완료·PDF·저장·공유, 근거 필터와 판단 메모를 유지했다.
- 원본에만 있던 4개 핵심 통계, 3축 위험 드라이버, 8개월 추세 SVG, 표 전환, 추세 요약, 우선 대응 3개 카드를 `/risks/:riskId`에 추가했다.
- 고정된 단일 위험 화면 대신 현재 선택한 위험 후보 데이터에서 표시값을 구성한다.

### jh

- `src/report`의 생성 목록, 상세 편집기, 상품화 평가, 약관 초안, Q&A, PDF 기능을 `/reports`에 유지했다.
- 사용되지 않던 생성 상태와 생성 서비스를 목록 → 신규 생성 → 로딩 → 결과/fallback → 상세 흐름으로 연결했다.
- `/api/report-assistant` 프록시에 `generateReport`, `generatePolicyDraft`, `askReportQuestion`, `getReportContent`, `saveReportContent`를 연결했다. 원본 Vite 설정에서 누락된 `generateReport`도 보완했다.
- GAS/서버 URL이 없을 때 오류를 숨기지 않고 명시적 SAMPLE fallback을 표시한다.

## 의도적으로 복사하지 않은 것

- 기능과 무관한 과거 `room-*` 내비게이션·독립 HTML 셸은 복사하지 않았다. 브랜치별 전역 테마는 안정 셸을 깨지 않도록 라우트 범위의 시각 언어(`hyoje-visual`, `seoyeon-visual`, `sh-visual`, `jh-visual`)로 재구성했다.
- 데스크톱 좌측 내비게이션은 아이콘과 기존 탭명·설명을 함께 표시하도록 복구했고, 모바일에서는 공간을 위해 아이콘 레일을 유지한다.
- 화면 셸과 공통 컴포넌트도 경로별로 분리했다. hyoje는 `#f4f6f8`·화이트·`#2f6fed` 운영 포털, seoyeon은 `#f8fafc`·화이트·`#2563eb` 스크리닝 콘솔, sh는 크림·블랙·`#2864dc` 편집형 상세 화면, jh는 원본 `report.css`의 딥 네이비·오렌지 팔레트를 사용한다.
- seoyeon의 포트폴리오용 `ProjectFilter.tsx`는 신규위험 스크리닝 기능과 데이터 계약이 연결되지 않은 템플릿 코드라 제품 기능 패리티 대상에서 제외했다.
- jh의 `dash.html` 다중 진입점은 현재 SPA 안정 경로 `/reports`와 중복되므로 추가하지 않았다.

## 운영 전 제한

현재 숫자·출처·판단은 SAMPLE이다. 외부 API URL, 인증, 권한, 실제 데이터 저장소가 없으면 API 액션은 실패 상태를 표시하고 샘플을 유지한다. 단일 신호를 자동 승격하거나 보험 보장·보험료·가입 가능성을 확정하지 않는다.
