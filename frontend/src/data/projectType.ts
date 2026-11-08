import { PRD_TEMPLATE, SONG_TEMPLATE, bullets, doc, heading, paragraph, withTitle, type Json } from '@/data/documentTemplate'
import type { Folder, ProjectTypeKey, SavedProjectType } from '@/types'

// Project types. A type labels a project and sets what it starts with: some
// documents, Collections (a name and fields) and tasks. The built-in types are
// here; a Space's own are saved from its projects (SavedProjectType) and the
// server keeps their templates. `BUILT_IN_KEYS` is the same list as
// ProjectType::BUILT_IN in the backend. See docs/features/project_types.md.

export type CollectionFieldType = 'text' | 'integer' | 'number' | 'boolean' | 'date' | 'datetime'

// What a new project starts with; the same shape the server stores for a saved type.
export interface ProjectTemplate {
  documents: { title: string; doc_type?: 'document' | 'spreadsheet'; content: Json }[]
  collections: { title: string; fields: { name: string; data_type: CollectionFieldType }[] }[]
  tasks: { title: string }[]
}

export interface ProjectTypeDef {
  key: ProjectTypeKey
  label: string
  description: string
  // The emoji a project of this type starts with ('' for none).
  icon: string
  template: ProjectTemplate
}

// What the picker and the server need to start a project: its type, its starting
// icon, and the template to send (a saved type's template stays on the server).
export interface ProjectStart {
  project_type: ProjectTypeKey
  icon?: string
  template?: ProjectTemplate
}

export const BLANK_TYPE: ProjectTypeKey = 'blank'

const NOTHING: ProjectTemplate = { documents: [], collections: [], tasks: [] }
const list = (...titles: string[]) => titles.map((title) => ({ title }))
const page = (title: string, ...blocks: Json[]) => ({ title, content: doc(title, blocks) })
const field = (name: string, data_type: CollectionFieldType) => ({ name, data_type })

export const PROJECT_TYPES: ProjectTypeDef[] = [
  { key: BLANK_TYPE, label: 'Blank', description: 'Start empty.', icon: '', template: NOTHING },
  {
    key: 'software',
    label: 'Software',
    description: 'A product requirements document and a build-to-release task list.',
    icon: '🛠️',
    template: {
      documents: [{ title: 'Product requirements', content: withTitle(PRD_TEMPLATE, 'Product requirements').content }],
      collections: [],
      tasks: list('Write the requirements', 'Design', 'Build', 'Test', 'Release'),
    },
  },
  {
    key: 'music_release',
    label: 'Music release',
    description: 'A release plan, a song page and a tracks Collection, worked back from the release date.',
    icon: '🎵',
    template: {
      documents: [
        page(
          'Release plan',
          heading(2, 'Release'),
          bullets(['Release date: ', 'Format: single, EP or album', 'Distributor: ']),
          heading(2, 'Metadata'),
          bullets(['UPC (one per release): ', 'ISRC (one per track): see Tracks']),
          heading(2, 'Pitch'),
          paragraph('Send the editorial pitch at least 7 days before release; earlier is better.'),
          heading(2, 'Promo'),
          bullets(['']),
        ),
        { title: 'Song 1', content: withTitle(SONG_TEMPLATE, 'Song 1').content },
      ],
      collections: [{ title: 'Tracks', fields: [field('Title', 'text'), field('ISRC', 'text'), field('Mixed', 'boolean'), field('Mastered', 'boolean')] }],
      tasks: list(
        'Finish writing and recording',
        'Mix and master',
        'Artwork',
        'Credits and metadata (ISRC per track, UPC per release)',
        'Upload to the distributor',
        'Pitch to streaming editors (at least 7 days before release)',
        'Music video',
        'Promo and social posts',
        'Release day',
        'Post-release follow-up',
      ),
    },
  },
  {
    key: 'video',
    label: 'Video',
    description: 'A brief, a script and a shot list, from concept to publish.',
    icon: '🎬',
    template: {
      documents: [
        page('Brief', heading(2, 'Goal'), paragraph(), heading(2, 'Audience'), paragraph(), heading(2, 'Length and format'), paragraph(), heading(2, 'Deadline'), paragraph()),
        page('Script', heading(2, 'Hook'), paragraph(), heading(2, 'Body'), paragraph(), heading(2, 'Call to action'), paragraph()),
      ],
      collections: [{ title: 'Shot list', fields: [field('Shot', 'text'), field('Location', 'text'), field('Date', 'date'), field('Done', 'boolean')] }],
      tasks: list('Concept and brief', 'Script', 'Storyboard', 'Shoot', 'Edit', 'Review and revisions', 'Publish'),
    },
  },
  {
    key: 'event',
    label: 'Event',
    description: 'An event plan, a guest list and a to-do list from booking to thank-yous.',
    icon: '🎉',
    template: {
      documents: [
        page('Event plan', heading(2, 'Date and place'), paragraph(), heading(2, 'Goals'), bullets(['']), heading(2, 'Budget'), paragraph(), heading(2, 'Schedule'), bullets(['']), heading(2, 'Roles'), bullets([''])),
      ],
      collections: [{ title: 'Guest list', fields: [field('Name', 'text'), field('Email', 'text'), field('Attending', 'boolean')] }],
      tasks: list('Set the date and budget', 'Book the venue', 'Invite guests', 'Plan the schedule', 'Arrange food and equipment', 'Confirm with guests', 'Run the event', 'Thank guests and review'),
    },
  },
  {
    key: 'marketing_campaign',
    label: 'Marketing campaign',
    description: 'A campaign brief, a content calendar and a launch task list.',
    icon: '📣',
    template: {
      documents: [
        page('Campaign brief', heading(2, 'Goal'), paragraph(), heading(2, 'Audience'), paragraph(), heading(2, 'Message'), paragraph(), heading(2, 'Channels'), bullets(['']), heading(2, 'Budget'), paragraph(), heading(2, 'How we will measure it'), bullets([''])),
      ],
      collections: [{ title: 'Content calendar', fields: [field('Post', 'text'), field('Channel', 'text'), field('Publish date', 'date'), field('Published', 'boolean')] }],
      tasks: list('Write the brief', 'Plan the channels', 'Create the content', 'Schedule the posts', 'Launch', 'Report the results'),
    },
  },
  {
    key: 'writing',
    label: 'Writing or content',
    description: 'An outline and a draft, from first draft to publish.',
    icon: '✍️',
    template: {
      documents: [
        page('Outline', heading(2, 'Working title'), paragraph(), heading(2, 'Audience'), paragraph(), heading(2, 'Main points'), bullets(['']), heading(2, 'Sources'), bullets([''])),
        page('Draft', paragraph()),
      ],
      collections: [],
      tasks: list('Outline', 'First draft', 'Revise', 'Edit', 'Publish'),
    },
  },
  {
    key: 'personal',
    label: 'Personal',
    description: 'A notes page and nothing else.',
    icon: '🏠',
    template: { documents: [page('Notes', paragraph())], collections: [], tasks: [] },
  },
]

