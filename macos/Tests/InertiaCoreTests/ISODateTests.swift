import XCTest
@testable import InertiaCore

final class ISODateTests: XCTestCase {
    func testAcceptsRealCalendarDates() {
        XCTAssertTrue(ISODate.isValid("2026-11-02"))
        XCTAssertTrue(ISODate.isValid("2028-02-29")) // leap day
    }

    func testRejectsEverythingElse() {
        XCTAssertFalse(ISODate.isValid(""))
        XCTAssertFalse(ISODate.isValid("2026-02-30"))
        XCTAssertFalse(ISODate.isValid("2027-02-29"))
        XCTAssertFalse(ISODate.isValid("2026-2-3"))
        XCTAssertFalse(ISODate.isValid("11/02/2026"))
        XCTAssertFalse(ISODate.isValid("2026-11-02 "))
        XCTAssertFalse(ISODate.isValid("2026-13-01"))
    }

    func testTaskFileValidationUsesTheSameRule() {
        var file = TaskFile()
        var sprint = Sprint(title: "S")
        file.sprints = [sprint]
        XCTAssertNoThrow(try file.validate())
        sprint.startDate = "2026-02-30"
        file.sprints = [sprint]
        XCTAssertThrowsError(try file.validate())
    }
}
