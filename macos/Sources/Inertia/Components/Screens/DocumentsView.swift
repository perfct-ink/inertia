import SwiftUI
import InertiaCore

struct DocumentsView: View {
    @EnvironmentObject private var session: Session
    @State private var document: InertiaCore.Document?
    @State private var search = ""

    private struct Entry: Identifiable {
        let document: InertiaCore.Document
        let location: String
        var id: Int { document.id }
    }

    private func entries(in folders: [Folder], parent: String = "") -> [Entry] {
        folders.flatMap { folder in
            let location = parent.isEmpty ? folder.name : "\(parent) / \(folder.name)"
            return folder.documents.map { Entry(document: $0, location: location) }
                + entries(in: folder.children, parent: location)
        }
    }

    private var documents: [Entry] {
        entries(in: session.folders)
            .filter { search.isEmpty || $0.document.title.localizedCaseInsensitiveContains(search) || $0.location.localizedCaseInsensitiveContains(search) }
            .sorted { $0.document.title.localizedStandardCompare($1.document.title) == .orderedAscending }
    }

    var body: some View {
        Group {
            if let document {
                DocumentEditorScreen(document: document, backTitle: "Back to Documents") { self.document = nil }
            } else {
                List(documents) { entry in
                    DocumentRow(document: entry.document, location: entry.location) { document = entry.document }
                }
                .overlay {
                    if documents.isEmpty {
                        ContentUnavailableView(
                            search.isEmpty ? "No documents yet" : "No matching documents",
                            systemImage: "doc.text",
                            description: Text(search.isEmpty ? "Documents, spreadsheets, and tables from your projects appear here." : "Try another title or project name.")
                        )
                    }
                }
                .searchable(text: $search, prompt: "Search documents and projects")
                .navigationTitle("Documents, Sheets & Tables")
                .toolbar {
                    RefreshButton(action: session.refresh)
                }
            }
        }
    }
}
