import SwiftUI
import InertiaCore

@main struct InertiaApp: App {
    @StateObject private var session = Session()
    var body: some Scene {
        DocumentGroup(newDocument: TasksDocument()) { file in
            TaskFileView(document: file.$document)
        }
        Window("Online Workspace", id: "workspace") {
            RootView().environmentObject(session).frame(minWidth: 900, minHeight: 600)
                .alert("Inertia", isPresented: Binding(get: { session.error != nil }, set: { if !$0 { session.error = nil } })) {
                    Button("OK") { session.error = nil }
                } message: { Text(session.error ?? "") }
        }
        .commands {
            CommandGroup(after: .newItem) {
                Button("Refresh Workspace") { Task { await session.refresh() } }.keyboardShortcut("r")
            }
        }
    }
}
struct RootView: View {
    @EnvironmentObject var session: Session
    @State private var email = ""
    @State private var password = ""
    @State private var selection: String? = "tasks"
    var body: some View {
        if session.token == nil {
            VStack(spacing: 16) {
                Text("Inertia").font(.largeTitle.bold())
                Text("Your documents, projects, and tasks.").foregroundStyle(.secondary)
                TextField("Email", text: $email)
                SecureField("Password", text: $password).onSubmit(signIn)
                Button("Sign In", action: signIn).buttonStyle(.borderedProminent).disabled(session.busy || email.isEmpty || password.isEmpty)
                if session.busy { ProgressView() }
                Link("Create an account", destination: URL(string: "/index.html#/signup", relativeTo: session.web)!)
            }.textFieldStyle(.roundedBorder).padding(40).frame(width: 400)
        } else {
            NavigationSplitView {
                List(selection: $selection) {
                    Label("Tasks", systemImage: "checklist").tag("tasks")
                    Label("Calendar", systemImage: "calendar").tag("events")
                    Section("Projects") {
                        OutlineGroup(session.folders, children: \.branches) { folder in
                            Label(folder.name, systemImage: "folder").tag("folder:\(folder.id)")
                        }
                    }
                }.navigationTitle("Inertia")
                .toolbar { Button("Sign Out") { Task { await session.logout() } } }
            } detail: {
                if let selection, selection.hasPrefix("folder:"), let id = Int(selection.dropFirst(7)) {
                    FolderDashboard(id: id).id(id)
                } else {
                    ActivityView(showEvents: selection == "events").id(selection)
                }
            }
        }
    }
    private func signIn() {
        let secret = password
        password = ""
        Task { await session.login(email: email, password: secret) }
    }
}
struct FolderDashboard: View {
    let id: Int
    @EnvironmentObject var session: Session
    @State private var contents: Contents?
    @State private var document: InertiaCore.Document?
    var body: some View {
        Group {
            if let document {
                EditorView(documentID: document.id, session: session)
                    .toolbar { Button("Back to Project", systemImage: "chevron.left") { self.document = nil } }
                    .navigationTitle(document.title)
            } else if let contents {
                List {
                    Section("Documents") {
                        if contents.documents.isEmpty { Text("No documents yet").foregroundStyle(.secondary) }
                        ForEach(contents.documents) { doc in
                            Button { document = doc } label: {
                                Label(doc.title, systemImage: doc.doc_type == "spreadsheet" ? "tablecells" : "doc.text")
                            }.buttonStyle(.plain)
                        }
                    }
                    Section("Open Tasks") {
                        ForEach(contents.tasks.filter { $0.status != "done" }) { task in TaskRow(task: task, reload: load) }
                    }
                    Section("Upcoming Events") {
                        ForEach(contents.events.filter { $0.date >= Date.now.formatted(.iso8601.year().month().day().dateSeparator(.dash)) }) { event in
                            LabeledContent(event.title, value: event.date)
                        }
                    }
                }.navigationTitle("Project Overview")
                    .toolbar { Button("Refresh", systemImage: "arrow.clockwise") { Task { await load() } } }
            } else { ProgressView() }
        }.task { await load() }
    }
    private func load() async {
        do { contents = try await session.request("api/v1/folders/\(id)/contents") }
        catch { session.error = error.localizedDescription }
    }
}
struct TaskRow: View {
    let task: WorkTask
    let reload: () async -> Void
    @EnvironmentObject var session: Session
    var body: some View {
        HStack {
            Button {
                Task {
                    do {
                        let _: WorkTask = try await session.request("api/v1/tasks/\(task.id)", method: "PATCH", body: ["task": ["status": task.status == "done" ? "todo" : "done"]])
                        await reload()
                    } catch { session.error = error.localizedDescription }
                }
            } label: { Image(systemName: task.status == "done" ? "checkmark.circle.fill" : "circle") }
            .buttonStyle(.plain).accessibilityLabel(task.status == "done" ? "Reopen task" : "Complete task")
            Text(task.title)
            Spacer()
            Text(task.due_date ?? task.status.replacingOccurrences(of: "_", with: " ")).foregroundStyle(.secondary)
        }
    }
}
struct ActivityView: View {
    let showEvents: Bool
    @EnvironmentObject var session: Session
    @State private var tasks: [WorkTask] = []
    @State private var events: [Event] = []
    @State private var title = ""
    @State private var date = Date()
    var body: some View {
        VStack {
            HStack {
                TextField(showEvents ? "New event" : "New task", text: $title).onSubmit(add)
                if showEvents { DatePicker("Date", selection: $date, displayedComponents: .date).labelsHidden() }
                Button("Add", action: add).disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
            }.padding()
            List {
                if showEvents {
                    ForEach(events) { event in LabeledContent(event.title, value: event.date) }
                } else {
                    ForEach(tasks) { task in TaskRow(task: task, reload: load) }
                }
            }
        }.navigationTitle(showEvents ? "Calendar · Agenda" : "Tasks")
            .toolbar { Button("Refresh", systemImage: "arrow.clockwise") { Task { await load() } } }
            .task { await load() }
    }
    private func load() async {
        do {
            if showEvents { events = try await session.request("api/v1/events") }
            else { tasks = try await session.request("api/v1/tasks") }
        } catch { session.error = error.localizedDescription }
    }
    private func add() {
        guard !title.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        Task {
            do {
                if showEvents {
                    let _: Event = try await session.request("api/v1/events", method: "POST", body: ["event": ["title": title, "date": date.formatted(.iso8601.year().month().day().dateSeparator(.dash)), "event_type": "deadline"]])
                } else {
                    let _: WorkTask = try await session.request("api/v1/tasks", method: "POST", body: ["task": ["title": title, "status": "todo"]])
                }
                title = ""; await load()
            } catch { session.error = error.localizedDescription }
        }
    }
}
