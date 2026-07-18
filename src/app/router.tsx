import { createBrowserRouter } from 'react-router-dom'
import { CustomerLayout } from './layouts/CustomerLayout'
import { RootLayout } from './layouts/RootLayout'
import { CustomerInsightPage } from '../pages/customer-insight/CustomerInsightPage'
import { NotFoundPage } from '../pages/not-found/NotFoundPage'
import { ReportsPage } from '../pages/reports/ReportsPage'
import { RiskCatalogPage } from '../pages/risk-catalog/RiskCatalogPage'
import { RiskDashboardPage } from '../pages/risk-dashboard/RiskDashboardPage'
import { RiskDetailPage } from '../pages/risk-detail/RiskDetailPage'

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
])
