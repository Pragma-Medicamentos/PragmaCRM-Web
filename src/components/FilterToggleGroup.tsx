import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface FilterToggleGroupProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  label: string
}

/** Filtro de selección única (siempre hay una opción activa). */
export function FilterToggleGroup<T extends string>({ value, onChange, options, label }: FilterToggleGroupProps<T>) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={1}
      value={value}
      // Radix devuelve '' al pulsar la opción ya activa; un filtro no puede quedar sin valor.
      onValueChange={(next) => next && onChange(next as T)}
      aria-label={label}
      className="flex-wrap"
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
