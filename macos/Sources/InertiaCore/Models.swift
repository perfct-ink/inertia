import Foundation

public struct Document: Decodable, Identifiable {
    public let id: Int
    public let title: String
    public let doc_type: String
}
public struct Folder: Decodable, Identifiable {
    public let id: Int
    public let name: String
    public let children: [Folder]
    public let documents: [Document]
    public var branches: [Folder]? { children.isEmpty ? nil : children }
}
public struct Workspace: Decodable { public let folders: [Folder] }
public typealias WorkTask = TaskRecord
public typealias Event = EventRecord
public struct Contents: Decodable {
    public let documents: [Document]
    public let tasks: [WorkTask]
    public let events: [Event]
}
public struct Login: Decodable {
    public typealias User = UserRecord
    public let user: User
}
public enum APIError: LocalizedError {
    case response(Int)
    case missingToken
    public var errorDescription: String? {
        switch self {
        case .response(401): return "Your session expired or the email/password was incorrect. Sign in again."
        case .response(let code): return "The server returned HTTP \(code). Please try again."
        case .missingToken: return "The server did not return a sign-in token."
        }
    }
}
/// The sign-up call (`POST api/v1/auth/signup`): what it sends and how its
/// validation errors read.
public enum Signup {
    public static func body(name: String, email: String, password: String) throws -> Data {
        try JSONSerialization.data(withJSONObject: ["user": [
            "name": name.trimmingCharacters(in: .whitespacesAndNewlines),
            "email": email.trimmingCharacters(in: .whitespacesAndNewlines),
            "password": password,
            "password_confirmation": password,
        ]])
    }
    /// The messages in a 422 body (`{"errors": ["Email has already been taken"]}`); empty when there are none.
    public static func errors(from data: Data) -> [String] {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let messages = object["errors"] as? [String] else { return [] }
        return messages
    }
}
public enum Requests {
    public static func make(base: URL, path: String, token: String?, method: String = "GET", body: Data? = nil) -> URLRequest {
        var request = URLRequest(url: base.appendingPathComponent(path))
        request.httpMethod = method
        request.httpBody = body
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        return request
    }
    public static func workspaceURL(base: URL) -> URL {
        var parts = URLComponents(url: base, resolvingAgainstBaseURL: false)!
        // Use the SPA entry explicitly: the site root serves marketing HTML.
        parts.path = "/index.html"
        parts.query = nil
        parts.fragment = "/documents"
        return parts.url!
    }
    public static func sameOrigin(_ lhs: URL, _ rhs: URL) -> Bool {
        lhs.scheme == rhs.scheme && lhs.host == rhs.host && lhs.port == rhs.port
    }
}
