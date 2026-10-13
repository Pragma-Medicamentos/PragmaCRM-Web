import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, MapPinOff, NotebookPen, Route } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PendingBackendNotice } from '../../components/PendingBackendNotice'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../../components/ui/empty'
import { Skeleton } from '../../components/ui/skeleton'
import { AssignLocationDialog } from './AssignLocationDialog'
import { CustomerStatsCard } from './CustomerStatsCard'
import { useCustomerProfile } from './useCustomerProfile'
import type { CustomerProfile, CustomerRouteRef, CustomerVisitNote } from './customers.types'

const dateFormatter = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium' })
const currencyFormatter = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' })

function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : '—'
}

function formatCurrency(value: string | null): string {
  return value ? currencyFormatter.format(Number(value)) : '—'
}

/** Par etiqueta/valor de las fichas de datos. */
function DataItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  )
}

/** Cifra destacada del resumen comercial. */
function Stat({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={
          tone === 'danger'
            ? 'text-2xl font-semibold tabular-nums text-destructive'
            : 'text-2xl font-semibold tabular-nums text-foreground'
        }
      >
        {value}
      </span>
    </div>
  )
}

function AssignedRoutes({ routes }: { routes: CustomerRouteRef[] }) {
  if (routes.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Route />
          </EmptyMedia>
          <EmptyTitle>Sin ruta asignada</EmptyTitle>
          <EmptyDescription>Este cliente todavía no pertenece a ninguna ruta.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {routes.map((route) => (
        <li key={route.id} className="text-sm text-foreground">
          {route.name}
        </li>
      ))}
    </ul>
  )
}

function RecentNotesList({ notes }: { notes: CustomerVisitNote[] }) {
  if (notes.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <NotebookPen />
          </EmptyMedia>
          <EmptyTitle>Sin notas registradas</EmptyTitle>
          <EmptyDescription>Las notas de visita aparecen aquí cuando el vendedor las carga.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {notes.map((note, index) => (
        <li key={`${note.date}-${index}`} className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{formatDate(note.date)}</span>
          <p className="text-sm text-foreground">{note.notes}</p>
        </li>
      ))}
    </ul>
  )
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      {[0, 1, 2].map((card) => (
        <Card key={card}>
          <CardHeader>
            <Skeleton className="h-4 w-44" />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, row) => (
              <div key={row} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-36" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold text-foreground">{profile.name}</h1>
          {profile.trade_name && <p className="text-sm text-muted-foreground">{profile.trade_name}</p>}
        </div>
        <Badge variant={profile.active ? 'default' : 'outline'}>
          {profile.active ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <DataItem label="Tipo de establecimiento">{profile.establishment_type ?? '—'}</DataItem>
            <DataItem label="Dirección">{profile.address ?? '—'}</DataItem>
            <DataItem label="Municipio">{profile.municipality ?? '—'}</DataItem>
            <DataItem label="Zona">{profile.zone ?? '—'}</DataItem>
            <DataItem label="Teléfono">{profile.phone ?? '—'}</DataItem>
            <DataItem label="Celular">{profile.mobile ?? '—'}</DataItem>
            <DataItem label="Responsable de compra">{profile.attends ?? '—'}</DataItem>
            <DataItem label="Ubicación GPS">
              <span className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  {profile.location ? (
                    <MapPin className="size-4 text-primary" aria-hidden="true" />
                  ) : (
                    <MapPinOff className="size-4 text-muted-foreground" aria-hidden="true" />
                  )}
                  {profile.location
                    ? `${profile.location.lat}, ${profile.location.lng}`
                    : 'Sin ubicación asignada'}
                </span>
                <Button type="button" size="xs" variant="outline" onClick={onAssignLocation}>
                  {profile.location ? 'Editar' : 'Asignar'}
                </Button>
              </span>
            </DataItem>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rutas asignadas</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignedRoutes routes={profile.routes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Créditos y actividad comercial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Crédito habilitado</span>
            <span>
              <Badge variant={profile.credit ? 'default' : 'outline'}>
                {profile.credit ? 'Sí' : 'No'}
              </Badge>
            </span>
          </div>
          <Stat label="Límite de crédito" value={formatCurrency(profile.credit_limit)} />
          <Stat
            label="Saldo pendiente"
            value={formatCurrency(profile.pending_balance)}
            tone={Number(profile.pending_balance) > 0 ? 'danger' : undefined}
          />
          <Stat label="Compras netas" value={formatCurrency(profile.summary.net_purchases)} />
          <Stat label="Pedidos" value={String(profile.summary.orders_count)} />
          <Stat label="Visitas" value={String(profile.summary.visits_count)} />
        </CardContent>
      </Card>

      <CustomerStatsCard profile={profile} />

      <Card>
        <CardHeader>
          <CardTitle>Notas recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentNotesList notes={profile.recent_notes} />
        </CardContent>
      </Card>
    </div>
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
      <div className="flex max-w-5xl flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to="/clientes">
            <ArrowLeft data-icon="inline-start" /> Volver a clientes
          </Link>
        </Button>

        {state.status === 'loading' && <ProfileSkeleton />}
        {state.status === 'pending-backend' && (
          <PendingBackendNotice endpoints={[`GET /api/v1/customers/${id}`]} />
        )}
        {state.status === 'error' && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo cargar el perfil</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
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
