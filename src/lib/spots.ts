export type TipoSpot =
  | 'captura'
  | 'buen_lugar'
  | 'enganche'
  | 'peligro'
  | 'bajada'
  | 'nota'

export const TIPOS_SPOT: Record<TipoSpot, { emoji: string; label: string; color: string }> = {
  captura:    { emoji: '🎣', label: 'Captura',    color: '#F59E0B' },
  buen_lugar: { emoji: '⭐', label: 'Buen lugar', color: '#00D1BD' },
  enganche:   { emoji: '🪝', label: 'Enganche',   color: '#F97316' },
  peligro:    { emoji: '⚠️', label: 'Peligro',    color: '#EF4444' },
  bajada:     { emoji: '⚓', label: 'Bajada',     color: '#3B82F6' },
  nota:       { emoji: '📝', label: 'Nota',       color: '#94A3B8' },
}

export interface Spot {
  id:     string
  nombre: string
  tipo:   TipoSpot
  lat:    number
  lon:    number
  fecha:  number
}

const KEY = 'pesca:spots'

export function getSpots(): Spot[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Spot[]
    // backward compat: spots guardados antes de tipos
    return raw.map(s => ({ ...s, tipo: s.tipo ?? 'buen_lugar' }))
  } catch { return [] }
}

export function saveSpot(s: Spot): void {
  const arr = getSpots()
  arr.push(s)
  localStorage.setItem(KEY, JSON.stringify(arr))
}

export function deleteSpot(id: string): void {
  const arr = getSpots().filter(s => s.id !== id)
  localStorage.setItem(KEY, JSON.stringify(arr))
}
