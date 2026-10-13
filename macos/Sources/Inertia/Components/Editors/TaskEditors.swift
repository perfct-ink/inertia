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
                        Picker("Assignee", selection: $draft.assigneeID) {
                            Text("Unassigned").tag(nil as Int?)
                            ForEach(board.users) { Text($0.name).tag(Optional($0.id)) }
                        }
                        Picker("Column", selection: $draft.columnID) { ForEach(board.columns) { Text($0.title).tag($0.id) } }
                        Picker("Sprint", selection: $draft.sprintID) {
                            Text("Unassigned").tag(nil as Int?)
                            ForEach(board.sprints) { Text($0.title).tag(Optional($0.id)) }
                        }
                        Picker("Epic", selection: $draft.epicID) {
                            Text("Unassigned").tag(nil as Int?)
                            ForEach(board.epics) { Text($0.title).tag(Optional($0.id)) }
                        }
                        GroupBox("Events and milestones") {
                            ForEach(board.events) { event in
                                Toggle(event.title, isOn: Binding(get: { eventIDs.contains(event.id) }, set: { selected in
                                    if selected { eventIDs.insert(event.id) } else { eventIDs.remove(event.id) }
                                }))
                            }
                        }
                        Picker("Parent task", selection: $draft.parentID) {
                            Text("None").tag(nil as Int?)
                            ForEach(board.tasks.filter { $0.id != draft.id }) { Text($0.title).tag(Optional($0.id)) }
                        }
                        OptionalTextField(title: "Due date (YYYY-MM-DD)", text: $draft.dueDate)
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
                OptionalTextField(title: "Start (YYYY-MM-DD)", text: $draft.startDate)
                OptionalTextField(title: "End (YYYY-MM-DD)", text: $draft.endDate)
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
            Text("Columns map to Inertia task statuses. Done tasks count toward progress.").foregroundStyle(.secondary)
            List {
                ForEach($board.columns) { $column in
                    HStack {
                        TextField("Column name", text: $column.title)
                        Picker("Status", selection: Binding(get: { column.status }, set: { board.setColumnStatus(column.id, status: $0) })) {
                            ForEach(TaskStatus.allCases, id: \.self) { Text($0.label).tag($0) }
                        }
                    }
                }.onMove { board.columns.move(fromOffsets: $0, toOffset: $1) }
            }
            HStack {
                Button("Add Column") { board.columns.append(BoardColumn(title: "New Column")) }
                Spacer()
                DoneButton()
            }
        }
    }
}
