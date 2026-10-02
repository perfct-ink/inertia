# The only HTML this API-only app renders: public marketing/SEO pages. Kept
# off ApplicationController (which requires Devise auth via authenticate_user!
# on every request) and off ActionController::API (which has no view/layout
# rendering at all) — this is a sibling of ApplicationController, not a
# subclass. See config/routes.rb and deploy/server/sites-available/
# inertia.it.com.conf for why nginx forwards only these exact paths to Rails;
# everything else at the root still falls through to the static SPA build,
# which is also all Electron and the Capacitor iOS app ever load — neither
# makes a network request for HTML, so these pages are web-only by construction.
class MarketingController < ActionController::Base
  layout "marketing"
  helper_method :canonical_url

  PAGES = {
    home: {
      path: "/",
      title: "Inertia — Docs, tasks, and files in one workspace",
      description: "Inertia is a document editor, file manager, and task tracker for teams who'd rather have one workspace than five separate apps."
    },
    features: {
      path: "/features",
      title: "Features — Inertia",
      description: "Real-time collaborative docs, a full file manager, task tracking with epics and a calendar, and shareable links — all in one workspace."
    },
    pricing: {
      path: "/pricing",
      title: "Pricing — Inertia",
      description: "Pricing for Inertia — create a free account today; plans are still being finalized."
    },
    about: {
      path: "/about",
      title: "About — Inertia",
      description: "Why Inertia exists: one real-time workspace for docs, tasks, and files instead of five apps synced by hand."
    }
  }.freeze

  def home
    @page = PAGES[:home]
  end

  def features
    @page = PAGES[:features]
  end

  def pricing
    @page = PAGES[:pricing]
  end

  def about
    @page = PAGES[:about]
  end

  def robots
    render plain: <<~TXT, content_type: "text/plain"
      User-agent: *
      #{PAGES.values.map { |p| "Allow: #{p[:path]}" }.join("\n")}
      Disallow: /login
      Disallow: /signup
      Disallow: /workspace
      Disallow: /documents
      Disallow: /tasks
      Disallow: /events
      Disallow: /epics
      Disallow: /folders
      Disallow: /shared

      Sitemap: #{request.base_url}/sitemap.xml
    TXT
  end

  def sitemap
    urls = PAGES.values.map { |page| request.base_url + page[:path] }
    render xml: <<~XML
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      #{urls.map { |u| "  <url><loc>#{u}</loc></url>" }.join("\n")}
      </urlset>
    XML
  end

  private

  def canonical_url
    request.base_url + request.path
  end
end
