import type { ExtremoMarea } from './tide'
import type { FaseLunar } from './moon'

export interface CondicionItem {
  icono: string
  label: string
  estado: 'bueno' | 'regular' | 'malo'
}

export interface ResultadoCondiciones {
  score: number
  etiqueta: string
  color: string
  condiciones: CondicionItem[]
  explicacion: string
}

export interface VentanaPesca {
  periodo: string
  inicio: string
  fin: string
  calidad: 'Excelente' | 'Muy buena' | 'Buena' | 'Regular'
  colorCalidad: string
}

export function scoreLuna(fase: FaseLunar): number {
  switch (fase) {
    case 'Luna nueva':        return 95
    case 'Creciente cóncava': return 90
    case 'Cuarto creciente':  return 85
    case 'Gibosa creciente':  return 65
    case 'Luna llena':        return 25
    case 'Gibosa menguante':  return 55
    case 'Cuarto menguante':  return 60
    case 'Menguante cóncava': return 50
  }
}

function scoreViento(maxKts: number): number {
  if (maxKts <= 5)  return 100
  if (maxKts <= 10) return 85
  if (maxKts <= 15) return 70
  if (maxKts <= 20) return 50
  if (maxKts <= 30) return 30
  return 10
}

function scoreMarea(extremos: ExtremoMarea[], nowMs: number): number {
  if (!extremos.length) return 55
  const next = extremos.find(e => e.ts >= nowMs)
  if (!next) return 45
  const horas = (next.ts - nowMs) / 3_600_000
  if (horas <= 1)   return 100
  if (horas <= 2)   return 85
  if (horas <= 3)   return 65
  if (horas <= 4.5) return 45
  return 30
}

function scorePresion(hPa: number | null): number {
  if (hPa === null) return 65
  if (hPa >= 1010 && hPa <= 1025) return 95
  if (hPa >= 1005) return 75
  if (hPa > 1025)  return 70
  return 45
}

export function calcularCondiciones(p: {
  fase: FaseLunar
  maxKts: number | null
  extremos: ExtremoMarea[]
  presionHPa: number | null
  nowMs: number
}): ResultadoCondiciones {
  const sLuna    = scoreLuna(p.fase)
  const sViento  = p.maxKts !== null ? scoreViento(p.maxKts) : 65
  const sMarea   = scoreMarea(p.extremos, p.nowMs)
  const sPresion = scorePresion(p.presionHPa)

  const score = Math.round(sLuna * 0.25 + sViento * 0.30 + sMarea * 0.25 + sPresion * 0.20)

  let etiqueta: string, color: string
  if (score >= 85)      { etiqueta = 'EXCELENTES'; color = '#00D1BD' }
  else if (score >= 70) { etiqueta = 'MUY BUENAS'; color = '#4ADE80' }
  else if (score >= 55) { etiqueta = 'BUENAS';     color = '#86EFAC' }
  else if (score >= 40) { etiqueta = 'REGULARES';  color = '#FBBF24' }
  else                  { etiqueta = 'DIFÍCILES';  color = '#F87171' }

  const condiciones: CondicionItem[] = [
    {
      icono: '⏱',
      label: p.presionHPa !== null
        ? (sPresion >= 75 ? 'Presión estable' : 'Presión inestable')
        : 'Presión sin datos',
      estado: sPresion >= 75 ? 'bueno' : sPresion >= 50 ? 'regular' : 'malo',
    },
    {
      icono: '💨',
      label: sViento >= 80 ? 'Viento favorable'
           : sViento >= 50 ? 'Viento moderado'
           : 'Viento fuerte',
      estado: sViento >= 80 ? 'bueno' : sViento >= 50 ? 'regular' : 'malo',
    },
    {
      icono: '🌊',
      label: sMarea >= 80 ? 'Marea en movimiento'
           : sMarea >= 50 ? 'Marea moderada'
           : 'Marea quieta',
      estado: sMarea >= 80 ? 'bueno' : sMarea >= 50 ? 'regular' : 'malo',
    },
  ]

  const buenas = condiciones.filter(c => c.estado === 'bueno').map(c => c.label.toLowerCase())
  const explicacion =
    buenas.length >= 2 ? 'Condiciones ideales para pescar hoy.'
    : buenas.length === 1
      ? `${buenas[0].charAt(0).toUpperCase() + buenas[0].slice(1)} favorece la actividad.`
    : 'Condiciones desafiantes hoy.'

  return { score, etiqueta, color, condiciones, explicacion }
}

function fmtHora(ts: number) {
  return new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function periodoDelDia(ts: number) {
  const h = new Date(ts).getHours()
  if (h >= 5 && h < 12) return 'Mañana'
  if (h >= 12 && h < 19) return 'Tarde'
  return 'Noche'
}

export function calcularVentanas(
  extremos: ExtremoMarea[],
  nowMs: number,
  fase: FaseLunar,
): VentanaPesca[] {
  const sL = scoreLuna(fase)
  const proximos = extremos
    .filter(e => e.ts > nowMs - 60 * 60 * 1000)
    .slice(0, 4)

  return proximos.slice(0, 2).map(e => {
    const h = new Date(e.ts).getHours()
    const esDawnDusk = (h >= 5 && h <= 9) || (h >= 17 && h <= 21)
    const pts = Math.round(sL * 0.45 + (esDawnDusk ? 45 : 20))

    let calidad: VentanaPesca['calidad'], colorCalidad: string
    if (pts >= 75)      { calidad = 'Excelente'; colorCalidad = '#00D1BD' }
    else if (pts >= 62) { calidad = 'Muy buena'; colorCalidad = '#4ADE80' }
    else if (pts >= 48) { calidad = 'Buena';     colorCalidad = '#FBBF24' }
    else                { calidad = 'Regular';   colorCalidad = '#94A3B8' }

    return {
      periodo:      periodoDelDia(e.ts),
      inicio:       fmtHora(e.ts - 90 * 60 * 1000),
      fin:          fmtHora(e.ts + 90 * 60 * 1000),
      calidad,
      colorCalidad,
    }
  })
}
