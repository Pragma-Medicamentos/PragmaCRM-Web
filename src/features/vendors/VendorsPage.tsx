import { useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { supabase } from '../../lib/supabase/client'
import { ApiError } from '../../lib/api/apiClient'
import { useVendors } from './useVendors'
import { CreateVendorDialog } from './CreateVendorDialog'
import { EditVendorDialog } from './EditVendorDialog'
import { resendVendorOtp, setVendorActive } from './vendorsApi'
import type { Vendor } from './vendors.types'

const dateFormatter = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium' })

type Notice = { kind: 'success' | 'error'; message: string }

interface VendorsTableProps {
  vendors: Vendor[]
  busyIds: Set<string>
  onEdit: (vendor: Vendor) => void
  onToggleActive: (vendor: Vendor) => void
  onResendOtp: (vendor: Vendor) => void
}

function VendorsTable({ vendors, busyIds, onEdit, onToggleActive, onResendOtp }: VendorsTableProps) {
  if (vendors.length === 0) {
    return <p className="vendors__hint">Todavía no hay vendedores registrados.</p>
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Correo</th>
          <th>Estado</th>
          <th>Fecha de alta</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {vendors.map((vendor) => {
          const busy = busyIds.has(vendor.id)
          return (
            <tr key={vendor.id}>
              <td>{vendor.name}</td>
              <td>{vendor.email ?? '—'}</td>
              <td>
                <span className={vendor.active ? 'badge badge--active' : 'badge badge--inactive'}>
                  {vendor.active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td>{dateFormatter.format(new Date(vendor.created_at))}</td>
              <td>
                <div className="table__actions">
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={() => onEdit(vendor)}
                    disabled={busy}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={() => onToggleActive(vendor)}
                    disabled={busy}
                  >
                    {vendor.active ? 'Deshabilitar' : 'Habilitar'}
                  </button>
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={() => onResendOtp(vendor)}
                    disabled={busy}
                  >
                    Reenviar código
                  </button>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** RF-01 / HU-01: listado, alta, edición y habilitar/deshabilitar vendedores. */
export function VendorsPage() {
  const { state, reload } = useVendors()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [confirmingDisable, setConfirmingDisable] = useState<Vendor | null>(null)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<Notice | null>(null)

  async function withBusy(id: string, task: () => Promise<void>) {
    setBusyIds((prev) => new Set(prev).add(id))
    try {
      await task()
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function applyStatusChange(vendor: Vendor, active: boolean) {
    setNotice(null)
    await withBusy(vendor.id, async () => {
      try {
        const { data } = await supabase.auth.getSession()
        await setVendorActive(data.session?.access_token ?? null, vendor.id, active)
        setNotice({
          kind: 'success',
          message: `${vendor.name}: ${active ? 'habilitado' : 'deshabilitado'}.`,
        })
        reload()
      } catch (err) {
        setNotice({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'No se pudo actualizar el estado del vendedor.',
        })
      }
    })
  }

  function handleToggleActive(vendor: Vendor) {
    if (vendor.active) {
      setConfirmingDisable(vendor)
      return
    }
    void applyStatusChange(vendor, true)
  }

  async function handleResendOtp(vendor: Vendor) {
    setNotice(null)
    await withBusy(vendor.id, async () => {
      try {
        const { data } = await supabase.auth.getSession()
        await resendVendorOtp(data.session?.access_token ?? null, vendor.id)
        setNotice({ kind: 'success', message: `Código reenviado a ${vendor.email ?? vendor.name}.` })
      } catch (err) {
        setNotice({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'No se pudo reenviar el código.',
        })
      }
    })
  }

  return (
    <AppShell>
      <div className="vendors">
        <div className="vendors__header">
          <h1>Vendedores</h1>
          <button type="button" className="button button--primary" onClick={() => setCreateOpen(true)}>
            Nuevo vendedor
          </button>
        </div>

        {notice && (
          <p className={notice.kind === 'error' ? 'vendors__error' : 'vendors__notice'} role="status">
            {notice.message}
          </p>
        )}

        {state.status === 'loading' && <p className="vendors__hint">Cargando vendedores…</p>}
        {state.status === 'error' && (
          <p className="vendors__error" role="alert">
            {state.message}
          </p>
        )}
        {state.status === 'ready' && (
          <VendorsTable
            vendors={state.vendors}
            busyIds={busyIds}
            onEdit={setEditing}
            onToggleActive={handleToggleActive}
            onResendOtp={handleResendOtp}
          />
        )}
      </div>

      {createOpen && (
        <CreateVendorDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            reload()
          }}
        />
      )}

      {editing && (
        <EditVendorDialog
          vendor={editing}
          onClose={() => setEditing(null)}
          onUpdated={() => {
            setEditing(null)
            reload()
          }}
        />
      )}

      {confirmingDisable && (
        <ConfirmDialog
          title="Deshabilitar vendedor"
          message={`${confirmingDisable.name} no podrá iniciar sesión en la app móvil hasta que lo vuelvas a habilitar.`}
          confirmLabel="Deshabilitar"
          submitting={busyIds.has(confirmingDisable.id)}
          onCancel={() => setConfirmingDisable(null)}
          onConfirm={async () => {
            const vendor = confirmingDisable
            await applyStatusChange(vendor, false)
            setConfirmingDisable(null)
          }}
        />
      )}
    </AppShell>
  )
}
