require "test_helper"

class HolidayTest < ActiveSupport::TestCase
  setup do
    @owner = User.create!(name: "Pat", email: "pat-holiday@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
  end

  def holiday(**attrs)
    @team.holidays.new({ name: "Thanksgiving", start_date: Date.new(2026, 11, 26), end_date: Date.new(2026, 11, 27) }.merge(attrs))
  end

  test "a holiday has a name and a date range" do
    record = holiday
    assert record.save
    assert_equal "Thanksgiving", record.reload.name
    assert holiday(start_date: Date.new(2026, 12, 25), end_date: Date.new(2026, 12, 25)).valid?
  end

  test "the name and both dates are required" do
    assert_not holiday(name: "").valid?
    assert_not holiday(start_date: nil).valid?
    assert_not holiday(end_date: nil).valid?
  end

  test "the end date cannot be before the start date" do
    record = holiday(start_date: Date.new(2026, 11, 27), end_date: Date.new(2026, 11, 26))
    assert_not record.valid?
    assert_includes record.errors[:end_date], "can't be before the start date"
  end

  test "deleting the space deletes its holidays" do
    holiday.save!
    assert_difference -> { Holiday.count }, -1 do
      @team.destroy
    end
  end
end
