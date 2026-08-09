import type { RiskDetailResearchSource } from './riskDetailSources'

export const evBatteryDeepAnalysisIntro = '전기차 배터리 화재를 보험의 관점에서 바라볼 때 가장 먼저 구분해야 할 것은, 이 위험이 단순히 ‘전기차에서 불이 났는가’의 문제만은 아니라는 점입니다. 위험은 배터리 셀·팩의 제조, 차량 운행 중 충격, 충전, 주차, 화재 발생, 인접 차량으로의 연소 확대와 건물 피해에 이르는 전 과정에서 발생합니다. 따라서 상품화 가능성을 판단하려면 화재 발생 건수만 볼 것이 아니라 어떤 조건에서 사고가 시작되고 한 건의 사고가 어느 범위까지 손해로 확대되는지를 함께 살펴봐야 합니다.'

export type EvBatteryDeepAnalysisSection = {
  title: string
  body: string
  source?: RiskDetailResearchSource
  insuranceMeaning: string
}

const munichBatteryPdf = 'https://www.munichre.com/content/dam/munichre/mram/content-pieces/pdfs/specialty-insurance/Lithium-Ion_Battery_White_Paper-FINAL-WEB.pdf/_jcr_content/renditions/original./Lithium-Ion_Battery_White_Paper-FINAL-WEB.pdf'
const kiriEvReport = 'https://www.kiri.or.kr/pdf/%EC%97%B0%EA%B5%AC%EC%9E%90%EB%A3%8C/%EC%97%B0%EA%B5%AC%EB%B3%B4%EA%B3%A0%EC%84%9C/nre2024-04_1.pdf?utm_source=chatgpt.com'

