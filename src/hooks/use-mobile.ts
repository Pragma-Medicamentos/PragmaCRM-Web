import * as React from "react"

// Local: 1024 (lg) en vez de 768. Por debajo el sidebar va en el Sheet
// (hamburguesa): en tablets el sidebar fijo se come el ancho y no se puede
// cerrar. Mantener en sincronía con los `lg:` de components/ui/sidebar.tsx.
const MOBILE_BREAKPOINT = 1024

export function useIsMobile() {
  // Local: valor inicial calculado en el primer render (SPA, sin SSR). Con
  // `undefined` el primer render siempre era "escritorio", y como cada página
  // monta su propio AppShell, en móvil la barra superior parpadeaba del botón
  // de panel a la hamburguesa en cada navegación.
  const [isMobile, setIsMobile] = React.useState<boolean>(
    () => window.innerWidth < MOBILE_BREAKPOINT
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
