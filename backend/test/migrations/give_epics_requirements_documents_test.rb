require "test_helper"
require Rails.root.join("db/migrate/20261108010002_give_epics_requirements_documents")

# The data migration that turns the epics that already exist into features
# (docs/features/feature_requirements_docs.md). It must be safe to rerun.
class GiveEpicsRequirementsDocumentsTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "ada-migration@example.com", password: "password123")
    @space = @user.workspace
  end

  def migrate
    migration = GiveEpicsRequirementsDocuments.new
    migration.suppress_messages { migration.up }
  end

  # An epic as it was before features: no requirements document.
  def old_epic(title, folder: nil)
    epic = @space.epics.create!(title: title, folder: folder)
    epic.document.destroy
    epic.update_columns(folder_id: folder&.id)
    epic.reload
  end

  test "an epic in a folder gets a requirements document in that folder" do
    folder = @space.folders.create!(name: "Messages", kind: :project)
    epic = old_epic("Background images", folder: folder)
    assert_nil epic.document_id

    migrate

    document = epic.reload.document
    assert_equal folder, document.folder
    assert_equal folder, epic.folder
    assert_equal "Background images", document.title
    assert_equal @user.id, document.created_by_id
    assert_equal epic, document.feature_epic
    headings = document.content["content"].select { |node| node["type"] == "heading" }.map { |node| node["content"]&.first&.dig("text") }
    assert_equal [ "Background images", "Problem", "Goals", "User stories", "Acceptance criteria", "Out of scope", "Tasks" ], headings
    assert_equal "workspaceTaskList", document.content["content"].last["type"]
  end

  test "an epic with no folder is filed in the Personal Project, made once for the Space" do
    first = old_epic("One")
    second = old_epic("Two")
    @space.folders.where(name: "Personal Project").destroy_all

    migrate

    project = @space.folders.find_by!(name: "Personal Project")
    assert project.project?
    assert_equal @space.root_folder, project.parent
    assert_equal [ project, project ], [ first, second ].map { |epic| epic.reload.document.folder }
    assert_equal [ project, project ], [ first, second ].map { |epic| epic.folder }
    assert_equal 1, @space.folders.where(name: "Personal Project").count
  end

  test "an existing Personal Project is reused" do
    project = @space.personal_project
    epic = old_epic("One")

    migrate

    assert_equal project, epic.reload.document.folder
    assert_equal 1, @space.folders.where(name: "Personal Project").count
  end

  test "an epic that has a document is left alone, and a rerun adds nothing" do
    kept = @space.epics.create!(title: "Kept")
    document_id = kept.document_id
    epic = old_epic("Old")

    migrate
    after_first = [ Document.count, Folder.count, epic.reload.document_id ]
    migrate

    assert_equal document_id, kept.reload.document_id
    assert_equal after_first, [ Document.count, Folder.count, epic.reload.document_id ]
  end

  test "epics keep their planning fields and their tasks" do
    epic = old_epic("Planned")
    epic.update!(start_date: Date.new(2026, 12, 1), target_date: Date.new(2026, 12, 31))
    task = @space.tasks.create!(title: "Do it", epic: epic)

    migrate

    epic.reload
    assert_equal [ Date.new(2026, 12, 1), Date.new(2026, 12, 31) ], [ epic.start_date, epic.target_date ]
    assert_equal epic.id, task.reload.epic_id
    assert_equal 1, epic.tasks_count
  end
end
