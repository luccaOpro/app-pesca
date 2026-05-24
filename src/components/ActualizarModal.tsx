import { createPortal } from 'react-dom'
import type { UpdateInfo } from '../hooks/useAppUpdate'

interface Props {
  update:     UpdateInfo
  progreso:   number
  instalando: boolean
  error:      string | null
  onInstalar: () => void
  onCerrar:   () => void
}

export function ActualizarModal({
  update, progreso, instalando, error, onInstalar, onCerrar,
}: Props) {
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0E1F38] rounded-t-3xl pb-safe flex flex-col">

        {/* Handle */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        <div className="px-5 pt-2 pb-6 flex flex-col gap-4">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-teal-400">
                Nueva versión disponible
              </p>
              <p className="text-xl font-bold text-slate-100 mt-0.5">
                v{update.version}
              </p>
            </div>
            {!instalando && (
              <button
                onClick={onCerrar}
                className="text-slate-500 hover:text-slate-300 text-2xl leading-none px-1 -mt-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Notas */}
          {update.notas && (
            <div className="bg-white/[0.04] rounded-2xl px-4 py-3">
              <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase mb-1.5">
                Novedades
              </p>
              <p className="text-[13px] text-slate-300 leading-relaxed">{update.notas}</p>
            </div>
          )}

          {/* Barra de progreso */}
          {instalando && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Descargando actualización…</span>
                <span className="font-mono text-teal-400">{progreso}%</span>
              </div>
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${progreso}%` }}
                />
              </div>
              {progreso === 100 && (
                <p className="text-[11px] text-slate-400 text-center">
                  Abriendo instalador…
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-[12px] text-red-400 text-center">{error}</p>
          )}

          {/* Botones */}
          {!instalando ? (
            <button
              onClick={onInstalar}
              className="w-full py-4 rounded-2xl text-base font-semibold text-slate-900 active:opacity-80"
              style={{ background: 'linear-gradient(135deg,#00D1BD 0%,#00967F 100%)' }}
            >
              Descargar e instalar
            </button>
          ) : (
            progreso < 100 && (
              <button
                onClick={onCerrar}
                className="w-full py-3 rounded-2xl text-sm font-medium text-slate-400 border border-white/[0.08]"
              >
                Cancelar
              </button>
            )
          )}

          <p className="text-[10px] text-slate-600 text-center -mt-1">
            La app se va a reiniciar al instalar
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
