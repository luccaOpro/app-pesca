import React, { useEffect, useMemo, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { ActualizarModal } from './components/ActualizarModal'
import { ScoreModal } from './components/ScoreModal'
import { NotasVersionModal } from './components/NotasVersionModal'
import { BottomNav, type Tab } from './components/BottomNav'
import { Card } from './components/Card'
import { LocationPicker } from './components/LocationPicker'
import { useLocation } from './hooks/useLocation'
import { usePresion } from './hooks/usePresion'
import { useTide } from './hooks/useTide'
import { useTideChart } from './hooks/useTideChart'
import { useWind } from './hooks/useWind'
import { usePronostico, wmoEmoji } from './hooks/usePronostico'
import { useWindHourly, colorViento, type HoraViento } from './hooks/useWindHourly'
import { useAppUpdate } from './hooks/useAppUpdate'
import type { TendenciaPresion } from './hooks/usePresion'
import { calcularLuna } from './lib/moon'
import { calcularCondiciones, calcularVentanas, type CondicionItem, type VentanaPesca } from './lib/pesca'
import { calcularPeriodosSolunares, proximosPeriodos, periodoEnCurso, formatHora, type PeriodoSolunar } from './lib/solunar'
import type { ExtremoMarea } from './lib/tide'
import { APP_VERSION, NOTAS_ACTUALES } from './lib/version'
import { Clima } from './screens/Clima'
import { MapaNautico } from './screens/MapaNautico'
import { Salidas } from './screens/Salidas'

// 1 nudo = 1.852 km/h — mostramos km/h como referencia secundaria
const kmh = (kts: number): number => Math.round(kts * 1.852)

function FlechaViento({ grados }: { grados: number }) {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32"
         style={{ transform: `rotate(${grados}deg)`, transition: 'transform 0.6s ease' }}>
      <path d="M12 2 L7 16 L12 12 L17 16 Z" fill="#94d5cc" />
      <path d="M12 22 L7 8 L12 12 L17 8 Z"  fill="#94d5cc" opacity="0.25" />
    </svg>
  )
}

// ── Moon phase SVG ───────────────────────────────────────────────────────────

function MoonPhaseIcon({ edadDias, size = 40 }: { edadDias: number; size?: number }) {
  const HALF = 29.530588853 / 2
  const waxing   = edadDias <= HALF
  const halfPhase = waxing ? edadDias / HALF : (edadDias - HALF) / HALF
  const r  = size / 2
  const rx = r * Math.cos(Math.PI * halfPhase)
  const ellipseFill = waxing ? (rx > 0 ? 'black' : '#C8D8EA') : (rx > 0 ? '#C8D8EA' : 'black')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <mask id="mp">
          <rect width={size} height={size} fill="black" />
          {waxing
            ? <rect x={r} y="0" width={r} height={size} fill="white" />
            : <rect x="0" y="0" width={r} height={size} fill="white" />
          }
          <ellipse cx={r} cy={r} rx={Math.max(0.01, Math.abs(rx))} ry={r} fill={ellipseFill} />
        </mask>
      </defs>
      <circle cx={r} cy={r} r={r} fill="#1A2E42" />
      <circle cx={r} cy={r} r={r} fill="#C8D8EA" mask="url(#mp)" />
    </svg>
  )
}

// ── Gauge de condiciones ─────────────────────────────────────────────────────

function GaugePesca({ score, color, etiqueta }: { score: number; color: string; etiqueta: string }) {
  function arc(cx: number, cy: number, r: number, from: number, to: number) {
    const rad = (d: number) => (d * Math.PI) / 180
    const x1 = cx + r * Math.sin(rad(from)),  y1 = cy - r * Math.cos(rad(from))
    const x2 = cx + r * Math.sin(rad(to)),    y2 = cy - r * Math.cos(rad(to))
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }
  const START = 135, SWEEP = 270, CX = 60, CY = 58, R = 48, SW = 9
  return (
    <svg viewBox="0 0 120 116" width="112" height="112">
      <path d={arc(CX, CY, R, START, START + SWEEP)} fill="none" stroke="#1E3A5F" strokeWidth={SW} strokeLinecap="round" />
      {score > 1 && (
        <path d={arc(CX, CY, R, START, START + (score / 100) * SWEEP)} fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      )}
      <text x="60" y="62" textAnchor="middle" fill="white" fontSize="30" fontWeight="700" fontFamily="system-ui">{score}</text>
      <text x="60" y="78" textAnchor="middle" fill={color}  fontSize="9"  fontWeight="700" fontFamily="system-ui" letterSpacing="1.5">{etiqueta}</text>
    </svg>
  )
}

// ── Ícono de condición ───────────────────────────────────────────────────────

