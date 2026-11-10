import SwiftUI
import InertiaCore

/// What Local Storage shows for now: where the folder is, how to open it, and the way back to the
/// two cards. Documents, spreadsheets and tasks do not use the folder yet (see
/// docs/backlog/local-storage-in-icloud.md); the existing task files (File > New Task File) open
/// as before and can be saved in it.
struct LocalStorageView: View {
    @EnvironmentObject private var session: Session

    var body: some View {
        VStack(spacing: VoltaMetrics.space(4)) {
            AppLogo()
            Text("Local Storage").voltaFont(.twoXL, weight: .semibold).foregroundStyle(Volta.foreground)
            if let folder = session.localFolder {
                Text("Your files are kept in iCloud Drive, in the folder").voltaMuted()
                Text(folder.path).voltaFont(.sm, weight: .medium).foregroundStyle(Volta.foreground)
                    .textSelection(.enabled).multilineTextAlignment(.center)
                Button("Show in Finder") { NSWorkspace.shared.activateFileViewerSelecting([folder]) }
                    .buttonStyle(.volta(.secondary))
            }
            Text("Documents, spreadsheets and tasks do not use this folder yet. Task files (File > New Task File) work now, and you can save them here.")
                .voltaMuted().multilineTextAlignment(.center).frame(maxWidth: 420)
            Button("Change storage") { session.changeStorage() }.buttonStyle(.voltaLink)
        }
        .padding(VoltaMetrics.space(8))
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .voltaWindow()
    }
}
