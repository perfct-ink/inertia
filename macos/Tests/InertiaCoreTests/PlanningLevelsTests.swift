import XCTest
@testable import InertiaCore

final class PlanningLevelsTests: XCTestCase {
    /// Milestone > Initiative > Epic > Task, plus a loose task straight under the milestone.
    private func fixture() -> TaskFile {
        var file = TaskFile(title: "Plan")
        var owner = UserRecord(name: "Ada"); owner.id = 1
        file.users = [owner]
        var milestone = MilestoneRecord(title: "Launch"); milestone.targetDate = "2026-12-01"; milestone.ownerID = owner.id
        var initiative = InitiativeRecord(title: "Onboarding"); initiative.milestoneID = milestone.id
        initiative.startDate = "2026-10-01"; initiative.targetDate = "2026-11-15"; initiative.horizon = .now
        var epic = EpicRecord(title: "Sign up"); epic.initiativeID = initiative.id
        var inherited = TaskRecord(title: "Build form", columnID: file.columns[4].id, status: .done)
        inherited.epicID = epic.id
        var open = TaskRecord(title: "Write copy", columnID: file.columns[1].id, status: .todo)
        open.epicID = epic.id
        var loose = TaskRecord(title: "Book venue", columnID: file.columns[1].id, status: .todo)
        loose.milestoneID = milestone.id
        file.addMilestone(milestone); file.addInitiative(initiative)
        file.epics = [epic]; file.tasks = [inherited, open, loose]
        return file
    }
    func testRoundTripKeepsInitiativesAndMilestones() throws {
        let original = fixture()
        let data = try original.data()
        let read = try TaskFile.read(data)
        XCTAssertEqual(read, original)
        XCTAssertEqual(read.initiativeList.first?.horizon, .now)
        XCTAssertEqual(read.milestoneList.first?.state, .planned)
    }
    func testFilesWithoutPlanningOmitTheNewFields() throws {
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: TaskFile(title: "Plain").data()) as? [String: Any])
        XCTAssertNil(json["initiatives"]); XCTAssertNil(json["milestones"])
        var empty = TaskFile(title: "Plain")
        empty.initiatives = []; empty.milestones = []
        let data = try empty.data()
        XCTAssertNil((try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any]))["initiatives"])
        XCTAssertNil(try TaskFile.read(data).initiatives)
    }
    func testTasksInheritTheirMilestoneThroughEpicAndInitiative() {
        let file = fixture()
        let milestoneID = file.milestoneList[0].id
        XCTAssertEqual(file.tasks.map { file.effectiveMilestoneID(of: $0) }, [milestoneID, milestoneID, milestoneID])
        let progress = file.progress(milestoneID: milestoneID)
        XCTAssertEqual(progress.total, 3); XCTAssertEqual(progress.done, 1)
        let initiativeProgress = file.progress(initiativeID: file.initiativeList[0].id)
        XCTAssertEqual(initiativeProgress.total, 2); XCTAssertEqual(initiativeProgress.done, 1)
    }
    func testAnEpicsOwnMilestoneWinsOverItsInitiatives() {
        var file = fixture()
        let other = MilestoneRecord(title: "Beta")
        file.addMilestone(other)
        file.epics[0].milestoneID = other.id
        XCTAssertEqual(file.effectiveMilestoneID(of: file.tasks[0]), other.id)
    }
    func testRemovingLevelsClearsReferencesLikeRails() throws {
        var file = fixture()
        file.removeInitiative(file.initiativeList[0].id)
        XCTAssertNil(file.initiatives); XCTAssertNil(file.epics[0].initiativeID)
        XCTAssertEqual(file.effectiveMilestoneID(of: file.tasks[0]), nil)
        file.removeMilestone(file.milestoneList[0].id)
        XCTAssertNil(file.milestones); XCTAssertNil(file.tasks[2].milestoneID)
        try file.validate()
    }
    func testRemovingAUserClearsOwners() {
        var file = fixture()
        file.removeUser(1)
        XCTAssertNil(file.milestoneList[0].ownerID)
    }
    func testRejectsMissingReferencesAndBadDates() {
        var file = fixture(); file.epics[0].initiativeID = 99
        XCTAssertThrowsError(try file.validate())
        file = fixture(); file.epics[0].milestoneID = 99
        XCTAssertThrowsError(try file.validate())
        file = fixture(); file.tasks[0].milestoneID = 99
        XCTAssertThrowsError(try file.validate())
        file = fixture(); file.initiatives![0].milestoneID = 99
        XCTAssertThrowsError(try file.validate())
        file = fixture(); file.initiatives![0].targetDate = "2026-09-01"
        XCTAssertThrowsError(try file.validate())
        file = fixture(); file.milestones![0].targetDate = "2026-13-40"
        XCTAssertThrowsError(try file.validate())
        file = fixture(); file.milestones![0].ownerID = 42
        XCTAssertThrowsError(try file.validate())
        file = fixture(); file.milestones![0].title = " "
        XCTAssertThrowsError(try file.validate())
        file = fixture(); file.milestones!.append(file.milestones![0])
        XCTAssertThrowsError(try file.validate())
    }
    func testUnknownPlanningFieldsAreRejectedNotDiscarded() throws {
        var json = try XCTUnwrap(JSONSerialization.jsonObject(with: fixture().data()) as? [String: Any])
        var initiatives = try XCTUnwrap(json["initiatives"] as? [[String: Any]])
        initiatives[0]["futureField"] = true; json["initiatives"] = initiatives
        XCTAssertThrowsError(try TaskFile.read(JSONSerialization.data(withJSONObject: json)))
    }
}
