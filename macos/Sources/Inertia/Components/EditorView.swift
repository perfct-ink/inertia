import SwiftUI
import WebKit
import InertiaCore

struct EditorView: NSViewRepresentable {
    let documentID: Int
    let session: Session
    func makeCoordinator() -> Coordinator { Coordinator(origin: session.web) }
    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // Isolated, memory-only storage: signing out destroys the editor session.
        config.websiteDataStore = .nonPersistent()
        if let token = session.token, let user = session.user,
           let userData = try? JSONEncoder().encode(user),
           let userJSON = try? JSONSerialization.jsonObject(with: userData),
           let state = try? JSONSerialization.data(withJSONObject: ["state": ["token": token, "user": userJSON], "version": 0]),
           let literal = try? JSONSerialization.data(withJSONObject: [String(decoding: state, as: UTF8.self)]) {
            let encoded = String(decoding: literal, as: UTF8.self)
            let origin = session.web.absoluteString
            let originLiteral = String(decoding: try! JSONSerialization.data(withJSONObject: [origin]), as: UTF8.self)
            let script = "if (location.origin === new URL(\(originLiteral)[0]).origin) { localStorage.setItem('inertia-auth', \(encoded)[0]); }"
            config.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.load(URLRequest(url: Requests.editorURL(base: session.web, documentID: documentID)))
        return view
    }
    func updateNSView(_ nsView: WKWebView, context: Context) {}
    final class Coordinator: NSObject, WKNavigationDelegate {
        let origin: URL
        // The editor only ever shows document/table content via /index.html's
        // SPA shell (see Requests.editorURL) — these paths render server-side
        // marketing HTML instead (backend/app/controllers/marketing_controller.rb)
        // and must never appear inside this chrome-less embedded editor, even
        // if some future same-origin link or redirect ever pointed at one.
        static let marketingOnlyPaths: Set<String> = ["/", "/features", "/pricing", "/about"]
        init(origin: URL) { self.origin = origin }
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { decisionHandler(.cancel); return }
            if Requests.sameOrigin(url, origin), !Coordinator.marketingOnlyPaths.contains(url.path) { decisionHandler(.allow) }
            else {
                if ["https", "http"].contains(url.scheme ?? ""), action.navigationType == .linkActivated { NSWorkspace.shared.open(url) }
                decisionHandler(.cancel)
            }
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            // No token or server response body is exposed in the error page.
            webView.loadHTMLString("<h2>Unable to load the editor</h2><p>Check your connection, then return to the project and reopen the document.</p>", baseURL: origin)
        }
    }
}
