import { createBrowserRouter } from 'react-router-dom'
import { CustomerLayout } from './layouts/CustomerLayout'
import { RootLayout } from './layouts/RootLayout'
import { SalesLayout } from './layouts/SalesLayout'
import { CustomerInsightPage } from '../pages/customer-insight/CustomerInsightPage'
import { DeveloperReportsPage } from '../pages/developer-reports/DeveloperReportsPage'
import { DeveloperRiskDetailPage } from '../pages/developer-risk-detail/DeveloperRiskDetailPage'
import { NotFoundPage } from '../pages/not-found/NotFoundPage'
import { ReportsPage } from '../pages/reports/ReportsPage'
import { RiskCatalogPage } from '../pages/risk-catalog/RiskCatalogPage'
import { RiskDashboardPage } from '../pages/risk-dashboard/RiskDashboardPage'
import { RiskDetailPage } from '../pages/risk-detail/RiskDetailPage'
import { RiskContextPage } from '../pages/risk-context/RiskContextPage'
import { SalesIntakePage } from '../pages/sales-intake/SalesIntakePage'
import { PolicyAiEditorPage } from '../report/components/PolicyAiEditorPage'

export const router = createBrowserRouter([
  {
    path: '/reports/policy-editor',
    element: <PolicyAiEditorPage />,
    errorElement: <NotFoundPage />,
  },
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <RiskDashboardPage /> },
      { path: 'risks', element: <RiskCatalogPage /> },
      { path: 'risks/:riskId', element: <RiskDetailPage /> },
      { path: 'risks/:riskId/context', element: <RiskContextPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'developer-test', element: <RiskDashboardPage mode="developer" /> },
      { path: 'developer-test/risks', element: <RiskCatalogPage mode="developer" /> },
      { path: 'developer-test/risks/:riskId', element: <DeveloperRiskDetailPage /> },
      { path: 'developer-test/reports', element: <DeveloperReportsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/customer-insight',
    element: <CustomerLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <CustomerInsightPage /> },
    ],
  },
  {
    path: '/sales-intake',
    element: <SalesLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <SalesIntakePage /> },
    ],
  },
])
