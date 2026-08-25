import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { bootstrapThemeFromCache } from './lib/settingsStore'

// Applies the last-known theme (light/dark/system) before React renders
// anything, using a localStorage cache rather than waiting on Supabase —
// otherwise every page load, including pre-login screens, briefly flashes
// light mode before AuthContext's settings fetch resolves.
bootstrapThemeFromCache()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Registers the service worker that receives Web Push events (see
// public/sw.js). Safe to call unconditionally — unsupported browsers just
// skip it, and re-registering an unchanged worker is a no-op.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
