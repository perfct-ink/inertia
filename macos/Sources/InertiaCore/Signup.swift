import Foundation

/// The sign-up call (`POST api/v1/auth/signup`, the Devise registration): what it sends and how
/// its answer reads. Pure, so the Mac app's sign-up screen and the tests share one definition.
public enum Signup {
    /// What the server decided: the new account is signed in (the response carries the bearer
    /// token the way login does), or the form has validation messages to show.
    public enum Outcome {
        case signedIn(token: String, user: Login.User)
        case invalid([String])
    }
    /// The form field a validation message is about. `other` is anything the screen has no field for.
    public enum Field: CaseIterable {
        case name, email, password, other
    }

    public static func body(name: String, email: String, password: String) throws -> Data {
        try JSONSerialization.data(withJSONObject: ["user": [
            "name": name.trimmingCharacters(in: .whitespacesAndNewlines),
            "email": email.trimmingCharacters(in: .whitespacesAndNewlines),
            "password": password,
            "password_confirmation": password,
        ]])
    }
    /// The form can be sent: a name, an email and a password, none of them blank.
    public static func canSubmit(name: String, email: String, password: String) -> Bool {
        ![name, email].contains { $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty } && !password.isEmpty
    }
    /// The messages in a 422 body (`{"errors": ["Email has already been taken"]}`); empty when there are none.
    public static func errors(from data: Data) -> [String] {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let messages = object["errors"] as? [String] else { return [] }
        return messages
    }
    /// 201 with a bearer token is signed in; 422 with messages is invalid; anything else
    /// throws an `APIError` for the shared error alert.
    public static func outcome(status: Int, authorization: String?, data: Data) throws -> Outcome {
        if status == 422 {
            let messages = errors(from: data)
            if !messages.isEmpty { return .invalid(messages) }
        }
        guard status == 201 else { throw APIError.response(status) }
        guard let token = Requests.bearerToken(authorization) else { throw APIError.missingToken }
        return .signedIn(token: token, user: try JSONDecoder().decode(Login.self, from: data).user)
    }
    /// The field a full validation message starts with ("Email has already been taken",
    /// "Password is too short ..."). Devise names the attribute first, so the first word decides.
    public static func field(of message: String) -> Field {
        switch message.split(separator: " ").first?.lowercased() {
        case "name": return .name
        case "email": return .email
        case "password": return .password
        default: return .other
        }
    }
    /// The messages per field, in the order the server sent them.
    public static func grouped(_ messages: [String]) -> [Field: [String]] {
        Dictionary(grouping: messages, by: field(of:))
    }
}

/// The unauthenticated account calls. The network is a parameter so tests can answer for it.
public struct AuthClient {
    public typealias Transport = (URLRequest) async throws -> (Data, HTTPURLResponse)

    let base: URL
    let transport: Transport

    public init(base: URL, transport: @escaping Transport = AuthClient.urlSession) {
        self.base = base
        self.transport = transport
    }
    public static let urlSession: Transport = { request in
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
        return (data, http)
    }

    /// Creates the account. The server signs the new user in, so a created account comes back
    /// as `.signedIn` with its token.
    public func signUp(name: String, email: String, password: String) async throws -> Signup.Outcome {
        let body = try Signup.body(name: name, email: email, password: password)
        let (data, http) = try await transport(Requests.make(base: base, path: "api/v1/auth/signup", token: nil, method: "POST", body: body))
        return try Signup.outcome(status: http.statusCode, authorization: http.value(forHTTPHeaderField: "Authorization"), data: data)
    }
}
