import { FolderKanban } from 'lucide-react'
import { classNames } from '@/components/ui'
import { projectIconOf } from '@/data/project'
import type { Folder } from '@/types'
import './ProjectIcon.scss'

// A project's image, emoji or the default project icon, in a square box.
export default function ProjectIcon({ project, size = 'sm', className }: {
  project: Pick<Folder, 'icon' | 'image_url'>
  size?: 'sm' | 'lg'
  className?: string
}) {
  const icon = projectIconOf(project)
  return (
    <span className={classNames('ui-project_icon', `ui-project_icon--${size}`, className)} aria-hidden="true">
      {icon && 'image' in icon
        ? <img src={icon.image} alt="" className="ui-project_icon-image" />
        : icon
        ? <span className="ui-project_icon-emoji">{icon.emoji}</span>
        : <FolderKanban className="ui-project_icon-default" />}
    </span>
  )
}
