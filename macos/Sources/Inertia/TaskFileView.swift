import SwiftUI
import InertiaCore

struct TaskFileView: View {
    @Binding var document: TasksDocument
    @Environment(\.openWindow) private var openWindow
    @State private var view = "Workboard"
    @State private var sprintFilter = "all"
    @State private var taskDraft: FileTask?
    @State private var sprintDraft: Sprint?
    @State private var editingColumns = false
    @State private var error: String?

    private var visibleTasks: [FileTask] {
        document.board.tasks.filter {
            sprintFilter == "all" || (sprintFilter == "unassigned" ? $0.sprintID == nil : $0.sprintID?.uuidString == sprintFilter)
        }
    }
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                TextField("Project name", text: $document.board.title).font(.title2.bold()).textFieldStyle(.plain)
                Picker("View", selection: $view) {
                    Text("Workboard").tag("Workboard")
                    Text("List").tag("List")
                    Text("Sprints").tag("Sprints")
                }.pickerStyle(.segmented).frame(width: 270)
            }.padding()
            if view != "Sprints" {
                HStack {
                    Picker("Sprint", selection: $sprintFilter) {
                        Text("All tasks").tag("all")
                        Text("Unassigned").tag("unassigned")
                        ForEach(document.board.sprints) { sprint in Text(sprint.title).tag(sprint.id.uuidString) }
                    }.frame(maxWidth: 300)
                    Spacer()
                    Text("\(visibleTasks.count) tasks").foregroundStyle(.secondary)
                }.padding([.horizontal, .bottom])
            }
            Divider()
            if view == "Workboard" { board }
            else if view == "List" { taskList }
            else { sprints }
        }
        .frame(minWidth: 850, minHeight: 550)
        .toolbar {
            Button("New Task", systemImage: "plus") { newTask() }
            Button("New Sprint", systemImage: "calendar.badge.plus") { sprintDraft = Sprint() }
            Button("Columns", systemImage: "rectangle.split.3x1") { editingColumns = true }
            Button("Online Workspace", systemImage: "network") { openWindow(id: "workspace") }
        }
        .sheet(item: $taskDraft) { draft in
            TaskEditor(draft: draft, board: document.board) { task in
                var next = document.board
                if let index = next.tasks.firstIndex(where: { $0.id == task.id }) { next.tasks[index] = task }
                else { next.tasks.append(task) }
                do { try next.validate(); document.board = next; taskDraft = nil }
                catch { self.error = error.localizedDescription }
            }
        }
        .sheet(item: $sprintDraft) { draft in
            SprintEditor(draft: draft) { sprint in
                var next = document.board
                if let index = next.sprints.firstIndex(where: { $0.id == sprint.id }) { next.sprints[index] = sprint }
                else { next.sprints.append(sprint) }
                do { try next.validate(); document.board = next; sprintDraft = nil }
                catch { self.error = error.localizedDescription }
            }
        }
        .sheet(isPresented: $editingColumns) { ColumnEditor(columns: $document.board.columns) }
        .alert("Could not save changes", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
            Button("OK") { error = nil }
        } message: { Text(error ?? "") }
    }
    private var board: some View {
        ScrollView([.horizontal, .vertical]) {
            HStack(alignment: .top, spacing: 16) {
                ForEach(document.board.columns) { column in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Image(systemName: column.isCompleted ? "checkmark.circle" : "rectangle.stack")
                            Text(column.title).font(.headline)
                            Spacer()
                            Text("\(visibleTasks.filter { $0.columnID == column.id }.count)").foregroundStyle(.secondary)
                            Button { newTask(column: column.id) } label: { Image(systemName: "plus") }.help("Add task to \(column.title)")
                        }
                        ForEach(visibleTasks.filter { $0.columnID == column.id }) { task in
                            Button { taskDraft = task } label: {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(task.title).font(.body.weight(.medium)).foregroundStyle(.primary)
                                    if let date = task.dueDate { Label(date, systemImage: "calendar").font(.caption).foregroundStyle(.secondary) }
                                    if let sprint = document.board.sprints.first(where: { $0.id == task.sprintID }) {
                                        Text(sprint.title).font(.caption).foregroundStyle(.secondary)
                                    }
                                }.frame(maxWidth: .infinity, alignment: .leading).padding(12)
                                    .background(.background, in: RoundedRectangle(cornerRadius: 8))
                            }.buttonStyle(.plain).draggable(task.id.uuidString)
                                .contextMenu { taskMenu(task) }
                        }
                        if !visibleTasks.contains(where: { $0.columnID == column.id }) {
                            Text("Drop a task here").foregroundStyle(.secondary).frame(maxWidth: .infinity).padding(.vertical, 30)
                        }
                    }.padding(12).frame(width: 260).background(.quaternary.opacity(0.4), in: RoundedRectangle(cornerRadius: 12))
                        .dropDestination(for: String.self) { values, _ in
                            guard let value = values.first, let id = UUID(uuidString: value), document.board.tasks.contains(where: { $0.id == id }) else { return false }
                            document.board.moveTask(id, to: column.id)
                            return true
                        }
                }
            }.padding()
        }
    }
    private var taskList: some View {
        List {
            if visibleTasks.isEmpty { Text("No tasks. Use New Task to add one.").foregroundStyle(.secondary) }
            ForEach(visibleTasks) { task in
                HStack {
                    Button(task.title) { taskDraft = task }.buttonStyle(.plain)
                    if task.parentID != nil { Image(systemName: "arrow.turn.down.right").help("Subtask") }
                    Spacer()
                    Text(task.dueDate ?? "").foregroundStyle(.secondary)
                    Picker("Column", selection: Binding(get: { task.columnID }, set: { document.board.moveTask(task.id, to: $0) })) {
                        ForEach(document.board.columns) { Text($0.title).tag($0.id) }
                    }.labelsHidden().frame(width: 170)
                }.contextMenu { taskMenu(task) }
            }
        }
    }
    private var sprints: some View {
        List {
            if document.board.sprints.isEmpty { Text("No sprints yet. Tasks can also stay unassigned.").foregroundStyle(.secondary) }
            ForEach(document.board.sprints) { sprint in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Button(sprint.title) { sprintDraft = sprint }.font(.headline).buttonStyle(.plain)
                        Spacer()
                        Button("View Tasks") { sprintFilter = sprint.id.uuidString; view = "Workboard" }
                    }
                    if !sprint.goal.isEmpty { Text(sprint.goal).foregroundStyle(.secondary) }
                    Text("\(sprint.startDate ?? "No start date") – \(sprint.endDate ?? "No end date")").font(.caption)
                    let total = document.board.tasks.filter { $0.sprintID == sprint.id }.count
                    let done = document.board.completedCount(in: sprint.id)
                    ProgressView(value: Double(done), total: Double(max(total, 1)))
                    Text("\(done) of \(total) tasks complete").font(.caption).foregroundStyle(.secondary)
                }.padding(.vertical, 8).contextMenu {
                    Button("Edit Sprint") { sprintDraft = sprint }
                    Button("Remove Sprint (Keep Tasks)", role: .destructive) {
                        document.board.removeSprint(sprint.id)
                        if sprintFilter == sprint.id.uuidString { sprintFilter = "all" }
                    }
                }
            }
        }
    }
    @ViewBuilder private func taskMenu(_ task: FileTask) -> some View {
        Button("Edit Task") { taskDraft = task }
        Menu("Move to") {
            ForEach(document.board.columns) { column in Button(column.title) { document.board.moveTask(task.id, to: column.id) } }
        }
        Button("Delete Task", role: .destructive) { document.board.removeTask(task.id) }
    }
    private func newTask(column: UUID? = nil) {
        taskDraft = FileTask(columnID: column ?? document.board.columns[0].id, sprintID: UUID(uuidString: sprintFilter))
    }
}

