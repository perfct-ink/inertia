import Foundation

enum TaskFileSchema {
    static func keys(_ object: [String: Any], _ allowed: Set<String>) throws {
        guard Set(object.keys).isSubset(of: allowed) else { throw TaskFileError.invalid("Unrecognized file fields; refusing to discard data.") }
    }
    static let taskFields: Set<String> = ["id", "title", "description", "status", "due_date", "position", "document_id", "assignee_id", "epic_id", "parent_id", "folder_id", "workspace_id", "created_at", "updated_at", "extensions"]
    static let epicFields: Set<String> = ["id", "title", "folder_id", "workspace_id", "start_date", "target_date", "created_at", "updated_at", "tasks_count", "done_tasks_count", "extensions"]
    static let eventFields: Set<String> = ["id", "title", "description", "date", "event_type", "start_time", "end_time", "folder_id", "workspace_id", "created_at", "updated_at", "tasks", "extensions"]
    static let userFields: Set<String> = ["id", "name", "email", "created_at", "updated_at"]
    static func check(_ root: [String: Any]) throws {
        try keys(root, ["format", "version", "id", "title", "board", "tasks", "epics", "events", "event_tasks", "users", "extensions"])
        if let board = root["board"] as? [String: Any] {
            try keys(board, ["columns"])
            for column in board["columns"] as? [[String: Any]] ?? [] { try keys(column, ["id", "title", "status"]) }
        }
        for task in root["tasks"] as? [[String: Any]] ?? [] { try checkTask(task) }
        for epic in root["epics"] as? [[String: Any]] ?? [] {
            try keys(epic, epicFields)
            if let ext = epic["extensions"] as? [String: Any] { try keys(ext, ["notes"]) }
        }
        for event in root["events"] as? [[String: Any]] ?? [] {
            try keys(event, eventFields)
            if let ext = event["extensions"] as? [String: Any] { try keys(ext, ["epic_id", "completed", "unscheduled"]) }
            for task in event["tasks"] as? [[String: Any]] ?? [] { try checkTask(task) }
        }
        for link in root["event_tasks"] as? [[String: Any]] ?? [] { try keys(link, ["event_id", "task_id"]) }
        for user in root["users"] as? [[String: Any]] ?? [] { try keys(user, userFields) }
        if let ext = root["extensions"] as? [String: Any] {
            try keys(ext, ["sprints"])
            for sprint in ext["sprints"] as? [[String: Any]] ?? [] { try keys(sprint, ["id", "title", "goal", "start_date", "end_date"]) }
        }
    }
    private static func checkTask(_ task: [String: Any]) throws {
        try keys(task, taskFields)
        if let ext = task["extensions"] as? [String: Any] {
            try keys(ext, ["column_id", "sprint_id", "comments"])
            for comment in ext["comments"] as? [[String: Any]] ?? [] { try keys(comment, ["id", "body", "author_id", "author_name", "created_at"]) }
        }
    }
}
