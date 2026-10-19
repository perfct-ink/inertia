require "test_helper"

class DocumentInitiativeTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-docinit@example.com", password: "password123")
    @workspace = @user.workspace
    @folder = @workspace.folders.first
    @initiative = @workspace.initiatives.create!(title: "Launch", start_date: Date.new(2026, 11, 1), target_date: Date.new(2026, 12, 1))
  end

  def build_document(initiative)
    Document.create!(title: "Plan", folder: @folder, created_by: @user, initiative: initiative)
  end

  test "tasks in the document roll up to its initiative alongside epic tasks" do
    document = build_document(@initiative)
    done = @workspace.tasks.create!(title: "a", document: document, status: :done)
    @workspace.tasks.create!(title: "b", document: document, status: :todo)
    epic = @workspace.epics.create!(title: "E", initiative: @initiative)
    @workspace.tasks.create!(title: "c", epic: epic, status: :todo)
    # Both an epic task and in the document: counted once.
    @workspace.tasks.create!(title: "d", epic: epic, document: document, status: :done)

    assert_equal 4, @initiative.tasks_count
    assert_equal 2, @initiative.done_tasks_count
    assert_equal 50, @initiative.percent
    assert done.persisted?
  end

  test "an initiative from another space is rejected" do
    other = User.create!(name: "O", email: "o-docinit@example.com", password: "password123")
    foreign = other.workspace.initiatives.create!(title: "Theirs")
    document = Document.new(title: "Plan", folder: @folder, created_by: @user, initiative: foreign)
    assert_not document.valid?
    assert_includes document.errors[:initiative], "must belong to the same space"
  end

  test "deleting the initiative detaches its documents" do
    document = build_document(@initiative)
    @initiative.destroy
    assert_nil document.reload.initiative_id
  end
end
