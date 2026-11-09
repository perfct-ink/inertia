import { useState } from 'react'
import { Select, classNames } from '@/components/ui'
import { usePageTitle } from '@/hooks/usePageTitle'
import { SECTIONS } from './examples'
import './StyleguideScreen.scss'

// Each theme panel pins its theme with data-theme (see the end of
// styles/_theme.scss), so both show at once whatever the page's own theme is.
const THEMES = [{ id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }] as const

type PanelWidth = 'full' | 'phone'

// A development-only gallery of the shared controls in `components/ui`, each in
// its states, in a light and a dark panel side by side. Registered in App.tsx
// only outside production builds.
export default function StyleguideScreen() {
  usePageTitle('Component gallery')
  const [width, setWidth] = useState<PanelWidth>('full')

  return (
    <div className="view-styleguide">
      <header className="styleguide-header">
        <div className="styleguide-heading">
          <h1 className="styleguide-title">Component gallery</h1>
          <p className="styleguide-intro">
            The shared controls in their states, in a light and a dark panel. Hover a control to see its hover state;
            the focus rows are drawn with the same focus ring a keyboard user sees. Dialogs, select lists, calendars
            and toasts open over the page, so they use the page&apos;s own theme (Account, then Appearance).
          </p>
        </div>
        <label className="styleguide-width">
          Panel width
          <Select value={width} onChange={(e) => setWidth(e.target.value as PanelWidth)}>
            <option value="full">Full width</option>
            <option value="phone">Phone (375px)</option>
          </Select>
        </label>
      </header>

      {SECTIONS.map(({ id, title, Examples }) => (
        <section key={id} id={`styleguide-${id}`} aria-labelledby={`styleguide-${id}-title`} className="styleguide-section">
          <h2 id={`styleguide-${id}-title`} className="styleguide-section-title">{title}</h2>
          <div className={classNames('styleguide-themes', width === 'phone' && 'styleguide-themes--phone')}>
            {THEMES.map((theme) => (
              <div key={theme.id} role="group" aria-label={`${title}, ${theme.id} theme`} data-theme={theme.id} className="styleguide-panel">
                <p className="styleguide-panel-title">{theme.label}</p>
                <Examples />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
