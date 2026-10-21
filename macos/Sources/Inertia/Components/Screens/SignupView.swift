import SwiftUI

struct SignupView: View {
    @EnvironmentObject private var session: Session
    let showLogin: () -> Void
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var errors: [String] = []

    var body: some View {
        VStack(spacing: 16) {
            VStack(spacing: 8) {
                AppLogo()
                Text("Create your account").font(.largeTitle.bold())
                Text("Your documents, projects, and tasks.").foregroundStyle(.secondary)
            }
            VStack(spacing: 10) {
                ForEach(SignInProvider.allCases) { provider in
                    ProviderSignInButton(provider: provider) {
                        Task { await session.login(provider: provider.rawValue) }
                    }
                }
            }.disabled(session.busy)
            AuthDivider(label: "or sign up with email")
            VStack(spacing: 12) {
                TextField("Name", text: $name)
                TextField("Email", text: $email)
                SecureField("Password", text: $password).onSubmit(signUp)
            }
            .textFieldStyle(InertiaTextFieldStyle(minimumHeight: InertiaTextFieldStyle.loginHeight))
            .disabled(session.busy)
            VStack(alignment: .leading, spacing: 4) {
                ForEach(errors, id: \.self) { ValidationMessage(message: $0) }
            }.frame(maxWidth: .infinity, alignment: .leading)
            Button("Create Account", action: signUp).buttonStyle(.borderedProminent)
                .disabled(session.busy || name.isEmpty || email.isEmpty || password.isEmpty)
            if session.busy { ProgressView() }
            Button("Back to sign in", action: showLogin).buttonStyle(.link)
        }.padding(.horizontal, 40).padding(.vertical, 32).frame(width: 400)
    }

    private func signUp() {
        let secret = password
        Task {
            errors = await session.signUp(name: name, email: email, password: secret)
            // Keep the email and name for another try; the password is not kept after a failure.
            if !errors.isEmpty { password = "" }
        }
    }
}
