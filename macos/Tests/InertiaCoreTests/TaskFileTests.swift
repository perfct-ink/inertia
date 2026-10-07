import XCTest
@testable import InertiaCore

final class TaskFileTests: XCTestCase {
    private func fixture() -> TaskFile {
        var file = TaskFile(title: "Launch")
        var sprint = Sprint(title: "Sprint 1")
        sprint.startDate = "2026-10-01"; sprint.endDate = "2026-10-14"
        file.sprints = [sprint]
        var parent = FileTask(title: "Ship launch", columnID: file.columns[0].id, sprintID: sprint.id)
        parent.notes = "Requirements\nUnicode: café ✅"; parent.dueDate = "2026-10-14"
        var child = FileTask(title: "Build UI", columnID: file.columns[1].id)
        child.parentID = parent.id
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
        json["version"] = 2
        XCTAssertThrowsError(try TaskFile.read(JSONSerialization.data(withJSONObject: json)))
        json["version"] = 1; json["format"] = "some.other.tasks"
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
