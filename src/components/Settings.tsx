import { useState, type ChangeEvent } from 'react'
import { migrate } from '../hooks/useAppData'
import type { AppData, ArkMap, Category } from '../types'

type Props = {
  data: AppData
  onSaveMap: (map: ArkMap) => void
  onDeleteMap: (id: string) => void
  onSaveCategory: (category: Category) => void
  onDeleteCategory: (id: string) => void
  onReplaceAll: (data: AppData) => void
}

export default function Settings({
  data,
  onSaveMap,
  onDeleteMap,
  onSaveCategory,
  onDeleteCategory,
  onReplaceAll,
}: Props) {
  const [newMapName, setNewMapName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')

  const markerCount = (key: 'mapId' | 'categoryId', id: string) =>
    data.markers.filter(m => m[key] === id).length

  function addMap() {
    if (!newMapName.trim()) return
    onSaveMap({ id: crypto.randomUUID(), name: newMapName.trim() })
    setNewMapName('')
  }

  function addCategory() {
    if (!newCategoryName.trim()) return
    onSaveCategory({
      id: crypto.randomUUID(),
      name: newCategoryName.trim(),
      color: '#c9c9c9',
      hasTimer: false,
    })
    setNewCategoryName('')
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ark-tracker-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importData(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file
    if (!file) return

    try {
      // Older exports are upgraded to the current format on the way in
      const parsed = migrate(JSON.parse(await file.text()))
      if (!parsed) throw new Error('Not an ARK Tracker export')
      if (confirm(`Replace everything on this device with ${parsed.markers.length} markers from "${file.name}"?`)) {
        onReplaceAll(parsed)
      }
    } catch {
      alert("That file isn't a valid ARK Tracker export.")
    }
  }

  return (
    <div className="settings">
      <section>
        <h2>Maps</h2>
        <ul className="edit-list">
          {data.maps.map(map => {
            const inUse = markerCount('mapId', map.id)
            return (
              <li key={map.id}>
                <input value={map.name} onChange={e => onSaveMap({ ...map, name: e.target.value })} />
                <button
                  className="danger"
                  disabled={inUse > 0}
                  title={inUse > 0 ? `Used by ${inUse} marker(s)` : undefined}
                  onClick={() => onDeleteMap(map.id)}
                >
                  Delete
                </button>
              </li>
            )
          })}
        </ul>
        <div className="add-row">
          <input
            value={newMapName}
            onChange={e => setNewMapName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMap()}
            placeholder="New map, e.g. Ragnarok (Donator)"
          />
          <button onClick={addMap}>Add</button>
        </div>
      </section>

      <section>
        <h2>Categories</h2>
        <ul className="edit-list">
          {data.categories.map(category => {
            const inUse = markerCount('categoryId', category.id)
            return (
              <li key={category.id}>
                <input
                  type="color"
                  value={category.color}
                  onChange={e => onSaveCategory({ ...category, color: e.target.value })}
                />
                <input
                  value={category.name}
                  onChange={e => onSaveCategory({ ...category, name: e.target.value })}
                />
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={category.hasTimer}
                    onChange={e => onSaveCategory({ ...category, hasTimer: e.target.checked })}
                  />
                  Timer
                </label>
                <button
                  className="danger"
                  disabled={inUse > 0}
                  title={inUse > 0 ? `Used by ${inUse} marker(s)` : undefined}
                  onClick={() => onDeleteCategory(category.id)}
                >
                  Delete
                </button>
              </li>
            )
          })}
        </ul>
        <div className="add-row">
          <input
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="New category"
          />
          <button onClick={addCategory}>Add</button>
        </div>
      </section>

      <section>
        <h2>Data</h2>
        <p className="hint">
          Everything is stored on this device only. Export to back up or to share with another
          device. Importing replaces everything here.
        </p>
        <div className="actions">
          <button onClick={exportData}>Export</button>
          <label className="button">
            Import
            <input type="file" accept="application/json,.json" onChange={importData} hidden />
          </label>
        </div>
      </section>
    </div>
  )
}
