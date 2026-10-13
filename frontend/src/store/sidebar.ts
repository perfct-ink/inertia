import { create } from 'zustand'

// Below the md breakpoint (768px) the file-manager Sidebar (icon rail + tree)
// becomes an off-canvas drawer instead of a permanent column — see
// components/file-manager/Sidebar.tsx and components/WorkspaceLayout.tsx.
// A tiny store rather than local state so the hamburger button in
// WorkspaceLayout's mobile top bar and the drawer it opens/closes can live
// in separate components without prop drilling (matches store/tabs.ts).
interface SidebarStore {
  open: boolean
  toggle: () => void
  close: () => void
}

export const useSidebarStore = create<SidebarStore>()((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
}))
