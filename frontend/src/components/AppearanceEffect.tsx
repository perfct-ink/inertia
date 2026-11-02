import { useEffect } from 'react'
import { ACCENT_PROPERTY_NAMES, accentProperties, isDark, themeAttribute } from '@/data/appearance'
import { useAppearanceStore } from '@/store/appearance'

// Applies the saved appearance to the page: `data-theme` on <html> for light or
// dark (unset follows the OS), and the accent tokens as inline custom properties.
// Re-applies when the OS colour scheme changes while "System" is chosen. Renders nothing.
export default function AppearanceEffect() {
  const theme = useAppearanceStore((s) => s.theme)
  const accent = useAppearanceStore((s) => s.accent)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')

    function apply() {
      const attribute = themeAttribute(theme)
      if (attribute) root.setAttribute('data-theme', attribute)
      else root.removeAttribute('data-theme')
      const properties = accentProperties(accent, isDark(theme, media?.matches ?? false))
      ACCENT_PROPERTY_NAMES.forEach((name) => root.style.removeProperty(name))
      if (properties) Object.entries(properties).forEach(([name, value]) => root.style.setProperty(name, value))
    }

    apply()
    media?.addEventListener?.('change', apply)
    return () => media?.removeEventListener?.('change', apply)
  }, [theme, accent])

  return null
}