const CONDITION_ICONS: Record<string, React.ReactElement> = {
  '⏱': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
      <path d="M12 6v6l3.5 3.5"/>
    </svg>
  ),
  '💨': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
    </svg>
  ),
  '🌊': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5s2.5 2 5 2 2.5-2 5-2"/>
      <path d="M2 12c.6.5 1.2 1 2.5 1C7 13 7 11 9.5 11s2.5 2 5 2 2.5-2 5-2"/>
      <path d="M2 18c.6.5 1.2 1 2.5 1C7 19 7 17 9.5 17s2.5 2 5 2 2.5-2 5-2"/>
    </svg>
  ),
}

function CondicionRow({ icono, label, estado }: CondicionItem) {
  const c = estado === 'bueno' ? '#00D1BD' : estado === 'regular' ? '#FBBF24' : '#F87171'
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0" style={{ color: c }}>{CONDITION_ICONS[icono] ?? icono}</span>
      <span className="text-sm font-medium leading-tight" style={{ color: c }}>{label}</span>
    </div>
  )
}

function VentanaCard({ v }: { v: VentanaPesca }) {
  return (
    <div className="bg-white/[0.04] rounded-xl p-3 flex flex-col gap-1">
      <p className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">{v.periodo}</p>
      <p className="text-[15px] font-mono text-slate-100 font-semibold leading-snug">{v.inicio} - {v.fin}</p>
      <span className="text-xs font-semibold mt-0.5" style={{ color: v.colorCalidad }}>{v.calidad}</span>
    </div>
  )
}

// ── Períodos solunares ───────────────────────────────────────────────────────

