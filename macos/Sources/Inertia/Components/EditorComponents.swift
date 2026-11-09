import SwiftUI
import InertiaCore

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
            Text(title).voltaFont(.xl, weight: .semibold).foregroundStyle(Volta.foreground).accessibilityAddTraits(.isHeader)
            content
        }
        .voltaTheme().padding(24).frame(width: width, height: height)
        .background(Volta.card)
    }
}

/// A check a text field applies to what is typed, with the message shown when it fails.
struct FieldRule {
    let isValid: (String) -> Bool
    let message: String

    static let isoDate = FieldRule(isValid: ISODate.isValid, message: "Use a valid date written as YYYY-MM-DD.")
}

/// A text field for a value that may be empty. A filled field that breaks its rule shows the error
/// state and a message under it.
struct OptionalTextField: View {
    let title: String
    @Binding var text: String?
    var rule: FieldRule?

    private var problem: String? {
        guard let rule, let text, !text.isEmpty, !rule.isValid(text) else { return nil }
        return rule.message
    }

    var body: some View {
        TextField(title, text: Binding(get: { text ?? "" }, set: { text = $0.isEmpty ? nil : $0 })).voltaInvalid(problem != nil)
        ValidationMessage(message: problem)
    }
}

struct NotesEditor: View {
    var title = "Notes"
    @Binding var text: String
    var height: CGFloat = 100

    var body: some View {
        Text(title).voltaFont(.sm, weight: .semibold).foregroundStyle(Volta.foreground)
        VoltaTextArea(title: title, text: $text, minimumHeight: height).frame(height: height)
    }
}

/// An error under a field (`FormError` in React). It is announced to VoiceOver when it appears.
struct ValidationMessage: View {
    let message: String?
    var body: some View {
        if let message {
            Text(message).voltaFont(.sm).foregroundStyle(Volta.color(.errorText))
                .accessibilityAddTraits(.isStaticText)
                .onAppear { AccessibilityNotification.Announcement(message).post() }
        }
    }
}

struct CompletionProgress: View {
    let done: Int
    let total: Int

    var body: some View {
        ProgressView(value: Double(done), total: Double(max(total, 1))).tint(Volta.accent)
        Text("\(done) of \(total) tasks complete").voltaCaption()
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
