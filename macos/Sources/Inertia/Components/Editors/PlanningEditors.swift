import SwiftUI
import InertiaCore

struct EpicEditor: View {
    @State var draft: EpicRecord
    let save: (EpicRecord) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var error: String?
    var body: some View {
        EditorSheet(title: "Epic", width: 480) {
            Form {
                TextField("Title", text: $draft.title)
                OptionalTextField(title: "Start (YYYY-MM-DD)", text: $draft.startDate)
                OptionalTextField(title: "Target (YYYY-MM-DD)", text: $draft.targetDate)
            }
            NotesEditor(text: $draft.notes)
            ValidationMessage(message: error)
            EditorActions(saveDisabled: draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, cancel: { dismiss() }) {
                var candidate = TaskFile(); candidate.epics = [draft]
                do { try candidate.validate(); save(draft) }
                catch { self.error = error.localizedDescription }
            }
        }
    }
}
struct MilestoneEditor: View {
    @State var draft: EventRecord
    let epics: [EpicRecord]
    let save: (EventRecord) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var error: String?
    var body: some View {
        EditorSheet(title: "Event", width: 480) {
            Form {
                TextField("Title", text: $draft.title)
                Picker("Type", selection: $draft.event_type) {
                    ForEach(EventType.allCases, id: \.self) { Text($0.rawValue.capitalized).tag($0) }
                }
                OptionalTextField(title: "Date (YYYY-MM-DD)", text: $draft.date)
                Picker("Epic (file extension)", selection: $draft.epicID) {
                    Text("None").tag(nil as Int?)
                    ForEach(epics) { Text($0.title).tag(Optional($0.id)) }
                }
                Toggle("Reached", isOn: $draft.completed)
            }
            NotesEditor(text: $draft.notes)
            ValidationMessage(message: error)
            EditorActions(saveDisabled: draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, cancel: { dismiss() }) {
                var candidate = TaskFile(); candidate.epics = epics; candidate.events = [draft]
                do { try candidate.validate(); save(draft) }
                catch { self.error = error.localizedDescription }
            }
        }
    }
}
