import { useEffect, useState, type FormEvent } from 'react'
import { Button, FormError, Input, Modal, Select, classNames } from '@/components/ui'
import { useCreateParagraphStyle, useUpdateParagraphStyle } from '@/api/paragraphStyles'
import { errorMessage } from '@/util/errorMessage'
import {
  STYLE_ALIGNMENTS, STYLE_ALIGNMENT_LABELS, STYLE_BASES, STYLE_BASE_LABELS, STYLE_COLORS, STYLE_FONTS, STYLE_FONT_LABELS,
  STYLE_NAME_MAX, STYLE_SIZES, STYLE_SPACINGS, STYLE_WEIGHTS, STYLE_WEIGHT_LABELS, validateStyleName, withProperty,
  type CustomParagraphStyle, type StyleBase, type StyleProperties,
} from '@/data/customParagraphStyle'
import './CustomStyleDialog.scss'

interface Props {
  open: boolean
  // The style being edited, or null to make a new one.
  editing?: CustomParagraphStyle | null
  // For a new style, what to start from: the style of the paragraph the cursor is in.
  initial: { base: StyleBase; properties: StyleProperties }
  // The person's custom styles, so a taken name is caught before asking.
  styles: CustomParagraphStyle[]
  onSaved: (style: CustomParagraphStyle) => void
  onClose: () => void
}

// A labelled dropdown whose empty choice means "leave it to the base style".
function Field<T extends string | number>({ label, value, options, onChange }: {
  label: string
  value: T | undefined
  options: { value: T; label: string }[]
  onChange: (value: T | undefined) => void
}) {
  return (
    <label className="custom_style_dialog-field">
      {label}
      <Select
        value={value === undefined ? '' : String(value)}
        onChange={(e) => onChange(options.find((o) => String(o.value) === e.target.value)?.value)}
      >
        <option value="">Default</option>
        {options.map((o) => <option key={o.value} value={String(o.value)}>{o.label}</option>)}
      </Select>
    </label>
  )
}

// Names a paragraph style and sets its formatting on top of a built-in style,
// then saves it to the person's own list (every document sees it). With
// `editing` it changes that style instead of making a new one.
export default function CustomStyleDialog({ open, editing = null, initial, styles, onSaved, onClose }: Props) {
  const create = useCreateParagraphStyle()
  const update = useUpdateParagraphStyle()
  const saving = create.isPending || update.isPending
  const [name, setName] = useState('')
  const [base, setBase] = useState<StyleBase>('body')
  const [properties, setProperties] = useState<StyleProperties>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setBase(editing?.base ?? initial.base)
    setProperties(editing?.properties ?? initial.properties)
    setError('')
  }, [open, initial, editing])

  const set = <K extends keyof StyleProperties>(key: K) => (value: StyleProperties[K] | undefined) =>
    setProperties((current) => withProperty(current, key, value))

  function submit(e: FormEvent) {
    e.preventDefault()
    const problem = validateStyleName(name, styles.filter((style) => style.id !== editing?.id))
    if (problem) return setError(problem)
    setError('')
    const fields = { name: name.replace(/\s+/g, ' ').trim(), base, properties }
    const callbacks = { onSuccess: onSaved, onError: (err: unknown) => setError(errorMessage(err)) }
    if (editing) update.mutate({ id: editing.id, ...fields }, callbacks)
    else create.mutate(fields, callbacks)
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Edit paragraph style' : 'New paragraph style'}
      description={editing ? 'Documents you edit are updated to match.' : 'Saved to your styles, for every document.'}
      onClose={onClose}
      className="custom_style_dialog"
    >
      <form onSubmit={submit} className="ui-modal-form">
        <label className="custom_style_dialog-field">
          Name
          <Input value={name} maxLength={STYLE_NAME_MAX} autoFocus onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="custom_style_dialog-field">
          Based on
          <Select value={base} onChange={(e) => setBase(e.target.value as StyleBase)}>
            {STYLE_BASES.map((id) => <option key={id} value={id}>{STYLE_BASE_LABELS[id]}</option>)}
          </Select>
        </label>

        <div className="custom_style_dialog-grid">
          <Field label="Font" value={properties.font} onChange={set('font')} options={STYLE_FONTS.map((f) => ({ value: f, label: STYLE_FONT_LABELS[f] }))} />
          <Field label="Size" value={properties.size} onChange={set('size')} options={STYLE_SIZES.map((s) => ({ value: s, label: `${s} px` }))} />
          <Field label="Weight" value={properties.weight} onChange={set('weight')} options={STYLE_WEIGHTS.map((w) => ({ value: w, label: STYLE_WEIGHT_LABELS[w] }))} />
          <Field label="Line spacing" value={properties.spacing} onChange={set('spacing')} options={STYLE_SPACINGS} />
          <Field label="Alignment" value={properties.align} onChange={set('align')} options={STYLE_ALIGNMENTS.map((a) => ({ value: a, label: STYLE_ALIGNMENT_LABELS[a] }))} />
        </div>

        <div className="custom_style_dialog-field" role="group" aria-label="Color">
          Color
          <div className="custom_style_dialog-colors">
            <Button
              type="button"
              aria-pressed={properties.color === undefined}
              onClick={() => set('color')(undefined)}
              className={classNames('custom_style_dialog-color', 'custom_style_dialog-color--default', properties.color === undefined && 'custom_style_dialog-color--active')}
            >
              Default
            </Button>
            {STYLE_COLORS.map((c) => (
              <Button
                key={c.value}
                type="button"
                aria-label={c.label}
                aria-pressed={properties.color === c.value}
                title={c.label}
                onClick={() => set('color')(c.value)}
                style={{ backgroundColor: c.value }}
                className={classNames('custom_style_dialog-color', properties.color === c.value && 'custom_style_dialog-color--active')}
              />
            ))}
          </div>
        </div>

        <FormError message={error} />

        <div className="ui-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save style' : 'Create style'}</Button>
        </div>
      </form>
    </Modal>
  )
}
