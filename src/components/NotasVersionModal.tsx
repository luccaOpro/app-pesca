import { createPortal } from 'react-dom'
import type { NotaVersion } from '../lib/version'

interface Props {
  notas:    NotaVersion
  onCerrar: () => void
}

export function NotasVersionModal({ notas, onCerrar }: Props) {
  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
      <div className="w-full max-w-sm bg-[#0E1F38] rounded-3xl p-6 flex flex-col gap-5 shadow-2xl">

        {/* Icon + título */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'linear-gradient(135deg,#00D1BD 0%,#00967F 100%)' }}
          >
            🎣
          </div>
          <div className="flex flex-col gap-1">
            <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-teal-400 px-2.5 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/30">
              v{notas.version} instalada
            </span>
            <h2 className="text-xl font-bold text-slate-100 mt-1">
              ¡Hay novedades!
            </h2>
          </div>
        </div>

        {/* Items */}
        <div className="flex flex-col gap-2.5 bg-white/[0.04] rounded-2xl px-4 py-3.5">
          {notas.items.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-teal-400 text-sm font-bold shrink-0 mt-0.5">✓</span>
              <span className="text-[13px] text-slate-300 leading-snug">{item}</span>
            </div>
          ))}
        </div>

        {/* Botón */}
        <button
          onClick={onCerrar}
          className="w-full py-4 rounded-2xl text-base font-semibold text-slate-900 active:opacity-80"
          style={{ background: 'linear-gradient(135deg,#00D1BD 0%,#00967F 100%)' }}
        >
          ¡Entendido!
        </button>

      </div>
    </div>,
    document.body,
  )
}
