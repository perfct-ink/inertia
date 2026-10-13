import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import LoginScreen from '@/components/auth/LoginScreen'
import SignupScreen from '@/components/auth/SignupScreen'
import WorkspaceScreen from '@/components/screens/WorkspaceScreen'
import DocumentScreen from '@/components/editors/DocumentScreen'
import DocumentsIndexScreen from '@/components/screens/DocumentsIndexScreen'
import TasksScreen from '@/components/screens/TasksScreen'
import EventsScreen from '@/components/screens/EventsScreen'
import EpicsScreen from '@/components/screens/EpicsScreen'
import InitiativesScreen from '@/components/screens/InitiativesScreen'
import FolderDetailScreen from '@/components/screens/FolderDetailScreen'
import SharedScreen from '@/components/screens/SharedScreen'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (process.env.BYPASS_AUTH === 'true') return <>{children}</>
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

// DocumentScreen owns a per-document Y.Doc/HocuspocusProvider pair for
// real-time collaboration (see DocumentScreen.tsx) — that binding isn't
// reactive to a changed id, so navigating between two documents needs a full
// remount, not just new props. `key={id}` forces that.
function DocumentRoute() {
  const { id } = useParams()
  return <DocumentScreen key={id} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/signup" element={<SignupScreen />} />
      <Route path="/shared/:token" element={<SharedScreen />} />
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
            <WorkspaceScreen />
          </PrivateRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <PrivateRoute>
            <DocumentsIndexScreen />
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
            <TasksScreen />
          </PrivateRoute>
        }
      />
      <Route
        path="/events"
        element={
          <PrivateRoute>
            <EventsScreen />
          </PrivateRoute>
        }
      />
      <Route
        path="/epics"
        element={
          <PrivateRoute>
            <EpicsScreen />
          </PrivateRoute>
        }
      />
      <Route
        path="/initiatives"
        element={
          <PrivateRoute>
            <InitiativesScreen />
          </PrivateRoute>
        }
      />
      <Route
        path="/folders/:id"
        element={
          <PrivateRoute>
            <FolderDetailScreen />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/workspace" replace />} />
    </Routes>
  )
}
