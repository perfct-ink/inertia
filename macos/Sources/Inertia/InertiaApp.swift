import SwiftUI
import InertiaCore

@main struct InertiaApp: App {
    @NSApplicationDelegateAdaptor(LaunchDelegate.self) private var launchDelegate
    @StateObject private var session = Session()
    var body: some Scene {
        // Launch the workspace; task files are opened explicitly.
        Window("Online Space", id: "workspace") {
            RootView().environmentObject(session).frame(minWidth: 900, minHeight: 600)
                .voltaTheme()
                .appErrorAlert(error: $session.error)
        }
        .windowStyle(.hiddenTitleBar)
        .commands {
            // The workspace's own shortcuts (Cmd+N, Cmd+Shift+N) live in the web app; a menu
            // item that owns the key equivalent is the only way WKWebView ever sees it.
            CommandGroup(replacing: .newItem) {
                Button("New Document") { NotificationCenter.default.post(name: .workspaceShortcut, object: "n") }.keyboardShortcut("n")
                Button("New Sheet") { NotificationCenter.default.post(name: .workspaceShortcut, object: "N") }.keyboardShortcut("n", modifiers: [.command, .shift])
                Button("New Task File") { NSDocumentController.shared.newDocument(nil) }.keyboardShortcut("n", modifiers: [.command, .option])
                Button("Refresh Space") { NotificationCenter.default.post(name: .refreshWorkspace, object: nil) }.keyboardShortcut("r")
            }
            // The document editor's formatting keys, listed so people can find them (Components/FormatMenu.swift).
            FormatCommands()
        }
        DocumentGroup(newDocument: TasksDocument()) { file in
            TaskFileView(document: file.$document)
                .voltaTheme()
        }
        .windowStyle(.hiddenTitleBar)
    }
}
final class LaunchDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldOpenUntitledFile(_ sender: NSApplication) -> Bool { false }
    func applicationShouldRestoreSecureApplicationState(_ app: NSApplication) -> Bool { false }
}

extension Notification.Name {
    static let workspaceShortcut = Notification.Name("InertiaWorkspaceShortcut")
    static let refreshWorkspace = Notification.Name("InertiaRefreshWorkspace")
    static let formatCommand = Notification.Name("InertiaFormatCommand")
}
