# Makers Lab · Four Rooms

4명이 한 프로젝트에서 페이지와 기능을 나누어 연습할 수 있는 React 초기 골격입니다.

## 시작하기

```bash
npm install
npm run dev
```

## 담당 분리

| 담당 | 경로 | 페이지 폴더 | 기능 폴더 | 예시 기능 |
| --- | --- | --- | --- | --- |
| 1번 | `/rooms/one` | `src/pages/room-one` | `src/features/room-one` | 카운터 |
| 2번 | `/rooms/two` | `src/pages/room-two` | `src/features/room-two` | 카드 필터 |
| 3번 | `/rooms/three` | `src/pages/room-three` | `src/features/room-three` | 체크리스트 |
| 4번 | `/rooms/four` | `src/pages/room-four` | `src/features/room-four` | 프로필 폼 |

공통 레이아웃과 컴포넌트는 `src/shared`, 전체 라우트 설정은 `src/app/router.tsx`에서 관리합니다. 각 담당자는 자신의 `pages/room-*`, `features/room-*` 폴더 위주로 작업하면 됩니다.

## 권장 협업 규칙

- 개인 브랜치: `feature/room-one`, `feature/room-two` 형식
- 공통 컴포넌트 변경은 팀원과 먼저 공유
- 새 페이지 추가 시 자신의 기능 폴더 안에서 구현하고 `router.tsx`에 경로만 연결
- 작업 전 `npm run build`와 `npm run lint` 확인
