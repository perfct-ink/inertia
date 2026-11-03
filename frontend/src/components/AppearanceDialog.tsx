import type { CSSProperties } from 'react'
import { Button, Modal, Select } from '@/components/ui'
import { COLOR_THEMES, THEME_CHOICES, accentColor, isDark, sidebarColor, type ThemeChoice } from '@/data/appearance'
import { useAppearanceStore } from '@/store/appearance'
import './AppearanceDialog.scss'

// Light, dark or system, and a colour theme picked from preview cards, as in
// Slack. Changes apply immediately.
export default function AppearanceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, colorTheme, setTheme, setColorTheme, reset } = useAppearanceStore()
  const dark = isDark(theme, window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)

  return (
    <Modal open={open} title="Appearance" description="Saved on this device." onClose={onClose}>
      <label className="appearance_dialog-field">
        Mode
        <Select value={theme} onChange={(e) => setTheme(e.target.value as ThemeChoice)}>
          {THEME_CHOICES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      </label>
      <p id="appearance-color-theme" className="appearance_dialog-heading">Colour theme</p>
      <div role="radiogroup" aria-labelledby="appearance-color-theme" className="appearance_dialog-themes">
        {COLOR_THEMES.map((t) => {
          const selected = colorTheme === t.id
          // The card previews the theme: its sidebar beside a page with its accent.
          const preview = {
            '--preview-sidebar': sidebarColor(t.id, dark) ?? 'var(--muted)',
            '--preview-accent': accentColor(t.hue, dark),
          } as CSSProperties
          return (
            <Button
              key={t.id}
              variant="unstyled"
              role="radio"
              aria-checked={selected}
              className={`appearance_dialog-theme${selected ? ' appearance_dialog-theme--selected' : ''}`}
              onClick={() => setColorTheme(t.id)}
            >
              <span className="appearance_dialog-preview" style={preview} aria-hidden="true">
                <span className="appearance_dialog-preview_sidebar" />
                <span className="appearance_dialog-preview_page">
                  <span className="appearance_dialog-preview_line" />
                  <span className="appearance_dialog-preview_accent" />
                </span>
              </span>
              <span className="appearance_dialog-theme_name">{t.label}</span>
            </Button>
          )
        })}
      </div>
      <div className="ui-modal-actions">
        <Button variant="secondary" onClick={reset}>Reset</Button>
        <Button variant="primary" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  )
}
