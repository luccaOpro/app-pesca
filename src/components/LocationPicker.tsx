import { useState } from 'react'
import type { FishingLocation } from '../data/locations'
import { useGeoSearch } from '../hooks/useGeoSearch'

interface Props {
  open: boolean
  onClose: () => void
  current: FishingLocation
  recents: FishingLocation[]
  onSelect: (loc: FishingLocation) => void
  onRemoveRecent: (id: string) => void
}

export function LocationPicker({ open, onClose, current, recents, onSelect, onRemoveRecent }: Props) {
  const [query, setQuery] = useState('')
  const { results, searching } = useGeoSearch(query)

  if (!open) return null

  const handleSelect = (loc: FishingLocation) => {
    onSelect(loc)
    setQuery('')
    onClose()
  }

  const handleClose = () => {
    setQuery('')
    onClose()
  }

  const hasQuery = query.trim().length >= 2

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
      onClick={handleClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col p-6 gap-4"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-100">Ubicación</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-100 text-3xl leading-none w-8 h-8 flex items-center justify-center"
            aria-label="Cerrar"
          >×</button>
        </header>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">🔍</span>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar ciudad o zona…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">…</span>
          )}
        </div>

        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {!hasQuery && (
            recents.length > 0 ? (
              <>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Recientes</p>
                <ul className="space-y-1.5">
                  {recents.map(loc => {
                    const active = loc.id === current.id
                    return (
                      <li key={loc.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSelect(loc)}
                          className={`flex-1 text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${
                            active
                              ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-100'
                              : 'bg-slate-800/60 hover:bg-slate-800 border border-transparent text-slate-200'
                          }`}
                        >
                          <span>{loc.name}</span>
                          {active && <span aria-hidden className="text-cyan-400 ml-2">✓</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveRecent(loc.id)}
                          className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors rounded-lg"
                          aria-label={`Eliminar ${loc.name} de recientes`}
                        >✕</button>
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              <p className="text-slate-500 text-center py-8 text-sm">Buscá una ciudad para empezar</p>
            )
          )}

          {hasQuery && !searching && results.length === 0 && (
            <p className="text-slate-400 text-center py-6">Sin resultados para "{query}"</p>
          )}
          {hasQuery && results.length > 0 && (
            <ul className="space-y-1.5">
              {results.map(loc => (
                <li key={loc.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(loc)}
                    className="w-full text-left px-4 py-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-transparent text-slate-200 transition-colors"
                  >
                    {loc.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
