import SwiftUI
import InertiaCore

struct FileUserEditor: View {
    @State var draft: UserRecord
    let save: (UserRecord) -> Void
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        EditorSheet(title: "User", width: 400) {
            Form {
                TextField("Name", text: $draft.name)
                OptionalTextField(title: "Email (optional)", text: $draft.email)
            }
            EditorActions(saveDisabled: draft.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                          cancel: { dismiss() }) { save(draft) }
        }
    }
}
