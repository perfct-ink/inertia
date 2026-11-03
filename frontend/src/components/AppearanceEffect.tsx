import { useEffect } from 'react'
import { APPEARANCE_PROPERTY_NAMES, accentProperties, isDark, sidebarProperties, themeAttribute } from '@/data/appearance'
import { useAppearanceStore } from '@/store/appearance'

// Applies the saved appearance to the page: `data-theme` on <html> for light or
// dark (unset follows the OS), the colour theme's accent and sidebar tokens as
// inline custom properties, and `data-sidebar="tinted"` when the theme tints
// the sidebar. Re-applies when the OS colour scheme changes while "System" is
// chosen. Renders nothing.
export default function AppearanceEffect() {
  const theme = useAppearanceStore((s) => s.theme)
  const colorTheme = useAppearanceStore((s) => s.colorTheme)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')

    function apply() {
      const attribute = themeAttribute(theme)
      if (attribute) root.setAttribute('data-theme', attribute)
      else root.removeAttribute('data-theme')
      const dark = isDark(theme, media?.matches ?? false)
      const sidebar = sidebarProperties(colorTheme, dark)
      if (sidebar) root.setAttribute('data-sidebar', 'tinted')
      else root.removeAttribute('data-sidebar')
      APPEARANCE_PROPERTY_NAMES.forEach((name) => root.style.removeProperty(name))
      Object.entries({ ...accentProperties(colorTheme, dark), ...sidebar })
        .forEach(([name, value]) => root.style.setProperty(name, value))
    }

    apply()
    media?.addEventListener?.('change', apply)
    return () => media?.removeEventListener?.('change', apply)
  }, [theme, colorTheme])

  return null
}
