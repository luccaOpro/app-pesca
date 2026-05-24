export type TipoMarea = 'Pleamar' | 'Bajamar'

export interface ExtremoMarea {
  /** Hora local del puerto, formato "HH:MM" */
  hora: string
  /** Día del mes en zona del puerto, para distinguir hoy/mañana */
  dia: number
  tipo: TipoMarea
  /** Altura en metros sobre el nivel medio del mar */
  altura_m: number
  /** Timestamp UTC en ms — usado para filtrar "a partir de ahora" */
  ts: number
}

/**
 * Detecta extremos locales en una serie horaria de altura del mar.
 *
 * Open-Meteo devuelve `sea_level_height_msl` con muestreo horario; las mareas
 * tienen período ~12.4 h, así que un máximo/mínimo local en 3 puntos consecutivos
 * es un buen proxy para pleamar/bajamar (con error ≤ 30 min).
 */
export function detectarExtremos(
  times: string[],
  alturas: (number | null)[],
  utcOffsetSeconds: number,
): ExtremoMarea[] {
  // Normalizar al mínimo del período para que las alturas siempre sean ≥ 0.
  const vals = alturas.filter((x): x is number => x != null)
  const base = vals.length ? Math.min(...vals) : 0

  const out: ExtremoMarea[] = []
  for (let i = 1; i < alturas.length - 1; i++) {
    const prev = alturas[i - 1]
    const cur  = alturas[i]
    const next = alturas[i + 1]
    if (prev == null || cur == null || next == null) continue

    let tipo: TipoMarea | null = null
    if (cur > prev && cur > next) tipo = 'Pleamar'
    else if (cur < prev && cur < next) tipo = 'Bajamar'
    if (!tipo) continue

    const iso = times[i]
    // Open-Meteo entrega "YYYY-MM-DDTHH:mm" en hora local del puerto (sin tz).
    // Para comparar con "ahora" lo interpretamos como UTC y restamos el offset.
    const tsUtc = Date.parse(iso + 'Z') - utcOffsetSeconds * 1000
    const [fecha, hora] = iso.split('T')
    const dia = Number(fecha.split('-')[2])

    out.push({
      hora: hora.slice(0, 5),
      dia,
      tipo,
      altura_m: cur - base,
      ts: tsUtc,
    })
  }
  return out
}

/** Devuelve los próximos `n` extremos a partir de `nowMs` (UTC ms). */
export function proximosExtremos(
  extremos: ExtremoMarea[],
  nowMs: number,
  n: number,
): ExtremoMarea[] {
  return extremos.filter(e => e.ts >= nowMs).slice(0, n)
}
