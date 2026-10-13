import SwiftUI
import InertiaCore
import AuthenticationServices

@MainActor final class Session: ObservableObject {
    // Production by default; local development can override both endpoints.
    let api = URL(string: ProcessInfo.processInfo.environment["INERTIA_API_URL"] ?? "https://inertia.it.com")!
    let web = URL(string: ProcessInfo.processInfo.environment["INERTIA_WEB_URL"] ?? "https://inertia.it.com")!
    @Published var token: String?
    @Published var user: Login.User?
    @Published var folders: [Folder] = []
    @Published var error: String?
    @Published var busy = false
    private let socialSignIn = SocialSignIn()

    func request<T: Decodable>(_ path: String, method: String = "GET", body: [String: Any]? = nil) async throws -> T {
        let payload = try body.map { try JSONSerialization.data(withJSONObject: $0) }
        let request = Requests.make(base: api, path: path, token: token, method: method, body: payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else { throw APIError.response(status) }
        return try JSONDecoder().decode(T.self, from: data)
    }
    func login(email: String, password: String) async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["user": ["email": email, "password": password]])
            let (data, response) = try await URLSession.shared.data(for: Requests.make(base: api, path: "api/v1/auth/login", token: nil, method: "POST", body: body))
            let http = response as! HTTPURLResponse
            guard http.statusCode == 200 else { throw APIError.response(http.statusCode) }
            guard let header = http.value(forHTTPHeaderField: "Authorization"), header.hasPrefix("Bearer ") else { throw APIError.missingToken }
            user = try JSONDecoder().decode(Login.self, from: data).user
            token = String(header.dropFirst(7))
            await refresh()
        } catch { self.error = error.localizedDescription }
    }
    func login(provider: String) async {
        guard !busy else { return }
        busy = true
        error = nil
        defer { busy = false }
        do {
            let (data, response) = try await socialSignIn.signIn(provider: provider, session: self)
            guard let header = response.value(forHTTPHeaderField: "Authorization"), header.hasPrefix("Bearer ") else { throw APIError.missingToken }
            let login = try JSONDecoder().decode(Login.self, from: data)
            user = login.user
            token = String(header.dropFirst(7))
            await refresh()
        } catch let error as ASWebAuthenticationSessionError where error.code == .canceledLogin {
            // Closing the provider sheet leaves the user on the login screen.
        } catch { self.error = error.localizedDescription }
    }
    func refresh() async {
        do { let workspace: Workspace = try await request("api/v1/workspace"); folders = workspace.folders }
        catch { self.error = error.localizedDescription }
    }
    func logout() async {
        if let token {
            _ = try? await URLSession.shared.data(for: Requests.make(base: api, path: "api/v1/auth/logout", token: token, method: "DELETE"))
        }
        token = nil; user = nil; folders = []
    }
}
