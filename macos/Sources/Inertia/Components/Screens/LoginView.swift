import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var session: Session
    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    // New visitors meet the signup form first; existing accounts switch to sign in.
    @State private var creatingAccount = true

    var body: some View {
        VStack(spacing: 16) {
            VStack(spacing: 8) {
                AppLogo()
                Text("Inertia").voltaFont(.twoXL, weight: .semibold).tracking(-0.6).foregroundStyle(Volta.foreground)
                Text("Your documents, projects, and tasks.").voltaFont(.sm).foregroundStyle(Volta.mutedForeground)
            }
            VStack(spacing: 10) {
                ForEach(SignInProvider.allCases) { provider in
                    ProviderSignInButton(provider: provider) {
                        Task { await session.login(provider: provider.rawValue) }
                    }
                }
            }.disabled(session.busy)
            AuthDivider(title: creatingAccount ? "or sign up with email" : "or sign in with email")
            VStack(spacing: 12) {
                if creatingAccount { TextField("Name", text: $name) }
                TextField("Email", text: $email)
                SecureField("Password", text: $password).onSubmit(submit)
            }
            .textFieldStyle(InertiaTextFieldStyle(minimumHeight: InertiaTextFieldStyle.loginHeight))
            .disabled(session.busy)
            Button(creatingAccount ? "Create Account" : "Sign In", action: submit).buttonStyle(.volta(.primary, fullWidth: true))
                .disabled(session.busy || email.isEmpty || password.isEmpty || (creatingAccount && name.isEmpty))
            if session.busy { ProgressView() }
            Button(creatingAccount ? "Already have an account? Sign in" : "Create an account") { creatingAccount.toggle() }
                .buttonStyle(.voltaLink)
        }.voltaAuthCard()
    }

    private func submit() {
        let secret = password
        password = ""
        if creatingAccount { Task { await session.signUp(name: name, email: email, password: secret) } }
        else { Task { await session.login(email: email, password: secret) } }
    }
}
