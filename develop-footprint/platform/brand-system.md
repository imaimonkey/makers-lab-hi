# 현대해상 맥락과 브랜드 시스템

확인일: 2026-07-18. 아래 사실은 현대해상 공식 웹사이트를 기준으로 정리했다. 이 프로토타입은 공식 서비스나 승인된 브랜드 산출물이 아니다.

## 회사·서비스 맥락

현대해상은 1955년 해상보험 전업회사로 시작해 해상, 화재, 자동차, 특종, 장기, 연금·퇴직보험 등을 제공하는 손해보험사다. 공식 Hi-Value 체계는 목적을 `모두의 더 나은 삶을 가능하게 합니다`, 미션을 `고객의 건강하고 안전한 삶과 함께하는 파트너`로 제시하며 Honor, Excellence, Action, Respect, Trust를 핵심 가치로 둔다.

공식 비전은 데이터 기반 경영, 고객별 상품 개발, 디지털 UX와 인슈어테크를 강조한다. 신규위험 탐색과 고객 인사이트 환류는 이 맥락을 제품 방향으로 번역하되, 공식 내부 전략이나 실제 운영 현황이라고 주장하지 않는다.

- [현대해상 회사소개](https://www.hi.co.kr/serviceAction.do?menuId=101510)
- [현대해상 비전](https://www.hi.co.kr/serviceAction.do?menuId=101530)

## 공식 디자인 아티팩트

### CI

공식 설명은 직선과 원, 명확한 대비, 곧은 기업 철학을 CI 형태의 의미로 제시한다. 현재 앱은 승인된 CI 파일을 내려받아 쓰지 않았으며, 별도의 단순 `HI` 제품 표식과 `비공식 내부 콘셉트` 문구를 사용한다.

- [현대해상 CI](https://www.hi.co.kr/serviceAction.do?menuId=101571)

### 컬러

| 토큰 | 공식 값 | 의미·사용 |
| --- | --- | --- |
| Hi Orange | Pantone 1375C, `#ff9e1b`, RGB 255/158/27, CMYK 0/44/90/0 | 고객을 향한 따뜻한 마음, 핵심 행동 강조 |
| Hi Navy | Pantone 281C, `#00205b`, RGB 0/32/91, CMYK 100/72/0/64 | 보험 전문성, 셸·주요 텍스트 |
| Vibrant Orange | Pantone 1575C, `#ff7f32` | 하트마크 그라데이션 보조값 |

화면의 옅은 배경, 테두리, 성공·경고색은 접근성을 위해 만든 파생 UI 색상이며 공식 브랜드 색으로 표기하지 않는다. 공식 안내처럼 기본 배경은 흰색을 우선한다.

- [현대해상 컬러 시스템](https://www.hi.co.kr/serviceAction.do?menuId=101575)

### 태그라인과 어조

공식 태그라인은 `마음이 합니다`다. 고객을 겁주거나 위험을 과장하는 표현보다 이해, 보호, 다음 행동을 명확하게 안내하는 어조를 사용한다.

- [현대해상 태그라인](https://www.hi.co.kr/serviceAction.do?menuId=101573)

### 서체

`현대해상 마음체`는 공식 헤드라인 서체지만 공식 페이지는 개인적 비상업 용도에 한해 무료 사용을 안내하고 상업 인쇄·광고·온라인 사용과 수정은 허용하지 않는다. 따라서 저장소에 서체 파일을 포함하지 않았고 Noto Sans KR 및 시스템 sans-serif를 사용한다. 사용 승인을 받은 파일과 라이선스 증빙이 제공될 때만 교체한다.

- [현대해상 서체와 이용 조건](https://www.hi.co.kr/serviceAction.do?menuId=101574)

## 현재 디자인 번역

- Navy 고정 사이드바: 실무용 정보 밀도와 안정감
- Orange 핵심 행동: 신규위험 검토, 고객 신호 환류 같은 다음 행동
- 흰색 카드와 얇은 경계: 근거·평가 단위를 분리
- 숫자와 상태 라벨: 탐지 흐름의 빠른 스캔
- 코드 기반 SVG 아이콘: 외부 아이콘 라이선스 의존 제거
- 반응형 전환: 사내 데스크톱 중심, 태블릿·모바일 검토 지원

## 공식 상품 연결 원칙

현재 카탈로그는 공식 페이지에서 확인한 상품명과 링크를 사용한다. 설명은 탐색용 요약이며 보장 설명을 대체하지 않는다.

- [퍼펙트플러스종합보험](https://www.hi.co.kr/serviceAction.do?menuId=929020)
- [굿앤굿어린이종합보험Q](https://www.hi.co.kr/serviceAction.do?menuId=100222)
- [행복가득생활보장보험](https://www.hi.co.kr/serviceAction.do?menuId=201754)
- [다이렉트 자동차보험](https://direct.hi.co.kr/service.do?m=8c94703cc5)
- [다이렉트 운전자보험](https://direct.hi.co.kr/service.do?m=3a5a96a226)
- [굿앤굿우리펫보험](https://direct.hi.co.kr/service.do?m=8ff525b675)
- [다이렉트 해외여행보험](https://direct.hi.co.kr/service.do?m=e3a371efbe)
- [다이렉트 사업장화재보험](https://direct.hi.co.kr/service.do?m=6c27ed53bd)
- [현대해상 상품공시](https://www.hi.co.kr/serviceAction.do?menuId=100950)

운영 전에는 판매 상태, 링크, 최신 약관 버전, 채널별 차이를 현대해상 승인 상품 마스터로 재검증해야 한다.
