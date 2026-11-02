import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { ToastRegion } from '@/components/ui'
import LoginScreen from '@/view/login/LoginScreen'
import SignupScreen from '@/view/signup/SignupScreen'
import WorkspaceScreen from '@/view/workspace/WorkspaceScreen'
import DocumentsIndexScreen from '@/view/documents_index/DocumentsIndexScreen'
import TasksScreen from '@/view/tasks/TasksScreen'
import EventsScreen from '@/view/events/EventsScreen'
import EpicsScreen from '@/view/epics/EpicsScreen'
import EpicPlanScreen from '@/view/epic_plan/EpicPlanScreen'
import InitiativesScreen from '@/view/initiatives/InitiativesScreen'
import MilestonesScreen from '@/view/milestones/MilestonesScreen'
import SprintsScreen from '@/view/sprints/SprintsScreen'
import HierarchyScreen from '@/view/hierarchy/HierarchyScreen'
import RoadmapScreen from '@/view/roadmap/RoadmapScreen'
import OkrsScreen from '@/view/okrs/OkrsScreen'
import SprintBoardScreen from '@/view/sprint_board/SprintBoardScreen'
import ResourcesScreen from '@/view/resources/ResourcesScreen'
import MyWorkScreen from '@/view/my_work/MyWorkScreen'
import TimelineScreen from '@/view/timeline/TimelineScreen'
import IdeasScreen from '@/view/ideas/IdeasScreen'
import IoMapScreen from '@/view/io_map/IoMapScreen'
import ReleasesScreen from '@/view/releases/ReleasesScreen'
import CalendarScreen from '@/view/calendar/CalendarScreen'
import PivotScreen from '@/view/pivot/PivotScreen'
import TaskTableScreen from '@/view/task_table/TaskTableScreen'
import ProjectsScreen from '@/view/projects/ProjectsScreen'
import ProjectRequestsScreen from '@/view/project_requests/ProjectRequestsScreen'
import ItemRoute from '@/view/item/ItemRoute'
import SharedScreen from '@/view/shared/SharedScreen'
import AppearanceEffect from '@/components/AppearanceEffect'
import OnboardingSync from '@/components/onboarding/OnboardingSync'
import PathSync from '@/components/PathSync'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (process.env.BYPASS_AUTH === 'true') return <>{children}</>
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <>
      <AppearanceEffect />
      <OnboardingSync />
      <PathSync />
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
              <ItemRoute type="document" />
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
          path="/roadmap"
          element={
            <PrivateRoute>
              <RoadmapScreen />
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
          path="/releases"
          element={
            <PrivateRoute>
              <ReleasesScreen />
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
        <Route
          path="/projects"
          element={
            <PrivateRoute>
              <ProjectsScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/project-requests"
          element={
            <PrivateRoute>
              <ProjectRequestsScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/folders/:id"
          element={
            <PrivateRoute>
              <ItemRoute type="folder" />
            </PrivateRoute>
          }
        />
        {/* Hierarchical URLs (/acme/product/requirements): any other path is
            looked up as a folder or document in the Space; ItemRoute shows
            "not found" when it names nothing. */}
        <Route
          path="*"
          element={
            <PrivateRoute>
              <ItemRoute />
            </PrivateRoute>
          }
        />
      </Routes>
      <ToastRegion />
    </>
  )
}