function SolunarCard({ periodos, periodoActual, nowMs }: {
  periodos:      PeriodoSolunar[]
  periodoActual: PeriodoSolunar | null
  nowMs:         number
}) {
  if (periodos.length === 0) return null

  return (
    <div className="card-glass rounded-2xl px-4 pt-3 pb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">🎣</span>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-slate-500">
            Períodos solunares
          </p>
        </div>
        {periodoActual && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            periodoActual.tipo === 'mayor'
              ? 'bg-teal-500/25 text-teal-300'
              : 'bg-amber-500/25 text-amber-300'
          }`}>
            ¡En curso!
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {periodos.map((p, i) => {
          const enCurso  = p.inicio <= nowMs && p.fin >= nowMs
          const minutos  = Math.max(0, Math.round((p.inicio - nowMs) / 60_000))
          const horasFalt = Math.floor(minutos / 60)
          const minFalt   = minutos % 60
          const tiempoFalt = minutos === 0
            ? 'ahora'
            : horasFalt > 0
              ? `en ${horasFalt}h ${minFalt}m`
              : `en ${minFalt}m`

          return (
            <div key={i}
                 className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl ${
                   enCurso
                     ? p.tipo === 'mayor'
                       ? 'bg-teal-500/15 border border-teal-500/35'
                       : 'bg-amber-500/15 border border-amber-500/35'
                     : 'bg-white/[0.03]'
                 }`}>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  p.tipo === 'mayor' ? 'bg-teal-400' : 'bg-amber-400'
                } ${enCurso ? 'animate-pulse' : ''}`} />
                <span className={`text-[11px] font-semibold uppercase tracking-wide ${
                  p.tipo === 'mayor' ? 'text-teal-300' : 'text-amber-300'
                }`}>
                  {p.label}
                </span>
                <span className="text-[12px] font-mono text-slate-300 tabular-nums">
                  {formatHora(p.inicio)}–{formatHora(p.fin)}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                {enCurso ? '● activo' : tiempoFalt}
              </span>
            </div>
          )
        })}
      </div>

      <p className="mt-2 text-[9px] text-slate-600 italic">
        Mayor: pleno tránsito lunar (mayor actividad). Menor: salida/puesta de la luna.
      </p>
    </div>
  )
}

// ── Viento por hora (próximas 12 h) ──────────────────────────────────────────

function VientoHorarioCard({ horas }: { horas: HoraViento[] }) {
  if (horas.length === 0) return null
  const maxKt = Math.max(10, ...horas.map(h => h.speedKts))   // escala interna en kt
  const BAR_H = 48

  return (
    <div className="card-glass rounded-2xl px-4 pt-3 pb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-500">
          Viento próximas {horas.length}h
        </p>
        <p className="text-[10px] text-slate-600">km/h</p>
      </div>

      <div className="flex items-end gap-[3px] overflow-x-auto pb-1">
        {horas.map(h => {
          const heightPct = (h.speedKts / maxKt) * 100
          const color     = colorViento(h.speedKts)
          return (
            <div key={h.ts} className="flex flex-col items-center gap-1 min-w-[26px] flex-1">
              {/* Velocidad */}
              <span className="text-[10px] font-mono tabular-nums text-slate-300 leading-none">
                {kmh(h.speedKts)}
              </span>
              {/* Barra */}
              <div className="w-full flex items-end justify-center" style={{ height: BAR_H }}>
                <div
                  className="w-3 rounded-t-sm transition-all"
                  style={{ height: `${Math.max(2, heightPct)}%`, background: color }}
                />
              </div>
              {/* Dirección — flecha apunta hacia donde se mueve el viento */}
              <svg viewBox="0 0 16 16" width="11" height="11"
                   style={{ transform: `rotate(${h.dirDeg + 180}deg)` }}>
                <path d="M8 1 L4 12 L8 9 L12 12 Z" fill="#94a3b8"/>
              </svg>
              {/* Hora */}
              <span className="text-[8px] font-mono text-slate-600 leading-none">
                {h.hora}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Sol (sunrise / sunset con arco) ──────────────────────────────────────────

function SolCard({ sunriseTs, sunsetTs, sunrise, sunset, nowMs }: {
  sunriseTs?: number; sunsetTs?: number;
  sunrise?:   string | null; sunset?: string | null;
  nowMs:      number
}) {
  if (!sunriseTs || !sunsetTs) return null
  const dayLen   = sunsetTs - sunriseTs
  const totalMin = Math.round(dayLen / 60_000)
  const horas    = Math.floor(totalMin / 60)
  const mins     = totalMin % 60

  let pct = (nowMs - sunriseTs) / dayLen
  pct = Math.max(0, Math.min(1, pct))   // clamp
  const isDay = nowMs >= sunriseTs && nowMs <= sunsetTs

  // Arco
  const W = 200, H = 70
  // Path semicircular: M 10 60  Q 100 -10, 190 60
  // Punto del sol en el arco:
  const t   = pct
  const sx  = 10 + 180 * t
  // Cuadrática: B(t) = (1-t)²P0 + 2(1-t)t P1 + t² P2
  // P0=(10,60), P1=(100,-30), P2=(190,60)
  const sy  = (1 - t) * (1 - t) * 60 + 2 * (1 - t) * t * (-30) + t * t * 60

  return (
    <div className="card-glass rounded-2xl px-4 pt-3 pb-3 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-amber-300 text-base leading-none">☀</span>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-slate-500">Sol</p>
        </div>
        <p className="text-[11px] text-slate-500">
          Día <span className="text-slate-300 font-semibold">{horas}h {mins.toString().padStart(2,'0')}m</span>
        </p>
      </div>

      {/* Arco SVG */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="70" className="overflow-visible">
        <defs>
          <linearGradient id="solgrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#F59E0B" stopOpacity="0.18"/>
            <stop offset="50%"  stopColor="#F59E0B" stopOpacity="0.55"/>
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.18"/>
          </linearGradient>
        </defs>

        {/* Línea horizonte */}
        <line x1="0" y1="60" x2={W} y2="60" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>

        {/* Arco solar */}
        <path d="M 10 60 Q 100 -30, 190 60" fill="none"
              stroke="url(#solgrad)" strokeWidth="2" strokeLinecap="round"/>

        {/* Posición del sol */}
        {isDay && (
          <g>
            <circle cx={sx} cy={sy} r="9" fill="#F59E0B" opacity="0.25"/>
            <circle cx={sx} cy={sy} r="5" fill="#FBBF24" stroke="#0B1928" strokeWidth="1.5"/>
          </g>
        )}

        {/* Labels sunrise/sunset */}
        <text x="10" y="68"  textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="system-ui">↑ {sunrise}</text>
        <text x="190" y="68" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="system-ui">↓ {sunset}</text>
      </svg>
    </div>
  )
}

// ── Barómetro ────────────────────────────────────────────────────────────────

function BarometroCard({ hPa, tendencia }: { hPa: number; tendencia: TendenciaPresion }) {
  const arrow   = tendencia === 'subiendo' ? '↑' : tendencia === 'bajando' ? '↓' : '→'
  const color   = tendencia === 'subiendo' ? '#4ADE80' : tendencia === 'bajando' ? '#F87171' : '#94A3B8'
  const label   = tendencia === 'subiendo' ? 'Subiendo' : tendencia === 'bajando' ? 'Bajando' : 'Estable'
  const fishTip = tendencia === 'subiendo'
    ? 'Presión subiendo — buena señal para pescar'
    : tendencia === 'bajando'
    ? 'Presión cayendo — actividad puede bajar'
    : 'Presión estable — condiciones constantes'

  // Gauge: 980–1040 hPa window
  const pct = Math.min(100, Math.max(0, ((hPa - 980) / 60) * 100))

  return (
    <div className="card-glass rounded-2xl px-4 py-3 flex items-center gap-3">
      {/* Mini gauge arc */}
      <svg width="52" height="30" viewBox="0 0 52 30" className="shrink-0">
        {/* Background arc */}
        <path d="M 4 28 A 22 22 0 0 1 48 28" fill="none" stroke="#1E3A5F" strokeWidth="5" strokeLinecap="round"/>
        {/* Fill arc */}
        <path
          d="M 4 28 A 22 22 0 0 1 48 28"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${pct * 0.69} 100`}
        />
        <text x="26" y="27" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="system-ui">
          {hPa.toFixed(0)}
        </text>
      </svg>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-slate-500">Presión</p>
          <span className="text-[10px] font-mono text-slate-500">hPa</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{fishTip}</p>
      </div>

      {tendencia && (
        <div className="flex flex-col items-center gap-0 shrink-0">
          <span className="text-[22px] leading-none" style={{ color }}>{arrow}</span>
          <span className="text-[9px] font-semibold" style={{ color }}>{label}</span>
        </div>
      )}
    </div>
  )
}

