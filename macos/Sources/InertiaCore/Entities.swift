import Foundation

// Shared by the Rails API client and local documents. Only public entity fields
// are represented here; authentication secrets never belong in a task file.
public enum TaskStatus: String, Codable, CaseIterable {
    case todo, in_progress, in_review, done, backlog
    public var label: String {
        switch self {
        case .todo: return "To Do"
        case .in_progress: return "In Progress"
        case .in_review: return "In Review"
        case .done: return "Done"
        case .backlog: return "Backlog"
        }
    }
}
public enum EventType: String, Codable, CaseIterable { case deadline, milestone }
// Local IDs occupy the same JSON integer shape as Rails IDs. They are scoped to
// the document, not identities in a server database. No automatic import occurs.
public func newLocalID() -> Int { Int.random(in: 1...9_007_199_254_740_991) }

public struct TaskRecord: Codable, Equatable, Identifiable {
    public var id: Int
    public var title: String
    public var description: String?
    public var status: TaskStatus
    public var due_date: String?
    public var position: Int?
    public var document_id: Int?
    public var assignee_id: Int?
    public var epic_id: Int?
    public var parent_id: Int?
    public var folder_id: Int?
    public var workspace_id: Int?
    public var created_at: String?
    public var updated_at: String?
    public var extensions: TaskExtras?
    public init(title: String = "New Task", columnID: Int, status: TaskStatus = .backlog, sprintID: Int? = nil) {
        id = newLocalID(); self.title = title; description = ""; self.status = status; position = 0
        extensions = TaskExtras(column_id: columnID, sprint_id: sprintID, comments: [])
    }
    // UI conveniences. Encoded core fields use the existing API names above.
    public var columnID: Int { get { extensions?.column_id ?? 0 } set { ensureExtras(); extensions?.column_id = newValue } }
    public var sprintID: Int? { get { extensions?.sprint_id } set { ensureExtras(); extensions?.sprint_id = newValue } }
    public var comments: [TaskComment] { get { extensions?.comments ?? [] } set { ensureExtras(); extensions?.comments = newValue } }
    public var dueDate: String? { get { due_date } set { due_date = newValue } }
    public var epicID: Int? { get { epic_id } set { epic_id = newValue } }
    public var parentID: Int? { get { parent_id } set { parent_id = newValue } }
    public var assigneeID: Int? { get { assignee_id } set { assignee_id = newValue } }
    public var descriptionText: String { get { description ?? "" } set { description = newValue } }
    private mutating func ensureExtras() { if extensions == nil { extensions = TaskExtras() } }
}
public struct TaskExtras: Codable, Equatable {
    public var column_id: Int?
    public var sprint_id: Int?
    public var comments: [TaskComment]?
    public init(column_id: Int? = nil, sprint_id: Int? = nil, comments: [TaskComment]? = nil) {
        self.column_id = column_id; self.sprint_id = sprint_id; self.comments = comments
    }
}
public struct EpicRecord: Codable, Equatable, Identifiable {
    public var id: Int
    public var title: String
    public var folder_id: Int?
    public var workspace_id: Int?
    public var start_date: String?
    public var target_date: String?
    public var created_at: String?
    public var updated_at: String?
    public var tasks_count: Int?
    public var done_tasks_count: Int?
    public var extensions: EpicExtras?
    public init(title: String = "New Epic") { id = newLocalID(); self.title = title }
    public var startDate: String? { get { start_date } set { start_date = newValue } }
    public var targetDate: String? { get { target_date } set { target_date = newValue } }
    public var notes: String { get { extensions?.notes ?? "" } set { extensions = EpicExtras(notes: newValue) } }
}
public struct EpicExtras: Codable, Equatable { public var notes: String? }
public struct EventRecord: Codable, Equatable, Identifiable {
    public var id: Int
    public var title: String
    public var description: String?
    public var date: String?
    public var event_type: EventType
    public var start_time: String?
    public var end_time: String?
    public var folder_id: Int?
    public var workspace_id: Int?
    public var created_at: String?
    public var updated_at: String?
    // API responses may embed associated tasks. Local documents normalize them
    // into their root tasks/event_tasks collections before writing.
    public var tasks: [TaskRecord]?
    public var extensions: EventExtras?
    public init(title: String = "New Milestone") {
        id = newLocalID(); self.title = title; event_type = .milestone
        date = Date.now.formatted(.iso8601.year().month().day().dateSeparator(.dash))
    }
    public var targetDate: String? { get { date } set { date = newValue } }
    public var notes: String { get { description ?? "" } set { description = newValue } }
    public var epicID: Int? { get { extensions?.epic_id } set { ensureExtras(); extensions?.epic_id = newValue } }
    public var completed: Bool { get { extensions?.completed ?? false } set { ensureExtras(); extensions?.completed = newValue } }
    private mutating func ensureExtras() { if extensions == nil { extensions = EventExtras() } }
}
public struct EventExtras: Codable, Equatable {
    public var epic_id: Int?
    public var completed: Bool?
    // Preserve an undated legacy milestone as a local draft, never invent a date.
    public var unscheduled: Bool?
}
public struct EventTaskRecord: Codable, Equatable {
    public var event_id: Int
    public var task_id: Int
    public init(event_id: Int, task_id: Int) { self.event_id = event_id; self.task_id = task_id }
}
public struct UserRecord: Codable, Equatable, Identifiable {
    public var id: Int
    public var name: String
    public var email: String?
    public var created_at: String?
    public var updated_at: String?
    public init(name: String = "", email: String? = nil) { id = newLocalID(); self.name = name; self.email = email }
}
// These are optional file extensions: the backend has no Sprint/Comment model.
public struct Sprint: Codable, Equatable, Identifiable {
    public var id: Int
    public var title: String
    public var goal: String
    public var start_date: String?
    public var end_date: String?
    public init(title: String = "New Sprint") { id = newLocalID(); self.title = title; goal = "" }
    public var startDate: String? { get { start_date } set { start_date = newValue } }
    public var endDate: String? { get { end_date } set { end_date = newValue } }
}
public struct TaskComment: Codable, Equatable, Identifiable {
    public var id: Int
    public var body: String
    public var author_id: Int?
    public var author_name: String?
    public var created_at: String
    public init(body: String, author: UserRecord? = nil, date: Date = Date()) {
        id = newLocalID(); self.body = body; author_id = author?.id; author_name = author?.name
        created_at = ISO8601DateFormatter().string(from: date)
    }
    public var authorID: Int? { get { author_id } set { author_id = newValue } }
    public var authorName: String? { get { author_name } set { author_name = newValue } }
    public var createdAt: String { get { created_at } set { created_at = newValue } }
}
