import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { usesHashRouter } from '@/util/router'
import { ToastRegion } from '@/components/ui'
import LoginScreen from '@/view/login/LoginScreen'
import SignupScreen from '@/view/signup/SignupScreen'
import WorkspaceScreen from '@/view/workspace/WorkspaceScreen'
import DocumentScreen from '@/view/document/DocumentScreen'
import DocumentsIndexScreen from '@/view/documents_index/DocumentsIndexScreen'
import TasksScreen from '@/view/tasks/TasksScreen'
import EventsScreen from '@/view/events/EventsScreen'
import EpicsScreen from '@/view/epics/EpicsScreen'
import EpicPlanScreen from '@/view/epic_plan/EpicPlanScreen'
import InitiativesScreen from '@/view/initiatives/InitiativesScreen'
import MilestonesScreen from '@/view/milestones/MilestonesScreen'
import SprintsScreen from '@/view/sprints/SprintsScreen'
import RetrospectivesScreen from '@/view/retrospectives/RetrospectivesScreen'
import RetrospectiveBoardScreen from '@/view/retrospective_board/RetrospectiveBoardScreen'
import HierarchyScreen from '@/view/hierarchy/HierarchyScreen'
import RoadmapScreen from '@/view/roadmap/RoadmapScreen'
import OkrsScreen from '@/view/okrs/OkrsScreen'
import SprintBoardScreen from '@/view/sprint_board/SprintBoardScreen'
import ResourcesScreen from '@/view/resources/ResourcesScreen'
import MyWorkScreen from '@/view/my_work/MyWorkScreen'
import TimelineScreen from '@/view/timeline/TimelineScreen'
import IdeasScreen from '@/view/ideas/IdeasScreen'
import IoMapScreen from '@/view/io_map/IoMapScreen'
import CalendarScreen from '@/view/calendar/CalendarScreen'
import PivotScreen from '@/view/pivot/PivotScreen'
import TaskTableScreen from '@/view/task_table/TaskTableScreen'
import WorkloadScreen from '@/view/workload/WorkloadScreen'
import PortfolioScreen from '@/view/portfolio/PortfolioScreen'
import InboxScreen from '@/view/inbox/InboxScreen'
import FolderDetailScreen from '@/view/folder_detail/FolderDetailScreen'
import SharedScreen from '@/view/shared/SharedScreen'
import AppearanceEffect from '@/components/AppearanceEffect'
import OnboardingSync from '@/components/onboarding/OnboardingSync'
import InviteScreen from '@/view/invite/InviteScreen'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (process.env.BYPASS_AUTH === 'true') return <>{children}</>
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

// "/": signed-in people go to the app. Signed-out web visitors see the Rails
// marketing page (a full page load: in production nginx serves it at "/", in
// development it is on the API origin). Native shells have no marketing site
// and open at login.
function RootRoute() {
  const token = useAuthStore((s) => s.token)
  const nativeShell = usesHashRouter(window.location, window.location.pathname === '/index.html')
  if (token || process.env.BYPASS_AUTH === 'true') return <Navigate to="/space" replace />
  if (nativeShell) return <Navigate to="/login" replace />
  window.location.replace(`${process.env.API_URL ?? ''}/`)
  return null
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
      <AppearanceEffect />
      <OnboardingSync />
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/shared/:token" element={<SharedScreen />} />
        <Route path="/invite/:token" element={<InviteScreen />} />
        {/* Rails owns "/" in production for the marketing homepage (see
            backend/app/controllers/marketing_controller.rb and the nginx vhost
            under deploy/) — this route only matters for local dev (no Rails
            marketing page competing there) and for in-app client-side nav,
            which never leaves the already-loaded SPA. */}
        <Route path="/" element={<RootRoute />} />
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
          path="/plan"
          element={
            <PrivateRoute>
              <EpicPlanScreen />
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
          path="/retrospectives"
          element={
            <PrivateRoute>
              <RetrospectivesScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/retrospectives/:id"
          element={
            <PrivateRoute>
              <RetrospectiveBoardScreen />
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
          path="/workload"
          element={
            <PrivateRoute>
              <WorkloadScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/task-table"
          element={
            <PrivateRoute>
              <TaskTableScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/pivot"
          element={
            <PrivateRoute>
              <PivotScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/sprint-board"
          element={
            <PrivateRoute>
              <SprintBoardScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/my-work"
          element={
            <PrivateRoute>
              <MyWorkScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/timeline"
          element={
            <PrivateRoute>
              <TimelineScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/ideas"
          element={
            <PrivateRoute>
              <IdeasScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/objectives-map"
          element={
            <PrivateRoute>
              <IoMapScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <PrivateRoute>
              <CalendarScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/portfolio"
          element={
            <PrivateRoute>
              <PortfolioScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/inbox"
          element={
            <PrivateRoute>
              <InboxScreen />
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
          path="/resources"
          element={
            <PrivateRoute>
              <ResourcesScreen />
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
        {/* Projects are the Space's home page. */}
        <Route path="/projects" element={<Navigate to="/space" replace />} />
        {/* Project requests is turned off for now; its screen and API stay
            (docs/features/project_intake.md). */}
        <Route path="/project-requests" element={<Navigate to="/space" replace />} />
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