// ── Gráfico de marea ─────────────────────────────────────────────────────────

function TideChart({ extremes, nowMs }: { extremes: ExtremoMarea[]; nowMs: number }) {
  if (extremes.length < 2) return null

  const W = 300, H = 72
  // Ventana: -4h a +20h (24h, "ahora" al 17% desde la izquierda)
  const WIN_START = nowMs - 4  * 3600_000
  const WIN_END   = nowMs + 20 * 3600_000

  // Generar curva con interpolación coseno entre extremos
  const sorted = [...extremes].sort((a, b) => a.ts - b.ts)
  const STEPS = 240
  const pts: [number, number][] = []

  for (let i = 0; i <= STEPS; i++) {
    const t = WIN_START + (WIN_END - WIN_START) * i / STEPS
    const prev = [...sorted].reverse().find(e => e.ts <= t)
    const next = sorted.find(e => e.ts > t)
    if (!prev || !next) continue
    const frac = (t - prev.ts) / (next.ts - prev.ts)
    const h = (prev.altura_m + next.altura_m) / 2 +
              (prev.altura_m - next.altura_m) / 2 * Math.cos(Math.PI * frac)
    const x = W * (t - WIN_START) / (WIN_END - WIN_START)
    pts.push([x, h])
  }

  if (pts.length < 2) return null

  const hs   = pts.map(p => p[1])
  const minH = Math.min(...hs)
  const maxH = Math.max(...hs)
  const PAD  = 8
  const toY  = (h: number) => H - PAD - ((h - minH) / (Math.max(maxH - minH, 0.01))) * (H - PAD * 2)

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${toY(p[1]).toFixed(1)}`).join(' ')
  const fillPath = linePath + ` L${pts.at(-1)![0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`

  const nowX = W * (nowMs - WIN_START) / (WIN_END - WIN_START)

  // Altura actual interpolada
  const prevNow = [...sorted].reverse().find(e => e.ts <= nowMs)
  const nextNow = sorted.find(e => e.ts > nowMs)
  let nowH = (minH + maxH) / 2
  if (prevNow && nextNow) {
    const f = (nowMs - prevNow.ts) / (nextNow.ts - prevNow.ts)
    nowH = (prevNow.altura_m + nextNow.altura_m) / 2 +
           (prevNow.altura_m - nextNow.altura_m) / 2 * Math.cos(Math.PI * f)
  }

  // Extremos visibles en la ventana
  const visibles = sorted.filter(e => e.ts >= WIN_START && e.ts <= WIN_END)

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00D1BD" stopOpacity="0.28"/>
            <stop offset="100%" stopColor="#00D1BD" stopOpacity="0.02"/>
          </linearGradient>
          <linearGradient id="tgr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00D1BD" stopOpacity="0.0"/>
            <stop offset="100%" stopColor="#00D1BD" stopOpacity="0.0"/>
          </linearGradient>
        </defs>

        {/* Fill */}
        <path d={fillPath} fill="url(#tg)" />
        {/* Curva */}
        <path d={linePath} fill="none" stroke="#00D1BD" strokeWidth="1.6" />

        {/* Línea "ahora" */}
        <line x1={nowX.toFixed(1)} y1="0" x2={nowX.toFixed(1)} y2={H}
              stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="3,4" />

        {/* Punto actual */}
        <circle cx={nowX.toFixed(1)} cy={toY(nowH).toFixed(1)} r="3.5"
                fill="#0B1928" stroke="#00D1BD" strokeWidth="2" />

        {/* Marcadores de extremos */}
        {visibles.map((e, i) => {
          const ex = (W * (e.ts - WIN_START) / (WIN_END - WIN_START)).toFixed(1)
          const ey = toY(e.altura_m).toFixed(1)
          const isHigh = e.tipo === 'Pleamar'
          return (
            <g key={i}>
              <circle cx={ex} cy={ey} r="3" fill={isHigh ? '#00D1BD' : '#334155'} stroke="#0B1928" strokeWidth="1"/>
            </g>
          )
        })}
      </svg>

      {/* Etiquetas de extremos */}
      <div className="relative h-5 mt-0.5">
        {visibles.map((e, i) => {
          const pct = ((e.ts - WIN_START) / (WIN_END - WIN_START)) * 100
          const isHigh = e.tipo === 'Pleamar'
          return (
            <div key={i}
                 className="absolute flex flex-col items-center -translate-x-1/2"
                 style={{ left: `${pct.toFixed(1)}%` }}>
              <span className={`text-[9px] font-mono leading-none ${isHigh ? 'text-teal-400' : 'text-slate-600'}`}>
                {e.hora}
              </span>
            </div>
          )
        })}
        {/* Etiqueta "ahora" */}
        <div className="absolute flex flex-col items-center -translate-x-1/2"
             style={{ left: `${((nowX / W) * 100).toFixed(1)}%` }}>
          <span className="text-[8px] text-white/30 leading-none">ahora</span>
        </div>
      </div>
    </div>
  )
}

// ── Pronóstico 5 días ────────────────────────────────────────────────────────

function PronosticoDia({ dia, isHoy }: { dia: { diaSemana: string; tempMax: number; tempMin: number; vientoKts: number; wmoCode: number }; isHoy: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 px-1 py-2 rounded-xl ${isHoy ? 'bg-white/[0.06]' : ''}`}>
      <p className={`text-[10px] font-semibold tracking-wide uppercase ${isHoy ? 'text-teal-400' : 'text-slate-500'}`}>
        {isHoy ? 'Hoy' : dia.diaSemana}
      </p>
      <span className="text-[22px] leading-none">{wmoEmoji(dia.wmoCode)}</span>
      <div className="flex flex-col items-center gap-0">
        <span className="text-[13px] font-semibold text-slate-200 leading-none">{dia.tempMax}°</span>
        <span className="text-[11px] text-slate-600 leading-none">{dia.tempMin}°</span>
      </div>
      <div className="flex items-center gap-0.5">
        <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#64748b" strokeWidth="2">
          <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
          <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
        </svg>
        <span className="text-[9px] font-mono text-slate-600">{kmh(dia.vientoKts)} km/h</span>
      </div>
    </div>
  )
}

