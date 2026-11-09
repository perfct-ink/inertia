import XCTest
@testable import InertiaCore

final class SignupTests: XCTestCase {
    private let base = URL(string: "https://inertia.it.com")!
    private let created = Data(#"{"user":{"id":7,"name":"Ada","email":"ada@example.com"},"message":"Signed up successfully"}"#.utf8)
    private let taken = Data(#"{"errors":["Email has already been taken"]}"#.utf8)

    // A stand-in network: records the request and answers with a fixed status, header and body.
    private final class Server {
        var received: URLRequest?
        let status: Int, authorization: String?, body: Data
        init(status: Int, authorization: String? = nil, body: Data) { self.status = status; self.authorization = authorization; self.body = body }
        var transport: AuthClient.Transport {
            { request in
                self.received = request
                let fields = self.authorization.map { ["Authorization": $0] }
                return (self.body, HTTPURLResponse(url: request.url!, statusCode: self.status, httpVersion: nil, headerFields: fields)!)
            }
        }
    }

    // MARK: Request and answer

    func testBodyWrapsTrimmedFieldsInUser() throws {
        let body = try Signup.body(name: "  Ada Lovelace ", email: " ada@example.com\n", password: "secret123")
        let user = try XCTUnwrap((try JSONSerialization.jsonObject(with: body) as? [String: [String: String]])?["user"])
        XCTAssertEqual(user, ["name": "Ada Lovelace", "email": "ada@example.com", "password": "secret123", "password_confirmation": "secret123"])
    }
    func testErrorsReadTheValidationMessages() {
        XCTAssertEqual(Signup.errors(from: Data(#"{"errors":["Email has already been taken","Password is too short (minimum is 6 characters)"]}"#.utf8)),
                       ["Email has already been taken", "Password is too short (minimum is 6 characters)"])
        XCTAssertEqual(Signup.errors(from: Data("{}".utf8)), [])
        XCTAssertEqual(Signup.errors(from: Data("not json".utf8)), [])
    }
    func testOutcomeSignsInWhenCreated() throws {
        guard case .signedIn(let token, let user) = try Signup.outcome(status: 201, authorization: "Bearer jwt", data: created) else {
            return XCTFail("a created account is signed in")
        }
        XCTAssertEqual(token, "jwt")
        XCTAssertEqual(user.id, 7)
        XCTAssertEqual(user.email, "ada@example.com")
    }
    func testOutcomeKeepsTheValidationMessagesForTheForm() throws {
        guard case .invalid(let messages) = try Signup.outcome(status: 422, authorization: nil, data: taken) else {
            return XCTFail("a rejected sign-up is invalid, not an error")
        }
        XCTAssertEqual(messages, ["Email has already been taken"])
    }
    func testOutcomeThrowsForEveryOtherFailure() {
        func message(_ status: Int, _ authorization: String?, _ body: String) -> String? {
            do { _ = try Signup.outcome(status: status, authorization: authorization, data: Data(body.utf8)); return nil }
            catch { return error.localizedDescription }
        }
        XCTAssertEqual(message(500, nil, "{}"), APIError.response(500).localizedDescription)
        XCTAssertEqual(message(422, nil, "{}"), APIError.response(422).localizedDescription)
        XCTAssertEqual(message(201, nil, #"{"user":{"id":1,"name":"Ada"}}"#), APIError.missingToken.localizedDescription)
    }

    // MARK: Inline messages

    func testMessagesGoToTheFieldTheyStartWith() {
        XCTAssertEqual(Signup.field(of: "Email has already been taken"), .email)
        XCTAssertEqual(Signup.field(of: "Email is invalid"), .email)
        XCTAssertEqual(Signup.field(of: "Password is too short (minimum is 6 characters)"), .password)
        XCTAssertEqual(Signup.field(of: "Password confirmation doesn't match Password"), .password)
        XCTAssertEqual(Signup.field(of: "Name can't be blank"), .name)
        XCTAssertEqual(Signup.field(of: "Something else went wrong"), .other)
        XCTAssertEqual(Signup.field(of: ""), .other)
    }
    func testGroupingKeepsTheServersOrderWithinAField() {
        let grouped = Signup.grouped(["Email is invalid", "Password is too short", "Email has already been taken", "Odd"])
        XCTAssertEqual(grouped[.email], ["Email is invalid", "Email has already been taken"])
        XCTAssertEqual(grouped[.password], ["Password is too short"])
        XCTAssertEqual(grouped[.other], ["Odd"])
        XCTAssertNil(grouped[.name])
        XCTAssertTrue(Signup.grouped([]).isEmpty)
    }
    func testTheFormNeedsAllThreeFields() {
        XCTAssertTrue(Signup.canSubmit(name: "Ada", email: "ada@example.com", password: "secret"))
        XCTAssertFalse(Signup.canSubmit(name: "  ", email: "ada@example.com", password: "secret"))
        XCTAssertFalse(Signup.canSubmit(name: "Ada", email: "\n", password: "secret"))
        XCTAssertFalse(Signup.canSubmit(name: "Ada", email: "ada@example.com", password: ""))
    }

    // MARK: The call

    func testSignUpPostsTheAccountWithoutATokenAndSignsIn() async throws {
        let server = Server(status: 201, authorization: "Bearer jwt", body: created)
        let outcome = try await AuthClient(base: base, transport: server.transport).signUp(name: "Ada", email: "ada@example.com", password: "secret123")
        let request = try XCTUnwrap(server.received)
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.url?.absoluteString, "https://inertia.it.com/api/v1/auth/signup")
        XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
        // Compared as JSON: key order in the encoded bytes is not stable.
        let sent = try XCTUnwrap((try JSONSerialization.jsonObject(with: XCTUnwrap(request.httpBody)) as? [String: [String: String]])?["user"])
        XCTAssertEqual(sent, ["name": "Ada", "email": "ada@example.com", "password": "secret123", "password_confirmation": "secret123"])
        guard case .signedIn(let token, let user) = outcome else { return XCTFail("a created account is signed in") }
        XCTAssertEqual(token, "jwt")
        XCTAssertEqual(user.name, "Ada")
    }
    func testSignUpWithATakenEmailComesBackAsMessagesNotAnError() async throws {
        let server = Server(status: 422, body: taken)
        let outcome = try await AuthClient(base: base, transport: server.transport).signUp(name: "Ada", email: "ada@example.com", password: "secret123")
        guard case .invalid(let messages) = outcome else { return XCTFail("a taken email is invalid") }
        XCTAssertEqual(Signup.grouped(messages)[.email], ["Email has already been taken"])
    }
    func testSignUpThrowsWhenTheServerFailsOrTheNetworkDoes() async {
        let broken = Server(status: 500, body: Data("oops".utf8))
        do {
            _ = try await AuthClient(base: base, transport: broken.transport).signUp(name: "Ada", email: "a@b.co", password: "secret123")
            XCTFail("a server error throws")
        } catch { XCTAssertEqual(error.localizedDescription, APIError.response(500).localizedDescription) }
        do {
            _ = try await AuthClient(base: base, transport: { _ in throw URLError(.notConnectedToInternet) }).signUp(name: "Ada", email: "a@b.co", password: "secret123")
            XCTFail("a network failure throws")
        } catch { XCTAssertEqual((error as? URLError)?.code, .notConnectedToInternet) }
    }
}
