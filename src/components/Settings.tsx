import { useState, type ChangeEvent } from 'react'
import { DECAY_MATERIALS } from '../data/decay'
import { migrate } from '../hooks/useAppData'
import type { AppData, AppSettings, ArkMap, Category } from '../types'
import {
  getNotificationStatus,
  requestNotificationPermission,
  showNotification,
} from '../utils/notifications'
import NumberInput from './NumberInput'

const LEAD_OPTIONS = [
  { minutes: 0, label: 'When ready' },
  { minutes: 15, label: '15 minutes before' },
  { minutes: 30, label: '30 minutes before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 120, label: '2 hours before' },
  { minutes: 360, label: '6 hours before' },
  { minutes: 720, label: '12 hours before' },
  { minutes: 1440, label: '1 day before' },
]

type Props = {
  data: AppData
  onSaveMap: (map: ArkMap) => void
  onDeleteMap: (id: string) => void
  onSaveCategory: (category: Category) => void
  onDeleteCategory: (id: string) => void
  onSaveSettings: (changes: Partial<AppSettings>) => void
  onReplaceAll: (data: AppData) => void
}

export default function Settings({
  data,
  onSaveMap,
  onDeleteMap,
  onSaveCategory,
  onDeleteCategory,
  onSaveSettings,
  onReplaceAll,
}: Props) {
  const [newMapName, setNewMapName] = useState('')
  // Read live: permission can change in browser settings, and isn't part of the saved data
  const [notificationStatus, setNotificationStatus] = useState(getNotificationStatus)
  const notificationsOn = data.settings.notificationsEnabled && notificationStatus === 'granted'

  async function toggleNotifications(enabled: boolean) {
    if (!enabled) return onSaveSettings({ notificationsEnabled: false })
    const status = await requestNotificationPermission()
    setNotificationStatus(status)
    onSaveSettings({ notificationsEnabled: status === 'granted' })
  }

  const [structureMultiplier, setStructureMultiplier] = useState(1)
  const [tameMultiplier, setTameMultiplier] = useState(1)

  // Rewrites every row from the official times. Individual rows can still be edited after.
  function applyMultipliers() {
    const decayDays = Object.fromEntries(
      DECAY_MATERIALS.map(m => [
        m.id,
        m.officialDays * (m.kind === 'tame' ? tameMultiplier : structureMultiplier),
      ]),
    )
    onSaveSettings({ decayDays })
  }
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
        <h2>Notifications</h2>
        {notificationStatus === 'unsupported' && (
          <p className="hint">This browser doesn't support notifications.</p>
        )}
        {notificationStatus === 'needs-install' && (
          <p className="hint">
            On iPhone and iPad, notifications only work from the Home Screen app. In Safari, tap
            Share, then Add to Home Screen, and open ARK Tracker from there.
          </p>
        )}
        {notificationStatus === 'denied' && (
          <p className="hint">
            Notifications are blocked for this site. Allow them in your browser's site settings,
            then reload.
          </p>
        )}
        {(notificationStatus === 'default' || notificationStatus === 'granted') && (
          <>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={notificationsOn}
                onChange={e => toggleNotifications(e.target.checked)}
              />
              Notify me about timers
            </label>
            {notificationsOn && (
              <div className="notification-options">
                <label>
                  Notify
                  <select
                    value={data.settings.notifyLeadMinutes}
                    onChange={e => onSaveSettings({ notifyLeadMinutes: Number(e.target.value) })}
                  >
                    {LEAD_OPTIONS.map(o => (
                      <option key={o.minutes} value={o.minutes}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() =>
                    showNotification('ARK Tracker', {
                      body: 'Notifications are working. Timer alerts will look like this.',
                      tag: 'test',
                      data: { url: '/settings' },
                    })
                  }
                >
                  Send test
                </button>
              </div>
            )}
            <p className="hint">
              For now, notifications only arrive while ARK Tracker is open (a tab, or the app in the
              background). Alerts with the app fully closed are coming later.
            </p>
          </>
        )}
      </section>

      <section>
        <h2>Duplicate Check</h2>
        <p className="hint">
          When adding a marker, warn about existing markers on the same map within this distance.
          Map coordinates run 0-100. Set to 0 to only match identical coordinates.
        </p>
        <label className="radius-input">
          Distance
          <NumberInput
            value={data.settings.duplicateRadius}
            onChange={duplicateRadius => onSaveSettings({ duplicateRadius })}
          />
        </label>
      </section>

      <section>
        <h2>Decay Times</h2>
        <p className="hint">
          Full decay time in days for each material, used by "Fill from decay times" on the marker
          form. Defaults are official-server values. If your server scales decay, enter its
          multipliers and Apply, then adjust any row that still doesn't match the game.
        </p>
        <div className="multiplier-row">
          <label>
            Structures ×
            <NumberInput value={structureMultiplier} onChange={setStructureMultiplier} />
          </label>
          <label>
            Tames ×
            <NumberInput value={tameMultiplier} onChange={setTameMultiplier} />
          </label>
          <button onClick={applyMultipliers}>Apply</button>
        </div>
        <ul className="edit-list decay-list">
          {DECAY_MATERIALS.map(m => (
            <li key={m.id}>
              <span className="decay-name">
                {m.name} <span className="hint">(official {m.officialDays})</span>
              </span>
              <NumberInput
                className="decay-days"
                value={data.settings.decayDays[m.id]}
                onChange={days =>
                  onSaveSettings({ decayDays: { ...data.settings.decayDays, [m.id]: days } })
                }
              />
            </li>
          ))}
        </ul>
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
