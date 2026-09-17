import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { PendingBackendNotice } from '../../components/PendingBackendNotice'
import { useCustomerProfile } from './useCustomerProfile'
import type { CustomerProfile, CustomerSaleHistoryEntry } from './customers.types'

const dateFormatter = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium' })
const currencyFormatter = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' })

function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : '—'
}

function formatCurrency(value: string | null): string {
  return value ? currencyFormatter.format(Number(value)) : '—'
}

function SalesHistoryTable({ entries }: { entries: CustomerSaleHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="customer-profile__hint">Sin ventas registradas.</p>
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Documento</th>
          <th>Fecha</th>
          <th>Total</th>
          <th>Saldo pendiente</th>
          <th>Último pago</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((sale) => (
          <tr key={sale.erp_sale_id}>
            <td>{sale.document ?? sale.erp_sale_id}</td>
            <td>{formatDate(sale.erp_created_at)}</td>
            <td>{formatCurrency(sale.total)}</td>
            <td>{formatCurrency(sale.pending_balance)}</td>
            <td>{formatDate(sale.last_payment_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ProfileView({ profile }: { profile: CustomerProfile }) {
  return (
    <>
      <div className="customer-profile__header">
        <div>
          <h1>{profile.name}</h1>
          {profile.trade_name && <p className="customer-profile__hint">{profile.trade_name}</p>}
        </div>
        <span className={profile.active ? 'badge badge--active' : 'badge badge--inactive'}>
          {profile.active ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <section className="customer-profile__section">
        <h2>Datos generales</h2>
        <dl className="customer-profile__grid">
          <dt>Tipo de establecimiento</dt>
          <dd>{profile.establishment_type ?? '—'}</dd>
          <dt>Dirección</dt>
          <dd>{profile.address ?? '—'}</dd>
          <dt>Municipio</dt>
          <dd>{profile.municipality ?? '—'}</dd>
          <dt>Zona</dt>
          <dd>{profile.zone ?? '—'}</dd>
          <dt>Teléfono</dt>
          <dd>{profile.phone ?? '—'}</dd>
          <dt>Celular</dt>
          <dd>{profile.mobile ?? '—'}</dd>
          <dt>Ubicación GPS</dt>
          <dd>{profile.location ? `${profile.location.lat}, ${profile.location.lng}` : 'Sin ubicación asignada'}</dd>
        </dl>
      </section>

      <section className="customer-profile__section">
        <h2>Responsable de compra</h2>
        <p>{profile.responsible ? profile.responsible.name : 'Sin responsable asignado'}</p>
      </section>

      <section className="customer-profile__section">
        <h2>Créditos y cobros vigentes</h2>
        <dl className="customer-profile__grid">
          <dt>Crédito habilitado</dt>
          <dd>{profile.credit_summary.credit ? 'Sí' : 'No'}</dd>
          <dt>Límite de crédito</dt>
          <dd>{formatCurrency(profile.credit_summary.credit_limit)}</dd>
          <dt>Saldo pendiente total</dt>
          <dd>{formatCurrency(profile.credit_summary.pending_balance_total)}</dd>
          <dt>Cartera vencida</dt>
          <dd>{formatCurrency(profile.credit_summary.overdue_balance_total)}</dd>
        </dl>
      </section>

      <section className="customer-profile__section">
        <h2>Historial de ventas</h2>
        <SalesHistoryTable entries={profile.sales_history} />
      </section>
    </>
  )
}

/** RF-02: perfil del cliente con historial de ventas, créditos/cobros vigentes y responsable de compra. */
export function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { state } = useCustomerProfile(id ?? '')

  return (
    <AppShell>
      <div className="customer-profile">
        <Link to="/clientes" className="customer-profile__back">
          ← Volver a clientes
        </Link>

        {state.status === 'loading' && <p className="customer-profile__hint">Cargando perfil…</p>}
        {state.status === 'pending-backend' && (
          <PendingBackendNotice endpoints={[`GET /api/v1/customers/${id}/profile`]} />
        )}
        {state.status === 'error' && (
          <p className="customer-profile__error" role="alert">
            {state.message}
          </p>
        )}
        {state.status === 'ready' && <ProfileView profile={state.profile} />}
      </div>
    </AppShell>
  )
}
