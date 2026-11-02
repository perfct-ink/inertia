import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { CommentableType, ItemComment } from '@/types'

// The conversation on one task, epic, initiative or milestone, oldest first.
// Another member may have just posted, so always refetch when it is opened.
export function useComments(type: CommentableType, id: number) {
  return useQuery<ItemComment[]>({
    queryKey: ['comments', type, id],
    queryFn: () => api.get('/api/v1/comments', { params: { commentable_type: type, commentable_id: id } }).then((r) => r.data),
    staleTime: 0,
  })
}

type NewComment = {
  commentable_type: CommentableType
  commentable_id: number
  body: string
  parent_id?: number
  mentioned_user_ids: number[]
}

// Failed calls show an error notice (see lib/api.ts), so these only refresh the list on success.
export function useCreateComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NewComment) => api.post('/api/v1/comments', { comment: data }).then((r) => r.data as ItemComment),
    onSuccess: (_comment, data) => qc.invalidateQueries({ queryKey: ['comments', data.commentable_type, data.commentable_id] }),
  })
}

export function useUpdateComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; body: string; mentioned_user_ids: number[] }) =>
      api.patch(`/api/v1/comments/${id}`, { comment: data }).then((r) => r.data as ItemComment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments'] }),
  })
}

// Replies are deleted with their comment.
export function useDeleteComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/comments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments'] }),
  })
}
