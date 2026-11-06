require "test_helper"

class EpicTest < ActiveSupport::TestCase
  test "tasks_count and done_tasks_count reflect assigned tasks" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    epic = user.workspace.epics.create!(title: "Launch")

    user.workspace.tasks.create!(title: "One", epic: epic, status: :done)
    user.workspace.tasks.create!(title: "Two", epic: epic, status: :todo)
    user.workspace.tasks.create!(title: "Unrelated", status: :done)

    assert_equal 2, epic.tasks_count
    assert_equal 1, epic.done_tasks_count
  end

  test "requires a title" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    epic = user.workspace.epics.new
    assert_not epic.valid?
    assert_includes epic.errors[:title], "can't be blank"
  end

  test "deleting an epic nullifies its tasks instead of destroying them" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    epic = user.workspace.epics.create!(title: "Launch")
    task = user.workspace.tasks.create!(title: "One", epic: epic)

    epic.destroy

    assert_nil task.reload.epic_id
  end

  test "rejects an initiative from another workspace" do
    ada = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    bob = User.create!(name: "Bob", email: "bob@example.com", password: "password123")
    foreign = bob.workspace.initiatives.create!(title: "Elsewhere")

    epic = ada.workspace.epics.new(title: "Launch", initiative: foreign)

    assert_not epic.valid?
    assert_includes epic.errors[:initiative], "must belong to the same workspace"
  end

  test "a new feature gets a requirements document built from the template" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    epic = user.workspace.epics.create!(title: "Launch", creator: user)

    document = epic.document
    assert document.persisted?
    assert_equal "Launch", document.title
    assert_equal user.workspace.root_folder, document.folder
    assert_equal user, document.created_by
    headings = document.content["content"].select { |node| node["type"] == "heading" }.map { |node| node["content"]&.first&.dig("text") }
    assert_equal [ "Launch", "Problem", "Goals", "User stories", "Acceptance criteria", "Out of scope", "Tasks" ], headings
    assert_equal "workspaceTaskList", document.content["content"].last["type"]
    assert_equal epic, document.feature_epic
  end

  test "the requirements document goes in the feature's folder and is the Space creator's without a creator" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    folder = user.workspace.folders.create!(name: "Messages")
    epic = user.workspace.epics.create!(title: "Launch", folder: folder)

    assert_equal folder, epic.document.folder
    assert_equal user, epic.document.created_by
  end

  test "a feature keeps the document it was given" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    document = user.workspace.root_folder.documents.create!(title: "Existing", created_by: user)
    epic = user.workspace.epics.create!(title: "Launch", document: document)

    assert_equal document, epic.reload.document
    assert_equal 1, user.workspace.documents.count
  end

  test "a feature's document cannot be taken away or be in another Space" do
    ada = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    bob = User.create!(name: "Bob", email: "bob@example.com", password: "password123")
    epic = ada.workspace.epics.create!(title: "Launch")

    assert_not epic.update(document: nil)
    assert_includes epic.errors[:document], "can't be removed from a feature"

    foreign = bob.workspace.root_folder.documents.create!(title: "Elsewhere", created_by: bob)
    epic = ada.workspace.epics.new(title: "Other", document: foreign)
    assert_not epic.valid?
    assert_includes epic.errors[:document], "must belong to the same workspace"
  end

  test "a feature whose document is gone can still be edited" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    epic = user.workspace.epics.create!(title: "Launch")
    epic.document.destroy

    assert_nil epic.reload.document_id
    assert epic.update(title: "Renamed")
  end

  test "deleting a feature deletes its document and the tasks written in it, not tasks elsewhere" do
    user = User.create!(name: "Ada", email: "ada@example.com", password: "password123")
    epic = user.workspace.epics.create!(title: "Launch")
    written = user.workspace.tasks.create!(title: "Written", document: epic.document)
    elsewhere = user.workspace.tasks.create!(title: "Elsewhere", epic: epic)
    document_id = epic.document_id

    epic.destroy

    assert_not Document.exists?(document_id)
    assert_not Task.exists?(written.id)
    assert_nil elsewhere.reload.epic_id
  end
end
