import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { LeafletMapa } from '../components/LeafletMapa'
import { useTracker } from '../hooks/useTracker'
import { saveTrack, formatDuracion, type Track } from '../lib/tracks'

interface Props {
  onDetener: (track: Track | null) => void
}

export function TrackerActivo({ onDetener }: Props) {
  const tracker = useTracker(true)
  const mapRef   = useRef<L.Map | null>(null)
  const lineRef  = useRef<L.Polyline | null>(null)
  const marcadorRef = useRef<L.CircleMarker | null>(null)

  // Dibujar la ruta y centrar el mapa a medida que llegan puntos
  useEffect(() => {
    const map = mapRef.current
    if (!map || tracker.puntos.length === 0) return

    const ultimo = tracker.puntos[tracker.puntos.length - 1]
    const latlngs = tracker.puntos.map(p => [p.lat, p.lon] as [number, number])

    if (!lineRef.current) {
      lineRef.current = L.polyline(latlngs, {
        color: '#00D1BD',
        weight: 4,
        opacity: 0.9,
      }).addTo(map)
    } else {
      lineRef.current.setLatLngs(latlngs)
    }

    const pos: [number, number] = [ultimo.lat, ultimo.lon]
    if (!marcadorRef.current) {
      marcadorRef.current = L.circleMarker(pos, {
        radius: 8, color: '#fff', weight: 2, fillColor: '#00D1BD', fillOpacity: 1,
      }).addTo(map)
    } else {
      marcadorRef.current.setLatLng(pos)
    }

    map.panTo(pos, { animate: true, duration: 0.5 })
  }, [tracker.puntos])

  function detener() {
    if (tracker.puntos.length < 2) {
      onDetener(null)
      return
    }
    const track: Track = {
      id: Date.now().toString(),
      nombre: `Salida ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`,
      fecha: Date.now(),
      puntos: tracker.puntos,
      distancia_nm: tracker.distancia_nm,
      duracion_s: tracker.duracion_s,
    }
    saveTrack(track)
    onDetener(track)
  }

  const primerPunto = tracker.puntos[0]
  const center: [number, number] = primerPunto
    ? [primerPunto.lat, primerPunto.lon]
    : [-34.6, -58.38]

  return (
    <div className="flex flex-col h-full bg-[#0B1928]">

      {/* Mapa fullscreen */}
      <div className="flex-1 min-h-0 relative">
        <LeafletMapa
          center={center}
          zoom={14}
          className="w-full h-full"
          onMapReady={map => { mapRef.current = map }}
        />

        {/* Mensaje de error GPS */}
        {tracker.error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-900/80 text-red-200 text-xs px-3 py-1.5 rounded-full">
            {tracker.error}
          </div>
        )}

        {/* Esperando GPS */}
        {!tracker.error && tracker.puntos.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-black/60 text-slate-300 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            Esperando señal GPS…
          </div>
        )}
      </div>

      {/* Overlay de datos — fijo abajo */}
      <div className="shrink-0 bg-[#0E1F38]/95 border-t border-white/[0.07] px-4 pt-4 pb-6">

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase mb-0.5">Velocidad</p>
            <p className="text-2xl font-mono text-slate-100 leading-tight">
              {tracker.velocidad_kts.toFixed(1)}
            </p>
            <p className="text-[10px] text-slate-500">kt</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase mb-0.5">Distancia</p>
            <p className="text-2xl font-mono text-slate-100 leading-tight">
              {tracker.distancia_nm.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500">mn</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase mb-0.5">Tiempo</p>
            <p className="text-2xl font-mono text-slate-100 leading-tight">
              {formatDuracion(tracker.duracion_s)}
            </p>
            <p className="text-[10px] text-slate-500 invisible">—</p>
          </div>
        </div>

        {/* Botón detener */}
        <button
          onClick={detener}
          className="w-full py-3.5 rounded-2xl text-base font-semibold tracking-wide text-white border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition-colors active:opacity-70"
        >
          Detener salida
        </button>
      </div>

    </div>
  )
}
