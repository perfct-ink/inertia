require "test_helper"

class DocumentDatesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-document-dates-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @folder = @user.workspace.folders.create!(name: "Plans")
    @document = Document.create!(title: "Launch plan", folder: @folder, created_by: @user)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "create a date from a document, list it, change its day, and delete it" do
    post "/api/v1/document_dates", params: { document_date: { date: "2026-12-01", label: "Ship the beta", document_id: @document.id } }, headers: @headers, as: :json
    assert_response :created
    assert_equal [ "2026-12-01", "Ship the beta", @document.id, @folder.id, "Launch plan" ],
                 response.parsed_body.values_at("date", "label", "document_id", "folder_id", "document_title")
    id = response.parsed_body["id"]
    @user.workspace.document_dates.create!(date: Date.new(2026, 12, 2), label: "Elsewhere")

    get "/api/v1/document_dates", params: { document_id: @document.id }, headers: @headers
    assert_equal [ "Ship the beta" ], response.parsed_body.map { |d| d["label"] }
    get "/api/v1/document_dates", headers: @headers
    assert_equal [ "Ship the beta", "Elsewhere" ], response.parsed_body.map { |d| d["label"] }

    patch "/api/v1/document_dates/#{id}", params: { document_date: { date: "2026-12-15", label: "Beta" } }, headers: @headers, as: :json
    assert_response :success
    assert_equal [ "2026-12-15", "Beta" ], response.parsed_body.values_at("date", "label")

    delete "/api/v1/document_dates/#{id}", headers: @headers
    assert_response :no_content
    assert_not DocumentDate.exists?(id)
  end

  test "a date can be unlinked from its document and keeps its folder, but not moved to another document" do
    other_document = Document.create!(title: "Other", folder: @folder, created_by: @user)
    date = @user.workspace.document_dates.create!(date: Date.new(2026, 12, 1), label: "Beta", document: @document)

    patch "/api/v1/document_dates/#{date.id}", params: { document_date: { document_id: other_document.id } }, headers: @headers, as: :json
    assert_equal @document.id, date.reload.document_id

    patch "/api/v1/document_dates/#{date.id}", params: { document_date: { document_id: nil } }, headers: @headers, as: :json
    assert_response :success
    assert_nil response.parsed_body["document_id"]
    assert_nil response.parsed_body["document_title"]
    assert_equal @folder.id, response.parsed_body["folder_id"]
  end

  test "a date loads by id whatever project is selected; the list is narrowed to the project, a document's own list is not" do
    project = @user.workspace.folders.create!(name: "Messages", kind: :project)
    date = @user.workspace.document_dates.create!(date: Date.new(2026, 12, 1), label: "Beta", document: @document)

    get "/api/v1/document_dates/#{date.id}", headers: @headers.merge("X-Project-Id" => project.id.to_s)
    assert_response :success
    assert_equal "Beta", response.parsed_body["label"]

    get "/api/v1/document_dates", headers: @headers.merge("X-Project-Id" => project.id.to_s)
    assert_equal [], response.parsed_body
    get "/api/v1/document_dates", headers: @headers.merge("X-Project-Id" => @folder.id.to_s)
    assert_equal [ date.id ], response.parsed_body.map { |d| d["id"] }

    get "/api/v1/document_dates", params: { document_id: @document.id }, headers: @headers.merge("X-Project-Id" => project.id.to_s)
    assert_equal [ date.id ], response.parsed_body.map { |d| d["id"] }
  end

  test "another space's date is not found" do
    other = User.create!(name: "O", email: "o-document-dates-show@example.com", password: "password123")
    theirs = other.workspace.document_dates.create!(date: Date.new(2026, 12, 1), label: "Theirs")
    get "/api/v1/document_dates/#{theirs.id}", headers: @headers
    assert_response :not_found
    delete "/api/v1/document_dates/#{theirs.id}", headers: @headers
    assert_response :not_found
  end

  test "a document from another space is rejected" do
    other = User.create!(name: "O", email: "o-document-dates-doc@example.com", password: "password123")
    theirs = Document.create!(title: "Theirs", folder: other.workspace.folders.create!(name: "X"), created_by: other)
    post "/api/v1/document_dates", params: { document_date: { date: "2026-12-01", document_id: theirs.id } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "a date needs a day" do
    post "/api/v1/document_dates", params: { document_date: { label: "No day", document_id: @document.id } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "signing in is required" do
    get "/api/v1/document_dates"
    assert_response :unauthorized
  end
end
