require "test_helper"

class TaskStatusChangeTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-history@example.com", password: "password123")
    @workspace = @user.workspace
  end

  test "creating a task records its first status" do
    task = @workspace.tasks.create!(title: "A", status: :todo)
    change = task.status_changes.sole
    assert_nil change.from_status
    assert_equal "todo", change.to_status
  end

  test "each status change is recorded in order with who made it, and other edits are not" do
    task = @workspace.tasks.create!(title: "A", status: :todo)
    task.status_changed_by = @user
    task.update!(status: :in_progress)
    task.update!(title: "Renamed")
    task.update!(status: :done)

    changes = task.status_changes.to_a
    assert_equal [ [ nil, "todo" ], [ "todo", "in_progress" ], [ "in_progress", "done" ] ], changes.map { |c| [ c.from_status, c.to_status ] }
    assert_equal [ nil, "Pat", "Pat" ], changes.map { |c| c.changed_by&.name }
  end

  test "deleting the task removes its history" do
    task = @workspace.tasks.create!(title: "A")
    assert_difference "TaskStatusChange.count", -1 do
      task.destroy
    end
  end
end
