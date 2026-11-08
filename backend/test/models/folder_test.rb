require "test_helper"

class FolderTest < ActiveSupport::TestCase
  test "self_and_descendant_ids includes folders nested several levels deep" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    top = user.workspace.folders.create!(name: "Top")
    mid = user.workspace.folders.create!(name: "Mid", parent: top)
    leaf = user.workspace.folders.create!(name: "Leaf", parent: mid)
    unrelated = user.workspace.folders.create!(name: "Unrelated")

    ids = top.self_and_descendant_ids

    assert_includes ids, top.id
    assert_includes ids, mid.id
    assert_includes ids, leaf.id
    assert_not_includes ids, unrelated.id
    assert_equal [ mid.id, leaf.id ].sort, (mid.self_and_descendant_ids).sort
  end

  test "archive! and unarchive! toggle archived? and the active/archived scopes" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    folder = user.workspace.folders.create!(name: "Old project")

    assert_not folder.archived?
    assert_includes Folder.active, folder
    assert_not_includes Folder.archived, folder

    folder.archive!

    assert folder.archived?
    assert_not_includes Folder.active, folder
    assert_includes Folder.archived, folder

    folder.unarchive!
    assert_not folder.archived?
  end

  test "destroying a folder nullifies its tasks and epics instead of destroying them" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    folder = user.workspace.folders.create!(name: "Project")
    task = user.workspace.tasks.create!(title: "Direct task", folder: folder)
    epic = user.workspace.epics.create!(title: "Direct epic", folder: folder)

    folder.destroy

    assert_nil task.reload.folder_id
    assert_nil epic.reload.folder_id
  end

  test "a folder can be a project, but the document root cannot" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    project = user.workspace.folders.create!(name: "Messages", kind: :project)

    assert project.project?
    assert_equal user.workspace.root_folder_id, project.parent_id

    root = user.workspace.root_folder
    root.kind = :project
    assert_not root.valid?
    assert_includes root.errors[:kind], "cannot make the document root a project"
  end

  test "dependency_mode defaults to none and accepts strict and flexible" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    folder = user.workspace.folders.create!(name: "Plan")

    assert folder.dependencies_none?
    folder.update!(dependency_mode: :flexible)
    assert folder.reload.dependencies_flexible?
    assert_raises(ArgumentError) { folder.dependency_mode = "bogus" }
  end

  test "a folder can be a feature folder, but the document root cannot" do
    user = User.create!(name: "Ada", email: "feat-ada@example.com", password: "password123")
    folder = user.workspace.folders.create!(name: "Features", kind: :feature)
    assert folder.feature?
    root = user.workspace.root_folder
    root.kind = :feature
    assert_not root.valid?
    assert_includes root.errors[:kind], "cannot make the document root a feature"
  end

  test "a folder's home document must be one of its own documents and is cleared when the document moves" do
    user = User.create!(name: "Ada", email: "home-ada@example.com", password: "password123")
    folder = user.workspace.folders.create!(name: "Album")
    other = user.workspace.folders.create!(name: "Other")
    inside = Document.create!(title: "Plan", folder: folder, created_by: user)
    outside = Document.create!(title: "Elsewhere", folder: other, created_by: user)

    folder.home_document = outside
    assert_not folder.valid?
    assert_includes folder.errors[:home_document], "must be a document in this folder"

    folder.update!(home_document: inside)
    assert_equal inside, folder.reload.home_document

    inside.update!(folder: other)
    assert_nil folder.reload.home_document_id
  end

  test "deleting the home document clears it" do
    user = User.create!(name: "Ada", email: "home2-ada@example.com", password: "password123")
    folder = user.workspace.folders.create!(name: "Album")
    home = Document.create!(title: "Plan", folder: folder, created_by: user)
    folder.update!(home_document: home)
    home.destroy
    assert_nil folder.reload.home_document_id
  end

  test "project details: status, dates, description and a member owner" do
    user = User.create!(name: "Ada", email: "proj-ada@example.com", password: "password123")
    project = user.workspace.folders.create!(name: "Album", kind: :project)
    assert project.status_planned?

    project.update!(project_status: :active, start_date: Date.new(2026, 11, 1), target_date: Date.new(2026, 12, 1), description: "Ten songs", owner: user)
    assert project.reload.status_active?
    assert_equal user, project.owner

    project.target_date = Date.new(2026, 10, 1)
    assert_not project.valid?
    assert_includes project.errors[:target_date], "can't be before the start date"

    stranger = User.create!(name: "Eve", email: "proj-eve@example.com", password: "password123")
    project.target_date = Date.new(2026, 12, 1)
    project.owner = stranger
    assert_not project.valid?
    assert_includes project.errors[:owner], "must be a member of the space"
  end

  test "a project holds its type as a key: blank by default, a built-in one, or one the Space saved" do
    user = User.create!(name: "Ada", email: "ptype-ada@example.com", password: "password123")
    project = user.workspace.folders.create!(name: "Album", kind: :project)
    assert_equal "blank", project.project_type

    project.update!(project_type: "music_release")
    assert_equal "music_release", project.reload.project_type

    project.project_type = "bogus"
    assert_not project.valid?
    assert_includes project.errors[:project_type], "is not a project type of this space"
    project.project_type = nil
    assert_not project.valid?

    saved = user.workspace.project_types.create!(name: "Podcast")
    project.update!(project_type: saved.key)
    assert_equal "custom_#{saved.id}", project.reload.project_type

    elsewhere = Workspace.create!(name: "Team", user: user).folders.create!(name: "Other", kind: :project)
    elsewhere.project_type = saved.key
    assert_not elsewhere.valid?
  end
end
