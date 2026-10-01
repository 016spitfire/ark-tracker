import type { AppData } from '../types'

// Starting data for a fresh install. Everything here is editable in Settings.
export const DEFAULT_DATA: AppData = {
  version: 1,
  maps: [
    { id: 'the-island', name: 'The Island' },
    { id: 'scorched-earth', name: 'Scorched Earth' },
    { id: 'aberration', name: 'Aberration' },
    { id: 'extinction', name: 'Extinction' },
    { id: 'genesis-1', name: 'Genesis: Part 1' },
    { id: 'genesis-2', name: 'Genesis: Part 2' },
    { id: 'the-center', name: 'The Center' },
    { id: 'ragnarok', name: 'Ragnarok' },
    { id: 'valguero', name: 'Valguero' },
    { id: 'crystal-isles', name: 'Crystal Isles' },
    { id: 'lost-island', name: 'Lost Island' },
    { id: 'fjordur', name: 'Fjordur' },
  ],
  categories: [
    { id: 'abandoned-base', name: 'Abandoned Base', color: '#e05252', hasTimer: true },
    { id: 'neglected-tame', name: 'Neglected Tame', color: '#e8a33d', hasTimer: true },
    { id: 'cave', name: 'Cave', color: '#8a94a6', hasTimer: false },
    { id: 'artifact', name: 'Artifact', color: '#a67be0', hasTimer: false },
    { id: 'resource-spawn', name: 'Resource Spawn', color: '#5bb56a', hasTimer: false },
    { id: 'creature-spawn', name: 'Creature Spawn', color: '#4fb3bf', hasTimer: false },
    { id: 'other', name: 'Other', color: '#c9c9c9', hasTimer: false },
  ],
  markers: [],
}
