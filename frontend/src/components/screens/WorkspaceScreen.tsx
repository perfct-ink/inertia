import WorkspaceLayout from '@/components/WorkspaceLayout'

export default function WorkspaceScreen() {
  return (
    <WorkspaceLayout>
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">No document open</p>
          <p className="text-sm text-muted-foreground">Create a folder, then add a document to get started.</p>
        </div>
      </main>
    </WorkspaceLayout>
  )
}
