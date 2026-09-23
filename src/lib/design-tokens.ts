/**
 * Tokens de diseño de Pragma CRM: fuente única de colores, tipografía, radios y
 * medidas de layout. Si hay que cambiar el verde de la marca o el radio de los
 * bordes, se cambia aquí y en ningún otro lado.
 *
 * Cómo llegan a la pantalla: `applyDesignTokens()` (se llama en `main.tsx`,
 * antes del primer render) inyecta un <style> con estas variables CSS en
 * `:root` y `.dark`. `styles/shadcn.css` solo las *mapea* a utilidades de
 * Tailwind (`bg-primary`, `text-brand-accent`, `font-display`, …) y nunca
 * declara valores propios, así que no hay una segunda copia que se desfase.
 *
 * Lo que NO vive aquí, a propósito: la escala de densidad (`--spacing`,
 * `--text-xs/sm/base`) sigue en `styles/shadcn.css`. Tailwind v4 la lee en
 * tiempo de compilación para generar `h-8`, `text-sm`, etc., y un valor
 * inyectado en ejecución llegaría tarde. Está documentada allí.
 *
 * Reglas de uso en componentes:
 *  - Estilos: clases semánticas de Tailwind (`bg-primary`, `text-muted-foreground`,
 *    `border-border`). Nunca hex sueltos ni `bg-green-600`.
 *  - Estos objetos TS son para lo que no puede ser una clase: gráficos, mapas
 *    (Leaflet), SVG inline o cálculos en JS.
 */

// ---------------------------------------------------------------------------
// Marca
// ---------------------------------------------------------------------------

export const brand = {
  /** Nombre corto del producto, para cabeceras y <title>. */
  name: 'Pragma CRM',
  /** Empresa a la que pertenece el panel. */
  company: 'Droguería Pragma',
  /** Etiqueta del rol que usa este dashboard (RF-01: solo Administrador). */
  roleLabel: 'Administrador',
  tagline: 'Panel de administración de Droguería Pragma.',
} as const

/** Paleta cruda de la marca. Los temas de abajo la referencian; no se usa directo en componentes. */
export const palette = {
  green: '#008000',
  greenHover: '#046b04',
  greenAccent: '#00ac00',
  greenTint: '#e5f3e5',
  black: '#000000',
  white: '#ffffff',
} as const

// ---------------------------------------------------------------------------
// Tipografía y forma
// ---------------------------------------------------------------------------

export const typography = {
  /** Poppins y Anton se cargan desde index.html. */
  sans: "'Poppins', system-ui, -apple-system, sans-serif",
  display: "'Anton', 'Poppins', system-ui, sans-serif",
} as const

export const radius = {
  /** Base de la que Tailwind deriva rounded-sm … rounded-4xl (ver shadcn.css). */
  base: '0.375rem',
} as const

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const layout = {
  sidebarWidth: '15rem',
  sidebarWidthIcon: '3.25rem',
  /** Ancho máximo del contenido de las pantallas de detalle (perfil de cliente). */
  contentMaxWidth: '54rem',
} as const

// ---------------------------------------------------------------------------
// Temas (nombres = variables CSS de shadcn/ui, sin el `--`)
// ---------------------------------------------------------------------------

export type ThemeTokens = Record<string, string>

export const lightTheme: ThemeTokens = {
  background: 'oklch(1 0 0)',
  foreground: 'oklch(0.145 0 0)',
  card: 'oklch(1 0 0)',
  'card-foreground': 'oklch(0.145 0 0)',
  popover: 'oklch(1 0 0)',
  'popover-foreground': 'oklch(0.145 0 0)',
  primary: palette.green,
  'primary-foreground': palette.white,
  secondary: 'oklch(0.97 0 0)',
  'secondary-foreground': 'oklch(0.205 0 0)',
  muted: 'oklch(0.97 0 0)',
  'muted-foreground': 'oklch(0.556 0 0)',
  accent: 'oklch(0.97 0 0)',
  'accent-foreground': 'oklch(0.205 0 0)',
  destructive: 'oklch(0.577 0.245 27.325)',
  border: 'oklch(0.922 0 0)',
  input: 'oklch(0.922 0 0)',
  ring: palette.green,

  'chart-1': palette.green,
  'chart-2': palette.greenAccent,
  'chart-3': 'oklch(0.556 0 0)',
  'chart-4': 'oklch(0.439 0 0)',
  'chart-5': 'oklch(0.269 0 0)',

  sidebar: 'oklch(0.985 0 0)',
  'sidebar-foreground': 'oklch(0.145 0 0)',
  'sidebar-primary': palette.green,
  'sidebar-primary-foreground': palette.white,
  // Ítem activo/hover del menú lateral: tinte verde de la marca.
  'sidebar-accent': palette.greenTint,
  'sidebar-accent-foreground': palette.greenHover,
  'sidebar-border': 'oklch(0.922 0 0)',
  'sidebar-ring': palette.green,

  // Extras de marca (no existen en shadcn): panel oscuro del login y trazo de acento.
  'brand-panel': palette.black,
  'brand-panel-foreground': palette.white,
  'brand-accent': palette.greenAccent,
}

