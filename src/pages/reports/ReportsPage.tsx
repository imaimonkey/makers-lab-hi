import { useNavigate } from 'react-router-dom'
import { ReportPage } from '../../report/ReportPage'
import { getMockReportData } from '../../report/data/mock-data-adapter'
import { createResilientReportProxy } from '../../report/api/resilient-report-proxy'
import '../../report/report.css'

const { riskData, fallbackReport } = getMockReportData()

const reportProxy = createResilientReportProxy('/api/report-assistant')

export function ReportsPage() {
  const navigate = useNavigate()

  return (
    <div className="page reports-page jh-visual">
      <ReportPage
        riskData={riskData}
        fallbackReport={fallbackReport}
        reportProxy={reportProxy}
        navigation={navigate}
      />
    </div>
  )
}
