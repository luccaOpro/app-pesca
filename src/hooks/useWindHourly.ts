import { useEffect, useState } from 'react'

export interface HoraViento {
  ts:       number   // timestamp ms
  hora:     string   // "HH:MM"
  speedKts: number
  dirDeg:   number   // dirección desde donde viene el viento
}

export interface WindHourlyState {
  horas:   HoraViento[]
  loading: boolean
  error:   string | null
}

interface OMResponse {
  utc_offset_seconds?: number
  hourly?: {
    time?:               string[]
    wind_speed_10m?:     number[]
    wind_direction_10m?: number[]
    wind_gusts_10m?:     number[]
  }
}

/**
 * Devuelve las próximas N horas de viento (default 12) desde "ahora".
 */
export function useWindHourly(lat: number, lon: number, horas = 12): WindHourlyState {
  const [state, setState] = useState<WindHourlyState>({
    horas: [], loading: true, error: null,
  })

  useEffect(() => {
    let cancelled = false
    setState({ horas: [], loading: true, error: null })

    const params = new URLSearchParams({
      latitude:        lat.toString(),
      longitude:       lon.toString(),
      hourly:          'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      wind_speed_unit: 'kn',
      timezone:        'auto',
      forecast_days:   '2',
    })

    fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<OMResponse> })
      .then(json => {
        if (cancelled) return
        const times  = json.hourly?.time ?? []
        const speeds = json.hourly?.wind_speed_10m ?? []
        const dirs   = json.hourly?.wind_direction_10m ?? []
        if (!times.length) throw new Error('Sin datos de viento')

        const now = Date.now()
        // Encontrar índice de la hora actual (la mayor <= now)
        let startIdx = 0
        for (let i = 0; i < times.length; i++) {
          if (new Date(times[i]).getTime() <= now) startIdx = i
          else break
        }

        const slice: HoraViento[] = []
        for (let i = startIdx; i < Math.min(startIdx + horas, times.length); i++) {
          const ts = new Date(times[i]).getTime()
          slice.push({
            ts,
            hora:     times[i].slice(11, 16),
            speedKts: Math.round(speeds[i] ?? 0),
            dirDeg:   Math.round(dirs[i] ?? 0),
          })
        }

        setState({ horas: slice, loading: false, error: null })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setState({ horas: [], loading: false, error: e instanceof Error ? e.message : 'Error' })
      })

    return () => { cancelled = true }
  }, [lat, lon, horas])

  return state
}

/**
 * Color del viento según fuerza:
 *  - calmo (0-5 kt):   teal
 *  - moderado (6-15):  verde-amarillo
 *  - fuerte (16-25):   ámbar
 *  - peligroso (>25):  rojo
 */
export function colorViento(kts: number): string {
  if (kts <=  5) return '#00D1BD'
  if (kts <= 10) return '#86EFAC'
  if (kts <= 15) return '#FBBF24'
  if (kts <= 25) return '#F97316'
  return '#EF4444'
}
