import { Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

interface PendingBackendNoticeProps {
  endpoints: string[]
}

/** Vista lista del lado del frontend, a la espera de que el endpoint exista en PragmaCRM-Api. */
export function PendingBackendNotice({ endpoints }: PendingBackendNoticeProps) {
  return (
    <Alert className="border-dashed">
      <Info />
      <AlertTitle>Esta vista está lista; falta el endpoint del backend.</AlertTitle>
      <AlertDescription className="flex flex-col gap-1">
        <span>Pendiente de implementar en PragmaCRM-Api:</span>
        <ul className="flex list-inside list-disc flex-col gap-0.5">
          {endpoints.map((endpoint) => (
            <li key={endpoint}>
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{endpoint}</code>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
