import { create } from 'zustand'
import type { ShareTarget } from '@/data/share'

// The share dialog is opened from the sidebar's menus, the document toolbar
// and a folder's page, but shown by one host in the sidebar, like the
// move/copy dialog (store/transfer.ts).
interface ShareStore {
  target: ShareTarget | null
  open: (target: ShareTarget) => void
  close: () => void
}

export const useShareStore = create<ShareStore>((set) => ({
  target: null,
  open: (target) => set({ target }),
  close: () => set({ target: null }),
}))
