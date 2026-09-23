import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { ErrorAlert } from '@/components/ErrorAlert'
import { LoadingNotice } from '@/components/LoadingNotice'
import { PendingBackendNotice } from '@/components/PendingBackendNotice'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

function DetailList({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function SalesHistoryTable({ entries }: { entries: CustomerSaleHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin ventas registradas.</p>
  }

  return (
    <Table>
      <TableHeader>
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
            <TableCell>{sale.document ?? sale.erp_sale_id}</TableCell>
            <TableCell>{formatDate(sale.erp_created_at)}</TableCell>
            <TableCell>{formatCurrency(sale.total)}</TableCell>
            <TableCell>{formatCurrency(sale.pending_balance)}</TableCell>
            <TableCell>{formatDate(sale.last_payment_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ProfileView({ profile, onAssignLocation }: { profile: CustomerProfile; onAssignLocation: () => void }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{profile.name}</h1>
          {profile.trade_name && <p className="mt-1 text-sm text-muted-foreground">{profile.trade_name}</p>}
        </div>
        <Badge variant={profile.active ? 'default' : 'outline'}>{profile.active ? 'Activo' : 'Inactivo'}</Badge>
      </div>

      <SectionCard title="Datos generales">
        <DetailList>
          <Detail label="Tipo de establecimiento">{profile.establishment_type ?? '—'}</Detail>
          <Detail label="Dirección">{profile.address ?? '—'}</Detail>
          <Detail label="Municipio">{profile.municipality ?? '—'}</Detail>
          <Detail label="Zona">{profile.zone ?? '—'}</Detail>
          <Detail label="Teléfono">{profile.phone ?? '—'}</Detail>
          <Detail label="Celular">{profile.mobile ?? '—'}</Detail>
          <Detail label="Ubicación GPS">
            <div className="flex flex-wrap items-center gap-3">
              <span>{profile.location ? `${profile.location.lat}, ${profile.location.lng}` : 'Sin ubicación asignada'}</span>
              <Button type="button" size="sm" variant="outline" onClick={onAssignLocation}>
                {profile.location ? 'Editar ubicación' : 'Asignar ubicación'}
              </Button>
            </div>
          </Detail>
        </DetailList>
      </SectionCard>

      <SectionCard title="Responsable de compra">
        <p className="text-sm">{profile.responsible ? profile.responsible.name : 'Sin responsable asignado'}</p>
      </SectionCard>

      <SectionCard title="Créditos y cobros vigentes">
        <DetailList>
          <Detail label="Crédito habilitado">{profile.credit_summary.credit ? 'Sí' : 'No'}</Detail>
          <Detail label="Límite de crédito">{formatCurrency(profile.credit_summary.credit_limit)}</Detail>
          <Detail label="Saldo pendiente total">{formatCurrency(profile.credit_summary.pending_balance_total)}</Detail>
          <Detail label="Cartera vencida">{formatCurrency(profile.credit_summary.overdue_balance_total)}</Detail>
        </DetailList>
      </SectionCard>

      <SectionCard title="Historial de ventas">
        <SalesHistoryTable entries={profile.sales_history} />
      </SectionCard>
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
    <AppShell currentPage={profile?.name ?? 'Perfil'}>
      <div className="flex w-full max-w-(--content-max-width) flex-col gap-5">
        {state.status === 'loading' && <LoadingNotice>Cargando perfil…</LoadingNotice>}
        {state.status === 'pending-backend' && (
          <PendingBackendNotice endpoints={[`GET /api/v1/customers/${id}/profile`]} />
        )}
        {state.status === 'error' && <ErrorAlert>{state.message}</ErrorAlert>}
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