export const BUILT_IN_KEYS: ProjectTypeKey[] = PROJECT_TYPES.map((t) => t.key)

// A project's type; projects from before types read as blank.
export function projectTypeOf(project: Pick<Folder, 'project_type'>): ProjectTypeKey {
  return project.project_type ?? BLANK_TYPE
}

export function isBuiltIn(key: ProjectTypeKey): boolean {
  return BUILT_IN_KEYS.includes(key)
}

// What a type is called: a built-in's label, a saved type's name, or 'Custom type'
// when a saved type isn't (or isn't yet) in the list.
export function projectTypeLabel(key: ProjectTypeKey | undefined, saved: SavedProjectType[] = []): string {
  const type = key ?? BLANK_TYPE
  return PROJECT_TYPES.find((t) => t.key === type)?.label ?? saved.find((t) => t.key === type)?.name ?? 'Custom type'
}

export interface StartCounts {
  documents: number
  collections: number
  tasks: number
}

export function countsOf(template: ProjectTemplate): StartCounts {
  return { documents: template.documents.length, collections: template.collections.length, tasks: template.tasks.length }
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

// "2 documents, 1 Collection, 5 tasks": what a project of the type starts with;
// empty for a type that starts empty.
export function describeStart({ documents, collections, tasks }: StartCounts): string {
  return [
    documents > 0 && plural(documents, 'document'),
    collections > 0 && plural(collections, 'Collection'),
    tasks > 0 && plural(tasks, 'task'),
  ].filter(Boolean).join(', ')
}

// How to start a project of a type. A built-in type sends its template (the
// server only knows its key); a saved type sends none, since the server keeps it.
export function projectStart(key: ProjectTypeKey): ProjectStart {
  const type = PROJECT_TYPES.find((t) => t.key === key)
  const start: ProjectStart = { project_type: key }
  if (!type) return start
  if (type.icon) start.icon = type.icon
  if (describeStart(countsOf(type.template))) start.template = type.template
  return start
}
