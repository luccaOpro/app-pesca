import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { LeafletMapa } from '../components/LeafletMapa'
import { useGPS } from '../hooks/useGPS'
import { useTracker } from '../hooks/useTracker'
import { saveTrack, formatDuracion, type Track } from '../lib/tracks'
import { getSpots, saveSpot, deleteSpot, type Spot, type TipoSpot, TIPOS_SPOT } from '../lib/spots'
import { getCapturas, type Captura } from '../lib/capturas'

// ─────────────────────────────────────────────────────────────
//  Iconos Leaflet
// ─────────────────────────────────────────────────────────────

function crearIconoBarco(heading: number | null): L.DivIcon {
  const rot = heading ?? 0
  return L.divIcon({
    className: '',
    iconAnchor: [18, 18],
    iconSize:   [36, 36],
    html: `
      <div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;
                  transform:rotate(${rot}deg);transition:transform 0.5s ease;">
        <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="sh"><feDropShadow dx="0" dy="1" stdDeviation="2"
              flood-color="#000" flood-opacity="0.6"/></filter>
          </defs>
          <path d="M12 2 L6.5 19 Q12 23.5 17.5 19 Z"
                fill="#00D1BD" stroke="rgba(255,255,255,0.9)" stroke-width="1.2"
                filter="url(#sh)"/>
          <line x1="12" y1="4.5" x2="12" y2="18"
                stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/>
        </svg>
      </div>`,
  })
}

function crearIconoPorTipo(tipo: TipoSpot): L.DivIcon {
  const cfg = TIPOS_SPOT[tipo]
  // unique filter id per type to avoid SVG filter conflicts
  const fid = `sp_${tipo}`
  return L.divIcon({
    className: '',
    iconAnchor: [14, 36],
    iconSize:   [28, 36],
    html: `
      <div style="position:relative;width:28px;height:36px">
        <svg viewBox="0 0 28 36" width="28" height="36" xmlns="http://www.w3.org/2000/svg">
          <defs><filter id="${fid}"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5"
            flood-color="#000" flood-opacity="0.5"/></filter></defs>
          <path d="M14 1C9.03 1 4.5 5.03 4.5 10.5c0 7 9.5 20 9.5 20s9.5-13 9.5-20C23.5 5.03 18.97 1 14 1z"
                fill="${cfg.color}" stroke="#fff" stroke-width="1.5" filter="url(#${fid})"/>
        </svg>
        <div style="position:absolute;top:2px;left:0;width:28px;
                    text-align:center;font-size:13px;line-height:1;
                    filter:drop-shadow(0 1px 1px rgba(0,0,0,0.4))">${cfg.emoji}</div>
      </div>`,
  })
}

function crearIconoCaptura(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconAnchor: [13, 13],
    iconSize:   [26, 26],
    html: `
      <svg viewBox="0 0 26 26" width="26" height="26" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="fcap"><feDropShadow dx="0" dy="1" stdDeviation="1.2"
          flood-color="#000" flood-opacity="0.45"/></filter></defs>
        <circle cx="13" cy="13" r="11"
                fill="#F59E0B" stroke="#fff" stroke-width="1.5" filter="url(#fcap)"/>
        <!-- pez -->
        <path d="M6 13 C 6 11, 9 9.5, 13 9.5 C 17 9.5, 19.5 11, 19.5 13
                 C 19.5 15, 17 16.5, 13 16.5 C 9 16.5, 6 15, 6 13 Z
                 M 19.5 13 L 22 11 L 22 15 Z"
              fill="white"/>
        <circle cx="16.5" cy="12.5" r="0.9" fill="#7c2d12"/>
      </svg>`,
  })
}

function crearIconoMOB(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconAnchor: [22, 22],
    iconSize:   [44, 44],
    html: `
      <svg viewBox="0 0 44 44" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="mob"><feDropShadow dx="0" dy="2" stdDeviation="3"
          flood-color="#ef4444" flood-opacity="0.5"/></filter></defs>
        <!-- Anillo pulsante -->
        <circle cx="22" cy="22" r="20" fill="rgba(239,68,68,0.18)"
                stroke="#ef4444" stroke-width="1.5" filter="url(#mob)"/>
        <!-- Punto central -->
        <circle cx="22" cy="22" r="11" fill="#ef4444" stroke="#fff" stroke-width="2"/>
        <text x="22" y="26" text-anchor="middle" fill="white"
              font-size="8.5" font-weight="900" font-family="system-ui">MOB</text>
      </svg>`,
  })
}

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

