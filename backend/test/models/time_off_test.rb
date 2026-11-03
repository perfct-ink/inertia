require "test_helper"

class TimeOffTest < ActiveSupport::TestCase
  setup do
    @owner = User.create!(name: "Pat", email: "pat-time-off@example.com", password: "password123")
    @teammate = User.create!(name: "Sam", email: "sam-time-off@example.com", password: "password123")
    @stranger = User.create!(name: "Stranger", email: "stranger-time-off@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
    @team.memberships.create!(user: @teammate, role: :member)
  end

  def time_off(**attrs)
    @team.time_offs.new({ user: @teammate, start_date: Date.new(2026, 11, 9), end_date: Date.new(2026, 11, 10), note: "Conference" }.merge(attrs))
  end

  test "a member can take time off between two dates, with or without a note" do
    record = time_off
    assert record.save
    assert_equal Date.new(2026, 11, 10), record.reload.end_date
    assert time_off(note: nil).valid?
  end

  test "a single day is a valid range" do
    assert time_off(start_date: Date.new(2026, 11, 9), end_date: Date.new(2026, 11, 9)).valid?
  end

  test "both dates are required and the end cannot be before the start" do
    assert_not time_off(start_date: nil).valid?
    assert_not time_off(end_date: nil).valid?
    record = time_off(start_date: Date.new(2026, 11, 10), end_date: Date.new(2026, 11, 9))
    assert_not record.valid?
    assert_includes record.errors[:end_date], "can't be before the start date"
  end

  test "the person must be a member of the space" do
    record = time_off(user: @stranger)
    assert_not record.valid?
    assert_includes record.errors[:user], "must be a member of the space"
  end

  test "a note is at most 255 characters" do
    assert_not time_off(note: "x" * 256).valid?
    assert time_off(note: "x" * 255).valid?
  end

  test "a person who leaves the space takes their time off with them, others keep theirs" do
    time_off.save!
    time_off(user: @owner).save!
    @team.memberships.find_by!(user: @teammate).destroy
    assert_equal [ @owner.id ], @team.time_offs.pluck(:user_id)
  end

  test "deleting the space deletes its time off" do
    time_off.save!
    assert_difference -> { TimeOff.count }, -1 do
      @team.destroy
    end
  end
end
