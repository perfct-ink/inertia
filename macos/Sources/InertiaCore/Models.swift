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
public struct WorkTask: Decodable, Identifiable {
    public let id: Int
    public let title: String
    public let status: String
    public let due_date: String?
}
public struct Event: Decodable, Identifiable {
    public let id: Int
    public let title: String
    public let date: String
}
public struct Contents: Decodable {
    public let documents: [Document]
    public let tasks: [WorkTask]
    public let events: [Event]
}
public struct Login: Decodable {
    public struct User: Codable { public let id: Int; public let name: String; public let email: String }
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
    public static func editorURL(base: URL, documentID: Int) -> URL {
        var parts = URLComponents(url: base, resolvingAgainstBaseURL: false)!
        // Use the SPA entry explicitly: the site root serves marketing HTML.
        parts.path = "/index.html"
        parts.query = "native=1"
        parts.fragment = "/documents/\(documentID)"
        return parts.url!
    }
    public static func sameOrigin(_ lhs: URL, _ rhs: URL) -> Bool {
        lhs.scheme == rhs.scheme && lhs.host == rhs.host && lhs.port == rhs.port
    }
}
