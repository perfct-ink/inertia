import SwiftUI

struct EditorSheet<Content: View>: View {
    let title: String
    let width: CGFloat
    let height: CGFloat?
    let content: Content

    init(title: String, width: CGFloat, height: CGFloat? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.width = width
        self.height = height
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title).font(.title2.bold())
            content
        }.textFieldStyle(InertiaTextFieldStyle()).padding(24).frame(width: width, height: height)
    }
}

struct OptionalTextField: View {
    let title: String
    @Binding var text: String?

    var body: some View {
        TextField(title, text: Binding(get: { text ?? "" }, set: { text = $0.isEmpty ? nil : $0 }))
    }
}

struct NotesEditor: View {
    var title = "Notes"
    @Binding var text: String
    var height: CGFloat = 100

    var body: some View {
        Text(title).font(.headline)
        TextEditor(text: $text).frame(height: height).border(.quaternary)
    }
}

struct ValidationMessage: View {
    let message: String?
    var body: some View {
        if let message { Text(message).foregroundStyle(.red).font(.caption) }
    }
}

struct CompletionProgress: View {
    let done: Int
    let total: Int

    var body: some View {
        ProgressView(value: Double(done), total: Double(max(total, 1)))
        Text("\(done) of \(total) tasks complete").font(.caption).foregroundStyle(.secondary)
    }
}

private struct ErrorAlert: ViewModifier {
    let title: String
    @Binding var error: String?

    func body(content: Content) -> some View {
        content.alert(title, isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
            Button("OK") { error = nil }
        } message: { Text(error ?? "") }
    }
}

extension View {
    func appErrorAlert(_ title: String = "Inertia", error: Binding<String?>) -> some View {
        modifier(ErrorAlert(title: title, error: error))
    }
}
