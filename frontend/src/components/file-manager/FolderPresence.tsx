import { useFolderRoom } from '@/hooks/useFolderRoom'
import { initialsOf } from '@/data/presence'
import './FolderPresence.scss'

// The people who have this folder open right now, as a row of avatars (their
// names on hover and for screen readers). Nothing at all when you are alone.
export function FolderPresence({ folderId, enabled }: { folderId: number; enabled: boolean }) {
  const people = useFolderRoom(folderId, enabled)
  if (people.length === 0) return null
  return (
    <ul className="folder_presence" aria-label="People here now">
      {people.map((person) => (
        <li
          key={person.id}
          className="folder_presence-person"
          title={person.name}
          aria-label={person.name}
          style={{ '--folder_presence-color': person.color } as React.CSSProperties}
        >
          <span aria-hidden="true">{initialsOf(person.name)}</span>
        </li>
      ))}
    </ul>
  )
}
