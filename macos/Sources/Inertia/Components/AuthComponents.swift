import SwiftUI

// Provider labels and styling have one definition for every native screen.
enum SignInProvider: String, CaseIterable, Identifiable {
    case apple, google
    var id: String { rawValue }
    var title: String { "Continue with \(rawValue.capitalized)" }
    var symbol: String? { self == .apple ? "apple.logo" : nil }
}

struct ProviderSignInButton: View {
    let provider: SignInProvider
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            if let symbol = provider.symbol { Label(provider.title, systemImage: symbol) }
            else { Text(provider.title) }
        }.buttonStyle(.volta(.secondary, fullWidth: true))
    }
}

struct AuthDivider: View {
    var title = "or sign in with email"
    var body: some View {
        HStack {
            Rectangle().fill(Volta.border).frame(height: 1)
            Text(title).fixedSize()
            Rectangle().fill(Volta.border).frame(height: 1)
        }.voltaCaption()
    }
}
