module Automations
  # Runs a Space's rules for an event and applies what they decide, right away
  # in the request that caused the event (there is no job queue). Which rules
  # fire is the Evaluator's call; this class loads the Space's enabled rules for
  # the trigger, carries the matching actions out on the task, and reports back.
  #
  #   result = Automations::Runner.new(workspace).task_status_changed(task, from: "todo")
  #   result.applied # => [ { rule_id: 3, rule_name: "Done means mine" } ]
  #   result.errors  # => [ { rule_id: 4, message: "..." } ]
  #
  # It never raises: an automation that cannot run is logged and reported in
  # `errors`, and must not stop the edit that started it. A rule's actions are
  # all applied or none are. The actions change the task with a plain save and
  # never report an event of their own, so a rule cannot start another one; the
  # depth and fired-rule guards in the event are for actions that later do.
  # Every rule sees the task as it was when the event happened; where two rules
  # set the same field, the one made later wins.
  class Runner
    Result = Struct.new(:applied, :errors)

    def initialize(workspace)
      @workspace = workspace
    end

    # The event for a task whose status was `from` and is now what the task has.
    def task_status_changed(task, from:, depth: 0, fired_rule_ids: [])
      call(
        {
          "type" => "task_status_changed",
          "task" => Registry::FIELDS.keys.index_with { |field| task[field] }.merge("id" => task.id),
          "changes" => { "status" => [ from, task.status ] },
          "depth" => depth,
          "fired_rule_ids" => fired_rule_ids
        },
        task
      )
    end

    # Runs every enabled rule of the Space for the event against the task.
    def call(event, task)
      result = Result.new([], [])
      rules = @workspace.automation_rules.enabled.where(trigger_type: event["type"]).order(:id).map(&:to_definition)
      Evaluator.call(rules, event).each do |match|
        run_rule(match, task, result)
      end
      result
    rescue StandardError => e
      fail_rule(result, nil, e)
    end

    private

    def run_rule(match, task, result)
      Task.transaction(requires_new: true) do
        match[:actions].each { |action| perform(action, task) }
        task.save! if task.changed?
      end
      result.applied << { rule_id: match[:rule_id], rule_name: match[:rule_name] }
    rescue StandardError => e
      task.reload
      fail_rule(result, match[:rule_id], e)
    end

    def fail_rule(result, rule_id, error)
      Rails.logger.error("Automation rule #{rule_id.inspect} failed: #{error.class}: #{error.message}")
      result.errors << { rule_id: rule_id, message: error.message }
      result
    end

    def perform(action, task)
      send(:"apply_#{Registry::ACTIONS.fetch(action['type'])[:handler]}", task, action)
    end

    # Handler for the actions that set one task field.
    def apply_set_field(task, action)
      Registry.field_changes(action).each do |field, value|
        require_space_member!(value) if Registry::FIELDS.dig(field, :kind) == "user" && value
        task[field] = value
      end
    end

    # People leave Spaces after a rule is made; never assign work to someone who has.
    def require_space_member!(user_id)
      raise ArgumentError, "That person is no longer in this Space" unless @workspace.accessible_by?(user_id)
    end
  end
end
