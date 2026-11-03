import { renderHook } from '@testing-library/react'
import { useHeadMeta } from './useHeadMeta'

const metaTags = () => Array.from(document.head.querySelectorAll('meta')).map((m) => [m.name, m.content])

test('adds the tags while the view is shown and removes them when it leaves', () => {
  const { unmount } = renderHook(() => useHeadMeta({ robots: 'noindex', referrer: 'no-referrer' }))
  expect(metaTags()).toEqual(expect.arrayContaining([['robots', 'noindex'], ['referrer', 'no-referrer']]))
  unmount()
  expect(metaTags()).not.toContainEqual(['robots', 'noindex'])
  expect(metaTags()).not.toContainEqual(['referrer', 'no-referrer'])
})

test('swaps the tags when they change', () => {
  const { rerender, unmount } = renderHook(({ tags }) => useHeadMeta(tags), { initialProps: { tags: { robots: 'noindex' } } })
  rerender({ tags: { robots: 'nofollow' } })
  expect(metaTags()).toContainEqual(['robots', 'nofollow'])
  expect(metaTags()).not.toContainEqual(['robots', 'noindex'])
  unmount()
})
