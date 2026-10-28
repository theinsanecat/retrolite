import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Tooltip } from './Tooltip'
import type { Side } from './popover'

/*
 * One button, three levels of emphasis:
 * - primary:   the main action on a screen (filled). One per area.
 * - secondary: other actions (outlined).
 * - tertiary:  low-emphasis actions and icon buttons (text only).
 * `danger` colours any of them for destructive actions. Icon-only buttons
 * must pass `label`, which becomes both the accessible name and the tooltip.
 */

export type Variant = 'primary' | 'secondary' | 'tertiary'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'md' | 'sm'
  danger?: boolean
  icon?: boolean
  label?: string
  tip?: string
  tipSide?: Side
  children: ReactNode
}

export const btnClass = (variant: Variant = 'secondary', { size = 'md', danger = false, icon = false, extra = '' } = {}) =>
  ['btn', `btn-${variant}`, size === 'sm' && 'btn-sm', danger && 'btn-danger', icon && 'btn-icon', extra].filter(Boolean).join(' ')

export function Button({ variant = 'secondary', size = 'md', danger, icon, label, tip, tipSide, className, type = 'button', children, ...rest }: Props) {
  const button = (
    <button {...rest} type={type} aria-label={label ?? rest['aria-label']} className={btnClass(variant, { size, danger, icon, extra: className })}>
      {children}
    </button>
  )
  const text = tip ?? (icon ? label : undefined)
  return text ? <Tooltip text={text} side={tipSide}>{button}</Tooltip> : button
}
