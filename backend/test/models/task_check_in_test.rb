require "test_helper"

class TaskCheckInTest < ActiveSupport::TestCase
  setup do
    @pat = User.create!(name: "Pat", email: "pat-checkin-task@example.com", password: "password123")
    @sam = User.create!(name: "Sam", email: "sam-checkin-task@example.com", password: "password123")
    @workspace = @pat.workspace
    @workspace.memberships.create!(user: @sam, role: :member)
  end

  def ongoing_task(**attrs)
    @workspace.tasks.create!({ title: "Keep the roadmap fresh", ongoing: true, check_in_every_days: 7, assignee: @sam }.merge(attrs))
  end

  test "an ongoing task needs a positive interval and can't be marked done" do
    assert_not @workspace.tasks.build(title: "x", ongoing: true).valid?
    assert_not @workspace.tasks.build(title: "x", ongoing: true, check_in_every_days: 0).valid?
    task = ongoing_task
    task.status = :done
    assert_not task.valid?
    assert @workspace.tasks.build(title: "Plain", status: :done).valid?
  end

  test "the next update is due an interval after the last check-in, or after creation" do
    task = ongoing_task
    assert_in_delta task.created_at + 7.days, task.check_in_due_at, 1
    assert_not task.check_in_stale?
    assert task.check_in_stale?(8.days.from_now)

    checked = task.check_ins.create!(body: "On track", author: @sam)
    assert_in_delta checked.created_at + 7.days, task.reload.check_in_due_at, 1
    assert_nil @workspace.tasks.create!(title: "Plain").check_in_due_at
  end

  test "request_due! asks the assignee once, until they answer" do
    task = ongoing_task
    assert_equal 0, TaskCheckIn.request_due!(Time.current)

    assert_equal 1, TaskCheckIn.request_due!(8.days.from_now)
    notification = @sam.notifications.find_by!(kind: "check_in_requested")
    assert_equal task, notification.subject
    assert_equal 0, TaskCheckIn.request_due!(9.days.from_now), "not asked again while unanswered"

    task.check_ins.create!(body: "Done a lot", author: @sam)
    assert_nil task.reload.check_in_requested_at
    assert_equal 0, TaskCheckIn.request_due!(9.days.from_now), "answered, so not due for another interval"
    assert_equal 1, TaskCheckIn.request_due!(20.days.from_now)
  end

  test "tasks with no assignee, and tasks that are not ongoing, are never asked" do
    ongoing_task(assignee: nil)
    @workspace.tasks.create!(title: "Plain", assignee: @sam)
    assert_equal 0, TaskCheckIn.request_due!(30.days.from_now)
  end

  test "an update needs text, and goes with the task" do
    task = ongoing_task
    assert_not task.check_ins.build(body: "").valid?
    task.check_ins.create!(body: "Fine")
    assert_difference "TaskCheckIn.count", -1 do
      task.destroy
    end
  end
end
