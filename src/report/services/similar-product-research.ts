import type {
  SimilarProductComparisonItem,
  SimilarProductResearch,
  SimilarProductStatus,
  SimilarProductKind,
  SimilarityJudgment,
  LegacyNoveltyType,
  NoveltyAnalysis,
  NoveltyAnalysisStatus,
  NoveltySourceType,
  NoveltyType,
  SimilarProductItem,
  SimilarProductType,
  SimilarityType,
} from '../../domain/product/similarProduct'

const SIMILAR_PRODUCT_STATUSES: SimilarProductStatus[] = [
  'same_product_found',
  'partial_similar_found',
  'direct_match_not_found',
  'additional_check_required',
]

const NOVELTY_TYPES: LegacyNoveltyType[] = ['existing_product', 'differentiated', 'new_product', 'needs_verification']
const PRODUCT_KINDS: SimilarProductKind[] = ['independent_product', 'rider', 'unknown']
const SIMILARITY_JUDGMENTS: SimilarityJudgment[] = ['same', 'partial_similar', 'related_coverage', 'not_directly_related', 'additional_check_required']

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown, fallback: string) => typeof value === 'string' && value.trim() ? value.trim() : fallback
const optionalText = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
const enumValue = <T extends string>(value: unknown, values: T[], fallback: T): T => typeof value === 'string' && values.includes(value as T) ? value as T : fallback
const optionalEnumValue = <T extends string>(value: unknown, values: T[]): T | undefined => typeof value === 'string' && values.includes(value as T) ? value as T : undefined

export const similarProductStatusLabels: Record<SimilarProductStatus, string> = {
  same_product_found: '동일·유사상품 확인',
  partial_similar_found: '부분 유사보장은 있으나 직접 대응 상품 미확인',
  direct_match_not_found: '직접 대응 국내 상품 미확인',
  additional_check_required: '공개자료 부족으로 추가 확인 필요',
}

export const noveltyTypeLabels: Record<LegacyNoveltyType, string> = {
  existing_product: '기존상품형',
  differentiated: '차별화형',
  new_product: '신규형',
  needs_verification: '검증 필요',
}

export const similarProductKindLabels: Record<SimilarProductKind, string> = {
  independent_product: '독립 상품',
  rider: '기존 상품 특약',
  unknown: '구분 확인 필요',
}

export const similarityJudgmentLabels: Record<SimilarityJudgment, string> = {
  same: '동일',
  partial_similar: '부분 유사',
  related_coverage: '관련 보장',
  not_directly_related: '직접 관련 없음',
  additional_check_required: '추가 확인 필요',
}

export const similarProductSummaryBullets = (status: SimilarProductStatus): string[] => {
  if (status === 'same_product_found') {
    return [
      '국내 보험사에서 유사한 상품 또는 특약 판매 중',
      '보장 대상과 핵심 담보가 제안 상품과 일부 중복',
      '기존 상품 대비 차별화 범위 재검토 필요',
    ]
  }
  if (status === 'partial_similar_found') {
    return [
      '기존 보험에서 관련 손해 일부 보장',
      '신규 위험 전체를 직접 보장하는 상품은 미확인',
      '남는 보장 공백을 중심으로 상품 차별화 가능',
    ]
  }
  if (status === 'direct_match_not_found') {
    return [
      '조사한 국내 보험사 공개자료에서 동일상품 미확인',
      '직접 대응하는 특약 또는 부분 보장이 제한적',
      '신규 상품으로서 후속 검토 가치 있음',
    ]
  }
  return [
    '공개된 상품·약관 자료만으로 동일상품 여부 판단 어려움',
    '보험사 상품공시 및 특약 자료 추가 확인 필요',
    '실무자 검증 후 신규성 최종 판단 필요',
  ]
}

const noveltyTypeForStatus = (status: SimilarProductStatus): LegacyNoveltyType => {
  if (status === 'same_product_found') return 'existing_product'
  if (status === 'partial_similar_found') return 'differentiated'
  if (status === 'direct_match_not_found') return 'new_product'
  return 'needs_verification'
}

