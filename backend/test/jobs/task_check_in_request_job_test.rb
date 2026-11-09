require "test_helper"

class TaskCheckInRequestJobTest < ActiveJob::TestCase
  setup do
    @pat = User.create!(name: "Pat", email: "pat-checkin-job@example.com", password: "password123")
    @sam = User.create!(name: "Sam", email: "sam-checkin-job@example.com", password: "password123")
    @workspace = Workspace.create!(name: "Team", user: @pat)
    @workspace.memberships.create!(user: @sam, role: :member)
    @pat_task = overdue_task("Pat's", @pat)
    @sam_task = overdue_task("Sam's", @sam)
  end

  def overdue_task(title, assignee)
    task = @workspace.tasks.create!(title: title, ongoing: true, check_in_recurrence: "FREQ=DAILY", assignee: assignee)
    task.update_columns(last_check_in_at: 3.days.ago)
    task
  end

  test "with a person it asks only about their tasks" do
    TaskCheckInRequestJob.perform_now(@sam.id)
    assert_equal [ @sam_task ], @sam.notifications.where(kind: "check_in_requested").map(&:subject)
    assert_equal 0, @pat.notifications.where(kind: "check_in_requested").count
  end

  test "with no person it asks about every task, and a person who is gone is skipped" do
    TaskCheckInRequestJob.perform_now(0)
    assert_equal 0, Notification.where(kind: "check_in_requested").count
    TaskCheckInRequestJob.perform_now
    assert_equal [ 1, 1 ], [ @pat, @sam ].map { |u| u.notifications.where(kind: "check_in_requested").count }
  end
end
