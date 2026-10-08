import Foundation

/// Converts v1–3 into the API entity contract. UUID references are remapped
/// together to file-scoped integer IDs. No backend records are created.
enum LegacyTaskFile {
    static func upgrade(_ old: [String: Any], version: Int) throws -> [String: Any] {
        var rootFields: Set<String> = ["format", "version", "id", "title", "columns", "tasks", "sprints"]
        if version >= 2 { rootFields.formUnion(["epics", "milestones"]) }
        if version >= 3 { rootFields.insert("users") }
        try TaskFileSchema.keys(old, rootFields)
        func records(_ key: String, required: Bool = true) throws -> [[String: Any]] {
            if !required && (old[key] == nil || old[key] is NSNull) { return [] }
            guard let rows = old[key] as? [[String: Any]] else { throw TaskFileError.invalid("Invalid legacy \(key) collection.") }
            return rows
        }
        let columns = try records("columns"), tasks = try records("tasks"), sprints = try records("sprints")
        let epics = try records("epics", required: version >= 2), events = try records("milestones", required: version >= 2)
        let users = try records("users", required: false)
        func ids(_ rows: [[String: Any]]) throws -> [String: Int] {
            var result: [String: Int] = [:]
            for (index, row) in rows.enumerated() {
                guard let raw = row["id"] as? String, let id = UUID(uuidString: raw)?.uuidString, result[id] == nil else { throw TaskFileError.invalid("Invalid or duplicate legacy IDs.") }
                result[id] = index + 1
            }
            return result
        }
        let columnIDs = try ids(columns), taskIDs = try ids(tasks), sprintIDs = try ids(sprints)
        let epicIDs = try ids(epics), eventIDs = try ids(events), userIDs = try ids(users)
        func ref(_ value: Any?, _ mapping: [String: Int], required: Bool = false) throws -> Any {
            if value == nil || value is NSNull {
                if required { throw TaskFileError.invalid("Missing legacy entity reference.") }
                return NSNull()
            }
            guard let raw = value as? String, let uuid = UUID(uuidString: raw)?.uuidString, let id = mapping[uuid] else { throw TaskFileError.invalid("A legacy reference points to a missing entity.") }
            return id
        }
        var statuses: [Int: String] = [:]
        let newColumns: [[String: Any]] = try columns.map { column in
            try TaskFileSchema.keys(column, ["id", "title", "isCompleted"])
            let id = try ref(column["id"], columnIDs, required: true) as! Int
            guard let title = column["title"] as? String, let completed = column["isCompleted"] as? Bool else { throw TaskFileError.invalid("Invalid legacy column.") }
            let normalized = title.lowercased().replacingOccurrences(of: " ", with: "_")
            let status = completed ? "done" : (["backlog", "todo", "in_progress", "in_review"].contains(normalized) ? normalized : "todo")
            statuses[id] = status
            return ["id": id, "title": title, "status": status]
        }
        var newLinks: [[String: Any]] = []
        var commentIDs: Set<UUID> = []
        var nextCommentID = 0
        let newTasks: [[String: Any]] = try tasks.enumerated().map { index, task in
            var allowed: Set<String> = ["id", "title", "columnID", "sprintID", "parentID", "dueDate"]
            allowed.insert(version < 3 ? "notes" : "description")
            if version >= 2 { allowed.formUnion(["epicID", "milestoneID"]) }
            if version >= 3 { allowed.formUnion(["assigneeID", "comments"]) }
            try TaskFileSchema.keys(task, allowed)
            let id = try ref(task["id"], taskIDs, required: true)
            let column = try ref(task["columnID"], columnIDs, required: true) as! Int
            guard let description = task[version < 3 ? "notes" : "description"] as? String else { throw TaskFileError.invalid("Missing legacy task description.") }
            if let event = try ref(task["milestoneID"], eventIDs) as? Int { newLinks.append(["event_id": event, "task_id": id]) }
            let comments: [[String: Any]]
            if task["comments"] == nil || task["comments"] is NSNull { comments = [] }
            else if let values = task["comments"] as? [[String: Any]] { comments = values }
            else { throw TaskFileError.invalid("Invalid legacy comments.") }
            let migratedComments: [[String: Any]] = try comments.map { comment in
                try TaskFileSchema.keys(comment, ["id", "body", "authorID", "authorName", "createdAt"])
                guard let raw = comment["id"] as? String, let uuid = UUID(uuidString: raw), commentIDs.insert(uuid).inserted else { throw TaskFileError.invalid("Invalid legacy comment ID.") }
                nextCommentID += 1
                return ["id": nextCommentID, "body": comment["body"] ?? NSNull(), "author_id": try ref(comment["authorID"], userIDs), "author_name": comment["authorName"] ?? NSNull(), "created_at": comment["createdAt"] ?? NSNull()]
            }
            return ["id": id, "title": task["title"] ?? NSNull(), "description": description, "status": statuses[column]!, "position": index,
                    "due_date": task["dueDate"] ?? NSNull(), "parent_id": try ref(task["parentID"], taskIDs), "epic_id": try ref(task["epicID"], epicIDs), "assignee_id": try ref(task["assigneeID"], userIDs),
                    "extensions": ["column_id": column, "sprint_id": try ref(task["sprintID"], sprintIDs), "comments": migratedComments]]
        }
        let newEpics: [[String: Any]] = try epics.map { epic in
            try TaskFileSchema.keys(epic, ["id", "title", "notes", "startDate", "targetDate"])
            return ["id": try ref(epic["id"], epicIDs, required: true), "title": epic["title"] ?? NSNull(), "start_date": epic["startDate"] ?? NSNull(), "target_date": epic["targetDate"] ?? NSNull(), "extensions": ["notes": epic["notes"] ?? NSNull()]]
        }
        let newEvents: [[String: Any]] = try events.map { event in
            try TaskFileSchema.keys(event, ["id", "title", "notes", "targetDate", "epicID", "completed"])
            return ["id": try ref(event["id"], eventIDs, required: true), "title": event["title"] ?? NSNull(), "description": event["notes"] ?? NSNull(), "event_type": "milestone", "date": event["targetDate"] ?? NSNull(),
                    "extensions": ["epic_id": try ref(event["epicID"], epicIDs), "completed": event["completed"] ?? NSNull(), "unscheduled": event["targetDate"] == nil || event["targetDate"] is NSNull]]
        }
        let newUsers: [[String: Any]] = try users.map { user in
            try TaskFileSchema.keys(user, ["id", "name", "email"])
            return ["id": try ref(user["id"], userIDs, required: true), "name": user["name"] ?? NSNull(), "email": user["email"] ?? NSNull()]
        }
        let newSprints: [[String: Any]] = try sprints.map { sprint in
            try TaskFileSchema.keys(sprint, ["id", "title", "goal", "startDate", "endDate"])
            return ["id": try ref(sprint["id"], sprintIDs, required: true), "title": sprint["title"] ?? NSNull(), "goal": sprint["goal"] ?? NSNull(), "start_date": sprint["startDate"] ?? NSNull(), "end_date": sprint["endDate"] ?? NSNull()]
        }
        return ["format": TaskFile.formatIdentifier, "version": 4, "id": old["id"] ?? NSNull(), "title": old["title"] ?? NSNull(), "board": ["columns": newColumns], "tasks": newTasks, "epics": newEpics, "events": newEvents, "event_tasks": newLinks, "users": newUsers, "extensions": ["sprints": newSprints]]
    }
}
