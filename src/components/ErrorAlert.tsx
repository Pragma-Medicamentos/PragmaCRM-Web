import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

/** Mensaje de error de página o de formulario. */
export function ErrorAlert({ children }: { children: ReactNode }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
