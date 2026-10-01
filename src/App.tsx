import { useState } from 'react'
import MarkerForm from './components/MarkerForm'
import MarkerList, { type Filters } from './components/MarkerList'
import Settings from './components/Settings'
import { useAppData } from './hooks/useAppData'
import { useNow } from './hooks/useNow'

type View =
  | { name: 'list' }
  | { name: 'form'; markerId?: string }
  | { name: 'settings' }

export default function App() {
  const store = useAppData()
  const { data } = store
  const now = useNow()

  const [view, setView] = useState<View>({ name: 'list' })
  // Lives here (not in MarkerList) so filters survive switching views
  const [filters, setFilters] = useState<Filters>({ mapId: 'all', categoryId: 'all', showDone: false })

  const toList = () => setView({ name: 'list' })

  return (
    <div className="app">
      <header>
        <h1 onClick={toList}>ARK Tracker</h1>
        {view.name === 'list' ? (
          <nav>
            <button className="primary" onClick={() => setView({ name: 'form' })}>+ Add</button>
            <button onClick={() => setView({ name: 'settings' })}>Settings</button>
          </nav>
        ) : (
          <nav>
            <button onClick={toList}>Back</button>
          </nav>
        )}
      </header>

      <main>
        {view.name === 'list' && (
          <MarkerList
            markers={data.markers}
            maps={data.maps}
            categories={data.categories}
            filters={filters}
            onFiltersChange={setFilters}
            now={now}
            onEdit={id => setView({ name: 'form', markerId: id })}
            onToggleDone={m => store.setMarkerStatus(m.id, m.status === 'done' ? 'active' : 'done')}
          />
        )}

        {view.name === 'form' && (
          <MarkerForm
            // key resets the form's state when switching between markers
            key={view.markerId ?? 'new'}
            maps={data.maps}
            categories={data.categories}
            marker={data.markers.find(m => m.id === view.markerId)}
            // New markers default to the map you're filtered to, for quick entry mid-session
            defaultMapId={filters.mapId !== 'all' ? filters.mapId : undefined}
            onSave={marker => {
              store.saveMarker(marker)
              toList()
            }}
            onDelete={id => {
              store.deleteMarker(id)
              toList()
            }}
            onCancel={toList}
          />
        )}

        {view.name === 'settings' && (
          <Settings
            data={data}
            onSaveMap={store.saveMap}
            onDeleteMap={store.deleteMap}
            onSaveCategory={store.saveCategory}
            onDeleteCategory={store.deleteCategory}
            onReplaceAll={store.replaceAll}
          />
        )}
      </main>
    </div>
  )
}
