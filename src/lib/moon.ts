const SYNODIC_PERIOD = 29.530588853
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)

export type FaseLunar =
  | 'Luna nueva'
  | 'Creciente cóncava'
  | 'Cuarto creciente'
  | 'Gibosa creciente'
  | 'Luna llena'
  | 'Gibosa menguante'
  | 'Cuarto menguante'
  | 'Menguante cóncava'

const FASES: FaseLunar[] = [
  'Luna nueva',
  'Creciente cóncava',
  'Cuarto creciente',
  'Gibosa creciente',
  'Luna llena',
  'Gibosa menguante',
  'Cuarto menguante',
  'Menguante cóncava',
]

const EMOJIS: Record<FaseLunar, string> = {
  'Luna nueva':         '🌑',
  'Creciente cóncava':  '🌒',
  'Cuarto creciente':   '🌓',
  'Gibosa creciente':   '🌔',
  'Luna llena':         '🌕',
  'Gibosa menguante':   '🌖',
  'Cuarto menguante':   '🌗',
  'Menguante cóncava':  '🌘',
}

export interface InfoLunar {
  fase: FaseLunar
  iluminacion: number
  edadDias: number
  emoji: string
}

export function calcularLuna(date: Date = new Date()): InfoLunar {
  const elapsedMs = date.getTime() - KNOWN_NEW_MOON
  const elapsedDays = elapsedMs / 86_400_000
  const edadDias = ((elapsedDays % SYNODIC_PERIOD) + SYNODIC_PERIOD) % SYNODIC_PERIOD

  const phaseAngle = (edadDias / SYNODIC_PERIOD) * 2 * Math.PI
  const iluminacion = (1 - Math.cos(phaseAngle)) / 2

  const eighth = SYNODIC_PERIOD / 8
  const idx = Math.floor((edadDias + eighth / 2) / eighth) % 8
  const fase = FASES[idx]

  return { fase, iluminacion, edadDias, emoji: EMOJIS[fase] }
}

export type PiqueLabel = 'Bien' | 'Regular' | 'Mal'

export interface Pique {
  label: PiqueLabel
  detalle: string
  color: string
}

export function piqueDeFase(fase: FaseLunar): Pique {
  switch (fase) {
    case 'Luna nueva':
    case 'Cuarto creciente':
      return {
        label: 'Bien',
        detalle: 'Pesca buena — alta actividad',
        color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      }
    case 'Creciente cóncava':
      return {
        label: 'Bien',
        detalle: 'Pesca buena — fase ascendente',
        color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      }
    case 'Gibosa creciente':
    case 'Gibosa menguante':
    case 'Cuarto menguante':
    case 'Menguante cóncava':
      return {
        label: 'Regular',
        detalle: 'Pesca regular',
        color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      }
    case 'Luna llena':
      return {
        label: 'Mal',
        detalle: 'Pesca mala — pez saciado de noche',
        color: 'bg-red-500/20 text-red-300 border-red-500/40',
      }
  }
}
