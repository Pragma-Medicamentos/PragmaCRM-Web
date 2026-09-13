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
