import type {
  ExplorationCategory,
  RiskExplorationMetricKey,
} from './riskExplorationDemo'

export type ScreeningMetricKey = RiskExplorationMetricKey
export type ScreeningCategory = 'all' | ExplorationCategory

export type ScreeningInsight = {
  valueLabel: string
  reasons: string[]
  sources: string[]
  judgment: string
  tone: 'positive' | 'warning' | 'critical'
  color: string
}

export type ContextualScreeningInsight = ScreeningInsight & {
  title: string
}

export type ScreeningMetricContext = {
  label: string
  tooltipTitle: string
  reasons: string[]
  judgment: string
}

export type ScreeningReference = {
  type: string
  title: string
  description: string
  date: string
  categories: ExplorationCategory[]
  tone: 'red' | 'yellow' | 'blue' | 'gray'
}

const insight = (
  valueLabel: string,
  reasons: string[],
  sources: string[],
  judgment: string,
  tone: ScreeningInsight['tone'] = 'warning',
): ScreeningInsight => ({
  valueLabel,
  reasons,
  sources,
  judgment,
  tone,
  color: {
    positive: '#4ade80',
    warning: '#f59e0b',
    critical: '#ef4444',
  }[tone],
})

export const screeningMetricContexts: Record<
  ScreeningCategory,
  Record<ScreeningMetricKey, ScreeningMetricContext>
