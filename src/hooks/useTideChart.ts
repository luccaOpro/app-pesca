import { useEffect, useState } from 'react'
import { detectarExtremos, type ExtremoMarea } from '../lib/tide'

/**
 * Devuelve todos los extremos de marea detectados en una ventana de ±36 h
 * alrededor de "ahora" — útil para dibujar la curva completa en el gráfico.
 * Hace la misma llamada que useTide pero sin filtrar por "futuros".
 */
export interface TideChartState {
  extremes: ExtremoMarea[]
  loading:  boolean
  error:    string | null
}

interface MarineResponse {
  utc_offset_seconds?: number
  hourly?: {
    time?: string[]
    sea_level_height_msl?: (number | null)[]
  }
}

export function useTideChart(lat: number, lon: number): TideChartState {
  const [state, setState] = useState<TideChartState>({
    extremes: [],
    loading:  true,
    error:    null,
  })

  useEffect(() => {
    let cancelled = false
    setState({ extremes: [], loading: true, error: null })

    const params = new URLSearchParams({
      latitude:     lat.toString(),
      longitude:    lon.toString(),
      hourly:       'sea_level_height_msl',
      timezone:     'auto',
      forecast_days: '4',
    })

    fetch(`https://marine-api.open-meteo.com/v1/marine?${params}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<MarineResponse> })
      .then(json => {
        if (cancelled) return
        const times   = json.hourly?.time    ?? []
        const heights = json.hourly?.sea_level_height_msl ?? []
        const offset  = json.utc_offset_seconds ?? 0

        if (!heights.length || heights.every(h => h == null)) {
          setState({ extremes: [], loading: false, error: null })
          return
        }

        const all = detectarExtremos(times, heights, offset)
        setState({ extremes: all, loading: false, error: null })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setState({ extremes: [], loading: false, error: e instanceof Error ? e.message : 'Error' })
      })

    return () => { cancelled = true }
  }, [lat, lon])

  return state
}
