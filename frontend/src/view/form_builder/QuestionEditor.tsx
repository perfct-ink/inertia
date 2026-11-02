import { useState } from 'react'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { Button, Input, Select, Textarea } from '@/components/ui'
import {
  QUESTION_KINDS, TARGET_LABEL, changeKind, changeTarget, optionsFromText, optionsToText, targetsFor,
} from '@/data/taskForm'
import type { TaskFormQuestion, TaskFormQuestionKind, TaskFormTarget } from '@/types/taskForm'

type Props = {
  question: TaskFormQuestion
  // 1-based position, shown in the labels so each control says which question it is.
  number: number
  count: number
  // Parts of the task another question already fills in (each can only be asked once).
  taken: Set<TaskFormTarget>
  onChange: (question: TaskFormQuestion) => void
  onMove: (delta: -1 | 1) => void
  onRemove: () => void
}

// One question in the builder: what it asks, its type, which part of the task
// the answer fills in, and (for a choice) the options people pick from.
export default function QuestionEditor({ question, number, count, taken, onChange, onMove, onRemove }: Props) {
  const targets = targetsFor(question.kind).filter((target) => target === question.target || !taken.has(target))

  return (
    <li className="form_builder-question" aria-label={`Question ${number}`}>
      <div className="form_builder-question-top">
        <Input
          aria-label={`Question ${number} label`}
          placeholder="What do you want to ask?"
          value={question.label}
          onChange={(e) => onChange({ ...question, label: e.target.value })}
        />
        <div className="form_builder-question-buttons">
          <Button type="button" onClick={() => onMove(-1)} disabled={number === 1} aria-label={`Move question ${number} up`} className="form_builder-icon_button">
            <ArrowUp className="form_builder-icon" aria-hidden="true" />
          </Button>
          <Button type="button" onClick={() => onMove(1)} disabled={number === count} aria-label={`Move question ${number} down`} className="form_builder-icon_button">
            <ArrowDown className="form_builder-icon" aria-hidden="true" />
          </Button>
          <Button type="button" onClick={onRemove} disabled={question.target === 'title'} aria-label={`Remove question ${number}`} className="form_builder-icon_button form_builder-icon_button--remove">
            <X className="form_builder-icon" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="form_builder-question-fields">
        <label className="form_builder-field">
          <span>Type</span>
          <Select
            value={question.kind}
            onChange={(e) => onChange(changeKind(question, e.target.value as TaskFormQuestionKind))}
          >
            {QUESTION_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
          </Select>
        </label>
        <label className="form_builder-field">
          <span>Fills in</span>
          <Select
            value={question.target}
            onChange={(e) => onChange(changeTarget(question, e.target.value as TaskFormTarget))}
          >
            {targets.map((target) => <option key={target} value={target}>{TARGET_LABEL[target]}</option>)}
          </Select>
        </label>
        <label className="form_builder-check">
          <Input
            type="checkbox"
            checked={question.required}
            disabled={question.target === 'title'}
            onChange={(e) => onChange({ ...question, required: e.target.checked })}
          />
          <span>Required</span>
        </label>
      </div>

      {question.kind === 'choice' && <ChoiceList number={number} options={question.options} onChange={(options) => onChange({ ...question, options })} />}
    </li>
  )
}

// The choices, one per line. The text is kept here, not rebuilt from the
// options, so a line being typed (or a trailing newline) isn't swallowed.
function ChoiceList({ number, options, onChange }: { number: number; options: string[]; onChange: (options: string[]) => void }) {
  const [text, setText] = useState(() => optionsToText(options))
  return (
    <label className="form_builder-field">
      <span>Choices, one per line (at least two)</span>
      <Textarea
        aria-label={`Question ${number} choices`}
        rows={3}
        value={text}
        onChange={(e) => { setText(e.target.value); onChange(optionsFromText(e.target.value)) }}
      />
    </label>
  )
}
