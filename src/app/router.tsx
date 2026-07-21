import { createBrowserRouter } from 'react-router-dom'
import { CustomerLayout } from './layouts/CustomerLayout'
import { RootLayout } from './layouts/RootLayout'
import { SalesLayout } from './layouts/SalesLayout'
import { CustomerInsightPage } from '../pages/customer-insight/CustomerInsightPage'
import { DeveloperTestPage } from '../pages/developer-test/DeveloperTestPage'
import { NotFoundPage } from '../pages/not-found/NotFoundPage'
import { ReportsPage } from '../pages/reports/ReportsPage'
import { RiskCatalogPage } from '../pages/risk-catalog/RiskCatalogPage'
import { RiskDashboardPage } from '../pages/risk-dashboard/RiskDashboardPage'
import { RiskDetailPage } from '../pages/risk-detail/RiskDetailPage'
import { SalesIntakePage } from '../pages/sales-intake/SalesIntakePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <RiskDashboardPage /> },
      { path: 'risks', element: <RiskCatalogPage /> },
      { path: 'risks/:riskId', element: <RiskDetailPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'developer-test', element: <DeveloperTestPage /> },
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
