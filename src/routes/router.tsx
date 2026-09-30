import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { AdminRoute } from '../features/auth/AdminRoute'
import { HomePage } from '../pages/HomePage'
import { MetricsPage } from '../features/metrics/MetricsPage'
import { VendorsPage } from '../features/vendors/VendorsPage'
import { RoutePlannerPage } from '../features/routes/RoutePlannerPage'
import { RouteStopsPage } from '../features/routes/RouteStopsPage'
import { CustomersPage } from '../features/customers/CustomersPage'
import { CustomerProfilePage } from '../features/customers/CustomerProfilePage'
import { ProductsPage } from '../features/products/ProductsPage'
import { ProspectsPage } from '../features/prospects/ProspectsPage'
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
              <HomePage />
            </AdminRoute>
          }
        />
        <Route
          path="/metricas"
          element={
            <AdminRoute>
              <MetricsPage />
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
          path="/rutas/:routeId/paradas"
          element={
            <AdminRoute>
              <RouteStopsPage />
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
          path="/productos"
          element={
            <AdminRoute>
              <ProductsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/prospectos"
          element={
            <AdminRoute>
              <ProspectsPage />
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
