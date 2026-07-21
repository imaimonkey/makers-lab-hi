import { AppIcon } from '../../shared/components/AppIcon'
import { SalesIntakeStudio } from '../../features/sales-intake/SalesIntakeStudio'
import { PageHeader } from '../../shared/components/PageHeader'

export function SalesIntakePage() {
  return (
    <div className="page sales-workspace-page">
      <PageHeader
        step="01"
        eyebrow="SALES FIELD SIGNALS"
        title="영업부서 현장 리포트"
        description="영업 현장에서 정리된 산업·기술 변화와 고객 접점의 반복 신호를 상품개발 검토의 출발점으로 남깁니다."
        status="INTERNAL INTAKE FRAME"
        updatedAt="운영 접수 API 미연동 · 2026.07"
      />

      <div className="sample-notice"><span>DEMO</span>현재는 영업부서 입력과 검토 대기 흐름만 제공하며, 위험 후보로 자동 확정하지 않습니다.</div>

      <section className="sales-workspace-context surface-card" aria-label="영업부서 입력 안내">
        <div><AppIcon name="inbox" size={21} /><strong>현장 리포트 → 상품개발 검토</strong></div>
        <p>고객 개인정보가 아닌 현장 맥락·반복 질문·상품화 아이디어를 요약해 주세요. 접수 후 근거 확인과 실무자 검토를 거쳐 기존 워크벤치와 연결할 수 있습니다.</p>
        <span><AppIcon name="shield" size={15} /> 샘플 환경 · 브라우저 임시 저장</span>
      </section>

      <SalesIntakeStudio />
    </div>
  )
}
