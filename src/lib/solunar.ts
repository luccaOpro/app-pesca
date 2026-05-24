/**
 * Períodos solunares (Solunar theory de John Alden Knight).
 *
 * Hay 4 períodos por día:
 *   - 2 mayores (~2 h): cuando la luna está en su cénit (overhead) o nadir (underfoot)
 *   - 2 menores (~1 h): cuando la luna sale o se pone
 *
 * Estos períodos se desplazan ~50 min más tarde por día respecto del paso anterior
 * de la luna. Nuestra aproximación:
 *   - En luna nueva, la luna transita con el sol → cénit al mediodía solar.
 *   - Cada día siguiente, el tránsito se atrasa ~50 min (24 h / 29.5 d × ~24 h).
 *
 * Para una librería de pesca, esta precisión es suficiente. La teoría real
 * requiere calcular la posición lunar exacta (Meeus) que excede el alcance
 * de esta app.
 */

export type TipoSolunar = 'mayor' | 'menor'

export interface PeriodoSolunar {
  tipo:    TipoSolunar
  inicio:  number   // timestamp ms
  fin:     number   // timestamp ms
  label:   string   // "Mayor" / "Menor"
}

const SYNODIC = 29.530588853   // duración del ciclo lunar en días
const MIN_PER_DAY_SHIFT = (24 * 60) / SYNODIC   // ≈ 48.77 min/día

/**
 * Calcula los 4 períodos solunares para un día dado.
 *
 * @param sunriseTs    Salida del sol en ms (para inferir mediodía solar)
 * @param sunsetTs     Puesta del sol en ms
 * @param lunarAgeDays Edad de la luna en días (0–29.5)
 */
export function calcularPeriodosSolunares(
  sunriseTs:    number,
  sunsetTs:     number,
  lunarAgeDays: number,
): PeriodoSolunar[] {
  // Mediodía solar: punto medio entre salida y puesta
  const solarNoon = (sunriseTs + sunsetTs) / 2

  // Desfasaje del tránsito lunar (overhead) respecto del mediodía solar
  // Reducido al rango [-12h, +12h] desde mediodía
  let shiftMin = (lunarAgeDays * MIN_PER_DAY_SHIFT) % (24 * 60)
  if (shiftMin > 12 * 60) shiftMin -= 24 * 60

  const overhead  = solarNoon + shiftMin * 60_000
  const underfoot = overhead + 12 * 3_600_000   // 12 h después

  // Aproximación: la salida/puesta de la luna están ~6 h alejadas del tránsito
  const moonrise = overhead - 6 * 3_600_000
  const moonset  = overhead + 6 * 3_600_000

  const mayorDur = 60 * 60_000   // ±1 h
  const menorDur = 30 * 60_000   // ±30 min

  const periodos: PeriodoSolunar[] = [
    { tipo: 'mayor', inicio: overhead  - mayorDur, fin: overhead  + mayorDur, label: 'Mayor' },
    { tipo: 'mayor', inicio: underfoot - mayorDur, fin: underfoot + mayorDur, label: 'Mayor' },
    { tipo: 'menor', inicio: moonrise  - menorDur, fin: moonrise  + menorDur, label: 'Menor' },
    { tipo: 'menor', inicio: moonset   - menorDur, fin: moonset   + menorDur, label: 'Menor' },
  ]
  return periodos.sort((a, b) => a.inicio - b.inicio)
}

/**
 * Devuelve solo los próximos N períodos a partir de "ahora", filtrando los
 * que ya pasaron. Si el período actual está en curso, se incluye.
 */
export function proximosPeriodos(
  periodos: PeriodoSolunar[],
  nowMs:    number,
  cantidad = 3,
): PeriodoSolunar[] {
  return periodos
    .filter(p => p.fin >= nowMs)
    .slice(0, cantidad)
}

/** Verifica si un timestamp cae dentro de algún período. */
export function periodoEnCurso(
  periodos: PeriodoSolunar[],
  nowMs:    number,
): PeriodoSolunar | null {
  return periodos.find(p => p.inicio <= nowMs && p.fin >= nowMs) ?? null
}

export function formatHora(ts: number): string {
  return new Date(ts).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}
