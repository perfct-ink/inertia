# A rule a Space runs on its own: when its trigger happens and every condition
# holds, its actions run. What a trigger, condition and action may hold is the
# Automations::Registry; this model keeps them as JSON and checks them with
# Automations::Definition. Admins and owners manage the rules (see
# AutomationRulesController).
class AutomationRule < ApplicationRecord
  belongs_to :workspace
  belongs_to :created_by, class_name: "User", optional: true

  normalizes :name, with: ->(name) { name.squish }
  validates :name, presence: true, length: { maximum: Automations::Registry::NAME_MAX_LENGTH }
  validate :definition_is_valid
  validate :people_are_in_the_space
  validate :space_is_under_the_limit, on: :create

  scope :enabled, -> { where(enabled: true) }

  # The rule as the evaluator reads it: plain hashes with string keys.
  def to_definition
    {
      "id" => id, "name" => name, "enabled" => enabled, "trigger_type" => trigger_type,
      "trigger_config" => trigger_config.as_json, "conditions" => conditions.as_json, "actions" => actions.as_json
    }
  end

  private

  def definition_is_valid
    Automations::Definition.errors(**definition_parts).each { |message| errors.add(:base, message) }
  end

  def people_are_in_the_space
    return if errors.any? || workspace.nil?

    people = Automations::Definition.user_ids(conditions: conditions.as_json, actions: actions.as_json)
    errors.add(:base, "Choose people who are in this Space") unless people.all? { |user_id| workspace.accessible_by?(user_id) }
  end

  def space_is_under_the_limit
    return unless workspace && workspace.automation_rules.count >= Automations::Registry::MAX_RULES_PER_SPACE

    errors.add(:base, "A Space can have at most #{Automations::Registry::MAX_RULES_PER_SPACE} automations")
  end

  def definition_parts
    { trigger_type: trigger_type, trigger_config: trigger_config.as_json, conditions: conditions.as_json, actions: actions.as_json }
  end
end
