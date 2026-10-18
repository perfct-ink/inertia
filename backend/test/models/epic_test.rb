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
end
