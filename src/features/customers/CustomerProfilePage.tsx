import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { PendingBackendNotice } from '../../components/PendingBackendNotice'
import { Button } from '../../components/ui/button'
import { AssignLocationDialog } from './AssignLocationDialog'
import { useCustomerProfile } from './useCustomerProfile'
import type { CustomerProfile, CustomerVisitNote } from './customers.types'

const dateFormatter = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium' })
const currencyFormatter = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' })

function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : '—'
}

function formatCurrency(value: string | null): string {
  return value ? currencyFormatter.format(Number(value)) : '—'
}

function RecentNotesList({ notes }: { notes: CustomerVisitNote[] }) {
  if (notes.length === 0) {
    return <p className="customer-profile__hint">Sin notas registradas.</p>
  }

  return (
    <ul className="customer-profile__notes">
      {notes.map((note, index) => (
        <li key={`${note.date}-${index}`}>
          <span className="customer-profile__hint">{formatDate(note.date)}</span>
          <p>{note.notes}</p>
        </li>
      ))}
    </ul>
  )
}

function ProfileView({
  profile,
  onAssignLocation,
}: {
  profile: CustomerProfile
  onAssignLocation: () => void
}) {
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
          <dt>Responsable de compra</dt>
          <dd>{profile.attends ?? '—'}</dd>
          <dt>Ubicación GPS</dt>
          <dd className="flex items-center gap-3">
            <span>
              {profile.location
                ? `${profile.location.lat}, ${profile.location.lng}`
                : 'Sin ubicación asignada'}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={onAssignLocation}>
              {profile.location ? 'Editar ubicación' : 'Asignar ubicación'}
            </Button>
          </dd>
        </dl>
      </section>

      <section className="customer-profile__section">
        <h2>Rutas asignadas</h2>
        {profile.routes.length === 0 ? (
          <p className="customer-profile__hint">Sin ruta asignada.</p>
        ) : (
          <ul>
            {profile.routes.map((route) => (
              <li key={route.id}>{route.name}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="customer-profile__section">
        <h2>Créditos y actividad comercial</h2>
        <dl className="customer-profile__grid">
          <dt>Crédito habilitado</dt>
          <dd>{profile.credit ? 'Sí' : 'No'}</dd>
          <dt>Límite de crédito</dt>
          <dd>{formatCurrency(profile.credit_limit)}</dd>
          <dt>Saldo pendiente</dt>
          <dd>{formatCurrency(profile.pending_balance)}</dd>
          <dt>Compras netas</dt>
          <dd>{formatCurrency(profile.summary.net_purchases)}</dd>
          <dt>Pedidos</dt>
          <dd>{profile.summary.orders_count}</dd>
          <dt>Visitas</dt>
          <dd>{profile.summary.visits_count}</dd>
        </dl>
      </section>

      <section className="customer-profile__section">
        <h2>Notas recientes</h2>
        <RecentNotesList notes={profile.recent_notes} />
      </section>
    </>
  )
}

/** RF-02: perfil del cliente con rutas, créditos/actividad y notas recientes. */
export function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { state } = useCustomerProfile(id ?? '')
  const [assigningLocation, setAssigningLocation] = useState(false)
  // Sobrescribe location/address tras un PATCH exitoso, sin esperar refetch.
  const [coreOverride, setCoreOverride] = useState<Pick<
    CustomerProfile,
    'location' | 'address' | 'place_id'
  > | null>(null)

  const profile =
    state.status === 'ready'
      ? coreOverride
        ? { ...state.profile, ...coreOverride }
        : state.profile
      : null

  return (
    <AppShell>
      <div className="customer-profile">
        <Link to="/clientes" className="customer-profile__back">
          ← Volver a clientes
        </Link>

        {state.status === 'loading' && <p className="customer-profile__hint">Cargando perfil…</p>}
        {state.status === 'pending-backend' && (
          <PendingBackendNotice endpoints={[`GET /api/v1/customers/${id}`]} />
        )}
        {state.status === 'error' && (
          <p className="customer-profile__error" role="alert">
            {state.message}
          </p>
        )}
        {profile && (
          <ProfileView profile={profile} onAssignLocation={() => setAssigningLocation(true)} />
        )}
      </div>

      {assigningLocation && profile && id && (
        <AssignLocationDialog
          customerId={id}
          customerName={profile.name}
          initialLocation={profile.location}
          onClose={() => setAssigningLocation(false)}
          onUpdated={(result) => {
            setCoreOverride({
              location: result.location,
              address: result.address,
              place_id: result.place_id,
            })
            setAssigningLocation(false)
          }}
        />
      )}
    </AppShell>
  )
}