> = {
  all: {
    demand: {
      label: '시장 수요 지수',
      tooltipTitle: '시장 수요',
      reasons: ['전체 잠재 가입자 규모와 실제 보험 가입 전환 가능성을 함께 평가합니다.'],
      judgment: '개인·기업 시장을 종합하여 상품화 가능성을 판단합니다.',
    },
    fortuity: {
      label: '우연성',
      tooltipTitle: '우연성',
      reasons: ['사고 발생의 예측 불가능성과 비고의성을 종합 평가합니다.'],
      judgment: '보험사고의 우연성이 충분한지 판단합니다.',
    },
    accumulation: {
      label: '누적위험',
      tooltipTitle: '누적위험',
      reasons: ['단일 사건이 다수 계약에 동시에 손해를 발생시키는지 평가합니다.'],
      judgment: '대형 손해와 동시다발 손해 가능성을 판단합니다.',
    },
    measurability: {
      label: '측정 가능성',
      tooltipTitle: '측정 가능성',
      reasons: ['사고 빈도와 손해액을 통계적으로 측정할 수 있는지 평가합니다.'],
      judgment: '요율 산출과 손해사정 가능성을 판단합니다.',
    },
    adverseSelection: {
      label: '역선택 통제성',
      tooltipTitle: '역선택 통제성',
      reasons: ['고위험 가입자의 집중을 가입 전 정보로 구분할 수 있는지 평가합니다.'],
      judgment: '고지사항과 인수기준으로 위험을 통제할 수 있는지 판단합니다.',
    },
    moralHazard: {
      label: '도덕적 해이',
      tooltipTitle: '도덕적 해이',
      reasons: ['고의사고·과장청구·손해 확대 가능성을 평가합니다.'],
      judgment: '면책, 자기부담금, 사고조사로 통제 가능한지 판단합니다.',
    },
    dataConfidence: {
      label: '데이터 신뢰도',
      tooltipTitle: '데이터 신뢰도',
      reasons: ['사고자료의 양, 최신성, 대표성과 출처 신뢰도를 평가합니다.'],
      judgment: '보험료와 위험률 계산에 활용할 수 있는지 판단합니다.',
    },
    legalExposure: {
      label: '규제 및 법적 리스크',
      tooltipTitle: '규제 및 법적 리스크',
      reasons: ['책임 주체와 관련 법령 및 약관상 보상범위의 명확성을 평가합니다.'],
      judgment: '보상책임을 명확히 설정할 수 있는지 판단합니다.',
    },
  },
  individual: {
    demand: {
      label: '개인 수요 지수',
      tooltipTitle: '개인 고객 수요',
      reasons: [
        '가계가 체감하는 의료비·수리비·소득공백을 중점 평가합니다.',
        '월 납입보험료에 대한 가격 민감도와 실제 가입 의향을 함께 검토합니다.',
      ],
      judgment: '개인 고객이 실제로 보험료를 지불할 가능성을 판단합니다.',
    },
    fortuity: {
      label: '생활사고 우연성',
      tooltipTitle: '생활사고 우연성',
      reasons: [
        '일상생활 중 개인이 예측하거나 통제하기 어려운 사고인지 평가합니다.',
        '고의, 기왕증, 반복행동에 의한 사고와 구분 가능한지 검토합니다.',
      ],
      judgment: '개인의 통제를 벗어난 우연한 생활사고인지 판단합니다.',
    },
    accumulation: {
      label: '가구·지역 누적위험',
      tooltipTitle: '가구·지역 누적위험',
      reasons: [
        '한 사고가 가계의 재산·건강·소득에 동시에 미치는 영향을 평가합니다.',
        '재난 발생 시 동일 지역의 다수 개인계약이 동시 피해를 입는지 검토합니다.',
      ],
      judgment: '개인별 손해와 지역 단위 누적손해를 함께 판단합니다.',
    },
    measurability: {
      label: '개인 손해 확인성',
      tooltipTitle: '개인 손해 확인 가능성',
      reasons: [
        '진단서, 영수증, 수리내역, 소득자료 등 고객 제출자료로 손해를 확인할 수 있는지 평가합니다.',
        '간편 청구와 객관적 손해확인 사이의 균형을 검토합니다.',
      ],
      judgment: '개인 고객이 제출 가능한 자료로 실제 손해를 확인할 수 있는지 판단합니다.',
    },
    adverseSelection: {
      label: '개인 역선택 통제',
      tooltipTitle: '개인 인수 통제성',
      reasons: [
        '연령, 직업, 거주지역, 건강상태, 기기상태 등 개인별 위험정보 활용 가능성을 평가합니다.',
        '고위험 고객만 집중 가입하는 현상을 간단한 고지로 통제 가능한지 검토합니다.',
      ],
      judgment: '개인별 인수조건으로 역선택을 통제할 수 있는지 판단합니다.',
    },
    moralHazard: {
      label: '청구 도덕적 해이',
      tooltipTitle: '개인 청구 도덕적 해이',
      reasons: [
        '소액 반복청구, 허위·과장청구, 가족·지인 공모 가능성을 중점 평가합니다.',
        '정액급부가 사고 예방 노력을 약화시키는지 검토합니다.',
      ],
      judgment: '자기부담금과 청구이력 분석으로 부당청구를 통제할 수 있는지 판단합니다.',
    },
    dataConfidence: {
      label: '개인 데이터 신뢰도',
      tooltipTitle: '개인 사고 데이터 신뢰도',
      reasons: [
        '연령·지역·직업별 사고 빈도와 평균 손해액 자료의 대표성을 평가합니다.',
        '개인정보 활용 동의와 데이터 세분화 가능성을 함께 검토합니다.',
      ],
      judgment: '개인별 보험료 차등화에 사용할 수 있는 데이터인지 판단합니다.',
    },
    legalExposure: {
      label: '소비자·법적 리스크',
      tooltipTitle: '소비자보호 및 법적 리스크',
      reasons: [
        '설명의무, 적합성 원칙, 면책조항의 소비자 이해 가능성을 평가합니다.',
        '개인정보와 민감정보 활용에 따른 법적 제한을 검토합니다.',
      ],
      judgment: '소비자분쟁 없이 보장내용과 면책기준을 설명할 수 있는지 판단합니다.',
    },
  },
  corporate: {
    demand: {
      label: '기업 시장성',
      tooltipTitle: '기업 보험 수요',
      reasons: [
        '업종별 시장규모, 위험관리 예산, 계약당 예상보험료를 중점 평가합니다.',
        '재산·휴업·배상책임의 기존 보장공백을 검토합니다.',
      ],
      judgment: '기업이 위험이전 비용을 지불할 경제적 필요가 있는지 판단합니다.',
    },
    fortuity: {
      label: '사고 우연성·통제',
      tooltipTitle: '기업 사고 우연성 및 통제',
      reasons: [
        '설비 결함, 외부 공격, 직원 실수 등 돌발 사고 가능성을 평가합니다.',
        '유지관리 부실이나 경영진의 고의적 법 위반과 구분 가능한지 검토합니다.',
      ],
      judgment: '정상적인 기업 관리에도 발생 가능한 우연한 사고인지 판단합니다.',
    },
    accumulation: {
      label: '대형·누적손해',
      tooltipTitle: '기업 대형·누적손해',
      reasons: [
        '동일 사업장, 공급망, 클라우드, 공통 설비를 통한 동시손해를 평가합니다.',
        '재산손해에서 휴업손해·제3자 배상으로 연쇄 확대되는지 검토합니다.',
      ],
      judgment: '보유한도, 사고당 한도와 재보험이 필요한 수준인지 판단합니다.',
    },
    measurability: {
      label: '재산·휴업손해 측정',
      tooltipTitle: '기업 재산·휴업손해 측정',
      reasons: [
        '재산손해, 복구비, 매출감소, 추가비용을 회계자료로 산정 가능한지 평가합니다.',
        '사고와 영업손실 사이의 인과관계를 구분할 수 있는지 검토합니다.',
      ],
      judgment: '기업 회계와 운영자료로 실제 손해액을 객관적으로 산정할 수 있는지 판단합니다.',
    },
    adverseSelection: {
      label: '기업 인수통제',
      tooltipTitle: '기업 인수 통제성',
      reasons: [
        '업종, 매출, 설비, 보안·안전 인증, 과거 사고이력을 사전 확인 가능한지 평가합니다.',
        '현장조사와 위험개선 조건으로 고위험 사업장을 구분할 수 있는지 검토합니다.',
      ],
      judgment: '기업별 위험 수준을 차등 인수할 수 있는지 판단합니다.',
    },
    moralHazard: {
      label: '내부통제·도덕적 해이',
      tooltipTitle: '기업 내부통제 및 도덕적 해이',
      reasons: [
        '경영진·임직원의 고의, 내부자 공모, 안전관리 소홀 가능성을 평가합니다.',
        '보험 가입 후 안전·보안 투자를 축소하거나 사고 신고를 지연할 가능성을 검토합니다.',
      ],
      judgment: '내부통제, 감사자료와 자기부담금으로 관리 소홀을 방지할 수 있는지 판단합니다.',
    },
    dataConfidence: {
      label: '업종 데이터 신뢰도',
      tooltipTitle: '기업·업종 손해 데이터 신뢰도',
      reasons: [
        '업종과 기업규모별 사고 빈도·손해심도 자료의 분리 가능성을 평가합니다.',
        '저빈도 대형사고의 표본 부족과 해외 통계 활용 가능성을 검토합니다.',
      ],
      judgment: '기업 규모와 업종별 요율 산출에 충분한 데이터인지 판단합니다.',
    },
    legalExposure: {
      label: '기업 배상·규제 리스크',
      tooltipTitle: '기업 배상책임 및 규제 리스크',
      reasons: [
        '산업안전, 개인정보, 제조물책임, 사용자책임 등 복수 법률 적용 가능성을 평가합니다.',
        '국내외 관할권, 집단소송과 구상권 구조를 검토합니다.',
      ],
      judgment: '기업의 법적 책임과 보험자의 보상범위를 분리할 수 있는지 판단합니다.',
    },
  },
  legal: {
    demand: {
      label: '규제 변화 수요',
      tooltipTitle: '법률·규제 대응 수요',
      reasons: [
        '법 개정과 의무보험 도입이 신규 가입수요를 만드는지 평가합니다.',
        '규제 준수비용과 배상책임 부담이 기존 보장공백으로 이어지는지 검토합니다.',
      ],
      judgment: '규제 변화가 실제 보험 수요로 연결되는지 판단합니다.',
    },
    fortuity: {
      label: '법규변화 우연성',
      tooltipTitle: '법적 책임 발생의 우연성',
      reasons: [
        '고의 위법행위와 예측하기 어려운 법규·해석 변경을 구분합니다.',
        '과실책임과 보험으로 보장할 수 없는 고의책임을 분리 가능한지 검토합니다.',
      ],
      judgment: '보험 가능한 우연한 법적 책임인지 판단합니다.',
    },
    accumulation: {
      label: '체계적 규제위험',
      tooltipTitle: '체계적 규제 및 누적위험',
      reasons: [
        '하나의 법 개정이나 판결이 다수 계약에 동시에 영향을 주는지 평가합니다.',
        '집단소송, 일괄 행정처분과 동일 약관의 누적노출을 검토합니다.',
      ],
      judgment: '동일 규제가 전체 계약군에 미치는 누적 영향을 판단합니다.',
    },
    measurability: {
      label: '법률손해 측정성',
      tooltipTitle: '법률손해 측정 가능성',
      reasons: [
        '방어비용, 배상금, 합의금, 과징금을 구분하여 산정 가능한지 평가합니다.',
        '보험 가능한 손해와 법률상 보장 제한 손해를 분리 가능한지 검토합니다.',
      ],
      judgment: '법률비용과 배상손해를 약관 기준에 따라 산정할 수 있는지 판단합니다.',
    },
    adverseSelection: {
      label: '분쟁 역선택 통제',
      tooltipTitle: '분쟁·준법 기반 인수 통제',
      reasons: [
        '이미 분쟁이 예상되는 계약자의 가입집중을 식별할 수 있는지 평가합니다.',
        '준법감시, 인증, 감사, 소송·민원·제재이력을 인수심사에 활용 가능한지 검토합니다.',
      ],
      judgment: '법규 준수 수준을 기준으로 위험을 차등 인수할 수 있는지 판단합니다.',
    },
    moralHazard: {
      label: '준법·고의위반',
      tooltipTitle: '고의 위법 및 준법 위험',
      reasons: [
        '보험 가입 후 법규 준수 노력을 줄일 가능성을 평가합니다.',
        '고의·중과실 면책과 지속적인 준법의무 설정 가능성을 검토합니다.',
      ],
      judgment: '보험이 위법행위의 유인이 되지 않도록 통제 가능한지 판단합니다.',
    },
    dataConfidence: {
      label: '판례·제재 데이터',
      tooltipTitle: '법률·판례·제재 데이터 신뢰도',
      reasons: [
        '법령, 행정처분, 판례, 분쟁조정 자료의 최신성과 완전성을 평가합니다.',
        '법 개정 전후 책임기준 변화로 과거 데이터가 단절되는지 검토합니다.',
      ],
      judgment: '현재 법률환경을 반영한 평가자료인지 판단합니다.',
    },
    legalExposure: {
      label: '보험 가능 법적위험',
      tooltipTitle: '보험 가능성 및 법률 불확실성',
      reasons: [
        '강행규정, 과징금 지급 제한, 고의 위법 면책 등 보험 가능성을 평가합니다.',
        '책임주체, 손해배상 범위, 관할권과 판례 변경 가능성을 검토합니다.',
      ],
      judgment: '약관으로 보장 가능한 법적 위험인지 최우선 판단합니다.',
    },
  },
  department: {
    demand: {
      label: '영업 활용 수요',
      tooltipTitle: '영업부서 활용 수요',
      reasons: [
        '고객 상담과 신규 제안에서 이해·설명하기 쉬운 위험인지 평가합니다.',
        '목표 고객군과 판매채널에서 실제 전환 가능성을 검토합니다.',
      ],
      judgment: '영업 현장에서 실제 제안 가능한 위험인지 판단합니다.',
    },
    fortuity: {
      label: '상담 사고 우연성',
      tooltipTitle: '영업 관점 사고 우연성',
      reasons: [
        '고객에게 우연한 보험사고로 명확히 설명 가능한지 평가합니다.',
        '고객 행동과 고의사고를 상담 단계에서 구분 가능한지 검토합니다.',
      ],
      judgment: '보험사고의 우연성을 고객에게 명확히 전달할 수 있는지 판단합니다.',
    },
    accumulation: {
      label: '고객군 집중위험',
      tooltipTitle: '영업 고객군 집중위험',
      reasons: [
        '특정 지역, 채널, 업종 고객에게 계약이 집중되는지 평가합니다.',
        '영업조직별 포트폴리오 쏠림과 대량청구 가능성을 검토합니다.',
      ],
      judgment: '영업 포트폴리오의 집중위험을 판단합니다.',
    },
    measurability: {
      label: '상담 정보 확인성',
      tooltipTitle: '상담 정보 확인 가능성',
      reasons: [
        '영업 과정에서 필요한 위험정보를 간단한 질문과 서류로 확인 가능한지 평가합니다.',
        '복잡한 현장조사 없이 기본 보험료 안내가 가능한지 검토합니다.',
      ],
      judgment: '상담 단계에서 필요한 정보를 현실적으로 확보할 수 있는지 판단합니다.',
    },
    adverseSelection: {
      label: '가입자 선별 가능성',
      tooltipTitle: '영업단계 가입자 선별 가능성',
      reasons: [
        '청약질문과 제출서류로 고위험 고객을 구분 가능한지 평가합니다.',
        '판매 편의성을 해치지 않으면서 부적합 계약을 걸러낼 수 있는지 검토합니다.',
      ],
      judgment: '영업단계에서 역선택을 통제할 수 있는지 판단합니다.',
    },
    moralHazard: {
      label: '불완전판매 위험',
      tooltipTitle: '불완전판매 및 영업 도덕적 해이',
      reasons: [
        '실적 중심 판매로 보장내용이 과장되거나 핵심 면책이 누락될 가능성을 평가합니다.',
        '적합성 확인과 설명의무 이행을 검토합니다.',
      ],
      judgment: '판매절차를 통해 불완전판매를 통제할 수 있는지 판단합니다.',
    },
    dataConfidence: {
      label: '영업 데이터 신뢰도',
      tooltipTitle: '영업 데이터 신뢰도',
      reasons: [
        '상담, 견적, 청약, 가입전환 자료의 충분성과 대표성을 평가합니다.',
        '채널별 전환율과 해지율의 왜곡 가능성을 검토합니다.',
      ],
      judgment: '영업 전략 수립에 활용 가능한 데이터인지 판단합니다.',
    },
    legalExposure: {
      label: '판매 규제 리스크',
      tooltipTitle: '판매 및 설명의무 리스크',
      reasons: [
        '금융소비자보호법상 설명의무, 적합성·적정성 원칙을 평가합니다.',
        '광고문구, 모집과정과 민원·제재 가능성을 검토합니다.',
      ],
      judgment: '판매 과정에서 발생 가능한 민원과 제재위험을 판단합니다.',
    },
  },
  customer: {
    demand: {
      label: '고객 체감 수요',
      tooltipTitle: '고객 체감 수요',
      reasons: [
        '고객이 위험을 쉽게 이해하고 보장 필요성을 즉시 체감하는지 평가합니다.',
        '보장금액, 보험료와 가입절차에 대한 고객 수용성을 검토합니다.',
      ],
      judgment: '고객 관점에서 가입 필요성이 명확한지 판단합니다.',
    },
    fortuity: {
      label: '고객 사고 우연성',
      tooltipTitle: '고객 관점 사고 우연성',
      reasons: [
        '고객의 일반적인 예방 노력만으로 피하기 어려운 사고인지 평가합니다.',
        '고객에게 예측 불가능한 사고로 설명 가능한지 검토합니다.',
      ],
      judgment: '고객에게 우연한 사고로 인식될 수 있는지 판단합니다.',
    },
    accumulation: {
      label: '고객 피해 확장성',
      tooltipTitle: '고객 피해 확장성',
      reasons: [
        '하나의 사고가 재산, 건강, 소득피해로 복합 확대되는지 평가합니다.',
        '동일 가구 또는 동일 지역 고객에게 피해가 집중되는지 검토합니다.',
      ],
      judgment: '고객 피해가 복합적으로 확대될 가능성을 판단합니다.',
    },
    measurability: {
      label: '청구 편의성',
      tooltipTitle: '고객 손해확인 및 청구 편의성',
      reasons: [
        '고객이 모바일·간편 절차로 손해자료를 제출할 수 있는지 평가합니다.',
        '보험금 산정기준을 고객이 이해하기 쉬운지 검토합니다.',
      ],
      judgment: '간편하고 명확한 보험금 청구가 가능한지 판단합니다.',
    },
    adverseSelection: {
      label: '고객 위험 구분성',
      tooltipTitle: '고객 위험 구분 가능성',
      reasons: [
        '과도한 개인정보 수집 없이 고객 위험을 구분 가능한지 평가합니다.',
        '청약 질문 수와 고객 이탈 사이의 균형을 검토합니다.',
      ],
      judgment: '고객 부담을 최소화하면서 적정 인수가 가능한지 판단합니다.',
    },
    moralHazard: {
      label: '고객 청구 위험',
      tooltipTitle: '고객 청구 도덕적 해이',
      reasons: [
        '반복청구, 과장청구와 고의사고 가능성을 평가합니다.',
        '고객 편의를 유지하면서 부당청구를 탐지 가능한지 검토합니다.',
      ],
      judgment: '고객 편의성과 부당청구 통제의 균형을 판단합니다.',
    },
    dataConfidence: {
      label: '고객 행동 데이터',
      tooltipTitle: '고객 행동 데이터 신뢰도',
      reasons: [
        '고객 문의, 검색, 상담, 청구자료가 실제 수요를 대표하는지 평가합니다.',
        '특정 채널이나 연령대에 데이터가 편중되는지 검토합니다.',
      ],
      judgment: '고객 수요와 행동을 실제로 반영하는 데이터인지 판단합니다.',
    },
    legalExposure: {
      label: '고객 권익 리스크',
      tooltipTitle: '고객 권익 및 분쟁 리스크',
      reasons: [
        '면책조항, 보상기준, 개인정보 활용이 고객에게 명확한지 평가합니다.',
        '민원, 분쟁조정과 취약고객 보호 이슈를 검토합니다.',
      ],
      judgment: '고객 권익을 보호하면서 분쟁 가능성을 낮출 수 있는지 판단합니다.',
    },
  },
}

