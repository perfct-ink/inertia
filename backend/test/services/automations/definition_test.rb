require "test_helper"

# Pure: no database. Definitions are plain hashes with string keys.
class AutomationsDefinitionTest < ActiveSupport::TestCase
  def errors(trigger_type: "task_status_changed", trigger_config: { "to" => "done" }, conditions: [], actions: [ { "type" => "set_status", "config" => { "value" => "backlog" } } ])
    Automations::Definition.errors(trigger_type: trigger_type, trigger_config: trigger_config, conditions: conditions, actions: actions)
  end

  test "a trigger, optional conditions and an action make a valid definition" do
    assert_equal [], errors
    assert_equal [], errors(trigger_config: nil)
    assert_equal [], errors(trigger_config: {}, conditions: [ { "field" => "priority", "operator" => "in", "value" => %w[high urgent] } ])
    assert_equal [], errors(actions: [ { "type" => "assign", "config" => { "user_id" => nil } } ])
  end

  test "the trigger must exist and its settings must be known statuses" do
    assert_equal [ "Pick what starts the automation" ], errors(trigger_type: "something_else")
    assert_equal [ "Pick what starts the automation" ], errors(trigger_type: nil)
    assert_equal [ "The trigger's to is not a valid status" ], errors(trigger_config: { "to" => "finished" })
    assert_equal [ "The trigger has a setting that does not exist: colour" ], errors(trigger_config: { "colour" => "red" })
    assert_equal [ "The trigger settings are not valid" ], errors(trigger_config: "done")
  end

  test "each condition needs a known field, a known operator and a value that fits the field" do
    assert_equal [ "Condition 1: pick a field to check" ], errors(conditions: [ { "field" => "title", "operator" => "equals", "value" => "x" } ])
    assert_equal [ "Condition 1: pick how to compare status" ], errors(conditions: [ { "field" => "status", "operator" => "contains", "value" => "x" } ])
    assert_equal [ "Condition 2: pick a valid priority" ], errors(conditions: [
      { "field" => "status", "operator" => "equals", "value" => "done" },
      { "field" => "priority", "operator" => "equals", "value" => "huge" }
    ])
    assert_equal [ "Condition 1: pick a valid assignee" ], errors(conditions: [ { "field" => "assignee_id", "operator" => "equals", "value" => "7" } ])
    assert_equal [ "Condition 1: list the status values to match" ], errors(conditions: [ { "field" => "status", "operator" => "in", "value" => [] } ])
    assert_equal [ "Condition 1: list the status values to match" ], errors(conditions: [ { "field" => "status", "operator" => "in", "value" => "done" } ])
    assert_equal [ "Condition 1: has a value that is not valid for status" ], errors(conditions: [ { "field" => "status", "operator" => "in", "value" => %w[done bogus] } ])
    assert_equal [ "Condition 1: has a value that is not valid for assignee" ], errors(conditions: [ { "field" => "assignee_id", "operator" => "in", "value" => [ 3, nil ] } ])
    assert_equal [ "Condition 1: is not valid" ], errors(conditions: [ "status" ])
    assert_equal [ "The conditions are not valid" ], errors(conditions: "none")
  end

  test "the number of conditions, values and actions is capped" do
    condition = { "field" => "status", "operator" => "equals", "value" => "done" }
    assert_equal [ "Use at most 10 conditions" ], errors(conditions: Array.new(11) { condition })
    assert_equal [], errors(conditions: Array.new(10) { condition })
    assert_equal [ "Condition 1: list at most 20 values" ], errors(conditions: [ { "field" => "assignee_id", "operator" => "in", "value" => (1..21).to_a } ])
    action = { "type" => "set_status", "config" => { "value" => "done" } }
    assert_equal [ "Use at most 5 actions" ], errors(actions: Array.new(6) { action })
    assert_equal [], errors(actions: Array.new(5) { action })
  end

  test "a rule needs at least one action, each of a known type with valid settings" do
    assert_equal [ "Add an action" ], errors(actions: [])
    assert_equal [ "The actions are not valid" ], errors(actions: nil)
    assert_equal [ "Action 1: pick what to do" ], errors(actions: [ { "type" => "delete_task", "config" => {} } ])
    assert_equal [ "Action 1: is missing its settings" ], errors(actions: [ { "type" => "set_status" } ])
    assert_equal [ "Action 1: pick a valid status" ], errors(actions: [ { "type" => "set_status", "config" => { "value" => nil } } ])
    assert_equal [ "Action 1: pick a valid assignee" ], errors(actions: [ { "type" => "assign", "config" => {} } ])
    assert_equal [ "Action 1: pick a valid assignee" ], errors(actions: [ { "type" => "assign", "config" => { "user_id" => "me" } } ])
    assert_equal [ "Action 2: pick a valid status" ], errors(actions: [
      { "type" => "assign", "config" => { "user_id" => 3 } },
      { "type" => "set_status", "config" => { "value" => "finished" } }
    ])
  end

  test "problems in every part are reported together" do
    messages = errors(trigger_type: "x", conditions: "x", actions: [])
    assert_equal [ "Pick what starts the automation", "The conditions are not valid", "Add an action" ], messages
  end

  test "user_ids lists the people a definition names, once each" do
    ids = Automations::Definition.user_ids(
      conditions: [
        { "field" => "assignee_id", "operator" => "in", "value" => [ 3, 4 ] },
        { "field" => "assignee_id", "operator" => "equals", "value" => 3 },
        { "field" => "status", "operator" => "equals", "value" => "done" }
      ],
      actions: [ { "type" => "assign", "config" => { "user_id" => 9 } }, { "type" => "set_status", "config" => { "value" => "done" } } ]
    )
    assert_equal [ 3, 4, 9 ], ids
    assert_equal [], Automations::Definition.user_ids(conditions: [], actions: [ { "type" => "assign", "config" => { "user_id" => nil } } ])
  end

  test "every action's field and every trigger's settings exist in the registry" do
    Automations::Registry::ACTIONS.each_value do |action|
      action[:params].each_value { |field| assert Automations::Registry::FIELDS.key?(field) }
    end
    Automations::Registry::TRIGGERS.each_value do |trigger|
      trigger[:params].each_value { |field| assert Automations::Registry::FIELDS.key?(field) }
    end
  end
end
