import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Icon, type IconName } from './Icon'
import { Tooltip } from './Tooltip'
import type { Side } from './popover'

/*
 * One button, three levels of emphasis:
 * - primary:   actions (filled).
 * - secondary: outlined, for Cancel/Delete next to primary actions.
 * - tertiary:  text only, for low-emphasis buttons and icon buttons.
 * Conventions: actions are primary; Cancel and Delete are secondary or
 * tertiary. `danger` colours any variant for destructive actions.
 * `icon` puts an SVG icon before the text. Icon-only buttons (`iconOnly`)
 * must pass `label`, which becomes both the accessible name and the tooltip.
 */

export type Variant = 'primary' | 'secondary' | 'tertiary'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'md' | 'sm'
  danger?: boolean
  icon?: IconName
  iconOnly?: boolean
  label?: string
  tip?: string
  tipSide?: Side
  children?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

export const btnClass = (variant: Variant = 'secondary', { size = 'md', danger = false, iconOnly = false, extra = '' } = {}) =>
  ['btn', `btn-${variant}`, size === 'sm' && 'btn-sm', danger && 'btn-danger', iconOnly && 'btn-icon', extra].filter(Boolean).join(' ')

export function Button({ variant = 'secondary', size = 'md', danger, icon, iconOnly, label, tip, tipSide, className, type = 'button', children, ...rest }: Props) {
  const button = (
    <button {...rest} type={type} aria-label={label ?? rest['aria-label']} className={btnClass(variant, { size, danger, iconOnly, extra: className })}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  )
  const text = tip ?? (iconOnly ? label : undefined)
  return text ? <Tooltip text={text} side={tipSide}>{button}</Tooltip> : button
}
