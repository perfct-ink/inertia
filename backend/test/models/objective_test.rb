require "test_helper"

class ObjectiveTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-okr@example.com", password: "password123")
    @workspace = @user.workspace
    @objective = @workspace.objectives.create!(title: "Delight new users", start_date: Date.new(2026, 10, 1), target_date: Date.new(2026, 12, 31))
  end

  test "a manual key result measures from start toward target, either direction, clamped" do
    kr = @objective.key_results.create!(title: "Activation", start_value: 20, target_value: 60, current_value: 30, unit: "%")
    assert_equal 25, kr.percent
    kr.update!(current_value: 90)
    assert_equal 100, kr.percent
    down = @objective.key_results.create!(title: "Churn", start_value: 8, target_value: 5, current_value: 6.5)
    assert_equal 50, down.percent
  end

  test "a linked key result follows its initiative's tasks" do
    initiative = @workspace.initiatives.create!(title: "Onboarding")
    epic = @workspace.epics.create!(title: "E", initiative: initiative)
    @workspace.tasks.create!(title: "a", epic: epic, status: :done)
    @workspace.tasks.create!(title: "b", epic: epic)
    kr = @objective.key_results.create!(title: "Ship onboarding", initiative: initiative)
    assert_equal 50, kr.percent
  end

  test "objective progress averages its key results, with a 0-1 score and health" do
    @objective.key_results.create!(title: "a", start_value: 0, target_value: 10, current_value: 10)
    @objective.key_results.create!(title: "b", start_value: 0, target_value: 10, current_value: 0)
    @objective.reload
    assert_equal 50, @objective.percent
    assert_equal 0.5, @objective.score
    assert_equal "at_risk", @objective.health(@objective.percent, today: Date.new(2026, 12, 25))
    assert_equal 0, @workspace.objectives.create!(title: "Empty").percent
  end

  test "validations: target needed unless linked, must differ from start, initiative from the same space" do
    assert_not @objective.key_results.new(title: "x").valid?
    assert_not @objective.key_results.new(title: "x", start_value: 5, target_value: 5).valid?
    other = User.create!(name: "O", email: "o-okr@example.com", password: "password123").workspace.initiatives.create!(title: "Elsewhere")
    assert_not @objective.key_results.new(title: "x", initiative: other).valid?
    assert_not @workspace.objectives.new(title: "x", start_date: Date.new(2026, 2, 1), target_date: Date.new(2026, 1, 1)).valid?
  end
end
