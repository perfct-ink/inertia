import { Menu } from 'lucide-react'
import Sidebar from '@/components/file-manager/Sidebar'
import TabBar from '@/components/TabBar'
import { useSidebarStore } from '@/store/sidebar'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const toggleSidebar = useSidebarStore((s) => s.toggle)

  // The native macOS shell owns navigation around the embedded editor.
  if (new URLSearchParams(window.location.search).get('native') === '1') {
    return <div className="flex h-screen flex-col overflow-hidden">{children}</div>
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile-only top bar — below md the Sidebar becomes an off-canvas
            drawer with nothing else providing a way back into it. */}
        <div
          className="md:hidden flex items-center gap-2 px-2 h-11 border-b shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(2.75rem + env(safe-area-inset-top))' }}
        >
          <button
            onClick={toggleSidebar}
            aria-label="Open sidebar"
            className="p-2 -ml-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">Inertia</span>
        </div>
        <TabBar />
        {children}
      </div>
    </div>
  )
}
