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

  test "lists the documents that link here, updated when a document is saved through the API" do
    get "/api/v1/documents/#{@target.id}/backlinks", headers: @headers
    assert_equal [], response.parsed_body

    content = { type: "doc", content: [ { type: "paragraph", content: [ { type: "documentLink", attrs: { documentId: @target.id } } ] } ] }
    patch "/api/v1/documents/#{@source.id}", params: { document: { content: content } }, headers: @headers, as: :json
    assert_response :success

    get "/api/v1/documents/#{@target.id}/backlinks", headers: @headers
    assert_equal [ "Source" ], response.parsed_body.map { |d| d["title"] }
  end

  test "another space's document is not found" do
    other = User.create!(name: "O", email: "o-backlinks-api@example.com", password: "password123")
    theirs = Document.create!(title: "Theirs", folder: other.workspace.folders.create!(name: "X"), created_by: other)
    get "/api/v1/documents/#{theirs.id}/backlinks", headers: @headers
    assert_response :not_found
  end
end
