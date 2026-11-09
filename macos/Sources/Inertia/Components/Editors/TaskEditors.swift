import SwiftUI
import InertiaCore

struct TaskEditor: View {
    @State var draft: TaskRecord
    @State var eventIDs: Set<Int>
    let board: TaskFile
    let save: (TaskRecord, Set<Int>) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var error: String?
    var body: some View {
        EditorSheet(title: "Task", width: 560) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Form {
                        TextField("Title", text: $draft.title)
                        VoltaSelect("Assignee", selection: $draft.assigneeID, options: SelectChoices.optional(none: "Unassigned", board.users, id: \.id, label: \.name))
                        VoltaSelect("Column", selection: $draft.columnID, options: SelectChoices.records(board.columns, id: \.id, label: \.title))
                        VoltaSelect("Sprint", selection: $draft.sprintID, options: SelectChoices.optional(none: "Unassigned", board.sprints, id: \.id, label: \.title))
                        VoltaSelect("Epic", selection: $draft.epicID, options: SelectChoices.optional(none: "Unassigned", board.epics, id: \.id, label: \.title))
                        VoltaPanel("Events and milestones") {
                            ForEach(board.events) { event in
                                Toggle(event.title, isOn: Binding(get: { eventIDs.contains(event.id) }, set: { selected in
                                    if selected { eventIDs.insert(event.id) } else { eventIDs.remove(event.id) }
                                }))
                            }
                        }
                        VoltaSelect("Parent task", selection: $draft.parentID,
                                    options: SelectChoices.optional(none: "None", board.tasks.filter { $0.id != draft.id }, id: \.id, label: \.title))
                        OptionalTextField(title: "Due date (YYYY-MM-DD)", text: $draft.dueDate, rule: .isoDate)
                    }
                    NotesEditor(title: "Description", text: $draft.descriptionText, height: 120)
                    TaskCommentsView(comments: $draft.comments, users: board.users)
                }
            }.frame(maxHeight: 520)
            ValidationMessage(message: error)
            EditorActions(saveDisabled: draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, cancel: { dismiss() }) {
                draft.status = board.columns.first(where: { $0.id == draft.columnID })?.status ?? draft.status
                var candidate = board
                candidate.tasks.removeAll { $0.id == draft.id }
                candidate.tasks.append(draft)
                candidate.setEvents(eventIDs, for: draft.id)
                do { try candidate.validate(); save(draft, eventIDs) }
                catch { self.error = error.localizedDescription }
            }
        }
    }
}
struct SprintEditor: View {
    @State var draft: Sprint
    let save: (Sprint) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var error: String?
    var body: some View {
        EditorSheet(title: "Sprint", width: 480) {
            Form {
                TextField("Name", text: $draft.title)
                TextField("Goal", text: $draft.goal)
                OptionalTextField(title: "Start (YYYY-MM-DD)", text: $draft.startDate, rule: .isoDate)
                OptionalTextField(title: "End (YYYY-MM-DD)", text: $draft.endDate, rule: .isoDate)
            }
            ValidationMessage(message: error)
            EditorActions(saveDisabled: draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, cancel: { dismiss() }) {
                var candidate = TaskFile(); candidate.sprints = [draft]
                do { try candidate.validate(); save(draft) }
                catch { self.error = error.localizedDescription }
            }
        }
    }
}
struct ColumnEditor: View {
    @Binding var board: TaskFile
    var body: some View {
        EditorSheet(title: "Workboard Columns", width: 540, height: 350) {
            Text("Columns map to Inertia task statuses. Done tasks count toward progress.").voltaMuted()
            List {
                ForEach($board.columns) { $column in
                    HStack {
                        TextField("Column name", text: $column.title)
                        VoltaSelect("Status", selection: Binding(get: { column.status }, set: { board.setColumnStatus(column.id, status: $0) }),
                                    options: TaskStatus.allCases.map { SelectOption($0, $0.label) }, hidesTitle: true)
                    }
                }.onMove { board.columns.move(fromOffsets: $0, toOffset: $1) }
            }.voltaList()
            HStack {
                Button("Add Column") { board.columns.append(BoardColumn(title: "New Column")) }.buttonStyle(.volta(.secondary))
                Spacer()
                DoneButton()
            }
        }
    }
}
