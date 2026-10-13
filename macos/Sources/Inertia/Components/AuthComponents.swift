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
            Group {
                if let symbol = provider.symbol { Label(provider.title, systemImage: symbol) }
                else { Text(provider.title) }
            }.frame(maxWidth: .infinity)
        }.buttonStyle(.bordered).controlSize(.large)
    }
}

struct AuthDivider: View {
    var body: some View {
        HStack {
            Rectangle().frame(height: 1)
            Text("or sign in with email").fixedSize()
            Rectangle().frame(height: 1)
        }.foregroundStyle(.secondary)
    }
}
