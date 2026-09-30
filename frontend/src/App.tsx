import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import LoginPage from '@/pages/auth/LoginPage'
import SignupPage from '@/pages/auth/SignupPage'
import WorkspacePage from '@/pages/workspace/WorkspacePage'
import DocumentPage from '@/pages/workspace/DocumentPage'
import DocumentsIndexPage from '@/pages/workspace/DocumentsIndexPage'
import TasksPage from '@/pages/workspace/TasksPage'
import EventsPage from '@/pages/workspace/EventsPage'
import EpicsPage from '@/pages/workspace/EpicsPage'
import FolderDetailPage from '@/pages/workspace/FolderDetailPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (process.env.BYPASS_AUTH === 'true') return <>{children}</>
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

// DocumentPage owns a per-document Y.Doc/HocuspocusProvider pair for
// real-time collaboration (see DocumentPage.tsx) — that binding isn't
// reactive to a changed id, so navigating between two documents needs a full
// remount, not just new props. `key={id}` forces that.
function DocumentRoute() {
  const { id } = useParams()
  return <DocumentPage key={id} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/shared/:token" element={<div>Shared view</div>} />
      {/* Rails owns "/" in production for the marketing homepage (see
          backend/app/controllers/marketing_controller.rb and the nginx vhost
          under deploy/) — this route only matters for local dev (no Rails
          marketing page competing there) and for in-app client-side nav,
          which never leaves the already-loaded SPA. */}
      <Route path="/" element={<Navigate to="/workspace" replace />} />
      <Route
        path="/workspace"
        element={
          <PrivateRoute>
            <WorkspacePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <PrivateRoute>
            <DocumentsIndexPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/documents/:id"
        element={
          <PrivateRoute>
            <DocumentRoute />
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <PrivateRoute>
            <TasksPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/events"
        element={
          <PrivateRoute>
            <EventsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/epics"
        element={
          <PrivateRoute>
            <EpicsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/folders/:id"
        element={
          <PrivateRoute>
            <FolderDetailPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/workspace" replace />} />
    </Routes>
  )
}
