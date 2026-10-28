import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArcElement, BarController, BarElement, CategoryScale, Chart, Legend, LinearScale, PieController, Tooltip,
} from 'chart.js'
import { UNASSIGNED, type ActionItem } from '../types'
import { localDate } from './Actions'
import { Segmented } from './ui/Segmented'
import { Select } from './ui/Select'

/*
 * Open actions per owner, as a bar chart (overdue / on track, stacked) or a
 * pie chart (each owner's share). A "Due" filter narrows it to a timeline.
 * Clicking a bar or slice filters the list below by that owner.
 * Colours come from the app's CSS tokens, so the chart follows the theme.
 */

Chart.register(BarController, BarElement, CategoryScale, LinearScale, PieController, ArcElement, Tooltip, Legend)

type Kind = 'bar' | 'pie'
type Range = 'all' | 'overdue' | 'week' | 'month' | 'none'

const RANGES: { value: Range; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'month', label: 'Next 30 days' },
  { value: 'none', label: 'No due date' },
]

const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return localDate(d) }

/** A CSS colour token (which may use light-dark()) resolved to the colour actually in use. */
function token(name: string) {
  const probe = document.createElement('span')
  probe.style.color = `var(${name})`
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const colour = getComputedStyle(probe).color
  probe.remove()
  return colour
}

/** The same colour, see-through: for owners that aren't selected. */
const faded = (rgb: string) => rgb.replace(/^rgb\((.+)\)$/, 'rgba($1, 0.3)')

/** Changes whenever the light/dark theme does, so the chart can repaint. */
function useThemeVersion() {
  const [v, setV] = useState(0)
  useEffect(() => {
    const bump = () => setV(x => x + 1)
    const media = matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', bump)
    const watch = new MutationObserver(bump)
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { media.removeEventListener('change', bump); watch.disconnect() }
  }, [])
  return v
}

interface Props {
  actions: ActionItem[]
  selected: string
  onPickOwner: (owner: string) => void
}

