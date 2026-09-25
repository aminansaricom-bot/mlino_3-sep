import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import './design/roshan.css'
import App from './App.tsx'
import { useLocale } from './i18n'
import { AutoSwitchNotice } from './i18n/LanguageUi'
import { installWebBackGuard } from './native/bridge'

// The whole app re-renders in the new language when it changes (by the person, or by location).
function Root() {
  useLocale()
  return <><App /><AutoSwitchNotice /></>
}

// The phone's back button closes the app's own pages first (web; the Android app does this natively).
installWebBackGuard()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

// Local copies of the app shell and the last signed files (sw.js). Production only; a failure changes nothing.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined); });
}
