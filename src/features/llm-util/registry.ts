import type { LlmUtilityDefinition } from './types'

export const llmUtilityDefinitions: readonly LlmUtilityDefinition[] = [
  {
    id: 'util-1',
    label: '텍스트 요약',
    caption: '긴 입력을 핵심 문장으로 정리',
    description: '긴 문서나 메모에서 핵심 주장과 확인할 내용을 요약합니다.',
    starterPrompt: '다음 메모를 핵심 내용 3가지와 추가 확인사항 2가지로 요약해 주세요.',
    icon: 'report',
  },
  {
    id: 'util-2',
    label: '키워드 추출',
    caption: '입력에서 주요 주제와 용어 추출',
    description: '입력 내용에서 반복되거나 중요한 주제와 용어를 구조화합니다.',
    starterPrompt: '다음 문장에서 주요 키워드 5개를 뽑고 각각의 근거를 한 줄로 설명해 주세요.',
    icon: 'list',
  },
  {
    id: 'util-3',
    label: '대화형 응답',
    caption: '질문에 대한 초안 답변 생성',
    description: '실무자가 검토할 수 있는 답변 초안을 생성합니다.',
    starterPrompt: '다음 질문에 대해 확정적인 단정은 피하고, 확인이 필요한 항목을 포함해 답변해 주세요.',
    icon: 'spark',
  },
  {
    id: 'util-4',
    label: '위험 신호 초안',
    caption: '신호를 후보 검토용 문장으로 변환',
    description: '입력 신호를 신규위험 후보 검토에 사용할 수 있는 초안으로 정리합니다.',
    starterPrompt: '다음 신호를 관찰 사실, 가능한 영향, 반증이 필요한 부분으로 나누어 주세요.',
    icon: 'radar',
  },
]
