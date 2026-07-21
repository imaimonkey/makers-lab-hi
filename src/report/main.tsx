import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ReportPage } from './ReportPage'
import { createGasReportProxy } from './api/gas-report-proxy'
import type { ReportProxy } from './api/report-proxy'
import { getMockReportData } from './data/mock-data-adapter'
import { StandaloneReportLayout } from './layout/StandaloneReportLayout'
import { standaloneReportNav } from './layout/standalone-nav'

const { riskData, fallbackReport } = getMockReportData()

// The browser calls only the same-origin Vite/serverless route, never GAS directly.
const reportProxy: ReportProxy = createGasReportProxy('/api/report-assistant')

const rootElement = document.getElementById('report-root')
if (!rootElement) {
  throw new Error('리포트 화면의 #report-root 요소를 찾지 못했습니다.')
}

createRoot(rootElement).render(
  <StrictMode>
    <StandaloneReportLayout navConfig={standaloneReportNav}>
      <ReportPage
        riskData={riskData}
        fallbackReport={fallbackReport}
        reportProxy={reportProxy}
      />
    </StandaloneReportLayout>
  </StrictMode>,
)

