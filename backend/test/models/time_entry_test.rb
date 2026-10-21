require "test_helper"

class TimeEntryTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Ada", email: "ada-time@example.com", password: "password123")
    @task = @user.workspace.tasks.create!(title: "Ship")
  end

  test "a timer runs until it is stopped, then reports whole minutes" do
    entry = @task.time_entries.create!(user: @user, started_at: 90.minutes.ago)
    assert entry.running?
    assert_equal 0, entry.minutes

    entry.stop!
    assert_not entry.running?
    assert_equal 90, entry.minutes
  end

  test "a person can run one timer at a time, across tasks" do
    other = @user.workspace.tasks.create!(title: "Other")
    @task.time_entries.create!(user: @user, started_at: Time.current)

    second = other.time_entries.build(user: @user, started_at: Time.current)
    assert_not second.valid?
    assert_includes second.errors.full_messages, "Stop your running timer before starting another"
  end

  test "finished entries do not block a new timer" do
    @task.time_entries.create!(user: @user, started_at: 2.hours.ago, ended_at: 1.hour.ago)
    assert @task.time_entries.build(user: @user, started_at: Time.current).valid?
  end

  test "an entry cannot end before it starts" do
    entry = @task.time_entries.build(user: @user, started_at: Time.current, ended_at: 1.hour.ago)
    assert_not entry.valid?
  end

  test "destroying a task destroys its time entries" do
    @task.time_entries.create!(user: @user, started_at: Time.current)
    assert_difference("TimeEntry.count", -1) { @task.destroy }
  end
end
