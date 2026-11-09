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
    assert_equal({ "type" => "document", "id" => @spec.id, "path" => "/product/feature-folders/requirements", "moved" => false }, response.parsed_body.except("workspace"))
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

  # The address does not name a Space: these cover finding the item in another
  # Space the person belongs to, and never beyond.

  def shared_space(name, folder: "Handbook", document: "Onboarding", role: :viewer, owner_email: nil)
    owner = User.create!(name: "#{name} owner", email: owner_email || "paths-#{name.parameterize}@example.com", password: "password123")
    space = Workspace.create!(name: name, user: owner)
    space.memberships.create!(user: @user, role: role) if role
    handbook = space.folders.create!(name: folder)
    handbook.documents.create!(title: document, created_by: owner)
    space
  end

  test "a path in another Space the person belongs to opens there, and says which Space" do
    team = shared_space("Studio")

    lookup "handbook/onboarding"

    assert_response :success
    body = response.parsed_body
    assert_equal "document", body["type"]
    assert_equal "/handbook/onboarding", body["path"]
    assert_not body["moved"]
    assert_equal({ "id" => team.id, "name" => "Studio", "personal" => false, "role" => "viewer", "root_folder_id" => team.reload.root_folder_id }, body["workspace"])
    assert_equal team.folders.find_by(slug: "handbook").documents.first.id, body["id"]
  end

  test "the Space in the answer is the Space the item is in, also for the current one" do
    lookup "product"
    assert_response :success
    assert_equal @workspace.id, response.parsed_body.dig("workspace", "id")
    assert_equal true, response.parsed_body.dig("workspace", "personal")
  end

  test "a Space reached only through a team counts" do
    space = shared_space("Agency", role: nil)
    space.teams.create!(name: "Design", role: :member).memberships.create!(user: @user)

    lookup "handbook/onboarding"

    assert_response :success
    assert_equal space.id, response.parsed_body.dig("workspace", "id")
    assert_equal "member", response.parsed_body.dig("workspace", "role")
  end

  test "an old path in another Space redirects there" do
    space = shared_space("Studio")
    space.folders.find_by(slug: "handbook").update!(name: "Guide")

    lookup "handbook/onboarding"

    assert_response :success
    assert_equal "/guide/onboarding", response.parsed_body["path"]
    assert response.parsed_body["moved"]
    assert_equal space.id, response.parsed_body.dig("workspace", "id")
  end

  test "when two Spaces hold the same path the current Space wins" do
    other = shared_space("Studio", folder: "Product", document: "Roadmap")

    lookup "product"
    assert_equal @workspace.id, response.parsed_body.dig("workspace", "id")

    lookup "product", headers: @headers.merge("X-Workspace-Id" => other.id.to_s)
    assert_response :success
    assert_equal other.id, response.parsed_body.dig("workspace", "id")
    assert_equal other.folders.find_by(slug: "product").id, response.parsed_body["id"]
  end

  test "when the current Space does not hold the path, the lowest Space id among the others wins" do
    first = shared_space("First")
    second = shared_space("Second")
    assert_operator first.id, :<, second.id

    lookup "handbook/onboarding"
    assert_equal first.id, response.parsed_body.dig("workspace", "id")

    lookup "handbook/onboarding", headers: @headers.merge("X-Workspace-Id" => second.id.to_s)
    assert_equal second.id, response.parsed_body.dig("workspace", "id")
  end

  test "a path in a Space the person does not belong to is the same 404 as a path that names nothing" do
    stranger = shared_space("Private", folder: "Secret", document: "Plan", role: nil)

    lookup "secret/plan"
    secret_status = response.status
    secret_body = response.body
    lookup "nothing/plan"

    assert_response :not_found
    assert_equal 404, secret_status
    assert_equal response.body, secret_body

    # Naming that Space in the header gives the same answer too.
    lookup "secret/plan", headers: @headers.merge("X-Workspace-Id" => stranger.id.to_s)
    assert_response :not_found
    assert_equal response.body, secret_body
  end

  test "a Space the person left no longer answers" do
    space = shared_space("Studio")
    lookup "handbook/onboarding"
    assert_response :success

    space.memberships.find_by(user: @user).destroy!

    lookup "handbook/onboarding"
    assert_response :not_found
  end
end
