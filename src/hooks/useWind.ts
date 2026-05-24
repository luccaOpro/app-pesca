import { useEffect, useState } from 'react'
import { dominantCuadrante, meanDegrees, type Cuadrante } from '../lib/wind'

export interface DatosViento {
  min: number
  max: number
  cuadrante: Cuadrante
  direccion_grados: number
}

export interface EstadoViento {
  data: DatosViento | null
  loading: boolean
  error: string | null
}

interface OpenMeteoResponse {
  hourly?: {
    wind_speed_10m?: number[]
    wind_direction_10m?: number[]
  }
}

export function useWind(lat: number, lon: number): EstadoViento {
  const [state, setState] = useState<EstadoViento>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    setState({ data: null, loading: true, error: null })

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: 'wind_speed_10m,wind_direction_10m',
      wind_speed_unit: 'kn',
      timezone: 'auto',
      forecast_days: '1',
    })
    const url = `https://api.open-meteo.com/v1/forecast?${params}`

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<OpenMeteoResponse>
      })
      .then((json) => {
        if (cancelled) return
        const speeds = json.hourly?.wind_speed_10m ?? []
        const dirs = json.hourly?.wind_direction_10m ?? []
        if (!speeds.length) throw new Error('Sin datos de viento')

        setState({
          data: {
            min: Math.round(Math.min(...speeds)),
            max: Math.round(Math.max(...speeds)),
            cuadrante: dominantCuadrante(dirs),
            direccion_grados: Math.round(meanDegrees(dirs)),
          },
          loading: false,
          error: null,
        })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'Error de conexión'
        setState({ data: null, loading: false, error: msg })
      })

    return () => {
      cancelled = true
    }
  }, [lat, lon])

  return state
}
