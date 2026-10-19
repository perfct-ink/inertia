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
end
