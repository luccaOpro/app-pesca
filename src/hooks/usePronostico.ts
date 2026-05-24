import { useEffect, useState } from 'react'

export interface DiaPronostico {
  fecha:      string   // "YYYY-MM-DD"
  diaSemana:  string   // "Lun", "Mar" …
  tempMax:    number
  tempMin:    number
  vientoKts:  number
  wmoCode:    number
  sunrise:    string | null  // "HH:MM"
  sunset:     string | null  // "HH:MM"
  sunriseTs?: number          // timestamp ms (sólo si está disponible)
  sunsetTs?:  number
}

export interface PronosticoState {
  dias:    DiaPronostico[]
  loading: boolean
  error:   string | null
}

interface OpenMeteoDaily {
  daily?: {
    time?:                  string[]
    temperature_2m_max?:    number[]
    temperature_2m_min?:    number[]
    wind_speed_10m_max?:    number[]
    weathercode?:           number[]
    sunrise?:               string[]
    sunset?:                string[]
  }
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function usePronostico(lat: number, lon: number): PronosticoState {
  const [state, setState] = useState<PronosticoState>({
    dias: [], loading: true, error: null,
  })

  useEffect(() => {
    let cancelled = false
    setState({ dias: [], loading: true, error: null })

    const params = new URLSearchParams({
      latitude:       lat.toString(),
      longitude:      lon.toString(),
      daily:          'temperature_2m_max,temperature_2m_min,wind_speed_10m_max,weathercode,sunrise,sunset',
      wind_speed_unit: 'kn',
      timezone:       'auto',
      forecast_days:  '6',
    })

    fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<OpenMeteoDaily> })
      .then(json => {
        if (cancelled) return
        const d = json.daily
        if (!d?.time?.length) throw new Error('Sin datos')

        const dias: DiaPronostico[] = d.time.slice(0, 6).map((fecha, i) => {
          const sr = d.sunrise?.[i]
          const ss = d.sunset?.[i]
          return {
            fecha,
            diaSemana: DIAS[new Date(fecha + 'T12:00:00').getDay()],
            tempMax:   Math.round(d.temperature_2m_max?.[i] ?? 0),
            tempMin:   Math.round(d.temperature_2m_min?.[i] ?? 0),
            vientoKts: Math.round(d.wind_speed_10m_max?.[i] ?? 0),
            wmoCode:   d.weathercode?.[i] ?? 0,
            sunrise:   sr ? sr.slice(11, 16) : null,
            sunset:    ss ? ss.slice(11, 16) : null,
            sunriseTs: sr ? new Date(sr).getTime() : undefined,
            sunsetTs:  ss ? new Date(ss).getTime() : undefined,
          }
        })

        setState({ dias, loading: false, error: null })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setState({ dias: [], loading: false, error: e instanceof Error ? e.message : 'Error' })
      })

    return () => { cancelled = true }
  }, [lat, lon])

  return state
}

/** Convierte WMO weather code a emoji */
export function wmoEmoji(code: number): string {
  if (code === 0)                  return '☀️'
  if (code <= 3)                   return '⛅'
  if (code <= 48)                  return '🌫️'
  if (code <= 67)                  return '🌧️'
  if (code <= 77)                  return '❄️'
  if (code <= 82)                  return '🌦️'
  if (code <= 86)                  return '❄️'
  return '⛈️'
}

/** Descripción corta del WMO code */
export function wmoLabel(code: number): string {
  if (code === 0)                  return 'Despejado'
  if (code <= 2)                   return 'Mayormente despejado'
  if (code <= 3)                   return 'Parcialmente nublado'
  if (code <= 48)                  return 'Niebla'
  if (code <= 55)                  return 'Llovizna'
  if (code <= 67)                  return 'Lluvia'
  if (code <= 77)                  return 'Nieve'
  if (code <= 82)                  return 'Chubascos'
  if (code <= 86)                  return 'Nevada'
  return 'Tormenta'
}
