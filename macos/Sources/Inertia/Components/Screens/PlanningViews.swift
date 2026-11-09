import SwiftUI
import InertiaCore

struct EpicList: View {
    @Binding var board: TaskFile
    let showTasks: (Int) -> Void
    @State private var draft: EpicRecord?
    var body: some View {
        VStack(alignment: .leading) {
            Button("New Epic", systemImage: "plus") { draft = EpicRecord() }.buttonStyle(.volta(.secondary)).padding()
            List {
                if board.epics.isEmpty { Text("Group related tasks into an epic, even across sprints.").voltaMuted() }
                ForEach(board.epics) { epic in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Button(epic.title) { draft = epic }.buttonStyle(.voltaLink(.title))
                            Spacer()
                            Button("View Tasks") { showTasks(epic.id) }.buttonStyle(.volta(.secondary))
                        }
                        if !epic.notes.isEmpty { Text(epic.notes).voltaMuted() }
                        Text("\(epic.startDate ?? "No start date") – \(epic.targetDate ?? "No target date")").voltaCaption()
                        let total = board.tasks.filter { $0.epicID == epic.id }.count
                        let done = board.completedCount(epicID: epic.id)
                        CompletionProgress(done: done, total: total)
                        ForEach(board.events.filter { $0.epicID == epic.id }) { milestone in
                            Label("\(milestone.title) · \(milestone.targetDate ?? "Unscheduled")", systemImage: milestone.completed ? "flag.checkered" : "flag")
                                .voltaCaption()
                        }
                    }.padding(.vertical, 8).contextMenu {
                        Button("Edit Epic") { draft = epic }
                        Button("Remove Epic (Keep Tasks and Milestones)", role: .destructive) { board.removeEpic(epic.id) }
                    }
                }
            }.scrollContentBackground(.hidden)
        }.voltaWindow().sheet(item: $draft) { epic in
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
            Button("New Event", systemImage: "plus") { draft = EventRecord() }.buttonStyle(.volta(.secondary)).padding()
            List {
                if board.events.isEmpty { Text("Add a milestone for a release, review, or delivery date.").voltaMuted() }
                ForEach(board.events) { milestone in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Toggle("Reached", isOn: Binding(get: { milestone.completed }, set: { value in
                                if let index = board.events.firstIndex(where: { $0.id == milestone.id }) { board.events[index].completed = value }
                            }))
                            Button(milestone.title) { draft = milestone }.buttonStyle(.voltaLink(.title))
                            Spacer()
                            Text(milestone.targetDate ?? "Unscheduled").voltaMuted()
                            Button("View Tasks") { showTasks(milestone.id) }.buttonStyle(.volta(.secondary))
                        }
                        if !milestone.notes.isEmpty { Text(milestone.notes).voltaMuted() }
                        if let epic = board.epics.first(where: { $0.id == milestone.epicID }) {
                            Label(epic.title, systemImage: "square.stack.3d.up").voltaCaption()
                        }
                        Text("\(board.taskIDs(for: milestone.id).count) linked tasks").voltaCaption()
                    }.padding(.vertical, 8).contextMenu {
                        Button("Edit Event") { draft = milestone }
                        Button("Remove Event (Keep Tasks)", role: .destructive) { board.removeEvent(milestone.id) }
                    }
                }
            }.scrollContentBackground(.hidden)
        }.voltaWindow().sheet(item: $draft) { milestone in
            MilestoneEditor(draft: milestone, epics: board.epics) { updated in
                if let index = board.events.firstIndex(where: { $0.id == updated.id }) { board.events[index] = updated }
                else { board.events.append(updated) }
                draft = nil
            }
        }
    }
}
