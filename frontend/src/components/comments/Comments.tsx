import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, ConfirmDialog, FormError } from '@/components/ui'
import { useComments, useCreateComment, useDeleteComment, useUpdateComment } from '@/api/comments'
import { useWorkspace } from '@/api/workspace'
import { useWorkspaceMembers } from '@/api/workspaceMembers'
import { useAuthStore } from '@/store/auth'
import { buildThreads, canDeleteComment, canEditComment, type MentionablePerson } from '@/data/comment'
import { canManageWorkspace, canWriteWorkspace } from '@/data/workspace'
import type { CommentableType, ItemComment } from '@/types'
import { CommentComposer } from './CommentComposer'
import { CommentItem } from './CommentItem'
import './Comments.scss'

// The conversation on one task, epic, initiative or milestone: comments with
// their replies, and a box to write a new one. Viewers can read but not write.
export function Comments({ type, id }: { type: CommentableType; id: number }) {
  const me = useAuthStore((s) => s.user)
  const { data: workspace } = useWorkspace()
  const { data: members = [] } = useWorkspaceMembers(workspace?.id ?? 0)
  const { data: comments = [], isLoading, isError } = useComments(type, id)
  const createComment = useCreateComment()
  const updateComment = useUpdateComment()
  const deleteComment = useDeleteComment()
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<ItemComment | null>(null)
  const list = useRef<HTMLUListElement>(null)

  const canWrite = canWriteWorkspace(workspace?.role)
  const canManage = canManageWorkspace(workspace?.role)
  // You can't usefully mention yourself, so you aren't suggested.
  const people: MentionablePerson[] = members
    .filter((member) => member.user_id !== me?.id)
    .map((member) => ({ id: member.user_id, name: member.user.name, email: member.user.email }))
  const threads = buildThreads(comments)

  // A new comment lands at the bottom: keep it in view.
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight
  }, [comments.length])

  const post = (body: string, mentionedIds: number[], parentId?: number) =>
    createComment.mutateAsync({ commentable_type: type, commentable_id: id, body, parent_id: parentId, mentioned_user_ids: mentionedIds })

  function renderItem(comment: ItemComment) {
    return (
      <CommentItem
        comment={comment}
        people={people}
        canEdit={canWrite && canEditComment(comment, me?.id)}
        canDelete={canWrite && canDeleteComment(comment, me?.id, canManage)}
        editing={editing === comment.id}
        onEdit={() => setEditing(comment.id)}
        onDelete={() => setDeleting(comment)}
        onSave={(body, mentionedIds) =>
          updateComment.mutateAsync({ id: comment.id, body, mentioned_user_ids: mentionedIds }).then(() => setEditing(null))}
        onCancelEdit={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="comments">
      {isLoading && <Loader2 className="comments-spinner" aria-label="Loading comments" />}
      <FormError message={isError ? 'Comments could not be loaded.' : null} />
      {!isLoading && !isError && threads.length === 0 && (
        <p className="comments-empty">No comments yet. Start the conversation.</p>
      )}

      {threads.length > 0 && (
        <ul ref={list} aria-label="Comments" className="comments-list">
          {threads.map(({ comment, replies }) => (
            <li key={comment.id} className="comments-thread">
              {renderItem(comment)}
              {replies.length > 0 && (
                <ul aria-label={`Replies to ${comment.author?.name ?? 'deleted user'}`} className="comments-replies">
                  {replies.map((reply) => <li key={reply.id}>{renderItem(reply)}</li>)}
                </ul>
              )}
              {canWrite && (
                <div className="comments-reply_box">
                  {replyingTo === comment.id ? (
                    <CommentComposer
                      autoFocus
                      label="Reply"
                      submitLabel="Reply"
                      placeholder="Write a reply. Type @ to mention someone."
                      people={people}
                      onSubmit={(body, mentionedIds) => post(body, mentionedIds, comment.id).then(() => setReplyingTo(null))}
                      onCancel={() => setReplyingTo(null)}
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      className="comments-action"
                      aria-label={`Reply to ${comment.author?.name ?? 'deleted user'}`}
                      onClick={() => setReplyingTo(comment.id)}
                    >
                      Reply
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite
        ? <CommentComposer label="Add a comment" submitLabel="Comment" people={people} onSubmit={(body, mentionedIds) => post(body, mentionedIds)} />
        : workspace && <p className="comments-hint">Viewers can read comments but not write them.</p>}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this comment?"
        description={deleting && comments.some((c) => c.parent_id === deleting.id) ? 'Its replies are deleted with it.' : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (deleting) deleteComment.mutate(deleting.id) }}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
