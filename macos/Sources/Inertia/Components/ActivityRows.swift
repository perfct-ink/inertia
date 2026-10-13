import SwiftUI
import InertiaCore

struct TaskRow: View {
    let task: WorkTask
    let reload: () async -> Void
    @EnvironmentObject var session: Session
    var body: some View {
        HStack {
            Button {
                Task {
                    do {
                        let _: WorkTask = try await session.request("api/v1/tasks/\(task.id)", method: "PATCH", body: ["task": ["status": task.status == .done ? "todo" : "done"]])
                        await reload()
                    } catch { session.error = error.localizedDescription }
                }
            } label: { Image(systemName: task.status == .done ? "checkmark.circle.fill" : "circle") }
            .buttonStyle(.plain).accessibilityLabel(task.status == .done ? "Reopen task" : "Complete task")
            Text(task.title)
            Spacer()
            Text(task.due_date ?? task.status.rawValue.replacingOccurrences(of: "_", with: " ")).foregroundStyle(.secondary)
        }
    }
}

struct EventRow: View {
    let event: Event
    var body: some View { LabeledContent(event.title, value: event.date ?? "Unscheduled") }
}
