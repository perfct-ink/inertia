import { Database, FileText, Table as TableIcon, type LucideProps } from 'lucide-react'
import type { Document } from '@/types'

const ICONS = { document: FileText, spreadsheet: TableIcon, table: Database }

// The icon for a kind of document: a page, a sheet grid or a table.
export default function DocTypeIcon({ type, ...props }: { type: Document['doc_type'] } & LucideProps) {
  const Icon = ICONS[type]
  return <Icon aria-hidden="true" {...props} />
}
