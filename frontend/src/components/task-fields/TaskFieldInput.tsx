import { useState } from 'react'
import { Star, ThumbsUp, X } from 'lucide-react'
import { Button, Input, Select, classNames } from '@/components/ui'
import {
  RATING_MAX, MAX_LABEL_LENGTH, addTags, choiceOf, hasVoted, isChecked, nextRating, ratingOf, removeTag, tagsOf, votersOf,
} from '@/data/taskField'
import type { Task, TaskField, TaskFieldValue } from '@/types'
import './TaskFields.scss'

interface TaskFieldInputProps {
  field: TaskField
  task: Task
  // The signed-in user, for the vote button.
  userId: number | null | undefined
  // Save a value; an empty one (null) clears it.
  onChange: (value: TaskFieldValue | null) => void
  // Cast or take back the signed-in user's own vote.
  onVote: (voted: boolean) => void
}

// The control that edits one custom field of one task, by the field's kind.
export function TaskFieldInput({ field, task, userId, onChange, onVote }: TaskFieldInputProps) {
  switch (field.field_type) {
    case 'tags':
      return <TagsInput field={field} tags={tagsOf(task, field)} onChange={onChange} />
    case 'dropdown':
      return (
        <Select
          aria-label={field.name}
          className="task_fields-select"
          value={choiceOf(task, field)}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">None</option>
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </Select>
      )
    case 'checkbox':
      return (
        <Input
          type="checkbox"
          aria-label={field.name}
          checked={isChecked(task, field)}
          onChange={(e) => onChange(e.target.checked ? true : null)}
        />
      )
    case 'rating':
      return <RatingInput label={field.name} rating={ratingOf(task, field)} onChange={onChange} />
    case 'vote':
      return <VoteInput field={field} voters={votersOf(task, field)} userId={userId} onVote={onVote} />
  }
}

function TagsInput({ field, tags, onChange }: { field: TaskField; tags: string[]; onChange: TaskFieldInputProps['onChange'] }) {
  const [draft, setDraft] = useState('')

  function commit() {
    if (!draft.trim()) return
    onChange(addTags(tags, draft))
    setDraft('')
  }

  return (
    <div className="task_fields-tags">
      {tags.length > 0 && (
        <ul className="task_fields-tag_list" aria-label={`${field.name} tags`}>
          {tags.map((tag) => (
            <li key={tag} className="task_fields-tag">
              <span className="task_fields-tag_text">{tag}</span>
              <Button
                variant="ghost"
                className="task_fields-tag_remove"
                aria-label={`Remove tag ${tag}`}
                onClick={() => onChange(removeTag(tags, tag))}
              >
                <X className="task_fields-icon task_fields-icon--sm" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Input
        aria-label={`Add a tag to ${field.name}`}
        placeholder="Add a tag, then press Enter"
        maxLength={MAX_LABEL_LENGTH}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        onBlur={commit}
      />
    </div>
  )
}

// Five stars; the current star again, or Clear, takes the rating away. Also the
// control of a Collection's Rating field.
export function RatingInput({ label, rating, onChange }: { label: string; rating: number; onChange: (value: number | null) => void }) {
  return (
    <div className="task_fields-rating">
      <div role="group" aria-label={label} className="task_fields-stars">
        {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((star) => (
          <Button
            key={star}
            aria-pressed={star === rating}
            aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
            className={classNames('task_fields-star', star <= rating && 'task_fields-star--on')}
            onClick={() => onChange(nextRating(rating, star))}
          >
            <Star className="task_fields-icon" aria-hidden="true" />
          </Button>
        ))}
      </div>
      {rating > 0 && (
        <Button variant="ghost" className="task_fields-touch" aria-label={`Clear ${label}`} onClick={() => onChange(null)}>Clear</Button>
      )}
    </div>
  )
}

function VoteInput({ field, voters, userId, onVote }: { field: TaskField; voters: number[]; userId: number | null | undefined; onVote: (voted: boolean) => void }) {
  const voted = hasVoted(voters, userId)
  return (
    <Button
      variant="secondary"
      aria-pressed={voted}
      aria-label={`${voted ? 'Take back your vote on' : 'Vote on'} ${field.name}, ${voters.length} ${voters.length === 1 ? 'vote' : 'votes'}`}
      className={classNames('task_fields-vote', voted && 'task_fields-vote--on')}
      onClick={() => onVote(!voted)}
    >
      <ThumbsUp className="task_fields-icon" aria-hidden="true" />
      <span>{voted ? 'Voted' : 'Vote'}</span>
      <span className="task_fields-vote_count">{voters.length}</span>
    </Button>
  )
}
