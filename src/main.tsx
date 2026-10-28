import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './components/ui/Toaster'
import { ConfirmProvider } from './components/ui/Confirm'
import { applyTheme, savedTheme } from './lib/theme'

// apply the saved theme before the first paint
applyTheme(savedTheme())

// remember whether the last input was a pointer or the keyboard, so focus rings
// show for keyboard users only (see index.css)
const setInput = (kind: 'pointer' | 'keyboard') => { document.documentElement.dataset.input = kind }
addEventListener('pointerdown', () => setInput('pointer'), true)
addEventListener('keydown', e => { if (!e.metaKey && !e.ctrlKey) setInput('keyboard') }, true)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>,
)
