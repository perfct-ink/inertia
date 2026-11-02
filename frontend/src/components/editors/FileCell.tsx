import { Input, Select } from '@/components/ui'
import api from '@/lib/api'
import { filePreview } from '@/data/document'
import type { Document } from '@/types'
import './FileCell.scss'

// One cell of a file or files field: thumbnails (images) or names of the chosen
// files, and a way to pick from the Space's uploaded files. One file is a menu;
// several are a list of checkboxes. The value is a file item's id, or a list of ids.
export default function FileCell({ label, many, value, files, onChange }: {
  label: string
  many: boolean
  value: number | number[] | null | undefined
  files: Document[]
  onChange: (value: number | number[] | null) => void
}) {
  const base = api.defaults.baseURL ?? ''
  const selected = many ? (Array.isArray(value) ? value : []) : value == null || Array.isArray(value) ? [] : [value]
  const chosen = files.filter((f) => selected.includes(f.id))

  return (
    <div className="file_cell">
      <div className="file_cell-chosen">
        {chosen.map((f) => (
          <span key={f.id} title={f.title} className="file_cell-item">
            {f.file && filePreview(f.file.content_type) === 'image'
              ? <img src={`${base}${f.file.url}`} alt={f.title} className="file_cell-thumb" />
              : <span>{f.title}</span>}
          </span>
        ))}
      </div>
      {many ? (
        <details>
          <summary>{selected.length === 0 ? 'Choose files' : `${selected.length} chosen`}</summary>
          <fieldset aria-label={label}>
            {files.map((f) => (
              <label key={f.id} className="file_cell-option">
                <Input
                  type="checkbox"
                  checked={selected.includes(f.id)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...selected, f.id] : selected.filter((id) => id !== f.id)
                    onChange(next.length ? next : null)
                  }}
                />
                {f.title}
              </label>
            ))}
            {files.length === 0 && <p>No uploaded files in this Space yet.</p>}
          </fieldset>
        </details>
      ) : (
        <Select aria-label={label} value={selected[0] ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
          <option value="">{files.length === 0 ? 'No uploaded files yet' : 'No file'}</option>
          {files.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
        </Select>
      )}
    </div>
  )
}
