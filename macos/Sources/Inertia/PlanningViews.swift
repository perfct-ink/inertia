import SwiftUI
import InertiaCore

struct EpicList: View {
    @Binding var board: TaskFile
    let showTasks: (Int) -> Void
    @State private var draft: EpicRecord?
    var body: some View {
        VStack(alignment: .leading) {
            Button("New Epic", systemImage: "plus") { draft = EpicRecord() }.padding()
            List {
                if board.epics.isEmpty { Text("Group related tasks into an epic, even across sprints.").foregroundStyle(.secondary) }
                ForEach(board.epics) { epic in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Button(epic.title) { draft = epic }.font(.headline).buttonStyle(.plain)
                            Spacer()
                            Button("View Tasks") { showTasks(epic.id) }
                        }
                        if !epic.notes.isEmpty { Text(epic.notes).foregroundStyle(.secondary) }
                        Text("\(epic.startDate ?? "No start date") – \(epic.targetDate ?? "No target date")").font(.caption)
                        let total = board.tasks.filter { $0.epicID == epic.id }.count
                        let done = board.completedCount(epicID: epic.id)
                        ProgressView(value: Double(done), total: Double(max(total, 1)))
                        Text("\(done) of \(total) tasks complete").font(.caption).foregroundStyle(.secondary)
                        ForEach(board.events.filter { $0.epicID == epic.id }) { milestone in
                            Label("\(milestone.title) · \(milestone.targetDate ?? "Unscheduled")", systemImage: milestone.completed ? "flag.checkered" : "flag")
                                .font(.caption)
                        }
                    }.padding(.vertical, 8).contextMenu {
                        Button("Edit Epic") { draft = epic }
                        Button("Remove Epic (Keep Tasks and Milestones)", role: .destructive) { board.removeEpic(epic.id) }
                    }
                }
            }
        }.sheet(item: $draft) { epic in
            EpicEditor(draft: epic) { updated in
                if let index = board.epics.firstIndex(where: { $0.id == updated.id }) { board.epics[index] = updated }
                else { board.epics.append(updated) }
                draft = nil
            }
        }
    }
}
struct MilestoneList: View {
    @Binding var board: TaskFile
    let showTasks: (Int) -> Void
    @State private var draft: EventRecord?
    var body: some View {
        VStack(alignment: .leading) {
            Button("New Event", systemImage: "plus") { draft = EventRecord() }.padding()
            List {
                if board.events.isEmpty { Text("Add a milestone for a release, review, or delivery date.").foregroundStyle(.secondary) }
                ForEach(board.events) { milestone in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Toggle("Reached", isOn: Binding(get: { milestone.completed }, set: { value in
                                if let index = board.events.firstIndex(where: { $0.id == milestone.id }) { board.events[index].completed = value }
                            })).toggleStyle(.checkbox)
                            Button(milestone.title) { draft = milestone }.font(.headline).buttonStyle(.plain)
                            Spacer()
                            Text(milestone.targetDate ?? "Unscheduled").foregroundStyle(.secondary)
                            Button("View Tasks") { showTasks(milestone.id) }
                        }
                        if !milestone.notes.isEmpty { Text(milestone.notes).foregroundStyle(.secondary) }
                        if let epic = board.epics.first(where: { $0.id == milestone.epicID }) {
                            Label(epic.title, systemImage: "square.stack.3d.up").font(.caption)
                        }
                        Text("\(board.taskIDs(for: milestone.id).count) linked tasks").font(.caption)
                    }.padding(.vertical, 8).contextMenu {
                        Button("Edit Event") { draft = milestone }
                        Button("Remove Event (Keep Tasks)", role: .destructive) { board.removeEvent(milestone.id) }
                    }
                }
            }
        }.sheet(item: $draft) { milestone in
            MilestoneEditor(draft: milestone, epics: board.epics) { updated in
                if let index = board.events.firstIndex(where: { $0.id == updated.id }) { board.events[index] = updated }
                else { board.events.append(updated) }
                draft = nil
            }
        }
    }
}
private struct EpicEditor: View {
    @State var draft: EpicRecord
    let save: (EpicRecord) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var error: String?
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Epic").font(.title2.bold())
            Form {
                TextField("Title", text: $draft.title)
                TextField("Start (YYYY-MM-DD)", text: Binding(get: { draft.startDate ?? "" }, set: { draft.startDate = $0.isEmpty ? nil : $0 }))
                TextField("Target (YYYY-MM-DD)", text: Binding(get: { draft.targetDate ?? "" }, set: { draft.targetDate = $0.isEmpty ? nil : $0 }))
            }
            Text("Notes").font(.headline)
            TextEditor(text: $draft.notes).frame(height: 100).border(.quaternary)
            if let error { Text(error).foregroundStyle(.red).font(.caption) }
            HStack {
                Button("Cancel") { dismiss() }.keyboardShortcut(.cancelAction)
                Spacer()
                Button("Save") {
                    var candidate = TaskFile(); candidate.epics = [draft]
                    do { try candidate.validate(); save(draft) }
                    catch { self.error = error.localizedDescription }
                }.keyboardShortcut(.defaultAction).disabled(draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }.padding(24).frame(width: 480)
    }
}
private struct MilestoneEditor: View {
    @State var draft: EventRecord
    let epics: [EpicRecord]
    let save: (EventRecord) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var error: String?
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Event").font(.title2.bold())
            Form {
                TextField("Title", text: $draft.title)
                Picker("Type", selection: $draft.event_type) {
                    ForEach(EventType.allCases, id: \.self) { Text($0.rawValue.capitalized).tag($0) }
                }
                TextField("Date (YYYY-MM-DD)", text: Binding(get: { draft.date ?? "" }, set: { draft.date = $0.isEmpty ? nil : $0 }))
                Picker("Epic (file extension)", selection: $draft.epicID) {
                    Text("None").tag(nil as Int?)
                    ForEach(epics) { Text($0.title).tag(Optional($0.id)) }
                }
                Toggle("Reached", isOn: $draft.completed)
            }
            Text("Notes").font(.headline)
            TextEditor(text: $draft.notes).frame(height: 100).border(.quaternary)
            if let error { Text(error).foregroundStyle(.red).font(.caption) }
            HStack {
                Button("Cancel") { dismiss() }.keyboardShortcut(.cancelAction)
                Spacer()
                Button("Save") {
                    var candidate = TaskFile(); candidate.epics = epics; candidate.events = [draft]
                    do { try candidate.validate(); save(draft) }
                    catch { self.error = error.localizedDescription }
                }.keyboardShortcut(.defaultAction).disabled(draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }.padding(24).frame(width: 480)
    }
}
