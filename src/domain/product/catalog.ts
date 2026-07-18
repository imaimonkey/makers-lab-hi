export type CustomerContextTag =
  | 'business'
  | 'car'
  | 'child'
  | 'digital'
  | 'driver'
  | 'family'
  | 'health'
  | 'home'
  | 'mobility'
  | 'pet'
  | 'travel'

export type ProductCatalogItem = {
  id: string
  name: string
  category: string
  summary: string
  confirmationPoint: string
  tags: CustomerContextTag[]
  productUrl: string
  sourceLabel: string
}

export const productDisclosureUrl = 'https://www.hi.co.kr/serviceAction.do?menuId=100950'

export const productCatalog: ProductCatalogItem[] = [
  {
    id: 'perfect-plus',
    name: '퍼펙트플러스종합보험',
    category: '건강·종합',
    summary: '상해·질병·배상책임 등 생애 위험을 하나의 증권에서 검토하는 종합보험',
    confirmationPoint: '실제 보장은 선택 특약과 인수 심사에 따라 달라지므로 건강·배상책임 담보를 각각 확인하세요.',
    tags: ['health', 'family', 'digital'],
    productUrl: 'https://www.hi.co.kr/serviceAction.do?menuId=929020',
    sourceLabel: '현대해상 공식 장기보험상품몰',
  },
  {
    id: 'good-and-good-child',
    name: '굿앤굿어린이종합보험Q',
    category: '자녀·가족',
    summary: '출생부터 성장단계별 질병·상해와 가족의 생활 위험을 폭넓게 살펴보는 어린이보험',
    confirmationPoint: '태아·자녀·산모 관련 담보의 가입 시점과 특약별 면책·지급 조건을 확인하세요.',
    tags: ['child', 'family', 'health'],
    productUrl: 'https://www.hi.co.kr/serviceAction.do?menuId=100222',
    sourceLabel: '현대해상 공식 상품 안내',
  },
  {
    id: 'happy-life',
    name: '행복가득생활보장보험',
    category: '주택·생활',
    summary: '주택의 화재·누수·가전제품 고장과 일상생활 위험을 살펴보는 재물보험',
    confirmationPoint: '주택 형태, 목적물, 가전제품과 배상책임 특약의 보장 범위·면책을 확인하세요.',
    tags: ['home', 'family', 'digital'],
    productUrl: 'https://www.hi.co.kr/serviceAction.do?menuId=201754',
    sourceLabel: '현대해상 공식 장기보험상품몰',
  },
  {
    id: 'direct-car',
    name: '현대해상 다이렉트 자동차보험',
    category: '자동차',
    summary: '자동차 사고의 대인·대물 위험과 운전환경에 맞는 특약을 확인하는 자동차보험',
    confirmationPoint: '차량, 운전자 범위, 안전운전 데이터와 할인 특약의 최신 적용 조건을 확인하세요.',
    tags: ['car', 'driver', 'mobility'],
    productUrl: 'https://direct.hi.co.kr/service.do?m=8c94703cc5',
    sourceLabel: '현대해상 다이렉트 공식 상품 안내',
  },
  {
    id: 'direct-driver',
    name: '현대해상 다이렉트 운전자보험',
    category: '운전자',
    summary: '운전 중 사고에 따른 비용손해와 상해 위험의 보장 후보를 확인하는 운전자보험',
    confirmationPoint: '자동차보험과 운전자보험의 역할이 다르며 비용 담보는 특약별 한도·요건을 확인해야 합니다.',
    tags: ['driver', 'car', 'mobility'],
    productUrl: 'https://direct.hi.co.kr/service.do?m=3a5a96a226',
    sourceLabel: '현대해상 다이렉트 공식 상품 안내',
  },
  {
    id: 'direct-pet',
    name: '굿앤굿우리펫보험',
    category: '반려동물',
    summary: '반려견의 질병·상해 치료비와 보호자의 관련 위험을 검토하는 펫보험',
    confirmationPoint: '반려동물의 종·연령·과거 질환과 특약별 면책기간 및 보장 제외 항목을 확인하세요.',
    tags: ['pet', 'family', 'health'],
    productUrl: 'https://direct.hi.co.kr/service.do?m=8ff525b675',
    sourceLabel: '현대해상 다이렉트 공식 상품 안내',
  },
  {
    id: 'direct-travel',
    name: '현대해상 다이렉트 해외여행보험',
    category: '여행',
    summary: '해외여행 중 상해·질병·휴대품·배상책임 등 돌발상황을 확인하는 여행보험',
    confirmationPoint: '여행 국가·기간·활동과 특약에 따라 보장 여부가 달라지므로 출발 전 약관을 확인하세요.',
    tags: ['travel', 'health', 'digital'],
    productUrl: 'https://direct.hi.co.kr/service.do?m=e3a371efbe',
    sourceLabel: '현대해상 다이렉트 공식 상품 안내',
  },
  {
    id: 'direct-business-fire',
    name: '현대해상 다이렉트 사업장화재보험',
    category: '개인사업자',
    summary: '개인사업장의 화재손해·배상책임·휴업손해 등 사업 운영 위험을 검토하는 보험',
    confirmationPoint: '개인사업자 여부, 건물·업종·규모에 따라 가입이 제한될 수 있어 대상 조건을 확인하세요.',
    tags: ['business', 'home'],
    productUrl: 'https://direct.hi.co.kr/service.do?m=6c27ed53bd',
    sourceLabel: '현대해상 다이렉트 공식 상품 안내',
  },
]
