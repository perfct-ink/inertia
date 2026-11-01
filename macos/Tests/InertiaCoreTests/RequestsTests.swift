import XCTest
@testable import InertiaCore

final class RequestsTests: XCTestCase {
    func testAuthenticatedMutation() throws {
        let payload = Data("{}".utf8)
        let request = Requests.make(base: URL(string: "https://inertia.it.com")!, path: "api/v1/tasks/42", token: "test-token", method: "PATCH", body: payload)
        XCTAssertEqual(request.url?.path, "/api/v1/tasks/42")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer test-token")
        XCTAssertEqual(request.httpMethod, "PATCH")
        XCTAssertEqual(request.httpBody, payload)
        XCTAssertNil(Requests.make(base: request.url!, path: "login", token: nil).value(forHTTPHeaderField: "Authorization"))
    }
    func testWorkspaceOpensDocumentsWithSharedNavigationAndKeepsTokenOutOfURL() {
        let base = URL(string: "https://inertia.it.com?native=1#/tasks")!
        let url = Requests.workspaceURL(base: base)
        XCTAssertEqual(url.path, "/documents")
        XCTAssertNil(url.fragment)
        XCTAssertNil(url.query)
        XCTAssertTrue(Requests.sameOrigin(base, url))
        XCTAssertFalse(Requests.sameOrigin(base, URL(string: "https://inertia.it.com.evil.example")!))
        XCTAssertFalse(Requests.sameOrigin(base, URL(string: "http://inertia.it.com")!))
    }
    func testWorkspaceViewShowsOnlySameOriginAppPaths() {
        let base = URL(string: "https://inertia.it.com")!
        func shown(_ string: String) -> Bool { Requests.isWorkspaceURL(URL(string: string)!, base: base) }
        XCTAssertTrue(shown("https://inertia.it.com/documents"))
        XCTAssertTrue(shown("https://inertia.it.com/documents/7"))
        XCTAssertTrue(shown("https://inertia.it.com/space"))
        XCTAssertTrue(shown("https://inertia.it.com/shared/abc123"))
        XCTAssertFalse(shown("https://inertia.it.com"))
        XCTAssertFalse(shown("https://inertia.it.com/"))
        XCTAssertFalse(shown("https://inertia.it.com/index.html"))
        XCTAssertFalse(shown("https://inertia.it.com/pricing"))
        XCTAssertFalse(shown("https://inertia.it.com/api/v1/tasks"))
        XCTAssertFalse(shown("https://inertia.it.com/rails/active_storage/blobs/x"))
        XCTAssertFalse(shown("https://example.com/documents"))
        XCTAssertFalse(shown("http://inertia.it.com/documents"))
    }
    func testNestedFoldersAndNullableDatesDecode() throws {
        let data = Data(#"{"folders":[{"id":1,"name":"Project","children":[{"id":2,"name":"Component","children":[],"documents":[]}],"documents":[{"id":3,"title":"Requirements","doc_type":"document"}]}]}"#.utf8)
        let workspace = try JSONDecoder().decode(Workspace.self, from: data)
        XCTAssertEqual(workspace.folders.first?.branches?.first?.name, "Component")
        XCTAssertNil(workspace.folders.first?.children.first?.branches)
        let task = try JSONDecoder().decode(WorkTask.self, from: Data(#"{"id":1,"title":"Task","status":"todo","due_date":null}"#.utf8))
        XCTAssertNil(task.due_date)
    }
}