// ── Alerta de condiciones peligrosas ─────────────────────────────────────────

interface Alerta {
  msg:   string
  nivel: 'peligroso' | 'precaucion'
}

function AlertaBanner({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {alertas.map((a, i) => {
        const peligroso = a.nivel === 'peligroso'
        return (
          <div key={i} className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${
            peligroso
              ? 'bg-red-500/15 border border-red-500/40'
              : 'bg-amber-500/15 border border-amber-500/40'
          }`}>
            <span className={`text-xl shrink-0 leading-none ${peligroso ? 'text-red-400' : 'text-amber-400'}`}>
              {peligroso ? '⚠' : '⚡'}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-[9px] font-bold tracking-[0.18em] uppercase ${
                peligroso ? 'text-red-400' : 'text-amber-400'
              }`}>
                {peligroso ? 'Alerta' : 'Precaución'}
              </p>
              <p className={`text-[13px] font-medium leading-snug ${
                peligroso ? 'text-red-200' : 'text-amber-200'
              }`}>{a.msg}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── App ──────────────────────────────────────────────────────────────────────

function App() {
  const hoy = useMemo(() => new Date(), [])
  const { location, setLocation, recents, removeRecent } = useLocation()
  const [pickerOpen,    setPickerOpen]    = useState(false)
  const [tab,           setTab]           = useState<Tab>('inicio')
  const [updateVisible, setUpdateVisible] = useState(true)
  const [scoreOpen,     setScoreOpen]     = useState(false)
  const [notasVisible,  setNotasVisible]  = useState(() => {
    try { return localStorage.getItem('notasVersionVistas') !== APP_VERSION }
    catch { return false }
  })
  const appUpdate = useAppUpdate()

  function cerrarNotas() {
    try { localStorage.setItem('notasVersionVistas', APP_VERSION) } catch {}
    setNotasVisible(false)
  }
  // Live timestamp — updates every 60 s so tide chart cursor moves
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const luna        = useMemo(() => calcularLuna(hoy), [hoy])
  const viento      = useWind(location.lat, location.lon)
  const vientoHr    = useWindHourly(location.lat, location.lon, 12)
  const marea       = useTide(location.lat, location.lon)
  const tideChart   = useTideChart(location.lat, location.lon)
  const presion     = usePresion(location.lat, location.lon)
  const pronostico  = usePronostico(location.lat, location.lon)
  const diaHoy      = hoy.getDate()

  // Períodos solunares (calculados para hoy + mañana, próximos 3)
  const solunar = useMemo(() => {
    const todos: PeriodoSolunar[] = []
    pronostico.dias.slice(0, 2).forEach(d => {
      if (d.sunriseTs && d.sunsetTs) {
        todos.push(...calcularPeriodosSolunares(d.sunriseTs, d.sunsetTs, luna.edadDias))
      }
    })
    todos.sort((a, b) => a.inicio - b.inicio)
    return {
      proximos: proximosPeriodos(todos, nowMs, 3),
      enCurso:  periodoEnCurso(todos, nowMs),
    }
  }, [pronostico.dias, luna.edadDias, nowMs])

  // Current tide height (cosine interpolation from chart extremes)
  const alturaActual = useMemo(() => {
    if (tideChart.extremes.length < 2) return null
    const sorted = [...tideChart.extremes].sort((a, b) => a.ts - b.ts)
    const prevE  = [...sorted].reverse().find(e => e.ts <= nowMs)
    const nextE  = sorted.find(e => e.ts > nowMs)
    if (!prevE || !nextE) return null
    const f = (nowMs - prevE.ts) / (nextE.ts - prevE.ts)
    return (prevE.altura_m + nextE.altura_m) / 2 +
           (prevE.altura_m - nextE.altura_m) / 2 * Math.cos(Math.PI * f)
  }, [tideChart.extremes, nowMs])

  const condiciones = useMemo(() => calcularCondiciones({
    fase:       luna.fase,
    maxKts:     viento.data?.max ?? null,
    extremos:   marea.data ?? [],
    presionHPa: presion.hPa,
    nowMs,
  }), [luna.fase, viento.data, marea.data, presion.hPa, nowMs])

  const ventanas = useMemo(() =>
    calcularVentanas(marea.data ?? [], nowMs, luna.fase),
  [marea.data, nowMs, luna.fase])

  // Alerta por viento fuerte / sudestada / tormentas
  const alertas = useMemo((): Alerta[] => {
    const lista: Alerta[] = []
    if (viento.data) {
      const { max, cuadrante } = viento.data
      const esSudestada = cuadrante === 'SE' || cuadrante === 'S'
      if (max >= 25 && esSudestada) {
        lista.push({ msg: `Posible sudestada — viento del ${cuadrante} a ${kmh(max)} km/h`, nivel: 'peligroso' })
      } else if (max >= 25) {
        lista.push({ msg: `Viento muy fuerte — ${kmh(max)} km/h del ${cuadrante}`, nivel: 'peligroso' })
      } else if (max >= 20) {
        lista.push({ msg: `Viento fuerte — ${kmh(max)} km/h del ${cuadrante}`, nivel: 'precaucion' })
      }
    }
    const wmo = pronostico.dias[0]?.wmoCode
    if (wmo != null && wmo >= 95) {
      lista.push({ msg: 'Tormentas eléctricas previstas hoy', nivel: 'peligroso' })
    } else if (wmo != null && wmo >= 80) {
      lista.push({ msg: 'Lluvias intensas previstas para hoy', nivel: 'precaucion' })
    }
    return lista
  }, [viento.data, pronostico.dias])

  // Próxima marea (pleamar o bajamar) con cuenta regresiva
  const proximaMarea = useMemo(() => {
    if (!tideChart.extremes.length) return null
    const sorted = [...tideChart.extremes].sort((a, b) => a.ts - b.ts)
    const next = sorted.find(e => e.ts > nowMs)
    if (!next) return null
    const diffMs  = next.ts - nowMs
    const horas   = Math.floor(diffMs / 3_600_000)
    const minutos = Math.round((diffMs % 3_600_000) / 60_000)
    return { tipo: next.tipo, horas, minutos, altura_m: next.altura_m, hora: next.hora }
  }, [tideChart.extremes, nowMs])

  return (
    <div className="flex flex-col min-h-screen pb-nav">

      {/* ── INICIO ─────────────────────────────────── */}
      {tab === 'inicio' && (
        <div className="fixed inset-0 bottom-nav flex flex-col bg-[#0B1928]">

          <AppHeader
            fecha={hoy}
            locationName={location.name}
            onLocationClick={() => setPickerOpen(true)}
            scoreColor={condiciones.color}
            onScoreClick={() => setScoreOpen(true)}
            extra={
              appUpdate.update && !updateVisible ? (
                <button
                  onClick={() => setUpdateVisible(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 text-[11px] font-semibold"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shrink-0" />
                  Actualizar
                </button>
              ) : undefined
            }
          />

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-md mx-auto w-full px-4 pt-4 pb-6 flex flex-col gap-3">

          {/* ALERTAS */}
          <AlertaBanner alertas={alertas} />

          {/* CONDICIONES DE PESCA */}
          <Card title="Condiciones de Pesca">
            <div className="flex items-center gap-0">
              <button
                onClick={() => setScoreOpen(true)}
                className="shrink-0 flex flex-col items-center pr-3 active:opacity-70"
              >
                <GaugePesca score={condiciones.score} color={condiciones.color} etiqueta={condiciones.etiqueta} />
                <p className="text-[11px] text-slate-500 text-center max-w-[100px] leading-tight -mt-1">
                  {condiciones.explicacion}
                </p>
              </button>
              <div className="self-stretch w-px bg-white/[0.08] shrink-0" />
              <div className="flex-1 flex flex-col gap-3.5 pl-4">
                {condiciones.condiciones.map(c => (
                  <CondicionRow key={c.label} {...c} />
                ))}
              </div>
            </div>
          </Card>

          {/* MEJOR VENTANA DE PESCA */}
          {ventanas.length > 0 && (
            <Card title="Mejor Ventana de Pesca">
              <div className="grid grid-cols-2 gap-2">
                {ventanas.map((v, i) => <VentanaCard key={i} v={v} />)}
              </div>
            </Card>
          )}

          {/* PERIODOS SOLUNARES */}
          {solunar.proximos.length > 0 && (
            <SolunarCard
              periodos={solunar.proximos}
              periodoActual={solunar.enCurso}
              nowMs={nowMs}
            />
          )}

          {/* PRONÓSTICO 6 DÍAS — clickeable → tab Clima */}
          {pronostico.dias.length > 0 && (
            <button
              type="button"
              onClick={() => setTab('clima')}
              className="text-left transition-opacity active:opacity-70"
            >
              <Card title="Pronóstico" headerExtra={
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  Ver más
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6"/>
                  </svg>
                </span>
              }>
                <div className="grid grid-cols-6 gap-1">
                  {pronostico.dias.map((d, i) => (
                    <PronosticoDia key={d.fecha} dia={d} isHoy={i === 0} />
                  ))}
                </div>
              </Card>
            </button>
          )}

          {/* SOL */}
          {pronostico.dias[0] && (
            <SolCard
              sunrise={pronostico.dias[0].sunrise}
              sunset={pronostico.dias[0].sunset}
              sunriseTs={pronostico.dias[0].sunriseTs}
              sunsetTs={pronostico.dias[0].sunsetTs}
              nowMs={nowMs}
            />
          )}

          {/* VIENTO POR HORA */}
          {vientoHr.horas.length > 0 && (
            <VientoHorarioCard horas={vientoHr.horas} />
          )}

          {/* MAREA con gráfico */}
          <Card title="Marea">
            {marea.loading && <p className="text-slate-500 text-xs">Cargando…</p>}
            {marea.error && <p className="text-red-400 text-xs">Sin datos de marea</p>}
            {!marea.loading && !marea.error && marea.unsupported && (
              <p className="text-slate-500 text-xs">Esta ubicación no tiene datos de marea.</p>
            )}
            {marea.data && marea.data.length > 0 && (
              <>
                {/* Altura actual + próxima marea */}
                {alturaActual != null && (
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-end gap-1.5">
                      <span className="text-[36px] font-mono font-semibold text-teal-300 leading-none tabular-nums">
                        {alturaActual.toFixed(2)}
                      </span>
                      <span className="text-[13px] text-slate-500 mb-1">m ahora</span>
                      {(() => {
                        const sorted = [...tideChart.extremes].sort((a, b) => a.ts - b.ts)
                        const next = sorted.find(e => e.ts > nowMs)
                        if (!next) return null
                        const isRising = next.tipo === 'Pleamar'
                        return (
                          <span className={`text-[20px] mb-0.5 ${isRising ? 'text-teal-400' : 'text-slate-500'}`}>
                            {isRising ? '↑' : '↓'}
                          </span>
                        )
                      })()}
                    </div>
                    {proximaMarea && (
                      <div className="flex flex-col items-end shrink-0 mt-0.5">
                        <p className="text-[9px] font-semibold tracking-[0.14em] uppercase text-slate-600">
                          Próx. {proximaMarea.tipo === 'Pleamar' ? 'pleamar' : 'bajamar'}
                        </p>
                        <p className={`text-[17px] font-mono font-semibold leading-tight tabular-nums ${
                          proximaMarea.tipo === 'Pleamar' ? 'text-teal-400' : 'text-slate-400'
                        }`}>
                          {proximaMarea.horas > 0 ? `${proximaMarea.horas}h ` : ''}{proximaMarea.minutos}m
                        </p>
                        <p className="text-[10px] font-mono text-slate-600">
                          {proximaMarea.hora} · {proximaMarea.altura_m.toFixed(1)} m
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Extremos (panel numérico) */}
                <div className="grid grid-cols-4 gap-1">
                  {marea.data.map((m, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 text-center px-1">
                      <span className={`text-xs font-semibold tracking-wide leading-none ${
                        m.tipo === 'Pleamar' ? 'text-teal-400' : 'text-slate-500'
                      }`}>
                        {m.tipo === 'Pleamar' ? '▲' : '▼'}
                      </span>
                      <span className={`text-[11px] font-medium leading-none ${
                        m.tipo === 'Pleamar' ? 'text-teal-400/80' : 'text-slate-500'
                      }`}>
                        {m.tipo === 'Pleamar' ? 'Alta' : 'Baja'}
                      </span>
                      <span className="text-[15px] font-mono text-slate-200 leading-tight mt-0.5">
                        {m.hora}
                        {m.dia !== diaHoy && (
                          <span className="text-[10px] text-slate-500">
                            {' '}{new Date(m.ts).toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')}
                          </span>
                        )}
                      </span>
                      <span className="text-[15px] font-semibold text-slate-100 leading-tight">
                        {m.altura_m.toFixed(1)}<span className="text-[11px] text-slate-500 font-normal"> m</span>
                      </span>
                    </div>
                  ))}
                </div>

                {/* Gráfico de curva */}
                {tideChart.extremes.length >= 2 && (
                  <TideChart extremes={tideChart.extremes} nowMs={nowMs} />
                )}

                <p className="mt-2 text-[10px] text-slate-600 italic">
                  Datos de Open-Meteo — referencial, no apto para navegación
                </p>
              </>
            )}
          </Card>

          {/* BARÓMETRO */}
          {presion.hPa != null && (
            <BarometroCard hPa={presion.hPa} tendencia={presion.tendencia} />
          )}

          {/* LUNA + VIENTO */}
          <div className="grid grid-cols-2 gap-3">
            <section className="card-glass rounded-2xl p-4 flex flex-col gap-2">
              <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-500 select-none">Luna</h2>
              <MoonPhaseIcon edadDias={luna.edadDias} size={40} />
              <p className="text-[13px] font-semibold text-slate-200 leading-snug">{luna.fase}</p>
              <p className="text-xs text-slate-500">{Math.round(luna.iluminacion * 100)}% iluminada</p>
            </section>

            <section className="card-glass rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-500 select-none">Viento</h2>
                <span className="text-[9px] text-slate-600 font-mono">km/h</span>
              </div>
              {viento.loading && <p className="text-slate-500 text-xs">Cargando…</p>}
              {viento.error   && <p className="text-red-400 text-xs">Sin datos</p>}
              {viento.data && (
                <div className="flex items-center justify-between gap-1 mt-1">
                  <div className="flex-1 flex flex-col items-center gap-0.5">
                    <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">MÍN</p>
                    <p className="text-[22px] font-mono text-slate-100 leading-none">{kmh(viento.data.min)}</p>
                  </div>
                  <div className="w-px h-10 bg-white/[0.08] shrink-0" />
                  <div className="flex-1 flex flex-col items-center gap-0.5">
                    <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">MÁX</p>
                    <p className="text-[22px] font-mono text-slate-100 leading-none">{kmh(viento.data.max)}</p>
                  </div>
                  <div className="w-px h-10 bg-white/[0.08] shrink-0" />
                  <div className="flex-1 flex flex-col items-center gap-0.5">
                    <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">DIR</p>
                    <FlechaViento grados={viento.data.direccion_grados} />
                    <p className="text-[13px] font-mono text-slate-100 leading-none">{viento.data.cuadrante}</p>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => setTab('mapa')}
            className="mt-2 w-full rounded-2xl py-4 text-base font-semibold tracking-wide text-slate-900 transition-opacity active:opacity-80"
            style={{ background: 'linear-gradient(135deg, #00D1BD 0%, #00967F 100%)' }}
          >
            Iniciar salida
          </button>

          </div>{/* /max-w-md */}
          </div>{/* /scroll */}
        </div>
      )}

      {/* ── MAPA NÁUTICO ───────────────────────────── */}
      {tab === 'mapa' && (
        <div className="fixed inset-0 bottom-nav flex flex-col">
          <MapaNautico />
        </div>
      )}

      {/* ── CLIMA ──────────────────────────────────── */}
      {tab === 'clima' && (
        <div className="fixed inset-0 bottom-nav flex flex-col">
          <Clima
            location={location}
            onLocationClick={() => setPickerOpen(true)}
            pronostico={pronostico}
            vientoHorario={vientoHr.horas}
          />
        </div>
      )}

      {/* ── SALIDAS / BITÁCORA ─────────────────────── */}
      {tab === 'salidas' && (
        <div className="fixed inset-0 bottom-nav flex flex-col">
          <Salidas
            onIniciarSalida={() => setTab('mapa')}
            locationName={location.name}
            onLocationClick={() => setPickerOpen(true)}
          />
        </div>
      )}

      {/* ── PICKER ─────────────────────────────────── */}
      <LocationPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        current={location}
        recents={recents}
        onSelect={setLocation}
        onRemoveRecent={removeRecent}
      />

      {/* ── ACTUALIZAR ─────────────────────────────── */}
      {appUpdate.update && updateVisible && (
        <ActualizarModal
          update={appUpdate.update}
          progreso={appUpdate.progreso}
          instalando={appUpdate.instalando}
          error={appUpdate.error}
          onInstalar={appUpdate.instalar}
          onCerrar={() => {
            appUpdate.cancelar()
            setUpdateVisible(false)
          }}
        />
      )}

      {/* ── SCORE DESGLOSE ─────────────────────────── */}
      {scoreOpen && (
        <ScoreModal
          condiciones={condiciones}
          onCerrar={() => setScoreOpen(false)}
        />
      )}

      {/* ── NOTAS DE VERSIÓN ───────────────────────── */}
      {notasVisible && (
        <NotasVersionModal
          notas={NOTAS_ACTUALES}
          onCerrar={cerrarNotas}
        />
      )}

      {/* ── NAV ────────────────────────────────────── */}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}

export default App
