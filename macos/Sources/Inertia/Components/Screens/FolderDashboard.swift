import SwiftUI
import InertiaCore

struct FolderDashboard: View {
    let id: Int
    @EnvironmentObject var session: Session
    @State private var contents: Contents?
    @State private var document: InertiaCore.Document?
    var body: some View {
        Group {
            if let document {
                DocumentEditorScreen(document: document, backTitle: "Back to Project") { self.document = nil }
            } else if let contents {
                List {
                    Section("Documents") {
                        if contents.documents.isEmpty { Text("No documents yet").foregroundStyle(.secondary) }
                        ForEach(contents.documents) { doc in
                            DocumentRow(document: doc) { document = doc }
                        }
                    }
                    Section("Open Tasks") {
                        ForEach(contents.tasks.filter { $0.status != .done }) { task in TaskRow(task: task, reload: load) }
                    }
                    Section("Upcoming Events") {
                        ForEach(contents.events.filter { ($0.date ?? "") >= Date.now.formatted(.iso8601.year().month().day().dateSeparator(.dash)) }) { event in
                            EventRow(event: event)
                        }
                    }
                }.navigationTitle("Project Overview")
                    .toolbar { RefreshButton(action: load) }
            } else { ProgressView() }
        }.task { await load() }
    }
    private func load() async {
        do { contents = try await session.request("api/v1/folders/\(id)/contents") }
        catch { session.error = error.localizedDescription }
    }
}
