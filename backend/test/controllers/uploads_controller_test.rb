require "test_helper"

class UploadsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "uploads-owner@example.com", password: "password123")
    @viewer = User.create!(name: "Viewer", email: "uploads-viewer@example.com", password: "password123")
    @member = User.create!(name: "Member", email: "uploads-member@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
    @team.memberships.create!(user: @viewer, role: :viewer)
    @team.memberships.create!(user: @member, role: :member)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: nil)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    headers = { "Authorization" => "Bearer #{token}" }
    headers["X-Workspace-Id"] = workspace.id.to_s if workspace
    headers
  end

  def upload(name, content, type)
    Rack::Test::UploadedFile.new(StringIO.new(content), type, original_filename: name)
  end

  def with_max_size(bytes)
    controller = Api::V1::UploadsController
    original = controller::MAX_SIZE
    silence_warnings { controller.const_set(:MAX_SIZE, bytes) }
    yield
  ensure
    silence_warnings { controller.const_set(:MAX_SIZE, original) }
  end

  test "an audio file is stored and described" do
    song = upload("song.mp3", "ID3\x04\x00\x00\x00\x00\x00\x00#{"x" * 64}", "audio/mpeg")
    post "/api/v1/uploads", params: { file: song }, headers: headers_for(@owner)
    assert_response :success
    body = response.parsed_body
    assert_equal "song.mp3", body["filename"]
    assert_equal "audio/mpeg", body["content_type"]
    assert_equal 74, body["byte_size"]
    assert_includes body["url"], "/rails/active_storage/blobs/"
    assert_equal 1, ActiveStorage::Blob.where(filename: "song.mp3").count
  end

  test "documents, archives and other types are accepted, not just media" do
    {
      "report.pdf" => [ "%PDF-1.4\n%%EOF", "application/pdf" ],
      "bundle.zip" => [ "PK\x03\x04#{"x" * 32}", "application/zip" ],
      "notes.xyz" => [ "anything at all", "" ]
    }.each do |name, (content, type)|
      post "/api/v1/uploads", params: { file: upload(name, content, type) }, headers: headers_for(@owner)
      assert_response :success, "#{name} should be accepted"
      assert_equal name, response.parsed_body["filename"]
      assert response.parsed_body["content_type"].present?, "#{name} should have a content type"
    end
    assert_equal "application/pdf", ActiveStorage::Blob.find_by!(filename: "report.pdf").content_type
  end

  test "a request without a file is rejected" do
    post "/api/v1/uploads", params: { file: "not a file" }, headers: headers_for(@owner)
    assert_response :unprocessable_entity
    assert_equal "No file provided", response.parsed_body["error"]
  end

  test "a file over the size limit is rejected and not stored" do
    with_max_size(10) do
      assert_no_difference("ActiveStorage::Blob.count") do
        post "/api/v1/uploads", params: { file: upload("big.wav", "x" * 11, "audio/wav") }, headers: headers_for(@owner)
      end
    end
    assert_response :unprocessable_entity
    assert_match(/too large/i, response.parsed_body["error"])
  end

  test "signing in is required" do
    post "/api/v1/uploads", params: { file: upload("song.mp3", "ID3", "audio/mpeg") }
    assert_response :unauthorized
  end

  test "a member of the space can upload and a viewer cannot" do
    post "/api/v1/uploads", params: { file: upload("a.pdf", "%PDF-1.4", "application/pdf") }, headers: headers_for(@member, workspace: @team)
    assert_response :success

    assert_no_difference("ActiveStorage::Blob.count") do
      post "/api/v1/uploads", params: { file: upload("b.pdf", "%PDF-1.4", "application/pdf") }, headers: headers_for(@viewer, workspace: @team)
    end
    assert_response :forbidden
  end
end
