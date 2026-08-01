export type SimilarProductStatus =
  | 'same_product_found'
  | 'partial_similar_found'
  | 'direct_match_not_found'
  | 'additional_check_required'

/** 신규성 분석의 화면·API 공통 판정값입니다. */
export type NoveltyType = 'existing' | 'differentiated' | 'new' | 'verification-required'

/** 기존 요약 카드 payload와의 하위 호환을 위한 판정값입니다. */
export type LegacyNoveltyType = 'existing_product' | 'differentiated' | 'new_product' | 'needs_verification'

export type SimilarProductKind = 'independent_product' | 'rider' | 'unknown'

export type SimilarityJudgment =
  | 'same'
  | 'partial_similar'
  | 'related_coverage'
  | 'not_directly_related'
  | 'additional_check_required'

export type NoveltyAnalysisStatus = 'pending' | 'completed' | 'needs-review'

export type SimilarProductType = 'standalone' | 'rider' | 'package' | 'related-coverage' | 'verification-required'

export type SimilarityType = 'same' | 'highly-similar' | 'partial' | 'related' | 'not-related' | 'verification-required'

export type NoveltySourceType =
  | 'insurer-product-page'
  | 'insurer-disclosure'
  | 'policy-document'
  | 'knia-disclosure'
  | 'exclusive-use-right'
  | 'insurance-damoa'
  | 'official-press-release'

export type SimilarProductItem = {
  id: string
  insurerName: string
  productName: string
  productType: SimilarProductType
  overlappingCoverage: string[]
  remainingGaps: string[]
  differentiation: string[]
  similarityType: SimilarityType
  sourceTitle: string
  sourceUrl?: string
  sourceType?: NoveltySourceType
  sourceDate?: string | null
  checkedAt?: string | null
  additionalSources?: Array<{ title: string; url: string }>
}

/** 요약 카드와 상품화 종합평가 탭이 함께 참조하는 국내 출시 현황·신규성 분석 계약입니다. */
export type NoveltyAnalysis = {
  analysisStatus: NoveltyAnalysisStatus
  riskId: string
  riskName: string
  noveltyType: NoveltyType | null
  noveltyHeadline: string
  /** 요약 카드에 먼저 표시할 짧은 판정 문구입니다. */
  summaryCardHeadline?: string
  /** 요약 패널에 먼저 보여줄 한 줄 설명입니다. */
  noveltyShortSummary?: string
  noveltySummary: string
  reviewedCompanyCount: number | null
  sameProductCount: number | null
  partialSimilarCount: number | null
  relatedCoverageCount: number | null
  differentiatedGapCount: number | null
  comparisonItems: SimilarProductItem[]
  /** 요약 카드 전용 체크 문장입니다. */
  summaryBullets?: string[]
  judgmentReasons: string[]
  limitations: string[]
  checkedAt: string | null
}

export type SimilarProductComparisonItem = {
  id: string
  insurerName: string
  productName: string
  productKind: SimilarProductKind
  coverageTarget: string
  coverageScope: string
  overlap: string
  difference: string
  similarity: SimilarityJudgment
  sourceLabel?: string
  sourceUrl?: string
  sourceDate?: string | null
}

export type SimilarProductResearch = {
  similarProductStatus: SimilarProductStatus
  sameProductCount: number
  partialSimilarCount: number
  relatedCoverageCount: number
  noveltyType: LegacyNoveltyType
  noveltySummary: string
  summaryBullets?: string[]
  comparisonItems: SimilarProductComparisonItem[]
  researchedCompanyCount?: number
  sourceDate?: string | null
  dataStatus?: 'LIVE' | 'SAMPLE' | 'STALE' | 'FALLBACK'
}
