import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import RoadmapTimeline from '@/components/RoadmapTimeline'
import { useSharedRoadmap } from '@/api/roadmapShare'
import { usePageTitle } from '@/hooks/usePageTitle'
import '../roadmap/RoadmapScreen.scss'
import './SharedScreen.scss'

// Public, read-only roadmap for someone with the link; no sign-in, no editing.
export default function SharedScreen() {
  const { token = '' } = useParams<{ token: string }>()
  const { data: roadmap, isLoading, isError } = useSharedRoadmap(token)
  usePageTitle(roadmap ? `${roadmap.name} roadmap` : 'Shared')

  return (
    <div className="view-shared view-roadmap">
      {isLoading && <Loader2 className="shared-spinner" aria-label="Loading" />}
      {isError && <p className="shared-message">This link isn&rsquo;t available. It may have been turned off.</p>}
      {roadmap && (
        <>
          <h1 className="shared-title">{roadmap.name} roadmap</h1>
          <RoadmapTimeline milestones={roadmap.milestones} initiatives={roadmap.initiatives} epics={roadmap.epics} />
        </>
      )}
    </div>
  )
}
