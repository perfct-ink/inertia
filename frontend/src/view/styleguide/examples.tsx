import { useId, useState, type ComponentType, type ReactNode } from 'react'
import {
  AttachmentCard, Button, ButtonLink, ConfirmDialog, DatePicker, Field, FormError, HealthBadge, Input, Menu, Modal,
  PromptDialog, Select, StatusDot, Textarea, type MenuItem,
} from '@/components/ui'
import { TASK_STATUS_COLORS, COLOR_LABEL } from '@/data/task_status'
import { useNotificationStore } from '@/store/notifications'
import type { MilestoneHealth } from '@/types'

const noop = () => {}

// A labelled row of one control in one state.
function Example({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="styleguide-example">
      <span id={id} className="styleguide-example-label">{label}</span>
      <div className="styleguide-example-items">{children}</div>
    </div>
  )
}

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'destructive', 'unstyled'] as const
const buttonLabel = (variant: string) => variant.charAt(0).toUpperCase() + variant.slice(1)

function ButtonExamples() {
  return (
    <>
      <Example label="Variants">
        {BUTTON_VARIANTS.map((v) => <Button key={v} variant={v}>{buttonLabel(v)}</Button>)}
      </Example>
      <Example label="Disabled">
        {BUTTON_VARIANTS.map((v) => <Button key={v} variant={v} disabled>{buttonLabel(v)}</Button>)}
      </Example>
      <Example label="Focus">
        {BUTTON_VARIANTS.map((v) => <Button key={v} variant={v} className="styleguide-state--focus">{buttonLabel(v)}</Button>)}
      </Example>
      <Example label="Links drawn as buttons">
        <ButtonLink variant="secondary" href="#styleguide-buttons">Secondary link</ButtonLink>
        <ButtonLink variant="primary" href="#styleguide-buttons">Primary link</ButtonLink>
      </Example>
    </>
  )
}

function FieldExamples() {
  const group = useId()
  return (
    <>
      <Example label="Text">
        <Input aria-label="Empty with placeholder" placeholder="Placeholder" />
        <Input aria-label="With a value" defaultValue="Ada Lovelace" />
      </Example>
      <Example label="Number and password">
        <Input aria-label="Number" type="number" defaultValue={42} />
        <Input aria-label="Password" type="password" defaultValue="secret" />
      </Example>
      <Example label="Disabled">
        <Input aria-label="Disabled text" defaultValue="Can't edit" disabled />
      </Example>
      <Example label="Focus">
        <Input aria-label="Focused text" defaultValue="Focused" className="styleguide-state--focus" />
      </Example>
      <Example label="Invalid, with its message">
        <Field label="Invalid email" error="Enter a full email address.">
          <Input defaultValue="ada@" />
        </Field>
      </Example>
      <Example label="Labelled field with a hint">
        <Field label="Nickname" hint="Shown next to your comments." optional>
          <Input placeholder="Ada" />
        </Field>
      </Example>
      <Example label="Invalid select and text area">
        <Field label="Role" error="Choose a role.">
          <Select defaultValue="">
            <option value="">Choose…</option>
            <option value="member">Member</option>
          </Select>
        </Field>
        <Field label="Reason" error="Say why.">
          <Textarea />
        </Field>
      </Example>
      <Example label="Checkbox">
        <Input type="checkbox" aria-label="Unchecked" />
        <Input type="checkbox" aria-label="Checked" defaultChecked />
        <Input type="checkbox" aria-label="Disabled checkbox" disabled />
        <Input type="checkbox" aria-label="Disabled and checked" defaultChecked disabled />
      </Example>
      <Example label="Radio">
        <Input type="radio" name={group} aria-label="First choice" defaultChecked />
        <Input type="radio" name={group} aria-label="Second choice" />
        <Input type="radio" name={`${group}-disabled`} aria-label="Disabled choice" disabled />
      </Example>
      <Example label="Text area">
        <Textarea aria-label="Notes" placeholder="Notes" />
        <Textarea aria-label="Disabled notes" defaultValue="Read only for now" disabled />
      </Example>
    </>
  )
}

