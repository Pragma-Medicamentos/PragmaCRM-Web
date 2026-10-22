import { useState } from 'react'
import { FilterX } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Field, FieldLabel } from '../../components/ui/field'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '../../components/ui/item'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'
import { describeRange } from '../metrics/metricsDates'
import type { TrendGranularity } from '../metrics/metrics.types'
import { PeriodPicker } from '../metrics/PeriodPicker'
import { useMetricsSearch } from '../metrics/useMetricsSearch'
import { useVendors } from '../vendors/useVendors'
import { ReportDownloadMenu } from './ReportDownloadMenu'
import {
  REPORT_SECTIONS,
  REPORTS,
  downloadReport,
  type ReportDefinition,
  type ReportFilterKey,
  type ReportFilterValues,
} from './reportsApi'
import { FILTER_LABELS, useReportFilters, useReportRoutes } from './useReportFilters'

/** Valor del Select para "sin filtro": Radix no acepta un item con value vacío. */
const ALL = '__all__'

const LIMITS = [10, 20, 50, 100] as const

interface FilterSelectProps {
  label: string
  placeholder: string
  value: string | undefined
  options: { value: string; label: string }[]
  disabled?: boolean
  onChange: (value: string | null) => void
}

function FilterSelect({ label, placeholder, value, options, disabled, onChange }: FilterSelectProps) {
  return (
    <Field className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <Select
        value={value ?? ALL}
        disabled={disabled}
        onValueChange={(next) => onChange(next === ALL ? null : next)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

/** Filtros elegidos que este reporte no aplica, para decirlo en su fila. */
function ignoredFilters(report: ReportDefinition, values: ReportFilterValues): ReportFilterKey[] {
  return (Object.keys(values) as ReportFilterKey[]).filter((key) => !report.filters.includes(key))
}

/**
 * Reportes descargables (RF-09 · PCRM-159). Comparten un periodo y los
 * filtros de zona / vendedor / ruta; cada fila descarga su reporte en Excel o
 * PDF con lo que haya en pantalla. Los del panel de métricas (PCRM-162) solo
 * filtran por fechas, y la fila lo dice cuando hay filtros elegidos.
 */
export function ReportsPage() {
  const { range, granularity, setRange, setGranularity } = useMetricsSearch()
  const { values, setFilter, clear } = useReportFilters()
  const routesState = useReportRoutes()
  const { state: vendorsState } = useVendors()
  const [limit, setLimit] = useState<number>(50)

  const hasFilters = Object.keys(values).length > 0
  const routes = routesState.status === 'ready' ? routesState.routes : []
  const zones = routesState.status === 'ready' ? routesState.zones : []
  const vendors = vendorsState.status === 'ready' ? vendorsState.vendors : []
  const loadError =
    routesState.status === 'error'
      ? routesState.message
      : vendorsState.status === 'error'
        ? vendorsState.message
        : null

  return (
    <AppShell>
      <PageHeader
        title="Reportes"
        subtitle={`${describeRange(range)} · descarga en Excel o PDF`}
        actions={<PeriodPicker value={range} onChange={setRange} />}
      />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>
              Zona, vendedor y ruta se combinan entre sí. Zona y municipio son los de la ruta a la que se atribuye
              la venta.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <FilterSelect
                label="Zona"
                placeholder="Todas las zonas"
                value={values.zone}
                disabled={routesState.status !== 'ready'}
                options={zones.map((zone) => ({ value: zone, label: zone }))}
                onChange={(value) => setFilter('zone', value)}
              />
              <FilterSelect
                label="Vendedor"
                placeholder="Todos los vendedores"
                value={values.user_id}
                disabled={vendorsState.status !== 'ready'}
                options={vendors.map((vendor) => ({
                  value: vendor.id,
                  label: vendor.active ? vendor.name : `${vendor.name} (deshabilitado)`,
                }))}
                onChange={(value) => setFilter('user_id', value)}
              />
              <FilterSelect
                label="Ruta"
                placeholder="Todas las rutas"
                value={values.route_id}
                disabled={routesState.status !== 'ready'}
                options={routes.map((route) => ({
                  value: route.id,
                  label: route.active ? route.name : `${route.name} (inactiva)`,
                }))}
                onChange={(value) => setFilter('route_id', value)}
              />
            </div>
            {loadError && (
              <Alert variant="destructive">
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            )}
            {hasFilters && (
              <div>
                <Button variant="ghost" size="sm" onClick={clear}>
                  <FilterX data-icon="inline-start" /> Quitar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {REPORT_SECTIONS.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ItemGroup className="gap-2">
                {REPORTS.filter((report) => report.section === section.id).map((report) => {
                  const ignored = ignoredFilters(report, values)
                  return (
                    <Item key={report.id} variant="outline">
                      <ItemContent className="min-w-0">
                        <ItemTitle>{report.title}</ItemTitle>
                        <ItemDescription>{report.description}</ItemDescription>
                        {(report.note || ignored.length > 0) && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {ignored.length > 0 && (
                              <Badge variant="outline">
                                No aplica: {ignored.map((key) => FILTER_LABELS[key]).join(', ')}
                              </Badge>
                            )}
                            {report.note && <span className="text-xs text-muted-foreground">{report.note}</span>}
                          </div>
                        )}
                      </ItemContent>
                      <ItemActions className="flex-wrap">
                        {report.option === 'granularity' && (
                          <ToggleGroup
                            type="single"
                            variant="outline"
                            size="sm"
                            spacing={0}
                            value={granularity}
                            onValueChange={(value) => value && setGranularity(value as TrendGranularity)}
                            aria-label="Agrupar tendencias"
                          >
                            <ToggleGroupItem value="week">Semana</ToggleGroupItem>
                            <ToggleGroupItem value="month">Mes</ToggleGroupItem>
                          </ToggleGroup>
                        )}
                        {report.option === 'limit' && (
                          <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
                            <SelectTrigger size="sm" aria-label="Filas del ranking">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LIMITS.map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                  Top {size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <ReportDownloadMenu
                          title={report.title}
                          download={(format, { signal }) =>
                            downloadReport(report, { range, format, filters: values, granularity, limit }, { signal })
                          }
                        />
                      </ItemActions>
                    </Item>
                  )
                })}
              </ItemGroup>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  )
}
