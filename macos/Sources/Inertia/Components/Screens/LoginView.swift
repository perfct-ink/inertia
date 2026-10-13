import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var session: Session
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        VStack(spacing: 16) {
            VStack(spacing: 8) {
                AppLogo()
                Text("Inertia").font(.largeTitle.bold())
                Text("Your documents, projects, and tasks.").foregroundStyle(.secondary)
            }
            VStack(spacing: 10) {
                ForEach(SignInProvider.allCases) { provider in
                    ProviderSignInButton(provider: provider) {
                        Task { await session.login(provider: provider.rawValue) }
                    }
                }
            }.disabled(session.busy)
            AuthDivider()
            VStack(spacing: 12) {
                TextField("Email", text: $email)
                SecureField("Password", text: $password).onSubmit(signIn)
            }
            .textFieldStyle(InertiaTextFieldStyle(minimumHeight: InertiaTextFieldStyle.loginHeight))
            .disabled(session.busy)
            Button("Sign In", action: signIn).buttonStyle(.borderedProminent)
                .disabled(session.busy || email.isEmpty || password.isEmpty)
            if session.busy { ProgressView() }
            Link("Create an account", destination: URL(string: "/index.html#/signup", relativeTo: session.web)!)
        }.padding(.horizontal, 40).padding(.vertical, 32).frame(width: 400)
    }

    private func signIn() {
        let secret = password
        password = ""
        Task { await session.login(email: email, password: secret) }
    }
}
