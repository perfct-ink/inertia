import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, FormError, Input, Modal, Select, Textarea } from '@/components/ui'
import { usePreviewImport, useRunImport, type ImportPreview } from '@/api/collectionImport'
import { chosenColumns, columnNote, initialChoices, recordCount, typeOptions } from '@/data/collectionImport'
import { errorMessage } from '@/util/errorMessage'
import './ImportCollection.scss'

interface Props {
  onClose: () => void
  // Import into a new Collection in this folder (and open it)...
  folderId?: number
  // ...or append to this Collection, matching keys to its field names.
  documentId?: number
}

// Choose or paste JSON or YAML (a list of objects), check the fields and their
// guessed types, change what you like, then import. Errors show in the dialog.
export default function ImportCollection({ folderId, documentId, onClose }: Props) {
  const navigate = useNavigate()
  const preview = usePreviewImport()
  const runImport = useRunImport()
  const fileInput = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('Imported collection')
  const [guess, setGuess] = useState<ImportPreview | null>(null)
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const appending = documentId !== undefined
  const destination = appending ? { document_id: documentId } : { folder_id: folderId }
  const columns = guess ? chosenColumns(guess, choices) : []

  function changeText(next: string) {
    setText(next); setGuess(null); setError('')
  }

  async function readFile(file: File | undefined) {
    if (!file) return
    try { changeText(await file.text()) } catch { setError('Unable to read that file.') }
  }

  async function check() {
    setError('')
    try {
      const result = await preview.mutateAsync({ text, ...destination })
      setGuess(result); setChoices(initialChoices(result))
    } catch (e) { setError(errorMessage(e)) }
  }

  async function start() {
    setError('')
    try {
      const created = await runImport.mutateAsync({ text, ...destination, ...(appending ? {} : { title: title.trim() }), columns })
      onClose()
      if (!appending) navigate(`/documents/${created.id}`)
    } catch (e) { setError(errorMessage(e)) }
  }

  return (
    <Modal wide open title={appending ? 'Import into this Collection' : 'Import JSON or YAML'} description="A list of objects: each key becomes a field and each object a record." onClose={onClose} className="import_collection">
      <div className="import_collection-body">
        <div className="import_collection-source">
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>Choose a file</Button>
          <Input ref={fileInput} type="file" hidden accept=".json,.yaml,.yml,application/json" aria-label="JSON or YAML file" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = '' }} />
        </div>
        <Textarea aria-label="JSON or YAML" placeholder="Or paste it here" value={text} onChange={(e) => changeText(e.target.value)} rows={8} />
        {guess && (
          <>
            <p className="import_collection-summary">
              {recordCount(guess.row_count)} found.
              {guess.skipped_keys.length > 0 && ` Left out because they hold nested objects or lists: ${guess.skipped_keys.join(', ')}.`}
            </p>
            {!appending && <label className="import_collection-field">Collection name<Input value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} /></label>}
            <ul className="import_collection-columns" aria-label="Fields">
              {guess.columns.map((column) => (
                <li key={column.key} className="import_collection-column">
                  <span className="import_collection-key">{column.key}</span>
                  <span className="import_collection-note">{columnNote(column)}</span>
                  <Select
                    aria-label={`Type of ${column.key}`}
                    className="import_collection-type"
                    value={choices[column.key]}
                    disabled={!column.importable}
                    onChange={(e) => setChoices({ ...choices, [column.key]: e.target.value })}
                  >
                    {typeOptions(column, guess.types).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                </li>
              ))}
            </ul>
          </>
        )}
        <FormError message={error} />
        <div className="ui-modal-actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {guess
            ? <Button variant="primary" onClick={start} disabled={columns.length === 0 || runImport.isPending}>Import</Button>
            : <Button variant="primary" onClick={check} disabled={!text.trim() || preview.isPending}>Check fields</Button>}
        </div>
      </div>
    </Modal>
  )
}
