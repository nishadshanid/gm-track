import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Layout } from './components/Layout'
import { Today } from './pages/Today'
import { Diet } from './pages/Diet'
import { Workout } from './pages/Workout'
import { Metrics } from './pages/Metrics'
import { Insights } from './pages/Insights'
import { Setup } from './pages/Setup'
import { Settings } from './pages/Settings'

// HashRouter so the app works on GitHub Pages without server rewrites.
function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="diet" element={<Diet />} />
          <Route path="workout" element={<Workout />} />
          <Route path="metrics" element={<Metrics />} />
          <Route path="insights" element={<Insights />} />
          <Route path="setup" element={<Setup />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AnimatedRoutes />
    </HashRouter>
  )
}
