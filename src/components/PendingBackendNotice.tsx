interface PendingBackendNoticeProps {
  endpoints: string[]
}

/** Vista lista del lado del frontend, a la espera de que el endpoint exista en PragmaCRM-Api. */
export function PendingBackendNotice({ endpoints }: PendingBackendNoticeProps) {
  return (
    <div className="pending-backend">
      <p className="pending-backend__title">Esta vista está lista; falta el endpoint del backend.</p>
      <p className="pending-backend__hint">Pendiente de implementar en PragmaCRM-Api:</p>
      <ul className="pending-backend__list">
        {endpoints.map((endpoint) => (
          <li key={endpoint}>
            <code>{endpoint}</code>
          </li>
        ))}
      </ul>
    </div>
  )
}
