import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { msg, type MsgKey, type ToastType, type Vars } from '../../lib/messages'
import { Icon, type IconName } from './Icon'

/*
 * Toasts confirm that something happened (success, info) or explain why it
 * didn't (warning, error). The words come from messages.json via a key:
 *   toast('card.deleted', {}, { action: { label: 'Undo', run: restore } })
 * Up to 3 at a time, newest at the bottom. They pause while hovered or
 * focused, and warnings stay a little longer so there's time to read them.
 */

interface ToastAction { label: string; run: () => void }
interface Toast { id: number; type: ToastType; text: string; action?: ToastAction }
type Notify = (key: MsgKey, vars?: Vars, opts?: { action?: ToastAction }) => void

const ToastContext = createContext<Notify>(() => {})
export const useToast = () => useContext(ToastContext)

const ICON: Record<ToastType, IconName> = { success: 'check', info: 'info', warning: 'alert', error: 'x' }
const TIME: Record<ToastType, number> = { success: 3500, info: 4000, warning: 6000, error: 8000 }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const next = useRef(1)
  const dismiss = useCallback((id: number) => setToasts(ts => ts.filter(t => t.id !== id)), [])
  const notify = useCallback<Notify>((key, vars, opts) => {
    const m = msg(key, vars)
    const id = next.current++
    // the same message twice in a row replaces the first instead of stacking
    setToasts(ts => [...ts.filter(t => t.text !== m.text), { id, ...m, action: opts?.action }].slice(-3))
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <section className="toaster" aria-label="Notifications">
        {toasts.map(t => <ToastItem key={t.id} toast={t} dismiss={dismiss} />)}
      </section>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false)
  const onDone = useCallback(() => dismiss(toast.id), [dismiss, toast.id])
  const time = toast.action ? Math.max(TIME[toast.type], 6000) : TIME[toast.type]
  useEffect(() => {
    if (paused) return
    const t = setTimeout(onDone, time)
    return () => clearTimeout(t)
  }, [paused, time, onDone])

  const urgent = toast.type === 'warning' || toast.type === 'error'
  return (
    <div
      className={`toast toast--${toast.type}`}
      role={urgent ? 'alert' : 'status'}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="toast-icon"><Icon name={ICON[toast.type]} size={14} /></span>
      <span className="toast-text">{toast.text}</span>
      {toast.action && (
        <button type="button" className="btn btn-tertiary btn-sm toast-action" onClick={() => { toast.action!.run(); onDone() }}>
          <Icon name="undo" size={14} />{toast.action.label}
        </button>
      )}
      <button type="button" className="btn btn-tertiary btn-sm btn-icon toast-close" aria-label="Dismiss" onClick={onDone}><Icon name="x" size={14} /></button>
    </div>
  )
}
