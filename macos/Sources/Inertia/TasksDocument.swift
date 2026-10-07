import SwiftUI
import UniformTypeIdentifiers
import InertiaCore

extension UTType {
    static let inertiaTasks = UTType(exportedAs: TaskFile.formatIdentifier, conformingTo: .json)
}

struct TasksDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.inertiaTasks] }
    var board = TaskFile()
    init() {}
    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents else { throw TaskFileError.invalid("Expected a task file, not a folder.") }
        board = try TaskFile.read(data)
    }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: try board.data())
    }
}
