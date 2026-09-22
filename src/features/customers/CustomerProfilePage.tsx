import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { PendingBackendNotice } from '../../components/PendingBackendNotice'
import { Button } from '../../components/ui/button'
import { AssignLocationDialog } from './AssignLocationDialog'
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

function ProfileView({ profile, onAssignLocation }: { profile: CustomerProfile; onAssignLocation: () => void }) {
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
          <dd className="flex items-center gap-3">
            <span>{profile.location ? `${profile.location.lat}, ${profile.location.lng}` : 'Sin ubicación asignada'}</span>
            <Button type="button" size="sm" variant="outline" onClick={onAssignLocation}>
              {profile.location ? 'Editar ubicación' : 'Asignar ubicación'}
            </Button>
          </dd>
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
  const [assigningLocation, setAssigningLocation] = useState(false)
  // Sobrescribe la ubicación del perfil cargado tras un guardado exitoso, sin
  // esperar a un refetch (GET /profile todavía no existe en PragmaCRM-Api).
  const [locationOverride, setLocationOverride] = useState<CustomerProfile['location']>()

  const profile =
    state.status === 'ready' && locationOverride !== undefined
      ? { ...state.profile, location: locationOverride, has_gps: locationOverride !== null }
      : state.status === 'ready'
        ? state.profile
        : null

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
        {profile && <ProfileView profile={profile} onAssignLocation={() => setAssigningLocation(true)} />}
      </div>

      {assigningLocation && profile && id && (
        <AssignLocationDialog
          customerId={id}
          customerName={profile.name}
          initialLocation={profile.location}
          onClose={() => setAssigningLocation(false)}
          onUpdated={(result) => {
            setLocationOverride(result.location)
            setAssigningLocation(false)
          }}
        />
      )}
    </AppShell>
  )
}