private struct TaskEditor: View {
    @State var draft: FileTask
    let board: TaskFile
    let save: (FileTask) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var error: String?
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Task").font(.title2.bold())
            Form {
                TextField("Title", text: $draft.title)
                Picker("Column", selection: $draft.columnID) { ForEach(board.columns) { Text($0.title).tag($0.id) } }
                Picker("Sprint", selection: $draft.sprintID) {
                    Text("Unassigned").tag(nil as UUID?)
                    ForEach(board.sprints) { Text($0.title).tag(Optional($0.id)) }
                }
                Picker("Parent task", selection: $draft.parentID) {
                    Text("None").tag(nil as UUID?)
                    ForEach(board.tasks.filter { $0.id != draft.id }) { Text($0.title).tag(Optional($0.id)) }
                }
                TextField("Due date (YYYY-MM-DD)", text: Binding(get: { draft.dueDate ?? "" }, set: { draft.dueDate = $0.isEmpty ? nil : $0 }))
            }
            Text("Notes").font(.headline)
            TextEditor(text: $draft.notes).frame(height: 120).border(.quaternary)
            if let error { Text(error).foregroundStyle(.red).font(.caption) }
            HStack {
                Button("Cancel") { dismiss() }.keyboardShortcut(.cancelAction)
                Spacer()
                Button("Save") {
                    var candidate = board
                    candidate.tasks.removeAll { $0.id == draft.id }
                    candidate.tasks.append(draft)
                    do { try candidate.validate(); save(draft) }
                    catch { self.error = error.localizedDescription }
                }.keyboardShortcut(.defaultAction).disabled(draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }.padding(24).frame(width: 480)
    }
}
private struct SprintEditor: View {
    @State var draft: Sprint
    let save: (Sprint) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var error: String?
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Sprint").font(.title2.bold())
            Form {
                TextField("Name", text: $draft.title)
                TextField("Goal", text: $draft.goal)
                TextField("Start (YYYY-MM-DD)", text: Binding(get: { draft.startDate ?? "" }, set: { draft.startDate = $0.isEmpty ? nil : $0 }))
                TextField("End (YYYY-MM-DD)", text: Binding(get: { draft.endDate ?? "" }, set: { draft.endDate = $0.isEmpty ? nil : $0 }))
            }
            if let error { Text(error).foregroundStyle(.red).font(.caption) }
            HStack {
                Button("Cancel") { dismiss() }.keyboardShortcut(.cancelAction)
                Spacer()
                Button("Save") {
                    var candidate = TaskFile(); candidate.sprints = [draft]
                    do { try candidate.validate(); save(draft) }
                    catch { self.error = error.localizedDescription }
                }.keyboardShortcut(.defaultAction).disabled(draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }.padding(24).frame(width: 480)
    }
}
private struct ColumnEditor: View {
    @Binding var columns: [BoardColumn]
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Workboard Columns").font(.title2.bold())
            Text("Tasks in completed columns count toward sprint progress.").foregroundStyle(.secondary)
            List {
                ForEach($columns) { $column in
                    HStack {
                        TextField("Column name", text: $column.title)
                        Toggle("Completed", isOn: $column.isCompleted)
                    }
                }.onMove { columns.move(fromOffsets: $0, toOffset: $1) }
            }
            HStack {
                Button("Add Column") { columns.append(BoardColumn(title: "New Column")) }
                Spacer()
                Button("Done") { dismiss() }.keyboardShortcut(.defaultAction)
            }
        }.padding(24).frame(width: 500, height: 350)
    }
}
