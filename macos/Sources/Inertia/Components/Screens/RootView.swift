import SwiftUI

struct RootView: View {
    @EnvironmentObject private var session: Session
    @State private var selection: String? = "documents"

    var body: some View {
        if session.token == nil {
            LoginView()
        } else {
            NavigationSplitView {
                List(selection: $selection) {
                    Label("Documents", systemImage: "doc.text").tag("documents")
                    Label("Tasks", systemImage: "checklist").tag("tasks")
                    Label("Calendar", systemImage: "calendar").tag("events")
                    Section("Projects") {
                        OutlineGroup(session.folders, children: \.branches) { folder in
                            Label(folder.name, systemImage: "folder").tag("folder:\(folder.id)")
                        }
                    }
                }.navigationTitle("Inertia")
                .toolbar { Button("Sign Out") {
                    selection = "documents"
                    Task { await session.logout() }
                } }
            } detail: {
                if let selection, selection.hasPrefix("folder:"), let id = Int(selection.dropFirst(7)) {
                    FolderDashboard(id: id).id(id)
                } else if selection == "tasks" || selection == "events" {
                    ActivityView(showEvents: selection == "events").id(selection)
                } else {
                    DocumentsView()
                }
            }
        }
    }
}
