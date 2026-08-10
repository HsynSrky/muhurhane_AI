import { AnimatePresence } from 'framer-motion'
import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import Landing from './routes/Landing'
import PageFallback from './components/PageFallback'

// Landing ilk boyamada görünür, bu yüzden eşzamanlı; ağır rotalar bölünür.
const Studio = lazy(() => import('./routes/Studio'))
const Certificate = lazy(() => import('./routes/Certificate'))

export default function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />
          <Route path="/atolye" element={<Studio />} />
          <Route path="/sertifika" element={<Certificate />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}
