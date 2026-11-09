import type { CommentPerson, ItemComment } from '@/types'

// Mirrors Comment::MAX_BODY_LENGTH on the server.
export const MAX_COMMENT_LENGTH = 5000

// A person who can be @mentioned: a member of the Space.
export interface MentionablePerson extends CommentPerson {
  email: string
}

export interface CommentThread {
  comment: ItemComment
  replies: ItemComment[]
}

const WORD = '\\p{L}\\p{M}\\p{N}_'

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const byAge = (a: ItemComment, b: ItemComment) => a.created_at.localeCompare(b.created_at) || a.id - b.id

// Groups the flat list the API returns into threads: top-level comments
// oldest first, each with its replies oldest first. A reply whose comment is
// missing from the list is shown as a comment of its own rather than lost.
export function buildThreads(comments: ItemComment[]): CommentThread[] {
  const sorted = [...comments].sort(byAge)
  const ids = new Set(sorted.map((c) => c.id))
  const threads = new Map<number, CommentThread>()
  for (const comment of sorted) {
    if (comment.parent_id === null || !ids.has(comment.parent_id)) threads.set(comment.id, { comment, replies: [] })
  }
  for (const comment of sorted) {
    if (comment.parent_id !== null) threads.get(comment.parent_id)?.replies.push(comment)
  }
  return [...threads.values()]
}

// Whether "@Name" appears in the text as a mention: at the start of a word,
// not inside an email address, and not as the front of a longer name.
// Same rule as Comment#named_in_body? on the server.
function mentionPattern(names: string[]): RegExp {
  const longestFirst = [...names].sort((a, b) => b.length - a.length).map(escapeRegExp)
  return new RegExp(`(^|[^${WORD}@])(@(?:${longestFirst.join('|')}))(?![${WORD}])`, 'giu')
}

// The people a comment mentions: members whose "@Name" is in the text. When
// several members share a name only the ones picked from the suggestions count.
export function mentionedUserIds(body: string, people: CommentPerson[], picked: number[] = []): number[] {
  const byName = new Map<string, CommentPerson[]>()
  for (const person of people) byName.set(person.name, [...(byName.get(person.name) ?? []), person])
  const ids: number[] = []
  for (const [name, sameName] of byName) {
    if (!mentionPattern([name]).test(body)) continue
    const chosen = sameName.length === 1 ? sameName : sameName.filter((p) => picked.includes(p.id))
    ids.push(...chosen.map((p) => p.id))
  }
  return ids
}

export interface BodySegment {
  text: string
  mention: boolean
}

// Cuts a comment into plain and @mention pieces so mentions can be highlighted.
// Only people the server recorded as mentioned are highlighted.
export function splitMentions(body: string, mentioned: CommentPerson[]): BodySegment[] {
  const names = [...new Set(mentioned.map((p) => p.name))]
  if (names.length === 0) return [{ text: body, mention: false }]
  const segments: BodySegment[] = []
  let last = 0
  for (const match of body.matchAll(mentionPattern(names))) {
    const start = (match.index ?? 0) + match[1].length
    if (start > last) segments.push({ text: body.slice(last, start), mention: false })
    segments.push({ text: match[2], mention: true })
    last = start + match[2].length
  }
  if (last < body.length) segments.push({ text: body.slice(last), mention: false })
  return segments
}

export interface MentionQuery {
  // Index of the "@" in the text.
  start: number
  query: string
}

// The "@partial" being typed right before the caret, if any. It must start a
// word, and ends at the first space, so "@Sa" suggests people and "@Sam Lee " does not.
export function mentionQueryAt(text: string, caret: number): MentionQuery | null {
  const before = text.slice(0, caret)
  const match = /(^|[\s(])@([^\s@]*)$/.exec(before)
  if (!match) return null
  return { start: before.length - match[2].length - 1, query: match[2] }
}

// People to suggest for what follows the "@": a name word or the email starts with it.
export function mentionSuggestions(people: MentionablePerson[], query: string, limit = 6): MentionablePerson[] {
  const q = query.toLowerCase()
  const matches = (person: MentionablePerson) =>
    !q ||
    person.name.toLowerCase().split(/\s+/).some((word) => word.startsWith(q)) ||
    person.email.toLowerCase().startsWith(q)
  return people.filter(matches).sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit)
}

// Replaces the "@partial" with the chosen person's "@Name " and says where the caret goes.
export function insertMention(text: string, mention: MentionQuery, caret: number, name: string): { text: string; caret: number } {
  const inserted = `@${name} `
  return { text: text.slice(0, mention.start) + inserted + text.slice(caret), caret: mention.start + inserted.length }
}

// Only the author edits a comment.
export function canEditComment(comment: ItemComment, userId: number | null | undefined): boolean {
  return comment.author_id !== null && comment.author_id === userId
}

// The author, or a Space admin/owner (canManage), deletes a comment.
export function canDeleteComment(comment: ItemComment, userId: number | null | undefined, canManage: boolean): boolean {
  return canManage || canEditComment(comment, userId)
}

// "just now", "5m ago", "3h ago", "2d ago", then the date.
export function commentTimeLabel(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return then.toISOString().slice(0, 10)
}
