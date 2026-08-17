import { Route, Routes } from 'react-router-dom'
import { NavBar } from './components/layout/NavBar'
import { SpotsListPage } from './pages/SpotsListPage'
import { SpotPage } from './pages/SpotPage'
import { SillPage } from './pages/SillPage'
import { MapPage } from './pages/MapPage'
import { SettingsPage } from './pages/SettingsPage'
import { LinksPage } from './pages/LinksPage'
import { AboutPage } from './pages/AboutPage'

function App() {
  return (
    <div className="flex min-h-full flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        <Routes>
          <Route path="/" element={<SpotsListPage />} />
          <Route path="/spots/:spotId" element={<SpotPage />} />
          <Route path="/sablons" element={<SillPage />} />
          <Route path="/carte" element={<MapPage />} />
          <Route path="/liens" element={<LinksPage />} />
          <Route path="/reglages" element={<SettingsPage />} />
          <Route path="/a-propos" element={<AboutPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
