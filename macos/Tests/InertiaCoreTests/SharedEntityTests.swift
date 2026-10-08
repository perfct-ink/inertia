import XCTest
@testable import InertiaCore

final class SharedEntityTests: XCTestCase {
    func testAPIEntitiesUseSameRecordsAndSnakeCaseFields() throws {
        let task = try JSONDecoder().decode(WorkTask.self, from: Data("""
        {"id":17,"title":"Requirement","description":"Build it","status":"in_review","due_date":"2026-10-20","parent_id":null,"position":2}
        """.utf8))
        var file = TaskFile()
        file.tasks = [task]
        let event = try JSONDecoder().decode(Event.self, from: Data("""
        {"id":8,"title":"Release","event_type":"milestone","date":"2026-10-20","tasks":[{"id":17,"title":"Requirement","description":"Build it","status":"in_review","due_date":"2026-10-20","position":2}]}
        """.utf8))
        file.events = [event]
        let reopened = try TaskFile.read(file.data())
        XCTAssertEqual(reopened.tasks.count, 1)
        XCTAssertEqual(reopened.tasks[0].id, 17)
        XCTAssertEqual(reopened.tasks[0].status, .in_review)
        XCTAssertEqual(reopened.event_tasks, [EventTaskRecord(event_id: 8, task_id: 17)])
        let root = try JSONSerialization.jsonObject(with: reopened.data()) as! [String: Any]
        let stored = (root["tasks"] as! [[String: Any]])[0]
        XCTAssertEqual(stored["due_date"] as? String, "2026-10-20")
        XCTAssertNil(stored["dueDate"])
        XCTAssertNil(root["milestones"])
    }
    func testManyToManyEventsAndDeletion() throws {
        var file = TaskFile()
        file.tasks = [TaskRecord(title: "One", columnID: 1), TaskRecord(title: "Two", columnID: 1)]
        file.events = [EventRecord(title: "Deadline"), EventRecord(title: "Milestone")]
        file.events[0].event_type = .deadline
        file.setEvents(Set(file.events.map(\.id)), for: file.tasks[0].id)
        file.setEvents([file.events[0].id], for: file.tasks[1].id)
        XCTAssertEqual(file.taskIDs(for: file.events[0].id).count, 2)
        XCTAssertEqual(try TaskFile.read(file.data()), file)
        file.removeEvent(file.events[0].id)
        XCTAssertEqual(file.tasks.count, 2)
        XCTAssertEqual(file.event_tasks.count, 1)
        file.removeTask(file.tasks[0].id)
        XCTAssertTrue(file.event_tasks.isEmpty)
    }
    func testColumnChangesUpdateStatusAndProgress() throws {
        var file = TaskFile()
        file.tasks = [TaskRecord(columnID: 1)]
        file.setColumnStatus(1, status: .done)
        XCTAssertEqual(file.tasks[0].status, .done)
        XCTAssertEqual(try TaskFile.read(file.data()), file)
        file.tasks[0].status = .todo
        XCTAssertThrowsError(try file.data())
    }
    func testRejectsCredentialsInUserRecords() throws {
        var file = TaskFile()
        file.users = [UserRecord(name: "Alex")]
        var root = try JSONSerialization.jsonObject(with: file.data()) as! [String: Any]
        var users = root["users"] as! [[String: Any]]
        users[0]["encrypted_password"] = "not-a-real-password"
        root["users"] = users
        XCTAssertThrowsError(try TaskFile.read(JSONSerialization.data(withJSONObject: root)))
    }
    func testStatusesMatchRailsEnums() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        for (file, values) in [("task", TaskStatus.allCases.map(\.rawValue)), ("event", EventType.allCases.map(\.rawValue))] {
            let source = try String(contentsOf: root.appendingPathComponent("backend/app/models/\(file).rb"))
            let enumLine = try XCTUnwrap(source.components(separatedBy: "\n").first { $0.contains("enum :") })
            let regex = try NSRegularExpression(pattern: #"([a-z_]+):\s*[0-9]+"#)
            let names = regex.matches(in: enumLine, range: NSRange(enumLine.startIndex..., in: enumLine)).map {
                String(enumLine[Range($0.range(at: 1), in: enumLine)!])
            }
            XCTAssertEqual(Set(names), Set(values))
        }
    }
}
