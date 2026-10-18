import './WorkspaceScreen.scss'
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
          <div className="workspace-empty">
            <p className="workspace-title">No document open</p>
            <p className="workspace-hint">Create a folder, then add a document to get started.</p>
          </div>
        )}
      </main>
    </WorkspaceLayout>
  )
}