export function getContextualScreeningInsight(
  baseInsight: ScreeningInsight,
  category: ScreeningCategory,
  metric: ScreeningMetricKey,
): ContextualScreeningInsight {
  const context = screeningMetricContexts[category][metric]
  return {
    ...baseInsight,
    title: `${context.tooltipTitle} · ${baseInsight.valueLabel}`,
    reasons: [...context.reasons, ...baseInsight.reasons],
    judgment: `${context.judgment} ${baseInsight.judgment}`,
  }
}

/** seoyeon 브랜치 TOP-18 셀별 설명을 현재 도메인 계약으로 옮긴 데이터입니다. */
export const screeningInsights: Record<string, Record<ScreeningMetricKey, ScreeningInsight>> = {
  'ev-battery-fire': {
    demand: insight('92%', ['건물주 및 입주민 보험 문의 증가', '지하주차장 화재 사고 후 관심 증가'], ['검색량 API', '고객센터 비식별 집계'], '시장 전환 가능성을 우선 검토할 항목입니다.', 'positive'),
    fortuity: insight('4.0 / 5.0', ['예측하기 어려운 셀 발화', '충전 도중 급격한 열폭주'], ['소방 화재 통계 · 원문 확인 필요'], '보험사고의 우연성 성립 여부를 약관과 함께 검토합니다.', 'positive'),
    accumulation: insight('5.0', ['지하주차장 연쇄 화재 시 고액 손해', '유독가스와 제연 한계로 피해 확대'], ['재난안전 연구자료 · 원문 확인 필요'], '보유한도와 재보험 구조 검토가 필요합니다.', 'critical'),
    measurability: insight('4.0', ['배터리 용량별 손해 구분 가능'], ['보험 손해율 통계 · 원문 확인 필요'], '세부 데이터 정의가 확보되면 요율 검토가 가능합니다.', 'positive'),
    adverseSelection: insight('높음', ['BMS 사전 진단 데이터 요구 가능'], ['인수심사 가이드'], '노후 차종과 관리 상태를 구분할 수 있는지 확인합니다.', 'positive'),
    moralHazard: insight('보통', ['충전기 방치 등 관리 부실 가능성'], ['이상거래 탐지 분석'], '자기부담금과 점검 조건의 통제 효과를 검토합니다.'),
    dataConfidence: insight('85%', ['3년 공공데이터 연동을 가정'], ['공공데이터포털 · 원문 확인 필요'], '표본 정의와 최신성 확인 후 통계 신뢰도를 판단합니다.', 'positive'),
    legalExposure: insight('고위험', ['제조사 과실 입증과 구상 분쟁 장기화 가능성'], ['법률 연구보고서 · 원문 확인 필요'], '책임 귀속과 구상 절차의 법무 검토가 필요합니다.', 'critical'),
  },
  'generative-ai-copyright': {
    demand: insight('78%', ['IT 기업의 지식재산 소송 대비 문의 증가'], ['기업 B2B 설문'], '기업용 특약 수요를 별도 검증합니다.', 'positive'),
    fortuity: insight('3.0 / 5.0', ['학습데이터 중복이 결과물에 우연히 표출될 가능성'], ['AI 윤리 가이드 · 원문 확인 필요'], '고의 사용과 우연한 침해를 구분해야 합니다.'),
    accumulation: insight('4.0', ['동일 모델 사용 기업의 집단 소송 가능성'], ['해외 판례 DB · 원문 확인 필요'], '모델별 누적 한도와 보상한도 검토가 필요합니다.'),
    measurability: insight('4.0', ['콘텐츠 유사도 비교 도구 활용 가능'], ['저작권위원회 자료 · 원문 확인 필요'], '직접손해와 방어비용의 산정 기준을 분리합니다.', 'positive'),
    adverseSelection: insight('보통', ['사전 필터링과 데이터 관리 체계 점검 필요'], ['인수심사 가이드'], '관리체계가 확인된 기업의 조건부 인수를 검토합니다.'),
    moralHazard: insight('낮음', ['고의 도용은 면책 검토 대상'], ['법무 검토안'], '고의성과 관리 소홀의 경계를 약관에 명시해야 합니다.', 'positive'),
    dataConfidence: insight('72%', ['국내 데이터 누적 기간이 짧음'], ['빅데이터 분석'], '불확실성을 반영한 안전율 검토가 필요합니다.'),
    legalExposure: insight('중위험', ['정부 가이드라인과 판례가 형성 중'], ['정부 공청회 · 원문 확인 필요'], '법령·가이드라인 개정 추이를 지속 관찰합니다.'),
  },
  'commercial-drone': {
    demand: insight('64%', ['물류사의 드론 상용화 실증 확대'], ['국토교통 사업 발표 · 원문 확인 필요'], '의무보험 기준 변화와 실제 가입 수요를 함께 봅니다.', 'positive'),
    fortuity: insight('4.0 / 5.0', ['돌풍과 기체 낙하 등 불시 사고'], ['항공안전 연구자료 · 원문 확인 필요'], '통상적인 운항 중 사고의 우연성을 검토합니다.', 'positive'),
    accumulation: insight('3.0', ['현재는 단발성 개별 사고가 중심'], ['사고 DB'], '관제 장애로 인한 동시 사고 가능성은 별도 확인합니다.', 'positive'),
    measurability: insight('3.0', ['비행 로그와 블랙박스 분석 가능'], ['드론 안전기관 자료 · 원문 확인 필요'], '로그 표준화 여부가 손해사정 가능성을 좌우합니다.'),
    adverseSelection: insight('보통', ['기체 정비 이력 검수 가능'], ['항공 안전기준 · 원문 확인 필요'], '정비 기록 제출과 운항 자격 조건을 검토합니다.'),
    moralHazard: insight('낮음', ['원격 비행 제어 기록 보존 가능'], ['이상행위 검증자료'], '로그 위변조 방지 수준을 먼저 확인합니다.', 'positive'),
    dataConfidence: insight('68%', ['지자체 실증 운행 데이터 활용 가능'], ['드론 산업협회 · 원문 확인 필요'], '상용 운항 데이터가 축적될 때까지 불확실성을 기록합니다.'),
    legalExposure: insight('중위험', ['의무 배상책임 한도 상향 논의'], ['국토교통 법안 · 원문 확인 필요'], '표준 약관과 운영자 책임 범위를 확인합니다.'),
  },
  'autonomous-level4': {
    demand: insight('58%', ['완성차 업체의 무인셔틀 도입'], ['자동차공학 자료 · 원문 확인 필요'], '신규 차종 전용 담보의 실제 수요를 검증합니다.', 'positive'),
    fortuity: insight('4.0 / 5.0', ['센서의 예측하기 어려운 오작동'], ['교통안전 연구자료 · 원문 확인 필요'], '시스템 오류와 관리 소홀을 구분해야 합니다.', 'positive'),
    accumulation: insight('4.0', ['OTA 업데이트 오류가 다수 차량에 동시 전파될 가능성'], ['소프트웨어 안전자료 · 원문 확인 필요'], '동일 버전 차량의 누적 손해 시나리오가 필요합니다.'),
    measurability: insight('2.0', ['해킹과 기체 오류의 원인 규명이 복잡'], ['포렌식 연구자료 · 원문 확인 필요'], '손해사정 난이도와 증거 보존 조건을 우선 검토합니다.', 'critical'),
    adverseSelection: insight('낮음', ['임의 소프트웨어 개조 확인이 어려움'], ['인수심사 검토'], '순정 소프트웨어와 업데이트 이력을 가입 조건으로 검토합니다.', 'critical'),
    moralHazard: insight('보통', ['비상 시 운전자 주의 의무 태만 가능성'], ['사고 조사자료 · 원문 확인 필요'], '제어권 이양 기록과 운전자 상태를 함께 봅니다.'),
    dataConfidence: insight('52%', ['국내 실제 사고 표본이 적음'], ['보험 데이터 연구자료 · 원문 확인 필요'], '초기 단계 불확실성이 높아 추가 데이터가 필요합니다.', 'critical'),
    legalExposure: insight('고위험', ['제조사와 운전자 책임 분쟁 가능성'], ['법원 판례 · 원문 확인 필요'], '책임 주체와 구상 프로세스 정립이 선행되어야 합니다.', 'critical'),
  },
  'deepfake-phishing': {
    demand: insight('71%', ['음성 합성 송금 사기 신고 증가'], ['금융감독 경보 · 원문 확인 필요'], '사이버 피싱 보장의 수요와 지불의사를 검증합니다.', 'positive'),
    fortuity: insight('3.0 / 5.0', ['외부의 지능형 소셜 엔지니어링'], ['사이버범죄 통계 · 원문 확인 필요'], '피보험자의 관리 소홀과 외부 사기를 구분합니다.'),
    accumulation: insight('2.0', ['현재는 표적형 개별 범죄가 중심'], ['보안업체 분석 · 원문 확인 필요'], '플랫폼 취약점 악용 시 집단 피해 가능성은 남습니다.', 'positive'),
    measurability: insight('3.0', ['계좌 이체 금액으로 직접 피해 측정 가능'], ['금융보안 자료 · 원문 확인 필요'], '간접손해와 회수액을 차감하는 기준이 필요합니다.'),
    adverseSelection: insight('낮음', ['보안 취약 사업장의 가입 집중 가능성'], ['인수심사 가이드'], '이중 승인 절차 등 통제 수준을 인수 조건으로 검토합니다.', 'critical'),
    moralHazard: insight('높음', ['내부자 공모와 자작극 가능성'], ['이상거래 검수'], '수사기관 신고와 거래 증빙을 보상 조건으로 검토합니다.', 'critical'),
    dataConfidence: insight('60%', ['신종 피싱 데이터 수집 초기'], ['금융 통계 · 원문 확인 필요'], '사고 유형별 보상한도 세분화가 필요합니다.'),
    legalExposure: insight('중위험', ['금융기관과 보험사의 과실 보상 논의'], ['금융 가이드 · 원문 확인 필요'], '약관상 보상 기준과 책임 분담을 명확히 해야 합니다.'),
  },
  'urban-flooding': {
    demand: insight('76%', ['고강도 집중호우로 재산피해 우려 확대', '지하공간과 소상공인의 영업중단 보장 수요 증가'], ['기상청 집중호우 사례집 · 원문 확인 필요', '행정안전부 자연재난 통계 · 원문 확인 필요'], '개인 재산과 기업 휴업손해를 분리하여 수요를 검증합니다.', 'positive'),
    fortuity: insight('4.0 / 5.0', ['강우 위치와 시간의 불확실성이 높음', '배수능력을 초과하는 단시간 강수 발생'], ['기상청 위험기상 자료 · 원문 확인 필요'], '반복 침수지역을 별도 관리할 수 있는지 확인합니다.', 'positive'),
    accumulation: insight('5.0', ['동일 권역의 다수 계약이 동시에 손상', '상가·주택·차량 피해가 한 사건에 집중'], ['행정안전부 재해연보 · 원문 확인 필요'], '지역별 집적도와 재보험 한도 검토가 필요합니다.', 'critical'),
    measurability: insight('4.0', ['강우량·침수심·표고·배수등급 데이터 결합 가능'], ['기상청 AWS · 원문 확인 필요', '국토교통부 공간정보 · 원문 확인 필요'], '주소 단위 위험등급과 손해 추정의 정확도를 검증합니다.', 'positive'),
    adverseSelection: insight('보통', ['상습 침수지역 계약 집중 가능', '건물 지하층 사용 여부 확인 필요'], ['침수흔적도 · 원문 확인 필요', '인수 현장조사'], '주소·층수·방재시설을 인수조건에 반영할지 검토합니다.'),
    moralHazard: insight('낮음', ['기상관측과 현장 침수흔적으로 사고 확인 가능'], ['기상관측망 · 원문 확인 필요', '손해사정 보고서'], '잔존물 관리와 사고 확인 기준을 명확히 합니다.', 'positive'),
    dataConfidence: insight('82%', ['장기간 강우·재해·침수 공간데이터 축적'], ['기상청 · 원문 확인 필요', '행정안전부 · 원문 확인 필요', '국토교통부 · 원문 확인 필요'], '지역 세분화 요율에 사용할 데이터 정의를 먼저 확인합니다.', 'positive'),
    legalExposure: insight('고위험', ['재난지원금과 보험금 관계 설명 필요', '침수 방지 의무와 관리책임 분쟁 가능'], ['재난 및 안전관리 기본법 · 원문 확인 필요', '보험 약관 검토'], '공적지원 중복과 관리책임 범위를 약관에서 검토합니다.', 'critical'),
  },
  'enterprise-ransomware': {
    demand: insight('74%', ['중소·중견기업의 복구비와 휴업손실 부담 확대', '공급망 연결 기업의 사이버 보장 문의 증가'], ['KISA 사이버 위협 동향 · 원문 확인 필요', '금융보안원 보고서 · 원문 확인 필요'], '기업 규모와 보안성숙도별 지불의사를 검증합니다.', 'positive'),
    fortuity: insight('3.0 / 5.0', ['외부 공격은 우연하지만 취약점 방치가 손해를 확대'], ['KISA 침해사고 분석 · 원문 확인 필요'], '보안패치와 백업 준수 여부를 담보조건으로 검토합니다.'),
    accumulation: insight('5.0', ['동일 클라우드·공급망 취약점으로 동시 피해 가능', '광범위한 서비스 중단이 다수 계약에 파급'], ['KISA 공급망 보안 가이드 · 원문 확인 필요'], '클라우드 사업자별 누적노출과 재보험 한도를 검토합니다.', 'critical'),
    measurability: insight('3.0', ['복구비는 측정 가능하나 평판·미래매출 손실은 불확실'], ['사이버 손해사정 기준 · 원문 확인 필요'], '직접 복구비와 영업손실의 산정방식을 분리합니다.'),
    adverseSelection: insight('보통', ['보안 취약 기업의 가입 집중 가능', 'MFA·백업·EDR 운영 여부 확인 가능'], ['KISA 보호조치 가이드 · 원문 확인 필요'], '보안 체크리스트와 외부진단 결과의 인수 활용을 검토합니다.'),
    moralHazard: insight('보통', ['가입 후 보안투자 축소 가능', '사고 신고 지연 시 손해 확대'], ['사이버보험 인수 사례'], '최소 보안유지 의무와 신속 통지조항을 검토합니다.'),
    dataConfidence: insight('70%', ['공개 사고보다 미신고 사고가 많아 손해분포 왜곡 가능'], ['KISA 신고통계 · 원문 확인 필요', '보험사 사고 DB'], '내부 사고데이터와 외부 위협정보의 결합 기준이 필요합니다.'),
    legalExposure: insight('고위험', ['개인정보 유출 통지·배상책임 발생', '랜섬 지급 관련 제재·준법 이슈'], ['개인정보 보호법 · 원문 확인 필요', 'KISA 대응지침 · 원문 확인 필요'], '법률비용·통지비용·제3자 배상 범위를 분리 검토합니다.', 'critical'),
  },
  'ess-ups-battery-fire': {
    demand: insight('67%', ['데이터센터와 산업시설의 ESS·UPS 설치 확대', '화재 이후 재산·휴업손해 동시 보장 필요'], ['산업통상자원부 ESS 안전점검 자료 · 원문 확인 필요'], '설비재산과 영업중단 결합 수요를 검증합니다.', 'positive'),
    fortuity: insight('4.0 / 5.0', ['셀 내부결함·냉각장치 이상으로 불시 열폭주 가능'], ['한국전기안전공사 안전기준 · 원문 확인 필요'], '설비관리 부실과 돌발 결함을 구분할 기준이 필요합니다.', 'positive'),
    accumulation: insight('4.0', ['동일 건물의 서버·생산설비로 손해 전이', '전력중단으로 다수 사업장 서비스 차질'], ['산업통상자원부 현장점검 자료 · 원문 확인 필요'], '시설 집적도와 업무연속성 계획을 함께 평가합니다.', 'critical'),
    measurability: insight('4.0', ['BMS 온도·전압·충방전 로그 활용 가능'], ['BMS 운영기록', '전기설비 점검기록'], '상태기반 인수와 원인 분석에 필요한 로그 기준을 확인합니다.', 'positive'),
    adverseSelection: insight('높음', ['설치연도·셀 제조사·안전인증·냉각방식 확인 가능'], ['NFPC 607 · 원문 확인 필요', '전기설비규정 KEC · 원문 확인 필요'], '설비 사양과 점검이력의 위험선별 효과를 검토합니다.', 'positive'),
    moralHazard: insight('낮음', ['화재 원인이 로그와 감식으로 확인되는 설비사고'], ['소방감식', 'BMS 로그'], '유지보수 의무와 로그 보존 조건을 검토합니다.', 'positive'),
    dataConfidence: insight('75%', ['정부 조사와 설비 로그는 있으나 세대별 기술 차이가 큼'], ['산업통상자원부 · 원문 확인 필요', '한국전기안전공사 · 원문 확인 필요'], '배터리 계열과 설치환경별로 데이터를 분리합니다.', 'positive'),
    legalExposure: insight('고위험', ['화재안전기준·전기설비규정 준수 여부가 책임에 영향', '제조사·시공사·운영자 간 구상 분쟁'], ['NFPC 607 · 원문 확인 필요', '전기설비규정 KEC · 원문 확인 필요'], '안전기준 위반과 구상권 기준의 법무 검토가 필요합니다.', 'critical'),
  },
  'heatwave-health-income-loss': {
    demand: insight('66%', ['폭염일수 증가로 온열질환과 작업중단 우려 확대', '고령자·야외근로자 중심의 정액형 보장 수요'], ['기상청 기후위기 평가자료 · 원문 확인 필요', '질병관리청 온열질환 감시 · 원문 확인 필요'], '건강보장과 일당형 소득보전 수요를 분리 검증합니다.', 'positive'),
    fortuity: insight('3.0 / 5.0', ['폭염 자체는 예측 가능하지만 개인별 발병은 불확실'], ['기상청 폭염특보 · 원문 확인 필요', '질병관리청 감시체계 · 원문 확인 필요'], '기상지수와 진단기준을 결합한 트리거를 검토합니다.'),
    accumulation: insight('4.0', ['광역 폭염 시 다수 가입자가 동시에 청구 가능'], ['기상청 관측자료 · 원문 확인 필요'], '지역별 최대 지급한도와 계절 누적한도를 검토합니다.', 'critical'),
    measurability: insight('4.0', ['기온·체감온도·특보일수와 의료기록으로 확인 가능'], ['기상청 · 원문 확인 필요', '건강보험 청구자료 · 원문 확인 필요'], '지수형과 실제 손해형의 기초위험을 비교합니다.', 'positive'),
    adverseSelection: insight('보통', ['기저질환·직업·거주환경별 위험차 존재'], ['건강고지', '직업위험등급'], '고령·야외근로 등 위험군별 가입조건을 검토합니다.'),
    moralHazard: insight('보통', ['정액 일당형 상품은 경미한 증상 청구 유인이 존재'], ['건강보험 심사기준 · 원문 확인 필요'], '객관적 특보·진단·치료 요건을 함께 검토합니다.'),
    dataConfidence: insight('79%', ['기상관측과 온열질환 감시자료가 정기적으로 축적'], ['기상청 · 원문 확인 필요', '질병관리청 · 원문 확인 필요'], '지역·연령·직업별 발생률 모델의 대표성을 확인합니다.', 'positive'),
    legalExposure: insight('중위험', ['기상지수와 실제 손해 불일치 가능', '근로자 보호조치와 산재보상 관계 검토 필요'], ['산업안전보건법 · 원문 확인 필요', '보험 약관 검토'], '중복보상과 기초위험 설명 기준을 검토합니다.'),
  },
  'platform-worker-transit-accident': {
    demand: insight('63%', ['플랫폼 노동 확대로 업무 중 상해노출 증가', '자동차·산재·상해 보장 사이 공백 존재'], ['근로복지공단 노무제공자 산재보험 안내 · 원문 확인 필요', '고용노동부 자료 · 원문 확인 필요'], '운행시간 기반 보장에 대한 실제 가입 수요를 검증합니다.', 'positive'),
    fortuity: insight('4.0 / 5.0', ['교통환경과 제3자 과실에 의한 돌발사고'], ['도로교통공단 사고통계 · 원문 확인 필요'], '돌발사고와 위험운전 행태를 구분할 기준이 필요합니다.', 'positive'),
    accumulation: insight('2.0', ['대부분 개별 사고로 발생', '자연재해 시 특정 지역 동시노출 가능'], ['교통사고 통계 · 원문 확인 필요'], '악천후 시간대의 지역별 집중도를 별도 확인합니다.', 'positive'),
    measurability: insight('4.0', ['앱 접속·배차·GPS·운행시간 데이터 활용 가능'], ['플랫폼 운행로그', '경찰 사고기록 · 원문 확인 필요'], '업무 중 사고 여부와 노출량 산정 기준을 검토합니다.', 'positive'),
    adverseSelection: insight('높음', ['운행거리·시간대·사고이력으로 위험선별 가능'], ['운행로그', '보험개발원 사고이력 · 원문 확인 필요'], '노출기반 요율과 안전운전 지표의 활용 가능성을 검토합니다.', 'positive'),
    moralHazard: insight('보통', ['업무·비업무 운행 구분을 둘러싼 분쟁 가능'], ['GPS·배차기록'], '앱 로그인과 배차수락 중 보장개시 기준을 정의해야 합니다.'),
    dataConfidence: insight('73%', ['플랫폼 로그는 정밀하나 사업자별 데이터 형식이 상이'], ['플랫폼사 운행 DB', '근로복지공단 · 원문 확인 필요'], '표준 스키마와 개인정보 동의체계를 먼저 확인합니다.'),
    legalExposure: insight('중위험', ['산재·자동차·민간상해보험 간 보상조정', '종사자 지위 판단에 따른 책임 차이'], ['산업재해보상보험법 · 원문 확인 필요', '자동차손해배상 보장법 · 원문 확인 필요'], '중복보상 조정과 업무성 판단기준을 검토합니다.'),
  },
}

