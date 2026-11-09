import SwiftUI

// The frame shared by the sign-in and sign-up screens: logo, provider buttons, a divider, then
// the screen's own email form. The two screens differ only in that form.
struct AuthScreen<Form: View>: View {
    @EnvironmentObject private var session: Session
    let dividerTitle: String
    @ViewBuilder let form: Form

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
            AuthDivider(title: dividerTitle)
            form
            if session.busy { ProgressView() }
        }.voltaAuthCard()
    }
}

// The API's validation messages, one line each, left-aligned.
struct ValidationList: View {
    let messages: [String]

    var body: some View {
        if !messages.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                ForEach(messages, id: \.self) { ValidationMessage(message: $0) }
            }.frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

// A field with the messages about it underneath.
struct ValidatedField<Field: View>: View {
    var messages: [String] = []
    @ViewBuilder let field: Field

    var body: some View {
        VStack(spacing: 4) {
            field
            ValidationList(messages: messages)
        }
    }
}
