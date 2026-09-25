import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { COMPARISON_OPTIONS, type ComparisonMode } from './metricsDates'

interface ComparisonPickerProps {
  value: ComparisonMode
  onChange: (mode: ComparisonMode) => void
}

/**
 * Qué otro periodo dibujan los gráficos del panel junto al actual. Las fechas
 * exactas van en la leyenda de cada gráfico, no aquí.
 */
export function ComparisonPicker({ value, onChange }: ComparisonPickerProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as ComparisonMode)}>
      <SelectTrigger size="sm" aria-label="Comparar los gráficos con">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="none">Sin comparar</SelectItem>
        {COMPARISON_OPTIONS.map((option) => (
          <SelectItem key={option.mode} value={option.mode}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
