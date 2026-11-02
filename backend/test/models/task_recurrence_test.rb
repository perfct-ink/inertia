require "test_helper"

class TaskRecurrenceTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-recur@example.com", password: "password123")
    @workspace = @user.workspace
  end

  test "an invalid rule is rejected" do
    task = @workspace.tasks.build(title: "x", recurrence: "every week")
    assert_not task.valid?
    assert_includes task.errors[:recurrence], "isn't a supported repeat rule"
  end

  test "completing a scheduled task creates the next one from its dates" do
    task = @workspace.tasks.create!(title: "Report", status: :todo, start_date: Date.new(2026, 10, 5), due_date: Date.new(2026, 10, 9), recurrence: "FREQ=WEEKLY", assignee: @user)
    assert_difference -> { @workspace.tasks.count }, 1 do
      task.update!(status: :done)
    end
    nxt = @workspace.tasks.where.not(id: task.id).find_by!(title: "Report")
    assert_equal Date.new(2026, 10, 16), nxt.due_date
    assert_equal Date.new(2026, 10, 12), nxt.start_date
    assert_equal "todo", nxt.status
    assert_equal "FREQ=WEEKLY", nxt.recurrence
    assert_equal @user, nxt.assignee
    assert_nil task.reload.recurrence
  end

  test "a task repeating after completion counts from today" do
    task = @workspace.tasks.create!(title: "Water plants", status: :todo, due_date: Date.new(2020, 1, 1), recurrence: "FREQ=DAILY;INTERVAL=3", recurrence_from: :completion)
    task.update!(status: :done)
    nxt = @workspace.tasks.where.not(id: task.id).find_by!(title: "Water plants")
    assert_equal Date.current + 3, nxt.due_date
  end

  test "reopening and completing again does not duplicate" do
    task = @workspace.tasks.create!(title: "Once", status: :todo, due_date: Date.new(2026, 10, 9), recurrence: "FREQ=DAILY")
    task.update!(status: :done)
    task.update!(status: :todo)
    assert_no_difference -> { @workspace.tasks.count } do
      task.update!(status: :done)
    end
  end

  test "non-repeating tasks do not spawn" do
    task = @workspace.tasks.create!(title: "Plain", status: :todo)
    assert_no_difference -> { @workspace.tasks.count } do
      task.update!(status: :done)
    end
  end
end