export default function OwnerChart({ actions, selected, onPickOwner }: Props) {
  const [kind, setKind] = useState<Kind>('bar')
  const [range, setRange] = useState<Range>('all')
  const canvas = useRef<HTMLCanvasElement>(null)
  const theme = useThemeVersion()

  const data = useMemo(() => {
    const t = localDate(), week = inDays(7), month = inDays(30)
    const inRange = (a: ActionItem) =>
      range === 'all' ? true
        : range === 'overdue' ? !!a.due && a.due < t
          : range === 'week' ? !!a.due && a.due >= t && a.due <= week
            : range === 'month' ? !!a.due && a.due >= t && a.due <= month
              : !a.due
    const per = new Map<string, { overdue: number; onTrack: number }>()
    for (const a of actions.filter(inRange)) {
      const who = a.owner || UNASSIGNED
      const row = per.get(who) ?? { overdue: 0, onTrack: 0 }
      if (a.due && a.due < t) row.overdue++
      else row.onTrack++
      per.set(who, row)
    }
    const rows = [...per.entries()]
      .map(([owner, c]) => ({ owner, ...c, total: c.overdue + c.onTrack }))
      .sort((a, b) => b.total - a.total || a.owner.localeCompare(b.owner))
    return {
      rows,
      total: rows.reduce((n, r) => n + r.total, 0),
      overdue: rows.reduce((n, r) => n + r.overdue, 0),
    }
  }, [actions, range])

  useEffect(() => {
    if (!canvas.current || !data.rows.length) return
    const text = token('--text-2'), line = token('--line'), panel = token('--panel'), danger = token('--danger')
    const palette = ['--accent', '--c0', '--c1', '--c2', '--c3', '--warning', '--text-3'].map(token)
    const labels = data.rows.map(r => r.owner)
    const dim = (i: number) => selected && labels[i] !== selected
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily

    const chart = new Chart(canvas.current, {
      type: kind,
      data: kind === 'bar'
        ? {
            labels,
            datasets: [
              { label: 'Overdue', data: data.rows.map(r => r.overdue), backgroundColor: labels.map((_, i) => dim(i) ? faded(danger) : danger), borderRadius: 6, maxBarThickness: 48 },
              { label: 'On track', data: data.rows.map(r => r.onTrack), backgroundColor: labels.map((_, i) => dim(i) ? faded(palette[0]) : palette[0]), borderRadius: 6, maxBarThickness: 48 },
            ],
          }
        : {
            labels,
            datasets: [{
              data: data.rows.map(r => r.total),
              backgroundColor: labels.map((_, i) => palette[i % palette.length]),
              borderColor: panel,
              borderWidth: 2,
              offset: labels.map(l => (l === selected ? 14 : 0)),
            }],
          },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reduceMotion ? false : { duration: 300 },
        plugins: {
          legend: { position: kind === 'bar' ? 'top' : 'right', labels: { color: text, boxWidth: 12, boxHeight: 12, useBorderRadius: true, borderRadius: 3 } },
          tooltip: {
            callbacks: kind === 'bar'
              ? { footer: items => `${data.rows[items[0].dataIndex].total} open in total` }
              : { label: item => ` ${item.label}: ${item.raw} open` },
          },
        },
        scales: kind === 'bar'
          ? {
              x: { stacked: true, ticks: { color: text }, grid: { display: false }, border: { color: line } },
              y: { stacked: true, beginAtZero: true, ticks: { color: text, precision: 0 }, grid: { color: line }, border: { display: false } },
            }
          : {},
        onClick: (_e, els) => { if (els[0]) onPickOwner(labels[els[0].index]) },
        onHover: (e, els) => { const t = e.native?.target as HTMLElement | undefined; if (t) t.style.cursor = els.length ? 'pointer' : 'default' },
      },
    })
    return () => chart.destroy()
  }, [data, kind, theme, selected, onPickOwner])

  const rangeLabel = RANGES.find(r => r.value === range)!.label
  const summary = `${data.total} open action${data.total === 1 ? '' : 's'}${data.overdue ? `, ${data.overdue} overdue` : ''}`

  return (
    <section className="chart-box" aria-labelledby="owner-chart-title">
      <header className="chart-head">
        <div>
          <h2 id="owner-chart-title">Open actions by owner</h2>
          <p className="text-tertiary">{summary} · Due: {rangeLabel.toLowerCase()}</p>
        </div>
        <div className="chart-controls">
          <Select label="Due" size="sm" value={range} onChange={v => setRange(v as Range)} options={RANGES} />
          <Segmented
            label="Chart type"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'bar', label: 'Bar', icon: 'barChart', tip: 'Overdue and on-track actions per owner' },
              { value: 'pie', label: 'Pie', icon: 'pieChart', tip: "Each owner's share of open actions" },
            ]}
          />
        </div>
      </header>
      <div className="chart-canvas">
        {data.rows.length
          ? <canvas ref={canvas} role="img" aria-label={`${kind === 'bar' ? 'Bar' : 'Pie'} chart: ${data.rows.map(r => `${r.owner} ${r.total}`).join(', ')}`} />
          : <p className="chart-empty text-secondary">No open actions {range === 'all' ? 'yet' : `due ${rangeLabel.toLowerCase()}`}.</p>}
      </div>
      {data.rows.length > 0 && (
        <>
          <table className="sr-only">
            <caption>Open actions by owner, due {rangeLabel.toLowerCase()}</caption>
            <thead><tr><th>Owner</th><th>Overdue</th><th>On track</th><th>Total</th></tr></thead>
            <tbody>{data.rows.map(r => <tr key={r.owner}><td>{r.owner}</td><td>{r.overdue}</td><td>{r.onTrack}</td><td>{r.total}</td></tr>)}</tbody>
          </table>
          <p className="chart-hint text-tertiary">Click a {kind === 'bar' ? 'bar' : 'slice'} to show only that owner's actions below.</p>
        </>
      )}
    </section>
  )
}