export const evBatteryDeepAnalysisSections: EvBatteryDeepAnalysisSection[] = [
  {
    title: '리튬이온 배터리의 화재 원인은 하나로 한정되지 않는다',
    body: '리튬이온 배터리는 다수의 셀에 높은 에너지를 저장하는 구조이며 사고 원인도 하나로 한정되지 않습니다. Munich Re는 배터리의 energetic failure 원인을 설계·제조 결함, 기계적 충격, 전기적 이상, 열적 이상 등으로 구분합니다. 특히 한 개 셀에서 열폭주가 시작되면 인접 셀로 연쇄적으로 확산되면서 배터리 팩 전체의 화재로 발전할 수 있습니다.',
    source: {
      institution: 'Munich Re',
      title: 'Munich Re 원문 PDF · 배터리 화재 위험 원인 p.2',
      url: `${munichBatteryPdf}#page=2`,
      role: '배터리 화재 원인과 열폭주 확산 구조를 설명하는 원문',
    },
    insuranceMeaning: '',
  },
  {
    title: '전체 손해 경로를 기준으로 평가해야 한다',
    body: '이 위험은 차량 한 대의 화재만 보는 것이 아니라 배터리 이상 → 열폭주 → 인접 차량·충전설비 → 주차장·건물 손해로 이어지는 전체 손해 경로를 기준으로 평가해야 하는 복합 재산위험입니다.',
    insuranceMeaning: '',
  },
  {
    title: '화재 빈도와 사고 이후 손해 심도를 구분해야 한다',
    body: '전기차 위험을 평가할 때는 화재 발생 빈도와 사고 발생 이후의 손해 심도를 구분할 필요가 있습니다. AXA XL은 전기차가 내연기관차보다 반드시 화재가 더 자주 발생한다고 단정하기는 어렵지만, 배터리 화재가 발생한 경우 진압이 어렵고 주변 재산까지 손해가 확대될 수 있다는 점을 별도로 고려해야 한다고 설명합니다.',
    source: {
      institution: 'AXA XL',
      title: 'AXA XL 원문',
      url: 'https://axaxl.com/fast-fast-forward/articles/how-evs-are-changing-auto-manufacturing-insurance?utm_source=chatgpt.com',
      role: 'EV 화재 빈도와 사고 이후 주변 재산손해의 불확실성을 설명하는 원문',
    },
    insuranceMeaning: '',
  },
  {
    title: '손해 규모는 사고 조건에 따라 달라진다',
    body: '따라서 보험상품의 필요성은 단순히 화재 빈도가 높기 때문에 발생하는 것이 아닙니다. 동일한 사고라도 배터리 손상 정도, 화재 지속시간, 인접 차량과의 거리, 충전시설과 방재설비의 상태에 따라 손해 규모가 크게 달라질 수 있다는 점에서 기존 차량 화재와 다른 위험평가가 필요합니다.',
    insuranceMeaning: '',
  },
  {
    title: '지하주차장은 집적손해를 확대할 수 있다',
    body: '특히 지하주차장은 차량과 충전설비가 밀집되어 있어 한 건의 사고가 다수의 재산손해로 확대될 수 있습니다. Swiss Re는 EV 충전시설에서 과충전·단락·설비 이상과 차량 간 화재 확산(car-to-car fire spread)을 고려해야 한다고 설명하며, 자동화재감지, 스프링클러, 충전전원 차단과 같은 방재체계를 주요 위험관리 요소로 제시합니다.',
    source: {
      institution: 'Swiss Re Corporate Solutions',
      title: 'Swiss Re Corporate Solutions 원문',
      url: 'https://corporatesolutions.swissre.com/insights/knowledge/res-electric-vehicle-charging-systems.html',
      role: 'EV 충전시설의 화재요인과 차량 간 화재 확산, 방재체계를 설명하는 원문',
    },
    insuranceMeaning: '',
  },
  {
    title: '차량·시설·건물의 PML을 함께 평가해야 한다',
    body: '한 차량의 화재가 인접 차량과 충전설비, 주차장 설비와 건물까지 이어질 경우 여러 보험계약이 하나의 사고에 동시에 연결될 수 있습니다. 따라서 차량 자체 손해뿐 아니라 동일 공간에 집중된 다수 차량과 건물의 최대가능손해(PML)를 함께 평가할 필요가 있습니다.',
    insuranceMeaning: '',
  },
  {
    title: '국내 실제 사고에서도 손해 확대가 확인된다',
    body: '국내 실제 사고에서도 이러한 손해 확대 가능성이 확인됩니다. 보험연구원은 2024년 인천 청라 지하주차장 화재에서 42대가 전소되고 45대가 부분소, 793대가 그을음 피해를 입어 총 880대의 차량이 피해를 입었다고 정리했습니다. 이는 차량 한 대에서 시작된 사고가 밀집된 주차공간에서 대규모 손해로 확대될 수 있음을 보여주는 사례입니다.',
    source: {
      institution: '보험연구원',
      title: '보험연구원 원문 PDF · 사고 및 화재 통계 p.1',
      url: `${kiriEvReport}#page=1`,
      role: '지하주차장 전기차 화재의 다수 차량 피해 사례를 확인하는 원문',
    },
    insuranceMeaning: '',
  },
  {
    title: '사고심도와 PML을 별도로 검토해야 한다',
    body: '손해 심도 역시 별도로 검토할 필요가 있습니다. 보험연구원이 소방청 자료를 분석한 결과에서는 전기차 화재의 건당 재산피해액이 내연기관차보다 높게 나타났습니다. 따라서 상품화 판단에서는 단순 사고 건수보다 차량가액, 배터리 교체비용, 인접 차량 피해, 건물 복구비용과 PML을 함께 평가하는 방식이 필요합니다.',
    source: {
      institution: '보험연구원',
      title: '보험연구원 원문 PDF · 보험 및 손해심도 검토 p.3',
      url: `${kiriEvReport}#page=3`,
      role: '전기차 화재의 건당 재산피해액과 사고심도 검토를 위한 원문',
    },
    insuranceMeaning: '',
  },
  {
    title: '책임 주체는 사고 원인에 따라 달라진다',
    body: '배터리 화재가 발생했다고 해서 책임 주체가 자동으로 결정되는 것도 아닙니다. 원인이 배터리 셀·팩의 제조결함인지, 차량 충격에 따른 손상인지, 충전기의 이상인지, 주차시설의 관리 문제인지에 따라 책임 주체가 달라질 수 있습니다. 보험연구원도 전기차 충전소 사고에서는 전기차 제조업체·충전기 제조업체·충전기 운영업체 등 여러 주체가 잠재적인 책임 당사자가 될 수 있다고 설명합니다.',
    source: {
      institution: '보험연구원',
      title: '보험연구원 원문 PDF · 책임주체 및 보장 공백 p.5',
      url: `${kiriEvReport}#page=5`,
      role: '전기차·충전시설 사고의 책임주체와 보장 공백을 검토하는 원문',
    },
    insuranceMeaning: '',
  },
  {
    title: '사고 원인과 책임을 구분할 데이터가 필요하다',
    body: '따라서 사고 원인을 구분할 수 있는 데이터가 중요합니다. BMS 상태정보, 충전 이력, 차량 사고·정비 기록, 충전시설 점검기록과 화재조사 결과를 확보할 수 있다면 사고 원인과 책임관계를 구분하는 자료로 활용할 수 있습니다. 이러한 정보의 관리 여부는 사고조사뿐 아니라 시설과 사업자별 위험을 차등화하는 인수조건으로도 활용할 수 있습니다.',
    insuranceMeaning: '',
  },
  {
    title: '배터리 관리와 시설 통제 수준을 확인해야 한다',
    body: 'Munich Re 역시 배터리의 손상·과충전·과방전·과열과 비인가 수리 등을 위험관리 요소로 제시합니다. 따라서 보험사는 시설별로 배터리 관리체계, 충전설비 점검, 방재설비와 비상차단 체계 등을 확인하여 위험 수준을 구분할 수 있습니다.',
    source: {
      institution: 'Munich Re',
      title: 'Munich Re 원문 PDF · 위험통제 항목 p.3',
      url: `${munichBatteryPdf}#page=3`,
      role: '배터리 손상·충전·과열·비인가 수리와 위험통제 요소를 설명하는 원문',
    },
    insuranceMeaning: '',
  },
  {
    title: '충전시설 확대와 함께 제도·보험 연계를 확인해야 한다',
    body: '국내 제도 역시 전기차 보급과 충전시설 확대에 따라 지하주차장의 화재 안전관리를 강화하는 방향으로 변화하고 있습니다. 보험연구원은 친환경자동차 충전시설이 확대되는 과정에서 밀폐된 주차공간의 화재 위험관리가 중요해졌다고 설명하며 자동차보험뿐 아니라 충전사업자 배상책임보험·화재보험 등의 연계 검토가 필요하다고 제시합니다.',
    source: {
      institution: '보험연구원',
      title: '보험연구원 원문 PDF · 지하주차장 및 제도 검토 p.2',
      url: `${kiriEvReport}#page=2`,
      role: '전기차 충전시설 확대에 따른 지하주차장 화재관리와 보험 연계 방향을 설명하는 원문',
    },
    insuranceMeaning: '',
  },
  {
    title: '기존 보험의 보장 공백부터 확인해야 한다',
    body: '전기차 배터리 화재는 완전히 새로운 손해만을 만드는 것은 아닙니다. 차량 자체 손해는 자동차보험, 건물과 시설 피해는 재산보험, 충전사업자의 과실은 배상책임보험, 배터리나 차량의 제조결함은 제조물책임보험과 연결될 수 있습니다. 문제는 하나의 사고가 여러 보험영역의 경계에 동시에 걸릴 수 있다는 점입니다.\n\n따라서 신규상품 개발에 앞서 확인해야 할 질문은 ‘전기차 화재보험’을 새로 만들 것인가가 아니라 기존 보험이 차량·건물·충전시설·제조결함을 각각 어디까지 보장하며 어느 지점에서 실제 보장 공백이 발생하는가입니다.\n\n기존 자동차보험·재산종합보험·영업배상책임보험·제조물배상책임보험의 담보와 면책을 실제 판매 약관 기준으로 비교한 뒤, 시설 단위 특약, 충전사업자 배상책임 확장 또는 별도 배터리 관련 담보 중 어떤 방식이 적절한지 판단해야 합니다.',
    insuranceMeaning: '',
  },
  {
    title: '측정 가능한 세부 위험부터 상품화할 수 있다',
    body: '해외에서는 EV 위험 전체를 하나의 포괄적인 상품으로 묶기보다 세부 위험을 분리해 보험화하는 사례가 나타나고 있습니다. Munich Re는 E-Mobility Warranty Cover를 통해 배터리 등 주요 부품의 장기 성능과 제조사의 보증 위험을 보험으로 이전하는 구조를 운영하고 있습니다.',
    source: {
      institution: 'Munich Re',
      title: 'Munich Re · E-Mobility Warranty Cover 원문',
      url: 'https://www.munichre.com/en/solutions/for-industry-clients/enabling-the-e-mobility-transition.html?utm_source=chatgpt.com',
      role: '배터리 등 주요 부품의 성능·보증 위험을 별도 보험화한 사례',
    },
    insuranceMeaning: '',
  },
  {
    title: '독립상품보다 제한적 특약부터 검토할 수 있다',
    body: '현재 단계에서는 전기차 배터리 화재 전체를 넓게 보장하는 독립상품보다 기존 재산·배상책임보험에 제한적 특약을 추가하거나, 지하주차장·충전시설처럼 위험 범위를 특정한 시범담보를 운영하는 방식이 현실적입니다.\n\n초기 담보는 인접 차량·건물의 재산손해, 사고 원인조사·대응비용, 충전시설 운영자의 제한적 배상책임으로 구성할 수 있습니다. 불법 개조, 비인가 배터리 수리, 중대한 안전점검 의무 위반과 이미 확인된 결함의 방치는 면책 또는 인수 제한 대상으로 검토할 수 있습니다.',
    insuranceMeaning: '',
  },
]
