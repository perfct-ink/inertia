require "test_helper"

class TaskCheckInTest < ActiveSupport::TestCase
  setup do
    @pat = User.create!(name: "Pat", email: "pat-checkin-task@example.com", password: "password123")
    @sam = User.create!(name: "Sam", email: "sam-checkin-task@example.com", password: "password123")
    @kim = User.create!(name: "Kim", email: "kim-checkin-task@example.com", password: "password123")
    @workspace = Workspace.create!(name: "Team", user: @pat)
    @workspace.memberships.create!(user: @sam, role: :member)
    @workspace.memberships.create!(user: @kim, role: :member)
  end

  def ongoing_task(**attrs)
    @workspace.tasks.create!({ title: "Keep the roadmap fresh", ongoing: true, check_in_recurrence: "FREQ=WEEKLY", assignee: @sam }.merge(attrs))
  end

  def asked(user)
    user.notifications.where(kind: "check_in_requested")
  end

  test "an ongoing task needs a supported schedule and can't be marked done" do
    assert_not @workspace.tasks.build(title: "x", ongoing: true).valid?
    assert_not @workspace.tasks.build(title: "x", ongoing: true, check_in_recurrence: "FREQ=HOURLY").valid?
    assert @workspace.tasks.build(title: "x", ongoing: true, check_in_recurrence: "FREQ=DAILY;INTERVAL=3").valid?
    task = ongoing_task
    task.status = :done
    assert_not task.valid?
    assert @workspace.tasks.build(title: "Plain", status: :done).valid?
  end

  test "the next check-in is due one step of the schedule after the last one, or after it became ongoing" do
    task = ongoing_task
    assert_equal task.created_at.to_date + 7, task.check_in_due_on
    assert_not task.check_in_due?
    assert_not task.check_in_stale?
    assert task.check_in_due?(task.check_in_due_on), "due on its day"
    assert_not task.check_in_stale?(task.check_in_due_on), "not yet overdue on its day"
    assert task.check_in_stale?(task.check_in_due_on + 1)

    task.check_ins.create!(status: :on_track, author: @sam)
    assert_equal task.reload.last_check_in_at.to_date + 7, task.check_in_due_on
    task.update!(check_in_recurrence: "FREQ=MONTHLY")
    assert_equal task.last_check_in_at.to_date >> 1, task.check_in_due_on, "any schedule of the repeat picker works"

    plain = @workspace.tasks.create!(title: "Plain")
    assert_nil plain.check_in_due_on
    assert_not plain.check_in_stale?(Date.current + 365)
  end

  test "an old task starts its clock when it becomes ongoing, and stops it when it doesn't" do
    plain = @workspace.tasks.create!(title: "Old")
    plain.update_columns(created_at: 90.days.ago)
    plain.reload.update!(ongoing: true, check_in_recurrence: "FREQ=WEEKLY")
    assert_not plain.check_in_stale?, "not overdue the moment it becomes ongoing"
    assert_equal Date.current + 7, plain.check_in_due_on

    plain.update_column(:check_in_requested_at, Time.current)
    plain.update!(ongoing: false)
    assert_nil plain.reload.check_in_requested_at
    assert_nil plain.check_in_due_on
  end

  test "a check-in needs a status, takes an optional note, and is removed with the task" do
    task = ongoing_task
    assert_not task.check_ins.build(note: "Fine").valid?
    assert_not task.check_ins.build(status: "great").valid?
    bare = task.check_ins.create!(status: :blocked, note: "   ")
    assert_nil bare.note, "a blank note is no note"
    assert_equal "Waiting on legal", task.check_ins.create!(status: :at_risk, note: " Waiting on legal ").note
    assert_difference "TaskCheckIn.count", -2 do
      task.destroy
    end
  end

  test "only an ongoing task takes check-ins" do
    assert_not @workspace.tasks.create!(title: "Plain").check_ins.build(status: :on_track).valid?
  end

  test "a check-in sets the latest status on the task, restarts the clock and closes the request" do
    task = ongoing_task
    assert_nil task.check_in_status
    task.update_column(:check_in_requested_at, Time.current)

    task.check_ins.create!(status: :at_risk, note: "Slipping")
    task.reload
    assert task.check_in_status_at_risk?
    assert_nil task.check_in_requested_at
    task.check_ins.create!(status: :on_track)
    assert task.reload.check_in_status_on_track?, "the latest one wins"
  end

  test "request_due! asks the assignee once, until they check in" do
    task = ongoing_task
    assert_equal 0, TaskCheckIn.request_due!(Date.current)

    due = task.check_in_due_on
    assert_equal 1, TaskCheckIn.request_due!(due)
    assert_equal [ task ], asked(@sam).map(&:subject)
    assert_equal 0, TaskCheckIn.request_due!(due + 1), "not asked again while unanswered"

    task.check_ins.create!(status: :on_track, author: @sam)
    assert_nil task.reload.check_in_requested_at
    assert_equal 0, TaskCheckIn.request_due!(Date.current + 6), "answered, so not due for another week"
    assert_equal 1, TaskCheckIn.request_due!(Date.current + 7)
  end

  test "every assignee is asked, and nobody else" do
    ongoing_task.update!(assignee_ids: [ @sam.id, @kim.id ])
    assert_equal 1, TaskCheckIn.request_due!(Date.current + 8)
    assert_equal [ 1, 1, 0 ], [ @sam, @kim, @pat ].map { |user| asked(user).count }
  end

  test "asking for one person only looks at the tasks they are assigned" do
    mine = ongoing_task(assignee: @sam)
    ongoing_task(title: "Someone else's", assignee: @kim)
    assert_equal 1, TaskCheckIn.request_due!(Date.current + 8, assignee: @sam)
    assert_equal [ mine ], asked(@sam).map(&:subject)
    assert_equal 0, asked(@kim).count
    assert_equal 1, TaskCheckIn.request_due!(Date.current + 8), "the other one is still to be asked"
  end

  test "tasks with no assignee, tasks that are not ongoing, and people who left the Space are never asked" do
    ongoing_task(assignee: nil)
    @workspace.tasks.create!(title: "Plain", assignee: @sam)
    left = ongoing_task(assignee: @kim)
    @workspace.memberships.find_by!(user: @kim).destroy
    assert_equal 0, TaskCheckIn.request_due!(Date.current + 30)
    assert_nil left.reload.check_in_requested_at
  end
end
