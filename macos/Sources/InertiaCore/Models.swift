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
        // The web app lives at real paths; the site root serves marketing HTML.
        parts.path = "/documents"
        parts.query = nil
        parts.fragment = nil
        return parts.url!
    }
    /// Pages the workspace web view shows itself: same-origin app paths. The
    /// marketing pages, the API, uploads and collaboration socket are not the app.
    public static func isWorkspaceURL(_ url: URL, base: URL) -> Bool {
        guard sameOrigin(url, base) else { return false }
        let marketing = ["", "/", "/index.html", "/features", "/pricing", "/about", "/robots.txt", "/sitemap.xml"]
        let services = ["/api/", "/rails/", "/collab"]
        return !marketing.contains(url.path) && !services.contains { url.path.hasPrefix($0) }
    }
    public static func sameOrigin(_ lhs: URL, _ rhs: URL) -> Bool {
        lhs.scheme == rhs.scheme && lhs.host == rhs.host && lhs.port == rhs.port
    }
}
