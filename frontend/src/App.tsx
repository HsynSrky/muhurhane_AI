import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import Landing from './routes/Landing'
import PageFallback from './components/PageFallback'

const Studio = lazy(() => import('./routes/Studio'))
const Certificate = lazy(() => import('./routes/Certificate'))

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/atolye" element={<Studio />} />
        <Route path="/sertifika" element={<Certificate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
