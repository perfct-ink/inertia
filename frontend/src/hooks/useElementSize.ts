import { useCallback, useState } from 'react'

export interface ElementSize { width: number; height: number }

// An element's rendered size in pixels, kept current as it resizes. Returns a
// ref to attach to the element and its size. The fallback stands in until the
// element is measured, and wherever nothing can be measured (a hidden element,
// or a test environment without layout).
export function useElementSize<T extends HTMLElement>(fallback: ElementSize) {
  const { width: fallbackWidth, height: fallbackHeight } = fallback
  const [size, setSize] = useState<ElementSize>(fallback)
  const ref = useCallback((element: T | null) => {
    if (!element) return
    const measure = () => {
      const rect = element.getBoundingClientRect()
      const next = { width: Math.round(rect.width) || fallbackWidth, height: Math.round(rect.height) || fallbackHeight }
      setSize((current) => (current.width === next.width && current.height === next.height ? current : next))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [fallbackWidth, fallbackHeight])
  return [ref, size] as const
}
