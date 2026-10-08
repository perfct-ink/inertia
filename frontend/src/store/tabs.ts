import { create } from 'zustand'

export interface Tab {
  id: string
  path: string
  title: string
  docType?: 'document' | 'spreadsheet' | 'table'
}

interface TabsStore {
  tabs: Tab[]
  activeId: string | null
  openTab: (tab: Tab) => void
  closeTab: (id: string) => Tab | null  // returns tab to navigate to, or null
  setActive: (id: string) => void
  updateTitle: (id: string, title: string) => void
}

export const useTabsStore = create<TabsStore>((set, get) => ({
  tabs: [],
  activeId: null,

  openTab(tab) {
    set((s) => {
      const exists = s.tabs.find((t) => t.id === tab.id)
      if (exists) return { activeId: tab.id }
      return { tabs: [...s.tabs, tab], activeId: tab.id }
    })
  },

  closeTab(id) {
    const { tabs } = get()
    const idx = tabs.findIndex((t) => t.id === id)
    if (idx === -1) return null
    const next = tabs[idx + 1] ?? tabs[idx - 1] ?? null
    set({ tabs: tabs.filter((t) => t.id !== id), activeId: next?.id ?? null })
    return next
  },

  setActive(id) {
    set({ activeId: id })
  },

  updateTitle(id, title) {
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)) }))
  },
}))