function useReloj(): string {
  const fmt = () =>
    new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  const [hora, setHora] = useState(fmt)
  useEffect(() => {
    const t = setInterval(() => setHora(fmt()), 1000)
    return () => clearInterval(t)
  }, [])
  return hora
}

function cog(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  return dirs[Math.round(deg / 45) % 8]
}

// ─────────────────────────────────────────────────────────────
//  Sub-componentes UI
// ─────────────────────────────────────────────────────────────

function Inst({
  label, main, unit, sub, dim,
}: {
  label: string; main: string; unit?: string; sub?: string; dim?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center py-2.5 px-1">
      <p className="text-[8px] font-semibold tracking-[0.14em] text-slate-600 uppercase mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-[19px] font-mono tabular-nums leading-none ${dim ? 'text-slate-600' : 'text-slate-100'}`}>
          {main}
        </span>
        {unit && <span className="text-[10px] text-slate-500 mb-0.5 ml-0.5">{unit}</span>}
      </div>
      {sub && <p className="text-[10px] text-teal-400 font-semibold leading-none mt-0.5">{sub}</p>}
    </div>
  )
}

/** Rosa de los vientos — gira para mostrar dónde queda el Norte en track-up */
function RosaVientos({ zoom, bearing }: { zoom: number; bearing: number }) {
  // bearing = ángulo del mapa; el Norte está a -bearing desde arriba de pantalla
  return (
    <div className="pointer-events-none select-none">
      <svg
        width="62" height="62" viewBox="0 0 62 62"
        style={{ transform: `rotate(${-bearing}deg)`, transition: 'transform 0.5s ease' }}
      >
        <circle cx="31" cy="31" r="29"
                fill="rgba(6,14,28,0.80)" stroke="rgba(255,255,255,0.10)" strokeWidth="1"/>
        {/* Ticks diagonales */}
        {[45, 135, 225, 315].map(a => {
          const rad = (a - 90) * Math.PI / 180
          return (
            <line key={a}
              x1={31 + 20 * Math.cos(rad)} y1={31 + 20 * Math.sin(rad)}
              x2={31 + 26 * Math.cos(rad)} y2={31 + 26 * Math.sin(rad)}
              stroke="rgba(255,255,255,0.15)" strokeWidth="1"
            />
          )
        })}
        {/* Aguja Norte (teal) */}
        <polygon points="31,6 28,31 31,28 34,31" fill="#00D1BD"/>
        {/* Aguja Sur (gris) */}
        <polygon points="31,56 28,31 31,34 34,31" fill="rgba(255,255,255,0.22)"/>
        {/* Centro */}
        <circle cx="31" cy="31" r="2.5" fill="#060E1C" stroke="#00D1BD" strokeWidth="1.2"/>
        {/* Letras */}
        <text x="31" y="19.5" textAnchor="middle" fill="#00D1BD"
              fontSize="8.5" fontWeight="700" fontFamily="system-ui">N</text>
        <text x="31" y="53"   textAnchor="middle" fill="rgba(255,255,255,0.38)"
              fontSize="7.5"  fontWeight="600" fontFamily="system-ui">S</text>
        <text x="51" y="34.5" textAnchor="middle" fill="rgba(255,255,255,0.38)"
              fontSize="7.5"  fontWeight="600" fontFamily="system-ui">E</text>
        <text x="11" y="34.5" textAnchor="middle" fill="rgba(255,255,255,0.38)"
              fontSize="7.5"  fontWeight="600" fontFamily="system-ui">O</text>
      </svg>
      <p className="text-center text-[9px] font-mono text-slate-600 -mt-1">Z{zoom}</p>
    </div>
  )
}

