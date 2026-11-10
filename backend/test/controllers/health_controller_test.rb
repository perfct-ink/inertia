require "test_helper"

class HealthControllerTest < ActionDispatch::IntegrationTest
  # Stands in for the collab server: up, or refusing connections.
  def with_collab(up:)
    stub = up ? ->(*, **, &block) { block&.call(Object.new.tap { |http| http.define_singleton_method(:get) { |_| true } }) } : ->(*, **, &_block) { raise Errno::ECONNREFUSED }
    Net::HTTP.stub(:start, stub) { yield }
  end

  test "health is OK without signing in and without touching anything" do
    ActiveRecord::Base.stub(:connection, -> { raise "must not touch the database" }) do
      get "/health"
    end
    assert_response :success
    assert_equal "OK", response.body
  end

  test "status lists every check as JSON and is 200 when nothing required is down" do
    with_collab(up: true) { get "/status", as: :json }
    assert_response :success
    body = response.parsed_body
    assert_equal "ok", body["status"]
    names = body["checks"].map { |check| check["name"] }
    assert_equal [ "Database", "Collab server", "Google sign-in", "Apple sign-in" ], names
    assert_equal "ok", body["checks"].first["state"]
  end

  test "a sign-in provider with unset settings is not configured, never down" do
    original = ENV.to_h.slice("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")
    ENV["GOOGLE_CLIENT_ID"] = ""
    with_collab(up: true) { get "/status", as: :json }
    assert_response :success
    google = response.parsed_body["checks"].find { |c| c["name"] == "Google sign-in" }
    assert_equal "not_configured", google["state"]
    assert_match "GOOGLE_CLIENT_ID", google["detail"]
  ensure
    original.each { |key, value| ENV[key] = value }
    ENV.delete("GOOGLE_CLIENT_ID") unless original.key?("GOOGLE_CLIENT_ID")
  end

  test "status is 503 when the database check fails" do
    with_collab(up: true) do
      ActiveRecord::Base.connection.stub(:execute, ->(*) { raise ActiveRecord::ConnectionNotEstablished }) do
        get "/status", as: :json
      end
    end
    assert_response :service_unavailable
    assert_equal "down", response.parsed_body["status"]
    assert_equal "down", response.parsed_body["checks"].first["state"]
  end

  test "status is 503 when the collab server does not answer" do
    with_collab(up: false) { get "/status", as: :json }
    assert_response :service_unavailable
    assert_equal "down", response.parsed_body["checks"].find { |c| c["name"] == "Collab server" }["state"]
  end

  test "status is a short page for people, with a dot per check" do
    with_collab(up: true) { get "/status" }
    assert_response :success
    assert_match "All systems working", response.body
    assert_match "🟢 Database", response.body
  end
end
