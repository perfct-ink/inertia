import SwiftUI

// Sign in with an existing account. New visitors start on `SignupView` (see `RootView`).
struct LoginView: View {
    @EnvironmentObject private var session: Session
    @State private var email = ""
    @State private var password = ""
    let showSignup: () -> Void

    var body: some View {
        AuthScreen(dividerTitle: "or sign in with email") {
            VStack(spacing: 12) {
                TextField("Email", text: $email)
                SecureField("Password", text: $password).onSubmit(submit)
            }
            .textFieldStyle(InertiaTextFieldStyle(minimumHeight: InertiaTextFieldStyle.loginHeight))
            .disabled(session.busy)
            Button("Sign In", action: submit).buttonStyle(.borderedProminent)
                .disabled(session.busy || email.isEmpty || password.isEmpty)
            Button("Create an account", action: showSignup).buttonStyle(.link)
        }
    }

    private func submit() {
        let secret = password
        password = ""
        Task { await session.login(email: email, password: secret) }
    }
}
