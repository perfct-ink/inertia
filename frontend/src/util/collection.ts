// Items bucketed by a key, in input order within each bucket.
export function groupBy<T, K>(items: T[], keyOf: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  items.forEach((item) => {
    const key = keyOf(item)
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  })
  return map
}
