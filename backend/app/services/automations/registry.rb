module Automations
  # Everything the rule builder offers: the triggers a rule can start from, the
  # task fields a condition can test, and the actions it can run, plus the
  # limits that keep a rule set small and safe. Plain data and lookups, no Rails
  # (the evaluator and its tests run with plain Ruby), kept in step with
  # frontend/src/data/automation.ts, which the builder reads its options from.
  #
  # Adding to it is data, not a rewrite:
  #   * a trigger is a TRIGGERS entry whose `matches` decides if an event is
  #     one it fires on (its `params` narrow that; all optional);
  #   * a field is a FIELDS entry (`enum` with `values`, or `user`);
  #   * an action is an ACTIONS entry (its `params` are required) with the
  #     Runner method named by `handler` that carries it out.
  module Registry
    # Mirror Task.statuses and Task.priorities.
    TASK_STATUSES = %w[backlog todo in_progress in_review done].freeze
    TASK_PRIORITIES = %w[none low medium high urgent].freeze

    # Task fields a condition can test and an action can set. `user` fields hold
    # a Space member's user id, or nil for nobody.
    FIELDS = {
      "status" => { label: "Status", kind: "enum", values: TASK_STATUSES },
      "priority" => { label: "Priority", kind: "enum", values: TASK_PRIORITIES },
      "assignee_id" => { label: "Assignee", kind: "user" }
    }.freeze

    OPERATORS = %w[equals not_equals in].freeze

    # `params` maps each setting of the trigger to the FIELDS entry giving its
    # allowed values. An event is { "type", "task" => the task's fields,
    # "changes" => { field => [before, after] }, "depth", "fired_rule_ids" }.
    TRIGGERS = {
      "task_status_changed" => {
        label: "A task's status changes",
        params: { "from" => "status", "to" => "status" },
        matches: lambda { |config, event|
          from, to = event.dig("changes", "status")
          !from.nil? && (config["from"].nil? || config["from"] == from) && (config["to"].nil? || config["to"] == to)
        }
      }
    }.freeze

    # `params` maps each required setting of the action to the FIELDS entry
    # giving its allowed values. The set_field handler sets that field.
    ACTIONS = {
      "set_status" => { label: "Change status to", handler: :set_field, params: { "value" => "status" } },
      "assign" => { label: "Assign to", handler: :set_field, params: { "user_id" => "assignee_id" } }
    }.freeze

    # Rules a Space can have, and the size of one rule.
    MAX_RULES_PER_SPACE = 50
    MAX_CONDITIONS_PER_RULE = 10
    MAX_ACTIONS_PER_RULE = 5
    MAX_VALUES_PER_CONDITION = 20
    NAME_MAX_LENGTH = 80

    # Loop guards. An event caused by an automation carries depth + 1; events at
    # MAX_DEPTH or deeper run no rules, so with 1 only a person's own change
    # starts a chain. A rule never fires twice in one chain, and one event runs
    # at most MAX_RULES_PER_EVENT rules.
    MAX_DEPTH = 1
    MAX_RULES_PER_EVENT = 10

    class << self
      # Whether `value` is acceptable for the field: a listed option, or a user id.
      def valid_value?(field, value)
        definition = FIELDS[field]
        return false unless definition
        return value.is_a?(String) && definition[:values].include?(value) if definition[:kind] == "enum"

        value.nil? || (value.is_a?(Integer) && value.positive?)
      end

      # { task field => new value } for one action ({ "type", "config" }).
      def field_changes(action)
        params = ACTIONS.fetch(action["type"])[:params]
        params.to_h { |param, field| [ field, action.dig("config", param) ] }
      end
    end
  end
end
