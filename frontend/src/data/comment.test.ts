import {
  buildThreads,
  canDeleteComment,
  canEditComment,
  commentTimeLabel,
  insertMention,
  mentionQueryAt,
  mentionSuggestions,
  mentionedUserIds,
  splitMentions,
} from './comment'
import type { ItemComment } from '@/types'

function comment(id: number, extra: Partial<ItemComment> = {}): ItemComment {
  return {
    id, commentable_type: 'Task', commentable_id: 1, parent_id: null, body: `c${id}`,
    author_id: 1, author: { id: 1, name: 'Pat' }, mentioned_users: [], edited_at: null,
    created_at: `2026-11-01T10:0${id}:00Z`, ...extra,
  }
}

const people = [
  { id: 1, name: 'Pat Smith', email: 'pat@example.com' },
  { id: 2, name: 'Sam Lee', email: 'sam@example.com' },
  { id: 3, name: 'Zoë', email: 'zoe@example.com' },
]

describe('buildThreads', () => {
  it('nests replies under their comment, oldest first', () => {
    const threads = buildThreads([comment(4, { parent_id: 1 }), comment(2), comment(1), comment(3, { parent_id: 1 })])
    expect(threads.map((t) => t.comment.id)).toEqual([1, 2])
    expect(threads[0].replies.map((r) => r.id)).toEqual([3, 4])
    expect(threads[1].replies).toEqual([])
  })

  it('keeps a reply whose comment is missing as a comment of its own', () => {
    const threads = buildThreads([comment(1), comment(2, { parent_id: 99 })])
    expect(threads.map((t) => t.comment.id)).toEqual([1, 2])
  })

  it('is empty for no comments', () => {
    expect(buildThreads([])).toEqual([])
  })
})

describe('mentionedUserIds', () => {
  it('finds members named after an @', () => {
    expect(mentionedUserIds('Hi @Pat Smith and @sam lee!', people)).toEqual([1, 2])
  })

  it('ignores names without an @, inside words, or inside email addresses', () => {
    expect(mentionedUserIds('Pat Smith said hi', people)).toEqual([])
    expect(mentionedUserIds('mail me@Pat Smith', people)).toEqual([])
    expect(mentionedUserIds('hi @Sam Leeson', people)).toEqual([])
  })

  it('matches names with accents and at the start of a line', () => {
    expect(mentionedUserIds('hey\n@Zoë, ready?', people)).toEqual([3])
  })

  it('needs a pick when two members share a name', () => {
    const twins = [{ id: 5, name: 'Alex' }, { id: 6, name: 'Alex' }, { id: 7, name: 'Bo' }]
    expect(mentionedUserIds('@Alex @Bo', twins)).toEqual([7])
    expect(mentionedUserIds('@Alex @Bo', twins, [6])).toEqual([6, 7])
  })
})

describe('splitMentions', () => {
  it('marks the mentioned names and leaves the rest alone', () => {
    const segments = splitMentions('Hi @Pat Smith, meet @Sam Lee.', [people[0], people[1]])
    expect(segments).toEqual([
      { text: 'Hi ', mention: false },
      { text: '@Pat Smith', mention: true },
      { text: ', meet ', mention: false },
      { text: '@Sam Lee', mention: true },
      { text: '.', mention: false },
    ])
  })

  it('does not highlight people the server did not record', () => {
    expect(splitMentions('Hi @Sam Lee', [])).toEqual([{ text: 'Hi @Sam Lee', mention: false }])
  })

  it('prefers the longer name when one is a prefix of another', () => {
    const segments = splitMentions('@Pat Smith', [{ id: 8, name: 'Pat' }, people[0]])
    expect(segments).toEqual([{ text: '@Pat Smith', mention: true }])
  })

  it('escapes regular expression characters in names', () => {
    const segments = splitMentions('hi @A.B (ok)', [{ id: 9, name: 'A.B' }])
    expect(segments[1]).toEqual({ text: '@A.B', mention: true })
    expect(splitMentions('hi @AxB', [{ id: 9, name: 'A.B' }])).toEqual([{ text: 'hi @AxB', mention: false }])
  })
})

describe('typing a mention', () => {
  it('finds the @partial before the caret', () => {
    expect(mentionQueryAt('Hi @Sa', 6)).toEqual({ start: 3, query: 'Sa' })
    expect(mentionQueryAt('@', 1)).toEqual({ start: 0, query: '' })
    expect(mentionQueryAt('(@Pa', 4)).toEqual({ start: 1, query: 'Pa' })
  })

  it('finds nothing after a space, inside a word, or away from the caret', () => {
    expect(mentionQueryAt('Hi @Sam Lee ', 12)).toBeNull()
    expect(mentionQueryAt('mail me@example', 15)).toBeNull()
    expect(mentionQueryAt('Hi @Sa there', 6)).toEqual({ start: 3, query: 'Sa' })
    expect(mentionQueryAt('Hi there', 8)).toBeNull()
  })

  it('suggests people whose name word or email starts with the query', () => {
    expect(mentionSuggestions(people, '').map((p) => p.id)).toEqual([1, 2, 3])
    expect(mentionSuggestions(people, 'le').map((p) => p.id)).toEqual([2])
    expect(mentionSuggestions(people, 'PAT').map((p) => p.id)).toEqual([1])
    expect(mentionSuggestions(people, 'zoe@').map((p) => p.id)).toEqual([3])
    expect(mentionSuggestions(people, 'nobody')).toEqual([])
    expect(mentionSuggestions(people, '', 2)).toHaveLength(2)
  })

  it('replaces the partial with the full name and moves the caret after it', () => {
    const result = insertMention('Hi @Sa, ok', { start: 3, query: 'Sa' }, 6, 'Sam Lee')
    expect(result).toEqual({ text: 'Hi @Sam Lee , ok', caret: 12 })
  })
})

describe('permissions', () => {
  it('lets only the author edit', () => {
    expect(canEditComment(comment(1), 1)).toBe(true)
    expect(canEditComment(comment(1), 2)).toBe(false)
    expect(canEditComment(comment(1, { author_id: null, author: null }), null)).toBe(false)
  })

  it('lets the author or a manager delete', () => {
    expect(canDeleteComment(comment(1), 1, false)).toBe(true)
    expect(canDeleteComment(comment(1), 2, false)).toBe(false)
    expect(canDeleteComment(comment(1), 2, true)).toBe(true)
  })
})

describe('commentTimeLabel', () => {
  const now = new Date('2026-11-01T12:00:00Z')

  it('reads as relative time, then a date', () => {
    expect(commentTimeLabel('2026-11-01T11:59:40Z', now)).toBe('just now')
    expect(commentTimeLabel('2026-11-01T11:55:00Z', now)).toBe('5m ago')
    expect(commentTimeLabel('2026-11-01T09:00:00Z', now)).toBe('3h ago')
    expect(commentTimeLabel('2026-10-30T12:00:00Z', now)).toBe('2d ago')
    expect(commentTimeLabel('2026-10-01T12:00:00Z', now)).toBe('2026-10-01')
  })
})
