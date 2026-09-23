import { Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface PendingBackendNoticeProps {
  endpoints: string[]
}

/** Vista lista del lado del frontend, a la espera de que el endpoint exista en PragmaCRM-Api. */
export function PendingBackendNotice({ endpoints }: PendingBackendNoticeProps) {
  return (
    <Alert>
      <Info />
      <AlertTitle>Esta vista está lista; falta el endpoint del backend.</AlertTitle>
      <AlertDescription>
        <p>Pendiente de implementar en PragmaCRM-Api:</p>
        <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5">
          {endpoints.map((endpoint) => (
            <li key={endpoint}>
              <code className="font-mono">{endpoint}</code>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
