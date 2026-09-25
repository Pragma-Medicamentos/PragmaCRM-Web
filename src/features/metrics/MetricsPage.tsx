import { ChartColumn, MapPinned, UsersRound } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'
import { CoverageTab } from './CoverageTab'
import { GeneralTab } from './GeneralTab'
import type { TrendGranularity } from './metrics.types'
import { describeRange, formatRange, previousRange } from './metricsDates'
import { PeriodPicker } from './PeriodPicker'
import { TeamTab } from './TeamTab'
import { type MetricsTab, useMetricsSearch } from './useMetricsSearch'

/**
 * Panel de métricas (RF-09): reúne las tres variantes del wireframe en
 * pestañas que comparten un solo filtro de periodo — General (1d + 1e),
 * Equipo (1d tabla + 1f) y Cobertura (mapa de 1e). Todo el estado vive en la
 * URL (useMetricsSearch).
 */
export function MetricsPage() {
  const { range, tab, granularity, setRange, setTab, setGranularity } = useMetricsSearch()

  return (
    <AppShell>
      <PageHeader
        title="Panel de métricas"
        subtitle={`${describeRange(range)} · comparado con ${formatRange(previousRange(range))}`}
        actions={<PeriodPicker value={range} onChange={setRange} />}
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as MetricsTab)} className="gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="general">
              <ChartColumn data-icon="inline-start" /> General
            </TabsTrigger>
            <TabsTrigger value="equipo">
              <UsersRound data-icon="inline-start" /> Equipo
            </TabsTrigger>
            <TabsTrigger value="cobertura">
              <MapPinned data-icon="inline-start" /> Cobertura
            </TabsTrigger>
          </TabsList>

          {tab === 'general' && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={granularity}
              onValueChange={(value) => value && setGranularity(value as TrendGranularity)}
              aria-label="Agrupar tendencias"
            >
              <ToggleGroupItem value="week">Por semana</ToggleGroupItem>
              <ToggleGroupItem value="month">Por mes</ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>

        <TabsContent value="general">
          <GeneralTab range={range} granularity={granularity} />
        </TabsContent>
        <TabsContent value="equipo">
          <TeamTab range={range} />
        </TabsContent>
        <TabsContent value="cobertura">
          <CoverageTab range={range} />
        </TabsContent>
      </Tabs>
    </AppShell>
  )
}
