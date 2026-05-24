export interface Captura {
  id:          string
  especie:     string
  longitud_cm?: number
  peso_kg?:    number
  lat?:        number
  lon?:        number
  notas?:      string
  fecha:       number   // timestamp ms
}

/** Especies frecuentes en el Río de la Plata / CABA */
export const ESPECIES_COMUNES = [
  'Pejerrey',
  'Dorado',
  'Surubí',
  'Boga',
  'Sábalo',
  'Bagre amarillo',
  'Bagre negro',
  'Corvina rubia',
  'Corvina negra',
  'Patí',
  'Lenguado',
  'Palometa',
  'Pirá pitá',
  'Tararira',
]

const KEY = 'pesca:capturas'

export function getCapturas(): Captura[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

export function saveCaptura(c: Captura): void {
  const arr = getCapturas()
  arr.unshift(c)
  localStorage.setItem(KEY, JSON.stringify(arr))
}

export function deleteCaptura(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getCapturas().filter(c => c.id !== id)))
}

export function statsCapturas(capturas: Captura[]): {
  total: number
  especies: { nombre: string; count: number }[]
  mayorPez: Captura | null
} {
  const conteo: Record<string, number> = {}
  let mayor: Captura | null = null

  for (const c of capturas) {
    conteo[c.especie] = (conteo[c.especie] ?? 0) + 1
    if (c.longitud_cm != null && (mayor == null || c.longitud_cm > (mayor.longitud_cm ?? 0))) {
      mayor = c
    }
  }

  const especies = Object.entries(conteo)
    .map(([nombre, count]) => ({ nombre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  return { total: capturas.length, especies, mayorPez: mayor }
}
