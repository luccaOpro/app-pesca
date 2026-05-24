interface Props {
  name: string
  onClick: () => void
}

export function LocationPill({ name, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.09] bg-white/[0.05] text-slate-300 text-sm hover:bg-white/[0.09] transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-teal-400 shrink-0" aria-hidden>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
      <span className="truncate max-w-[160px] leading-none">{name}</span>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500" aria-hidden>
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>
  )
}
