import SwiftUI

struct RefreshButton: View {
    let action: () async -> Void
    var body: some View {
        Button("Refresh", systemImage: "arrow.clockwise") { Task { await action() } }
    }
}

struct EditorActions: View {
    var saveDisabled = false
    let cancel: () -> Void
    let save: () -> Void

    var body: some View {
        HStack {
            Button("Cancel", action: cancel).keyboardShortcut(.cancelAction)
            Spacer()
            Button("Save", action: save).keyboardShortcut(.defaultAction).disabled(saveDisabled)
        }
    }
}

struct DoneButton: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        Button("Done") { dismiss() }.keyboardShortcut(.defaultAction)
    }
}
