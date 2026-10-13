import AuthenticationServices
import CryptoKit
import InertiaCore
import Security

@MainActor final class SocialSignIn: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var browser: ASWebAuthenticationSession?
    private var anchor: NSWindow?

    struct Authorization: Decodable { let authorization_url: URL }
    struct Failure: Decodable, LocalizedError {
        let error: String
        var errorDescription: String? { error }
    }

    func signIn(provider: String, session: Session) async throws -> (Data, HTTPURLResponse) {
        let verifier = try randomValue()
        let state = try randomValue()
        let challenge = Data(SHA256.hash(data: Data(verifier.utf8))).base64URLEncoded
        let start = try await send(session: session, path: "api/v1/auth/social/\(provider)/start", body: ["state": state, "code_challenge": challenge])
        let authorization = try JSONDecoder().decode(Authorization.self, from: start.0)
        let allowedHost = provider == "apple" ? "appleid.apple.com" : "accounts.google.com"
        guard authorization.authorization_url.scheme == "https", authorization.authorization_url.host == allowedHost else {
            throw Failure(error: "Unable to start sign-in. Please try again.")
        }
        anchor = NSApp.keyWindow ?? NSApp.windows.first(where: \.isVisible)
        guard anchor != nil else { throw Failure(error: "Open the Inertia sign-in window and try again.") }
        defer { browser = nil; anchor = nil }
        let callback = try await authenticate(url: authorization.authorization_url)
        guard callback.scheme == "com.inertia.native", callback.host == "auth", callback.path == "/callback",
              let parts = URLComponents(url: callback, resolvingAgainstBaseURL: false) else {
            throw Failure(error: "Unable to verify the sign-in response.")
        }
        let parameters = parts.queryItems ?? []
        func value(_ name: String) -> String? {
            let matching = parameters.filter { $0.name == name }
            return matching.count == 1 ? matching.first?.value : nil
        }
        guard value("state") == state else { throw Failure(error: "Unable to verify the sign-in response. Please try again.") }
        if let error = value("error") { throw Failure(error: error) }
        guard let code = value("code"), !code.isEmpty else { throw Failure(error: "The provider did not complete sign-in.") }
        return try await send(session: session, path: "api/v1/auth/social/exchange", body: ["code": code, "code_verifier": verifier])
    }

    private func authenticate(url: URL) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let browser = ASWebAuthenticationSession(url: url, callbackURLScheme: "com.inertia.native") { url, error in
                if let error { continuation.resume(throwing: error) }
                else if let url { continuation.resume(returning: url) }
                else { continuation.resume(throwing: Failure(error: "Sign-in did not finish. Please try again.")) }
            }
            self.browser = browser
            browser.presentationContextProvider = self
            browser.prefersEphemeralWebBrowserSession = true
            if !browser.start() {
                self.browser = nil
                continuation.resume(throwing: Failure(error: "Unable to open the sign-in browser. Please try again."))
            }
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        anchor ?? NSWindow()
    }

    private func send(session: Session, path: String, body: [String: String]) async throws -> (Data, HTTPURLResponse) {
        let request = Requests.make(base: session.api, path: path, token: nil, method: "POST", body: try JSONEncoder().encode(body))
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw Failure(error: "Unable to contact Inertia.") }
        guard (200..<300).contains(http.statusCode) else {
            throw (try? JSONDecoder().decode(Failure.self, from: data)) ?? Failure(error: "Unable to sign in. Please try again.")
        }
        return (data, http)
    }

    private func randomValue() throws -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            throw Failure(error: "Unable to start a secure sign-in. Please try again.")
        }
        return Data(bytes).base64URLEncoded
    }
}

private extension Data {
    var base64URLEncoded: String {
        base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
}
