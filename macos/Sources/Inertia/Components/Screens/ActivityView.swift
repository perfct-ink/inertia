import SwiftUI
import InertiaCore

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
                    ForEach(events) { event in EventRow(event: event) }
                } else {
                    ForEach(tasks) { task in TaskRow(task: task, reload: load) }
                }
            }
        }.navigationTitle(showEvents ? "Calendar · Agenda" : "Tasks")
            .toolbar { RefreshButton(action: load) }
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