/** Mini brújula con aguja para la celda RUMBO */
function MiniCompass({ heading }: { heading: number }) {
  const rad = (heading - 90) * Math.PI / 180
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="mt-0.5">
      <circle cx="14" cy="14" r="12" fill="none"
              stroke="rgba(255,255,255,0.08)" strokeWidth="1.2"/>
      <line x1="14" y1="3" x2="14" y2="6" stroke="#00D1BD" strokeWidth="1.2"/>
      <line x1="14" y1="14"
            x2={14 + 8 * Math.cos(rad)} y2={14 + 8 * Math.sin(rad)}
            stroke="#00D1BD" strokeWidth="2" strokeLinecap="round"
            style={{ transition: 'all 0.5s ease' }}/>
      <circle cx="14" cy="14" r="2" fill="#00D1BD"/>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
//  Componente principal
// ─────────────────────────────────────────────────────────────

interface Props {
  onTrackGuardado?: (track: Track) => void
}

export function MapaNautico({ onTrackGuardado }: Props) {
  const [grabando, setGrabando]       = useState(false)
  const [seamark, setSeamark]         = useState(false)
  const [trackUp, setTrackUp]         = useState(false)
  const [spots, setSpots]             = useState<Spot[]>(() => getSpots())
  const [capturas, setCapturas]       = useState<Captura[]>(() => getCapturas())
  const [mostrarCapturas, setMostrarCapturas] = useState(true)
  const [nuevoSpot, setNuevoSpot]     = useState<{ latlng: L.LatLng; nombre: string; tipo: TipoSpot } | null>(null)
  const [mapReady, setMapReady]       = useState(false)
  const [zoom, setZoom]               = useState(13)
  const [bearing, setBearingState]    = useState(0)  // bearing actual del mapa
  const [mobActivo, setMobActivo]     = useState(false)

  const hora    = useReloj()
  const gps     = useGPS(true)
  const tracker = useTracker(grabando)

  const mapRef           = useRef<L.Map | null>(null)
  const barcoRef         = useRef<L.Marker | null>(null)
  const breadcrumbRef    = useRef<L.Polyline | null>(null)
  const breadcrumbPtsRef = useRef<[number, number][]>([])
  const lineaRef         = useRef<L.Polyline | null>(null)
  const centradoRef      = useRef(false)
  const seamarkRef       = useRef<L.TileLayer | null>(null)
  const tentativoRef     = useRef<L.Marker | null>(null)
  const spotMarkersRef    = useRef<Map<string, L.Marker>>(new Map())
  const capturaMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const longPressRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mobMarkerRef      = useRef<L.Marker | null>(null)

  // ── Map ready ────────────────────────────────────────────────────────────
  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map
    setMapReady(true)

    L.control.scale({ imperial: false, metric: true, position: 'bottomleft' }).addTo(map)

    map.on('zoomend', () => setZoom(map.getZoom()))

    // Long-press → nuevo spot
    // contextmenu fires on: right-click (desktop) + long-press (Android WebView)
    map.on('contextmenu', (e: L.LeafletEvent) => {
      const me = e as L.LeafletMouseEvent
      if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null }
      tentativoRef.current?.remove()
      tentativoRef.current = L.marker(me.latlng, { icon: crearIconoPorTipo('buen_lugar') }).addTo(map)
      setNuevoSpot({ latlng: me.latlng, nombre: '', tipo: 'buen_lugar' })
    })
    // mousedown fallback for browsers that don't fire contextmenu on long-press
    map.on('mousedown', (e: L.LeafletEvent) => {
      const me = e as L.LeafletMouseEvent
      longPressRef.current = setTimeout(() => {
        tentativoRef.current?.remove()
        tentativoRef.current = L.marker(me.latlng, { icon: crearIconoPorTipo('buen_lugar') }).addTo(map)
        setNuevoSpot({ latlng: me.latlng, nombre: '', tipo: 'buen_lugar' })
      }, 700)
    })
    map.on('mouseup mousemove', () => {
      if (longPressRef.current) {
        clearTimeout(longPressRef.current)
        longPressRef.current = null
      }
    })
  }, [])

  // ── Actualizar icono tentativo cuando cambia el tipo ─────────────────────
  useEffect(() => {
    if (!nuevoSpot || !tentativoRef.current) return
    tentativoRef.current.setIcon(crearIconoPorTipo(nuevoSpot.tipo))
  }, [nuevoSpot?.tipo])

  // ── GPS + barco + breadcrumb ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    const pos = gps.posicion
    if (!map || !pos) return

    const latlng: [number, number] = [pos.lat, pos.lon]

    // Barco
    if (!barcoRef.current) {
      barcoRef.current = L.marker(latlng, {
        icon: crearIconoBarco(pos.heading), zIndexOffset: 1000,
      }).addTo(map)
    } else {
      barcoRef.current.setLatLng(latlng)
      barcoRef.current.setIcon(crearIconoBarco(pos.heading))
    }

    // Breadcrumb siempre activo
    const last  = breadcrumbPtsRef.current.at(-1)
    const moved = !last ||
      Math.abs(last[0] - latlng[0]) > 0.00002 ||
      Math.abs(last[1] - latlng[1]) > 0.00002
    if (moved) {
      breadcrumbPtsRef.current = [...breadcrumbPtsRef.current, latlng]
      if (!breadcrumbRef.current) {
        breadcrumbRef.current = L.polyline([latlng], {
          color: '#00D1BD', weight: 2, opacity: 0.3, dashArray: '3 9',
        }).addTo(map)
      } else {
        breadcrumbRef.current.setLatLngs(breadcrumbPtsRef.current)
      }
    }

    // Auto-centrar
    if (!centradoRef.current || grabando) {
      map.panTo(latlng, { animate: true, duration: 0.6 })
      centradoRef.current = true
    }
  }, [gps.posicion, grabando])

  // ── Track-up: rotar el mapa con el heading ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    const pos = gps.posicion
    if (!map) return

    const newBearing = (trackUp && pos?.heading != null) ? pos.heading : 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(map as any).setBearing?.(newBearing)
    setBearingState(newBearing)
  }, [trackUp, gps.posicion])

  // ── Polyline de grabación ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!grabando) { lineaRef.current?.remove(); lineaRef.current = null; return }
    if (tracker.puntos.length < 2) return
    const pts = tracker.puntos.map(p => [p.lat, p.lon] as [number, number])
    if (!lineaRef.current) {
      lineaRef.current = L.polyline(pts, { color: '#00D1BD', weight: 4, opacity: 0.9 }).addTo(map)
    } else {
      lineaRef.current.setLatLngs(pts)
    }
  }, [grabando, tracker.puntos])

  // ── Spot markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    spotMarkersRef.current.forEach(m => m.remove())
    spotMarkersRef.current.clear()

    spots.forEach(spot => {
      const cfg = TIPOS_SPOT[spot.tipo]
      const marker = L.marker([spot.lat, spot.lon], { icon: crearIconoPorTipo(spot.tipo) })
        .addTo(map)
        .bindPopup(`
          <div style="text-align:center;min-width:140px;font-family:system-ui">
            <p style="font-size:11px;margin:0 0 3px;color:${cfg.color};font-weight:600">
              ${cfg.emoji} ${cfg.label}</p>
            <p style="font-weight:700;margin:0 0 2px;font-size:14px;color:#f1f5f9">${spot.nombre}</p>
            <p style="font-size:11px;color:#94a3b8;margin:0 0 8px">
              ${spot.lat.toFixed(5)}, ${spot.lon.toFixed(5)}</p>
            <button id="del-${spot.id}"
              style="background:#ef4444;color:#fff;border:none;padding:5px 14px;
                     border-radius:8px;cursor:pointer;font-size:12px;font-weight:600">
              Eliminar spot</button>
          </div>`, { className: 'popup-pesca' })
        .on('popupopen', () => {
          setTimeout(() => {
            document.getElementById(`del-${spot.id}`)?.addEventListener('click', () => {
              marker.closePopup()
              deleteSpot(spot.id)
              setSpots(getSpots())
            })
          }, 50)
        })
      spotMarkersRef.current.set(spot.id, marker)
    })
  }, [spots, mapReady])

  // ── Marcadores de capturas ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    capturaMarkersRef.current.forEach(m => m.remove())
    capturaMarkersRef.current.clear()
    if (!mostrarCapturas) return

    capturas.forEach(c => {
      if (c.lat == null || c.lon == null) return
      const fecha = new Date(c.fecha).toLocaleDateString('es-AR', {
        day: 'numeric', month: 'short',
      })
      const tamano = [
        c.longitud_cm != null ? `${c.longitud_cm} cm` : null,
        c.peso_kg     != null ? `${c.peso_kg} kg`     : null,
      ].filter(Boolean).join(' · ')

      const marker = L.marker([c.lat, c.lon], { icon: crearIconoCaptura(), zIndexOffset: 500 })
        .addTo(map)
        .bindPopup(`
          <div style="text-align:center;min-width:140px;font-family:system-ui">
            <p style="font-weight:700;margin:0 0 2px;font-size:14px;color:#FBBF24">🎣 ${c.especie}</p>
            ${tamano ? `<p style="font-size:11px;color:#cbd5e1;margin:2px 0">${tamano}</p>` : ''}
            <p style="font-size:10px;color:#94a3b8;margin:2px 0">${fecha}</p>
            ${c.notas ? `<p style="font-size:10px;color:#94a3b8;margin:6px 0 0;font-style:italic">"${c.notas}"</p>` : ''}
          </div>`, { className: 'popup-pesca' })
      capturaMarkersRef.current.set(c.id, marker)
    })
  }, [capturas, mapReady, mostrarCapturas])

  // Refrescar capturas cada vez que el componente se enfoca (visibilitychange)
  useEffect(() => {
    function refresh() { setCapturas(getCapturas()); setSpots(getSpots()) }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  // ── OpenSeaMap ────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    if (seamark) {
      seamarkRef.current = L.tileLayer(
        'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
        { opacity: 0.85, attribution: '© OpenSeaMap' }
      ).addTo(map)
    } else {
      seamarkRef.current?.remove()
      seamarkRef.current = null
    }
  }, [seamark, mapReady])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function iniciarGrabacion() { centradoRef.current = false; setGrabando(true) }

  function detenerGrabacion() {
    setGrabando(false)
    if (tracker.puntos.length >= 2) {
      const track: Track = {
        id: Date.now().toString(),
        nombre: `Salida ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`,
        fecha: Date.now(),
        puntos: tracker.puntos,
        distancia_nm: tracker.distancia_nm,
        duracion_s: tracker.duracion_s,
      }
      saveTrack(track)
      onTrackGuardado?.(track)
    }
  }

  function confirmarSpot() {
    if (!nuevoSpot) return
    const cfg = TIPOS_SPOT[nuevoSpot.tipo]
    saveSpot({
      id:     Date.now().toString(),
      nombre: nuevoSpot.nombre.trim() || cfg.label,
      tipo:   nuevoSpot.tipo,
      lat:    nuevoSpot.latlng.lat,
      lon:    nuevoSpot.latlng.lng,
      fecha:  Date.now(),
    })
    setSpots(getSpots())
    tentativoRef.current?.remove(); tentativoRef.current = null
    setNuevoSpot(null)
  }

  function cancelarSpot() {
    tentativoRef.current?.remove(); tentativoRef.current = null
    setNuevoSpot(null)
  }

  function centrarEnPosicion() {
    const pos = gps.posicion
    if (pos && mapRef.current) mapRef.current.panTo([pos.lat, pos.lon], { animate: true })
  }

  function toggleMOB() {
    const map  = mapRef.current
    const pos  = gps.posicion
    if (!map) return

    if (mobActivo) {
      // Desactivar MOB
      mobMarkerRef.current?.remove()
      mobMarkerRef.current = null
      setMobActivo(false)
    } else {
      // Activar MOB en posición actual (o centro del mapa)
      const latlng = pos ? [pos.lat, pos.lon] as [number, number] : map.getCenter()
      mobMarkerRef.current?.remove()
      mobMarkerRef.current = L.marker(latlng, { icon: crearIconoMOB(), zIndexOffset: 2000 })
        .addTo(map)
        .bindPopup('<b style="color:#ef4444;font-family:system-ui">⚠ HOMBRE AL AGUA</b><br/>' +
          `<span style="font-size:11px;color:#94a3b8">${Array.isArray(latlng)
            ? `${(latlng as [number,number])[0].toFixed(5)}, ${(latlng as [number,number])[1].toFixed(5)}`
            : `${map.getCenter().lat.toFixed(5)}, ${map.getCenter().lng.toFixed(5)}`}</span>`)
        .openPopup()
      map.panTo(latlng)
      setMobActivo(true)
    }
  }

  const hayGPS = !!gps.posicion
  const pos    = gps.posicion

  // ─────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#060E1C]">

      {/* ── Mapa ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative">
        <LeafletMapa
          center={[-34.55, -58.55]}
          zoom={13}
          className="w-full h-full"
          onMapReady={handleMapReady}
        />

        {/* Chip GPS — arriba izquierda (respeta status bar) */}
        <div
          className="absolute left-3 z-[1000]"
          style={{ top: 'calc(var(--safe-top) + 0.75rem)' }}
        >
          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-full px-2.5 py-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              hayGPS    ? 'bg-teal-400 animate-pulse' :
              gps.error ? 'bg-red-500' :
                          'bg-amber-400 animate-pulse'
            }`} />
            {hayGPS ? (
              <>
                <span className="text-[11px] font-mono text-slate-300">±{Math.round(pos!.precision_m)} m</span>
                <span className="text-[10px] text-slate-500">
                  {pos!.lat.toFixed(4)}, {pos!.lon.toFixed(4)}
                </span>
              </>
            ) : (
              <span className="text-[11px] text-slate-400">
                {gps.error ? 'Sin GPS' : 'Buscando señal…'}
              </span>
            )}
          </div>
        </div>

        {/* Badge REC */}
        {grabando && (
          <div
            className="absolute left-1/2 -translate-x-1/2 z-[1000]"
            style={{ top: 'calc(var(--safe-top) + 0.75rem)' }}
          >
            <div className="flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0"/>
              <span className="text-[11px] font-semibold text-white tracking-wide">REC</span>
            </div>
          </div>
        )}

        {/* Botones derecha */}
        <div
          className="absolute right-3 z-[1000] flex flex-col gap-2"
          style={{ top: 'calc(var(--safe-top) + 0.75rem)' }}
        >

          {/* Centrar — siempre visible */}
          <button
            onClick={centrarEnPosicion}
            disabled={!hayGPS}
            className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${
              hayGPS ? 'bg-black/70 text-slate-300 hover:text-teal-400' : 'bg-black/40 text-slate-700 cursor-not-allowed'
            }`}
            title="Centrar en mi posición"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
            </svg>
          </button>

          {/* Track-up */}
          <button
            onClick={() => setTrackUp(t => !t)}
            disabled={!hayGPS}
            className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${
              trackUp
                ? 'bg-teal-500 text-slate-900'
                : hayGPS
                  ? 'bg-black/70 text-slate-300 hover:text-teal-400'
                  : 'bg-black/40 text-slate-700 cursor-not-allowed'
            }`}
            title={trackUp ? 'Norte arriba' : 'Rumbo arriba'}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </button>

          {/* Capa náutica */}
          <button
            onClick={() => setSeamark(s => !s)}
            className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${
              seamark ? 'bg-teal-500 text-slate-900' : 'bg-black/70 text-slate-300 hover:text-teal-400'
            }`}
            title="Capa náutica"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none"
                 stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l1.5-9L12 3l7.5 5L21 17"/>
              <path d="M3 17c0 0 3-2 9-2s9 2 9 2"/>
              <path d="M12 3v14"/>
            </svg>
          </button>

          {/* Toggle capturas */}
          {capturas.some(c => c.lat != null) && (
            <button
              onClick={() => setMostrarCapturas(v => !v)}
              className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${
                mostrarCapturas
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-black/70 text-slate-400 hover:text-amber-400'
              }`}
              title={mostrarCapturas ? 'Ocultar capturas' : 'Mostrar capturas'}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                   strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 12c0 0-1.5-6 5-6s10 6 10 6-4.5 6-10 6-5-6-5-6z"/>
                <path d="M2 9c1 1 2.5 3 2.5 3S3 14 2 15"/>
                <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </button>
          )}

          {/* Spots count */}
          {spots.length > 0 && (
            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 backdrop-blur-sm flex items-center justify-center"
                 title={`${spots.length} spots`}>
              <span className="text-[11px] font-bold text-amber-400">{spots.length}</span>
            </div>
          )}
        </div>

        {/* Botones de zoom — izquierda centro */}
        <div className="absolute top-1/2 -translate-y-1/2 right-3 mt-24 z-[1000] flex flex-col gap-1.5">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-sm flex items-center justify-center text-slate-300 hover:text-teal-400 text-xl font-light leading-none transition-colors"
          >+</button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-sm flex items-center justify-center text-slate-300 hover:text-teal-400 text-xl font-light leading-none transition-colors"
          >−</button>
        </div>

        {/* Botón MOB — esquina inferior izquierda */}
        <div className="absolute bottom-14 left-3 z-[1000]">
          <button
            onClick={toggleMOB}
            className={`h-12 px-4 rounded-2xl backdrop-blur-sm font-bold text-[13px] tracking-wider transition-all flex items-center gap-2 ${
              mobActivo
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-black/70 text-red-400 border border-red-500/40 hover:bg-red-500/20'
            }`}
            title="Hombre al agua"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                 stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="5" r="2"/>
              <path d="M12 7v7"/>
              <path d="M9 10l3 2 3-2"/>
              <path d="M9 21c1-2 3-3 3-3s2 1 3 3"/>
              <path d="M3 18c0 0 3-2 9-2s9 2 9 2"/>
            </svg>
            {mobActivo ? 'CANCELAR MOB' : 'MOB'}
          </button>
        </div>

        {/* Rosa de los vientos — esquina inferior derecha */}
        <div className="absolute bottom-14 right-3 z-[1000]">
          <RosaVientos zoom={zoom} bearing={bearing} />
        </div>
      </div>

      {/* ── Panel: guardar spot ───────────────────────────────── */}
      {nuevoSpot && (
        <div className="shrink-0 bg-[#0B1928]/98 border-t border-white/[0.07] px-4 pt-3 pb-4 flex flex-col gap-2.5">

          {/* Encabezado */}
          <div className="flex items-center gap-2">
            <span style={{ color: TIPOS_SPOT[nuevoSpot.tipo].color }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 16 8 16s8-10.5 8-16c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
              </svg>
            </span>
            <p className="text-sm font-semibold text-slate-200">Nuevo spot</p>
            <span className="text-[10px] text-slate-600 ml-auto font-mono">
              {nuevoSpot.latlng.lat.toFixed(5)}, {nuevoSpot.latlng.lng.toFixed(5)}
            </span>
          </div>

          {/* Selector de tipo — grid 3×2 */}
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(TIPOS_SPOT) as TipoSpot[]).map(tipo => {
              const cfg = TIPOS_SPOT[tipo]
              const sel = nuevoSpot.tipo === tipo
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setNuevoSpot(s => s ? { ...s, tipo } : s)}
                  className="flex items-center gap-1.5 px-2 py-2 rounded-xl text-xs font-medium transition-all border"
                  style={sel ? {
                    background:   `${cfg.color}22`,
                    borderColor:  `${cfg.color}66`,
                    color:         cfg.color,
                  } : {
                    background:   'rgba(255,255,255,0.03)',
                    borderColor:  'rgba(255,255,255,0.07)',
                    color:        '#64748b',
                  }}
                >
                  <span className="text-base leading-none">{cfg.emoji}</span>
                  <span className="leading-tight">{cfg.label}</span>
                </button>
              )
            })}
          </div>

          {/* Nombre (opcional) */}
          <input
            type="text"
            placeholder={`Nombre (opcional)`}
            value={nuevoSpot.nombre}
            onChange={e => setNuevoSpot(s => s ? { ...s, nombre: e.target.value } : s)}
            onKeyDown={e => e.key === 'Enter' && confirmarSpot()}
            className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-teal-500/50"
          />

          {/* Acciones */}
          <div className="flex gap-2">
            <button onClick={cancelarSpot}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-white/[0.07]">
              Cancelar
            </button>
            <button
              onClick={confirmarSpot}
              className="flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: `linear-gradient(135deg,${TIPOS_SPOT[nuevoSpot.tipo].color},${TIPOS_SPOT[nuevoSpot.tipo].color}aa)` }}
            >
              {TIPOS_SPOT[nuevoSpot.tipo].emoji} Guardar spot
            </button>
          </div>
        </div>
      )}

      {/* ── Panel: instrumentos ───────────────────────────────── */}
      {!nuevoSpot && (
        <div className="shrink-0 bg-[#060E1C] border-t border-white/[0.06]">

          {/* Grid instrumentos */}
          <div className="grid grid-cols-3 divide-x divide-white/[0.06]">

            {/* HORA */}
            <Inst label="Hora" main={hora} />

            {/* VELOCIDAD / DISTANCIA */}
            {grabando ? (
              <Inst label="Distancia" main={tracker.distancia_nm.toFixed(2)} unit="mn" />
            ) : (
              <Inst
                label="Velocidad"
                main={hayGPS ? pos!.velocidad_kts.toFixed(1) : '—'}
                unit={hayGPS ? 'kt' : undefined}
                dim={!hayGPS}
              />
            )}

            {/* RUMBO / TIEMPO */}
            {grabando ? (
              <Inst label="Tiempo" main={formatDuracion(tracker.duracion_s)} />
            ) : (
              <div className="flex flex-col items-center justify-center py-2.5 px-1">
                <p className="text-[8px] font-semibold tracking-[0.14em] text-slate-600 uppercase mb-0.5">
                  Rumbo
                </p>
                {hayGPS && pos!.heading != null ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[19px] font-mono tabular-nums leading-none text-slate-100">
                        {Math.round(pos!.heading)}°
                      </span>
                      <span className="text-[13px] font-bold text-teal-400 leading-none">
                        {cog(pos!.heading)}
                      </span>
                    </div>
                    <MiniCompass heading={pos!.heading} />
                  </>
                ) : (
                  <span className="text-[19px] font-mono tabular-nums leading-none text-slate-600">—</span>
                )}
              </div>
            )}
          </div>

          {/* Sub-row cuando graba: vel + rumbo */}
          {grabando && hayGPS && (
            <div className="grid grid-cols-2 divide-x divide-white/[0.06] border-t border-white/[0.06]">
              <div className="flex items-center justify-center gap-2 py-1.5">
                <span className="text-[8px] tracking-widest text-slate-600 uppercase">Vel</span>
                <span className="text-[13px] font-mono text-slate-400 tabular-nums">
                  {pos!.velocidad_kts.toFixed(1)} kt
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 py-1.5">
                {pos!.heading != null ? (
                  <>
                    <span className="text-[8px] tracking-widest text-slate-600 uppercase">Rumbo</span>
                    <span className="text-[13px] font-mono text-slate-400 tabular-nums">
                      {Math.round(pos!.heading)}° {cog(pos!.heading)}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-slate-700">sin rumbo</span>
                )}
              </div>
            </div>
          )}

          {/* Posición exacta */}
          {hayGPS && !grabando && (
            <div className="flex items-center justify-center gap-3 py-1 border-t border-white/[0.05]">
              <span className="text-[10px] font-mono text-slate-600 tabular-nums">
                {pos!.lat >= 0 ? '+' : ''}{pos!.lat.toFixed(5)}°
              </span>
              <span className="text-[10px] text-slate-700">/</span>
              <span className="text-[10px] font-mono text-slate-600 tabular-nums">
                {pos!.lon >= 0 ? '+' : ''}{pos!.lon.toFixed(5)}°
              </span>
              <span className="text-[10px] text-slate-700">±{Math.round(pos!.precision_m)} m</span>
            </div>
          )}

          {/* CTA */}
          <div className="px-4 pt-2 pb-3">
            {grabando ? (
              <button
                onClick={detenerGrabacion}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-white
                           border border-red-500/50 bg-red-500/15 active:opacity-70
                           flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                </svg>
                Detener grabación
              </button>
            ) : (
              <button
                onClick={iniciarGrabacion}
                disabled={!hayGPS}
                className="w-full py-3 rounded-2xl text-sm font-semibold
                           disabled:opacity-35 active:opacity-75
                           flex items-center justify-center gap-2"
                style={{
                  background: hayGPS ? 'linear-gradient(135deg,#00D1BD 0%,#00967F 100%)' : '#1e293b',
                  color: hayGPS ? '#0B1928' : '#64748b',
                }}
              >
                {!hayGPS ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"/>
                    {gps.error ? 'GPS no disponible' : 'Buscando GPS…'}
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                      <circle cx="12" cy="12" r="8"/>
                    </svg>
                    Iniciar grabación
                  </>
                )}
              </button>
            )}
          </div>

          {!grabando && (
            <p className="text-center text-[10px] text-slate-700 pb-2 -mt-1">
              Mantené presionado el mapa para guardar un spot
            </p>
          )}
        </div>
      )}
    </div>
  )
}
