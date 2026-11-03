require "test_helper"

class SpaceTransferControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Ada", email: "transfer-api@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @user)
    @folder = @user.workspace.folders.create!(name: "Plans")
    @document = @folder.documents.create!(title: "Plan", created_by: @user)
    @team_root = @team.root_folder
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}" }
  end

  def space_with_role(role, name: "Shared")
    owner = User.create!(name: "#{name} owner", email: "#{name.parameterize}-owner@example.com", password: "password123")
    space = Workspace.create!(name: name, user: owner)
    space.memberships.create!(user: @user, role: role)
    space
  end

  test "copying a document returns the copy and its Space and keeps the original" do
    post "/api/v1/documents/#{@document.id}/copy", params: { target_folder_id: @team_root.id }, headers: headers_for(@user), as: :json

    assert_response :created
    body = response.parsed_body
    assert_equal @team.id, body["workspace_id"]
    assert_equal @team_root.id, body["document"]["folder_id"]
    assert_equal "Plan", body["document"]["title"]
    assert_equal @folder, @document.reload.folder
    assert_equal 2, Document.where(title: "Plan").count
  end

  test "moving a document puts it in the other Space" do
    post "/api/v1/documents/#{@document.id}/move", params: { target_folder_id: @team_root.id }, headers: headers_for(@user), as: :json

    assert_response :success
    assert_equal @team.id, response.parsed_body["workspace_id"]
    assert_equal @team_root, @document.reload.folder
  end

  test "moving a document within its own Space is rejected" do
    post "/api/v1/documents/#{@document.id}/move", params: { target_folder_id: @user.workspace.root_folder_id }, headers: headers_for(@user), as: :json

    assert_response :unprocessable_entity
    assert_equal @folder, @document.reload.folder
  end

  test "the destination folder is required" do
    post "/api/v1/documents/#{@document.id}/copy", headers: headers_for(@user), as: :json

    assert_response :bad_request
  end

  test "a destination in a Space the user can only read is forbidden" do
    viewer_space = space_with_role(:viewer)

    post "/api/v1/documents/#{@document.id}/copy", params: { target_folder_id: viewer_space.root_folder_id }, headers: headers_for(@user), as: :json

    assert_response :forbidden
    assert_equal 1, Document.where(title: "Plan").count
  end

  test "a destination in a Space the user does not belong to is not found" do
    stranger = User.create!(name: "Stranger", email: "transfer-stranger-api@example.com", password: "password123")

    post "/api/v1/documents/#{@document.id}/copy", params: { target_folder_id: stranger.workspace.root_folder_id }, headers: headers_for(@user), as: :json

    assert_response :not_found
  end

  test "a document in a Space the user can only read cannot be copied or moved out" do
    viewer_space = space_with_role(:viewer)
    readable = viewer_space.root_folder.documents.create!(title: "Read only", created_by: viewer_space.user)

    post "/api/v1/documents/#{readable.id}/copy", params: { target_folder_id: @team_root.id }, headers: headers_for(@user), as: :json
    assert_response :forbidden
    post "/api/v1/documents/#{readable.id}/move", params: { target_folder_id: @team_root.id }, headers: headers_for(@user), as: :json
    assert_response :forbidden
  end

  test "a Collection linked to another can't be moved alone and says why" do
    companies = @folder.documents.create!(title: "Companies", doc_type: :table, created_by: @user)
    contacts = @folder.documents.create!(title: "Contacts", doc_type: :table, created_by: @user)
    contacts.table_fields.create!(name: "Company", data_type: "relation", relation_table: companies)

    post "/api/v1/documents/#{contacts.id}/move", params: { target_folder_id: @team_root.id }, headers: headers_for(@user), as: :json

    assert_response :unprocessable_entity
    assert_equal [ SpaceTransfer::LINKED_COLLECTION ], response.parsed_body["errors"]
    assert_equal @folder, contacts.reload.folder
  end

  test "copying a folder returns the new folder and its Space" do
    @folder.documents.create!(title: "Spec", created_by: @user)

    post "/api/v1/folders/#{@folder.id}/copy", params: { target_folder_id: @team_root.id }, headers: headers_for(@user), as: :json

    assert_response :created
    body = response.parsed_body
    assert_equal @team.id, body["workspace_id"]
    assert_equal "Plans", body["folder"]["name"]
    assert_equal @team_root.id, body["folder"]["parent_id"]
    assert_equal %w[Plan Spec], Folder.find(body["folder"]["id"]).documents.map(&:title).sort
    assert_equal @user.workspace, @folder.reload.workspace
  end

  test "moving a folder puts it and its documents in the other Space" do
    post "/api/v1/folders/#{@folder.id}/move", params: { target_folder_id: @team_root.id }, headers: headers_for(@user), as: :json

    assert_response :success
    assert_equal @team.id, response.parsed_body["workspace_id"]
    assert_equal [ @team, @team_root ], [ @folder.reload.workspace, @folder.parent ]
    assert_equal @folder, @document.reload.folder
  end

  test "moving a folder detaches the tasks attached to it directly" do
    loose = @user.workspace.tasks.create!(title: "Loose", folder: @folder)

    post "/api/v1/folders/#{@folder.id}/move", params: { target_folder_id: @team_root.id }, headers: headers_for(@user), as: :json

    assert_response :success
    assert_equal @team, @folder.reload.workspace
    assert_equal [ @user.workspace.id, nil ], loose.reload.slice(:workspace_id, :folder_id).values
  end

  test "moving a project that has allocations is rejected and says why" do
    project = @user.workspace.folders.create!(name: "Messages", kind: :project)
    @user.workspace.resource_allocations.create!(user: @user, folder: project, hours_per_week: 8)

    post "/api/v1/folders/#{project.id}/move", params: { target_folder_id: @team_root.id }, headers: headers_for(@user), as: :json

    assert_response :unprocessable_entity
    assert_match(/resource allocations/, response.parsed_body["errors"].first)
    assert_equal @user.workspace, project.reload.workspace
  end

  test "a folder's attached records are counted before it moves or copies" do
    @user.workspace.tasks.create!(title: "Loose", folder: @folder)
    @user.workspace.tasks.create!(title: "From the doc", document: @document, folder: @folder)
    @user.workspace.events.create!(title: "Launch", date: Date.new(2026, 12, 1), folder: @folder)

    get "/api/v1/folders/#{@folder.id}/attached_records", headers: headers_for(@user)

    assert_response :success
    assert_equal({ "detach" => { "tasks" => 1, "events" => 1 }, "blocked" => {} }, response.parsed_body)
  end

  test "another Space's folder has no attached records to read" do
    stranger = User.create!(name: "Stranger", email: "transfer-attached-api@example.com", password: "password123")

    get "/api/v1/folders/#{@folder.id}/attached_records", headers: headers_for(stranger)

    assert_response :not_found
  end

  test "the Root folder can't be moved to another Space" do
    root = @user.workspace.root_folder

    post "/api/v1/folders/#{root.id}/move", params: { target_folder_id: @team_root.id }, headers: headers_for(@user), as: :json

    assert_response :unprocessable_entity
  end

  test "a Space's active folders can be listed from another Space" do
    archived = @team.folders.create!(name: "Old")
    archived.archive!
    nested = @team.folders.create!(name: "Nested", parent: @team.folders.create!(name: "Top"))

    get "/api/v1/workspaces/#{@team.id}/folders", headers: headers_for(@user)

    assert_response :success
    names = response.parsed_body.map { |folder| folder["name"] }
    assert_includes names, "Nested"
    assert_not_includes names, "Old"
    root = response.parsed_body.find { |folder| folder["root"] }
    assert_equal @team_root.id, root["id"]
    assert_equal "Top", response.parsed_body.find { |folder| folder["id"] == nested.parent_id }["name"]
  end

  test "another Space's folders can't be listed without belonging to it" do
    stranger = User.create!(name: "Stranger", email: "transfer-list-api@example.com", password: "password123")

    get "/api/v1/workspaces/#{stranger.workspace.id}/folders", headers: headers_for(@user)

    assert_response :not_found
  end
end
