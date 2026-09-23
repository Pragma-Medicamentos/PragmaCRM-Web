import { Search } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

export function SearchField({ value, onChange, placeholder }: SearchFieldProps) {
  return (
    <InputGroup className="flex-1">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </InputGroup>
  )
}
