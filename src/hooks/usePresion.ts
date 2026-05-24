import { useEffect, useState } from 'react'

export type TendenciaPresion = 'subiendo' | 'bajando' | 'estable' | null

export interface EstadoPresion {
  hPa:       number | null
  tendencia: TendenciaPresion
  loading:   boolean
}

interface OMResponse {
  current?: { surface_pressure?: number }
  hourly?:  { time?: string[]; surface_pressure?: (number | null)[] }
}

export function usePresion(lat: number, lon: number): EstadoPresion {
  const [state, setState] = useState<EstadoPresion>({
    hPa: null, tendencia: null, loading: true,
  })

  useEffect(() => {
    let cancelled = false
    setState({ hPa: null, tendencia: null, loading: true })

    const params = new URLSearchParams({
      latitude:      lat.toString(),
      longitude:     lon.toString(),
      current:       'surface_pressure',
      hourly:        'surface_pressure',
      past_days:     '1',
      forecast_days: '1',
      timezone:      'auto',
    })

    fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      .then(r => r.json() as Promise<OMResponse>)
      .then(json => {
        if (cancelled) return
        const current = json.current?.surface_pressure ?? null

        let tendencia: TendenciaPresion = null
        const times     = json.hourly?.time     ?? []
        const pressures = json.hourly?.surface_pressure ?? []

        if (current != null && times.length > 0) {
          const now = Date.now()
          // Find hourly value closest to 3 h ago
          const target = now - 3 * 3_600_000
          let bestIdx = -1, bestDiff = Infinity
          for (let i = 0; i < times.length; i++) {
            const diff = Math.abs(new Date(times[i]).getTime() - target)
            if (diff < bestDiff) { bestDiff = diff; bestIdx = i }
          }
          if (bestIdx >= 0 && pressures[bestIdx] != null) {
            const delta = current - (pressures[bestIdx] as number)
            if      (delta >  1.5) tendencia = 'subiendo'
            else if (delta < -1.5) tendencia = 'bajando'
            else                   tendencia = 'estable'
          }
        }

        setState({ hPa: current, tendencia, loading: false })
      })
      .catch(() => {
        if (!cancelled) setState({ hPa: null, tendencia: null, loading: false })
      })

    return () => { cancelled = true }
  }, [lat, lon])

  return state
}
