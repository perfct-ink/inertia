import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Modal, Select, Textarea } from '@/components/ui'
import { useImportCollection, usePreviewImport, type ImportField, type ImportPreview } from '@/api/collectionImport'
import type { DataType } from '@/api/tables'
import { IMPORT_TYPES } from '@/data/importFields'

// Paste or upload JSON/YAML (a list of objects), check the guessed field types,
// then create a collection from it. Errors come from the API client's notice.
export default function ImportCollection({ open, folderId, onClose }: { open: boolean; folderId: number; onClose: () => void }) {
  const navigate = useNavigate()
  const preview = usePreviewImport()
  const importCollection = useImportCollection()
  const [text, setText] = useState('')
  const [title, setTitle] = useState('Imported collection')
  const [guess, setGuess] = useState<ImportPreview | null>(null)
  const [fields, setFields] = useState<ImportField[]>([])

  function reset() { setText(''); setGuess(null); setFields([]) }
  function close() { reset(); onClose() }

  async function readFile(file: File | undefined) {
    if (!file) return
    setText(await file.text())
    setGuess(null)
  }

  function check() {
    preview.mutate(text, { onSuccess: (result) => { setGuess(result); setFields(result.fields) } })
  }

  function run() {
    importCollection.mutate({ text, fields, folderId, title: title.trim() || 'Imported collection' }, {
      onSuccess: (created) => { close(); navigate(`/documents/${created.id}`) },
    })
  }

  return (
    <Modal open={open} title="Import JSON or YAML" description="A list of objects: each key becomes a field and each object a record." onClose={close}>
      <Input type="file" accept=".json,.yaml,.yml,application/json" aria-label="File" onChange={(e) => readFile(e.target.files?.[0])} />
      <Textarea aria-label="JSON or YAML" placeholder="Or paste it here" value={text} onChange={(e) => { setText(e.target.value); setGuess(null) }} rows={8} />
      {!guess && <Button variant="primary" onClick={check} disabled={!text.trim() || preview.isPending}>Check fields</Button>}
      {guess && (
        <>
          <p>{guess.row_count} {guess.row_count === 1 ? 'record' : 'records'}.{guess.skipped_keys.length > 0 && ` Skipped nested keys: ${guess.skipped_keys.join(', ')}.`}</p>
          <Input aria-label="Collection name" value={title} onChange={(e) => setTitle(e.target.value)} />
          {fields.map((field, i) => (
            <label key={field.name}>
              {field.name}
              <Select
                aria-label={`Type of ${field.name}`}
                value={field.data_type}
                onChange={(e) => setFields(fields.map((f, j) => (j === i ? { ...f, data_type: e.target.value as DataType } : f)))}
              >
                {IMPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </label>
          ))}
          <Button variant="primary" onClick={run} disabled={importCollection.isPending}>Import</Button>
        </>
      )}
    </Modal>
  )
}
