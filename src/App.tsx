import { useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'
import MarkerForm from './components/MarkerForm'
import MarkerList from './components/MarkerList'
import Settings from './components/Settings'
import { useAppData } from './hooks/useAppData'
import { useNow } from './hooks/useNow'
import { useNotificationScheduler } from './hooks/useNotificationScheduler'
import type { AppData, Marker } from './types'
import type { Filters } from './utils/filters'

export default function App() {
  const store = useAppData()
  const { data } = store
  const now = useNow()
  useNotificationScheduler(data)
  const navigate = useNavigate()
  const location = useLocation()

  // Lives here (not in MarkerList) so filters survive switching pages
  const [filters, setFilters] = useState<Filters>({
    mapId: 'all',
    hiddenCategoryIds: [],
    search: '',
    showDone: false,
  })

  // Step back in history so the phone's back button and the app agree, and the list keeps
  // its scroll position. If this page was opened directly (no history yet), go to the list.
  const goBack = () => (location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1))

  const isList = location.pathname === '/'

  return (
    <div className="app">
      <header>
        <h1 onClick={() => navigate('/')}>ARK Tracker</h1>
        {isList ? (
          <nav>
            <button className="primary" onClick={() => navigate('/markers/new')}>+ Add</button>
            <button onClick={() => navigate('/settings')}>Settings</button>
          </nav>
        ) : (
          <nav>
            <button onClick={goBack}>Back</button>
          </nav>
        )}
      </header>

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <MarkerList
                markers={data.markers}
                maps={data.maps}
                categories={data.categories}
                filters={filters}
                onFiltersChange={setFilters}
                now={now}
                onEdit={id => navigate(`/markers/${id}/edit`)}
                onToggleDone={m => store.setMarkerStatus(m.id, m.status === 'done' ? 'active' : 'done')}
                onResyncTimer={(markerId, timerId, durationMs) =>
                  store.resyncTimer(markerId, timerId, Date.now() + durationMs)
                }
                onSetTimerStatus={(markerId, timerId, status) =>
                  store.updateTimer(markerId, timerId, { status })
                }
              />
            }
          />
          {['/markers/new', '/markers/:id/edit'].map(path => (
            <Route
              key={path}
              path={path}
              element={
                <MarkerFormPage
                  data={data}
                  // New markers default to the map you're filtered to, for quick entry mid-session
                  defaultMapId={filters.mapId !== 'all' ? filters.mapId : undefined}
                  onSave={marker => {
                    store.saveMarker(marker)
                    goBack()
                  }}
                  onDelete={id => {
                    store.deleteMarker(id)
                    goBack()
                  }}
                  onCancel={goBack}
                  // Replace, so Back from the existing marker returns to the list, not the new form
                  onOpenMarker={id => navigate(`/markers/${id}/edit`, { replace: true })}
                />
              }
            />
          ))}
          <Route
            path="/settings"
            element={
              <Settings
                data={data}
                filters={filters}
                onSaveMap={store.saveMap}
                onDeleteMap={store.deleteMap}
                onSaveCategory={store.saveCategory}
                onDeleteCategory={store.deleteCategory}
                onSaveSettings={store.saveSettings}
                onReplaceAll={store.replaceAll}
              />
            }
          />
          {/* Unknown URLs land on the list instead of a blank page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer>
        <p>
          Built by{' '}
          <a href="https://spencerkittle.vercel.app/" target="_blank" rel="noopener noreferrer">
            Spencer Kittle
          </a>
        </p>
        <p>
          This is independent fan content and is not affiliated with, endorsed, or sponsored by
          Studio Wildcard.
        </p>
      </footer>
    </div>
  )
}

type MarkerFormPageProps = {
  data: AppData
  defaultMapId?: string
  onSave: (marker: Marker) => void
  onDelete: (id: string) => void
  onCancel: () => void
  onOpenMarker: (id: string) => void
}

// Reads the marker id from the URL. No id means a new marker.
function MarkerFormPage({ data, ...props }: MarkerFormPageProps) {
  const { id } = useParams()
  const marker = id ? data.markers.find(m => m.id === id) : undefined

  // An edit link for a marker that no longer exists (deleted, or a different device)
  if (id && !marker) return <Navigate to="/" replace />

  return (
    <MarkerForm
      // key resets the form's state when switching between markers
      key={id ?? 'new'}
      maps={data.maps}
      categories={data.categories}
      marker={marker}
      markers={data.markers}
      duplicateRadius={data.settings.duplicateRadius}
      decayDays={data.settings.decayDays}
      {...props}
    />
  )
}
