import SwiftUI

struct RootView: View {
    @EnvironmentObject private var session: Session
    // New visitors meet the sign-up screen first; after the first sign-in the app opens on sign-in.
    @State private var creatingAccount = true

    var body: some View {
        if session.token == nil {
            if creatingAccount { SignupView(showLogin: { creatingAccount = false }) }
            else { LoginView(showSignup: { creatingAccount = true }) }
        } else {
            WorkspaceWebView(session: session).id(session.token)
                .onAppear { creatingAccount = false }
        }
    }
}
