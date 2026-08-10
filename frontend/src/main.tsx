import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Yalnızca gereken alt kümeler: Latin + Türkçe harfleri ve Orhun bloğu.
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/latin-ext-600.css'
import '@fontsource/noto-sans-old-turkic/old-turkic-400.css'

import App from './App'
import './index.css'
import { SealProvider } from './state/sealStore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SealProvider>
        <App />
      </SealProvider>
    </BrowserRouter>
  </StrictMode>,
)
