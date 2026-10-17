require "test_helper"

class InitiativeTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-initiative@example.com", password: "password123")
    @workspace = @user.workspace
  end

  test "percent and health roll up from the tasks under its epics" do
    initiative = @workspace.initiatives.create!(title: "Growth", target_date: Date.new(2026, 12, 1))
    epic = @workspace.epics.create!(title: "Onboarding", initiative: initiative)
    @workspace.tasks.create!(title: "a", epic: epic, status: :done)
    @workspace.tasks.create!(title: "b", epic: epic)

    assert_equal 50, initiative.percent
    assert_equal "at_risk", initiative.health(initiative.percent, today: Date.new(2026, 11, 25))
    assert_equal "off_track", initiative.health(initiative.percent, today: Date.new(2026, 12, 2))
    assert_equal "on_track", initiative.health(initiative.percent, today: Date.new(2026, 10, 1))
  end

  test "an initiative with no tasks is 0 percent" do
    assert_equal 0, @workspace.initiatives.create!(title: "Empty").percent
  end

  test "horizon is optional and only accepts now, next or later" do
    initiative = @workspace.initiatives.new(title: "Growth")
    assert initiative.valid?
    initiative.horizon = "next"
    assert initiative.valid?
    assert initiative.horizon_next?
    initiative.horizon = "someday"
    assert_not initiative.valid?
    assert_not @workspace.epics.new(title: "E", horizon: "someday").valid?
  end
end