function SelectExamples() {
  const options = [
    <option key="todo" value="todo">To do</option>,
    <option key="doing" value="doing">In progress</option>,
    <option key="done" value="done">Done</option>,
  ]
  return (
    <>
      <Example label="Closed (click or press ArrowDown to open the list)">
        <Select aria-label="Status" defaultValue="doing">{options}</Select>
      </Example>
      <Example label="Disabled">
        <Select aria-label="Disabled status" defaultValue="todo" disabled>{options}</Select>
      </Example>
      <Example label="Focus">
        <Select aria-label="Focused status" defaultValue="done" className="styleguide-state--focus">{options}</Select>
      </Example>
      <Example label="Disabled option">
        <Select aria-label="Status with a disabled option" defaultValue="todo">
          <option value="todo">To do</option>
          <option value="doing" disabled>In progress (unavailable)</option>
          <option value="done">Done</option>
        </Select>
      </Example>
    </>
  )
}

function DatePickerExamples() {
  return (
    <>
      <Example label="Empty (click the field or press ArrowDown to open the calendar)">
        <DatePicker aria-label="Empty date" />
      </Example>
      <Example label="With a date">
        <DatePicker aria-label="Due date" defaultValue="2026-11-03" />
      </Example>
      <Example label="Only 5 to 20 November can be picked">
        <DatePicker aria-label="Limited date" defaultValue="2026-11-10" min="2026-11-05" max="2026-11-20" />
      </Example>
      <Example label="Disabled and read-only">
        <DatePicker aria-label="Disabled date" defaultValue="2026-11-03" disabled />
        <DatePicker aria-label="Read-only date" defaultValue="2026-11-03" readOnly />
      </Example>
    </>
  )
}

function MenuExamples() {
  const items: MenuItem[] = [
    { key: 'marketing', label: 'Marketing site', checked: true, hint: 'owner', onSelect: noop },
    { key: 'mobile', label: 'Mobile app', checked: false, onSelect: noop },
    { key: 'new', label: 'New Space...', separatorBefore: true, onSelect: noop },
  ]
  return (
    <>
      <Example label="Opens below (ArrowDown on the button also opens it)">
        <Menu label="Choose a Space" items={items} triggerClassName="ui-button--secondary">Marketing site</Menu>
      </Example>
      <Example label="Plain actions">
        <Menu label="Row actions" items={[
          { key: 'rename', label: 'Rename', onSelect: noop },
          { key: 'delete', label: 'Delete', onSelect: noop, separatorBefore: true },
        ]} triggerClassName="ui-button--secondary">Actions</Menu>
      </Example>
    </>
  )
}

type DialogName = 'modal' | 'wide' | 'confirm' | 'destructive' | 'prompt'

function DialogExamples() {
  const [open, setOpen] = useState<DialogName | null>(null)
  const close = () => setOpen(null)
  return (
    <>
      <Example label="Dialogs (they open over the page, in the page's own theme)">
        <Button variant="secondary" onClick={() => setOpen('modal')}>Modal</Button>
        <Button variant="secondary" onClick={() => setOpen('wide')}>Wide modal</Button>
        <Button variant="secondary" onClick={() => setOpen('confirm')}>Confirm</Button>
        <Button variant="secondary" onClick={() => setOpen('destructive')}>Confirm deletion</Button>
        <Button variant="secondary" onClick={() => setOpen('prompt')}>Prompt</Button>
      </Example>
      <Modal open={open === 'modal'} title="Invite to this Space" description="They will get an email with a link." onClose={close}>
        <div className="ui-modal-actions">
          <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
          <Button type="button" variant="primary" onClick={close}>Send invite</Button>
        </div>
      </Modal>
      <Modal open={open === 'wide'} title="Wide dialog" wide onClose={close}>
        <p>A roomy dialog for content such as a file preview.</p>
        <div className="ui-modal-actions">
          <Button type="button" variant="primary" onClick={close}>Close</Button>
        </div>
      </Modal>
      <ConfirmDialog open={open === 'confirm'} title="Publish this roadmap?" description="Everyone with the link can see it." confirmLabel="Publish" onConfirm={noop} onClose={close} />
      <ConfirmDialog open={open === 'destructive'} title="Delete this project?" description="This can't be undone." confirmLabel="Delete" destructive onConfirm={noop} onClose={close} />
      <PromptDialog open={open === 'prompt'} title="Rename project" label="Project name" initialValue="Marketing site" submitLabel="Rename" onSubmit={noop} onClose={close} />
    </>
  )
}

