import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { AdminRoute } from '../features/auth/AdminRoute'
import { DashboardPlaceholder } from '../pages/DashboardPlaceholder'
import { VendorsPage } from '../features/vendors/VendorsPage'
import { RoutePlannerPage } from '../features/routes/RoutePlannerPage'
import { CustomersPage } from '../features/customers/CustomersPage'
import { CustomerProfilePage } from '../features/customers/CustomerProfilePage'
import { ImportPage } from '../features/uploads/ImportPage'

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
        <Route
          path="/vendedores"
          element={
            <AdminRoute>
              <VendorsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/rutas"
          element={
            <AdminRoute>
              <RoutePlannerPage />
            </AdminRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <AdminRoute>
              <CustomersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/clientes/:id"
          element={
            <AdminRoute>
              <CustomerProfilePage />
            </AdminRoute>
          }
        />
        <Route
          path="/importar"
          element={
            <AdminRoute>
              <ImportPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
