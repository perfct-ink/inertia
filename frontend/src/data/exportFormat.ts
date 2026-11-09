// The file formats a list of records can be downloaded as.
export type ExportFormat = 'csv' | 'xlsx'

export const EXPORT_FORMATS: { key: ExportFormat; label: string; extension: string }[] = [
  { key: 'csv', label: 'CSV', extension: 'csv' },
  { key: 'xlsx', label: 'Excel', extension: 'xlsx' },
]

// What a file picker accepts for importing: CSV and its tab or semicolon cousins, and Excel workbooks.
export const IMPORT_FILE_ACCEPT = '.csv,.tsv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
