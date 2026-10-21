import SwiftUI
import InertiaCore

@main struct InertiaApp: App {
    @NSApplicationDelegateAdaptor(LaunchDelegate.self) private var launchDelegate
    @StateObject private var session = Session()
    var body: some Scene {
        // Launch the workspace; task files are opened explicitly.
        Window("Online Space", id: "workspace") {
            RootView().environmentObject(session).frame(minWidth: 900, minHeight: 600)
                .textFieldStyle(InertiaTextFieldStyle())
                .tint(Volta.accent)
                .appErrorAlert(error: $session.error)
        }
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandGroup(after: .newItem) {
                Button("Refresh Space") { NotificationCenter.default.post(name: .refreshWorkspace, object: nil) }.keyboardShortcut("r")
            }
        }
        DocumentGroup(newDocument: TasksDocument()) { file in
            TaskFileView(document: file.$document)
                .textFieldStyle(InertiaTextFieldStyle())
                .tint(Volta.accent)
        }
        .windowStyle(.hiddenTitleBar)
    }
}
final class LaunchDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldOpenUntitledFile(_ sender: NSApplication) -> Bool { false }
    func applicationShouldRestoreSecureApplicationState(_ app: NSApplication) -> Bool { false }
}

extension Notification.Name {
    static let refreshWorkspace = Notification.Name("InertiaRefreshWorkspace")
}
