# util-1 · 신호 정리 AI

네이버 뉴스·데이터를 검색어별로 받아 신규위험 신호를 분류하고, 저장 가능한 구조화 결과로 만드는 1번 AI의 독립 작업 영역입니다.

- 기본 시스템 프롬프트: `system-prompt.md`
- 호출 진입점: `runUtil1()`
- 개발자 화면 경로: `src/features/llm-util/util-1/system-prompt.md`
- 뉴스 검색어 설정: `data/naver-news-search-config.json`
- 공유 저장: `data/llm-system-prompts.json`의 util-1 레코드
- 네이버 검색 실행: 개발자 화면의 Client ID·Client Secret 입력과 검색어 선택
- 정보 수집: 저장된 검색어 전체로 최신 뉴스 조회 및 중복 제거

인증값은 저장하지 않으며, 검색 결과에서 선택한 기사만 AI 1 테스트 입력으로 보냅니다.

기능 구현 코드와 관련 테스트를 이 디렉터리 안에서 관리합니다.
