// The marketing pages' script, served as a fingerprinted, cacheable file
// (MarketingController#asset). Loaded in <head> without defer, so it runs before
// the page paints.

// Rails can't see client-side auth state (the JWT lives only in localStorage,
// under the same key frontend/src/store/auth.ts's zustand `persist` middleware
// uses; there's no session cookie to check server-side). So the page is always
// the same signed-out HTML, which keeps it cacheable and what crawlers see; this
// runs before it paints. A signed-in visitor gets data-signed-in on <html> (the
// header then offers "Open app" instead of Sign in and Sign up), and on the home
// page, which names the app address in <meta name="inertia-redirect">, goes
// straight to the app. A crawler or signed-out visitor has no such entry and just
// sees the marketing HTML.
(function () {
  try {
    var raw = localStorage.getItem('inertia-auth')
    var parsed = raw && JSON.parse(raw)
    if (parsed && parsed.state && parsed.state.token) {
      document.documentElement.setAttribute('data-signed-in', '')
      var redirect = document.querySelector('meta[name="inertia-redirect"]')
      if (redirect) window.location.replace(redirect.getAttribute('content'))
    }
  } catch (e) {}
})()

// The header's theme toggle. The stored theme is applied by a small inline
// snippet in the layout, before first paint. Without JavaScript the page still
// follows the system setting through the CSS light-dark() colors, and the toggle
// stays hidden.
(function () {
  var KEY = 'inertia-marketing-theme'
  var root = document.documentElement
  var system = window.matchMedia('(prefers-color-scheme: dark)')

  function current() {
    return root.getAttribute('data-theme') || (system.matches ? 'dark' : 'light')
  }

  function sync(button) {
    var dark = current() === 'dark'
    button.setAttribute('aria-pressed', String(dark))
    // SVG elements have no `hidden` property, so toggle the attribute.
    button.querySelector('.theme_toggle-sun').toggleAttribute('hidden', !dark)
    button.querySelector('.theme_toggle-moon').toggleAttribute('hidden', dark)
  }

  document.addEventListener('DOMContentLoaded', function () {
    var button = document.querySelector('.theme_toggle')
    if (!button) return
    button.hidden = false
    sync(button)
    system.addEventListener('change', function () { sync(button) })
    button.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark'
      root.setAttribute('data-theme', next)
      try { localStorage.setItem(KEY, next) } catch (e) {}
      sync(button)
    })
  })
})()
