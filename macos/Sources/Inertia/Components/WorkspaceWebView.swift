import SwiftUI
import WebKit
import InertiaCore

struct WorkspaceWebView: NSViewRepresentable {
    let session: Session
    func makeCoordinator() -> Coordinator { Coordinator(session: session) }
    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // The native login passes its session to the existing workspace UI.
        config.websiteDataStore = .nonPersistent()
        if let token = session.token, let user = session.user,
           let userData = try? JSONEncoder().encode(user),
           let userJSON = try? JSONSerialization.jsonObject(with: userData),
           let state = try? JSONSerialization.data(withJSONObject: ["state": ["token": token, "user": userJSON], "version": 0]),
           let literal = try? JSONSerialization.data(withJSONObject: [String(decoding: state, as: UTF8.self)]) {
            let encoded = String(decoding: literal, as: UTF8.self)
            let origin = session.web.absoluteString
            let originLiteral = String(decoding: try! JSONSerialization.data(withJSONObject: [origin]), as: UTF8.self)
            let script = """
            if (location.origin === new URL(\(originLiteral)[0]).origin) {
                localStorage.setItem('inertia-auth', \(encoded)[0]);
                const originalSetItem = Storage.prototype.setItem;
                const originalRemoveItem = Storage.prototype.removeItem;
                function notifySignOut(storage, key, value) {
                    if (storage !== localStorage || key !== 'inertia-auth') return;
                    try {
                        if (value === null || !JSON.parse(value).state?.token) {
                            window.webkit.messageHandlers.inertiaSession.postMessage('logout');
                        }
                    } catch (_) {}
                }
                Storage.prototype.setItem = function(key, value) {
                    originalSetItem.call(this, key, value);
                    notifySignOut(this, key, String(value));
                };
                Storage.prototype.removeItem = function(key) {
                    originalRemoveItem.call(this, key);
                    notifySignOut(this, key, null);
                };
            }
            """
            config.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        config.userContentController.add(context.coordinator, name: "inertiaSession")
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        context.coordinator.webView = view
        context.coordinator.observeRefresh()
        view.load(URLRequest(url: Requests.workspaceURL(base: session.web)))
        return view
    }
    func updateNSView(_ nsView: WKWebView, context: Context) {}
    static func dismantleNSView(_ view: WKWebView, coordinator: Coordinator) {
        view.configuration.userContentController.removeScriptMessageHandler(forName: "inertiaSession")
    }

    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        let session: Session
        weak var webView: WKWebView?
        private var refreshObserver: NSObjectProtocol?
        init(session: Session) { self.session = session }
        deinit { if let refreshObserver { NotificationCenter.default.removeObserver(refreshObserver) } }

        func observeRefresh() {
            refreshObserver = NotificationCenter.default.addObserver(forName: .refreshWorkspace, object: nil, queue: .main) { [weak self] _ in
                Task { @MainActor in
                    guard let self, let webView = self.webView else { return }
                    if webView.url.map(self.isWorkspace) == true { webView.reload() }
                    else { webView.load(URLRequest(url: Requests.workspaceURL(base: self.session.web))) }
                }
            }
        }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, let url = message.frameInfo.request.url,
                  isWorkspace(url), message.body as? String == "logout" else { return }
            Task { await session.logout() }
        }

        private func isWorkspace(_ url: URL) -> Bool {
            Requests.sameOrigin(url, session.web) && url.path == "/index.html"
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { decisionHandler(.cancel); return }
            if isWorkspace(url) || action.targetFrame?.isMainFrame == false { decisionHandler(.allow) }
            else {
                if ["https", "http"].contains(url.scheme ?? ""), action.navigationType == .linkActivated { NSWorkspace.shared.open(url) }
                decisionHandler(.cancel)
            }
        }
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url {
                if isWorkspace(url) { webView.load(URLRequest(url: url)) }
                else if ["http", "https"].contains(url.scheme ?? "") { NSWorkspace.shared.open(url) }
            }
            return nil
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            // No token or server response body is exposed in the error page.
            guard (error as NSError).code != NSURLErrorCancelled else { return }
            webView.loadHTMLString("<h2>Unable to load Inertia</h2><p>Check your connection, then use Refresh Space (Command-R) to try again.</p>", baseURL: nil)
        }
    }
}
