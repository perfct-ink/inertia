require "test_helper"

class TaskEstimatesTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-estimates@example.com", password: "password123")
    @workspace = @user.workspace
  end

  test "priority defaults to none and takes the known levels" do
    task = @workspace.tasks.create!(title: "A")
    assert task.priority_none?
    task.update!(priority: :urgent)
    assert task.reload.priority_urgent?
  end

  test "an unknown priority is invalid, not an error" do
    task = @workspace.tasks.build(title: "A", priority: "someday")
    assert_not task.valid?
    assert_includes task.errors[:priority], "is not included in the list"
  end

  test "estimate and story points must not be negative, and story points are whole numbers" do
    task = @workspace.tasks.build(title: "A", estimate_hours: -1, story_points: 2.5, actual_story_points: -3)
    assert_not task.valid?
    assert task.errors[:estimate_hours].any?
    assert task.errors[:story_points].any?
    assert task.errors[:actual_story_points].any?

    task.assign_attributes(estimate_hours: 4.5, story_points: 3, actual_story_points: 5)
    assert task.valid?
    assert_equal 4.5, task.tap(&:save!).reload.estimate_hours.to_f
  end
end