export const createDefaultSimilarProductResearch = (sourceDate?: string | null): SimilarProductResearch => ({
  similarProductStatus: 'additional_check_required',
  sameProductCount: 0,
  partialSimilarCount: 0,
  relatedCoverageCount: 0,
  noveltyType: 'needs_verification',
  noveltySummary: similarProductStatusLabels.additional_check_required,
  summaryBullets: similarProductSummaryBullets('additional_check_required'),
  comparisonItems: [],
  sourceDate: sourceDate ?? null,
  dataStatus: 'SAMPLE',
})

const normalizeComparisonItem = (value: unknown, index: number): SimilarProductComparisonItem | null => {
  if (!isRecord(value)) return null
  return {
    id: text(value.id, `similar-product-${index + 1}`),
    insurerName: text(value.insurerName, '보험사 확인 필요'),
    productName: text(value.productName, '상품·특약명 확인 필요'),
    productKind: enumValue(value.productKind, PRODUCT_KINDS, 'unknown'),
    coverageTarget: text(value.coverageTarget, '주요 보장 대상 확인 필요'),
    coverageScope: text(value.coverageScope, '주요 보장 범위 확인 필요'),
    overlap: text(value.overlap, '제안 상품과의 겹침 범위 확인 필요'),
    difference: text(value.difference, '제안 상품과의 차이 확인 필요'),
    similarity: enumValue(value.similarity, SIMILARITY_JUDGMENTS, 'additional_check_required'),
    sourceLabel: optionalText(value.sourceLabel),
    sourceUrl: optionalText(value.sourceUrl),
    sourceDate: typeof value.sourceDate === 'string' ? value.sourceDate : null,
  }
}

export const normalizeSimilarProductResearch = (value: unknown, sourceDate?: string | null): SimilarProductResearch => {
  const fallback = createDefaultSimilarProductResearch(sourceDate)
  if (!isRecord(value)) return fallback

  const comparisonItems = Array.isArray(value.comparisonItems)
    ? value.comparisonItems.map(normalizeComparisonItem).filter((item): item is SimilarProductComparisonItem => item !== null)
    : []
  const status = enumValue(value.similarProductStatus, SIMILAR_PRODUCT_STATUSES, fallback.similarProductStatus)
  const noveltyType = enumValue(value.noveltyType, NOVELTY_TYPES, noveltyTypeForStatus(status))
  const summaryBullets = Array.isArray(value.summaryBullets)
    ? value.summaryBullets.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim()).slice(0, 3)
    : []

  return {
    similarProductStatus: status,
    sameProductCount: count(value.sameProductCount),
    partialSimilarCount: count(value.partialSimilarCount),
    relatedCoverageCount: count(value.relatedCoverageCount),
    noveltyType,
    noveltySummary: text(value.noveltySummary, similarProductStatusLabels[status]),
    summaryBullets: summaryBullets.length ? summaryBullets : similarProductSummaryBullets(status),
    comparisonItems,
    researchedCompanyCount: typeof value.researchedCompanyCount === 'number' ? count(value.researchedCompanyCount) : undefined,
    sourceDate: typeof value.sourceDate === 'string' ? value.sourceDate : fallback.sourceDate,
    dataStatus: value.dataStatus === 'LIVE' || value.dataStatus === 'SAMPLE' || value.dataStatus === 'STALE' || value.dataStatus === 'FALLBACK'
      ? value.dataStatus
      : undefined,
  }
}

const NOVELTY_ANALYSIS_STATUSES: NoveltyAnalysisStatus[] = ['pending', 'completed', 'needs-review']
const NOVELTY_ANALYSIS_TYPES: NoveltyType[] = ['existing', 'differentiated', 'new', 'verification-required']
const SIMILAR_PRODUCT_TYPES: SimilarProductType[] = ['standalone', 'rider', 'package', 'related-coverage', 'verification-required']
const SIMILARITY_TYPES: SimilarityType[] = ['same', 'highly-similar', 'partial', 'related', 'not-related', 'verification-required']
const NOVELTY_SOURCE_TYPES: NoveltySourceType[] = [
  'insurer-product-page',
  'insurer-disclosure',
  'policy-document',
  'knia-disclosure',
  'exclusive-use-right',
  'insurance-damoa',
  'official-press-release',
]

