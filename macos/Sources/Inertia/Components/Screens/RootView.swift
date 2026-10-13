import SwiftUI

struct RootView: View {
    @EnvironmentObject private var session: Session

    var body: some View {
        if session.token == nil {
            LoginView()
        } else {
            WorkspaceWebView(session: session).id(session.token)
        }
    }
}
