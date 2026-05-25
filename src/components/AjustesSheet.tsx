import { createPortal } from 'react-dom'
import { APP_VERSION } from '../lib/version'
import type { UpdateInfo } from '../hooks/useAppUpdate'

interface Props {
  onCerrar:   () => void
  update:     UpdateInfo | null
  checking:   boolean
  upToDate:   boolean
  instalando: boolean
  progreso:   number
  error:      string | null
  onCheck:    () => void
  onInstalar: () => void
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
         stroke="#00D1BD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm text-slate-300 font-medium">{value}</span>
    </div>
  )
}

export function AjustesSheet({
  onCerrar, update, checking, upToDate, instalando, progreso, error, onCheck, onInstalar,
}: Props) {
  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCerrar() }}
    >
      <div
        className="bg-[#0E1F38] rounded-t-3xl flex flex-col max-h-[88vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="shrink-0 pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-2 pb-3 border-b border-white/[0.04]">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <IconSettings />
            Ajustes
          </h2>
          <button
            onClick={onCerrar}
            className="text-slate-500 hover:text-slate-300 text-xl leading-none px-2"
          >✕</button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-10 flex flex-col gap-6 overscroll-contain">

          {/* ── Actualizaciones ── */}
          <section className="flex flex-col gap-3">
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">
              Actualizaciones
            </p>

            {/* Versión instalada */}
            <div className="px-3.5 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.06] flex items-center justify-between">
              <span className="text-sm text-slate-400">Versión instalada</span>
              <span className="text-sm font-mono text-teal-300 font-semibold">v{APP_VERSION}</span>
            </div>

            {/* Estado: actualización disponible */}
            {update && (
              <div className="flex flex-col gap-2">
                <div className="px-3.5 py-3 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0" />
                    <p className="text-sm font-semibold text-teal-300">
                      Nueva versión: v{update.version}
                    </p>
                  </div>
                  {update.notas && (
                    <p className="text-xs text-slate-400 ml-4 leading-relaxed">{update.notas}</p>
                  )}
                </div>
                {error && <p className="text-xs text-red-400 px-1">{error}</p>}
                <button
                  onClick={onInstalar}
                  disabled={instalando}
                  className="w-full py-3.5 rounded-2xl text-sm font-semibold text-slate-900 disabled:opacity-50
                             flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#00D1BD 0%,#00967F 100%)' }}
                >
                  {instalando ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-slate-900/60 border-t-transparent animate-spin shrink-0" />
                      Descargando {progreso}%…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                           strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3v12"/><path d="M7 10l5 5 5-5"/>
                        <path d="M5 21h14"/>
                      </svg>
                      Instalar actualización
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Estado: ya está actualizado */}
            {upToDate && !update && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-green-500/10 border border-green-500/25 rounded-xl">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                     stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-sm text-green-300">¡Tenés la versión más reciente!</span>
              </div>
            )}

            {/* Botón buscar */}
            {!update && (
              <button
                onClick={onCheck}
                disabled={checking}
                className="w-full py-3 rounded-2xl text-sm font-medium border border-white/[0.09] text-slate-300
                           disabled:opacity-50 flex items-center justify-center gap-2 bg-white/[0.03]"
              >
                {checking ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-teal-400 border-t-transparent animate-spin shrink-0" />
                    Buscando actualizaciones…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10"/>
                      <path d="M3.51 15a9 9 0 1 0 .49-3.28"/>
                    </svg>
                    {upToDate ? 'Volver a buscar' : 'Buscar actualizaciones'}
                  </>
                )}
              </button>
            )}

            {error && !update && (
              <p className="text-xs text-red-400 px-1">{error}</p>
            )}
          </section>

          {/* ── Sobre la app ── */}
          <section className="flex flex-col gap-2">
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">
              Sobre la app
            </p>
            <div className="px-3.5 py-1 bg-white/[0.03] rounded-xl border border-white/[0.06] divide-y divide-white/[0.05]">
              <Row label="App"              value="Tormenta de Facha 🎣" />
              <Row label="Datos de marea"   value="Open-Meteo" />
              <Row label="Pronóstico"       value="Open-Meteo · ECMWF" />
              <Row label="Mapas"            value="OSM · ESRI · CartoDB" />
            </div>
          </section>

        </div>
      </div>
    </div>,
    document.body,
  )
}
