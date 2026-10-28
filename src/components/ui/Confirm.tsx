import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Icon, type IconName } from './Icon'

/*
 * Ask before doing something that can't be taken back:
 *   if (await confirm({ title: 'Delete this action?', message: '…', confirmLabel: 'Delete' })) …
 * Uses the native <dialog> element, so focus stays inside it, Esc cancels,
 * and focus returns to where it was when it closes. The safe choice
 * (Keep) has focus when it opens.
 */

interface Ask {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  icon?: IconName
  danger?: boolean
}
type ConfirmFn = (ask: Ask) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn>(async () => false)
export const useConfirm = () => useContext(ConfirmContext)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [ask, setAsk] = useState<Ask>()
  const resolver = useRef<(ok: boolean) => void>(undefined)
  const dialog = useRef<HTMLDialogElement>(null)
  const keep = useRef<HTMLButtonElement>(null)

  const confirm = useCallback<ConfirmFn>(a => new Promise(resolve => {
    resolver.current?.(false)
    resolver.current = resolve
    setAsk(a)
  }), [])

  useEffect(() => {
    const d = dialog.current
    if (!ask || !d) return
    if (!d.open) d.showModal()
    keep.current?.focus()
  }, [ask])

  const close = (ok: boolean) => {
    dialog.current?.close()
    resolver.current?.(ok)
    resolver.current = undefined
    setAsk(undefined)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialog}
        className="confirm"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onCancel={e => { e.preventDefault(); close(false) }}
        onClick={e => { if (e.target === dialog.current) close(false) }}
      >
        {ask && (
          <div className="confirm-body">
            <span className={`confirm-icon ${ask.danger ? 'is-danger' : ''}`}><Icon name={ask.icon ?? 'alert'} size={20} /></span>
            <div>
              <h2 id="confirm-title">{ask.title}</h2>
              <p id="confirm-message" className="text-secondary">{ask.message}</p>
            </div>
            <div className="confirm-actions">
              <Button ref={keep} variant="secondary" icon="x" onClick={() => close(false)}>{ask.cancelLabel ?? 'Keep it'}</Button>
              <Button variant="primary" danger={ask.danger} icon={ask.icon ?? 'check'} onClick={() => close(true)}>{ask.confirmLabel}</Button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  )
}
