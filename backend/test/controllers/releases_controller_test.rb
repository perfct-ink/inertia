require "test_helper"

class ReleasesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-release-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @song = Document.create!(title: "Song", folder: @user.workspace.folders.create!(name: "Songs"), created_by: @user)
    @user.workspace.tasks.create!(title: "Record", document: @song)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "create a release, add a song, list its tasks, remove the song" do
    post "/api/v1/releases", params: { release: { title: "Single", kind: "single", release_date: "2026-12-01" } }, headers: @headers, as: :json
    assert_response :created
    id = response.parsed_body["id"]

    post "/api/v1/releases/#{id}/documents", params: { document_id: @song.id }, headers: @headers, as: :json
    assert_response :created
    assert_equal [ @song.id ], response.parsed_body["document_ids"]
    assert_equal 1, response.parsed_body["tasks_count"]

    get "/api/v1/releases/#{id}/tasks", headers: @headers
    assert_equal [ "Record" ], response.parsed_body.map { |t| t["title"] }

    post "/api/v1/releases/#{id}/documents", params: { document_id: @song.id }, headers: @headers, as: :json
    assert_response :unprocessable_entity

    delete "/api/v1/releases/#{id}/documents/#{@song.id}", headers: @headers
    assert_response :success
    assert_equal [], response.parsed_body["document_ids"]
  end

  test "update, validate and delete" do
    release = @user.workspace.releases.create!(title: "EP")
    patch "/api/v1/releases/#{release.id}", params: { release: { title: "" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    patch "/api/v1/releases/#{release.id}", params: { release: { kind: "album" } }, headers: @headers, as: :json
    assert_equal "album", response.parsed_body["kind"]
    delete "/api/v1/releases/#{release.id}", headers: @headers
    assert_response :no_content
  end

  test "another space's release and documents are not found" do
    other = User.create!(name: "O", email: "o-release-api@example.com", password: "password123")
    theirs = other.workspace.releases.create!(title: "Theirs")
    patch "/api/v1/releases/#{theirs.id}", params: { release: { title: "x" } }, headers: @headers, as: :json
    assert_response :not_found
    mine = @user.workspace.releases.create!(title: "Mine")
    foreign = Document.create!(title: "F", folder: other.workspace.folders.create!(name: "X"), created_by: other)
    post "/api/v1/releases/#{mine.id}/documents", params: { document_id: foreign.id }, headers: @headers, as: :json
    assert_response :not_found
  end
end
