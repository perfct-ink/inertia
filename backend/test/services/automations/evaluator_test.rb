require "test_helper"

# Pure: no database. Rules and events are plain hashes.
class AutomationsEvaluatorTest < ActiveSupport::TestCase
  def rule(id: 1, name: "Rule", enabled: true, trigger_config: {}, conditions: [], actions: [ { "type" => "assign", "config" => { "user_id" => 7 } } ], **rest)
    { "id" => id, "name" => name, "enabled" => enabled, "trigger_type" => "task_status_changed",
      "trigger_config" => trigger_config, "conditions" => conditions, "actions" => actions }.merge(rest.transform_keys(&:to_s))
  end

  def event(from: "todo", to: "done", task: {}, depth: 0, fired: [])
    { "type" => "task_status_changed",
      "task" => { "id" => 5, "status" => to, "priority" => "high", "assignee_id" => nil }.merge(task),
      "changes" => { "status" => [ from, to ] }, "depth" => depth, "fired_rule_ids" => fired }
  end

  def ids(matches)
    matches.map { |match| match[:rule_id] }
  end

  test "a rule with no settings fires on any status change and hands back its actions" do
    matches = Automations::Evaluator.call([ rule ], event)
    assert_equal [ 1 ], ids(matches)
    assert_equal "Rule", matches.first[:rule_name]
    assert_equal [ { "type" => "assign", "config" => { "user_id" => 7 } } ], matches.first[:actions]
  end

  test "the from and to settings narrow which status changes fire it" do
    to_done = rule(trigger_config: { "to" => "done" })
    from_review = rule(id: 2, trigger_config: { "from" => "in_review", "to" => "done" })
    assert_equal [ 1 ], ids(Automations::Evaluator.call([ to_done, from_review ], event(from: "todo", to: "done")))
    assert_equal [ 1, 2 ], ids(Automations::Evaluator.call([ to_done, from_review ], event(from: "in_review", to: "done")))
    assert_equal [], ids(Automations::Evaluator.call([ to_done, from_review ], event(from: "todo", to: "in_progress")))
  end

  test "an event that is not a status change fires nothing" do
    assert_equal [], Automations::Evaluator.call([ rule ], { "type" => "task_status_changed", "task" => {}, "changes" => {}, "depth" => 0 })
    assert_equal [], Automations::Evaluator.call([ rule ], event.merge("type" => "task_created"))
  end

  test "conditions compare the task's fields with equals, not_equals and in, and all must hold" do
    equals = rule(conditions: [ { "field" => "priority", "operator" => "equals", "value" => "high" } ])
    differs = rule(id: 2, conditions: [ { "field" => "priority", "operator" => "not_equals", "value" => "high" } ])
    among = rule(id: 3, conditions: [ { "field" => "priority", "operator" => "in", "value" => %w[high urgent] } ])
    both = rule(id: 4, conditions: [
      { "field" => "priority", "operator" => "in", "value" => %w[high urgent] },
      { "field" => "assignee_id", "operator" => "equals", "value" => nil }
    ])
    not_both = rule(id: 5, conditions: [
      { "field" => "priority", "operator" => "equals", "value" => "high" },
      { "field" => "assignee_id", "operator" => "equals", "value" => 9 }
    ])
    assert_equal [ 1, 3, 4 ], ids(Automations::Evaluator.call([ equals, differs, among, both, not_both ], event))
    assert_equal [ 2 ], ids(Automations::Evaluator.call([ equals, differs, among, both, not_both ], event(task: { "priority" => "low" })))
  end

  test "an unassigned task matches a condition on a nil assignee and an assigned one does not" do
    nobody = rule(conditions: [ { "field" => "assignee_id", "operator" => "equals", "value" => nil } ])
    assert_equal [ 1 ], ids(Automations::Evaluator.call([ nobody ], event))
    assert_equal [], ids(Automations::Evaluator.call([ nobody ], event(task: { "assignee_id" => 3 })))
  end

  test "a rule that is off, or is not valid, or is missing parts, fires nothing" do
    assert_equal [], Automations::Evaluator.call([ rule(enabled: false) ], event)
    assert_equal [], Automations::Evaluator.call([ rule(actions: []) ], event)
    assert_equal [], Automations::Evaluator.call([ rule(trigger_config: { "to" => "finished" }) ], event)
    assert_equal [], Automations::Evaluator.call([ rule(trigger_type: "nonsense") ], event)
    assert_equal [], Automations::Evaluator.call([ rule(conditions: [ { "field" => "title", "operator" => "equals", "value" => "x" } ]) ], event)
    assert_equal [], Automations::Evaluator.call([ { "id" => 1, "enabled" => true } ], event)
  end

  test "symbol keys work as well as string keys" do
    symbolic = { id: 1, name: "R", enabled: true, trigger_type: "task_status_changed", trigger_config: { to: "done" },
                 conditions: [ { field: "priority", operator: "equals", value: "high" } ], actions: [ { type: "set_status", config: { value: "backlog" } } ] }
    matches = Automations::Evaluator.call([ symbolic ], event.transform_keys(&:to_sym))
    assert_equal [ { "type" => "set_status", "config" => { "value" => "backlog" } } ], matches.first[:actions]
  end

  test "an event an automation caused runs no rules" do
    assert_equal [ 1 ], ids(Automations::Evaluator.call([ rule ], event(depth: Automations::Registry::MAX_DEPTH - 1)))
    assert_equal [], Automations::Evaluator.call([ rule ], event(depth: Automations::Registry::MAX_DEPTH))
    assert_equal [], Automations::Evaluator.call([ rule ], event(depth: 5))
  end

  test "a rule that already fired in the chain does not fire again" do
    assert_equal [ 2 ], ids(Automations::Evaluator.call([ rule, rule(id: 2) ], event(fired: [ 1 ])))
  end

  test "one event runs at most the cap on rules, the earliest first" do
    many = (1..25).map { |id| rule(id: id) }
    assert_equal (1..Automations::Registry::MAX_RULES_PER_EVENT).to_a, ids(Automations::Evaluator.call(many, event))
  end

  test "a rule's own change cannot start itself: the event it causes is one level deeper and runs nothing" do
    first = Automations::Evaluator.call([ rule(actions: [ { "type" => "set_status", "config" => { "value" => "todo" } } ]) ], event)
    assert_equal 1, first.size
    caused = event(from: "done", to: "todo", depth: 1, fired: [ 1 ])
    assert_equal [], Automations::Evaluator.call([ rule ], caused)
  end
end
