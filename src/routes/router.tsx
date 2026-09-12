import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { AdminRoute } from '../features/auth/AdminRoute'
import { DashboardPlaceholder } from '../pages/DashboardPlaceholder'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login/*" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AdminRoute>
              <DashboardPlaceholder />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
