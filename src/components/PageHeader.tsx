import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}

/** Cabecera de página compartida: título + subtítulo a la izquierda, acciones a la derecha (patrón `.ph` de los wireframes). */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end sm:mb-8 justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
