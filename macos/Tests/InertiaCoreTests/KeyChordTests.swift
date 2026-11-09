import XCTest
@testable import InertiaCore

final class KeyChordTests: XCTestCase {
    func testLetterWithCommandAndShift() throws {
        let chord = try XCTUnwrap(KeyChord("⌘⇧X"))
        XCTAssertEqual(chord.key, "x")
        XCTAssertTrue(chord.command)
        XCTAssertTrue(chord.shift)
        XCTAssertFalse(chord.option)
        XCTAssertFalse(chord.control)
    }
    func testDigitPunctuationAndOption() throws {
        XCTAssertEqual(KeyChord("⌘⌥3"), KeyChord("⌥⌘3"))
        XCTAssertEqual(try XCTUnwrap(KeyChord("⌘]")).key, "]")
        XCTAssertEqual(try XCTUnwrap(KeyChord("⌘\\")).key, "\\")
        XCTAssertTrue(try XCTUnwrap(KeyChord("⌥⌘T")).option)
    }
    func testArrowsWithControl() throws {
        let up = try XCTUnwrap(KeyChord("⌃⌘↑"))
        XCTAssertEqual(up.key, "up")
        XCTAssertTrue(up.control)
        XCTAssertTrue(up.command)
        XCTAssertEqual(try XCTUnwrap(KeyChord("⌃⌘↓")).key, "down")
    }
    func testNotAKeystroke() {
        XCTAssertNil(KeyChord(""))
        XCTAssertNil(KeyChord("⌘"))
        XCTAssertNil(KeyChord("⌘⇧XY"))
        XCTAssertNil(KeyChord("Ctrl+X"))
    }
}
