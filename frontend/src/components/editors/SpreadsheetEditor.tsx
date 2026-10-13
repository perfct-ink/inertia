import { useState, useRef, useMemo, useEffect } from 'react'
import { Workbook } from '@fortune-sheet/react'
import './SpreadsheetEditor.scss'
import { Loader2 } from 'lucide-react'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useDocument, useUpdateDocument } from '@/api/documents'
import { useTabsStore } from '@/store/tabs'
import type { Sheet } from '@fortune-sheet/core'

const EMPTY_SHEETS: Sheet[] = [
  {
    name: 'Sheet1',
    id: 'sheet1',
    status: 1,
    order: 0,
    row: 36,
    column: 26,
    celldata: [],
    config: {},
  },
]

export default function SpreadsheetEditor({ docId }: { docId: number }) {
  const { data: doc } = useDocument(docId)
  const updateDocument = useUpdateDocument()
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingRef = useRef<Sheet[] | null>(null)
  const { openTab } = useTabsStore()

  useEffect(() => {
    if (!doc) return
    openTab({
      id: String(doc.id),
      path: `/documents/${doc.id}`,
      title: doc.title || 'Untitled',
      docType: 'spreadsheet',
    })
  }, [doc?.id, doc?.title])

  const initialSheets = useMemo<Sheet[]>(
    () => (doc?.content?.sheets as Sheet[] | undefined) ?? EMPTY_SHEETS,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [docId],
  )

  function scheduleSave(sheets: Sheet[]) {
    pendingRef.current = sheets
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const toSave = pendingRef.current
      if (!toSave) return
      pendingRef.current = null
      setSaveStatus('saving')
      try {
        await updateDocument.mutateAsync({ id: docId, content: { sheets: toSave } })
        setSaveStatus('saved')
      } catch {
        setSaveStatus('unsaved')
      }
    }, 2000)
  }

  return (
    <WorkspaceLayout>
      <div className="view-spreadsheet">
        <div className="spreadsheet-header">
          <span className="spreadsheet-title">{doc?.title ?? 'Spreadsheet'}</span>
          <div className="spreadsheet-status">
            {saveStatus === 'saving' && <Loader2 className="spreadsheet-status_spinner" />}
            {saveStatus === 'unsaved' && <div className="spreadsheet-status_dot" />}
          </div>
        </div>
        <div className="spreadsheet-body">
          <Workbook
            key={docId}
            data={initialSheets}
            onChange={(sheets) => scheduleSave(sheets as Sheet[])}
          />
        </div>
      </div>
    </WorkspaceLayout>
  )
}
