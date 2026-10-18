import type { Paginated } from '../customers/customers.types'

// Ancla: app_user con role = 'Vendedor' (RF-01, HU-01). Contrato real:
// PragmaCRM-Api src/services/seller.service.ts (SellerRecord), expuesto en
// GET/POST /api/v1/sellers. El envelope no transforma las llaves: llegan
// en snake_case tal como están en la base.
export interface Vendor {
  id: string
  name: string
  email: string | null
  active: boolean
  auth_user_id: string | null
  created_at: string
  updated_at: string
  // PCRM-173: meta mensual vigente este mes, como string decimal ("7500.00");
  // null si no tiene. Solo la traen GET /sellers y GET /sellers/:id: las
  // respuestas de alta y edición no la incluyen.
  current_goal?: string | null
}

// GET /api/v1/sellers — data: Paginated<Vendor> + totals. Los totales cuentan
// a todos los vendedores por estado, sin los filtros, para el encabezado.
export interface VendorsPage extends Paginated<Vendor> {
  totals: { active: number; inactive: number }
}

export interface ListVendorsParams {
  page?: number
  limit?: number
  active?: boolean
  search?: string
}

export interface PageParams {
  page?: number
  limit?: number
}

// POST /api/v1/sellers solo acepta name y email — la cuenta nace sin
// contraseña y la API envía un código OTP al correo para que el vendedor
// la fije (ver create-seller.use-case.ts en PragmaCRM-Api).
export interface CreateVendorInput {
  name: string
  email: string
}

// PATCH /api/v1/sellers/:id — al menos uno de los dos campos (seller.schema.ts
// lo exige con .refine). No incluye password ni active: eso va por
// /:id/active, que es una ruta aparte (set-seller-status.use-case.ts).
export interface UpdateVendorInput {
  name?: string
  email?: string
}

// Respuesta del PATCH (PCRM-182). Al asignar el primer correo a un vendedor
// importado del JSON, la API lo habilita y le envía el código de acceso:
// `access_email` dice si salió ('sent') o no ('failed'); null cuando la
// edición no era ese caso. El correo queda guardado aunque el envío falle.
export type AccessEmailStatus = 'sent' | 'failed' | null

export interface UpdatedVendor extends Vendor {
  access_email: AccessEmailStatus
}

// PCRM-173: una meta vale desde su mes en adelante, hasta que otra posterior
// la reemplace. Solo se fija para el mes en curso (cambiarla dos veces en el
// mismo mes sobrescribe ese mes) y no se elimina, así que los meses cerrados
// conservan la suya. 0 = sin meta.
// Contrato: GET/PUT /api/v1/sellers/:id/goals (goal.service.ts en la API).
export interface VendorGoal {
  id: string
  year: number
  month: number
  goal_amount: string
  created_at: string
  updated_at: string
}

export interface YearMonth {
  year: number
  month: number
}

/** Entrada del historial: hasta qué mes aplicó; null mientras está vigente. */
export interface VendorGoalPeriod extends VendorGoal {
  until: YearMonth | null
}

export interface VendorGoals {
  /** Meta vigente este mes; null si no hay o es 0. No depende de la página. */
  current: VendorGoal | null
  /** Cambios paginados, del mes más reciente al más antiguo. */
  history: Paginated<VendorGoalPeriod>
}

// GET /api/v1/sellers/:id/goals/history (PCRM-198): un elemento por mes, del
// más antiguo al mes en curso. Montos como string decimal, como en métricas.
export interface VendorGoalHistoryMonth {
  year: number
  month: number
  /** Meta vigente ese mes; null si no había (o era 0). */
  goal_amount: string | null
  total_sales: string
  /** Porcentaje con un decimal; null si el mes no tenía meta. */
  goal_compliance: number | null
}

// El mes lo pone la API: siempre el mes en curso.
export interface SetVendorGoalInput {
  goal_amount: number
}
