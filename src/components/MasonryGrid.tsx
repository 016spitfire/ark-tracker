import { Children, isValidElement, type ReactNode } from 'react'
import { useMasonry } from '../hooks/useMasonry'

// A card grid that tiles like Pinterest. See useMasonry for how.
export default function MasonryGrid({ gap, children }: { gap: number; children: ReactNode }) {
  // Re-measure whenever the set of cards changes (filters, new markers). Height changes
  // within a card are caught by the ResizeObserver in useMasonry.
  const keys = Children.map(children, child => (isValidElement(child) ? child.key : null))?.join(',')
  const ref = useMasonry<HTMLUListElement>(gap, [keys, gap])

  return (
    <ul ref={ref} className="marker-grid" style={{ columnGap: gap }}>
      {children}
    </ul>
  )
}
