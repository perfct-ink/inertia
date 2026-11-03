require "test_helper"

class AutomationsRunnerTest < ActiveSupport::TestCase
  setup do
    @owner = User.create!(name: "Owner", email: "runner-owner@example.com", password: "password123")
    @ada = User.create!(name: "Ada", email: "runner-ada@example.com", password: "password123")
    @bo = User.create!(name: "Bo", email: "runner-bo@example.com", password: "password123")
    @space = Workspace.create!(name: "Studio", user: @owner)
    @space.memberships.create!(user: @ada, role: :member)
    @space.memberships.create!(user: @bo, role: :member)
    @other_space = Workspace.create!(name: "Other", user: @owner)
    @task = @space.tasks.create!(title: "Ship it", status: :todo, priority: :high)
  end

  def rule(name: "Rule", space: @space, enabled: true, trigger_config: { "to" => "done" }, conditions: [], actions: [ { "type" => "assign", "config" => { "user_id" => @ada.id } } ])
    space.automation_rules.create!(name: name, enabled: enabled, trigger_type: "task_status_changed", trigger_config: trigger_config, conditions: conditions, actions: actions)
  end

  # What the controller does after a task's status is saved.
  def finish(task = @task, from: "todo")
    task.update!(status: :done)
    Automations::Runner.new(@space).task_status_changed(task, from: from)
  end

  test "a matching rule runs its action on the task and is reported" do
    matching = rule(name: "Done goes to Ada")
    result = finish
    assert_equal [ { rule_id: matching.id, rule_name: "Done goes to Ada" } ], result.applied
    assert_equal [], result.errors
    assert_equal @ada, @task.reload.assignee
    assert_equal "done", @task.status
  end

  test "an action can change the status as well" do
    rule(trigger_config: { "from" => "todo" }, actions: [ { "type" => "set_status", "config" => { "value" => "in_review" } } ])
    finish
    assert_equal "in_review", @task.reload.status
  end

  test "a rule whose trigger or conditions do not match changes nothing" do
    rule(name: "Wrong status", trigger_config: { "to" => "in_review" })
    rule(name: "Wrong priority", conditions: [ { "field" => "priority", "operator" => "equals", "value" => "low" } ])
    rule(name: "Wrong from", trigger_config: { "from" => "in_review" })
    result = finish
    assert_equal [], result.applied
    assert_nil @task.reload.assignee
  end

  test "rules that are off or belong to another Space do not run" do
    rule(enabled: false)
    @other_space.automation_rules.create!(
      name: "Elsewhere", trigger_type: "task_status_changed", trigger_config: {}, conditions: [],
      actions: [ { "type" => "set_status", "config" => { "value" => "backlog" } } ]
    )
    result = finish
    assert_equal [], result.applied
    assert_nil @task.reload.assignee
    assert_equal "done", @task.status
  end

  test "rules see the task as it was when the event happened and the later rule wins on a shared field" do
    rule(name: "First", actions: [ { "type" => "assign", "config" => { "user_id" => @ada.id } } ])
    rule(name: "Second", actions: [ { "type" => "assign", "config" => { "user_id" => @bo.id } } ],
         conditions: [ { "field" => "assignee_id", "operator" => "equals", "value" => nil } ])
    result = finish
    assert_equal %w[First Second], result.applied.map { |applied| applied[:rule_name] }
    assert_equal @bo, @task.reload.assignee
  end

  test "an action's own change does not start another rule" do
    rule(name: "Reopen", actions: [ { "type" => "set_status", "config" => { "value" => "todo" } } ])
    rule(name: "Todo goes to Bo", trigger_config: { "to" => "todo" }, actions: [ { "type" => "assign", "config" => { "user_id" => @bo.id } } ])
    result = finish
    assert_equal [ "Reopen" ], result.applied.map { |applied| applied[:rule_name] }
    assert_equal "todo", @task.reload.status
    assert_nil @task.assignee
  end

  test "an event caused by an automation runs no rules at all" do
    rule
    @task.update!(status: :done)
    result = Automations::Runner.new(@space).task_status_changed(@task, from: "todo", depth: Automations::Registry::MAX_DEPTH)
    assert_equal [], result.applied
    assert_nil @task.reload.assignee
  end

  test "a rule that cannot run is reported, leaves the task as it was, and does not stop the others" do
    broken = rule(name: "Broken", actions: [
      { "type" => "set_status", "config" => { "value" => "in_review" } },
      { "type" => "assign", "config" => { "user_id" => @bo.id } }
    ])
    @space.memberships.find_by(user: @bo).destroy!
    working = rule(name: "Working", actions: [ { "type" => "assign", "config" => { "user_id" => @ada.id } } ])

    result = finish
    assert_equal [ working.id ], result.applied.map { |applied| applied[:rule_id] }
    assert_equal [ broken.id ], result.errors.map { |error| error[:rule_id] }
    assert_equal "That person is no longer in this Space", result.errors.first[:message]
    @task.reload
    assert_equal "done", @task.status, "the broken rule's first action was rolled back with the rest"
    assert_equal @ada, @task.assignee
  end

  test "every registered action names a handler the runner has" do
    Automations::Registry::ACTIONS.each_value do |action|
      assert Automations::Runner.private_method_defined?(:"apply_#{action[:handler]}"), "no handler for #{action[:handler]}"
    end
  end
end
