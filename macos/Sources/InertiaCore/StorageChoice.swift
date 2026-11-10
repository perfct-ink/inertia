import Foundation

/// Where the Mac app keeps a person's Space: in the cloud, through the inertia.it.com API, or
/// locally, in a folder in iCloud Drive. Chosen once, on the first launch.
public enum StorageChoice: String, CaseIterable, Identifiable, Codable {
    case cloud, local
    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .cloud: return "Cloud Storage"
        case .local: return "Local Storage"
        }
    }
    public var summary: String {
        switch self {
        case .cloud: return "Sign in to your Inertia account. Your Space is stored on inertia.it.com and shared with your team and your other devices."
        case .local: return "Keep your files in a folder in iCloud Drive. No account needed, and your Mac and iCloud sync them."
        }
    }
    public var symbol: String {
        switch self {
        case .cloud: return "cloud"
        case .local: return "folder"
        }
    }
}

/// The iCloud Drive folder Local Storage uses.
public enum LocalStorage {
    public static let folderName = "Inertia"
    /// iCloud Drive's own folder inside the home directory; it exists only when iCloud Drive is on.
    static let iCloudDrivePath = "Library/Mobile Documents/com~apple~CloudDocs"

    public enum Failure: LocalizedError, Equatable {
        case iCloudDriveUnavailable
        case cannotCreate(String)
        public var errorDescription: String? {
            switch self {
            case .iCloudDriveUnavailable: return "iCloud Drive is not available on this Mac. Turn it on in System Settings > Apple Account > iCloud, then try again."
            case .cannotCreate(let reason): return "Inertia could not create its folder in iCloud Drive: \(reason)"
            }
        }
    }

    /// iCloud Drive's folder for a home directory.
    public static func iCloudDrive(home: URL) -> URL {
        home.appendingPathComponent(iCloudDrivePath, isDirectory: true)
    }
    /// The folder Local Storage keeps its files in.
    public static func folder(home: URL) -> URL {
        iCloudDrive(home: home).appendingPathComponent(folderName, isDirectory: true)
    }
    /// Makes sure the folder exists and returns it. Throws `iCloudDriveUnavailable` when iCloud
    /// Drive itself is not there: Inertia never invents it, since a plain folder in that place
    /// would not sync.
    @discardableResult
    public static func prepare(home: URL, fileManager: FileManager = .default) throws -> URL {
        var isDirectory: ObjCBool = false
        guard fileManager.fileExists(atPath: iCloudDrive(home: home).path, isDirectory: &isDirectory), isDirectory.boolValue else {
            throw Failure.iCloudDriveUnavailable
        }
        let folder = folder(home: home)
        do { try fileManager.createDirectory(at: folder, withIntermediateDirectories: true) }
        catch { throw Failure.cannotCreate(error.localizedDescription) }
        return folder
    }
}

/// The small slice of `UserDefaults` the storage choice needs, so tests can use a dictionary.
public protocol KeyValueStore: AnyObject {
    func string(forKey key: String) -> String?
    func set(_ value: Any?, forKey key: String)
    func removeObject(forKey key: String)
}
extension UserDefaults: KeyValueStore {}

/// The remembered choice. Nothing stored means the person has not chosen yet.
public struct StoragePreference {
    static let key = "inertia.storage"
    private let store: KeyValueStore
    public init(store: KeyValueStore = UserDefaults.standard) { self.store = store }

    public var choice: StorageChoice? {
        get { store.string(forKey: Self.key).flatMap(StorageChoice.init(rawValue:)) }
        nonmutating set {
            if let newValue { store.set(newValue.rawValue, forKey: Self.key) } else { store.removeObject(forKey: Self.key) }
        }
    }
}