export const noveltyAnalysisStatusLabels: Record<NoveltyAnalysisStatus, string> = {
  pending: '분석 예정',
  completed: '분석 완료',
  'needs-review': '추가 확인 필요',
}

export const noveltyAnalysisTypeLabels: Record<NoveltyType, string> = {
  existing: '기존상품형',
  differentiated: '차별화형',
  new: '신규형',
  'verification-required': '검증 필요',
}

export const similarProductTypeLabels: Record<SimilarProductType, string> = {
  standalone: '단독상품',
  rider: '특약',
  package: '패키지',
  'related-coverage': '관련 보장',
  'verification-required': '확인 필요',
}

export const similarityTypeLabels: Record<SimilarityType, string> = {
  same: '동일',
  'highly-similar': '거의 동일',
  partial: '부분 유사',
  related: '관련 보장',
  'not-related': '직접 관련 없음',
  'verification-required': '검증 필요',
}

export const noveltySourceTypeLabels: Record<NoveltySourceType, string> = {
  'insurer-product-page': '보험사 상품 안내',
  'insurer-disclosure': '보험사 상품공시',
  'policy-document': '약관·상품설명서',
  'knia-disclosure': '생명·손해보험협회 공시',
  'exclusive-use-right': '배타적 사용권 공시',
  'insurance-damoa': '보험다모아',
  'official-press-release': '공식 보도자료',
}

export const NOVELTY_OFFICIAL_SOURCES: Array<{ id: string; title: string; url: string; sourceType: NoveltySourceType }> = [
  { id: 'knia-consumer-disclosure', title: '생명·손해보험협회 소비자포털 상품공시', url: 'https://consumer.knia.or.kr/disclosure.do', sourceType: 'knia-disclosure' },
  { id: 'insurance-damoa', title: '보험다모아 상품 비교', url: 'http://www.e-insmarket.or.kr/', sourceType: 'insurance-damoa' },
  { id: 'insurer-official-disclosure', title: '보험사 공식 상품공시·약관·상품설명서', url: '', sourceType: 'insurer-disclosure' },
  { id: 'knia-exclusive-use-right', title: '생명·손해보험협회 배타적 사용권 공시', url: '', sourceType: 'exclusive-use-right' },
]

const canonicalNoveltyTypeFromLegacy = (value: LegacyNoveltyType | undefined): NoveltyType | null => {
  if (value === 'existing_product') return 'existing'
  if (value === 'differentiated') return 'differentiated'
  if (value === 'new_product') return 'new'
  if (value === 'needs_verification') return 'verification-required'
  return null
}

const canonicalAnalysisStatusFromLegacy = (status: SimilarProductStatus): NoveltyAnalysisStatus => {
  if (status === 'same_product_found' || status === 'partial_similar_found' || status === 'direct_match_not_found') return 'completed'
  return 'needs-review'
}

const nullableCount = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : null
const stringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim()) : []
const additionalSources = (value: unknown): Array<{ title: string; url: string }> => Array.isArray(value)
  ? value.filter(isRecord).map((item) => ({ title: optionalText(item.title) ?? '추가 공식 자료', url: optionalText(item.url) ?? '' })).filter((item) => item.url)
  : []

const noveltyReasonsFor = (status: NoveltyAnalysisStatus, noveltyType: NoveltyType | null): string[] => {
  if (status === 'pending') {
    return [
      '최종 위험 후보가 확정되면 국내 공개 상품·약관을 비교합니다.',
      '동일·유사상품 여부와 남는 보장 공백을 확인한 뒤 신규성을 판단합니다.',
    ]
  }
  if (status === 'needs-review' || noveltyType === 'verification-required') {
    return [
      '공개된 상품공시·약관만으로 동일상품 여부를 확정하기 어렵습니다.',
      '비교 대상 보험사와 공식 자료를 추가 확인해야 차별화 가능성을 판단할 수 있습니다.',
    ]
  }
  if (noveltyType === 'existing') return ['동일 또는 거의 동일한 보장 구조가 확인되었습니다.', '기존 상품과의 차이와 신규 보장 공백을 별도로 검토해야 합니다.']
  if (noveltyType === 'differentiated') return ['관련 보장 또는 부분 유사상품이 확인되었습니다.', '기존 상품에 남는 보장 공백과 차별화 요소를 비교했습니다.']
  return ['조사한 공식 공개자료에서 직접 대응하는 상품이 확인되지 않았습니다.', '실제 상품 개발 전 공식 공시와 약관 범위를 추가 검증해야 합니다.']
}

