import SwiftUI
import InertiaCore

struct DocumentRow: View {
    let document: InertiaCore.Document
    var location: String? = nil
    let open: () -> Void

    var body: some View {
        Button(action: open) {
            HStack {
                Label(document.title, systemImage: document.symbol)
                Spacer()
                if let location { Text(location).foregroundStyle(.secondary) }
            }.contentShape(Rectangle())
        }.buttonStyle(.plain)
    }
}

struct DocumentEditorScreen: View {
    @EnvironmentObject private var session: Session
    let document: InertiaCore.Document
    let backTitle: String
    let back: () -> Void

    var body: some View {
        EditorView(documentID: document.id, session: session)
            .id(document.id)
            .navigationTitle(document.title)
            .toolbar { Button(backTitle, systemImage: "chevron.left", action: back) }
    }
}

extension InertiaCore.Document {
    var symbol: String {
        switch doc_type {
        case "spreadsheet": return "tablecells"
        case "table": return "list.bullet.rectangle"
        default: return "doc.text"
        }
    }
}
