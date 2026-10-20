import Foundation

public struct BoardColumn: Codable, Equatable, Identifiable {
    public var id: Int
    public var title: String
    public var status: TaskStatus
    public init(title: String, status: TaskStatus = .todo, id: Int = newLocalID()) {
        self.id = id; self.title = title; self.status = status
    }
}
public struct BoardConfiguration: Codable, Equatable { public var columns: [BoardColumn] }
public struct DocumentExtras: Codable, Equatable { public var sprints: [Sprint]? }

public struct TaskFile: Codable, Equatable {
    public static let formatIdentifier = "com.inertia.tasks"
    public var format = formatIdentifier
    public var version = 4
    public var id: UUID
    public var title: String
    public var board: BoardConfiguration
    public var tasks: [TaskRecord]
    public var epics: [EpicRecord]
    public var events: [EventRecord]
    public var event_tasks: [EventTaskRecord]
    public var users: [UserRecord]
    // Planning levels above epics. Absent (nil) when unused so files that do not
    // plan stay readable by earlier v4 builds, which reject unknown fields.
    public var initiatives: [InitiativeRecord]?
    public var milestones: [MilestoneRecord]?
    public var extensions: DocumentExtras?
    public var columns: [BoardColumn] { get { board.columns } set { board.columns = newValue } }
    public var sprints: [Sprint] {
        get { extensions?.sprints ?? [] }
        set { extensions = DocumentExtras(sprints: newValue) }
    }
    public init(title: String = "Untitled Tasks") {
        id = UUID(); self.title = title
        let statuses: [TaskStatus] = [.backlog, .todo, .in_progress, .in_review, .done]
        board = BoardConfiguration(columns: statuses.enumerated().map { BoardColumn(title: $0.element.label, status: $0.element, id: $0.offset + 1) })
        tasks = []; epics = []; events = []; event_tasks = []; users = []
    }
    public static func read(_ data: Data) throws -> TaskFile {
        struct Header: Decodable { let format: String; let version: Int }
        let header = try JSONDecoder().decode(Header.self, from: data)
        guard header.format == formatIdentifier else { throw TaskFileError.invalid("This is not an Inertia task file.") }
        guard (1...4).contains(header.version) else { throw TaskFileError.invalid("Update Inertia to open this task file version.") }
        guard var root = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw TaskFileError.invalid("Expected a task document.") }
        if header.version < 4 { root = try LegacyTaskFile.upgrade(root, version: header.version) }
        try TaskFileSchema.check(root)
        if root["users"] == nil || root["users"] is NSNull { root["users"] = [] }
        var file = try JSONDecoder().decode(TaskFile.self, from: JSONSerialization.data(withJSONObject: root))
        try file.normalize()
        try file.validate()
        return file
    }
    public func data() throws -> Data {
        var file = self
        try file.normalize(); try file.validate()
        let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        var data = try encoder.encode(file); data.append(0x0a); return data
    }
    private mutating func normalize() throws {
        if initiatives?.isEmpty == true { initiatives = nil }
        if milestones?.isEmpty == true { milestones = nil }
        // The same EventRecord decodes the API's with_tasks blueprint and files.
        // Flatten embedded API associations to the existing EventTask relation.
        for index in events.indices {
            for task in events[index].tasks ?? [] {
                if let existing = tasks.first(where: { $0.id == task.id }) {
                    guard existing == task else { throw TaskFileError.invalid("Conflicting copies of a task in event data.") }
                } else { tasks.append(task) }
                let link = EventTaskRecord(event_id: events[index].id, task_id: task.id)
                if !event_tasks.contains(link) { event_tasks.append(link) }
            }
            events[index].tasks = nil
        }
        for index in tasks.indices where tasks[index].extensions?.column_id == nil {
            guard let column = columns.first(where: { $0.status == tasks[index].status }) else {
                throw TaskFileError.invalid("The board needs a column for every task status used in this file.")
            }
            tasks[index].columnID = column.id
        }
    }
    public func validate() throws {
        guard format == Self.formatIdentifier, version == 4 else { throw TaskFileError.invalid("Unsupported task file format or version.") }
        guard !columns.isEmpty else { throw TaskFileError.invalid("A Workboard needs at least one column.") }
        try unique(columns.map(\.id)); try unique(tasks.map(\.id)); try unique(epics.map(\.id))
        try unique(events.map(\.id)); try unique(users.map(\.id)); try unique(sprints.map(\.id))
        try unique(tasks.flatMap { $0.comments.map(\.id) })
        try unique(initiativeList.map(\.id)); try unique(milestoneList.map(\.id))
        let userIDs = Set(users.map(\.id)), epicIDs = Set(epics.map(\.id)), sprintIDs = Set(sprints.map(\.id))
        let initiativeIDs = Set(initiativeList.map(\.id)), milestoneIDs = Set(milestoneList.map(\.id))
        for milestone in milestoneList {
            try required(milestone.title, "Milestones must have a title.")
            try validateDate(milestone.targetDate)
            if let owner = milestone.ownerID, !userIDs.contains(owner) { throw TaskFileError.invalid("A milestone refers to a missing owner.") }
        }
        for initiative in initiativeList {
            try required(initiative.title, "Initiatives must have a title.")
            try dateRange(initiative.startDate, initiative.targetDate)
            if let owner = initiative.ownerID, !userIDs.contains(owner) { throw TaskFileError.invalid("An initiative refers to a missing owner.") }
            if let milestone = initiative.milestoneID, !milestoneIDs.contains(milestone) { throw TaskFileError.invalid("An initiative refers to a missing milestone.") }
        }
        let taskByID = Dictionary(uniqueKeysWithValues: tasks.map { ($0.id, $0) })
        for user in users { try required(user.name, "Users must have a name.") }
        for epic in epics {
            try required(epic.title, "Epics must have a title.")
            try dateRange(epic.startDate, epic.targetDate)
            if let initiative = epic.initiativeID, !initiativeIDs.contains(initiative) { throw TaskFileError.invalid("An epic refers to a missing initiative.") }
            if let milestone = epic.milestoneID, !milestoneIDs.contains(milestone) { throw TaskFileError.invalid("An epic refers to a missing milestone.") }
        }
        for sprint in sprints { try dateRange(sprint.startDate, sprint.endDate) }
        for event in events {
            try required(event.title, "Events must have a title.")
            try validateDate(event.date)
            guard event.date != nil || event.extensions?.unscheduled == true else { throw TaskFileError.invalid("Events require a date.") }
            if let epicID = event.epicID, !epicIDs.contains(epicID) { throw TaskFileError.invalid("An event extension refers to a missing epic.") }
        }
        var links: Set<String> = []
        for link in event_tasks {
            guard events.contains(where: { $0.id == link.event_id }), taskByID[link.task_id] != nil,
                  links.insert("\(link.event_id):\(link.task_id)").inserted else { throw TaskFileError.invalid("Invalid or duplicate event-task relation.") }
        }
        for task in tasks {
            try required(task.title, "Tasks must have a title.")
            if let assignee = task.assigneeID, !userIDs.contains(assignee) { throw TaskFileError.invalid("A task refers to a missing assignee.") }
            if let epic = task.epicID, !epicIDs.contains(epic) { throw TaskFileError.invalid("A task refers to a missing epic.") }
            if let milestone = task.milestoneID, !milestoneIDs.contains(milestone) { throw TaskFileError.invalid("A task refers to a missing milestone.") }
            if let sprint = task.sprintID, !sprintIDs.contains(sprint) { throw TaskFileError.invalid("A task extension refers to a missing sprint.") }
            guard let column = columns.first(where: { $0.id == task.columnID }), column.status == task.status else {
                throw TaskFileError.invalid("Task status does not match its board column.")
            }
            try validateDate(task.dueDate)
            for comment in task.comments {
                try required(comment.body, "Comments must contain text.")
                if let author = comment.authorID, !userIDs.contains(author) { throw TaskFileError.invalid("A comment refers to a missing user.") }
                let formatter = ISO8601DateFormatter()
                guard let date = formatter.date(from: comment.createdAt), formatter.string(from: date) == comment.createdAt else { throw TaskFileError.invalid("Comments need UTC YYYY-MM-DDTHH:mm:ssZ timestamps.") }
            }
            var seen: Set<Int> = [task.id]; var parentID = task.parentID
            while let parent = parentID {
                guard seen.insert(parent).inserted, let record = taskByID[parent] else { throw TaskFileError.invalid("Invalid task parent or cycle.") }
                parentID = record.parentID
            }
        }
    }
    public mutating func moveTask(_ id: Int, to columnID: Int) {
        guard let column = columns.first(where: { $0.id == columnID }), let index = tasks.firstIndex(where: { $0.id == id }) else { return }
        var task = tasks.remove(at: index); task.columnID = columnID; task.status = column.status; tasks.append(task)
        for index in tasks.indices { tasks[index].position = index }
    }
    public mutating func setColumnStatus(_ id: Int, status: TaskStatus) {
        guard let index = columns.firstIndex(where: { $0.id == id }) else { return }
        columns[index].status = status
        for index in tasks.indices where tasks[index].columnID == id { tasks[index].status = status }
    }
    public mutating func removeTask(_ id: Int) {
        // Mirrors Task.has_many :subtasks, dependent: :destroy.
        var removed: Set<Int> = [id]
        var count = 0
        while count != removed.count {
            count = removed.count
            for task in tasks where task.parentID.map({ removed.contains($0) }) == true { removed.insert(task.id) }
        }
        tasks.removeAll { removed.contains($0.id) }
        event_tasks.removeAll { removed.contains($0.task_id) }
    }
    public mutating func removeSprint(_ id: Int) {
        sprints.removeAll { $0.id == id }
        for index in tasks.indices where tasks[index].sprintID == id { tasks[index].sprintID = nil }
    }
    public mutating func removeEpic(_ id: Int) {
        epics.removeAll { $0.id == id }
        for index in tasks.indices where tasks[index].epicID == id { tasks[index].epicID = nil }
        for index in events.indices where events[index].epicID == id { events[index].epicID = nil }
    }
    public mutating func removeEvent(_ id: Int) {
        events.removeAll { $0.id == id }; event_tasks.removeAll { $0.event_id == id }
    }
    public var initiativeList: [InitiativeRecord] { initiatives ?? [] }
    public var milestoneList: [MilestoneRecord] { milestones ?? [] }
    public mutating func addInitiative(_ initiative: InitiativeRecord) { initiatives = initiativeList + [initiative] }
    public mutating func addMilestone(_ milestone: MilestoneRecord) { milestones = milestoneList + [milestone] }
    // Mirrors Rails `has_many :epics, dependent: :nullify` for both levels.
    public mutating func removeInitiative(_ id: Int) {
        initiatives = initiativeList.filter { $0.id != id }.nilIfEmpty
        for index in epics.indices where epics[index].initiativeID == id { epics[index].initiativeID = nil }
    }
    public mutating func removeMilestone(_ id: Int) {
        milestones = milestoneList.filter { $0.id != id }.nilIfEmpty
        if var list = initiatives { for index in list.indices where list[index].milestoneID == id { list[index].milestoneID = nil }; initiatives = list }
        for index in epics.indices where epics[index].milestoneID == id { epics[index].milestoneID = nil }
        for index in tasks.indices where tasks[index].milestoneID == id { tasks[index].milestoneID = nil }
    }
    /// A task's own milestone, else its epic's, else its epic's initiative's.
    public func effectiveMilestoneID(of task: TaskRecord) -> Int? {
        if let own = task.milestoneID { return own }
        guard let epic = epics.first(where: { $0.id == task.epicID }) else { return nil }
        if let milestone = epic.milestoneID { return milestone }
        return initiativeList.first { $0.id == epic.initiativeID }?.milestoneID
    }
    /// Tasks under a milestone (directly or by inheritance) and how many are done.
    public func progress(milestoneID: Int) -> (done: Int, total: Int) {
        let under = tasks.filter { effectiveMilestoneID(of: $0) == milestoneID }
        return (under.filter { $0.status == .done }.count, under.count)
    }
    /// Tasks under an initiative (through its epics) and how many are done.
    public func progress(initiativeID: Int) -> (done: Int, total: Int) {
        let epicIDs = Set(epics.filter { $0.initiativeID == initiativeID }.map(\.id))
        let under = tasks.filter { $0.epicID.map(epicIDs.contains) == true }
        return (under.filter { $0.status == .done }.count, under.count)
    }
    public func eventIDs(for taskID: Int) -> [Int] { event_tasks.filter { $0.task_id == taskID }.map(\.event_id) }
    public func taskIDs(for eventID: Int) -> [Int] { event_tasks.filter { $0.event_id == eventID }.map(\.task_id) }
    public mutating func setEvents(_ eventIDs: Set<Int>, for taskID: Int) {
        event_tasks.removeAll { $0.task_id == taskID }
        event_tasks += eventIDs.sorted().map { EventTaskRecord(event_id: $0, task_id: taskID) }
    }
    public mutating func removeUser(_ id: Int) {
        let name = users.first { $0.id == id }?.name
        users.removeAll { $0.id == id }
        if var list = initiatives { for index in list.indices where list[index].ownerID == id { list[index].ownerID = nil }; initiatives = list }
        if var list = milestones { for index in list.indices where list[index].ownerID == id { list[index].ownerID = nil }; milestones = list }
        for index in tasks.indices {
            if tasks[index].assigneeID == id { tasks[index].assigneeID = nil }
            for j in tasks[index].comments.indices where tasks[index].comments[j].authorID == id {
                if tasks[index].comments[j].authorName == nil { tasks[index].comments[j].authorName = name }
                tasks[index].comments[j].authorID = nil
            }
        }
    }
    public func completedCount(epicID: Int) -> Int { tasks.filter { $0.epicID == epicID && $0.status == .done }.count }
    public func completedCount(in sprintID: Int) -> Int { tasks.filter { $0.sprintID == sprintID && $0.status == .done }.count }
    private func unique(_ ids: [Int]) throws {
        guard ids.allSatisfy({ $0 > 0 && $0 <= 9_007_199_254_740_991 }), Set(ids).count == ids.count else { throw TaskFileError.invalid("Invalid or duplicate entity IDs.") }
    }
    private func required(_ text: String, _ message: String) throws {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw TaskFileError.invalid(message) }
    }
    private func dateRange(_ start: String?, _ end: String?) throws {
        try validateDate(start); try validateDate(end)
        if let start, let end, start > end { throw TaskFileError.invalid("End date must be on or after start date.") }
    }
    private func validateDate(_ value: String?) throws {
        guard let value else { return }
        let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian); formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"; formatter.isLenient = false
        guard value.count == 10, let parsed = formatter.date(from: value), formatter.string(from: parsed) == value else { throw TaskFileError.invalid("Use a valid YYYY-MM-DD calendar date.") }
    }
}
private extension Array {
    var nilIfEmpty: [Element]? { isEmpty ? nil : self }
}
public enum TaskFileError: LocalizedError {
    case invalid(String)
    public var errorDescription: String? { if case .invalid(let message) = self { return message }; return nil }
}
