require "test_helper"

class FolderBlueprintTest < ActiveSupport::TestCase
  def render_folders(workspace)
    result = WorkspaceBlueprint.render_as_hash(
      workspace,
      view: :with_folders,
      task_folder_ids: workspace.tasks.reorder(nil).where.not(folder_id: nil).distinct.pluck(:folder_id).to_set,
      task_document_ids: workspace.tasks.reorder(nil).where.not(document_id: nil).distinct.pluck(:document_id).to_set,
      event_folder_ids: workspace.events.where.not(folder_id: nil).distinct.pluck(:folder_id).to_set
    )
    flatten_folders(result[:folders]).index_by { |f| f[:id] }
  end

  def flatten_folders(folders)
    folders.flat_map { |folder| [ folder, *flatten_folders(folder[:children] || []) ] }
  end

  test "has_tasks is true for a task linked directly to the folder" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    folder = user.workspace.folders.create!(name: "Project")
    other = user.workspace.folders.create!(name: "Untouched")
    user.workspace.tasks.create!(title: "Direct task", folder: folder)

    folders = render_folders(user.workspace)

    assert folders[folder.id][:has_tasks]
    assert_not folders[other.id][:has_tasks]
  end

  test "has_tasks is true for a task linked to one of the folder's documents" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    folder = user.workspace.folders.create!(name: "Project")
    doc = folder.documents.create!(title: "Spec", doc_type: :document, created_by: user)
    user.workspace.tasks.create!(title: "Doc-linked task", document: doc)

    folders = render_folders(user.workspace)

    assert folders[folder.id][:has_tasks]
  end

  test "has_events is true only for a folder with a directly-linked event" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    folder = user.workspace.folders.create!(name: "Project")
    other = user.workspace.folders.create!(name: "Untouched")
    user.workspace.events.create!(title: "Launch", folder: folder, date: Date.today)

    folders = render_folders(user.workspace)

    assert folders[folder.id][:has_events]
    assert_not folders[other.id][:has_events]
  end

  test "has_tasks and has_events are false for a folder with neither" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    folder = user.workspace.folders.create!(name: "Empty")

    folders = render_folders(user.workspace)

    assert_not folders[folder.id][:has_tasks]
    assert_not folders[folder.id][:has_events]
  end

  test "the flags reach nested child folders too" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    top = user.workspace.folders.create!(name: "Top")
    child = user.workspace.folders.create!(name: "Child", parent: top)
    user.workspace.tasks.create!(title: "Nested task", folder: child)

    folders = render_folders(user.workspace)
    child_hash = folders[top.id][:children].find { |c| c[:id] == child.id }

    assert child_hash[:has_tasks]
  end
end
