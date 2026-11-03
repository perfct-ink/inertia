module Automations
  # Checks a rule's trigger, conditions and actions against the Registry before
  # it is saved, and says in words what is wrong. Plain Ruby, no Rails. The
  # frontend repeats these checks in data/automation.ts so the builder can
  # explain a mistake before sending anything; the server's answer is final.
  module Definition
    class << self
      # Messages for everything wrong with the definition (empty when it is fine).
      # Hashes use string keys, as a JSON column returns them.
      def errors(trigger_type:, trigger_config:, conditions:, actions:)
        messages = trigger_errors(trigger_type, trigger_config)
        messages.concat(condition_errors(conditions))
        messages.concat(action_errors(actions))
      end

      # The user ids a definition names (in conditions on, and actions that set,
      # a person), so the caller can check they belong to the Space.
      def user_ids(conditions:, actions:)
        ids = Array(conditions).flat_map do |condition|
          next [] unless condition.is_a?(Hash) && Registry::FIELDS.dig(condition["field"], :kind) == "user"

          Array(condition["value"])
        end
        ids += Array(actions).flat_map do |action|
          definition = action.is_a?(Hash) && Registry::ACTIONS[action["type"]]
          next [] unless definition

          definition[:params].filter_map { |param, field| action.dig("config", param) if Registry::FIELDS.dig(field, :kind) == "user" }
        end
        ids.grep(Integer).uniq
      end

      private

      def trigger_errors(type, config)
        trigger = Registry::TRIGGERS[type]
        return [ "Pick what starts the automation" ] unless trigger

        config = {} if config.nil?
        return [ "The trigger settings are not valid" ] unless config.is_a?(Hash)

        unknown = config.keys - trigger[:params].keys
        return [ "The trigger has a setting that does not exist: #{unknown.join(', ')}" ] if unknown.any?

        trigger[:params].filter_map do |param, field|
          "The trigger's #{param} is not a valid #{field}" unless config[param].nil? || Registry.valid_value?(field, config[param])
        end
      end

      def condition_errors(conditions)
        return [ "The conditions are not valid" ] unless conditions.is_a?(Array)
        return [ "Use at most #{Registry::MAX_CONDITIONS_PER_RULE} conditions" ] if conditions.size > Registry::MAX_CONDITIONS_PER_RULE

        conditions.each_with_index.flat_map do |condition, index|
          problem = condition_problem(condition)
          problem ? [ "Condition #{index + 1}: #{problem}" ] : []
        end
      end

      def condition_problem(condition)
        return "is not valid" unless condition.is_a?(Hash)

        field = condition["field"]
        value = condition["value"]
        return "pick a field to check" unless Registry::FIELDS.key?(field)
        return "pick how to compare #{Registry::FIELDS[field][:label].downcase}" unless Registry::OPERATORS.include?(condition["operator"])

        if condition["operator"] == "in"
          return "list the #{Registry::FIELDS[field][:label].downcase} values to match" unless value.is_a?(Array) && value.any?
          return "list at most #{Registry::MAX_VALUES_PER_CONDITION} values" if value.size > Registry::MAX_VALUES_PER_CONDITION

          # A list holds real options only; "nobody" is matched with equals.
          "has a value that is not valid for #{Registry::FIELDS[field][:label].downcase}" unless value.all? { |v| !v.nil? && Registry.valid_value?(field, v) }
        elsif !Registry.valid_value?(field, value)
          "pick a valid #{Registry::FIELDS[field][:label].downcase}"
        end
      end

      def action_errors(actions)
        return [ "The actions are not valid" ] unless actions.is_a?(Array)
        return [ "Add an action" ] if actions.empty?
        return [ "Use at most #{Registry::MAX_ACTIONS_PER_RULE} actions" ] if actions.size > Registry::MAX_ACTIONS_PER_RULE

        actions.each_with_index.flat_map do |action, index|
          problem = action_problem(action)
          problem ? [ "Action #{index + 1}: #{problem}" ] : []
        end
      end

      def action_problem(action)
        return "is not valid" unless action.is_a?(Hash)

        definition = Registry::ACTIONS[action["type"]]
        return "pick what to do" unless definition

        config = action["config"]
        return "is missing its settings" unless config.is_a?(Hash)

        definition[:params].each do |param, field|
          return "pick a valid #{Registry::FIELDS[field][:label].downcase}" unless config.key?(param) && Registry.valid_value?(field, config[param])
        end
        nil
      end
    end
  end
end
