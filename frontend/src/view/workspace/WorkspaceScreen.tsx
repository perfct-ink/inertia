import './WorkspaceScreen.scss'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function WorkspaceScreen() {
  usePageTitle('Space')
  return (
    <WorkspaceLayout>
      <main className="view-workspace">
        <div className="workspace-empty">
          <p className="workspace-title">No document open</p>
          <p className="workspace-hint">Create a folder, then add a document to get started.</p>
        </div>
      </main>
    </WorkspaceLayout>
  )
}