export const createDefaultNoveltyAnalysis = (): NoveltyAnalysis => ({
  analysisStatus: 'pending',
  riskId: '',
  riskName: '',
  noveltyType: null,
  noveltyHeadline: '최종 위험 후보 선정 후 유사상품 분석 예정',
  noveltyShortSummary: '최종 위험 후보 선정 후 국내 보험사 상품공시·약관·특약 비교 예정입니다.',
  noveltySummary: '분석 대상 위험이 확정되면 국내 보험사의 상품공시, 약관 및 특약을 비교하여 동일·유사상품 여부를 표시합니다.',
  reviewedCompanyCount: null,
  sameProductCount: null,
  partialSimilarCount: null,
  relatedCoverageCount: null,
  differentiatedGapCount: null,
  comparisonItems: [],
  judgmentReasons: noveltyReasonsFor('pending', null),
  limitations: ['최종 위험 후보와 비교 기준이 확정되지 않아 국내 출시 현황을 아직 조회하지 않았습니다.'],
  checkedAt: null,
})

const normalizeNoveltyItem = (value: unknown, index: number): SimilarProductItem | null => {
  if (!isRecord(value)) return null
  const legacyKind = value.productKind === 'rider' ? 'rider' : value.productKind === 'independent_product' ? 'standalone' : undefined
  const productType = enumValue(value.productType, SIMILAR_PRODUCT_TYPES, legacyKind ?? 'verification-required')
  const legacySimilarity = value.similarity === 'same' ? 'same' : value.similarity === 'partial_similar' ? 'partial' : value.similarity === 'related_coverage' ? 'related' : value.similarity === 'not_directly_related' ? 'not-related' : undefined
  const similarityType = enumValue(value.similarityType, SIMILARITY_TYPES, legacySimilarity ?? 'verification-required')
  const overlap = stringArray(value.overlappingCoverage)
  const legacyOverlap = optionalText(value.overlap)
  const gaps = stringArray(value.remainingGaps)
  const difference = optionalText(value.difference)
  const differentiation = stringArray(value.differentiation)
  if (!gaps.length && difference) differentiation.push(difference)
  return {
    id: text(value.id, `similar-product-${index + 1}`),
    insurerName: text(value.insurerName, '보험사 확인 필요'),
    productName: text(value.productName, '상품·특약명 확인 필요'),
    productType,
    overlappingCoverage: overlap.length ? overlap : legacyOverlap ? [legacyOverlap] : [],
    remainingGaps: gaps,
    differentiation,
    similarityType,
    sourceTitle: text(value.sourceTitle, optionalText(value.sourceLabel) ?? '출처 확인 필요'),
    sourceUrl: optionalText(value.sourceUrl),
    sourceType: optionalEnumValue(value.sourceType, NOVELTY_SOURCE_TYPES),
    sourceDate: typeof value.sourceDate === 'string' ? value.sourceDate : null,
    checkedAt: typeof value.checkedAt === 'string' ? value.checkedAt : typeof value.sourceDate === 'string' ? value.sourceDate : null,
    additionalSources: additionalSources(value.additionalSources),
  }
}

const hasCanonicalNoveltyFields = (value: Record<string, unknown>) => 'analysisStatus' in value || 'noveltyHeadline' in value || 'judgmentReasons' in value

