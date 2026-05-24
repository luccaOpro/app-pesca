export type Cuadrante = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SO' | 'O' | 'NO'

const CUADRANTES: Cuadrante[] = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']

export function degToCuadrante(deg: number): Cuadrante {
  const norm = ((deg % 360) + 360) % 360
  const idx = Math.round(norm / 45) % 8
  return CUADRANTES[idx]
}

export function dominantCuadrante(degrees: number[]): Cuadrante {
  const counts: Record<string, number> = {}
  for (const d of degrees) {
    const c = degToCuadrante(d)
    counts[c] = (counts[c] ?? 0) + 1
  }
  const entries = Object.entries(counts)
  if (entries.length === 0) return 'N'
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0] as Cuadrante
}

/** Media circular de un array de ángulos (0-360°). */
export function meanDegrees(degrees: number[]): number {
  if (!degrees.length) return 0
  const rad = Math.PI / 180
  const sin = degrees.reduce((s, d) => s + Math.sin(d * rad), 0) / degrees.length
  const cos = degrees.reduce((s, d) => s + Math.cos(d * rad), 0) / degrees.length
  return ((Math.atan2(sin, cos) / rad) + 360) % 360
}
