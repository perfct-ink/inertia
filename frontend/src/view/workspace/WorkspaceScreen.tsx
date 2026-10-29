import './WorkspaceScreen.scss'
import { ArrowRight, CalendarDays, CheckSquare, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import GettingStarted from '@/components/onboarding/GettingStarted'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuthStore } from '@/store/auth'
import { useActiveOnboarding } from '@/store/onboarding'

export default function WorkspaceScreen() {
  usePageTitle('Space')
  const onboarding = useActiveOnboarding(useAuthStore((s) => s.user?.id))
  return (
    <WorkspaceLayout>
      <main className={`view-workspace${onboarding ? ' view-workspace--onboarding' : ''}`}>
        {onboarding ? <GettingStarted /> : (
          <div className="workspace-welcome">
            <p className="workspace-eyebrow">Your Space</p>
            <h1 className="workspace-title">A little clarity. A little momentum.</h1>
            <p className="workspace-hint">Bring your ideas, plans, and next steps together. Pick a place to start, or open a document from the sidebar.</p>
            <nav aria-label="Space sections" className="workspace-destinations">
              {[
                { title: 'Documents', description: 'Give your ideas a place to grow.', path: '/documents', icon: FileText },
                { title: 'Tasks', description: 'Find your next step and move it forward.', path: '/tasks?view=backlog', icon: CheckSquare },
                { title: 'Events', description: 'Make room for what’s coming up.', path: '/events?view=list', icon: CalendarDays },
              ].map(({ title, description, path, icon: Icon }) => (
                <Link key={title} to={path} className="workspace-destination">
                  <span className="workspace-destination_icon"><Icon aria-hidden="true" /></span>
                  <span className="workspace-destination_title">{title}<ArrowRight aria-hidden="true" /></span>
                  <span className="workspace-destination_description">{description}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </main>
    </WorkspaceLayout>
  )
}
