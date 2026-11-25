import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/shared/styles/global.css'
import { App } from '@/app/App'
import { setupNotifications } from '@/features/notifications'
import { initTheme } from '@/shared/lib/theme'

initTheme()
setupNotifications()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
