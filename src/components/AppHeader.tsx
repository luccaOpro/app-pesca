import { LocationPill } from './LocationPill'

interface Props {
  /** Texto a mostrar arriba a la izquierda — por defecto fecha de "hoy" */
  fecha?: Date
  /** Etiqueta superior (default: "HOY") */
  etiqueta?: string
  /** Título alternativo (reemplaza fecha/etiqueta) */
  titulo?: string
  /** Nombre de la ubicación */
  locationName: string
  /** Handler para abrir el picker */
  onLocationClick: () => void
  /** Acción extra opcional a la derecha del pill (ej. botón de mapa, ajustes) */
  extra?: React.ReactNode
  /** Color del indicador de condición de pesca (punto pulsante) */
  scoreColor?: string
  /** Si se provee, el área izquierda (dot + fecha) es tappable para abrir desglose */
  onScoreClick?: () => void
}

function formatFechaCorta(d: Date): string {
  const s = d.toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).replace(/\./g, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Header común a las pantallas con ubicación.
 * Respeta safe-area (notch) arriba.
 */
export function AppHeader({
  fecha,
  etiqueta = 'Hoy',
  titulo,
  locationName,
  onLocationClick,
  extra,
  scoreColor,
  onScoreClick,
}: Props) {
  const leftInner = (
    <>
      {scoreColor && (
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
          style={{ background: scoreColor, boxShadow: `0 0 6px ${scoreColor}90` }}
        />
      )}
      {titulo ? (
        <span className="text-base font-semibold text-slate-100 truncate">{titulo}</span>
      ) : (
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-500">
            {etiqueta}
          </span>
          <span className="text-sm font-semibold text-slate-200 truncate">
            {formatFechaCorta(fecha ?? new Date())}
          </span>
        </div>
      )}
    </>
  )

  return (
    <header className="shrink-0 bg-[#0B1928]/95 backdrop-blur-md border-b border-white/[0.05] px-4 pt-safe-plus-3 pb-2.5 flex items-center justify-between gap-2">
      {onScoreClick ? (
        <button
          onClick={onScoreClick}
          className="flex items-center gap-2 min-w-0 active:opacity-70"
        >
          {leftInner}
        </button>
      ) : (
        <div className="flex items-center gap-2 min-w-0">{leftInner}</div>
      )}
      <div className="flex items-center gap-1.5 shrink-0">
        {extra}
        <LocationPill name={locationName} onClick={onLocationClick} />
      </div>
    </header>
  )
}
