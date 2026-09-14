import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { PendingBackendNotice } from '../../components/PendingBackendNotice'
import { useCustomers } from './useCustomers'
import type { Customer } from './customers.types'

function CustomersTable({ customers }: { customers: Customer[] }) {
  if (customers.length === 0) {
    return <p className="customers__hint">Todavía no hay clientes registrados.</p>
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Nombre comercial</th>
          <th>Municipio</th>
          <th>Zona</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {customers.map((customer) => (
          <tr key={customer.id}>
            <td>{customer.name}</td>
            <td>{customer.trade_name ?? '—'}</td>
            <td>{customer.municipality ?? '—'}</td>
            <td>{customer.zone ?? '—'}</td>
            <td>
              <span className={customer.active ? 'badge badge--active' : 'badge badge--inactive'}>
                {customer.active ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td>
              <div className="table__actions">
                <Link to={`/clientes/${customer.id}`} className="button button--ghost button--small">
                  Ver perfil
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** RF-02: listado de clientes, punto de entrada al perfil (`/clientes/:id`). */
export function CustomersPage() {
  const { state } = useCustomers()

  return (
    <AppShell>
      <div className="customers">
        <div className="customers__header">
          <h1>Clientes</h1>
        </div>

        {state.status === 'loading' && <p className="customers__hint">Cargando clientes…</p>}
        {state.status === 'pending-backend' && (
          <PendingBackendNotice endpoints={['GET /api/v1/customers']} />
        )}
        {state.status === 'error' && (
          <p className="customers__error" role="alert">
            {state.message}
          </p>
        )}
        {state.status === 'ready' && <CustomersTable customers={state.customers} />}
      </div>
    </AppShell>
  )
}
