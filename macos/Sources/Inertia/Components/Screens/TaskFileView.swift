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
                TextField("Project name", text: $document.board.title).voltaFont(.xl, weight: .semibold).foregroundStyle(Volta.foreground)
                    .textFieldStyle(InertiaTextFieldStyle(showsBorder: false))
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
                    VoltaSelect("Sprint", selection: $sprintFilter,
                                options: SelectChoices.filter(all: "All tasks", unassigned: "Unassigned", document.board.sprints, id: \.id, label: \.title)).frame(maxWidth: 220)
                    VoltaSelect("Epic", selection: $epicFilter,
                                options: SelectChoices.filter(all: "All epics", unassigned: "Unassigned", document.board.epics, id: \.id, label: \.title)).frame(maxWidth: 220)
                    VoltaSelect("Event", selection: $milestoneFilter,
                                options: SelectChoices.filter(all: "All events", unassigned: "Unassigned", document.board.events, id: \.id, label: \.title)).frame(maxWidth: 220)
                    Spacer()
                    Text("\(visibleTasks.count) tasks").voltaMuted()
                }.padding([.horizontal, .bottom])
            }
            VoltaDivider()
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
        .voltaWindow()
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
                            Text(column.title).voltaFont(.sm, weight: .semibold).foregroundStyle(Volta.foreground)
                            Spacer()
                            Text("\(visibleTasks.filter { $0.columnID == column.id }.count)").voltaMuted()
                            Button { newTask(column: column.id) } label: { Image(systemName: "plus") }
                                .buttonStyle(.volta(.ghost)).help("Add task to \(column.title)").accessibilityLabel("Add task to \(column.title)")
                        }
                        ForEach(visibleTasks.filter { $0.columnID == column.id }) { task in
                            Button { taskDraft = task } label: {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(task.title).voltaFont(.sm, weight: .medium).foregroundStyle(Volta.foreground)
                                    if !task.descriptionText.isEmpty { Text(task.descriptionText).lineLimit(2).voltaCaption() }
                                    if let user = document.board.users.first(where: { $0.id == task.assigneeID }) {
                                        Label(user.name, systemImage: "person").voltaCaption()
                                    }
                                    if !task.comments.isEmpty { Label("\(task.comments.count) comments", systemImage: "text.bubble").voltaCaption() }
                                    if let epic = document.board.epics.first(where: { $0.id == task.epicID }) {
                                        Label(epic.title, systemImage: "square.stack.3d.up").voltaCaption()
                                    }
                                    ForEach(document.board.events.filter { document.board.eventIDs(for: task.id).contains($0.id) }) { milestone in
                                        Label(milestone.title, systemImage: "flag").voltaCaption()
                                    }
                                    if let date = task.dueDate { Label(date, systemImage: "calendar").voltaCaption() }
                                    if let sprint = document.board.sprints.first(where: { $0.id == task.sprintID }) {
                                        Text(sprint.title).voltaCaption()
                                    }
                                }.frame(maxWidth: .infinity, alignment: .leading).padding(VoltaMetrics.space(3))
                            }.buttonStyle(.voltaCard).draggable(String(task.id))
                                .contextMenu { taskMenu(task) }
                        }
                        if !visibleTasks.contains(where: { $0.columnID == column.id }) {
                            Text("Drop a task here").voltaMuted().frame(maxWidth: .infinity).padding(.vertical, 30)
                        }
                    }.padding(12).frame(width: 260).voltaSurface(.muted)
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
            if visibleTasks.isEmpty { Text("No tasks. Use New Task to add one.").voltaMuted() }
            ForEach(visibleTasks) { task in
                HStack {
                    Button(task.title) { taskDraft = task }.buttonStyle(.voltaLink(.title))
                    if task.parentID != nil { Image(systemName: "arrow.turn.down.right").help("Subtask").accessibilityLabel("Subtask") }
                    Spacer()
                    if let user = document.board.users.first(where: { $0.id == task.assigneeID }) {
                        Text(user.name).voltaMuted()
                    }
                    if !task.comments.isEmpty { Label("\(task.comments.count)", systemImage: "text.bubble").voltaMuted() }
                    Text(task.dueDate ?? "").voltaMuted()
                    VoltaSelect("Column", selection: Binding(get: { task.columnID }, set: { document.board.moveTask(task.id, to: $0) }),
                                options: SelectChoices.records(document.board.columns, id: \.id, label: \.title), hidesTitle: true).frame(width: 170)
                }.contextMenu { taskMenu(task) }
            }
        }.scrollContentBackground(.hidden)
    }
    private var sprints: some View {
        List {
            if document.board.sprints.isEmpty { Text("No sprints yet. Tasks can also stay unassigned.").voltaMuted() }
            ForEach(document.board.sprints) { sprint in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Button(sprint.title) { sprintDraft = sprint }.buttonStyle(.voltaLink(.title))
                        Spacer()
                        Button("View Tasks") { sprintFilter = String(sprint.id); epicFilter = "all"; milestoneFilter = "all"; view = "Workboard" }
                            .buttonStyle(.volta(.secondary))
                    }
                    if !sprint.goal.isEmpty { Text(sprint.goal).voltaMuted() }
                    Text("\(sprint.startDate ?? "No start date") – \(sprint.endDate ?? "No end date")").voltaCaption()
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
        }.scrollContentBackground(.hidden)
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
