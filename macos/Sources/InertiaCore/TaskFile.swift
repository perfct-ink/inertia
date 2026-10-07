import Foundation

/// Portable, local task document. IDs are independent of Rails database IDs.
public struct TaskFile: Codable, Equatable {
    public static let formatIdentifier = "com.inertia.tasks"
    public var format = formatIdentifier
    public var version = 1
    public var id: UUID
    public var title: String
    public var columns: [BoardColumn]
    public var tasks: [FileTask]
    public var sprints: [Sprint]

    public init(title: String = "Untitled Tasks") {
        id = UUID()
        self.title = title
        columns = [BoardColumn(title: "Backlog"), BoardColumn(title: "To Do"),
                   BoardColumn(title: "In Progress"), BoardColumn(title: "Done", isCompleted: true)]
        tasks = []
        sprints = []
    }

    public static func read(_ data: Data) throws -> TaskFile {
        // Reject unknown fields rather than silently discarding another writer's data.
        guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              root["format"] as? String == formatIdentifier else {
            throw TaskFileError.invalid("This is not an Inertia task file.")
        }
        guard root["version"] as? Int == 1 else {
            throw TaskFileError.invalid("This task file version is not supported. Update Inertia to open it.")
        }
        try checkKeys(root, allowed: ["format", "version", "id", "title", "columns", "tasks", "sprints"])
        for (key, allowed) in [
            "columns": Set(["id", "title", "isCompleted"]),
            "tasks": Set(["id", "title", "notes", "columnID", "sprintID", "parentID", "dueDate"]),
            "sprints": Set(["id", "title", "goal", "startDate", "endDate"])
        ] {
            for object in root[key] as? [[String: Any]] ?? [] { try checkKeys(object, allowed: allowed) }
        }
        let file = try JSONDecoder().decode(TaskFile.self, from: data)
        try file.validate()
        return file
    }

    public func data() throws -> Data {
        try validate()
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        var result = try encoder.encode(self)
        result.append(0x0a)
        return result
    }

    public func validate() throws {
        guard format == Self.formatIdentifier, version == 1 else { throw TaskFileError.invalid("Unsupported task file format or version.") }
        guard !columns.isEmpty else { throw TaskFileError.invalid("A Workboard needs at least one column.") }
        try unique(columns.map(\.id)); try unique(tasks.map(\.id)); try unique(sprints.map(\.id))
        let columnIDs = Set(columns.map(\.id)), sprintIDs = Set(sprints.map(\.id))
        let taskByID = Dictionary(uniqueKeysWithValues: tasks.map { ($0.id, $0) })
        for sprint in sprints {
            try validateDate(sprint.startDate); try validateDate(sprint.endDate)
            if let start = sprint.startDate, let end = sprint.endDate, start > end {
                throw TaskFileError.invalid("A sprint's end date must be on or after its start date.")
            }
        }
        for task in tasks {
            guard columnIDs.contains(task.columnID) else { throw TaskFileError.invalid("A task refers to a missing column.") }
            if let sprintID = task.sprintID, !sprintIDs.contains(sprintID) { throw TaskFileError.invalid("A task refers to a missing sprint.") }
            try validateDate(task.dueDate)
            var seen: Set<UUID> = [task.id]
            var parentID = task.parentID
            while let current = parentID {
                guard seen.insert(current).inserted, let parent = taskByID[current] else {
                    throw TaskFileError.invalid("Task parents contain a cycle or a missing task.")
                }
                parentID = parent.parentID
            }
        }
    }

    public mutating func moveTask(_ id: UUID, to columnID: UUID) {
        guard columns.contains(where: { $0.id == columnID }), let index = tasks.firstIndex(where: { $0.id == id }) else { return }
        // Array order is card order; a move appends to the destination column.
        var task = tasks.remove(at: index)
        task.columnID = columnID
        tasks.append(task)
    }
    public mutating func removeTask(_ id: UUID) {
        tasks.removeAll { $0.id == id }
        for index in tasks.indices where tasks[index].parentID == id { tasks[index].parentID = nil }
    }
    public mutating func removeSprint(_ id: UUID) {
        sprints.removeAll { $0.id == id }
        for index in tasks.indices where tasks[index].sprintID == id { tasks[index].sprintID = nil }
    }
    public func completedCount(in sprintID: UUID) -> Int {
        let completed = Set(columns.filter(\.isCompleted).map(\.id))
        return tasks.filter { $0.sprintID == sprintID && completed.contains($0.columnID) }.count
    }
    private static func checkKeys(_ object: [String: Any], allowed: Set<String>) throws {
        guard Set(object.keys).isSubset(of: allowed) else {
            throw TaskFileError.invalid("This file contains unrecognized fields. It was not opened, to avoid losing data.")
        }
    }
    private func unique(_ ids: [UUID]) throws {
        guard Set(ids).count == ids.count else { throw TaskFileError.invalid("Duplicate IDs in task file.") }
    }
    private func validateDate(_ date: String?) throws {
        guard let date else { return }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.isLenient = false
        guard date.count == 10, let parsed = formatter.date(from: date), formatter.string(from: parsed) == date else {
            throw TaskFileError.invalid("Dates must be valid calendar dates in YYYY-MM-DD format.")
        }
    }
}
public struct BoardColumn: Codable, Equatable, Identifiable {
    public var id: UUID
    public var title: String
    public var isCompleted: Bool
    public init(title: String, isCompleted: Bool = false) {
        id = UUID(); self.title = title; self.isCompleted = isCompleted
    }
}
public struct FileTask: Codable, Equatable, Identifiable {
    public var id: UUID
    public var title: String
    public var notes: String
    public var columnID: UUID
    public var sprintID: UUID?
    public var parentID: UUID?
    public var dueDate: String?
    public init(title: String = "New Task", columnID: UUID, sprintID: UUID? = nil) {
        id = UUID(); self.title = title; notes = ""; self.columnID = columnID; self.sprintID = sprintID
    }
}
public struct Sprint: Codable, Equatable, Identifiable {
    public var id: UUID
    public var title: String
    public var goal: String
    public var startDate: String?
    public var endDate: String?
    public init(title: String = "New Sprint") { id = UUID(); self.title = title; goal = "" }
}
public enum TaskFileError: LocalizedError {
    case invalid(String)
    public var errorDescription: String? { if case .invalid(let message) = self { return message }; return nil }
}