export const normalizeNoveltyAnalysis = (value: unknown, sourceDate?: string | null): NoveltyAnalysis => {
  const fallback = createDefaultNoveltyAnalysis()
  if (!isRecord(value)) return fallback

  if (!hasCanonicalNoveltyFields(value) && typeof value.similarProductStatus === 'string') {
    const legacy = normalizeSimilarProductResearch(value, sourceDate)
    const status = canonicalAnalysisStatusFromLegacy(legacy.similarProductStatus)
    const noveltyType = canonicalNoveltyTypeFromLegacy(legacy.noveltyType)
    const comparisonItems = legacy.comparisonItems.map((item, index) => normalizeNoveltyItem(item, index)).filter((item): item is SimilarProductItem => item !== null)
    return {
      analysisStatus: status,
      riskId: text(value.riskId, ''),
      riskName: text(value.riskName, ''),
      noveltyType,
      noveltyHeadline: text(value.noveltyHeadline, legacy.noveltySummary),
      summaryCardHeadline: optionalText(value.summaryCardHeadline),
      noveltyShortSummary: text(value.noveltyShortSummary, legacy.noveltySummary),
      noveltySummary: text(value.noveltySummary, legacy.noveltySummary),
      reviewedCompanyCount: legacy.researchedCompanyCount ?? null,
      sameProductCount: legacy.sameProductCount,
      partialSimilarCount: legacy.partialSimilarCount,
      relatedCoverageCount: legacy.relatedCoverageCount,
      differentiatedGapCount: null,
      comparisonItems,
      summaryBullets: stringArray(value.summaryBullets).slice(0, 2),
      judgmentReasons: legacy.summaryBullets?.slice(0, 3) ?? noveltyReasonsFor(status, noveltyType),
      limitations: [],
      checkedAt: legacy.sourceDate ?? sourceDate ?? null,
    }
  }

  const analysisStatus = enumValue(value.analysisStatus, NOVELTY_ANALYSIS_STATUSES, 'pending')
  const noveltyType = optionalEnumValue(value.noveltyType, NOVELTY_ANALYSIS_TYPES)
  const comparisonItems = Array.isArray(value.comparisonItems)
    ? value.comparisonItems.map(normalizeNoveltyItem).filter((item): item is SimilarProductItem => item !== null)
    : []
  const resolvedNoveltyType = analysisStatus === 'pending' ? null : noveltyType ?? 'verification-required'
  const checkedAt = typeof value.checkedAt === 'string' ? value.checkedAt : analysisStatus === 'pending' ? null : sourceDate ?? null
  return {
    analysisStatus,
    riskId: text(value.riskId, ''),
    riskName: text(value.riskName, ''),
    noveltyType: resolvedNoveltyType,
    noveltyHeadline: text(value.noveltyHeadline, analysisStatus === 'pending' ? fallback.noveltyHeadline : noveltyAnalysisTypeLabels[resolvedNoveltyType ?? 'verification-required']),
    summaryCardHeadline: optionalText(value.summaryCardHeadline),
    noveltyShortSummary: text(value.noveltyShortSummary, analysisStatus === 'pending' ? (fallback.noveltyShortSummary ?? fallback.noveltySummary) : text(value.noveltySummary, '국내 공개자료 비교 결과를 기준으로 신규성을 검토합니다.')),
    noveltySummary: text(value.noveltySummary, analysisStatus === 'pending' ? fallback.noveltySummary : '국내 공개자료 비교 결과를 기준으로 신규성을 검토합니다.'),
    reviewedCompanyCount: analysisStatus === 'pending' ? null : nullableCount(value.reviewedCompanyCount),
    sameProductCount: analysisStatus === 'pending' ? null : nullableCount(value.sameProductCount),
    partialSimilarCount: analysisStatus === 'pending' ? null : nullableCount(value.partialSimilarCount),
    relatedCoverageCount: analysisStatus === 'pending' ? null : nullableCount(value.relatedCoverageCount),
    differentiatedGapCount: analysisStatus === 'pending' ? null : nullableCount(value.differentiatedGapCount),
    comparisonItems: analysisStatus === 'pending' ? [] : comparisonItems,
    summaryBullets: stringArray(value.summaryBullets).slice(0, 2),
    judgmentReasons: stringArray(value.judgmentReasons).slice(0, 3).length ? stringArray(value.judgmentReasons).slice(0, 3) : noveltyReasonsFor(analysisStatus, resolvedNoveltyType),
    limitations: stringArray(value.limitations),
    checkedAt,
  }
}
