import type { CommentableType, ItemComment } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

type NewComment = {
  commentable_type: CommentableType
  commentable_id: number
  body: string
  parent_id?: number
  mentioned_user_ids: number[]
}

type CommentChanges = { body: string; mentioned_user_ids: number[] }

export class CommentApi extends ApiResource<ItemComment, NewComment, CommentChanges> {
  constructor() {
    super('/api/v1/comments', 'comment', 'comments')
  }
}

export const commentApi = new CommentApi()

// The conversation on one task, epic, initiative or milestone, oldest first.
// Another member may have just posted, so always refetch when it is opened.
export const useComments = (type: CommentableType, id: number) =>
  useResourceList(commentApi, { params: { commentable_type: type, commentable_id: id }, staleTime: 0 })

// Failed calls show an error notice (see lib/api.ts), so these only refresh the lists on success.
// Every conversation's key starts with "comments", so one invalidation covers them.
export const useCreateComment = () => useResourceCreate(commentApi)
export const useUpdateComment = () => useResourceUpdate(commentApi)
// Replies are deleted with their comment.
export const useDeleteComment = () => useResourceDelete(commentApi)
