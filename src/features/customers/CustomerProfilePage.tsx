import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, MapPinOff, Receipt } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
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

/** Par etiqueta/valor de las fichas de datos. */
function DataItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  )
}

/** Cifra destacada del resumen de créditos. */
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

function SalesHistoryTable({ entries }: { entries: CustomerSaleHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Receipt />
          </EmptyMedia>
          <EmptyTitle>Sin ventas registradas</EmptyTitle>
          <EmptyDescription>
            El historial se llena con cada importación del archivo de ventas de Efactsoft.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Table>
      <TableHeader className="bg-muted/40">
        <TableRow>
          <TableHead>Documento</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Saldo pendiente</TableHead>
          <TableHead>Último pago</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((sale) => (
          <TableRow key={sale.erp_sale_id}>
            <TableCell className="font-medium text-foreground">{sale.document ?? sale.erp_sale_id}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(sale.erp_created_at)}</TableCell>
            <TableCell className="tabular-nums text-muted-foreground">{formatCurrency(sale.total)}</TableCell>
            <TableCell className="tabular-nums text-muted-foreground">{formatCurrency(sale.pending_balance)}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(sale.last_payment_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      {[0, 1].map((card) => (
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

function ProfileView({ profile, onAssignLocation }: { profile: CustomerProfile; onAssignLocation: () => void }) {
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
            <DataItem label="Responsable de compra">
              {profile.responsible ? profile.responsible.name : 'Sin responsable asignado'}
            </DataItem>
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
          <CardTitle>Créditos y cobros vigentes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Crédito habilitado</span>
            <span>
              <Badge variant={profile.credit_summary.credit ? 'default' : 'outline'}>
                {profile.credit_summary.credit ? 'Sí' : 'No'}
              </Badge>
            </span>
          </div>
          <Stat label="Límite de crédito" value={formatCurrency(profile.credit_summary.credit_limit)} />
          <Stat
            label="Saldo pendiente total"
            value={formatCurrency(profile.credit_summary.pending_balance_total)}
          />
          <Stat
            label="Cartera vencida"
            value={formatCurrency(profile.credit_summary.overdue_balance_total)}
            tone={Number(profile.credit_summary.overdue_balance_total) > 0 ? 'danger' : undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de ventas</CardTitle>
        </CardHeader>
        <CardContent className="border-t px-0">
          <SalesHistoryTable entries={profile.sales_history} />
        </CardContent>
      </Card>
    </div>
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
      <div className="flex max-w-5xl flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to="/clientes">
            <ArrowLeft data-icon="inline-start" /> Volver a clientes
          </Link>
        </Button>

        {state.status === 'loading' && <ProfileSkeleton />}
        {state.status === 'pending-backend' && (
          <PendingBackendNotice endpoints={[`GET /api/v1/customers/${id}/profile`]} />
        )}
        {state.status === 'error' && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo cargar el perfil</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
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
