import { create } from 'zustand'
import type { TransferRequest } from '@/data/transfer'

// The move/copy dialog is opened from the sidebar's menus but shown by one
// host in the sidebar, so it outlives the row it was opened from (a moved
// folder's row disappears from the tree).
interface TransferStore {
  request: TransferRequest | null
  open: (request: TransferRequest) => void
  close: () => void
}

export const useTransferStore = create<TransferStore>((set) => ({
  request: null,
  open: (request) => set({ request }),
  close: () => set({ request: null }),
}))
