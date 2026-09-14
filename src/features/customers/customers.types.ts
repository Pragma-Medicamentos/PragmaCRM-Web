// Ancla: RF-02 "Perfil base de cliente (web)" (PragmaCRM-Api CLAUDE.md, sección
// 4.1): historial de ventas, créditos y cobros vigentes, montos y responsable
// de compra. Al 2026-09-13 no existe `src/presentation/customers/` en
// PragmaCRM-Api — este contrato es una PROPUESTA basada en las columnas reales
// de `customer` y `sale` (prisma/schema.prisma, secciones 7.3 y 7.6 del
// CLAUDE.md del backend) y debe confirmarse con el equipo de backend antes de
// darlo por definitivo.

// GET /api/v1/customers — listado, mismo shape sin transformar que /sellers.
export interface Customer {
  id: string
  erp_customer_id: number | null
  name: string
  trade_name: string | null
  establishment_type: string | null
  municipality: string | null
  zone: string | null
  phone: string | null
  active: boolean
}

// Responsable de compra: el DER no tiene `customer.assigned_user_id` (ver
// CLAUDE.md sección 7.3), así que el backend deberá resolverlo desde
// route_customer/route_user o desde la última venta/visita. Se modela como
// posiblemente nulo porque un cliente puede no tener responsable resuelto.
export interface CustomerResponsible {
  id: string
  name: string
}

// Una fila de `sale`. `erp_status`: 1 = cotización, 2 = venta realizada (ver
// CLAUDE.md sección 5.5) — el backend debería excluir el estado 1 salvo que
// la vista lo pida explícitamente.
export interface CustomerSaleHistoryEntry {
  erp_sale_id: number
  document: string | null
  erp_created_at: string | null
  total: string
  pending_balance: string
  last_payment_at: string | null
  erp_status: number
}

// Créditos y cobros vigentes (RF-02). `pending_balance_total` y
// `overdue_balance_total` se agregan sobre `sale`/`balance_snapshot` en el
// backend; el plazo de crédito es fijo (60 días, CLAUDE.md sección 5.6) y no
// vive en esta respuesta.
export interface CustomerCreditSummary {
  credit: boolean
  credit_limit: string | null
  pending_balance_total: string
  overdue_balance_total: string
}

// GET /api/v1/customers/:id/profile
export interface CustomerProfile extends Customer {
  address: string | null
  phone: string | null
  mobile: string | null
  location: { lat: number; lng: number } | null
  personality: string | null
  potential: string | null
  responsible: CustomerResponsible | null
  credit_summary: CustomerCreditSummary
  sales_history: CustomerSaleHistoryEntry[]
}
