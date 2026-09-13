import { useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { useVendors } from './useVendors'
import { CreateVendorDialog } from './CreateVendorDialog'
import type { Vendor } from './vendors.types'

const dateFormatter = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium' })

function VendorsTable({ vendors }: { vendors: Vendor[] }) {
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
        </tr>
      </thead>
      <tbody>
        {vendors.map((vendor) => (
          <tr key={vendor.id}>
            <td>{vendor.name}</td>
            <td>{vendor.email ?? '—'}</td>
            <td>
              <span className={vendor.active ? 'badge badge--active' : 'badge badge--inactive'}>
                {vendor.active ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td>{dateFormatter.format(new Date(vendor.created_at))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** RF-01 / HU-01: listado y alta de vendedores. Editar y deshabilitar quedan para una HU aparte. */
export function VendorsPage() {
  const { state, reload } = useVendors()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <AppShell>
      <div className="vendors">
        <div className="vendors__header">
          <h1>Vendedores</h1>
          <button type="button" className="button button--primary" onClick={() => setDialogOpen(true)}>
            Nuevo vendedor
          </button>
        </div>

        {state.status === 'loading' && <p className="vendors__hint">Cargando vendedores…</p>}
        {state.status === 'error' && (
          <p className="vendors__error" role="alert">
            {state.message}
          </p>
        )}
        {state.status === 'ready' && <VendorsTable vendors={state.vendors} />}
      </div>

      {dialogOpen && (
        <CreateVendorDialog
          onClose={() => setDialogOpen(false)}
          onCreated={() => {
            setDialogOpen(false)
            reload()
          }}
        />
      )}
    </AppShell>
  )
}
