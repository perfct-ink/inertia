// The global shortcuts, as the shortcuts list shows them. Display copy only:
// the keys are bound in one place, the onKey handler in
// components/file-manager/Sidebar.tsx, so keep the two in sync by hand. How a
// key reads or whether it works in a browser is decided by util/shortcuts.ts.
export interface KeyboardShortcut {
  keys: string
  label: string
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { keys: '⌘K', label: 'Quick-add a task or event' },
  { keys: '⌘N', label: 'New document in this folder' },
  { keys: '⌘⇧N', label: 'New sheet in this folder' },
  { keys: '⌘T', label: 'New task in this folder' },
  { keys: '⌘E', label: 'New event' },
  { keys: '⌘J', label: 'New idea' },
  { keys: '⌘W', label: 'Close the active tab' },
  { keys: '⌘/', label: 'Show or hide this list' },
  { keys: 'Esc', label: 'Close a dialog or panel' },
]
