import { Button, Modal, Select } from '@/components/ui'
import { ACCENTS, THEME_CHOICES, type AccentId, type ThemeChoice } from '@/data/appearance'
import { useAppearanceStore } from '@/store/appearance'
import './AppearanceDialog.scss'

// Light, dark or system, and the accent colour. Changes apply immediately.
export default function AppearanceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, accent, setTheme, setAccent, reset } = useAppearanceStore()

  return (
    <Modal open={open} title="Appearance" description="Saved on this device." onClose={onClose}>
      <label className="appearance_dialog-field">
        Theme
        <Select aria-label="Theme" value={theme} onChange={(e) => setTheme(e.target.value as ThemeChoice)}>
          {THEME_CHOICES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      </label>
      <div role="radiogroup" aria-label="Accent colour" className="appearance_dialog-accents">
        {ACCENTS.map((a) => (
          <Button
            key={a.id}
            variant="unstyled"
            role="radio"
            aria-checked={accent === a.id}
            aria-label={a.label}
            title={a.label}
            className={`appearance_dialog-swatch${accent === a.id ? ' appearance_dialog-swatch--selected' : ''}`}
            style={{ background: `hsl(${a.hue}deg 72% 38%)` }}
            onClick={() => setAccent(a.id as AccentId)}
          />
        ))}
      </div>
      <div className="ui-modal-actions">
        <Button variant="secondary" onClick={reset}>Reset</Button>
        <Button variant="primary" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  )
}
