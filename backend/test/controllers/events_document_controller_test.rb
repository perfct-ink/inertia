require "test_helper"

class EventsDocumentControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-event-doc-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @folder = @user.workspace.folders.create!(name: "Plans")
    @document = Document.create!(title: "Launch plan", folder: @folder, created_by: @user)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "create an event from a document, list a document's events, and change its date" do
    post "/api/v1/events", params: { event: { title: "Beta", date: "2026-12-01", event_type: "milestone", document_id: @document.id, folder_id: @folder.id } }, headers: @headers, as: :json
    assert_response :created
    assert_equal @document.id, response.parsed_body["document_id"]
    id = response.parsed_body["id"]
    @user.workspace.events.create!(title: "Unrelated", date: Date.new(2026, 12, 2), event_type: :deadline)

    get "/api/v1/events", params: { document_id: @document.id }, headers: @headers
    assert_equal [ "Beta" ], response.parsed_body.map { |e| e["title"] }

    patch "/api/v1/events/#{id}", params: { event: { date: "2026-12-15" } }, headers: @headers, as: :json
    assert_equal "2026-12-15", response.parsed_body["date"]
  end

  test "a document from another space is rejected" do
    other = User.create!(name: "O", email: "o-event-doc-api@example.com", password: "password123")
    theirs = Document.create!(title: "Theirs", folder: other.workspace.folders.create!(name: "X"), created_by: other)
    post "/api/v1/events", params: { event: { title: "Beta", date: "2026-12-01", event_type: "milestone", document_id: theirs.id } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end
end
