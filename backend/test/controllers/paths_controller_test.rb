require "test_helper"

class PathsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Paths API", email: "paths-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @workspace = @user.workspace
    @product = @workspace.folders.create!(name: "Product")
    @features = @workspace.folders.create!(name: "Feature Folders", parent: @product)
    @spec = @features.documents.create!(title: "Requirements", created_by: @user)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def lookup(path, headers: @headers)
    get "/api/v1/paths", params: { path: path }, headers: headers
  end

  test "workspace payload carries slugs for the whole tree" do
    get "/api/v1/workspace", headers: @headers
    assert_response :success
    root = response.parsed_body["folders"].first
    assert_nil root["slug"]
    product = root["children"].first
    assert_equal "product", product["slug"]
    assert_equal "feature-folders", product["children"].first["slug"]
    assert_equal "requirements", product["children"].first["documents"].first["slug"]
  end

  test "a document path resolves to the document" do
    lookup "product/feature-folders/requirements"
    assert_response :success
    assert_equal({ "type" => "document", "id" => @spec.id, "path" => "/product/feature-folders/requirements", "moved" => false }, response.parsed_body)
  end

  test "a folder path resolves to the folder, whatever the case or slashes" do
    lookup "/Product/Feature-Folders/"
    assert_response :success
    assert_equal "folder", response.parsed_body["type"]
    assert_equal @features.id, response.parsed_body["id"]
  end

  test "an unknown path is a JSON 404" do
    lookup "product/nothing-here"
    assert_response :not_found
    assert_equal "Not found", response.parsed_body["error"]
    lookup ""
    assert_response :not_found
  end

  test "a path through a document does not resolve" do
    lookup "product/feature-folders/requirements/more"
    assert_response :not_found
  end

  test "an old path resolves to the item's new path after a rename" do
    @features.update!(name: "Plans")

    lookup "product/feature-folders/requirements"

    assert_response :success
    assert_equal @spec.id, response.parsed_body["id"]
    assert_equal "/product/plans/requirements", response.parsed_body["path"]
    assert response.parsed_body["moved"]
  end

  test "an old path resolves after a move" do
    elsewhere = @workspace.folders.create!(name: "Archive")
    @spec.update!(folder: elsewhere)

    lookup "product/feature-folders/requirements"

    assert_response :success
    assert_equal "/archive/requirements", response.parsed_body["path"]
    assert response.parsed_body["moved"]
  end

  test "paths are looked up only in the selected space" do
    other = User.create!(name: "Other", email: "paths-other@example.com", password: "password123")
    other_headers = { "Authorization" => "Bearer #{Warden::JWTAuth::UserEncoder.new.call(other, :user, nil).first}" }

    lookup "product", headers: other_headers
    assert_response :not_found
  end

  test "a space the user does not belong to is not found" do
    other = User.create!(name: "Other", email: "paths-other2@example.com", password: "password123")
    lookup "product", headers: @headers.merge("X-Workspace-Id" => other.workspace.id.to_s)
    assert_response :not_found
  end

  test "an alias never leads to an item that moved to another space" do
    other = User.create!(name: "Mover", email: "paths-mover@example.com", password: "password123")
    @spec.update!(title: "Renamed")
    @spec.update!(folder: other.workspace.root_folder)

    lookup "product/feature-folders/requirements"

    assert_response :not_found
  end

  test "signing in is required" do
    lookup "product", headers: {}
    assert_response :unauthorized
  end
end
