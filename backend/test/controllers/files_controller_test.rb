require "test_helper"
require "tempfile"

class FilesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-files-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @folder = @user.workspace.folders.create!(name: "Assets")
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def upload(name, type, content = "hello")
    file = Tempfile.new([ File.basename(name, ".*"), File.extname(name) ])
    file.write(content)
    file.rewind
    Rack::Test::UploadedFile.new(file.path, type, original_filename: name)
  end

  test "uploading any type creates a file item in the folder with its details" do
    post "/api/v1/folders/#{@folder.id}/files", params: { file: upload("notes.pdf", "application/pdf", "%PDF-1.4") }, headers: @headers
    assert_response :created
    body = response.parsed_body
    assert_equal [ "notes.pdf", "file", @folder.id ], [ body["title"], body["doc_type"], body["folder_id"] ]
    assert_equal [ "notes.pdf", "application/pdf", 8 ], body["file"].values_at("filename", "content_type", "byte_size")
    assert body["file"]["url"].start_with?("/rails/active_storage/")
    assert_equal [ body["id"] ], @folder.documents.where(doc_type: :file).pluck(:id)
  end

  test "an upload without a file is rejected" do
    post "/api/v1/folders/#{@folder.id}/files", params: {}, headers: @headers
    assert_response :unprocessable_entity
  end

  test "another space's folder is not found" do
    other = User.create!(name: "O", email: "o-files-api@example.com", password: "password123")
    theirs = other.workspace.folders.create!(name: "Theirs")
    post "/api/v1/folders/#{theirs.id}/files", params: { file: upload("a.txt", "text/plain") }, headers: @headers
    assert_response :not_found
  end

  test "a file item can be renamed and deleted like any document" do
    post "/api/v1/folders/#{@folder.id}/files", params: { file: upload("a.txt", "text/plain") }, headers: @headers
    id = response.parsed_body["id"]
    patch "/api/v1/documents/#{id}", params: { document: { title: "Renamed.txt" } }, headers: @headers, as: :json
    assert_equal "Renamed.txt", response.parsed_body["title"]
    delete "/api/v1/documents/#{id}", headers: @headers
    assert_response :no_content
  end
end
