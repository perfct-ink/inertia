import { Button } from '@/components/ui'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/file-manager/Sidebar'
import TabBar from '@/components/TabBar'
import './WorkspaceLayout.scss'
import { useSidebarStore } from '@/store/sidebar'
import { useWorkspace } from '@/api/workspace'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const toggleSidebar = useSidebarStore((s) => s.toggle)
  const { data: workspace } = useWorkspace()

  return (
    <div className="view-workspace_layout">
      <Sidebar />
      <div className="workspace_layout-main">
        {/* Mobile-only top bar — below md the Sidebar becomes an off-canvas
            drawer with nothing else providing a way back into it. */}
        <div
          className="workspace_layout-mobile_bar"
        >
          <Button
            onClick={toggleSidebar}
            aria-label="Open sidebar"
            className="workspace_layout-menu_button"
          >
            <Menu aria-hidden="true" />
          </Button>
          <span className="workspace_layout-brand">{workspace?.name ?? 'Inertia'}</span>
        </div>
        <TabBar />
        {children}
      </div>
    </div>
  )
}
