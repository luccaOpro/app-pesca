import React, { useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { wmoEmoji, wmoLabel, type DiaPronostico } from '../hooks/usePronostico'
import { colorViento, type HoraViento } from '../hooks/useWindHourly'
import type { FishingLocation } from '../data/locations'

type Vista = 'detalle' | 'mapa'
type Capa  = 'wind' | 'rain' | 'waves' | 'cape'

interface Props {
  location:      FishingLocation
  onLocationClick: () => void
  pronostico:    { dias: DiaPronostico[]; loading: boolean; error: string | null }
  vientoHorario: HoraViento[]
}

// ─────────────────────────────────────────────────────────────
//  Iconos de capas para vista Mapa
// ─────────────────────────────────────────────────────────────

function IconWind() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
    </svg>
  )
}
function IconRain() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
      <line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/>
      <line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/>
      <line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/>
    </svg>
  )
}
function IconWaves() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5s2.5 2 5 2 2.5-2 5-2"/>
      <path d="M2 12c.6.5 1.2 1 2.5 1C7 13 7 11 9.5 11s2.5 2 5 2 2.5-2 5-2"/>
      <path d="M2 18c.6.5 1.2 1 2.5 1C7 19 7 17 9.5 17s2.5 2 5 2 2.5-2 5-2"/>
    </svg>
  )
}
function IconStorm() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/>
      <polyline points="13 11 9 17 15 17 11 23"/>
    </svg>
  )
}

const CAPAS: { id: Capa; label: string; Icon: () => React.ReactElement }[] = [
  { id: 'wind',  label: 'Viento',    Icon: IconWind  },
  { id: 'rain',  label: 'Lluvia',    Icon: IconRain  },
  { id: 'waves', label: 'Olas',      Icon: IconWaves },
  { id: 'cape',  label: 'Tormentas', Icon: IconStorm },
]

// ─────────────────────────────────────────────────────────────
//  Día expandido (lista vertical, mucho más legible)
// ─────────────────────────────────────────────────────────────

