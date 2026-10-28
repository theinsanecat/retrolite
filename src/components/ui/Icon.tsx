import type { ReactNode } from 'react'

/*
 * A small inline SVG icon set (24×24 grid, 2px strokes, rounded caps), drawn
 * for Retrolite. Icons use currentColor, so they take the colour of the button
 * or text they sit in, in light and dark themes alike.
 */

const dot = (cx: number, cy: number) => <circle cx={cx} cy={cy} r="1.4" fill="currentColor" stroke="none" />

const PATHS = {
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6 9 17l-5-5" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  vote: <path d="M12 6l7 11H5z" fill="currentColor" stroke="none" />,
  link: <><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" /></>,
  unlink: <><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" /><path d="M3 3l18 18" /></>,
  notes: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 2.5h6v3H9zM9 11h6M9 15h4" /></>,
  download: <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  upload: <path d="M12 21V9M7 14l5-5 5 5M5 3h14" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3" />,
  pencil: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  reset: <path d="M4 4v6h6M5 15a8 8 0 1 0 1.9-8.3L4 10" />,
  more: <>{dot(5, 12)}{dot(12, 12)}{dot(19, 12)}</>,
  grip: <>{dot(9, 6)}{dot(15, 6)}{dot(9, 12)}{dot(15, 12)}{dot(9, 18)}{dot(15, 18)}</>,
  groupUnder: <path d="M4 5h9M8 5v8a3 3 0 0 0 3 3h9M17 13l3 3-3 3" />,
  takeOut: <path d="M20 19h-9M16 19v-8a3 3 0 0 0-3-3H4M7 5 4 8l3 3" />,
  ungroup: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /><path d="M14 7h4v4M10 17H6v-4" /></>,
  sparkle: <path d="M12 3l2 5.5 5.5 2-5.5 2L12 18l-2-5.5-5.5-2 5.5-2zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  auto: <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  alert: <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
  barChart: <path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" />,
  pieChart: <><path d="M12 3a9 9 0 1 0 9 9h-9z" /><path d="M15 3.5A9 9 0 0 1 20.5 9H15z" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  overview: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  sprintBoard: <><rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="M7.5 7.5v7M12 7.5v10M16.5 7.5v4" /></>,
  undo: <path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 16, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
