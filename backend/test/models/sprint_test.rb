require "test_helper"

class SprintTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-sprint@example.com", password: "password123")
    @workspace = @user.workspace
    @sprint = @workspace.sprints.create!(title: "Sprint 1")
  end

  test "starting a planned sprint activates it and fills a missing start date" do
    @sprint.start!
    assert @sprint.reload.active?
    assert_equal Date.current, @sprint.start_date

    dated = @workspace.sprints.create!(title: "Sprint 2", start_date: Date.new(2026, 11, 1))
    dated.start!
    assert_equal Date.new(2026, 11, 1), dated.reload.start_date
  end

  test "only a planned sprint can be started, and a closed one stays closed" do
    @sprint.start!
    assert_raises(Sprint::InvalidTransition) { @sprint.start! }
    @sprint.close!
    assert_raises(Sprint::InvalidTransition) { @sprint.start! }
  end

  test "closing carries unfinished tasks to the chosen sprint and keeps done ones" do
    @sprint.start!
    nxt = @workspace.sprints.create!(title: "Sprint 2")
    done = @workspace.tasks.create!(title: "Done", sprint: @sprint, status: :done)
    open_task = @workspace.tasks.create!(title: "Open", sprint: @sprint, status: :in_progress)
    other = @workspace.tasks.create!(title: "Elsewhere", sprint: nxt, status: :todo)

    result = @sprint.close!(carry_to: nxt)

    assert_equal({ completed: 1, carried_over: 1 }, result)
    assert @sprint.reload.done?
    assert_equal @sprint, done.reload.sprint
    assert_equal nxt, open_task.reload.sprint
    assert_equal nxt, other.reload.sprint
  end

  test "closing without a target clears the sprint on unfinished tasks" do
    @sprint.start!
    task = @workspace.tasks.create!(title: "Open", sprint: @sprint, status: :todo)
    assert_equal 1, @sprint.close!(carry_to: nil)[:carried_over]
    assert_nil task.reload.sprint_id
  end

  test "an invalid carry target rejects the close and changes nothing" do
    @sprint.start!
    task = @workspace.tasks.create!(title: "Open", sprint: @sprint, status: :todo)
    finished = @workspace.sprints.create!(title: "Old", status: :done)
    other_space = User.create!(name: "O", email: "o-sprint@example.com", password: "password123").workspace.sprints.create!(title: "Theirs")

    [ @sprint, finished, other_space ].each do |target|
      assert_raises(Sprint::InvalidTransition) { @sprint.close!(carry_to: target) }
    end
    assert @sprint.reload.active?
    assert_equal @sprint, task.reload.sprint
  end

  test "only an active sprint can be closed" do
    assert_raises(Sprint::InvalidTransition) { @sprint.close! }
  end
end