function DiaCard({ dia, isHoy }: { dia: DiaPronostico; isHoy: boolean }) {
  return (
    <div className={`card-glass rounded-2xl p-3 flex items-center gap-3 ${isHoy ? 'border-teal-500/30' : ''}`}>
      <span className="text-[32px] leading-none">{wmoEmoji(dia.wmoCode)}</span>

      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-bold tracking-[0.18em] uppercase ${isHoy ? 'text-teal-400' : 'text-slate-400'}`}>
          {isHoy ? 'Hoy' : dia.diaSemana}
        </p>
        <p className="text-[12px] text-slate-500 truncate">{wmoLabel(dia.wmoCode)}</p>
        {dia.sunrise && dia.sunset && (
          <p className="text-[10px] text-slate-600 mt-0.5 font-mono">
            ☀ {dia.sunrise} – {dia.sunset}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <div className="flex items-baseline gap-1">
          <span className="text-[18px] font-mono font-semibold text-slate-100 tabular-nums">{dia.tempMax}°</span>
          <span className="text-[12px] text-slate-500 tabular-nums">{dia.tempMin}°</span>
        </div>
        <div className="flex items-center gap-1">
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#64748b" strokeWidth="2">
            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
            <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
          </svg>
          <span className="text-[10px] font-mono text-slate-500 tabular-nums">{Math.round(dia.vientoKts * 1.852)} km/h</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Viento por hora — versión expandida (más alto)
// ─────────────────────────────────────────────────────────────

function VientoHorarioExpandido({ horas }: { horas: HoraViento[] }) {
  if (horas.length === 0) return null
  const maxKt = Math.max(15, ...horas.map(h => h.speedKts))
  const BAR_H = 88

  return (
    <section className="card-glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-500">
          Viento próximas {horas.length}h
        </h2>
        <span className="text-[10px] text-slate-600">km/h</span>
      </div>

      <div className="flex items-end gap-1 overflow-x-auto pb-1">
        {horas.map(h => {
          const heightPct = (h.speedKts / maxKt) * 100
          const color     = colorViento(h.speedKts)
          return (
            <div key={h.ts} className="flex flex-col items-center gap-1 min-w-[30px] flex-1">
              <span className="text-[10px] font-mono tabular-nums text-slate-300 leading-none">
                {Math.round(h.speedKts * 1.852)}
              </span>
              <div className="w-full flex items-end justify-center" style={{ height: BAR_H }}>
                <div
                  className="w-4 rounded-t-md transition-all"
                  style={{ height: `${Math.max(2, heightPct)}%`, background: color }}
                />
              </div>
              <svg viewBox="0 0 16 16" width="12" height="12"
                   style={{ transform: `rotate(${h.dirDeg + 180}deg)` }}>
                <path d="M8 1 L4 12 L8 9 L12 12 Z" fill="#94a3b8"/>
              </svg>
              <span className="text-[9px] font-mono text-slate-600 leading-none">
                {h.hora}
              </span>
            </div>
          )
        })}
      </div>

      {/* Leyenda de colores */}
      <div className="mt-3 flex items-center gap-3 text-[9px] text-slate-600">
        <LegendDot color="#00D1BD" label="≤9" />
        <LegendDot color="#86EFAC" label="≤19" />
        <LegendDot color="#FBBF24" label="≤28" />
        <LegendDot color="#F97316" label="≤46" />
        <LegendDot color="#EF4444" label=">46" />
      </div>
    </section>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
//  Mapa Windy embebido
// ─────────────────────────────────────────────────────────────

function MapaWindy({ location }: { location: FishingLocation }) {
  const [capa, setCapa] = useState<Capa>('wind')

  const params = new URLSearchParams({
    lat:        location.lat.toFixed(4),
    lon:        location.lon.toFixed(4),
    zoom:       '8',
    level:      'surface',
    overlay:    capa,
    product:    'ecmwf',
    menu:       '',
    message:    '',
    marker:     'true',
    type:       'map',
    location:   'coordinates',
    detail:     '',
    metricWind: 'km/h',
    metricTemp: '°C',
  })

  const src = `https://embed.windy.com/embed2.html?${params}`

  return (
    <div className="flex flex-col w-full h-full">
      {/* Selector de capa */}
      <div className="px-4 pt-3 pb-3 flex gap-2 overflow-x-auto shrink-0">
        {CAPAS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setCapa(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              capa === id
                ? 'bg-teal-500 text-slate-900'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 relative min-h-0">
        <iframe
          key={src}
          src={src}
          title={`Mapa de ${CAPAS.find(c => c.id === capa)?.label}`}
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Componente principal
// ─────────────────────────────────────────────────────────────

export function Clima({ location, onLocationClick, pronostico, vientoHorario }: Props) {
  const [vista, setVista] = useState<Vista>('detalle')

  return (
    <div className="flex flex-col h-full bg-[#0B1928]">
      <AppHeader
        titulo="Clima"
        locationName={location.name}
        onLocationClick={onLocationClick}
      />

      {/* Toggle Detalle / Mapa */}
      <div className="shrink-0 px-4 pt-3 pb-1">
        <div className="flex bg-white/[0.04] rounded-2xl p-1 gap-1">
          {(['detalle', 'mapa'] as Vista[]).map(v => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                vista === v
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {v === 'detalle' ? 'Pronóstico' : 'Mapa Windy'}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {vista === 'detalle' ? (
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-md mx-auto w-full px-4 pt-3 pb-6 flex flex-col gap-3">

            {pronostico.loading && (
              <p className="text-slate-500 text-sm text-center py-8">Cargando pronóstico…</p>
            )}
            {pronostico.error && (
              <p className="text-red-400 text-sm text-center py-8">Sin datos: {pronostico.error}</p>
            )}

            {/* Días */}
            {pronostico.dias.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-500 px-1">
                  Próximos {pronostico.dias.length} días
                </h2>
                {pronostico.dias.map((d, i) => (
                  <DiaCard key={d.fecha} dia={d} isHoy={i === 0} />
                ))}
              </section>
            )}

            {/* Viento por hora */}
            <VientoHorarioExpandido horas={vientoHorario} />

            <p className="text-[10px] text-slate-600 italic text-center mt-2">
              Pronóstico Open-Meteo · modelo ECMWF · viento a 10 m
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <MapaWindy location={location} />
        </div>
      )}
    </div>
  )
}
