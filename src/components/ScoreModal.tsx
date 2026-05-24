import { createPortal } from 'react-dom'
import type { FactorScore, ResultadoCondiciones } from '../lib/pesca'

interface Props {
  condiciones: ResultadoCondiciones
  onCerrar:    () => void
}

function colorEstado(estado: FactorScore['estado']): string {
  return estado === 'bueno' ? '#00D1BD' : estado === 'regular' ? '#FBBF24' : '#F87171'
}

const FACTOR_ICONS: Record<string, React.ReactElement> = {
  '⏱': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
      <path d="M12 6v6l3.5 3.5"/>
    </svg>
  ),
  '💨': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
    </svg>
  ),
  '🌊': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5s2.5 2 5 2 2.5-2 5-2"/>
      <path d="M2 12c.6.5 1.2 1 2.5 1C7 13 7 11 9.5 11s2.5 2 5 2 2.5-2 5-2"/>
      <path d="M2 18c.6.5 1.2 1 2.5 1C7 19 7 17 9.5 17s2.5 2 5 2 2.5-2 5-2"/>
    </svg>
  ),
  '🌙': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
}

export function ScoreModal({ condiciones, onCerrar }: Props) {
  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md bg-[#0E1F38] rounded-t-3xl pb-safe flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        <div className="px-5 pt-2 pb-6 flex flex-col gap-4">

          {/* Header + score */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500">
                Cómo se calcula
              </p>
              <p className="text-xl font-bold text-slate-100 mt-0.5">
                Score de pesca
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span
                className="text-[40px] font-mono font-bold leading-none tabular-nums"
                style={{ color: condiciones.color }}
              >
                {condiciones.score}
              </span>
              <span
                className="text-[9px] font-bold tracking-[0.18em] uppercase"
                style={{ color: condiciones.color }}
              >
                {condiciones.etiqueta}
              </span>
            </div>
          </div>

          {/* Factor rows */}
          <div className="flex flex-col bg-white/[0.03] rounded-2xl overflow-hidden">
            {condiciones.factores.map((f, i) => {
              const c = colorEstado(f.estado)
              return (
                <div
                  key={f.nombre}
                  className={`flex flex-col gap-2 px-4 py-3 ${
                    i < condiciones.factores.length - 1 ? 'border-b border-white/[0.06]' : ''
                  }`}
                >
                  {/* Top row: icon + name + detail + puntos */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0" style={{ color: c }}>
                        {FACTOR_ICONS[f.icono] ?? f.icono}
                      </span>
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="text-[13px] font-semibold text-slate-200 shrink-0">
                          {f.nombre}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate">
                          {f.detalle}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-0.5 shrink-0">
                      <span className="text-[15px] font-mono font-semibold tabular-nums" style={{ color: c }}>
                        +{f.puntos}
                      </span>
                      <span className="text-[10px] text-slate-600">pts</span>
                    </div>
                  </div>

                  {/* Bar row */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-600 w-7 text-right shrink-0">
                      {Math.round(f.peso * 100)}%
                    </span>
                    <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${f.subScore}%`, background: c }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 w-12 text-right shrink-0">
                      {f.subScore}/100
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-slate-500">Puntaje total ponderado</span>
            <span
              className="text-[20px] font-mono font-bold tabular-nums"
              style={{ color: condiciones.color }}
            >
              {condiciones.score}<span className="text-[13px] text-slate-500 font-normal">/100</span>
            </span>
          </div>

        </div>
      </div>
    </div>,
    document.body,
  )
}
