import React, { useState } from 'react'
import type { FishingLocation } from '../data/locations'

type Capa = 'wind' | 'rain' | 'waves' | 'cape'

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

interface Props {
  location: FishingLocation
}

export function MapaTiempo({ location }: Props) {
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
    metricWind: 'kt',
    metricTemp: '°C',
  })

  const src = `https://embed.windy.com/embed2.html?${params}`

  return (
    <div className="flex flex-col w-full h-full">
      {/* Selector de capa */}
      <div className="px-4 pt-4 pb-3 flex gap-2 overflow-x-auto shrink-0">
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

      {/* Mapa Windy */}
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
