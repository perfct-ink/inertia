import SwiftUI
import InertiaCore

@main struct InertiaApp: App {
    @NSApplicationDelegateAdaptor(LaunchDelegate.self) private var launchDelegate
    @StateObject private var session = Session()
    var body: some Scene {
        // Launch the workspace; task files are opened explicitly.
        Window("Online Workspace", id: "workspace") {
            RootView().environmentObject(session).frame(minWidth: 900, minHeight: 600)
                .textFieldStyle(InertiaTextFieldStyle())
                .appErrorAlert(error: $session.error)
        }
        .commands {
            CommandGroup(after: .newItem) {
                Button("Refresh Workspace") { Task { await session.refresh() } }.keyboardShortcut("r")
            }
        }
        DocumentGroup(newDocument: TasksDocument()) { file in
            TaskFileView(document: file.$document)
                .textFieldStyle(InertiaTextFieldStyle())
        }
    }
}
final class LaunchDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldOpenUntitledFile(_ sender: NSApplication) -> Bool { false }
    func applicationShouldRestoreSecureApplicationState(_ app: NSApplication) -> Bool { false }
}
