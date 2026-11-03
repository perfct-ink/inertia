import './WorkspaceScreen.scss'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import GettingStarted from '@/components/onboarding/GettingStarted'
import ProjectsScreen from '@/view/projects/ProjectsScreen'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuthStore } from '@/store/auth'
import { useActiveOnboarding } from '@/store/onboarding'

function Onboarding() {
  usePageTitle('Space')
  return (
    <WorkspaceLayout>
      <main className="view-workspace">
        <GettingStarted />
      </main>
    </WorkspaceLayout>
  )
}

// The Space's home is its projects; a new user sees the getting-started
// steps there until they finish or dismiss them.
export default function WorkspaceScreen() {
  const onboarding = useActiveOnboarding(useAuthStore((s) => s.user?.id))
  return onboarding ? <Onboarding /> : <ProjectsScreen />
}
