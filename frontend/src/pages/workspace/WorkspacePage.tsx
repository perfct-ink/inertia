import { ArrowRight, CalendarDays, CheckSquare, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import WorkspaceLayout from '@/components/WorkspaceLayout'

const destinations = [
  { title: 'Documents', description: 'Give your ideas a place to grow.', path: '/documents', icon: FileText },
  { title: 'Tasks', description: 'Find your next step and move it forward.', path: '/tasks?view=backlog', icon: CheckSquare },
  { title: 'Events', description: 'Make room for what’s coming up.', path: '/events?view=list', icon: CalendarDays },
]

export default function WorkspacePage() {
  return (
    <WorkspaceLayout>
      <main className="flex-1 overflow-y-auto bg-muted/20 px-6 py-12 sm:px-10 sm:py-20">
        <div className="mx-auto w-full max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your workspace</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">A little clarity. A little momentum.</h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            Bring your ideas, plans, and next steps together. Pick a place to start, or open a document from the sidebar.
          </p>
          <nav aria-label="Workspace sections" className="mt-10 grid gap-3 sm:grid-cols-3">
            {destinations.map(({ title, description, path, icon: Icon }) => (
              <Link key={title} to={path} className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/30">
                <span className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="flex items-center justify-between gap-3 text-sm font-semibold">
                  {title}<ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
                </span>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </Link>
            ))}
          </nav>
          <p className="mt-8 border-t pt-5 text-sm text-muted-foreground">Start small. Everything has a place here.</p>
        </div>
      </main>
    </WorkspaceLayout>
  )
}
