import { Link, useLocation } from 'react-router-dom'
import { FolderKanban, Keyboard, Plus } from 'lucide-react'
import { Button, classNames } from '@/components/ui'
import { isActivePath } from '@/data/project'
import { useWorkspace } from '@/api/workspace'
import { SECTION_GROUPS, type Section } from './projectSections'
import './SidebarRail.scss'

// Pages about the Space's projects as a whole, ahead of the open project's
// pages. Project requests is turned off (docs/features/project_intake.md).
const SPACE_SECTIONS: Section[] = [
  { label: 'Projects', path: '/space', icon: FolderKanban },
]

// The icon rail beside the sidebar panel: one button per page of the open
// project (or the whole Space), so any of them is one click away. The quick actions sit at the bottom. The middle scrolls
// when the window is too short for every button.
export function SidebarRail({ onQuickAdd, onShortcuts }: { onQuickAdd: () => void; onShortcuts: () => void }) {
  const { pathname } = useLocation()
  const shared = useWorkspace().data?.shared ?? false
  const groups = [SPACE_SECTIONS, ...SECTION_GROUPS.map((g) => g.sections.filter((s) => shared || !s.sharedOnly))]
    .filter((sections) => sections.length > 0)

  return (
    <nav aria-label="Pages" className="sidebar-rail">
      <div className="sidebar-rail_pages">
        {groups.map((sections, i) => (
          <div key={sections[0].path} role="group" className="sidebar-rail_group">
            {i > 0 && <span role="separator" className="sidebar-rail_divider" />}
            {sections.map(({ label, path, icon: Icon }) => {
              const active = isActivePath(pathname, path)
              return (
                <Link
                  key={path}
                  to={path}
                  title={label}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  className={classNames('sidebar-rail_button', active && 'sidebar-rail_button--active')}
                >
                  <Icon className="sidebar-rail_icon" />
                </Link>
              )
            })}
          </div>
        ))}
      </div>
      <div className="sidebar-rail_group sidebar-rail_group--actions">
        <Button title="Quick add (⌘K)" aria-label="Quick add" onClick={onQuickAdd} className="sidebar-rail_button">
          <Plus className="sidebar-rail_icon" />
        </Button>
        <Button title="Keyboard shortcuts (⌘/)" aria-label="Keyboard shortcuts" onClick={onShortcuts} className="sidebar-rail_button">
          <Keyboard className="sidebar-rail_icon" />
        </Button>
      </div>
    </nav>
  )
}
