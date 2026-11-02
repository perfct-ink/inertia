import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { Button, FormError, Input, Modal, Select } from '@/components/ui'
import { useEditTable, type TableData } from '@/api/tables'
import { errorMessage } from '@/util/errorMessage'
import { CsvError, parseCsv } from '@/util/csv'
import { downloadCsv, readFileText } from '@/util/download'
import {
  MAX_IMPORT_ROWS, NEW_FIELD_TYPES, NEW_FIELD_TYPE_LABELS, collectionToCsvRows, planImport, suggestTargets, targetFromValue, targetValue,
  type ColumnTarget,
} from '@/data/collectionCsv'
import './CollectionCsv.scss'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const SHOWN_ISSUES = 5

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

// Export a collection to CSV, or add records to it from a CSV file. The file
// is read in the browser; the person picks where each column goes, sees any
// bad values before anything is sent, and the server checks them again.
export default function CollectionCsv({ docId, title, data }: { docId: number; title: string; data: TableData | undefined }) {
  const edit = useEditTable(docId)
  const fileInput = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<string[][] | null>(null)
  const [targets, setTargets] = useState<ColumnTarget[]>([])
  const [unreadable, setUnreadable] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const fields = data?.fields ?? []
  const plan = rows ? planImport(rows, targets, fields) : null
  const headers = rows?.[0] ?? []

  function close() {
    setOpen(false); setRows(null); setTargets([]); setFileName(''); setUnreadable(false); setError('')
  }

  function exportCsv() {
    if (!data) return
    setStatus('')
    downloadCsv(title, collectionToCsvRows(data), 'collection')
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return
    setError('')
    if (file.size > MAX_FILE_BYTES) { setError('That file is larger than 5 MB. Split it into smaller files.'); return }
    try {
      const text = await readFileText(file)
      const parsed = parseCsv(text)
      if (parsed.length === 0) { setError('That file is empty.'); return }
      setRows(parsed)
      setTargets(suggestTargets(parsed, fields))
      setFileName(file.name)
      setUnreadable(text.includes('\uFFFD'))
    } catch (e) {
      setError(e instanceof CsvError ? e.message : 'Unable to read that file.')
    }
  }

  async function runImport() {
    if (!plan?.payload) return
    setError('')
    try {
      await edit.mutateAsync({ path: 'import', method: 'post', data: plan.payload })
      setStatus(`Imported ${plural(plan.imported, 'record')}.`)
      close()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  function sample(index: number): string {
    const value = rows?.slice(1).map((row) => row[index] ?? '').find((cell) => cell.trim() !== '') ?? ''
    return value.length > 40 ? `${value.slice(0, 40)}…` : value
  }

  const newFields = targets.flatMap((target) => (target.kind === 'new' ? [target.name] : []))
  const issues = plan?.issues ?? []

  return (
    <div className="view-collection_csv">
      <Button variant="secondary" onClick={() => { setStatus(''); setOpen(true) }} className="collection_csv-button">
        <Upload className="collection_csv-icon" />
        Import CSV
      </Button>
      <Button variant="secondary" onClick={exportCsv} disabled={!data || data.fields.length === 0} className="collection_csv-button">
        <Download className="collection_csv-icon" />
        Export CSV
      </Button>
      {status && <span role="status" className="collection_csv-status">{status}</span>}

      <Modal open={open} title="Import CSV" description="Add records from a CSV file. Its first row holds the column names." onClose={close}>
        <div className="collection_csv-body">
          <Input
            ref={fileInput}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain"
            aria-label="CSV file"
            tabIndex={-1}
            className="collection_csv-file_input"
            onChange={(e) => { void chooseFile(e.target.files?.[0]); e.target.value = '' }}
          />
          <div className="collection_csv-file">
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>{rows ? 'Choose another file' : 'Choose a CSV file'}</Button>
            {rows && <span className="collection_csv-file_name">{fileName}</span>}
          </div>
          {!rows && (
            <p className="collection_csv-hint">
              Up to {MAX_IMPORT_ROWS} records. Write dates as YYYY-MM-DD and times as YYYY-MM-DD HH:MM (UTC). Excel files: save as CSV UTF-8 first.
            </p>
          )}
          {unreadable && <p className="collection_csv-note">Some characters could not be read. In Excel, save the file as “CSV UTF-8” and choose it again.</p>}

          {rows && (
            <>
              <p className="collection_csv-summary">
                {plural(rows.length - 1, 'record')} and {plural(headers.length, 'column')}. Choose where each column goes.
              </p>
              <ul className="collection_csv-columns">
                {headers.map((header, index) => {
                  const name = header.trim() || `Column ${index + 1}`
                  const target: ColumnTarget = targets[index] ?? { kind: 'skip' }
                  return (
                    <li key={index} className="collection_csv-column">
                      <span className="collection_csv-column_name">{name}</span>
                      {sample(index) && <span className="collection_csv-column_sample">{sample(index)}</span>}
                      <Select
                        aria-label={`Import ${name} as`}
                        value={targetValue(target)}
                        onChange={(e) => setTargets(targets.map((t, i) => (i === index ? targetFromValue(e.target.value, t, header, index) : t)))}
                      >
                        <option value="skip">Don’t import</option>
                        {fields.length > 0 && (
                          <optgroup label="Existing field">
                            {fields.map((field) => <option key={field.id} value={`field:${field.id}`}>{field.name}</option>)}
                          </optgroup>
                        )}
                        <optgroup label={`New field “${target.kind === 'new' ? target.name : name}”`}>
                          {NEW_FIELD_TYPES.map((type) => <option key={type} value={`new:${type}`}>{NEW_FIELD_TYPE_LABELS[type]}</option>)}
                        </optgroup>
                      </Select>
                    </li>
                  )
                })}
              </ul>
              {issues.length > 0 ? (
                <ul role="alert" className="collection_csv-issues">
                  {issues.slice(0, SHOWN_ISSUES).map((issue, index) => <li key={index}>{issue.message}</li>)}
                  {issues.length > SHOWN_ISSUES && <li>and {issues.length - SHOWN_ISSUES} more.</li>}
                </ul>
              ) : plan && (
                <p className="collection_csv-summary">
                  {plural(plan.imported, 'record')} will be added{plan.skipped > 0 ? `; ${plural(plan.skipped, 'empty row')} left out` : ''}.
                  {newFields.length > 0 && ` New ${newFields.length === 1 ? 'field' : 'fields'}: ${newFields.join(', ')}.`}
                </p>
              )}
            </>
          )}

          <FormError message={error} />
          <div className="ui-modal-actions collection_csv-actions">
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button variant="primary" onClick={runImport} disabled={!plan?.payload || edit.isPending}>
              {plan?.payload ? `Import ${plural(plan.imported, 'record')}` : 'Import'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
