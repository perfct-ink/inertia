import SwiftUI

struct RootView: View {
    @EnvironmentObject private var session: Session
    @State private var signingUp = false

    var body: some View {
        Group {
            if session.token == nil {
                if signingUp { SignupView { signingUp = false } }
                else { LoginView { signingUp = true } }
            } else {
                WorkspaceWebView(session: session).id(session.token)
            }
        }
        // After signing out, start again on the sign-in screen.
        .onChange(of: session.token) { signingUp = false }
    }
}
