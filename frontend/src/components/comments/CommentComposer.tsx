import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, Textarea, classNames } from '@/components/ui'
import {
  MAX_COMMENT_LENGTH,
  insertMention,
  mentionQueryAt,
  mentionSuggestions,
  mentionedUserIds,
  type MentionablePerson,
} from '@/data/comment'
import './Comments.scss'

type CommentComposerProps = {
  label: string
  submitLabel: string
  placeholder?: string
  // Members who can be @mentioned (the Space's members, without the signed-in user).
  people: MentionablePerson[]
  initialValue?: string
  // Ids already mentioned in initialValue, so editing keeps them.
  initialPicked?: number[]
  autoFocus?: boolean
  // Resolves when the comment is saved. A rejection keeps the text (the API layer shows the error).
  onSubmit: (body: string, mentionedIds: number[]) => Promise<unknown>
  onCancel?: () => void
}

// The text box for writing, replying to or editing a comment. Typing "@"
// suggests members; choosing one writes "@Name " into the text. Ctrl/Cmd+Enter posts.
export function CommentComposer({
  label, submitLabel, placeholder = 'Write a comment. Type @ to mention someone.', people,
  initialValue = '', initialPicked = [], autoFocus, onSubmit, onCancel,
}: CommentComposerProps) {
  const [value, setValue] = useState(initialValue)
  const [caret, setCaret] = useState(initialValue.length)
  const [picked, setPicked] = useState<number[]>(initialPicked)
  const [active, setActive] = useState(0)
  const [focused, setFocused] = useState(false)
  const [pending, setPending] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)
  const nextCaret = useRef<number | null>(null)
  const listId = useId()

  const mention = mentionQueryAt(value, caret)
  const suggestions = focused && mention ? mentionSuggestions(people, mention.query) : []
  const open = suggestions.length > 0
  const activeIndex = Math.min(active, suggestions.length - 1)

  // After choosing a suggestion, put the caret back behind the inserted name.
  useEffect(() => {
    if (nextCaret.current === null || !field.current) return
    field.current.focus()
    field.current.setSelectionRange(nextCaret.current, nextCaret.current)
    nextCaret.current = null
  }, [value])

  function pick(person: MentionablePerson) {
    if (!mention) return
    const next = insertMention(value, mention, caret, person.name)
    nextCaret.current = next.caret
    setValue(next.text)
    setCaret(next.caret)
    setPicked((ids) => [...ids, person.id])
    setActive(0)
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    const body = value.trim()
    if (!body || pending) return
    setPending(true)
    try {
      await onSubmit(body, mentionedUserIds(body, people, picked))
      setValue('')
      setCaret(0)
      setPicked([])
    } catch {
      // The API layer already showed the error; the text stays so nothing is lost.
    } finally {
      setPending(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((activeIndex + step + suggestions.length) % suggestions.length)
    } else if (open && (e.key === 'Enter' || e.key === 'Tab')) {
      e.preventDefault()
      pick(suggestions[activeIndex])
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <form className="comments-composer" onSubmit={submit}>
      <Textarea
        ref={field}
        aria-label={label}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${suggestions[activeIndex].id}` : undefined}
        placeholder={placeholder}
        value={value}
        rows={3}
        maxLength={MAX_COMMENT_LENGTH}
        autoFocus={autoFocus}
        className="comments-composer-field"
        onChange={(e) => { setValue(e.target.value); setCaret(e.target.selectionStart); setActive(0) }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {open && (
        <ul id={listId} role="listbox" aria-label="People to mention" className="comments-suggestions">
          {suggestions.map((person, index) => (
            <li
              key={person.id}
              id={`${listId}-${person.id}`}
              role="option"
              aria-selected={index === activeIndex}
              className={classNames('comments-suggestion', index === activeIndex && 'comments-suggestion--active')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(person)}
            >
              <span className="comments-suggestion-name">{person.name}</span>
              <span className="comments-suggestion-email">{person.email}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="comments-composer-buttons">
        {pending && <Loader2 className="comments-spinner" aria-label="Saving" />}
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="primary" disabled={!value.trim() || pending}>{submitLabel}</Button>
      </div>
    </form>
  )
}
