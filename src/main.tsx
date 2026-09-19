import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@/lib/amplify'
import '@aws-amplify/ui-react/styles.css'
import '@/index.css'
import App from '@/App'

registerSW({ immediate: true })

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)