export const screeningLaws: ScreeningReference[] = [
  { tone: 'red', type: '국회 / 발의', title: '전기차 화재 예방 및 피해보상 특별법', description: '지하주차장 소방시설 의무와 피해보상 기준 변화', date: '최근 1일', categories: ['corporate', 'individual', 'legal'] },
  { tone: 'yellow', type: '과기부 / 가이드라인', title: '생성형 AI 저작권 및 출처 표기 지침', description: '학습 데이터 출처와 무단 이용 책임 기준 변화', date: '최근 12시간', categories: ['corporate', 'legal', 'department'] },
  { tone: 'blue', type: '국토부 / 개정예고', title: '상업용 드론 및 자율주행 안전기준 강화', description: '드론 배송 사업자의 제3자 배상책임 기준 변화', date: '최근 2일', categories: ['corporate', 'legal', 'customer'] },
  { tone: 'red', type: '금융위 / 가이드라인', title: '딥페이크 금융사기 예방 지침', description: '본인확인 절차와 피해 발생 시 책임 소재 논의', date: '최근 3일', categories: ['individual', 'customer', 'legal'] },
]

export const screeningCases: ScreeningReference[] = [
  { tone: 'gray', type: '대법원 판례', title: '지하주차장 배터리 열폭주 관련 PL 판단', description: '결함 입증과 유독가스 2차 피해 구상 쟁점', date: '최근 판례', categories: ['corporate', 'individual', 'legal'] },
  { tone: 'gray', type: '손해사정 이슈', title: 'AI 환각에 의한 기업 손실', description: '잘못된 AI 생성 정보로 인한 영업손실 분쟁', date: '시장 동향', categories: ['corporate', 'department'] },
  { tone: 'gray', type: '사고 사례', title: '자율주행 Level 4 제어권 이양 오류', description: '차량 제어권 전환 과정의 과실 분쟁', date: '사고 사례', categories: ['individual', 'corporate', 'legal'] },
  { tone: 'gray', type: '금융감독 신호', title: '음성 복제 딥페이크 자금 갈취', description: '소상공인을 겨냥한 Voice AI 피싱 피해', date: '사고 사례', categories: ['individual', 'customer'] },
]
