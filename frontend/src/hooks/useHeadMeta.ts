import { useEffect } from 'react'

// Adds <meta name content> tags to the page head while the calling view is
// shown, and takes them away when it leaves (or puts back what was there).
export function useHeadMeta(tags: Record<string, string>) {
  const key = JSON.stringify(tags)
  useEffect(() => {
    const added: HTMLMetaElement[] = []
    for (const [name, content] of Object.entries(JSON.parse(key) as Record<string, string>)) {
      const meta = document.createElement('meta')
      meta.name = name
      meta.content = content
      document.head.appendChild(meta)
      added.push(meta)
    }
    return () => added.forEach((meta) => meta.remove())
  }, [key])
}
