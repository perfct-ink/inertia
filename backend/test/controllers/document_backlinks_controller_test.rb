require "test_helper"

class DocumentBacklinksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-backlinks-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    folder = @user.workspace.folders.create!(name: "Docs")
    @target = Document.create!(title: "Target", folder: folder, created_by: @user)
    @source = Document.create!(title: "Source", folder: folder, created_by: @user)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def paragraph_with(*inline) = { type: "doc", content: [ { type: "paragraph", content: inline } ] }

  test "lists the documents that link here, updated when a document is saved through the API" do
    get "/api/v1/documents/#{@target.id}/backlinks", headers: @headers
    assert_response :success
    assert_equal [], response.parsed_body

    content = paragraph_with({ type: "documentLink", attrs: { documentId: @target.id } })
    patch "/api/v1/documents/#{@source.id}", params: { document: { content: content } }, headers: @headers, as: :json
    assert_response :success

    get "/api/v1/documents/#{@target.id}/backlinks", headers: @headers
    body = response.parsed_body
    assert_equal [ "Source" ], body.map { |d| d["title"] }
    assert_equal [ @source.id, "document", @source.folder_id ], body.first.values_at("id", "doc_type", "folder_id")
    assert_not body.first.key?("content"), "the list carries no document bodies"
  end

  test "a link to a heading counts, and removing the link empties the list again" do
    href = "/documents/#{@target.id}#launch-plan"
    link = { type: "text", text: "Launch plan", marks: [ { type: "link", attrs: { href: href } } ] }
    patch "/api/v1/documents/#{@source.id}", params: { document: { content: paragraph_with(link) } }, headers: @headers, as: :json

    get "/api/v1/documents/#{@target.id}/backlinks", headers: @headers
    assert_equal [ "Source" ], response.parsed_body.map { |d| d["title"] }

    patch "/api/v1/documents/#{@source.id}", params: { document: { content: paragraph_with({ type: "text", text: "gone" }) } }, headers: @headers, as: :json
    get "/api/v1/documents/#{@target.id}/backlinks", headers: @headers
    assert_equal [], response.parsed_body
  end

  test "another space's document is not found" do
    other = User.create!(name: "O", email: "o-backlinks-api@example.com", password: "password123")
    theirs = Document.create!(title: "Theirs", folder: other.workspace.folders.create!(name: "X"), created_by: other)
    get "/api/v1/documents/#{theirs.id}/backlinks", headers: @headers
    assert_response :not_found
  end

  test "signing in is required" do
    get "/api/v1/documents/#{@target.id}/backlinks"
    assert_response :unauthorized
  end
end