export const darkTheme: ThemeTokens = {
  background: 'oklch(0.145 0 0)',
  foreground: 'oklch(0.985 0 0)',
  card: 'oklch(0.205 0 0)',
  'card-foreground': 'oklch(0.985 0 0)',
  popover: 'oklch(0.205 0 0)',
  'popover-foreground': 'oklch(0.985 0 0)',
  primary: palette.greenAccent,
  'primary-foreground': palette.white,
  secondary: 'oklch(0.269 0 0)',
  'secondary-foreground': 'oklch(0.985 0 0)',
  muted: 'oklch(0.269 0 0)',
  'muted-foreground': 'oklch(0.708 0 0)',
  accent: 'oklch(0.269 0 0)',
  'accent-foreground': 'oklch(0.985 0 0)',
  destructive: 'oklch(0.704 0.191 22.216)',
  border: 'oklch(1 0 0 / 10%)',
  input: 'oklch(1 0 0 / 15%)',
  ring: palette.greenAccent,

  'chart-1': palette.greenAccent,
  'chart-2': palette.green,
  'chart-3': 'oklch(0.708 0 0)',
  'chart-4': 'oklch(0.556 0 0)',
  'chart-5': 'oklch(0.439 0 0)',

  sidebar: 'oklch(0.205 0 0)',
  'sidebar-foreground': 'oklch(0.985 0 0)',
  'sidebar-primary': palette.greenAccent,
  'sidebar-primary-foreground': palette.white,
  'sidebar-accent': 'oklch(0.269 0 0)',
  'sidebar-accent-foreground': 'oklch(0.985 0 0)',
  'sidebar-border': 'oklch(1 0 0 / 10%)',
  'sidebar-ring': palette.greenAccent,

  'brand-panel': palette.black,
  'brand-panel-foreground': palette.white,
  'brand-accent': palette.greenAccent,
}

/**
 * Variantes en hex para los pocos lugares donde una clase no llega
 * (Leaflet, SVG, canvas). Derivadas de la paleta, no duplicadas a mano.
 */
export const jsColors = {
  primary: palette.green,
  accent: palette.greenAccent,
} as const

// ---------------------------------------------------------------------------
// Inyección
// ---------------------------------------------------------------------------

const STYLE_ELEMENT_ID = 'pragma-design-tokens'

function declarations(tokens: ThemeTokens): string {
  return Object.entries(tokens)
    .map(([name, value]) => `--${name}:${value};`)
    .join('')
}

/** CSS que se inyecta en el documento. Exportado para poder inspeccionarlo o probarlo. */
export function buildTokensCss(): string {
  const root = [
    declarations(lightTheme),
    `--radius:${radius.base};`,
    `--font-family-sans:${typography.sans};`,
    `--font-family-display:${typography.display};`,
    `--content-max-width:${layout.contentMaxWidth};`,
  ].join('')

  return `:root{${root}}.dark{${declarations(darkTheme)}}`
}

/**
 * Publica los tokens como variables CSS. Idempotente: llamarla otra vez
 * (p. ej. con HMR) reemplaza el contenido en vez de duplicar el <style>.
 * Debe correr antes del primer render para que no haya un parpadeo sin tema.
 */
export function applyDesignTokens(): void {
  let element = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null
  if (!element) {
    element = document.createElement('style')
    element.id = STYLE_ELEMENT_ID
    document.head.prepend(element)
  }
  element.textContent = buildTokensCss()
}
