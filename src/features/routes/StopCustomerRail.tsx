import { useDraggable } from '@dnd-kit/core'
import { GripVertical, MapPin, MapPinOff, Plus, Search } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../../components/ui/input-group'
import { Skeleton } from '../../components/ui/skeleton'
import { cn } from '../../lib/utils'
import type { Customer } from '../customers/customers.types'
import type { CustomersState } from '../customers/useCustomers'

export function customerMeta(customer: Pick<Customer, 'zone' | 'municipality'>): string {
  return [customer.zone, customer.municipality].filter(Boolean).join(' · ')
}

function GpsIcon({ hasGps }: { hasGps: boolean }) {
  return hasGps ? (
    <MapPin aria-label="Con ubicación GPS" className="size-3.5 shrink-0 text-primary" />
  ) : (
    <MapPinOff aria-label="Sin ubicación GPS" className="size-3.5 shrink-0 text-muted-foreground" />
  )
}

function CustomerItem({ customer, onAdd }: { customer: Customer; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `customer:${customer.id}`,
    data: { kind: 'customer', customerId: customer.id },
  })
  const meta = customerMeta(customer)

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-roledescription="cliente arrastrable"
      className={cn(
        'group flex cursor-grab touch-none items-center gap-2 rounded-xl py-2 pr-1.5 pl-2.5 outline-none select-none transition-colors hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-ring/60 active:cursor-grabbing',
        isDragging && 'opacity-40'
      )}
    >
      <GripVertical className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{customer.name}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <GpsIcon hasGps={customer.has_gps} />
          <span className="truncate">{meta || 'Sin zona'}</span>
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Agregar ${customer.name} al final`}
        title="Agregar al final"
        className="shrink-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onClick={onAdd}
      >
        <Plus />
      </Button>
    </div>
  )
}

export function CustomerDragPreview({ customer }: { customer: Customer }) {
  const meta = customerMeta(customer)
  return (
    <div className="flex w-[18rem] cursor-grabbing items-center gap-2 rounded-xl bg-card py-2 pr-3 pl-2.5 shadow-float ring-1 ring-primary/30">
      <GripVertical className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{customer.name}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <GpsIcon hasGps={customer.has_gps} />
          <span className="truncate">{meta || 'Sin zona'}</span>
        </p>
      </div>
    </div>
  )
}

interface StopCustomerRailProps {
  customersState: CustomersState
  customers: Customer[]
  search: string
  onSearchChange: (value: string) => void
  onAdd: (customerId: string) => void
}

/** Columna "Clientes": los que todavía no son parada de la ruta, para arrastrar al itinerario. */
export function StopCustomerRail({ customersState, customers, search, onSearchChange, onAdd }: StopCustomerRailProps) {
  return (
    <Card className="max-h-[26rem] gap-0 py-0 lg:sticky lg:top-4 lg:max-h-[calc(100svh-7rem)]">
      <div className="flex flex-col gap-3 border-b px-4 pt-4 pb-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">Clientes</h2>
          {customersState.status === 'ready' && (
            <span className="text-xs text-muted-foreground tabular-nums">{customers.length} disponibles</span>
          )}
        </div>
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Nombre, zona o municipio"
            aria-label="Buscar clientes"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={customersState.status !== 'ready'}
          />
        </InputGroup>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-1.5">
        {customersState.status === 'loading' &&
          Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="m-1 h-12 rounded-xl" />)}

        {customersState.status === 'pending-backend' && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            La API todavía no expone el listado de clientes.
          </p>
        )}

        {customersState.status === 'error' && (
          <p role="alert" className="px-3 py-8 text-center text-sm text-destructive">
            {customersState.message}
          </p>
        )}

        {customersState.status === 'ready' &&
          customers.map((customer) => (
            <CustomerItem key={customer.id} customer={customer} onAdd={() => onAdd(customer.id)} />
          ))}

        {customersState.status === 'ready' && customers.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {search.trim() ? 'Ningún cliente coincide con la búsqueda.' : 'Todos los clientes ya son parada de esta ruta.'}
          </p>
        )}
      </div>
    </Card>
  )
}
