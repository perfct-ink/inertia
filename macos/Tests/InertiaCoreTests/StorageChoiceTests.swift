import XCTest
@testable import InertiaCore

final class StorageChoiceTests: XCTestCase {
    private final class MemoryStore: KeyValueStore {
        var values: [String: Any] = [:]
        func string(forKey key: String) -> String? { values[key] as? String }
        func set(_ value: Any?, forKey key: String) { values[key] = value }
        func removeObject(forKey key: String) { values[key] = nil }
    }

    private func makeHome() throws -> URL {
        let home = FileManager.default.temporaryDirectory.appendingPathComponent("inertia-home-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: home, withIntermediateDirectories: true)
        addTeardownBlock { try? FileManager.default.removeItem(at: home) }
        return home
    }

    func testTwoChoicesWithTitlesAndSummaries() {
        XCTAssertEqual(StorageChoice.allCases, [.cloud, .local])
        XCTAssertEqual(StorageChoice.cloud.title, "Cloud Storage")
        XCTAssertEqual(StorageChoice.local.title, "Local Storage")
        XCTAssertTrue(StorageChoice.cloud.summary.contains("inertia.it.com"))
        XCTAssertTrue(StorageChoice.local.summary.contains("iCloud Drive"))
    }

    func testNothingStoredMeansNoChoiceYet() {
        XCTAssertNil(StoragePreference(store: MemoryStore()).choice)
    }

    func testTheChoiceIsRemembered() {
        let store = MemoryStore()
        StoragePreference(store: store).choice = .local
        XCTAssertEqual(StoragePreference(store: store).choice, .local)
        StoragePreference(store: store).choice = .cloud
        XCTAssertEqual(StoragePreference(store: store).choice, .cloud)
    }

    func testClearingAsksAgain() {
        let store = MemoryStore()
        let preference = StoragePreference(store: store)
        preference.choice = .local
        preference.choice = nil
        XCTAssertNil(StoragePreference(store: store).choice)
    }

    func testAnUnknownStoredValueIsNoChoice() {
        let store = MemoryStore()
        store.set("dropbox", forKey: StoragePreference.key)
        XCTAssertNil(StoragePreference(store: store).choice)
    }

    func testTheFolderIsInsideICloudDrive() throws {
        let home = URL(fileURLWithPath: "/Users/pat")
        XCTAssertEqual(LocalStorage.folder(home: home).path, "/Users/pat/Library/Mobile Documents/com~apple~CloudDocs/Inertia")
    }

    func testPrepareCreatesTheFolderWhenICloudDriveIsThere() throws {
        let home = try makeHome()
        try FileManager.default.createDirectory(at: LocalStorage.iCloudDrive(home: home), withIntermediateDirectories: true)
        let folder = try LocalStorage.prepare(home: home)
        var isDirectory: ObjCBool = false
        XCTAssertTrue(FileManager.default.fileExists(atPath: folder.path, isDirectory: &isDirectory))
        XCTAssertTrue(isDirectory.boolValue)
        // Again is fine, and keeps what is inside.
        let note = folder.appendingPathComponent("note.txt")
        try Data("hi".utf8).write(to: note)
        XCTAssertNoThrow(try LocalStorage.prepare(home: home))
        XCTAssertTrue(FileManager.default.fileExists(atPath: note.path))
    }

    func testPrepareDoesNotInventICloudDrive() throws {
        let home = try makeHome()
        XCTAssertThrowsError(try LocalStorage.prepare(home: home)) { XCTAssertEqual($0 as? LocalStorage.Failure, .iCloudDriveUnavailable) }
        XCTAssertFalse(FileManager.default.fileExists(atPath: LocalStorage.iCloudDrive(home: home).path))
    }

    func testTheUnavailableMessageSaysWhatToDo() {
        XCTAssertTrue(LocalStorage.Failure.iCloudDriveUnavailable.errorDescription!.contains("System Settings"))
    }
}
