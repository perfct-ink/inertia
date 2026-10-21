import SwiftUI
import InertiaCore

struct TaskFileView: View {
    @Binding var document: TasksDocument
    @Environment(\.openWindow) private var openWindow
    @State private var view = "Workboard"
    @State private var sprintFilter = "all"
    @State private var epicFilter = "all"
    @State private var milestoneFilter = "all"
    @State private var taskDraft: TaskRecord?
    @State private var sprintDraft: Sprint?
    @State private var editingColumns = false
    @State private var editingUsers = false
    @State private var error: String?

    private var visibleTasks: [TaskRecord] {
        document.board.tasks.filter {
            (sprintFilter == "all" || (sprintFilter == "unassigned" ? $0.sprintID == nil : $0.sprintID.map(String.init) == sprintFilter)) &&
            (epicFilter == "all" || (epicFilter == "unassigned" ? $0.epicID == nil : $0.epicID.map(String.init) == epicFilter)) &&
            (milestoneFilter == "all" || (milestoneFilter == "unassigned" ? document.board.eventIDs(for: $0.id).isEmpty : document.board.eventIDs(for: $0.id).contains(Int(milestoneFilter) ?? 0)))
        }
    }
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                TextField("Project name", text: $document.board.title).font(.title2.bold()).textFieldStyle(InertiaTextFieldStyle(showsBorder: false))
                Picker("View", selection: $view) {
                    Text("Workboard").tag("Workboard")
                    Text("List").tag("List")
                    Text("Sprints").tag("Sprints")
                    Text("Epics").tag("Epics")
                    Text("Events").tag("Events")
                }.pickerStyle(.segmented).frame(width: 430)
            }.padding()
            if view == "Workboard" || view == "List" {
                HStack {
                    Picker("Sprint", selection: $sprintFilter) {
                        Text("All tasks").tag("all")
                        Text("Unassigned").tag("unassigned")
                        ForEach(document.board.sprints) { sprint in Text(sprint.title).tag(String(sprint.id)) }
                    }.frame(maxWidth: 220)
                    Picker("Epic", selection: $epicFilter) {
                        Text("All epics").tag("all")
                        Text("Unassigned").tag("unassigned")
                        ForEach(document.board.epics) { Text($0.title).tag(String($0.id)) }
                    }.frame(maxWidth: 220)
                    Picker("Event", selection: $milestoneFilter) {
                        Text("All events").tag("all")
                        Text("Unassigned").tag("unassigned")
                        ForEach(document.board.events) { Text($0.title).tag(String($0.id)) }
                    }.frame(maxWidth: 220)
                    Spacer()
                    Text("\(visibleTasks.count) tasks").foregroundStyle(Volta.mutedForeground)
                }.padding([.horizontal, .bottom])
            }
            Divider()
            if view == "Workboard" { board }
            else if view == "List" { taskList }
            else if view == "Sprints" { sprints }
            else if view == "Epics" {
                EpicList(board: $document.board) { id in
                    epicFilter = String(id); sprintFilter = "all"; milestoneFilter = "all"; view = "Workboard"
                }
            } else {
                MilestoneList(board: $document.board) { id in
                    milestoneFilter = String(id); sprintFilter = "all"; epicFilter = "all"; view = "Workboard"
                }
            }
        }
        .onChange(of: document.board.epics.map(\.id)) { _, ids in
            if let selected = Int( epicFilter), !ids.contains(selected) { epicFilter = "all" }
        }
        .onChange(of: document.board.events.map(\.id)) { _, ids in
            if let selected = Int( milestoneFilter), !ids.contains(selected) { milestoneFilter = "all" }
        }
        .frame(minWidth: 850, minHeight: 550)
        .toolbar {
            Button("New Task", systemImage: "plus") { newTask() }
            Button("New Sprint", systemImage: "calendar.badge.plus") { sprintDraft = Sprint() }
            Button("Users", systemImage: "person.2") { editingUsers = true }
            Button("Columns", systemImage: "rectangle.split.3x1") { editingColumns = true }
            Button("Online Space", systemImage: "network") { openWindow(id: "workspace") }
        }
        .sheet(item: $taskDraft) { draft in
            TaskEditor(draft: draft, eventIDs: Set(document.board.eventIDs(for: draft.id) + (Int(milestoneFilter).map { [$0] } ?? [])), board: document.board) { task, eventIDs in
                var next = document.board
                if let index = next.tasks.firstIndex(where: { $0.id == task.id }) { next.tasks[index] = task }
                else { next.tasks.append(task) }
                next.setEvents(eventIDs, for: task.id)
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
        .sheet(isPresented: $editingUsers) { FileUsersView(board: $document.board) }
        .sheet(isPresented: $editingColumns) { ColumnEditor(board: $document.board) }
        .appErrorAlert("Could not save changes", error: $error)
    }
    private var board: some View {
        ScrollView([.horizontal, .vertical]) {
            HStack(alignment: .top, spacing: 16) {
                ForEach(document.board.columns) { column in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Image(systemName: column.status == .done ? "checkmark.circle" : "rectangle.stack")
                            Text(column.title).font(.headline)
                            Spacer()
                            Text("\(visibleTasks.filter { $0.columnID == column.id }.count)").foregroundStyle(Volta.mutedForeground)
                            Button { newTask(column: column.id) } label: { Image(systemName: "plus") }.help("Add task to \(column.title)")
                        }
                        ForEach(visibleTasks.filter { $0.columnID == column.id }) { task in
                            Button { taskDraft = task } label: {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(task.title).font(.body.weight(.medium)).foregroundStyle(Volta.foreground)
                                    if !task.descriptionText.isEmpty { Text(task.descriptionText).lineLimit(2).font(.caption).foregroundStyle(Volta.mutedForeground) }
                                    if let user = document.board.users.first(where: { $0.id == task.assigneeID }) {
                                        Label(user.name, systemImage: "person").font(.caption).foregroundStyle(Volta.mutedForeground)
                                    }
                                    if !task.comments.isEmpty { Label("\(task.comments.count) comments", systemImage: "text.bubble").font(.caption).foregroundStyle(Volta.mutedForeground) }
                                    if let epic = document.board.epics.first(where: { $0.id == task.epicID }) {
                                        Label(epic.title, systemImage: "square.stack.3d.up").font(.caption).foregroundStyle(Volta.mutedForeground)
                                    }
                                    ForEach(document.board.events.filter { document.board.eventIDs(for: task.id).contains($0.id) }) { milestone in
                                        Label(milestone.title, systemImage: "flag").font(.caption).foregroundStyle(Volta.mutedForeground)
                                    }
                                    if let date = task.dueDate { Label(date, systemImage: "calendar").font(.caption).foregroundStyle(Volta.mutedForeground) }
                                    if let sprint = document.board.sprints.first(where: { $0.id == task.sprintID }) {
                                        Text(sprint.title).font(.caption).foregroundStyle(Volta.mutedForeground)
                                    }
                                }.frame(maxWidth: .infinity, alignment: .leading).padding(12)
                                    .background(Volta.card, in: RoundedRectangle(cornerRadius: 8))
                            }.buttonStyle(.plain).draggable(String(task.id))
                                .contextMenu { taskMenu(task) }
                        }
                        if !visibleTasks.contains(where: { $0.columnID == column.id }) {
                            Text("Drop a task here").foregroundStyle(Volta.mutedForeground).frame(maxWidth: .infinity).padding(.vertical, 30)
                        }
                    }.padding(12).frame(width: 260).background(Volta.muted, in: RoundedRectangle(cornerRadius: 12))
                        .dropDestination(for: String.self) { values, _ in
                            guard let value = values.first, let id = Int( value), document.board.tasks.contains(where: { $0.id == id }) else { return false }
                            document.board.moveTask(id, to: column.id)
                            return true
                        }
                }
            }.padding()
        }
    }
    private var taskList: some View {
        List {
            if visibleTasks.isEmpty { Text("No tasks. Use New Task to add one.").foregroundStyle(Volta.mutedForeground) }
            ForEach(visibleTasks) { task in
                HStack {
                    Button(task.title) { taskDraft = task }.buttonStyle(.plain)
                    if task.parentID != nil { Image(systemName: "arrow.turn.down.right").help("Subtask") }
                    Spacer()
                    if let user = document.board.users.first(where: { $0.id == task.assigneeID }) {
                        Text(user.name).foregroundStyle(Volta.mutedForeground)
                    }
                    if !task.comments.isEmpty { Label("\(task.comments.count)", systemImage: "text.bubble").foregroundStyle(Volta.mutedForeground) }
                    Text(task.dueDate ?? "").foregroundStyle(Volta.mutedForeground)
                    Picker("Column", selection: Binding(get: { task.columnID }, set: { document.board.moveTask(task.id, to: $0) })) {
                        ForEach(document.board.columns) { Text($0.title).tag($0.id) }
                    }.labelsHidden().frame(width: 170)
                }.contextMenu { taskMenu(task) }
            }
        }
    }
    private var sprints: some View {
        List {
            if document.board.sprints.isEmpty { Text("No sprints yet. Tasks can also stay unassigned.").foregroundStyle(Volta.mutedForeground) }
            ForEach(document.board.sprints) { sprint in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Button(sprint.title) { sprintDraft = sprint }.font(.headline).buttonStyle(.plain)
                        Spacer()
                        Button("View Tasks") { sprintFilter = String(sprint.id); epicFilter = "all"; milestoneFilter = "all"; view = "Workboard" }
                    }
                    if !sprint.goal.isEmpty { Text(sprint.goal).foregroundStyle(Volta.mutedForeground) }
                    Text("\(sprint.startDate ?? "No start date") – \(sprint.endDate ?? "No end date")").font(.caption)
                    let total = document.board.tasks.filter { $0.sprintID == sprint.id }.count
                    let done = document.board.completedCount(in: sprint.id)
                    CompletionProgress(done: done, total: total)
                }.padding(.vertical, 8).contextMenu {
                    Button("Edit Sprint") { sprintDraft = sprint }
                    Button("Remove Sprint (Keep Tasks)", role: .destructive) {
                        document.board.removeSprint(sprint.id)
                        if sprintFilter == String(sprint.id) { sprintFilter = "all" }
                    }
                }
            }
        }
    }
    @ViewBuilder private func taskMenu(_ task: TaskRecord) -> some View {
        Button("Edit Task") { taskDraft = task }
        Menu("Move to") {
            ForEach(document.board.columns) { column in Button(column.title) { document.board.moveTask(task.id, to: column.id) } }
        }
        Button("Delete Task and Subtasks", role: .destructive) { document.board.removeTask(task.id) }
    }
    private func newTask(column: Int? = nil) {
        var task = TaskRecord(columnID: column ?? document.board.columns[0].id, status: document.board.columns.first(where: { $0.id == column })?.status ?? document.board.columns[0].status, sprintID: Int( sprintFilter))
        task.epicID = Int( epicFilter)
        taskDraft = task
    }
}
