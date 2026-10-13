require "test_helper"

class DocumentRootTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Root User", email: "root-user@example.com", password: "password123")
    @workspace = @user.workspace
    @root = @workspace.root_folder
  end

  test "new workspaces have exactly one root and ordinary folders attach to it" do
    assert @root.root?
    assert_nil @root.parent_id
    assert_equal "Root", @root.name
    folder = @workspace.folders.create!(name: "Project")
    assert_equal @root.id, folder.parent_id
    assert_equal [ @root.id ], @workspace.folders.where(parent_id: nil).pluck(:id)
    assert_equal @root.id, @workspace.ensure_document_root!.id
  end

  test "folders can return to root but cannot form cycles or leave the workspace" do
    project = @workspace.folders.create!(name: "Project")
    child = @workspace.folders.create!(name: "Child", parent: project)
    assert_not project.update(parent: child)
    child.update!(parent: nil)
    assert_equal @root.id, child.reload.parent_id
    other = User.create!(name: "Other", email: "other-root@example.com", password: "password123")
    assert_not child.update(parent: other.workspace.root_folder)
  end

  test "root cannot be moved archived or deleted" do
    child = @workspace.folders.create!(name: "Child")
    assert_not @root.update(parent: child)
    @root.reload
    assert_not @root.update(archived_at: Time.current)
    @root.reload
    assert_not @root.destroy
    assert @root.reload.persisted?
  end

  test "documents of every type can live directly in root" do
    %w[document spreadsheet table].each do |type|
      doc = @root.documents.create!(title: "Root #{type}", doc_type: type, created_by: @user)
      assert_equal @root.id, doc.folder_id
    end
  end

  test "deleting the workspace still removes the root and its contents" do
    @root.documents.create!(title: "Notes", created_by: @user)
    @user.destroy!
    assert_not Workspace.exists?(@workspace.id)
    assert_not Folder.exists?(@root.id)
  end

  test "legacy workspace folders and document IDs are preserved under a new root" do
    @workspace.update_column(:root_folder_id, nil)
    @root.delete
    folder = @workspace.folders.create!(name: "Legacy")
    doc = folder.documents.create!(title: "Existing document", created_by: @user)
    root = @workspace.ensure_document_root!
    assert_equal root.id, folder.reload.parent_id
    assert_equal folder.id, doc.reload.folder_id
    assert_equal [ root.id ], @workspace.folders.where(parent_id: nil).pluck(:id)
  end
end
