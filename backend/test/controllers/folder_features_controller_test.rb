require "test_helper"

class FolderFeaturesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-folder-features@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @workspace = @user.workspace
    @project = @workspace.folders.create!(name: "Messages", kind: :project)
    @features = @workspace.folders.create!(name: "Features", kind: :feature, parent: @project)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "the project's features come back nested with rollups" do
    parent = Document.create!(title: "Images", folder: @features, created_by: @user)
    child = Document.create!(title: "Upload", folder: @features, created_by: @user, parent_feature: parent)
    @workspace.tasks.create!(title: "t", document: child, status: :done)

    get "/api/v1/folders/#{@project.id}/features", headers: @headers
    assert_response :success
    assert_equal [ [ "Images", 0, 1, 1, "done" ], [ "Upload", 1, 1, 1, "done" ] ],
                 response.parsed_body.map { |r| [ r["title"], r["depth"], r["tasks_count"], r["done_tasks_count"], r["status"] ] }
  end

  test "feature fields can be set through the document update" do
    parent = Document.create!(title: "Images", folder: @features, created_by: @user)
    child = Document.create!(title: "Upload", folder: @features, created_by: @user)
    patch "/api/v1/documents/#{child.id}", params: { document: { parent_feature_id: parent.id, feature_status: "active", feature_owner_id: @user.id } }, headers: @headers, as: :json
    assert_response :success
    assert_equal [ parent.id, "active", @user.id ], response.parsed_body.values_at("parent_feature_id", "feature_status", "feature_owner_id")

    patch "/api/v1/documents/#{parent.id}", params: { document: { parent_feature_id: child.id } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "another space's folder is not found" do
    other = User.create!(name: "O", email: "o-folder-features@example.com", password: "password123")
    theirs = other.workspace.folders.create!(name: "Theirs", kind: :project)
    get "/api/v1/folders/#{theirs.id}/features", headers: @headers
    assert_response :not_found
  end
end
