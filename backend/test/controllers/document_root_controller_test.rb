require "test_helper"

class DocumentRootControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Root API", email: "root-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @root = @user.workspace.root_folder
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "workspace exposes its root and nested folders through the existing tree" do
    folder = @user.workspace.folders.create!(name: "Project", pinned: true)
    get "/api/v1/workspace", headers: @headers
    assert_response :success
    data = response.parsed_body
    assert_equal @root.id, data["root_folder_id"]
    assert_equal 1, data["folders"].size
    assert data["folders"].first["root"]
    assert_equal folder.id, data["folders"].first["children"].first["id"]
  end

  test "create documents sheets and tables in root and create folders beneath it" do
    %w[document spreadsheet table].each do |type|
      post "/api/v1/folders/#{@root.id}/documents", params: { document: { title: "New #{type}", doc_type: type } }, headers: @headers, as: :json
      assert_response :created
      assert_equal @root.id, response.parsed_body["folder_id"]
    end
    post "/api/v1/folders", params: { folder: { name: "Project" } }, headers: @headers, as: :json
    assert_response :created
    assert_equal @root.id, response.parsed_body["parent_id"]
  end

  test "root cannot be deleted archived or moved and cross-workspace parents are rejected" do
    delete "/api/v1/folders/#{@root.id}", headers: @headers
    assert_response :unprocessable_entity
    patch "/api/v1/folders/#{@root.id}", params: { folder: { archived: true } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    folder = @user.workspace.folders.create!(name: "Project")
    patch "/api/v1/folders/#{@root.id}", params: { folder: { parent_id: folder.id } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    other = User.create!(name: "Other", email: "other-root-api@example.com", password: "password123")
    patch "/api/v1/folders/#{folder.id}", params: { folder: { parent_id: other.workspace.root_folder_id } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal @root.id, folder.reload.parent_id
  end
end
