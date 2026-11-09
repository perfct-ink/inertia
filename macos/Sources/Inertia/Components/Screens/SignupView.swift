import SwiftUI
import InertiaCore

// Create an account without leaving the app. Apple and Google use the same flow as sign-in
// (the server creates the account on first provider sign-in); the email form calls the signup API.
struct SignupView: View {
    @EnvironmentObject private var session: Session
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    // The API's validation messages (taken email, short password) by the field they are about.
    @State private var errors: [Signup.Field: [String]] = [:]
    let showLogin: () -> Void

    private var canSubmit: Bool { Signup.canSubmit(name: name, email: email, password: password) }

    var body: some View {
        AuthScreen(dividerTitle: "or sign up with email") {
            VStack(spacing: 12) {
                ValidatedField(messages: errors[.name] ?? []) { TextField("Name", text: $name) }
                ValidatedField(messages: errors[.email] ?? []) { TextField("Email", text: $email) }
                ValidatedField(messages: errors[.password] ?? []) { SecureField("Password", text: $password).onSubmit(submit) }
            }
            .textFieldStyle(InertiaTextFieldStyle(minimumHeight: InertiaTextFieldStyle.loginHeight))
            .disabled(session.busy)
            ValidationList(messages: errors[.other] ?? [])
            Button("Create Account", action: submit).buttonStyle(.volta(.primary, fullWidth: true))
                .disabled(session.busy || !canSubmit)
            Button("Already have an account? Sign in", action: showLogin).buttonStyle(.voltaLink)
        }
    }

    private func submit() {
        guard canSubmit, !session.busy else { return }
        let (name, email, secret) = (name, email, password)
        Task {
            errors = Signup.grouped(await session.signUp(name: name, email: email, password: secret))
            // The name and email stay for another try; a rejected password does not.
            if !errors.isEmpty { password = "" }
        }
    }
}
