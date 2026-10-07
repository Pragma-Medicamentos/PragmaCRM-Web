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
