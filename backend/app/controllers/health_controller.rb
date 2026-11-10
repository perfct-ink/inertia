require "net/http"

# Public liveness and dependency checks (docs/rules/backend.md, Health Checks).
# Like MarketingController it sits off ApplicationController, so no sign-in is
# needed, and nginx forwards only the exact paths /health and /status to it
# (frontend/nginx/default.conf).
#
# /health answers 200 "OK" and touches nothing else. /status runs a cheap check
# of the database, the collab server and each sign-in provider's settings (the
# providers themselves are never called) and answers 503 when a required one
# fails, as JSON for scripts or as a short page for people.
class HealthController < ActionController::Base
  # Where Rails reaches the collab server. In Docker Compose that is the service name.
  COLLAB_URL = ENV.fetch("COLLAB_HEALTH_URL", "http://collab:1234")

  Check = Struct.new(:name, :state, :detail, keyword_init: true)

  def show
    render plain: "OK"
  end

  def status
    checks = [ database_check, collab_check, *provider_checks ]
    healthy = checks.none? { |check| check.state == "down" }
    http = healthy ? :ok : :service_unavailable
    respond_to do |format|
      format.json { render json: { status: healthy ? "ok" : "down", checks: checks.map(&:to_h) }, status: http }
      format.any { render html: page(checks, healthy).html_safe, status: http } # rubocop:disable Rails/OutputSafety
    end
  end

  private

  def database_check
    ActiveRecord::Base.connection.execute("SELECT 1")
    Check.new(name: "Database", state: "ok")
  rescue StandardError => e
    Check.new(name: "Database", state: "down", detail: e.class.name)
  end

  # The collab server answers any HTTP request on its port.
  def collab_check
    uri = URI(COLLAB_URL)
    Net::HTTP.start(uri.host, uri.port, open_timeout: 2, read_timeout: 2) { |http| http.get("/") }
    Check.new(name: "Collab server", state: "ok")
  rescue StandardError => e
    Check.new(name: "Collab server", state: "down", detail: e.class.name)
  end

  # Optional providers: unset is "not configured" (orange), never down.
  def provider_checks
    { "Google sign-in" => %w[GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET],
      "Apple sign-in" => %w[APPLE_CLIENT_ID APPLE_TEAM_ID APPLE_KEY_ID APPLE_PRIVATE_KEY] }.map do |name, keys|
      missing = keys.select { |key| ENV[key].blank? }
      Check.new(name: name, state: missing.empty? ? "ok" : "not_configured", detail: missing.empty? ? nil : "Missing #{missing.join(', ')}")
    end
  end

  DOTS = { "ok" => "🟢", "not_configured" => "🟠", "down" => "🔴" }.freeze

  def page(checks, healthy)
    rows = checks.map { |c| "<li>#{DOTS[c.state]} #{ERB::Util.h(c.name)}#{c.detail ? " — #{ERB::Util.h(c.detail)}" : ''}</li>" }.join
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>Status</title></head>" \
      "<body><h1>#{healthy ? 'All systems working' : 'Something is down'}</h1><ul>#{rows}</ul></body></html>"
  end
end
