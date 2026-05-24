import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { getStorageInfo, downloadTile, saveTile, removeTile } from 'leaflet.offline'
import { LeafletMapa } from '../components/LeafletMapa'
import { estimarTiles, estimarMB, generarTiles, type BoundingBox } from '../lib/tiles'

const ZOOM_MIN = 10
const ZOOM_MAX = 16
const URL_TEMPLATE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

interface ZonaGuardada {
  id: string
  nombre: string
  bbox: BoundingBox
  tiles: number
  mb: number
  fecha: number
}

const ZONAS_KEY = 'pesca:zonas-offline'

function readZonas(): ZonaGuardada[] {
  try { return JSON.parse(localStorage.getItem(ZONAS_KEY) ?? '[]') } catch { return [] }
}
function saveZonas(z: ZonaGuardada[]) {
  localStorage.setItem(ZONAS_KEY, JSON.stringify(z))
}

interface Props {
  onBack: () => void
}

export function MapasOffline({ onBack }: Props) {
  const mapRef   = useRef<L.Map | null>(null)
  const rectRef  = useRef<L.Rectangle | null>(null)
  const startRef = useRef<L.LatLng | null>(null)

  const [seleccionando, setSeleccionando] = useState(false)
  const [bbox, setBbox] = useState<BoundingBox | null>(null)
  const [zonas, setZonas] = useState<ZonaGuardada[]>(readZonas)
  const [descargando, setDescargando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [totalTilesDesc, setTotalTilesDesc] = useState(0)
  const [tilesEnStorage, setTilesEnStorage] = useState(0)
  const [nombreNueva, setNombreNueva] = useState('')

  const tilesEstimados = bbox ? estimarTiles(bbox, ZOOM_MIN, ZOOM_MAX) : 0
  const mbEstimados    = estimarMB(tilesEstimados)

  useEffect(() => {
    getStorageInfo(URL_TEMPLATE).then(info => setTilesEnStorage(info.length)).catch(() => {})
  }, [zonas])

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map

    map.on('mousedown touchstart', (evt) => {
      if (!seleccionando) return
      const e = evt as L.LeafletMouseEvent
      e.originalEvent?.preventDefault()
      startRef.current = e.latlng
      rectRef.current?.remove()
      rectRef.current = null
    })

    map.on('mousemove touchmove', (evt) => {
      if (!seleccionando || !startRef.current) return
      const e = evt as L.LeafletMouseEvent
      const bounds = L.latLngBounds(startRef.current, e.latlng)
      if (rectRef.current) {
        rectRef.current.setBounds(bounds)
      } else {
        rectRef.current = L.rectangle(bounds, {
          color: '#00D1BD', weight: 2, fillOpacity: 0.15,
        }).addTo(map)
      }
    })

    map.on('mouseup touchend', (evt) => {
      if (!seleccionando || !startRef.current) return
      const e = evt as L.LeafletMouseEvent
      const bounds = L.latLngBounds(startRef.current, e.latlng)
      const ne = bounds.getNorthEast()
      const sw = bounds.getSouthWest()
      setBbox({ north: ne.lat, south: sw.lat, east: ne.lng, west: sw.lng })
      startRef.current = null
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (seleccionando) {
      map.dragging.disable()
      map.getContainer().style.cursor = 'crosshair'
    } else {
      map.dragging.enable()
      map.getContainer().style.cursor = ''
    }
  }, [seleccionando])

  function cancelarSeleccion() {
    setSeleccionando(false)
    setBbox(null)
    rectRef.current?.remove()
    rectRef.current = null
  }

  async function descargarZona() {
    if (!bbox || descargando) return
    const tilesList = generarTiles(bbox, ZOOM_MIN, ZOOM_MAX, URL_TEMPLATE)
    setTotalTilesDesc(tilesList.length)
    setDescargando(true)
    setProgreso(0)

    let descargados = 0
    const CONCURRENCIA = 6

    for (let i = 0; i < tilesList.length; i += CONCURRENCIA) {
      const lote = tilesList.slice(i, i + CONCURRENCIA)
      await Promise.all(lote.map(async tileInfo => {
        try {
          const blob = await downloadTile(tileInfo.url)
          await saveTile(tileInfo, blob)
        } catch { /* tile fallido — continuar */ }
        descargados++
        setProgreso(Math.round((descargados / tilesList.length) * 100))
      }))
    }

    const zona: ZonaGuardada = {
      id: Date.now().toString(),
      nombre: nombreNueva.trim() || `Zona ${zonas.length + 1}`,
      bbox,
      tiles: tilesList.length,
      mb: estimarMB(tilesList.length),
      fecha: Date.now(),
    }
    const nuevas = [zona, ...zonas]
    saveZonas(nuevas)
    setZonas(nuevas)
    setDescargando(false)
    setNombreNueva('')
    cancelarSeleccion()
  }

  async function eliminarZona(id: string) {
    const zona = zonas.find(z => z.id === id)
    if (!zona) return
    const tilesList = generarTiles(zona.bbox, ZOOM_MIN, ZOOM_MAX, URL_TEMPLATE)
    await Promise.all(tilesList.map(t => removeTile(t.key).catch(() => {})))
    const restantes = zonas.filter(z => z.id !== id)
    saveZonas(restantes)
    setZonas(restantes)
  }

  return (
    <div className="flex flex-col h-full bg-[#0B1928]">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-3 shrink-0">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1 -ml-1"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/>
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-slate-100">Mapas offline</h1>
        <span className="ml-auto text-[11px] text-slate-500">{tilesEnStorage} tiles guardados</span>
      </div>

      {/* Mapa */}
      <div className="relative flex-1 min-h-0">
        <LeafletMapa
          center={[-34.45, -58.75]}
          zoom={10}
          className="w-full h-full"
          onMapReady={handleMapReady}
        />

        {seleccionando && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-black/70 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
            Arrastrá para seleccionar la zona
          </div>
        )}

        {!seleccionando && !bbox && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex gap-2">
            <button
              onClick={() => {
                if (!navigator.geolocation) return
                navigator.geolocation.getCurrentPosition(pos => {
                  const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude]
                  mapRef.current?.setView(latlng, 14, { animate: true })
                  L.circleMarker(latlng, {
                    radius: 7, color: '#fff', weight: 2,
                    fillColor: '#00D1BD', fillOpacity: 1,
                  }).addTo(mapRef.current!).bindPopup('Estás aquí').openPopup()
                })
              }}
              title="Mi posición"
              className="w-10 h-10 rounded-full bg-black/70 flex items-center justify-center text-slate-300 hover:text-teal-400 shadow-lg transition-colors"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
              </svg>
            </button>
            <button
              onClick={() => setSeleccionando(true)}
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-900 shadow-lg"
              style={{ background: 'linear-gradient(135deg,#00D1BD,#00967F)' }}
            >
              Seleccionar zona
            </button>
          </div>
        )}

        {seleccionando && (
          <button
            onClick={cancelarSeleccion}
            className="absolute bottom-4 right-4 z-[1000] px-4 py-2 rounded-full text-xs font-semibold bg-slate-700 text-slate-200"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Panel confirmación descarga */}
      {bbox && !seleccionando && !descargando && (
        <div className="shrink-0 px-4 py-4 border-t border-white/[0.07] bg-[#0E1F38] flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Zona seleccionada</span>
            <span className="text-slate-300 font-mono">
              ~{tilesEstimados.toLocaleString()} tiles · {mbEstimados < 1 ? '<1' : Math.round(mbEstimados)} MB
            </span>
          </div>
          <input
            type="text"
            placeholder="Nombre de la zona (opcional)"
            value={nombreNueva}
            onChange={e => setNombreNueva(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-teal-500/50"
          />
          <div className="flex gap-2">
            <button
              onClick={cancelarSeleccion}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-white/[0.07]"
            >
              Cancelar
            </button>
            <button
              onClick={descargarZona}
              disabled={tilesEstimados > 5000}
              className="flex-[2] py-2.5 rounded-xl text-sm font-semibold text-slate-900 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#00D1BD,#00967F)' }}
            >
              {tilesEstimados > 5000
                ? `Zona muy grande (${Math.round(mbEstimados)} MB)`
                : `Descargar (~${mbEstimados < 1 ? '<1' : Math.round(mbEstimados)} MB)`}
            </button>
          </div>
        </div>
      )}

      {/* Progreso */}
      {descargando && (
        <div className="shrink-0 px-4 py-5 border-t border-white/[0.07] bg-[#0E1F38] flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">Descargando…</span>
            <span className="text-teal-400 font-mono">{progreso}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progreso}%`, background: 'linear-gradient(90deg,#00D1BD,#00967F)' }}
            />
          </div>
          <p className="text-[11px] text-slate-500 text-center">
            {Math.round(progreso * totalTilesDesc / 100)}/{totalTilesDesc} tiles
          </p>
        </div>
      )}

      {/* Lista de zonas */}
      {zonas.length > 0 && !bbox && !descargando && (
        <div className="shrink-0 max-h-52 overflow-y-auto border-t border-white/[0.07]">
          {zonas.map(z => (
            <div key={z.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
              <div className="text-teal-400 shrink-0">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{z.nombre}</p>
                <p className="text-[11px] text-slate-500">
                  {z.tiles.toLocaleString()} tiles · ~{Math.round(z.mb)} MB
                </p>
              </div>
              <button
                onClick={() => eliminarZona(z.id)}
                className="text-slate-600 hover:text-red-400 transition-colors p-1 shrink-0"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
