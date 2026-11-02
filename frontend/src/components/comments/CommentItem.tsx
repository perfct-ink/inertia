import { Button } from '@/components/ui'
import { commentTimeLabel, splitMentions, type MentionablePerson } from '@/data/comment'
import type { ItemComment } from '@/types'
import { CommentComposer } from './CommentComposer'
import './Comments.scss'

type CommentItemProps = {
  comment: ItemComment
  people: MentionablePerson[]
  canEdit: boolean
  canDelete: boolean
  editing: boolean
  onEdit: () => void
  onDelete: () => void
  onSave: (body: string, mentionedIds: number[]) => Promise<unknown>
  onCancelEdit: () => void
}

// One comment or reply: who wrote it, when, the text with @mentions
// highlighted, and (for those allowed) Edit and Delete.
export function CommentItem({ comment, people, canEdit, canDelete, editing, onEdit, onDelete, onSave, onCancelEdit }: CommentItemProps) {
  const author = comment.author?.name ?? 'Deleted user'
  return (
    <div className="comments-item">
      <div className="comments-item-header">
        <span className="comments-item-author">{author}</span>
        <time className="comments-item-time" dateTime={comment.created_at} title={new Date(comment.created_at).toLocaleString()}>
          {commentTimeLabel(comment.created_at)}
        </time>
        {comment.edited_at && <span className="comments-item-edited">(edited)</span>}
      </div>

      {editing ? (
        <CommentComposer
          autoFocus
          label={`Edit comment by ${author}`}
          submitLabel="Save"
          people={people}
          initialValue={comment.body}
          initialPicked={comment.mentioned_users.map((user) => user.id)}
          onSubmit={onSave}
          onCancel={onCancelEdit}
        />
      ) : (
        <>
          <p className="comments-item-body">
            {splitMentions(comment.body, comment.mentioned_users).map((segment, index) => (
              <span key={index} className={segment.mention ? 'comments-mention' : undefined}>{segment.text}</span>
            ))}
          </p>
          {(canEdit || canDelete) && (
            <div className="comments-item-actions">
              {canEdit && <Button variant="ghost" className="comments-action" aria-label={`Edit comment by ${author}`} onClick={onEdit}>Edit</Button>}
              {canDelete && <Button variant="ghost" className="comments-action comments-action--delete" aria-label={`Delete comment by ${author}`} onClick={onDelete}>Delete</Button>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
