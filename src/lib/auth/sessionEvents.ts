type Listener = () => void

const listeners = new Set<Listener>()

/** Avisa a `useCurrentAppUser` de que la cookie de sesión ya no vale. */
export function notifySessionEnded(): void {
  for (const listener of listeners) listener()
}

export function onSessionEnded(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
