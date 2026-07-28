import { PageHeader } from '../../shared/components/PageHeader'
import { sampleOnlyNotice } from '../../domain/risk/sampleData'
import { ReportPage } from '../../report/ReportPage'
import { getMockReportData } from '../../report/data/mock-data-adapter'
import { createResilientReportProxy } from '../../report/api/resilient-report-proxy'
import '../../report/report.css'

const { riskData, fallbackReport } = getMockReportData()

const reportProxy = createResilientReportProxy('/api/report-assistant')

export function ReportsPage() {
  return (
    <div className="page reports-page jh-visual">
      <PageHeader
        step="04"
        eyebrow="DECISION REPORTS"
        title="종합 리포트"
        description="위험 신호와 상품성 평가를 Advance·Hold·Drop 의사결정과 후속 과제로 압축합니다."
      />

      <section id="report-generation-slice" className="report-generation-slice surface-card" aria-label="리포트 생성·검토 데모">
        <ReportPage
          riskData={riskData}
          fallbackReport={fallbackReport}
          reportProxy={reportProxy}
          listIntro={<>
            <div className="sample-notice"><span>SAMPLE</span>{sampleOnlyNotice}</div>
            <div className="report-generation-slice-heading">
              <div>
                <p className="eyebrow">REPORT GENERATION / REVIEW</p>
                <h2>상품화 검토 리포트 생성</h2>
                <p>생성·검증·항목별 실무 검토·브리핑·출력 기능을 하나의 리포트 목록과 상세 화면에서 이어서 사용합니다.</p>
              </div>
              <span className="status-badge">SAMPLE · LOCAL FALLBACK EXPLICIT</span>
            </div>
            <section className="report-contract surface-card">
              <div><p className="eyebrow">REQUIRED OUTPUT</p><h2>리포트에 반드시 남길 것</h2></div>
              <ol>
                <li><span>01</span><strong>결정</strong><p>Advance / Hold / Drop와 결정일</p></li>
                <li><span>02</span><strong>판단 근거</strong><p>평가 문장별 evidenceId와 상충 근거</p></li>
                <li><span>03</span><strong>상품 가설</strong><p>가입 대상·보험사고·담보·면책의 초안</p></li>
                <li><span>04</span><strong>다음 검증</strong><p>필요 데이터·담당자·기한·승인 이력</p></li>
              </ol>
            </section>
          </>}
        />
      </section>
    </div>
  )
}
