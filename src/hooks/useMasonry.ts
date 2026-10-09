import { useLayoutEffect, useRef } from 'react'

// Pinterest-style tiling on a CSS grid. The grid has tiny rows (grid-auto-rows in CSS), and
// each card spans however many of them its height needs, so shorter cards don't leave gaps.
// Unlike CSS columns, items still flow left to right, so a sorted list reads in order.
//
// ROW_UNIT must match the grid's grid-auto-rows, and the vertical gap between cards is added
// to each card's span (the grid itself has no row-gap, since that would add up per tiny row).
const ROW_UNIT = 4

export function useMasonry<T extends HTMLElement>(gap: number, deps: unknown[]) {
  const ref = useRef<T>(null)

  useLayoutEffect(() => {
    const grid = ref.current
    if (!grid) return

    const fit = (item: HTMLElement) => {
      // Measure the card's own height (it's aligned to the start, so it isn't stretched)
      const height = item.getBoundingClientRect().height
      item.style.gridRowEnd = `span ${Math.ceil((height + gap) / ROW_UNIT)}`
    }

    const items = Array.from(grid.children) as HTMLElement[]
    items.forEach(fit)

    // Re-measure when a card changes height: a resync panel opening, text wrapping
    // differently after a resize, a countdown getting shorter
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) fit(entry.target as HTMLElement)
    })
    items.forEach(item => observer.observe(item))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ref
}
