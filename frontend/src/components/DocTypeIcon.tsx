import { Database, File as FileIcon, FileText, Table as TableIcon, type LucideProps } from 'lucide-react'
import type { Document } from '@/types'

const ICONS = { document: FileText, spreadsheet: TableIcon, table: Database, file: FileIcon }

// The icon for a kind of document: a page, a sheet grid, a table or an uploaded file.
export default function DocTypeIcon({ type, ...props }: { type: Document['doc_type'] } & LucideProps) {
  const Icon = ICONS[type]
  return <Icon aria-hidden="true" {...props} />
}
