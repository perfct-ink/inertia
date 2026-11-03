module Automations
  # Decides which rules an event fires and what they should do. Pure Ruby with
  # plain hashes, no Rails and no database: it reads rules and an event and
  # returns the actions to run, leaving the running to Automations::Runner.
  #
  #   Automations::Evaluator.call(rules, event)
  #   # => [ { rule_id: 3, rule_name: "Done means mine", actions: [ { "type" => "assign", "config" => { "user_id" => 7 } } ] } ]
  #
  # A rule is { id, name, enabled, trigger_type, trigger_config, conditions,
  # actions }; an event is described on Registry::TRIGGERS. Keys may be strings
  # or symbols. A rule that is off, no longer valid, has another trigger, fails a
  # condition or has already fired in this chain gives nothing back, and so does
  # any event that an automation itself caused (see Registry::MAX_DEPTH).
  module Evaluator
    class << self
      def call(rules, event)
        event = stringify(event)
        return [] if event["depth"].to_i >= Registry::MAX_DEPTH

        fired = Array(event["fired_rule_ids"])
        matches = []
        Array(rules).each do |rule|
          rule = stringify(rule)
          next if fired.include?(rule["id"]) || !fires?(rule, event)

          matches << { rule_id: rule["id"], rule_name: rule["name"], actions: rule["actions"] }
          break if matches.size >= Registry::MAX_RULES_PER_EVENT
        end
        matches
      end

      # Whether the (string-keyed) rule is on, valid, started by this event, and
      # its conditions all hold for the task in the event.
      def fires?(rule, event)
        return false unless rule["enabled"] == true

        definition = {
          trigger_type: rule["trigger_type"], trigger_config: rule["trigger_config"],
          conditions: rule["conditions"], actions: rule["actions"]
        }
        return false if Definition.errors(**definition).any?
        return false unless rule["trigger_type"] == event["type"]
        return false unless Registry::TRIGGERS.fetch(rule["trigger_type"])[:matches].call(rule["trigger_config"] || {}, event)

        rule["conditions"].all? { |condition| condition_met?(condition, event["task"] || {}) }
      end

      # One { field, operator, value } against the task's fields.
      def condition_met?(condition, task)
        actual = task[condition["field"]]
        case condition["operator"]
        when "equals" then actual == condition["value"]
        when "not_equals" then actual != condition["value"]
        when "in" then condition["value"].include?(actual)
        else false
        end
      end

      # Hashes and arrays with string keys all the way down.
      def stringify(object)
        case object
        when Hash then object.each_with_object({}) { |(key, value), copy| copy[key.to_s] = stringify(value) }
        when Array then object.map { |item| stringify(item) }
        else object
        end
      end
    end
  end
end
