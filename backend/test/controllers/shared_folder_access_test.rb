require "test_helper"
require_relative "../support/folder_sharing_setup"

# What a person invited to a folder (and not a member of its Space) can read and
# change, role by role, and that nothing outside the folder is reachable.
class SharedFolderAccessTest < ActionDispatch::IntegrationTest
  include FolderSharingSetup

  def as_guest_with(role)
    invite(@guest, role)
    headers_for(@guest)
  end

  # -- Shared with me ---------------------------------------------------------

  test "shared with me lists the folder with its tree, role, Space and inviter" do
    invite(@guest, :commenter)
    get "/api/v1/shared_folders", headers: headers_for(@guest)
    assert_response :success
    entry = response.parsed_body.sole
    assert_equal [ "commenter", "Owner" ], entry.values_at("role", "invited_by")
    assert_equal [ @team.id, "Team" ], entry["space"].values_at("id", "name")
    assert_equal "Launch", entry["folder"]["name"]
    assert_equal [ "Plans" ], entry["folder"]["children"].map { |f| f["name"] }
    assert_equal [ "Brief" ], entry["folder"]["documents"].map { |d| d["title"] }
  end

  test "shared with me is empty without invitations and never lists Spaces the user belongs to" do
    get "/api/v1/shared_folders", headers: headers_for(@stranger)
    assert_response :success
    assert_equal [], response.parsed_body

    get "/api/v1/shared_folders", headers: headers_for(@member)
    assert_equal [], response.parsed_body
  end

  test "shared with me requires signing in" do
    get "/api/v1/shared_folders"
    assert_response :unauthorized
  end

  # -- Folder page ------------------------------------------------------------

  test "the folder page opens the shared folder with its subtree and the role held" do
    headers = as_guest_with(:viewer)
    get "/api/v1/folders/#{@launch.id}/contents", headers: headers
    assert_response :success
    body = response.parsed_body
    assert_equal [ "Brief", "Plan" ], body["documents"].map { |d| d["title"] }.sort
    assert_equal [ "Book venue", "Write brief" ], body["tasks"].map { |t| t["title"] }.sort
    assert_equal({ "source" => "folder", "role" => "viewer", "can_write" => false, "can_share" => false }, body["access"])
  end

  test "a subfolder of the share opens too, and a folder outside it does not" do
    headers = as_guest_with(:viewer)
    get "/api/v1/folders/#{@plans.id}/contents", headers: headers
    assert_response :success
    assert_equal [ "Plan" ], response.parsed_body["documents"].map { |d| d["title"] }

    get "/api/v1/folders/#{@private.id}/contents", headers: headers
    assert_response :not_found
    get "/api/v1/folders/#{@team.root_folder.id}/contents", headers: headers
    assert_response :not_found
  end

  test "without an invitation the folder is not found" do
    get "/api/v1/folders/#{@launch.id}/contents", headers: headers_for(@stranger)
    assert_response :not_found
  end

  test "a Space member's folder page reports their Space role" do
    get "/api/v1/folders/#{@launch.id}/contents", headers: headers_for(@admin).merge("X-Workspace-Id" => @team.id.to_s)
    assert_response :success
    assert_equal({ "source" => "space", "role" => "admin", "can_write" => true, "can_share" => true }, response.parsed_body["access"])
  end

  # -- Folder access (what the collab server asks before a live folder room) ---

  test "folder access says what the invitation allows, on the folder and below it" do
    headers = as_guest_with(:editor)
    [ @launch, @plans ].each do |folder|
      get "/api/v1/folders/#{folder.id}/access", headers: headers
      assert_response :success
      body = response.parsed_body
      assert_equal [ folder.id, folder.name, @team.id ], body.values_at("id", "name", "workspace_id")
      assert_equal({ "source" => "folder", "role" => "editor", "can_write" => true, "can_share" => false }, body["access"])
    end
  end

  test "folder access is not found outside the share, without an invitation and for the Root" do
    headers = as_guest_with(:viewer)
    get "/api/v1/folders/#{@private.id}/access", headers: headers
    assert_response :not_found
    get "/api/v1/folders/#{@team.root_folder.id}/access", headers: headers
    assert_response :not_found
    get "/api/v1/folders/#{@launch.id}/access", headers: headers_for(@stranger)
    assert_response :not_found
  end

  test "folder access needs no Space header for a member and reports their Space role" do
    get "/api/v1/folders/#{@private.id}/access", headers: headers_for(@member)
    assert_response :success
    assert_equal({ "source" => "space", "role" => "member", "can_write" => true, "can_share" => false }, response.parsed_body["access"])
  end

  test "folder access stops when the invitation is removed, and needs a signed-in user" do
    invitation = invite(@guest, :viewer)
    get "/api/v1/folders/#{@launch.id}/access", headers: headers_for(@guest)
    assert_response :success
    invitation.destroy!
    get "/api/v1/folders/#{@launch.id}/access", headers: headers_for(@guest)
    assert_response :not_found
    get "/api/v1/folders/#{@launch.id}/access"
    assert_response :unauthorized
  end

  test "guests cannot rename, archive, delete, copy or move shared folders" do
    headers = as_guest_with(:owner)
    patch "/api/v1/folders/#{@launch.id}", params: { folder: { name: "Mine" } }, headers: headers, as: :json
    assert_response :not_found
    delete "/api/v1/folders/#{@plans.id}", headers: headers
    assert_response :not_found
    post "/api/v1/folders/#{@plans.id}/copy", params: { target_folder_id: @guest.workspace.root_folder.id }, headers: headers, as: :json
    assert_response :not_found
    assert_equal [ "Launch", "Plans" ], [ @launch.reload.name, @plans.reload.name ]
  end

  test "an editor adds a subfolder with a name only, a viewer cannot" do
    viewer_headers = as_guest_with(:viewer)
    post "/api/v1/folders", params: { folder: { name: "Drafts", parent_id: @launch.id } }, headers: viewer_headers, as: :json
    assert_response :forbidden

    FolderMembership.where(user: @guest).update_all(role: FolderMembership.roles[:editor])
    post "/api/v1/folders", params: { folder: { name: "Drafts", parent_id: @plans.id, kind: "project", pinned: true } }, headers: viewer_headers, as: :json
    assert_response :created
    folder = Folder.find(response.parsed_body["id"])
    assert_equal [ @team.id, @plans.id, "folder", false ], [ folder.workspace_id, folder.parent_id, folder.kind, folder.pinned ]

    post "/api/v1/folders", params: { folder: { name: "Sneaky", parent_id: @private.id } }, headers: viewer_headers, as: :json
    assert_not Folder.exists?(name: "Sneaky"), "a folder outside the share must not be created"
    assert_response :unprocessable_entity
  end

  # -- Documents --------------------------------------------------------------

  test "every role reads documents in the folder and below, and sees whether it may edit" do
    { "viewer" => false, "commenter" => false, "editor" => true, "owner" => true }.each do |role, can_edit|
      user = make_user("Reader#{role}")
      invite(user, role)
      get "/api/v1/documents/#{@brief.id}", headers: headers_for(user)
      assert_response :success, role
      assert_equal can_edit, response.parsed_body["can_edit"], role
      get "/api/v1/documents/#{@plan_doc.id}", headers: headers_for(user)
      assert_response :success, role
    end
  end

  test "documents outside the shared folder are not found" do
    headers = as_guest_with(:owner)
    get "/api/v1/documents/#{@secret.id}", headers: headers
    assert_response :not_found
    get "/api/v1/folders/#{@private.id}/documents", headers: headers
    assert_response :not_found
    patch "/api/v1/documents/#{@secret.id}", params: { document: { title: "x" } }, headers: headers, as: :json
    assert_response :not_found
    assert_equal "Secret", @secret.reload.title
  end

  test "a stranger cannot read any document in the Space" do
    get "/api/v1/documents/#{@brief.id}", headers: headers_for(@stranger)
    assert_response :not_found
  end

  test "viewers and commenters cannot create, edit or delete documents" do
    %i[viewer commenter].each do |role|
      user = make_user("Limited#{role}")
      invite(user, role)
      headers = headers_for(user)
      post "/api/v1/folders/#{@launch.id}/documents", params: { document: { title: "New" } }, headers: headers, as: :json
      assert_response :forbidden, role
      patch "/api/v1/documents/#{@brief.id}", params: { document: { title: "Changed" } }, headers: headers, as: :json
      assert_response :forbidden, role
      delete "/api/v1/documents/#{@brief.id}", headers: headers
      assert_response :forbidden, role
    end
    assert_equal "Brief", @brief.reload.title
  end

  test "an editor creates, edits and deletes documents in the folder and below" do
    headers = as_guest_with(:editor)
    post "/api/v1/folders/#{@plans.id}/documents", params: { document: { title: "Draft", doc_type: "spreadsheet" } }, headers: headers, as: :json
    assert_response :created
    draft = Document.find(response.parsed_body["id"])
    assert_equal [ @plans.id, @guest.id, "spreadsheet" ], [ draft.folder_id, draft.created_by_id, draft.doc_type ]

    patch "/api/v1/documents/#{@brief.id}", params: { document: { title: "Brief v2", content: { type: "doc" } } }, headers: headers, as: :json
    assert_response :success
    assert_equal "Brief v2", @brief.reload.title

    delete "/api/v1/documents/#{draft.id}", headers: headers
    assert_response :no_content
  end

  test "an editor cannot pin a document, move it out of the share or copy it out" do
    headers = as_guest_with(:editor)
    patch "/api/v1/documents/#{@brief.id}", params: { document: { pinned: true, folder_id: @private.id } }, headers: headers, as: :json
    assert_response :success
    @brief.reload
    assert_equal [ false, @launch.id ], [ @brief.pinned, @brief.folder_id ]

    post "/api/v1/documents/#{@brief.id}/copy", params: { target_folder_id: @guest.workspace.root_folder.id }, headers: headers, as: :json
    assert_response :not_found
    post "/api/v1/documents/#{@brief.id}/move", params: { target_folder_id: @guest.workspace.root_folder.id }, headers: headers, as: :json
    assert_response :not_found
    assert_equal @launch.id, @brief.reload.folder_id
  end

  test "an editor cannot create a document in another folder by passing its id" do
    headers = as_guest_with(:editor)
    post "/api/v1/folders/#{@launch.id}/documents", params: { document: { title: "Planted", folder_id: @private.id } }, headers: headers, as: :json
    assert_response :created
    assert_equal @launch.id, Document.find_by!(title: "Planted").folder_id
  end

  test "a Space viewer reads documents but is told they are read-only" do
    @team.memberships.create!(user: @stranger, role: :viewer)
    get "/api/v1/documents/#{@brief.id}", headers: headers_for(@stranger)
    assert_response :success
    assert_equal false, response.parsed_body["can_edit"]
    patch "/api/v1/documents/#{@brief.id}", params: { document: { title: "x" } }, headers: headers_for(@stranger), as: :json
    assert_response :forbidden
  end

  test "a Space member edits as before" do
    get "/api/v1/documents/#{@brief.id}", headers: headers_for(@member)
    assert_equal true, response.parsed_body["can_edit"]
    patch "/api/v1/documents/#{@brief.id}", params: { document: { pinned: true } }, headers: headers_for(@member), as: :json
    assert_response :success
    assert @brief.reload.pinned
  end

  test "removing the invitation removes the access at once" do
    membership = invite(@guest, :editor)
    get "/api/v1/documents/#{@brief.id}", headers: headers_for(@guest)
    assert_response :success
    membership.destroy!
    get "/api/v1/documents/#{@brief.id}", headers: headers_for(@guest)
    assert_response :not_found
  end

  # -- Collections ------------------------------------------------------------

  test "an editor edits a collection in the folder, a viewer only reads it" do
    table = @plans.documents.create!(title: "Venues", doc_type: :table, created_by: @owner)
    field = table.table_fields.create!(name: "Capacity", data_type: "integer")

    viewer = make_user("TableViewer")
    invite(viewer, :viewer)
    get "/api/v1/tables/#{table.id}", headers: headers_for(viewer)
    assert_response :success
    post "/api/v1/tables/#{table.id}/records", params: { record: { values: { field.id.to_s => 5 } } }, headers: headers_for(viewer), as: :json
    assert_response :forbidden

    headers = as_guest_with(:editor)
    post "/api/v1/tables/#{table.id}/records", params: { record: { values: { field.id.to_s => 5 } } }, headers: headers, as: :json
    assert_response :success
    assert_equal [ 5 ], response.parsed_body["records"].map { |r| r["values"][field.id.to_s] }
  end

  test "collections outside the folder are not found, and a relation cannot point outside the share" do
    outside = @private.documents.create!(title: "Hidden", doc_type: :table, created_by: @owner)
    table = @plans.documents.create!(title: "Venues", doc_type: :table, created_by: @owner)
    headers = as_guest_with(:editor)

    get "/api/v1/tables/#{outside.id}", headers: headers
    assert_response :not_found

    post "/api/v1/tables/#{table.id}/fields", params: { field: { name: "Link", data_type: "relation", relation_table_id: outside.id } }, headers: headers, as: :json
    assert_response :unprocessable_entity
    assert_empty table.table_fields

    inside = @launch.documents.create!(title: "Inside", doc_type: :table, created_by: @owner)
    post "/api/v1/tables/#{table.id}/fields", params: { field: { name: "Link", data_type: "relation", relation_table_id: inside.id } }, headers: headers, as: :json
    assert_response :success
  end

  # -- Files ------------------------------------------------------------------

  test "an editor uploads a file into the folder, a viewer cannot" do
    file = Rack::Test::UploadedFile.new(StringIO.new("hello"), "text/plain", original_filename: "notes.txt")
    viewer = make_user("FileViewer")
    invite(viewer, :viewer)
    post "/api/v1/folders/#{@launch.id}/files", params: { file: file }, headers: headers_for(viewer)
    assert_response :forbidden

    headers = as_guest_with(:editor)
    post "/api/v1/folders/#{@launch.id}/files", params: { file: Rack::Test::UploadedFile.new(StringIO.new("hello"), "text/plain", original_filename: "notes.txt") }, headers: headers
    assert_response :created
    assert_equal [ "notes.txt", "file", @launch.id ], response.parsed_body.values_at("title", "doc_type", "folder_id")

    post "/api/v1/folders/#{@private.id}/files", params: { file: Rack::Test::UploadedFile.new(StringIO.new("hello"), "text/plain", original_filename: "x.txt") }, headers: headers
    assert_response :not_found
  end

  # -- Tasks ------------------------------------------------------------------

  test "tasks of a shared document are listed from the document's own Space" do
    headers = as_guest_with(:viewer)
    get "/api/v1/documents/#{@brief.id}/tasks", headers: headers
    assert_response :success
    assert_equal [ "Write brief" ], response.parsed_body.map { |t| t["title"] }

    get "/api/v1/documents/#{@secret.id}/tasks", headers: headers
    assert_response :success
    assert_equal [], response.parsed_body, "a document outside the share lists nothing"
  end

  test "an editor updates a task in the share, limited to its own fields" do
    headers = as_guest_with(:editor)
    epic = @team.epics.create!(title: "Epic")
    patch "/api/v1/tasks/#{@brief_task.id}", params: { task: { status: "done", title: "Brief written", epic_id: epic.id, folder_id: @private.id, assignee_id: @owner.id } }, headers: headers, as: :json
    assert_response :success
    task = @brief_task.reload
    assert_equal [ "done", "Brief written", nil, nil, nil ], [ task.status, task.title, task.epic_id, task.folder_id, task.assignee_id ]

    patch "/api/v1/tasks/#{@folder_task.id}", params: { task: { due_date: "2026-12-01" } }, headers: headers, as: :json
    assert_response :success
    assert_equal "2026-12-01", @folder_task.reload.due_date.to_s
  end

  test "tasks outside the share are not found" do
    headers = as_guest_with(:owner)
    patch "/api/v1/tasks/#{@secret_task.id}", params: { task: { status: "done" } }, headers: headers, as: :json
    assert_response :not_found
    delete "/api/v1/tasks/#{@secret_task.id}", headers: headers
    assert_response :not_found
    assert_equal "backlog", @secret_task.reload.status
  end

  test "viewers and commenters cannot change tasks" do
    %i[viewer commenter].each do |role|
      user = make_user("TaskLimited#{role}")
      invite(user, role)
      patch "/api/v1/tasks/#{@brief_task.id}", params: { task: { status: "done" } }, headers: headers_for(user), as: :json
      assert_response :forbidden, role
      delete "/api/v1/tasks/#{@brief_task.id}", headers: headers_for(user)
      assert_response :forbidden, role
      post "/api/v1/documents/#{@brief.id}/tasks", params: { task: { title: "New" } }, headers: headers_for(user), as: :json
      assert_response :forbidden, role
    end
    assert_equal "backlog", @brief_task.reload.status
  end

  test "an editor creates tasks in a shared document or folder, in that Space" do
    headers = as_guest_with(:editor)
    post "/api/v1/documents/#{@brief.id}/tasks", params: { task: { title: "Proofread", status: "backlog", epic_id: 1 } }, headers: headers, as: :json
    assert_response :created
    task = Task.find(response.parsed_body["id"])
    assert_equal [ @team.id, @brief.id, nil ], [ task.workspace_id, task.document_id, task.epic_id ]

    post "/api/v1/tasks", params: { task: { title: "Order food", folder_id: @plans.id } }, headers: headers, as: :json
    assert_response :created
    assert_equal [ @team.id, @plans.id ], Task.find(response.parsed_body["id"]).then { |t| [ t.workspace_id, t.folder_id ] }
    assert_empty @guest.workspace.tasks, "nothing is created in the guest's own Space"
  end

  test "an editor cannot create a task in a document or folder outside the share" do
    headers = as_guest_with(:editor)
    post "/api/v1/documents/#{@secret.id}/tasks", params: { task: { title: "Planted" } }, headers: headers, as: :json
    assert_response :not_found
    assert_not Task.exists?(title: "Planted"), "no task may attach to a document the guest cannot see"

    post "/api/v1/tasks", params: { task: { title: "Planted", folder_id: @private.id } }, headers: headers, as: :json
    assert_not Task.exists?(title: "Planted", folder_id: @private.id), "nor to a folder outside the share"
  end

  test "an editor cannot move the dates of a task that has dependencies" do
    other = @team.tasks.create!(title: "After", document: @brief, start_date: "2026-01-05", due_date: "2026-01-08")
    @brief_task.update!(start_date: "2026-01-01", due_date: "2026-01-05")
    TaskDependency.create!(predecessor: @brief_task, successor: other)
    headers = as_guest_with(:editor)

    patch "/api/v1/tasks/#{@brief_task.id}", params: { task: { due_date: "2026-02-01" } }, headers: headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "2026-01-05", @brief_task.reload.due_date.to_s

    patch "/api/v1/tasks/#{@brief_task.id}", params: { task: { status: "in_progress" } }, headers: headers, as: :json
    assert_response :success
  end

  test "a guest's own Space and tasks keep working" do
    invite(@guest, :editor)
    mine = @guest.workspace.tasks.create!(title: "Mine")
    patch "/api/v1/tasks/#{mine.id}", params: { task: { title: "Still mine", epic_id: nil } }, headers: headers_for(@guest), as: :json
    assert_response :success
    assert_equal "Still mine", mine.reload.title
  end

  test "a Space member's task updates are unchanged" do
    patch "/api/v1/tasks/#{@brief_task.id}", params: { task: { status: "done" } }, headers: headers_for(@member).merge("X-Workspace-Id" => @team.id.to_s), as: :json
    assert_response :success
    assert_equal "done", @brief_task.reload.status
  end
end
