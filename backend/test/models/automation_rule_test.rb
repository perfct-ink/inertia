require "test_helper"

class AutomationRuleTest < ActiveSupport::TestCase
  setup do
    @owner = User.create!(name: "Owner", email: "automation-owner@example.com", password: "password123")
    @ada = User.create!(name: "Ada", email: "automation-ada@example.com", password: "password123")
    @bo = User.create!(name: "Bo", email: "automation-bo@example.com", password: "password123")
    @space = Workspace.create!(name: "Studio", user: @owner)
    @other_space = Workspace.create!(name: "Other", user: @owner)
    @space.memberships.create!(user: @ada, role: :member)
  end

  def attributes(**over)
    {
      name: "Done tasks go to Ada", trigger_type: "task_status_changed", trigger_config: { "to" => "done" },
      conditions: [ { "field" => "priority", "operator" => "in", "value" => %w[high urgent] } ],
      actions: [ { "type" => "assign", "config" => { "user_id" => @ada.id } } ]
    }.merge(over)
  end

  test "a rule keeps its trigger, conditions and actions as JSON and is on by default" do
    rule = @space.automation_rules.create!(attributes)
    rule.reload
    assert rule.enabled
    assert_equal({ "to" => "done" }, rule.trigger_config)
    assert_equal "priority", rule.conditions.first["field"]
    assert_equal [ { "type" => "assign", "config" => { "user_id" => @ada.id } } ], rule.actions
    assert_equal [ rule ], @space.automation_rules.enabled.to_a
  end

  test "the name is required, trimmed, and at most 80 characters" do
    assert_not @space.automation_rules.new(attributes(name: " ")).valid?
    assert_equal "Done tasks go to Ada", @space.automation_rules.create!(attributes(name: "  Done tasks   go to Ada ")).name
    assert_not @space.automation_rules.new(attributes(name: "x" * 81)).valid?
    assert @space.automation_rules.new(attributes(name: "x" * 80)).valid?
  end

  test "an invalid trigger, condition or action is refused with a sentence about it" do
    rule = @space.automation_rules.new(attributes(trigger_type: "nonsense", conditions: [ { "field" => "title" } ], actions: []))
    assert_not rule.valid?
    assert_includes rule.errors.full_messages, "Pick what starts the automation"
    assert_includes rule.errors.full_messages, "Condition 1: pick a field to check"
    assert_includes rule.errors.full_messages, "Add an action"
  end

  test "disabling a valid rule is allowed and the disabled rule is left out of enabled" do
    rule = @space.automation_rules.create!(attributes)
    rule.update!(enabled: false)
    assert_equal [], @space.automation_rules.enabled.to_a
  end

  test "people named in a rule must be in the Space, through a membership or a team" do
    assert_not @space.automation_rules.new(attributes(actions: [ { "type" => "assign", "config" => { "user_id" => @bo.id } } ])).valid?
    assert_not @space.automation_rules.new(attributes(conditions: [ { "field" => "assignee_id", "operator" => "equals", "value" => @bo.id } ])).valid?
    assert_not @other_space.automation_rules.new(attributes).valid?

    @space.teams.create!(name: "Design").memberships.create!(user: @bo)
    assert @space.automation_rules.new(attributes(actions: [ { "type" => "assign", "config" => { "user_id" => @bo.id } } ])).valid?
    assert @space.automation_rules.new(attributes(actions: [ { "type" => "assign", "config" => { "user_id" => nil } } ])).valid?
  end

  test "a Space holds at most the limit on automations, and other Spaces are unaffected" do
    limit = Automations::Registry::MAX_RULES_PER_SPACE
    limit.times { |i| @space.automation_rules.create!(attributes(name: "Rule #{i}")) }
    over = @space.automation_rules.new(attributes(name: "One too many"))
    assert_not over.valid?
    assert_includes over.errors.full_messages, "A Space can have at most #{limit} automations"
    assert @other_space.automation_rules.new(attributes(actions: [ { "type" => "set_status", "config" => { "value" => "done" } } ])).valid?
    assert @space.automation_rules.first.update(name: "Renamed")
  end

  test "to_definition is what the evaluator reads" do
    rule = @space.automation_rules.create!(attributes)
    definition = rule.to_definition
    assert_equal rule.id, definition["id"]
    assert_equal "task_status_changed", definition["trigger_type"]
    assert_equal [ rule.id ], Automations::Evaluator.call(
      [ definition ],
      { "type" => "task_status_changed", "task" => { "priority" => "urgent" }, "changes" => { "status" => [ "todo", "done" ] }, "depth" => 0 }
    ).map { |match| match[:rule_id] }
  end

  test "the registry lists the task's statuses and priorities" do
    assert_equal Task.statuses.keys, Automations::Registry::TASK_STATUSES
    assert_equal Task.priorities.keys, Automations::Registry::TASK_PRIORITIES
  end

  test "deleting the Space deletes its rules" do
    @space.automation_rules.create!(attributes)
    @other_space.automation_rules.create!(attributes(actions: [ { "type" => "set_status", "config" => { "value" => "done" } } ]))
    assert_difference -> { AutomationRule.count }, -1 do
      @space.destroy!
    end
  end
end
