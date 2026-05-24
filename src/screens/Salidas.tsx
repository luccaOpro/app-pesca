import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { AppHeader } from '../components/AppHeader'
import { getTracks, deleteTrack, exportTrackGPX, formatDuracion, formatFechaTrack, type Track } from '../lib/tracks'
import { getCapturas, saveCaptura, deleteCaptura, statsCapturas, ESPECIES_COMUNES, type Captura } from '../lib/capturas'
import { MapasOffline } from './MapasOffline'

type PantallaVista = 'lista' | 'mapas'
type SubTab = 'salidas' | 'capturas'

interface Props {
  onIniciarSalida?: () => void
  locationName?:    string
  onLocationClick?: () => void
}

// ─────────────────────────────────────────────────────────────
//  Íconos
// ─────────────────────────────────────────────────────────────

function IconTrack() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"/>
    </svg>
  )
}

function IconFish() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 12c0 0-1.5-6 5-6s10 6 10 6-4.5 6-10 6-5-6-5-6z"/>
      <path d="M2 9c1 1 2.5 3 2.5 3S3 14 2 15"/>
      <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
//  Track card
// ─────────────────────────────────────────────────────────────

function TrackCard({ track, onEliminar }: { track: Track; onEliminar: () => void }) {
  const maxVel = track.puntos.length > 0
    ? Math.max(...track.puntos.map(p => p.velocidad_kts ?? 0)).toFixed(1)
    : null
  const [exportando, setExportando] = useState(false)

  async function handleExport() {
    setExportando(true)
    try { await exportTrackGPX(track) } finally { setExportando(false) }
  }

  return (
    <div className="card-glass rounded-2xl p-4 flex items-start gap-3">
      <div className="shrink-0 w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
        <IconTrack />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{track.nombre}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {formatFechaTrack(track.fecha)}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <Stat label="Dist." value={`${track.distancia_nm.toFixed(2)} mn`} />
          <Stat label="Tiempo" value={formatDuracion(track.duracion_s)} />
          {maxVel && Number(maxVel) > 0 && <Stat label="Vel máx" value={`${maxVel} kt`} />}
        </div>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button
          onClick={handleExport}
          disabled={exportando || track.puntos.length === 0}
          className="text-slate-600 hover:text-teal-400 transition-colors p-1 disabled:opacity-30"
          title="Exportar GPX"
        >
          {exportando ? (
            <span className="w-4 h-4 inline-block rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12"/>
              <path d="M7 10l5 5 5-5"/>
              <path d="M5 21h14"/>
            </svg>
          )}
        </button>
        <button
          onClick={onEliminar}
          className="text-slate-700 hover:text-red-400 transition-colors p-1"
          title="Eliminar"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0">
      <p className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase">{label}</p>
      <p className="text-[12px] font-mono text-slate-300">{value}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Captura card
// ─────────────────────────────────────────────────────────────

function CapturaCard({ captura, onEliminar }: { captura: Captura; onEliminar: () => void }) {
  const fecha = new Date(captura.fecha).toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
  return (
    <div className="card-glass rounded-2xl p-4 flex items-start gap-3">
      <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
        <IconFish />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100">{captura.especie}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{fecha}</p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {captura.longitud_cm != null && <Stat label="Largo" value={`${captura.longitud_cm} cm`} />}
          {captura.peso_kg     != null && <Stat label="Peso"  value={`${captura.peso_kg} kg`}   />}
          {captura.lat         != null && (
            <Stat label="Posición"
                  value={`${captura.lat.toFixed(3)}, ${captura.lon?.toFixed(3)}`} />
          )}
        </div>
        {captura.notas && (
          <p className="text-[11px] text-slate-500 mt-1.5 italic">"{captura.notas}"</p>
        )}
      </div>
      <button
        onClick={onEliminar}
        className="text-slate-700 hover:text-red-400 transition-colors p-1 shrink-0"
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Stats de capturas (banner resumen)
// ─────────────────────────────────────────────────────────────

function CapturaStats({ capturas }: { capturas: Captura[] }) {
  const stats = statsCapturas(capturas)
  if (stats.total === 0) return null
  return (
    <div className="card-glass rounded-2xl p-4 mb-3 flex items-center gap-4">
      <div className="flex flex-col items-center gap-0">
        <p className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase">Total</p>
        <p className="text-2xl font-mono font-semibold text-teal-400">{stats.total}</p>
        <p className="text-[9px] text-slate-600">capturas</p>
      </div>
      {stats.especies.length > 0 && (
        <>
          <div className="w-px self-stretch bg-white/[0.06]" />
          <div className="flex-1">
            <p className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase mb-1.5">
              Más frecuentes
            </p>
            {stats.especies.map(e => (
              <div key={e.nombre} className="flex items-center gap-2 mb-0.5">
                <div className="h-1.5 bg-amber-500/60 rounded-full"
                     style={{ width: `${Math.max(20, (e.count / stats.total) * 80)}px` }} />
                <span className="text-[11px] text-slate-400">{e.nombre} ({e.count})</span>
              </div>
            ))}
          </div>
        </>
      )}
      {stats.mayorPez && stats.mayorPez.longitud_cm != null && (
        <>
          <div className="w-px self-stretch bg-white/[0.06]" />
          <div className="flex flex-col items-center gap-0">
            <p className="text-[9px] font-semibold tracking-widest text-slate-600 uppercase">Mayor</p>
            <p className="text-xl font-mono font-semibold text-amber-400">{stats.mayorPez.longitud_cm}</p>
            <p className="text-[9px] text-slate-600">cm</p>
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Formulario nueva captura (bottom sheet)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  One-shot GPS read for the capture form
// ─────────────────────────────────────────────────────────────

async function obtenerPosicionActual(): Promise<{ lat: number; lon: number } | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const perm = await Geolocation.requestPermissions()
      if (perm.location !== 'granted') return null
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 })
      return { lat: pos.coords.latitude, lon: pos.coords.longitude }
    } else {
      return await new Promise((resolve) => {
        if (!navigator.geolocation) { resolve(null); return }
        navigator.geolocation.getCurrentPosition(
          p  => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000 },
        )
      })
    }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────

interface NuevaCapturaFormProps {
  onGuardar: (c: Omit<Captura, 'id' | 'fecha'>) => void
  onCancelar: () => void
}

function NuevaCapturaForm({ onGuardar, onCancelar }: NuevaCapturaFormProps) {
  const [especie,     setEspecie]     = useState('')
  const [longitud,    setLongitud]    = useState('')
  const [peso,        setPeso]        = useState('')
  const [notas,       setNotas]       = useState('')
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [gpsPos,      setGpsPos]      = useState<{ lat: number; lon: number } | null>(null)
  const [gpsLoading,  setGpsLoading]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleEspecie(val: string) {
    setEspecie(val)
    if (val.trim().length >= 1) {
      const q = val.toLowerCase()
      setSugerencias(ESPECIES_COMUNES.filter(e => e.toLowerCase().includes(q)).slice(0, 4))
    } else {
      setSugerencias([])
    }
  }

  async function handleGPS() {
    if (gpsPos) { setGpsPos(null); return }
    setGpsLoading(true)
    const pos = await obtenerPosicionActual()
    setGpsLoading(false)
    setGpsPos(pos)
  }

  function handleGuardar() {
    if (!especie.trim()) return
    onGuardar({
      especie:     especie.trim(),
      longitud_cm: longitud ? Number(longitud) : undefined,
      peso_kg:     peso     ? Number(peso)     : undefined,
      notas:       notas.trim() || undefined,
      lat:         gpsPos?.lat,
      lon:         gpsPos?.lon,
    })
  }

  // Portal para escapar el stacking context del tab fijo
  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col justify-end bg-black/60 backdrop-blur-sm"
         onClick={e => { if (e.target === e.currentTarget) onCancelar() }}>
      <div
        className="bg-[#0E1F38] rounded-t-3xl flex flex-col max-h-[88vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="shrink-0 pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/10 mx-auto" />
        </div>

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-2 pb-3 border-b border-white/[0.04]">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span className="text-amber-400"><IconFish /></span>
            Registrar captura
          </h2>
          <button onClick={onCancelar} className="text-slate-500 hover:text-slate-300 text-xl leading-none px-2">✕</button>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4 flex flex-col gap-4 overscroll-contain">

        {/* Especie */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
            Especie *
          </label>
          <input
            ref={inputRef}
            type="text"
            placeholder="Pejerrey, Dorado, Surubí…"
            value={especie}
            onChange={e => handleEspecie(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-amber-500/50"
          />
          {/* Sugerencias */}
          {sugerencias.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sugerencias.map(s => (
                <button
                  key={s}
                  onClick={() => { setEspecie(s); setSugerencias([]) }}
                  className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-medium"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Longitud + Peso */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
              Largo (cm)
            </label>
            <input
              type="number" inputMode="decimal" placeholder="0"
              value={longitud}
              onChange={e => setLongitud(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-teal-500/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
              Peso (kg)
            </label>
            <input
              type="number" inputMode="decimal" placeholder="0.0"
              value={peso}
              onChange={e => setPeso(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-teal-500/50"
            />
          </div>
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
            Notas
          </label>
          <textarea
            rows={2}
            placeholder="Cebo usado, condiciones, profundidad…"
            value={notas}
            onChange={e => setNotas(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-teal-500/50 resize-none"
          />
        </div>

        {/* Posición GPS */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
            Posición
          </label>
          <button
            type="button"
            onClick={handleGPS}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              gpsPos
                ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                : 'bg-white/[0.04] border-white/[0.09] text-slate-400 hover:text-slate-200'
            }`}
          >
            {gpsLoading ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-teal-400 border-t-transparent animate-spin shrink-0" />
            ) : (
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" className="shrink-0">
                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06z"/>
              </svg>
            )}
            {gpsPos
              ? `${gpsPos.lat.toFixed(4)}, ${gpsPos.lon.toFixed(4)}`
              : gpsLoading ? 'Obteniendo posición…' : 'Usar mi posición actual'
            }
            {gpsPos && (
              <span className="ml-auto text-slate-500 text-xs">✕ quitar</span>
            )}
          </button>
        </div>

        </div>{/* /Cuerpo scrolleable */}

        {/* Footer fijo con botones */}
        <div className="shrink-0 px-5 pt-3 pb-6 border-t border-white/[0.04] bg-[#0E1F38] flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 py-3 rounded-2xl text-sm font-medium text-slate-400 border border-white/[0.08]"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!especie.trim()}
            className="flex-[2] py-3 rounded-2xl text-sm font-semibold text-slate-900 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}
          >
            Guardar captura
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─────────────────────────────────────────────────────────────
//  Pantalla principal
// ─────────────────────────────────────────────────────────────

export function Salidas({ onIniciarSalida, locationName, onLocationClick }: Props) {
  const [pantallaVista, setPantallaVista] = useState<PantallaVista>('lista')
  const [subTab,        setSubTab]        = useState<SubTab>('salidas')
  const [tracks,        setTracks]        = useState<Track[]>(() => getTracks())
  const [capturas,      setCapturas]      = useState<Captura[]>(() => getCapturas())
  const [formAbierto,   setFormAbierto]   = useState(false)

  useEffect(() => {
    if (pantallaVista === 'lista') {
      setTracks(getTracks())
      setCapturas(getCapturas())
    }
  }, [pantallaVista])

  function handleEliminarTrack(id: string) {
    deleteTrack(id)
    setTracks(getTracks())
  }

  function handleEliminarCaptura(id: string) {
    deleteCaptura(id)
    setCapturas(getCapturas())
  }

  function handleGuardarCaptura(data: Omit<Captura, 'id' | 'fecha'>) {
    saveCaptura({ ...data, id: Date.now().toString(), fecha: Date.now() })
    setCapturas(getCapturas())
    setFormAbierto(false)
  }

  if (pantallaVista === 'mapas') return <MapasOffline onBack={() => setPantallaVista('lista')} />

  return (
    <div className="flex flex-col h-full bg-[#0B1928]">

      {/* Header global con ubicación */}
      {locationName && onLocationClick && (
        <AppHeader
          titulo="Bitácora"
          locationName={locationName}
          onLocationClick={onLocationClick}
          extra={
            <button
              onClick={() => setPantallaVista('mapas')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/[0.09] text-slate-400 hover:text-slate-200 text-[11px] transition-colors"
              title="Mapas offline"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/>
              </svg>
            </button>
          }
        />
      )}

      {/* Sub-tabs */}
      <div className="shrink-0 px-4 pt-3 pb-3">
        <div className="flex bg-white/[0.04] rounded-2xl p-1 gap-1">
          {(['salidas', 'capturas'] as SubTab[]).map(t => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                subTab === t
                  ? t === 'capturas'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="opacity-90">{t === 'salidas' ? <IconTrack /> : <IconFish />}</span>
              {t === 'salidas' ? 'Salidas' : 'Capturas'}
              {t === 'salidas' && tracks.length > 0 && (
                <span className="bg-teal-500/30 text-teal-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {tracks.length}
                </span>
              )}
              {t === 'capturas' && capturas.length > 0 && (
                <span className="bg-amber-500/30 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {capturas.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">

        {/* ── Tab: Salidas ── */}
        {subTab === 'salidas' && (
          <>
            {tracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-16">
                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                    <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-slate-300 text-sm font-medium">Sin salidas registradas</p>
                  <p className="text-slate-600 text-xs mt-1 max-w-[220px]">
                    Iniciá una salida desde el mapa para registrar tu recorrido.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                {tracks.map(t => (
                  <TrackCard key={t.id} track={t} onEliminar={() => handleEliminarTrack(t.id)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Tab: Capturas ── */}
        {subTab === 'capturas' && (
          <>
            <CapturaStats capturas={capturas} />
            {capturas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-16 mt-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <IconFish />
                </div>
                <div>
                  <p className="text-slate-300 text-sm font-medium">Sin capturas registradas</p>
                  <p className="text-slate-600 text-xs mt-1 max-w-[220px]">
                    Registrá cada pez que agarrás — especie, tamaño y notas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {capturas.map(c => (
                  <CapturaCard key={c.id} captura={c} onEliminar={() => handleEliminarCaptura(c.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <div className="shrink-0 px-4 pb-6 pt-2">
        {subTab === 'salidas' ? (
          <button
            onClick={onIniciarSalida}
            className="w-full py-4 rounded-2xl text-base font-semibold tracking-wide text-slate-900 transition-opacity active:opacity-80 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#00D1BD 0%,#00967F 100%)' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
            Ir al mapa
          </button>
        ) : (
          <button
            onClick={() => setFormAbierto(true)}
            className="w-full py-4 rounded-2xl text-base font-semibold tracking-wide text-slate-900 transition-opacity active:opacity-80 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Registrar captura
          </button>
        )}
      </div>

      {/* Modal formulario captura */}
      {formAbierto && (
        <NuevaCapturaForm
          onGuardar={handleGuardarCaptura}
          onCancelar={() => setFormAbierto(false)}
        />
      )}
    </div>
  )
}