const HEALTHS: MilestoneHealth[] = ['on_track', 'at_risk', 'off_track']

function FeedbackExamples() {
  const notify = useNotificationStore((s) => s.notify)
  return (
    <>
      <Example label="Form error">
        <FormError message="Couldn't save the task: the title can't be blank." />
      </Example>
      <Example label="Toast (shows in the page's own theme, bottom right)">
        <Button variant="secondary" onClick={() => notify("Couldn't move \"Ship\": the server said no.")}>Show an error toast</Button>
      </Example>
      <Example label="Health">
        {HEALTHS.map((h) => <HealthBadge key={h} health={h} />)}
      </Example>
      <Example label="Task status colors">
        {TASK_STATUS_COLORS.map((c) => (
          <span key={c} className="styleguide-status">
            <StatusDot color={c} />
            {COLOR_LABEL[c]}
          </span>
        ))}
      </Example>
    </>
  )
}

function AttachmentExamples() {
  return (
    <>
      <Example label="PDF: Preview and Download">
        <AttachmentCard name="Launch plan.pdf" url="/styleguide/launch-plan.pdf" type="application/pdf" size={248000} />
      </Example>
      <Example label="Audio with a player">
        <AttachmentCard name="Mix v3.mp3" url="/styleguide/mix-v3.mp3" type="audio/mpeg" size={4200000} player />
      </Example>
      <Example label="Selected, with Remove">
        <AttachmentCard name="Assets.zip" url="/styleguide/assets.zip" type="application/zip" size={12400000} selected onRemove={noop} />
      </Example>
      <Example label="Unavailable">
        <AttachmentCard name="Missing file.docx" url={null} />
      </Example>
    </>
  )
}

// The theme tokens every control is drawn with (Volta's, through _theme.scss).
export const SWATCHES = ['background', 'card', 'foreground', 'muted-foreground', 'border', 'border-strong', 'primary', 'primary-hover', 'accent', 'danger'] as const

function ColorExamples() {
  return (
    <Example label="Theme colors">
      {SWATCHES.map((name) => (
        <span key={name} className="styleguide-swatch">
          <span className="styleguide-swatch-chip" style={{ background: `var(--${name})` }} aria-hidden="true" />
          {name}
        </span>
      ))}
    </Example>
  )
}

export const SECTIONS: { id: string; title: string; Examples: ComponentType }[] = [
  { id: 'colors', title: 'Colors', Examples: ColorExamples },
  { id: 'buttons', title: 'Buttons', Examples: ButtonExamples },
  { id: 'fields', title: 'Fields', Examples: FieldExamples },
  { id: 'select', title: 'Select', Examples: SelectExamples },
  { id: 'date-picker', title: 'Date picker', Examples: DatePickerExamples },
  { id: 'menu', title: 'Menu', Examples: MenuExamples },
  { id: 'dialogs', title: 'Dialogs', Examples: DialogExamples },
  { id: 'feedback', title: 'Feedback and status', Examples: FeedbackExamples },
  { id: 'attachments', title: 'Attachment card', Examples: AttachmentExamples },
]
