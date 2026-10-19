import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { ToastRegion } from '@/components/ui'
import LoginScreen from '@/view/login/LoginScreen'
import SignupScreen from '@/view/signup/SignupScreen'
import WorkspaceScreen from '@/view/workspace/WorkspaceScreen'
import DocumentScreen from '@/view/document/DocumentScreen'
import DocumentsIndexScreen from '@/view/documents_index/DocumentsIndexScreen'
import TasksScreen from '@/view/tasks/TasksScreen'
import EventsScreen from '@/view/events/EventsScreen'
import EpicsScreen from '@/view/epics/EpicsScreen'
import InitiativesScreen from '@/view/initiatives/InitiativesScreen'
import MilestonesScreen from '@/view/milestones/MilestonesScreen'
import SprintsScreen from '@/view/sprints/SprintsScreen'
import HierarchyScreen from '@/view/hierarchy/HierarchyScreen'
import RoadmapScreen from '@/view/roadmap/RoadmapScreen'
import OkrsScreen from '@/view/okrs/OkrsScreen'
import ReleasesScreen from '@/view/releases/ReleasesScreen'
import ProjectsScreen from '@/view/projects/ProjectsScreen'
import FolderDetailScreen from '@/view/folder_detail/FolderDetailScreen'
import SharedScreen from '@/view/shared/SharedScreen'

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
    <>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/shared/:token" element={<SharedScreen />} />
        {/* Rails owns "/" in production for the marketing homepage (see
            backend/app/controllers/marketing_controller.rb and the nginx vhost
            under deploy/) — this route only matters for local dev (no Rails
            marketing page competing there) and for in-app client-side nav,
            which never leaves the already-loaded SPA. */}
        <Route path="/" element={<Navigate to="/space" replace />} />
        {/* Old links from before workspaces were renamed to spaces. */}
        <Route path="/workspace" element={<Navigate to="/space" replace />} />
        <Route
          path="/space"
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
          path="/milestones"
          element={
            <PrivateRoute>
              <MilestonesScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/sprints"
          element={
            <PrivateRoute>
              <SprintsScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/roadmap"
          element={
            <PrivateRoute>
              <RoadmapScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/releases"
          element={
            <PrivateRoute>
              <ReleasesScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/okrs"
          element={
            <PrivateRoute>
              <OkrsScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/hierarchy"
          element={
            <PrivateRoute>
              <HierarchyScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <PrivateRoute>
              <ProjectsScreen />
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
        <Route path="*" element={<Navigate to="/space" replace />} />
      </Routes>
      <ToastRegion />
    </>
  )
}
