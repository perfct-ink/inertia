require "test_helper"

class MilestoneTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-milestone@example.com", password: "password123")
    @workspace = @user.workspace
    @milestone = @workspace.milestones.create!(title: "Beta", target_date: Date.new(2026, 12, 1))
  end

  test "title is required" do
    assert_not @workspace.milestones.new.valid?
  end

  test "owner must be a member of the workspace" do
    stranger = User.create!(name: "Stranger", email: "stranger-milestone@example.com", password: "password123")
    milestone = @workspace.milestones.new(title: "x", owner: stranger)
    assert_not milestone.valid?
    assert_includes milestone.errors[:owner], "must be a member of the workspace"
    milestone.owner = @user
    assert milestone.valid?
  end

  test "initiatives epics and tasks must use a milestone from their own workspace" do
    other = User.create!(name: "Other", email: "other-milestone@example.com", password: "password123")
    foreign = other.workspace.milestones.create!(title: "Elsewhere")
    assert_not @workspace.epics.new(title: "E", milestone: foreign).valid?
    assert_not @workspace.initiatives.new(title: "I", milestone: foreign).valid?
    assert_not @workspace.tasks.new(title: "T", milestone: foreign).valid?
    assert @workspace.tasks.new(title: "T", milestone: @milestone).valid?
  end

  test "health: complete or undated is on track, overdue is off track, near and behind is at risk" do
    today = Date.new(2026, 11, 1)
    assert_equal "on_track", @workspace.milestones.new(title: "a").health(0, today: today)
    assert_equal "on_track", @milestone.health(100, today: Date.new(2027, 1, 1))
    assert_equal "off_track", @milestone.health(50, today: Date.new(2026, 12, 2))
    assert_equal "at_risk", @milestone.health(50, today: Date.new(2026, 11, 20))
    assert_equal "on_track", @milestone.health(80, today: Date.new(2026, 11, 20))
    assert_equal "on_track", @milestone.health(10, today: today)
  end

  test "a done milestone is on track even when late" do
    @milestone.status = :done
    assert_equal "on_track", @milestone.health(0, today: Date.new(2027, 1, 1))
  end

  test "deleting a milestone keeps what was under it" do
    epic = @workspace.epics.create!(title: "E", milestone: @milestone)
    @milestone.destroy
    assert_nil epic.reload.milestone_id
  end
end
