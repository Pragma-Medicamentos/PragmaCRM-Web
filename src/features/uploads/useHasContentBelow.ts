import { useEffect, useState, type RefObject } from 'react'

/**
 * ¿Queda contenido por debajo del borde inferior de la ventana?
 *
 * El resultado de una importación rara vez cabe en el alto de la pantalla, y la
 * barra de acciones anclada al pie se lee como el final del documento: sin un
 * aviso explícito el admin no sabe que todavía hay algo que leer.
 *
 * Se observa el contenedor de la pantalla y no el `body` a propósito:
 * `index.css` fija `html, body, #root { height: 100% }`, así que el alto del
 * body no cambia aunque el contenido crezca y un `ResizeObserver` sobre él no
 * dispararía nunca. El contenedor sí crece al aparecer el resumen o la tabla de
 * rechazos, que es justo cuando la respuesta cambia.
 */
export function useHasContentBelow(
  content: RefObject<HTMLElement | null>,
  /** Margen en px para no avisar por un par de píxeles de redondeo. */
  threshold = 24
): boolean {
  const [hasContentBelow, setHasContentBelow] = useState(false)

  useEffect(() => {
    const doc = document.documentElement

    function check() {
      const distanceToBottom = doc.scrollHeight - window.scrollY - window.innerHeight
      setHasContentBelow(distanceToBottom > threshold)
    }

    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)

    const observer = new ResizeObserver(check)
    if (content.current) observer.observe(content.current)

    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
      observer.disconnect()
    }
  }, [content, threshold])

  return hasContentBelow
}
