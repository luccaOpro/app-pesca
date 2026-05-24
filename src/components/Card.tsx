import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  className?: string
  /** Contenido extra a la derecha del título (ej. "Ver más →") */
  headerExtra?: ReactNode
}

export function Card({ title, children, className = '', headerExtra }: Props) {
  return (
    <section className={`card-glass rounded-2xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-500 select-none">
          {title}
        </h2>
        {headerExtra}
      </div>
      {children}
    </section>
  )
}
