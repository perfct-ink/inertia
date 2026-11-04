import type { QueryClient } from '@tanstack/react-query'
import { documentApi } from '@/api/documents'
import { isUntouched, markTouched } from '@/store/untouchedDocuments'
import { useTabsStore, type Tab } from '@/store/tabs'

// Closes a tab and returns the tab to show next, or null. A new document that
// was never changed is deleted along with its tab, so it isn't saved.
export function closeTab(id: string, qc: QueryClient): Tab | null {
  const tab = useTabsStore.getState().tabs.find((t) => t.id === id)
  const next = useTabsStore.getState().closeTab(id)
  if (tab?.docType === 'document' && isUntouched(Number(id))) {
    markTouched(Number(id))
    documentApi.destroy(Number(id)).then(() => qc.invalidateQueries({ queryKey: ['workspace'] }), () => {})
  }
  return next
}
