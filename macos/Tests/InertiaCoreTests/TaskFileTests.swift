import XCTest
@testable import InertiaCore

final class TaskFileTests: XCTestCase {
    private func fixture() -> TaskFile {
        var file = TaskFile(title: "Launch")
        var sprint = Sprint(title: "Sprint 1")
        sprint.startDate = "2026-10-01"; sprint.endDate = "2026-10-14"
        file.sprints = [sprint]
        var epic = FileEpic(title: "Launch Experience")
        epic.startDate = "2026-10-01"; epic.targetDate = "2026-10-20"; epic.notes = "Release requirements"
        file.epics = [epic]
        var milestone = FileMilestone(title: "Release review")
        milestone.targetDate = "2026-10-14"; milestone.epicID = epic.id
        file.milestones = [milestone]
        var parent = FileTask(title: "Ship launch", columnID: file.columns[0].id, sprintID: sprint.id)
        parent.description = "Requirements\nUnicode: café ✅"; parent.dueDate = "2026-10-14"
        var child = FileTask(title: "Build UI", columnID: file.columns[1].id)
        child.parentID = parent.id
        parent.epicID = epic.id; parent.milestoneID = milestone.id
        child.epicID = epic.id
        file.tasks = [parent, child]
        return file
    }
    func testRoundTripPreservesBoardSprintHierarchyAndOrder() throws {
        let original = fixture()
        let data = try original.data()
        XCTAssertEqual(try TaskFile.read(data), original)
        XCTAssertEqual(try TaskFile.read(data).data(), data)
    }
    func testNewFileWithoutSprintsIsValid() throws {
        let file = TaskFile()
        XCTAssertEqual(try TaskFile.read(file.data()), file)
        XCTAssertEqual(file.columns.count, 4)
    }
    func testMoveUpdatesOneTaskAndSprintProgress() throws {
        var file = fixture()
        let id = file.tasks[0].id, sprint = file.sprints[0].id
        file.moveTask(id, to: file.columns.last!.id)
        XCTAssertEqual(file.tasks.last?.id, id)
        XCTAssertEqual(file.completedCount(in: sprint), 1)
        XCTAssertEqual(file.tasks.last?.sprintID, sprint)
        XCTAssertEqual(file.tasks.first?.parentID, id)
        try file.validate()
    }
    func testInvalidDropDoesNotChangeFile() {
        var file = fixture(); let before = file
        file.moveTask(UUID(), to: file.columns[0].id)
        file.moveTask(file.tasks[0].id, to: UUID())
        XCTAssertEqual(file, before)
    }
    func testRemovingSprintKeepsTasksAndUnassignsThem() throws {
        var file = fixture()
        let tasks = file.tasks.map(\.id)
        file.removeSprint(file.sprints[0].id)
        XCTAssertEqual(file.tasks.map(\.id), tasks)
        XCTAssertTrue(file.tasks.allSatisfy { $0.sprintID == nil })
        try file.validate()
    }
    func testRemovingParentKeepsChildAsRoot() throws {
        var file = fixture()
        file.removeTask(file.tasks[0].id)
        XCTAssertEqual(file.tasks.count, 1)
        XCTAssertNil(file.tasks[0].parentID)
        try file.validate()
    }
    func testRejectsForeignFutureAndUnknownFields() throws {
        let file = fixture()
        var json = try XCTUnwrap(JSONSerialization.jsonObject(with: file.data()) as? [String: Any])
        json["version"] = 4
        XCTAssertThrowsError(try TaskFile.read(JSONSerialization.data(withJSONObject: json)))
        json["version"] = 3; json["format"] = "some.other.tasks"
        XCTAssertThrowsError(try TaskFile.read(JSONSerialization.data(withJSONObject: json)))
        json["format"] = TaskFile.formatIdentifier; json["futureField"] = true
        XCTAssertThrowsError(try TaskFile.read(JSONSerialization.data(withJSONObject: json)))
        json.removeValue(forKey: "futureField")
        var tasks = try XCTUnwrap(json["tasks"] as? [[String: Any]])
        tasks[0]["futureTaskField"] = true; json["tasks"] = tasks
        XCTAssertThrowsError(try TaskFile.read(JSONSerialization.data(withJSONObject: json)))
        XCTAssertThrowsError(try TaskFile.read(Data("not json".utf8)))
    }
    func testRejectsDanglingReferencesAndEmptyColumns() throws {
        var file = fixture(); file.tasks[0].columnID = UUID()
        XCTAssertThrowsError(try file.data())
        file = fixture(); file.tasks[0].sprintID = UUID()
        XCTAssertThrowsError(try file.data())
        file = fixture(); file.tasks[0].parentID = UUID()
        XCTAssertThrowsError(try file.data())
        file = TaskFile(); file.columns = []
        XCTAssertThrowsError(try file.data())
    }
    func testRejectsCyclesAndDuplicateIDs() throws {
        var file = fixture(); file.tasks[0].parentID = file.tasks[1].id
        XCTAssertThrowsError(try file.data())
        file = fixture(); file.tasks.append(file.tasks[0])
        XCTAssertThrowsError(try file.data())
        file = fixture(); file.columns.append(file.columns[0])
        XCTAssertThrowsError(try file.data())
        file = fixture(); file.sprints.append(file.sprints[0])
        XCTAssertThrowsError(try file.data())
    }
    func testValidatesCalendarDatesAndSprintRange() throws {
        var file = fixture(); file.tasks[0].dueDate = "2026-02-30"
        XCTAssertThrowsError(try file.data())
        file.tasks[0].dueDate = "2028-02-29"
        XCTAssertNoThrow(try file.data())
        file.sprints[0].endDate = "2026-09-01"
        XCTAssertThrowsError(try file.data())
        file.sprints[0].endDate = "10/15/2026"
        XCTAssertThrowsError(try file.data())
    }
    func testBundledExampleOpens() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let file = try TaskFile.read(Data(contentsOf: root.appendingPathComponent("examples/Launch.inertia-tasks")))
        XCTAssertEqual(file.tasks.count, 3)
        XCTAssertEqual(file.completedCount(in: file.sprints[0].id), 1)
    }
    func testV1MigrationPreservesTasksAndReferences() throws {
        var original = fixture()
        original.removeEpic(original.epics[0].id)
        original.removeMilestone(original.milestones[0].id)
        var json = try XCTUnwrap(JSONSerialization.jsonObject(with: original.data()) as? [String: Any])
        json["version"] = 1
        json.removeValue(forKey: "users")
        var oldTasks = try XCTUnwrap(json["tasks"] as? [[String: Any]])
        for index in oldTasks.indices {
            oldTasks[index]["notes"] = oldTasks[index].removeValue(forKey: "description")
            oldTasks[index].removeValue(forKey: "comments")
        }
        json["tasks"] = oldTasks
        json.removeValue(forKey: "epics"); json.removeValue(forKey: "milestones")
        let upgraded = try TaskFile.read(JSONSerialization.data(withJSONObject: json))
        XCTAssertEqual(upgraded, original)
        XCTAssertEqual(upgraded.version, 3)
        XCTAssertEqual(try TaskFile.read(upgraded.data()), upgraded)
        json["epics"] = [] // These fields were not part of v1: must not discard them.
        XCTAssertThrowsError(try TaskFile.read(JSONSerialization.data(withJSONObject: json)))
    }
    func testEpicProgressAndMilestoneCompletionAreIndependent() throws {
        var file = fixture()
        let epic = file.epics[0].id
        XCTAssertEqual(file.completedCount(epicID: epic), 0)
        file.moveTask(file.tasks[0].id, to: file.columns.last!.id)
        XCTAssertEqual(file.completedCount(epicID: epic), 1)
        XCTAssertFalse(file.milestones[0].completed)
        file.milestones[0].completed = true
        XCTAssertTrue(try TaskFile.read(file.data()).milestones[0].completed)
        XCTAssertEqual(file.completedCount(epicID: epic), 1)
    }
    func testRemovingEpicAndMilestoneRetainsOtherData() throws {
        var file = fixture()
        let tasks = file.tasks.map(\.id)
        let milestone = file.milestones[0].id
        file.removeEpic(file.epics[0].id)
        XCTAssertEqual(file.tasks.map(\.id), tasks)
        XCTAssertTrue(file.tasks.allSatisfy { $0.epicID == nil })
        XCTAssertNil(file.milestones[0].epicID)
        XCTAssertEqual(file.tasks[0].milestoneID, milestone)
        file.removeMilestone(milestone)
        XCTAssertNil(file.tasks[0].milestoneID)
        XCTAssertEqual(file.tasks.map(\.id), tasks)
        XCTAssertEqual(file.sprints.count, 1)
        try file.validate()
    }
    func testRejectsMissingEpicMilestoneAndDuplicateIDs() throws {
        var file = fixture(); file.tasks[0].epicID = UUID()
        XCTAssertThrowsError(try file.data())
        file = fixture(); file.tasks[0].milestoneID = UUID()
        XCTAssertThrowsError(try file.data())
        file = fixture(); file.milestones[0].epicID = UUID()
        XCTAssertThrowsError(try file.data())
        file = fixture(); file.epics.append(file.epics[0])
        XCTAssertThrowsError(try file.data())
        file = fixture(); file.milestones.append(file.milestones[0])
        XCTAssertThrowsError(try file.data())
    }
    func testValidatesEpicAndMilestoneDates() throws {
        var file = fixture(); file.epics[0].targetDate = "2026-09-30"
        XCTAssertThrowsError(try file.data())
        file = fixture(); file.epics[0].startDate = "2026-02-30"
        XCTAssertThrowsError(try file.data())
        file = fixture(); file.milestones[0].targetDate = "2026-13-01"
        XCTAssertThrowsError(try file.data())
    }
    func testUsersDescriptionsAndCommentsRoundTrip() throws {
        var file = fixture()
        let user = FileUser(name: "Alex", email: "alex@example.test")
        file.users = [user]
        file.tasks[0].assigneeID = user.id
        file.tasks[0].comments = [TaskComment(body: "Ready for review\n✅", author: user, date: Date(timeIntervalSince1970: 0)), TaskComment(body: "Anonymous note")]
        let reopened = try TaskFile.read(file.data())
        XCTAssertEqual(reopened, file)
        XCTAssertEqual(reopened.tasks[0].comments[0].createdAt, "1970-01-01T00:00:00Z")
        XCTAssertEqual(reopened.tasks[0].description, "Requirements\nUnicode: café ✅")
    }
    func testUsersAndCommentsMayBeOmittedOrNull() throws {
        let file = fixture()
        var json = try XCTUnwrap(JSONSerialization.jsonObject(with: file.data()) as? [String: Any])
        json.removeValue(forKey: "users")
        var tasks = try XCTUnwrap(json["tasks"] as? [[String: Any]])
        for index in tasks.indices { tasks[index].removeValue(forKey: "comments") }
        json["tasks"] = tasks
        XCTAssertEqual(try TaskFile.read(JSONSerialization.data(withJSONObject: json)), file)
        json["users"] = NSNull()
        for index in tasks.indices { tasks[index]["comments"] = NSNull() }
        json["tasks"] = tasks
        XCTAssertEqual(try TaskFile.read(JSONSerialization.data(withJSONObject: json)), file)
    }
    func testRemovingUserKeepsCommentsAndAttribution() throws {
        var file = fixture()
        let user = FileUser(name: "Alex")
        file.users = [user]; file.tasks[0].assigneeID = user.id
        var comment = TaskComment(body: "Do not lose this", author: user)
        comment.authorName = nil // External writer did not include the optional snapshot.
        file.tasks[0].comments = [comment]
        file.removeUser(user.id)
        XCTAssertNil(file.tasks[0].assigneeID)
        XCTAssertNil(file.tasks[0].comments[0].authorID)
        XCTAssertEqual(file.tasks[0].comments[0].authorName, "Alex")
        XCTAssertEqual(file.tasks[0].comments[0].body, comment.body)
        XCTAssertEqual(file.tasks[0].comments[0].createdAt, comment.createdAt)
        XCTAssertEqual(try TaskFile.read(file.data()), file)
    }
    func testRejectsInvalidUserAndCommentReferences() throws {
        var file = fixture(); file.tasks[0].assigneeID = UUID()
        XCTAssertThrowsError(try file.data())
        file = fixture()
        var comment = TaskComment(body: "Hello"); comment.authorID = UUID()
        file.tasks[0].comments = [comment]
        XCTAssertThrowsError(try file.data())
        file = fixture(); let user = FileUser(name: "Alex"); file.users = [user, user]
        XCTAssertThrowsError(try file.data())
        file = fixture(); let duplicate = TaskComment(body: "Hello")
        file.tasks[0].comments = [duplicate]; file.tasks[1].comments = [duplicate]
        XCTAssertThrowsError(try file.data())
    }
    func testRejectsEmptyTextAndInvalidCommentTimestamps() throws {
        var file = fixture(); file.tasks[0].title = " \n"
        XCTAssertThrowsError(try file.data())
        file = fixture(); file.users = [FileUser(name: " ")]
        XCTAssertThrowsError(try file.data())
        file = fixture(); file.tasks[0].comments = [TaskComment(body: "  ")]
        XCTAssertThrowsError(try file.data())
        file.tasks[0].comments = [TaskComment(body: "Valid")]
        file.tasks[0].comments[0].createdAt = "yesterday"
        XCTAssertThrowsError(try file.data())
    }
    func testUnknownUserAndCommentFieldsAreNotDiscarded() throws {
        var file = fixture(); file.users = [FileUser(name: "Alex")]
        file.tasks[0].comments = [TaskComment(body: "Hello")]
        var json = try XCTUnwrap(JSONSerialization.jsonObject(with: file.data()) as? [String: Any])
        var users = try XCTUnwrap(json["users"] as? [[String: Any]])
        users[0]["futureField"] = true; json["users"] = users
        XCTAssertThrowsError(try TaskFile.read(JSONSerialization.data(withJSONObject: json)))
        users[0].removeValue(forKey: "futureField"); json["users"] = users
        var tasks = try XCTUnwrap(json["tasks"] as? [[String: Any]])
        var comments = try XCTUnwrap(tasks[0]["comments"] as? [[String: Any]])
        comments[0]["futureField"] = true; tasks[0]["comments"] = comments; json["tasks"] = tasks
        XCTAssertThrowsError(try TaskFile.read(JSONSerialization.data(withJSONObject: json)))
    }
    func testV2NotesMigrateExactlyToDescriptions() throws {
        let file = fixture()
        var json = try XCTUnwrap(JSONSerialization.jsonObject(with: file.data()) as? [String: Any])
        json["version"] = 2; json.removeValue(forKey: "users")
        var tasks = try XCTUnwrap(json["tasks"] as? [[String: Any]])
        for index in tasks.indices {
            tasks[index]["notes"] = tasks[index].removeValue(forKey: "description")
            tasks[index].removeValue(forKey: "comments")
        }
        json["tasks"] = tasks
        XCTAssertEqual(try TaskFile.read(JSONSerialization.data(withJSONObject: json)), file)
        tasks[0]["description"] = "Conflicting content"; json["tasks"] = tasks
        XCTAssertThrowsError(try TaskFile.read(JSONSerialization.data(withJSONObject: json)))
    }
    func testDiskSaveReopen() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("\(UUID()).inertia-tasks")
        defer { try? FileManager.default.removeItem(at: url) }
        var file = fixture()
        try file.data().write(to: url, options: .atomic)
        file = try TaskFile.read(Data(contentsOf: url))
        file.moveTask(file.tasks[0].id, to: file.columns.last!.id)
        try file.data().write(to: url, options: .atomic)
        XCTAssertEqual(try TaskFile.read(Data(contentsOf: url)), file)
    }
}
